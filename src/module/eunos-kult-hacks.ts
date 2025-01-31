// #region Imports ~
import ActorDataPC from "./data-model/ActorDataPC.ts";
import ActorDataNPC from "./data-model/ActorDataNPC.ts";
import ItemDataAbility from "./data-model/ItemDataAbility.ts";
import ItemDataAdvantage from "./data-model/ItemDataAdvantage.ts";
import ItemDataDarkSecret from "./data-model/ItemDataDarkSecret.ts";
import ItemDataDisadvantage from "./data-model/ItemDataDisadvantage.ts";
import ItemDataFamily from "./data-model/ItemDataFamily.ts";
import ItemDataGear from "./data-model/ItemDataGear.ts";
import ItemDataLimitation from "./data-model/ItemDataLimitation.ts";
import ItemDataMove from "./data-model/ItemDataMove.ts";
import ItemDataOccupation from "./data-model/ItemDataOccupation.ts";
import ItemDataRelationship from "./data-model/ItemDataRelationship.ts";
import ItemDataWeapon from "./data-model/ItemDataWeapon.ts";
import EunosOverlay from "./apps/EunosOverlay.ts";
import EunosAlerts from "./apps/EunosAlerts.ts";
import type EunosActor from "./documents/EunosActor.ts";
import EunosItem from "./documents/EunosItem.ts";
import overrideActor from "./documents/EunosActor.ts";
import overridePCSheet from "./documents/sheets/EunosPCSheet.ts";
import overrideNPCSheet from "./documents/sheets/EunosNPCSheet.ts";
import overrideItemSheet from "./documents/sheets/EunosItemSheet.ts";
import * as U from "./scripts/utilities.ts";
import * as EunosSocket from "./scripts/sockets.ts";
import * as EunosSounds from "./scripts/sounds.ts";
import { assignGlobals } from "./scripts/constants.ts";
import { GamePhase } from "./scripts/enums.ts";
import { registerHandlebarHelpers } from "./scripts/helpers.ts";
import InitializePopovers from "./scripts/popovers.ts";
import registerConsoleLogger from "./scripts/logger.ts";
import registerSettings from "./scripts/settings.ts";

// @ts-expect-error - TS doesn't support importing SCSS files.
import "../styles/styles.scss";
// import k4ltitemsheet from "systems/k4lt/modules/sheets/k4ltitemsheet.js";
// #endregion

// #region Template Paths ~
const templatePaths = [
  "modules/eunos-kult-hacks/templates/sheets/pc-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/npc-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/ability-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/advantage-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/darksecret-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/disadvantage-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/family-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/gear-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/limitation-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/move-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/occupation-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/relationship-sheet.hbs",
  "modules/eunos-kult-hacks/templates/sheets/weapon-sheet.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/full-screen-mask.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/transition-to-top.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/safety-buttons.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/alerts.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/tooltips.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-header.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-topper.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-trigger.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-effect.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-options.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-roll-results.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-special-flag.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/move-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/occupation-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/relationship-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/weapon-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/darksecret-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/gear-card.hbs",
  "modules/eunos-kult-hacks/templates/alerts/alert-simple.hbs"
];

async function preloadHandlebarTemplates() {
  kultLogger("Loading modular templates:", templatePaths); // Log the template paths
  return loadTemplates(templatePaths);
}
// #endregion

// #region Overriding System Hooks ~
/**
 * Replaces the original addBasicMovesToActor hook with a custom implementation
 * @returns {void}
 */
