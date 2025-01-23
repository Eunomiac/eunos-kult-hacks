import overridePCSheet from "./documents/sheets/pc-sheet.ts";
// @ts-expect-error - TS doesn't support importing SCSS files.
import "../styles/styles.scss";
// import k4ltitemsheet from "systems/k4lt/modules/sheets/k4ltitemsheet.js";

const templatePaths = [
  "modules/eunos-kult-hacks/templates/sheets/pc-sheet.hbs",
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
    getActors: function getActors(): Actors {
      const actors = getGame().actors as Maybe<Actors>;
      if (!actors) {
        throw new Error("Actors collection is not ready");
      }
      return actors;
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
    getActor: function getActor(): k4ltActor {
      const userID: IDString = getUser().id as IDString;
      // @ts-expect-error - The type of Actor is not fully compatible with k4ltActor.
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

function addGMClassToDOM() {
  $("body").addClass("gm-user");
}

Hooks.on("ready", () => {
  // This is an example of why using the `import =` syntax is helpful.
  // Try changing the `import` above to `const` and see what happens.
  // const exampleActor: DataModel.Any = new Actor({ name: "Example Actor" });

  // console.log(exampleActor);
  assignGlobalVariables();
  void preloadHandlebarTemplates();
  overridePCSheet();
  if (getUser().isGM) {
    addGMClassToDOM();
  }
});
