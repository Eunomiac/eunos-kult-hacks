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
import overrideActor from "./documents/EunosActor.ts";
import overridePCSheet from "./documents/sheets/EunosPCSheet.ts";
import overrideNPCSheet from "./documents/sheets/EunosNPCSheet.ts";
import overrideItemSheet from "./documents/sheets/EunosItemSheet.ts";

// @ts-expect-error - TS doesn't support importing SCSS files.
import "../styles/styles.scss";
// import k4ltitemsheet from "systems/k4lt/modules/sheets/k4ltitemsheet.js";

// Add this at the very top of the file, after imports
(() => {
  const overlay = document.createElement("div");
  overlay.id = "eunos-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: calc(100vw - var(--sidebar-width) - 5px);
    height: 100vh;
    background-color: black;
    z-index: 100;
  `;

  // Use requestAnimationFrame to append as soon as possible
  requestAnimationFrame(() => {
    document.body.appendChild(overlay);
    addClassToDOM("interface-ready");
  });
})();

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
];



function assignGlobalVariables() {
  Object.assign(globalThis, {
    getGame: function getGame(): Game {
      if (!(game instanceof Game)) {
        throw new Error("Game is not ready");
    }
      return game;
    },

    /**
     * Retrieves the collection of all K4Actor instances in the game.
     * @returns A Collection of K4Actor instances.
     * @throws Error if the Actors collection is not ready.
     */
    getActors: function getActors(): EunosActor[] {
      const actors = getGame().actors.contents;
      return actors as EunosActor[];
    },

    /**
     * Retrieves the collection of all K4Item instances in the game.
     * @returns A Collection of K4Item instances.
     * @throws Error if the Items collection is not ready.
     */
    getItems: function getItems(): Items {
      const items = getGame().items as Maybe<Items>;
      if (!items) {
        throw new Error("Items collection is not ready");
      }
      return items;
    },

    /**
     * Retrieves the collection of all K4ChatMessage instances in the game.
     * @returns A Collection of K4ChatMessage instances.
     * @throws Error if the Messages collection is not ready.
     */
    getMessages: function getMessages(): Messages {
      const messages = getGame().messages as Maybe<Messages>;
      if (!messages) {
        throw new Error("Messages collection is not ready");
      }
      return messages;
    },

    /**
     * Retrieves the collection of all User instances in the game.
     * @returns A Collection of User instances.
     * @throws Error if the Users collection is not ready.
     */
    getUsers: function getUsers(): Users {
      const users = getGame().users as Maybe<Users>;
      if (!users) {
        throw new Error("Users collection is not ready");
      }
      return users;
    },

    /**
     * Retrieves the client settings for the game.
     * @returns The client settings.
     * @throws Error if the settings are not ready.
     */
    getSettings: function getSettings(): ClientSettings {
      const settings = getGame().settings as Maybe<ClientSettings>;
      if (!settings) {
        throw new Error("Settings are not ready");
      }
      return settings;
    },

    /**
     * Retrieves the user for the game.
     * @returns The user.
     * @throws Error if the user is not ready.
     */
    getUser: function getUser(): User {
      const user = getGame().user;
      return user;
    },

    /**
     * Retrieves the user's PC for the game.
     * @returns The user's PC.
     * @throws Error if the user's PC is not ready.
     */
    getActor: function getActor(): EunosActor {
      const userID: IDString = getUser().id as IDString;
      const pcs = getActors().filter((actor) => actor.type === "pc");
      const userPC = pcs.find((pc) => pc.ownership[userID] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      if (!userPC) {
        throw new Error(`User ${getUser().name} has no PC associated with them.`);
      }
      return userPC;
    },

    /**
     * Retrieves the localizer for the game.
     * @returns The localizer.
     * @throws Error if the localizer is not ready.
     */
    getLocalizer: function getLocalizer(): Localization {
      const loc = getGame().i18n as Maybe<Localization>;
      if (!loc) {
        throw new Error("I18n is not ready");
      }
      return loc;
    },

    /**
     * Retrieves the notifier for the game.
     * @returns The notifier.
     * @throws Error if the notifier is not ready.
     */
    getNotifier: function getNotifier(): Notifications {
      const notif = ui.notifications;
      if (!notif) {
        throw new Error("Notifications are not ready");
      }
      return notif;
    }
  });
}

async function preloadHandlebarTemplates() {
  kultLogger("Loading modular templates:", templatePaths); // Log the template paths
  return loadTemplates(templatePaths);
}

function addClassToDOM(className: string) {
  $("body").addClass(className);
}

Hooks.on("init", () => {
  overrideActor();

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
  assignGlobalVariables();
  void preloadHandlebarTemplates();
  overridePCSheet();
  overrideNPCSheet();
  overrideItemSheet();
  if (getUser().isGM) {
    addClassToDOM("gm-user");
  }
});