function replaceBasicMovesHook() {
  // First find and remove the original hook
  if (!("createActor" in Hooks.events)) {
    return;
  }
  const createActorHooks = Hooks.events
    .createActor as Array<Hooks.HookedFunction>;
  if (createActorHooks) {
    const hookToRemove = createActorHooks.find((hook) =>
      String(hook.fn).includes(
        'if (actor.type === "pc" && actor.items.size === 0)',
      ),
    );

    if (hookToRemove) {
      Hooks.off("createActor", hookToRemove.fn);
      console.log("Successfully removed original addBasicMovesToActor hook");
    }
  }

  // Register your new implementation with the same function name
  async function addBasicMovesToActor(actor: EunosActor) {
    if (actor.type === "pc" && actor.items.size === 0) {
      const pack = getPacks().get("eunos-kult-hacks.moves");
      if (!pack) {
        throw new Error("Moves pack not found");
      }
      const index = pack.indexed ? pack.index : await pack.getIndex();
      const moves = index.map((move) =>
        pack.getDocument(move._id).then((item) => item?.toObject()),
      );
      await Promise.all(moves).then(async (objects) => {
        if (objects) {
          await actor.createEmbeddedDocuments(
            "Item",
            objects.filter(Boolean) as foundry.documents.BaseItem.CreateData[],
          );
        }
      });
    }
  }

  // Register the new hook
  Hooks.on("createActor", addBasicMovesToActor);
}

// #endregion
const InitializableClasses = {
  EunosSocket,
  EunosAlerts,
  EunosSounds,
  EunosOverlay,
  // K4PCSheet,
  // K4NPCSheet,

  // K4Item,
  // K4ItemSheet,

  // K4ChatMessage,
  // K4ActiveEffect,
  // K4Roll,
  // K4Dialog,
  // K4Sound,
  // K4Alert,
  // K4DebugDisplay,
  // K4GMTracker,
  // K4CharGen,
  // K4Socket
 } as const;

enum InitializerMethod {
  PreInitialize = "PreInitialize",
  Initialize = "Initialize",
  PostInitialize = "PostInitialize"
}

async function RunInitializer(methodName: InitializerMethod) {
  return Promise.all(
    Object.values(InitializableClasses).filter(
      (doc): doc is typeof doc & Record<InitializerMethod, () => Promise<void>> =>
        methodName in doc
    ).map((doc) => doc[methodName]())
  );
}


Hooks.on("init", () => {
  Object.assign(globalThis, {
    U,
    EunosOverlay
  });

  assignGlobals();
  registerConsoleLogger();
  kLog.display("Initializing 'Kult: Divinity Lost 4th Edition' for Foundry VTT", 0);



  registerSettings();

  registerHandlebarHelpers();

  overrideActor();

  // Initialize Tooltips Overlay
  void RunInitializer(InitializerMethod.PreInitialize);
  InitializePopovers($("body"));

  Object.assign(CONFIG.Actor.dataModels, {
    pc: ActorDataPC,
    npc: ActorDataNPC,
  });
  Object.assign(CONFIG.Item.dataModels, {
    ability: ItemDataAbility,
    advantage: ItemDataAdvantage,
    darksecret: ItemDataDarkSecret,
    disadvantage: ItemDataDisadvantage,
    family: ItemDataFamily,
    gear: ItemDataGear,
    limitation: ItemDataLimitation,
    move: ItemDataMove,
    occupation: ItemDataOccupation,
    relationship: ItemDataRelationship,
    weapon: ItemDataWeapon,
  });
});

Hooks.on("ready", () => {
  void preloadHandlebarTemplates().then(async () => {
    await RunInitializer(InitializerMethod.Initialize);
    EunosOverlay.SyncOverlayState();
    overridePCSheet();
    overrideNPCSheet();
    overrideItemSheet();
    if (getUser().isGM) {
      addClassToDOM("gm-user");
    }
  });

  replaceBasicMovesHook();
});

// #region ░░░░░░░[SocketLib]░░░░ SocketLib Initialization ░░░░░░░ ~
Hooks.once("socketlib.ready", () => {
  socketlib.registerModule("eunos-kult-hacks");
  Object.values(InitializableClasses).filter(
    (doc): doc is typeof doc & {SocketFunctions: Record<string, SocketFunction>} =>
      "SocketFunctions" in doc
  ).forEach((doc) => {
    EunosSocket.registerSocketFunctions(doc.SocketFunctions);
  });
});
// #endregion ░░░░[SocketLib]░░░░
