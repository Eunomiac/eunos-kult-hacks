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
import EunosChatMessage from "./apps/EunosChatMessage.ts";
import overridePCSheet from "./documents/sheets/EunosPCSheet.ts";
import overrideNPCSheet from "./documents/sheets/EunosNPCSheet.ts";
import overrideItemSheet from "./documents/sheets/EunosItemSheet.ts";
import * as U from "./scripts/utilities.ts";
import EunosSockets from "./apps/EunosSockets.ts";
import EunosMedia from "./apps/EunosMedia.ts";
import { assignGlobals } from "./scripts/constants.ts";
import { InitializerMethod } from "./scripts/enums.ts";
import { registerHandlebarHelpers } from "./scripts/helpers.ts";
import InitializePopovers from "./scripts/popovers.ts";
import kLog from "./scripts/logger.ts";
import registerSettings from "./scripts/settings.ts";
import { initializeGSAP } from "./scripts/animations.ts";
import "../styles/styles.scss";
import EunosCarousel from "./apps/EunosCarousel.ts";
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
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/partials/npc-portrait.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-overlay/partials/npc-portrait-gm.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-carousel/standing-stone-1.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-carousel/standing-stone-2.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-carousel/standing-stone-3.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-carousel/standing-stone-4.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-carousel/standing-stone-5.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-carousel/carousel.hbs",
  "modules/eunos-kult-hacks/templates/apps/eunos-carousel/controls.hbs",
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
  "modules/eunos-kult-hacks/templates/alerts/alert-dramaticHookAssigned.hbs",
  "modules/eunos-kult-hacks/templates/apps/chat/roll-card.hbs",
  "modules/eunos-kult-hacks/templates/sidebar/result-rolled.hbs",
  "modules/eunos-kult-hacks/templates/sidebar/result-triggered.hbs",
  "modules/eunos-kult-hacks/templates/sidebar/chat-message.hbs",
  "modules/eunos-kult-hacks/templates/dialog/dialog-engage-in-combat.hbs",
  "modules/eunos-kult-hacks/templates/dialog/volume-control.hbs",
  "modules/eunos-kult-hacks/templates/dialog/end-scene-dialog.hbs"
];

async function preloadHandlebarTemplates() {
  kLog.log("Loading modular templates:", templatePaths); // Log the template paths
  return loadTemplates(templatePaths);
}
// #endregion

// #region Overriding System Hooks ~
/**
 * Replaces a hook with a custom implementation based on a pattern match
 * @param {string} hookName - The name of the hook to replace (e.g., "createActor", "updateActor")
 * @param {RegExp} pattern - Pattern to match in the hook function's string representation
 * @param {Function} replacementFn - The new function to register after removing the original
 * @returns {boolean} - Whether the hook was successfully replaced
 */
function removeK4ltHook(hookName: string, pattern: RegExp): boolean {
  // Check if the hook exists
  if (!(hookName in Hooks.events)) {
    kLog.error(`Hook '${hookName}' not found in Hooks.events`);
    return false;
  }

  // Access the hooks directly by name
  const hooks = (Hooks.events as unknown as Record<string, Array<Hooks.HookedFunction>>)[hookName];

  if (!hooks || !Array.isArray(hooks)) {
    kLog.error(`No hooks found for '${hookName}'`);
    return false;
  }

  // Find the hook to remove based on the pattern
  const hookToRemove = hooks.find((hook) => pattern.test(String(hook.fn)));

  if (hookToRemove) {
    Hooks.off(hookName, hookToRemove.fn);
    kLog.log(`Successfully removed original ${hookName} hook matching pattern: ${pattern}`);

    return true;
  } else {
    kLog.error(`No ${hookName} hook found matching pattern: ${pattern}`);
    return false;
  }
}

async function checkAdvancements(actor: EunosActor) {
  if (!actor.isPC() || !actor.isOwner) return;
  const advancementStates = [
    actor.system.advancementExp1.state,
    actor.system.advancementExp2.state,
    actor.system.advancementExp3.state,
    actor.system.advancementExp4.state,
    actor.system.advancementExp5.state
  ];

  const allChecked = advancementStates.every(state => state === "checked");

  if (allChecked) {
    const currentLevel = actor.system.advancementLevel.value ?? 0;
    await actor.update({
      system: {
        advancementLevel: {
          value: currentLevel + 1
        },
        advancementExp1: {
          state: "none"
        },
        advancementExp2: {
          state: "none"
        },
        advancementExp3: {
          state: "none"
        },
        advancementExp4: {
          state: "none"
        },
        advancementExp5: {
          state: "none"
        }
      }
    });
  }
};
 // #endregion

assignGlobals({
  U,
  EunosItem,
  EunosOverlay,
  EunosAlerts,
  EunosSockets,
  EunosMedia,
  EunosChatMessage,
  EunosCarousel,
  kLog,
  InitializableClasses: {
    EunosSockets,
    EunosAlerts,
    EunosMedia,
    EunosOverlay,
    EunosChatMessage,
    EunosCarousel
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

  // Replace the original addBasicMovesToActor hook
  removeK4ltHook(
    "createActor",
    /if\s*\(\s*actor\.type\s*===\s*"pc"\s*&&\s*actor\.items\.size\s*===\s*0\s*\)/
  );
  removeK4ltHook("updateActor", /checkAdvancements/);
  removeK4ltHook("renderActorDirectory", /kultLogger/);

  initializeGSAP();

  registerSettings();

  registerHandlebarHelpers();

  overrideActor();

  // Initialize Tooltips Overlay
  void RunInitializer(InitializerMethod.PreInitialize);
  kLog.display("Pre-Initialization Complete.");
  InitializePopovers($("body"));

  Object.assign(CONFIG.Actor.dataModels, {
    pc: ActorDataPC,
    npc: ActorDataNPC
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
    weapon: ItemDataWeapon
  });
});

Hooks.on("ready", () => {
  void preloadHandlebarTemplates().then(async () => {
    if (game?.user?.isGM) {
      kLog.display("GM User Detected", 0);
      addClassToDOM("gm-user");
    }
    await RunInitializer(InitializerMethod.Initialize);
    overridePCSheet();
    overrideNPCSheet();
    overrideItemSheet();
    await RunInitializer(InitializerMethod.PostInitialize);
  });

  // Register the new hook
  Hooks.on("createActor", (actor: EunosActor) => {
    if (actor.isPC()) {
      void actor.addBasicMoves();
    }
  });


  Hooks.on("updateActor", (actor: EunosActor) => {
    if (actor.isPC()) {
      void checkAdvancements(actor);
    }
  });

});
