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
import overrideActor from "./documents/EunosActor.ts";
import EunosItem from "./documents/EunosItem.ts";
import overridePCSheet from "./documents/sheets/EunosPCSheet.ts";
import overrideNPCSheet from "./documents/sheets/EunosNPCSheet.ts";
import overrideItemSheet from "./documents/sheets/EunosItemSheet.ts";
import * as U from "./scripts/utilities.ts";
import EunosSockets from "./apps/EunosSockets.ts";
import * as EunosSounds from "./scripts/sounds.ts";
import { assignGlobals } from "./scripts/constants.ts";
import { GamePhase, InitializerMethod } from "./scripts/enums.ts";
import { registerHandlebarHelpers } from "./scripts/helpers.ts";
import InitializePopovers from "./scripts/popovers.ts";
import kLog from "./scripts/logger.ts";
import registerSettings from "./scripts/settings.ts";
import { initializeGSAP } from "./scripts/animations.ts";
import "../styles/styles.scss";
import registerEunosSocketTests from "./tests/tests-EunosSocket.ts";
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
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/mid-zindex-mask.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/top-zindex-mask.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/safety-buttons.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/alerts.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/countdown.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-locations.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-npcs.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-pcs.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/partials/loading-screen-item.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/partials/condition-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-header.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-topper.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-trigger.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-effect.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-options.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-roll-results.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-special-flag.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/item-controls.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/weapon-attack.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/move-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/occupation-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/relationship-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/weapon-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/darksecret-card.hbs",
  "modules/eunos-kult-hacks/templates/sheets/partials/gear-card.hbs",
  "modules/eunos-kult-hacks/templates/alerts/alert-simple.hbs",
  "modules/eunos-kult-hacks/templates/apps/chat/roll-card.hbs"
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


  // Register the new hook
  Hooks.on("createActor", (actor: EunosActor) => {
    if (actor.isPC()) {
      void actor.addBasicMoves();
    }
  });
}

// #endregion

assignGlobals({
  U,
  EunosItem,
  EunosOverlay,
  EunosAlerts,
  EunosSockets,
  EunosSounds,
  kLog,
  InitializableClasses: {
    EunosSockets,
    EunosAlerts,
    EunosSounds,
    EunosOverlay
  } as const
});

async function RunInitializer(methodName: InitializerMethod) {
  return Promise.all(
    Object.values(InitializableClasses).filter(
      (doc): doc is typeof doc & Record<InitializerMethod, () => Promise<void>> =>
        methodName in doc
    ).map((doc) => {
      kLog.log(`Running ${methodName} initializer for`, doc.name ?? "Unknown Object", 0);
      return doc[methodName]();
    })
  );
}

// Initialize core systems
Hooks.on("init", () => {
  kLog.display("Initializing 'Kult: Divinity Lost 4th Edition' for Foundry VTT", 0);

  initializeGSAP();

  registerSettings();

  registerHandlebarHelpers();

  overrideActor();

  Hooks.on("quenchReady", () => {
    registerEunosSocketTests();
  });

  // Initialize Tooltips Overlay
  void RunInitializer(InitializerMethod.PreInitialize);
  kLog.display("Pre-Initialization Complete.");
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
    overridePCSheet();
    overrideNPCSheet();
    overrideItemSheet();
    if (getUser().isGM) {
      addClassToDOM("gm-user");
    }
  });

  replaceBasicMovesHook();
});
