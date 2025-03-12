import type EunosItem from "../documents/EunosItem";
import { verbalizeNum, deverbalizeNum, tCase, roundNum } from "./utilities";
import type { Quench } from "@ethaks/fvtt-quench";
import { PCTargetRef, PCState, NPCState, EunosMediaTypes } from "./enums";
import type ActorDataPC from "../data-model/ActorDataPC";
import type ActorDataNPC from "../data-model/ActorDataNPC";
import EunosMedia from "../apps/EunosMedia";
export const SYSTEM_ID = "eunos-kult-hacks";

export const MEDIA_PATHS = {
  PRESESSION_AMBIENT_AUDIO:
    "modules/eunos-kult-hacks/assets/sounds/session-closed-ambience.flac",
  INTRO_VIDEO:
    "modules/eunos-kult-hacks/assets/video/something-unholy-intro.webm",
  LOADING_SCREEN_ITEM:
    "modules/eunos-kult-hacks/templates/apps/eunos-overlay/partials/loading-screen-item.hbs",
};

// #region CONFIGURATION
export const CONTROL_SLIDER_PANELS = {
  LOCATION_PLOTTING: [
    {
      label: "Perspective",
      min: 0,
      max: 2000,
      initValue: () => {
        const element = $("#STAGE")[0];
        if (!element) { return 1000; }
        return (gsap.getProperty(element, "perspective") ?? 1000) as number;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE")[0];
        if (!element) { return; }
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "perspective");
        }
        gsap.to(element, {
          duration: 0.5,
          perspective: value,
        });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value)}px`;
      }
    },
    {
      label: "Z-Height",
      min: -10000,
      max: 10000,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D")[0];
        if (!element) { return 0; }
        return (gsap.getProperty(element, "z") ?? 0) as number;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE #SECTION-3D")[0];
        if (!element) { return; }
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "transform");
        }
        gsap.to(element, { duration: 0.5, z: value });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value)}px`;
      }
    },
    {
      label: "Background Position X",
      min: -3500,
      max: 3500,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return 0; }
        return (gsap.getProperty(element, "background-position-x") ?? 0) as number;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return; }
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "background-position-x,background-position-y");
        }
        gsap.to(element, { duration: 0.5, backgroundPositionX: value });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value)}px`;
      }
    },
    {
      label: "Background Position Y",
      min: -3500,
      max: 3500,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return 0; }
        return (gsap.getProperty(element, "background-position-y") ?? 0) as number;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return; }
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "background-position-x,background-position-y");
        }
        gsap.to(element, { duration: 0.5, backgroundPositionY: value });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value)}px`;
      }
    },
    {
      label: "Hue",
      min: -360,
      max: 360,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return 0; }
        const filterString = (gsap.getProperty(element, "filter") ?? "") as string;
        const hueRotate = filterString.match(/hue-rotate\(([-.\d]+)(?:\s?deg)?\)/)?.[1];
        return hueRotate ? parseFloat(hueRotate) : 0;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return; }
        const filterString = (gsap.getProperty(element, "filter") ?? "") as string;
        let saturation = Number(filterString.match(/saturate\(([.\d]*)(?:%)?\)/)?.[1] ?? "100");
        if (saturation < 1) {
          saturation *= 100;
        }
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "filter");
        }
        gsap.to(element, { duration: 0.5, filter: `hue-rotate(${value}deg) saturate(${saturation}%)` });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value, 2)}deg`;
      }
    },
    {
      label: "Saturation",
      min: 0,
      max: 100,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return 100; }
        const filterString = (gsap.getProperty(element, "filter") ?? "") as string;
        let saturation = Number(filterString.match(/saturate\(([.\d]*)(?:%)?\)/)?.[1] ?? "100");
        if (saturation < 1) {
          saturation *= 100;
        }
        return saturation;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return; }
        const filterString = (gsap.getProperty(element, "filter") ?? "") as string;
        const hueRotate = Number(filterString.match(/hue-rotate\(([.\d]*)(?:\s?deg)?\)/)?.[1] ?? "0");
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "filter");
        }
        gsap.to(element, { duration: 0.5, filter: `hue-rotate(${hueRotate}deg) saturate(${value}%)` });
      },
      formatForDisplay: (value: number) => {
        return `${value}%`;
      }
    },
    {
      label: "Rotation X",
      min: -360,
      max: 360,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return 0; }
        const transformString = (gsap.getProperty(element, "transform") ?? "") as string;
        const rotationX = Number(transformString.match(/rotateX\(([-.\d]*)(?:\s?deg)?\)/)?.[1] ?? "0");
        return rotationX;
      },
      actionFunction: (value: number) => {
        const elements = [
          $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0],
          $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0],
        ].filter(Boolean) as Array<HTMLElement>;
        if (elements.length !== 2) { return; }
        const element = elements[0]!;
        const rotationX = Number(gsap.getProperty(element, "rotationX") ?? 0);
        const rotationY = Number(gsap.getProperty(element, "rotationY") ?? 0);
        const rotationZ = Number(gsap.getProperty(element, "rotationZ") ?? 0);
        if (gsap.getTweensOf(elements).length > 0) {
          gsap.killTweensOf(elements, "transform");
        }
        const transformString = `translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(${rotationZ}deg) rotateY(${rotationY}deg) rotateX(${value}deg)`;
        gsap.to(elements, { duration: 0.5, transform: transformString });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value, 2)}deg`;
      }
    },
    {
      label: "Rotation Y",
      min: -360,
      max: 360,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return 0; }
        const transformString = (gsap.getProperty(element, "transform") ?? "") as string;
        const rotationY = Number(transformString.match(/rotateY\(([-.\d]*)(?:\s?deg)?\)/)?.[1] ?? "0");
        return rotationY;
      },
      actionFunction: (value: number) => {
        const elements = [
          $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0],
          $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0],
        ].filter(Boolean) as Array<HTMLElement>;
        if (elements.length !== 2) { return; }
        const element = elements[0]!;
        const rotationX = Number(gsap.getProperty(element, "rotationX") ?? 0);
        const rotationY = Number(gsap.getProperty(element, "rotationY") ?? 0);
        const rotationZ = Number(gsap.getProperty(element, "rotationZ") ?? 0);
        if (gsap.getTweensOf(elements).length > 0) {
          gsap.killTweensOf(elements, "transform");
        }
        const transformString = `translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(${rotationZ}deg) rotateY(${value}deg) rotateX(${rotationX}deg)`;
        gsap.to(elements, { duration: 0.5, transform: transformString });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value, 2)}deg`;
      }
    },
    {
      label: "Rotation Z",
      min: -360,
      max: 360,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0];
        if (!element) { return 0; }
        const transformString = (gsap.getProperty(element, "transform") ?? "") as string;
        const rotationZ = Number(transformString.match(/rotate\(([-.\d]*)(?:\s?deg)?\)/)?.[1] ?? "0");
        return rotationZ;
      },
      actionFunction: (value: number) => {
        const elements = [
          $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0],
          $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0],
        ].filter(Boolean) as Array<HTMLElement>;
        if (elements.length !== 2) { return; }
        const element = elements[0]!;
        const rotationX = Number(gsap.getProperty(element, "rotationX") ?? 0);
        const rotationY = Number(gsap.getProperty(element, "rotationY") ?? 0);
        const rotationZ = Number(gsap.getProperty(element, "rotationZ") ?? 0);
        if (gsap.getTweensOf(elements).length > 0) {
          gsap.killTweensOf(elements, "transform");
        }
        const transformString = `translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(${value}deg) rotateY(${rotationY}deg) rotateX(${rotationX}deg)`;
        gsap.to(elements, { duration: 0.5, transform: transformString });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value, 2)}deg`;
      }
    },
    {
      label: "Inner Stop",
      min: 0,
      max: 100,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0];
        if (!element) { return 0; }
        const backgroundString = (gsap.getProperty(element, "background") ?? "") as string;
        const innerStop = Number(backgroundString.match(/rgba?\([^)]+\)\s+(\d+)%/)?.[1] ?? "0");
        return innerStop;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0];
        if (!element) { return; }
        const backgroundString = (gsap.getProperty(element, "background") ?? "") as string;
        const outerStop = Number(backgroundString.match(/rgba?\([^)]+\)\s+([-.\d]+)%/g)?.[1]?.match(/([-.\d]+)%/)?.[1] ?? "0");
        kLog.log(`Inner Stop: ${value}%, Outer Stop: ${outerStop}%\nBackground String: ${backgroundString}`);
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "background");
        }
        if (value > (outerStop - 5)) {
          value = outerStop - 5;
        }
        const newBackgroundString = `radial-gradient(circle at 50% 50%, transparent, rgba(0, 0, 0, 0.7) ${value}%, rgb(0, 0, 0) ${outerStop}%)`;
        gsap.to(element, { duration: 0.5, background: newBackgroundString });
      },
      formatForDisplay: (value: number) => {
        return `${value}%`;
      }
    },
    {
      label: "Outer Stop",
      min: 0,
      max: 100,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0];
        if (!element) { return 0; }
        const backgroundString = (gsap.getProperty(element, "background") ?? "") as string;
        const outerStop = Number(backgroundString.match(/rgba?\([^)]+\)\s+([-.\d]+)%/g)?.[1]?.match(/([-.\d]+)%/)?.[1] ?? "0");
        return outerStop;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0];
        if (!element) { return; }
        const backgroundString = (gsap.getProperty(element, "background") ?? "") as string;
        const innerStop = Number(backgroundString.match(/rgba?\([^)]+\)\s+(\d+)%/)?.[1] ?? "0");
        kLog.log(`Inner Stop: ${innerStop}%, Outer Stop: ${value}%\nBackground String: ${backgroundString}`);
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "background");
        }
        if (value < (innerStop + 5)) {
          value = innerStop + 5;
        }
        const newBackgroundString = `radial-gradient(circle at 50% 50%, transparent, rgba(0, 0, 0, 0.7) ${innerStop}%, rgb(0, 0, 0) ${value}%)`;
        gsap.to(element, { duration: 0.5, background: newBackgroundString });
      },
      formatForDisplay: (value: number) => {
        return `${value}%`;
      }
    }
  ],
}


export const LOCATION_PLOTTING_SETTINGS: {
  SIMPLE: Array<{
    selector: string;
    property: string;
    outputProperty?: string;
    range: number | "angle" | "percent";
    unit?: string;
  }>;
} = {
  SIMPLE: [
    {
      selector: "#STAGE #SECTION-3D",
      property: "perspective",
      range: 1000,
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
      property: "background-position-x",
      range: 3000,
      unit: "px",
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
      property: "background-position-y",
      range: 3000,
      unit: "px",
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer",
      property: "--rotationX",
      range: "angle",
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer",
      property: "--rotationY",
      range: "angle",
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer",
      property: "--rotationZ",
      range: "angle",
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
      property: "--inner-stop",
      range: "percent",
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
      property: "--outer-stop",
      range: "percent",
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
      property: "--hue-rotate",
      range: "angle",
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
      property: "--saturation",
      range: "percent",
    },
  ],
};
// #endregion CONFIGURATION

// #region Global Variables ~
const GLOBAL_VARIABLES = {
  /**
   * Adds a class to the DOM.
   * @param className - The class to add.
   * @returns {void}
   */
  addClassToDOM: function addClassToDOM(className: string) {
    $("body").addClass(className);
  },

  /**
   * Removes one or more classes from the DOM.
   * @param classes - The class(es) to remove.
   * @returns {void}
   */
  removeClassFromDOM: function removeClassFromDOM(classes: string | string[]) {
    classes = Array.isArray(classes) ? classes : [classes];
    classes.forEach((className) => {
      $("body").removeClass(className);
    });
  },

  /**
   * Retrieves the game instance.
   * @returns The game instance.
   * @throws Error if the game is not ready.
   */
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
    if (!actors) {
      throw new Error("Actors collection is not ready");
    }
    return actors as EunosActor[];
  },

  /**
   * Retrieves the collection of all K4Item instances in the game.
   * @returns A Collection of K4Item instances.
   * @throws Error if the Items collection is not ready.
   */
  getItems: function getItems(): EunosItem[] {
    const items = getGame().items.contents;
    if (!items) {
      throw new Error("Items collection is not ready");
    }
    return items as EunosItem[];
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
  getUsers: function getUsers(): User[] {
    const users = getGame().users as Maybe<Users>;
    if (!users) {
      throw new Error("Users collection is not ready");
    }
    return users.contents as User[];
  },

  /**
   * Retrieves the client settings for the game.
   * @returns The client settings.
   * @throws Error if the settings are not ready.
   */
  getSettings: function getSettings() {
    const settings = getGame().settings as Maybe<ClientSettings>;
    if (!settings) {
      throw new Error("Settings are not ready");
    }
    return settings;
  },

  /**
   * Retrieves the value of a game setting
   * @param setting - The setting key to retrieve
   * @param namespace - The namespace under which the setting is registered
   * @returns The current value of the requested setting
   * @example
   * const phase = getSetting("gamePhase"); // uses default namespace
   * const mods = getSetting("rollMods", "core");
   */
  getSetting: function getSetting<
    K extends ClientSettings.KeyFor<ClientSettings.Namespace>,
  >(setting: K, namespace: ClientSettings.Namespace = "eunos-kult-hacks") {
    return getSettings().get(namespace, setting);
  },

  /**
   * Updates the value of a game setting
   * @param setting - The setting key to update
   * @param value - The value to assign to the setting
   * @param namespace - The namespace under which the setting is registered
   * @returns Promise that resolves with the new setting value
   * @example
   * await setSetting("gamePhase", GamePhase.SessionOpen);
   * await setSetting("rollMods", "1d20", "core");
   */
  setSetting: function setSetting<
    K extends ClientSettings.KeyFor<ClientSettings.Namespace>,
  >(
    setting: K,
    value: ClientSettings.SettingAssignmentType<ClientSettings.Namespace, K>,
    namespace: ClientSettings.Namespace = "eunos-kult-hacks",
  ) {
    if (!getUser().isGM) {
      return;
    }
    return getSettings().set(namespace, setting, value);
  },

  /**
   * Retrieves the user for the game.
   * @returns The user.
   * @throws Error if the user is not ready.
   */
  getUser: function getUser(userId?: string): User {
    const user = getGame().user;
    if (userId) {
      return getUsers().find((user) => user.id === userId) as User;
    }
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
    const userPC = pcs.find(
      (pc) => pc.ownership[userID] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    );
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
  },

  /**
   * Retrieves the audio helper for the game.
   * @returns The audio helper.
   * @throws Error if the audio helper is not ready.
   */
  getAudioHelper: function getAudioHelper(): typeof AudioHelper {
    const audioHelper = getGame().audio;
    if (!audioHelper) {
      throw new Error("AudioHelper is not ready");
    }
    return audioHelper;
  },

  /**
   * Retrieves the collection of all CompendiumPacks instances in the game.
   * @returns A Collection of CompendiumPacks instances.
   * @throws Error if the CompendiumPacks collection is not ready.
   */
  getPacks: function getPacks(): CompendiumPacks {
    const packs = getGame().packs;
    if (!packs) {
      throw new Error("Packs are not ready");
    }
    return packs;
  },

  /**
   * Retrieves the current Quench instance.
   * @returns The current Quench instance.
   * @throws Error if the Quench is not ready.
   */
  getQuench: function getQuench(): Quench {
    if ("quench" in globalThis && globalThis.quench !== undefined) {
      return globalThis.quench;
    }
    throw new Error("Quench is not ready");
  },

  /**
   * Retrieves the collection of Journal entries.
   * @returns The collection of Journal entries.
   * @throws Error if the Journal collection is not ready.
   */
  getJournals: function getJournals(): Journal {
    const journals = getGame().journal;
    if (!journals) {
      throw new Error("Journals are not ready");
    }
    return journals;
  },

  /**
   * Retrieves the collection of Folder instances in the game.
   * @returns The collection of Folder instances.
   * @throws Error if the Folder collection is not ready.
   */
  getFolders: function getFolders(): Folders {
    const folders = getGame().folders;
    if (!folders) {
      throw new Error("Folders are not ready");
    }
    return folders;
  },
};
// #endregion

// #region COLORS ~
export const Colors = {
  // GOLD5
  GOLD0: "rgb(29, 27, 20)",
  GOLD1: "rgb(58, 54, 41)",
  GOLD2: "rgb(81, 76, 58)",
  GOLD3: "rgb(104, 97, 74)",
  GOLD4: "rgb(127, 119, 90)",
  GOLD5: "rgb(150, 140, 106)",
  GOLD6: "rgb(177, 164, 125)",
  GOLD7: "rgb(203, 189, 143)",
  GOLD8: "rgb(229, 213, 162)",
  GOLD9: "rgb(255, 243, 204)",
  // GOLD ALIASES
  get ddGOLD() {
    return this.GOLD0;
  },
  get dGOLD() {
    return this.GOLD3;
  },
  get GOLD() {
    return this.GOLD5;
  },
  get bGOLD() {
    return this.GOLD7;
  },
  get bbGOLD() {
    return this.GOLD9;
  },

  // RED5
  RED0: "rgb(19, 4, 4)",
  RED1: "rgb(38, 8, 8)",
  RED2: "rgb(68, 14, 14)",
  RED3: "rgb(97, 20, 20)",
  RED4: "rgb(126, 26, 26)",
  RED5: "rgb(155, 33, 33)",
  RED6: "rgb(180, 38, 38)",
  RED7: "rgb(205, 47, 43)",
  RED8: "rgb(230, 57, 48)",
  RED9: "rgb(255, 124, 114)",
  // RED ALIASES
  get ddRED() {
    return this.RED0;
  },
  get dRED() {
    return this.RED3;
  },
  get RED() {
    return this.RED5;
  },
  get bRED() {
    return this.RED7;
  },
  get bbRED() {
    return this.RED9;
  },

  // BLUE5
  BLUE1: "rgb(9, 18, 29)",
  BLUE2: "rgb(18, 34, 57)",
  BLUE3: "rgb(26, 51, 84)",
  BLUE4: "rgb(34, 68, 112)",
  BLUE5: "rgb(43, 85, 139)",
  BLUE6: "rgb(52, 103, 168)",
  BLUE7: "rgb(61, 121, 197)",
  BLUE8: "rgb(70, 139, 226)",
  BLUE9: "rgb(119, 179, 255)",
  // BLUE ALIASES
  get ddBLUE() {
    return this.BLUE1;
  },
  get dBLUE() {
    return this.BLUE3;
  },
  get BLUE() {
    return this.BLUE5;
  },
  get bBLUE() {
    return this.BLUE7;
  },
  get bbBLUE() {
    return this.BLUE9;
  },

  // GREYS
  GREY0: "rgb(0, 0, 0)",
  GREY1: "rgb(20, 20, 20)",
  GREY2: "rgb(47, 47, 47)",
  GREY3: "rgb(74, 74, 74)",
  GREY4: "rgb(100, 100, 100)",
  GREY5: "rgb(127, 127, 127)",
  GREY6: "rgb(154, 154, 154)",
  GREY7: "rgb(181, 181, 181)",
  GREY8: "rgb(208, 208, 208)",
  GREY9: "rgb(235, 235, 235)",
  GREY10: "rgb(255, 255, 255)",
  // GREY ALIASES
  get dBLACK() {
    return this.GREY0;
  },
  get BLACK() {
    return this.GREY1;
  },
  get dGREY() {
    return this.GREY3;
  },
  get GREY() {
    return this.GREY5;
  },
  get bGREY() {
    return this.GREY7;
  },
  get WHITE() {
    return this.GREY9;
  },
  get bWHITE() {
    return this.GREY10;
  },
};
// #endregion

// #region SOUNDS ~
export interface EunosMediaData {
  path?: string;
  element?: HTMLVideoElement | HTMLAudioElement;
  alwaysPreload?: boolean;
  delay?: number;
  fadeInDuration?: number;
  displayDuration?: number;
  duration?: number; // Duration of the sound in seconds
  parentSelector?: string;
  loop?: boolean;
  mute?: boolean;
  sync?: boolean;
  volume?: number;
  autoplay?: boolean;
  reportPreloadStatus?: boolean;
}
/**
 * Map of sound names to their HTMLAudioElement instances
 */
export const Sounds = {
  PreSessionSongs: {
    "hells-comin-with-me": {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-hells-comin-with-me.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 126,
      loop: false,
      sync: true,
      volume: 0.5,
      autoplay: false,
    },
    "how-villains-are-made": {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-how-villains-are-made.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 197,
      loop: false,
      sync: true,
      volume: 0.5,
      autoplay: false,
    },
      sucker: {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-sucker.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 220,
      loop: false,
      sync: true,
      volume: 0.5,
      autoplay: false,
    },
    playground: {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-playground.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 226,
      loop: false,
      sync: true,
      volume: 0.5,
      autoplay: false,
    },
    home: {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-home.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: false,
      sync: true,
      duration: 229,
      volume: 0.5,
      autoplay: false,
    },
    // "guns-for-hire": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-guns-for-hire.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 224,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },

    // "arsonists-lulluby": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-arsonists-lullaby.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 263,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },

    // "world-on-fire": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-world-on-fire.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 146,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },
    // "panic-room": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-panic-room.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 199,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },
    // "to-ashes-and-blood": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-to-ashes-and-blood.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 243,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },
    // "mad-hatter": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-mad-hatter.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 209,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },
    // "broken-crown": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-broken-crown.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 229,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },
    // twelve: {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-twelve.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 153,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },
    // "way-down-we-go": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-way-down-we-go.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 214,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },
  },
  Ambient: {
    "session-closed-ambience": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/session-closed-ambience.flac",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    // "ambient-church": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-church.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   loop: true,
    //   sync: false,
    //   volume: 0.05,
    //   autoplay: false,
    // },
    "ambient-crickets": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-crickets.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
    },
    // "ambient-divebar": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-divebar.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   loop: true,
    //   sync: false,
    //   volume: 0.05,
    //   autoplay: false,
    // },
    "ambient-eerie-forest": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-eerie-forest.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
    },
    "ambient-electricity-night": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-electricity-night.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
    },
    // "ambient-fireplace": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-fireplace.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   loop: true,
    //   sync: false,
    //   volume: 0.05,
    //   autoplay: false,
    // },
    "ambient-forest": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-forest.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
    },
    "ambient-low-bass-rumble": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-low-bass-rumble.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
    },
    // "ambient-medical-clinic": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-medical-clinic.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   loop: true,
    //   sync: false,
    //   volume: 0.05,
    //   autoplay: false,
    // },
    // "ambient-underground": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-underground.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   loop: true,
    //   sync: false,
    //   volume: 0.05,
    //   autoplay: false,
    // },
    "ambient-whispering-ghosts": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-whispering-ghosts.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "ambient-earthquake": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-earthquake.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.75,
      autoplay: false,
    },
    "ambient-gunfire": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-gunfire.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
    },
    "ambient-car-dirt-road": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-car-dirt-road.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
    }
  },
  Weather: {
    "weather-low-wind-hum": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-low-wind-hum.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.04,
      autoplay: false,
    },
    "weather-rain-light": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-rain-light.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.04,
      autoplay: false,
    },
    "weather-rain-heavy": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-rain-heavy.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.04,
      autoplay: false,
    },
    "weather-wind-low": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-low.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.04,
      autoplay: false,
    },
    "weather-wind-medium": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-medium.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.04,
      autoplay: false,
    },
    "weather-wind-max": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-max.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.04,
      autoplay: false,
    }
  },
  Effects: {
    // "quote-session-1": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/effects/c01/quote-session-1.ogg",
    //   alwaysPreload: true,
    //   delay: 2,
    //   loop: false,
    //   sync: false,
    //   volume: 0.25,
    //   autoplay: false,
    // },
    "quote-session-2": {
      path: "modules/eunos-kult-hacks/assets/sounds/effects/c02/quote-session-2.ogg",
      alwaysPreload: true,
      delay: 0,
      loop: false,
      sync: false,
      volume: 0.75,
      autoplay: false,
    },
    // "effect-car-crash": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/effects/effect-car-crash.ogg",
    //   alwaysPreload: true,
    //   delay: 0,
    //   loop: false,
    //   sync: false,
    //   volume: 1,
    //   autoplay: false,
    // },
    // "effect-earthquake": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/effects/effect-earthquake.wav",
    //   alwaysPreload: true,
    //   delay: 0,
    //   loop: false,
    //   sync: false,
    //   volume: 1,
    //   autoplay: false,
    // },
    // "effect-gunfire": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/effects/effect-gunfire.wav",
    //   alwaysPreload: true,
    //   delay: 0,
    //   loop: false,
    //   sync: false,
    //   volume: 1,
    //   autoplay: false,
    // },
    "effect-howling": {
      path: "modules/eunos-kult-hacks/assets/sounds/effects/effect-howling.wav",
      alwaysPreload: true,
      delay: 0,
      loop: false,
      sync: false,
      volume: 1,
      autoplay: false,
    }
  },
  Alerts: {
    "alert-hit-stability-up": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-stability-up.ogg",
      alwaysPreload: true,
      delay: 0,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
    },
    "alert-hit-stability-down": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-stability-down.ogg",
      alwaysPreload: true,
      delay: 0,
      displayDuration: 5,
      loop: false,
      volume: 0.25,
    },
    "alert-hit-session-scribe": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-session-scribe.ogg",
      alwaysPreload: true,
      delay: 0,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
    },
    "alert-hit-wound-1": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-wound-1.ogg",
      alwaysPreload: true,
      delay: 0.75,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.25,
      autoplay: false,
    },
    "alert-hit-wound-2": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-wound-2.ogg",
      alwaysPreload: true,
      delay: 0.75,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.25,
      autoplay: false,
    },
    "alert-hit-stability": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-stability.ogg",
      alwaysPreload: true,
      delay: -1.5,
      displayDuration: 6.5,
      loop: false,
      sync: false,
      volume: 0.25,
      autoplay: false,
    },
    "alert-hit-shatter-illusion": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-shatter-illusion.ogg",
      alwaysPreload: true,
      delay: -1.75,
      displayDuration: 7,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "slow-hit": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit.ogg",
      alwaysPreload: true,
      delay: 0.75,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "subsonic-stinger": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/subsonic-stinger.ogg",
      alwaysPreload: true,
      delay: 0.75,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
  },
} as const;
// #endregion SOUNDS

// #region EASES ~
export const EASES = {
  flickerIn: "M0,0,0.00333,0,0.00667,0,0.01,0,0.01333,0,0.01667,0,0.02,0,0.02333,0,0.02667,0,0.03,0,0.03333,0,0.03667,0,0.04,0,0.04333,0,0.04667,0,0.05,0,0.05333,0,0.05667,0,0.06,0,0.06333,0,0.06667,0,0.07,0,0.07333,0,0.07667,0,0.08,0,0.08333,0,0.08667,0,0.09,0,0.09333,0,0.09667,0,0.1,0,0.10333,0,0.10667,0,0.11,0,0.11333,0,0.11667,0,0.12,0,0.12333,0,0.12667,0,0.13,0,0.13333,0,0.13667,0,0.14,0,0.14333,0,0.14667,0,0.15,0,0.15333,0,0.15667,0,0.16,0,0.16333,0,0.16667,0,0.17,0,0.17333,0,0.17667,0,0.18,0,0.18333,0,0.18667,0,0.19,0,0.19333,0,0.19667,0,0.2,0,0.20333,0,0.20667,0,0.21,0,0.21333,0,0.21667,0,0.22,0,0.22333,0,0.22667,0,0.23,0,0.23333,0,0.23667,0,0.24,0,0.24333,0,0.24667,0,0.25,0,0.25333,0,0.25667,0,0.26,0,0.26333,0,0.26667,0,0.27,0,0.27333,0,0.27667,0,0.28,0,0.28333,0,0.28667,0,0.29,0,0.29333,0,0.29667,0,0.3,0,0.30333,0,0.30667,0,0.31,0,0.31333,0,0.31667,0,0.32,0,0.32333,0,0.32667,0,0.33,0,0.33333,0,0.33667,0,0.34,0,0.34333,0,0.34667,0,0.35,0,0.35333,0,0.35667,0,0.36,0,0.36333,0,0.36667,0,0.37,0,0.37333,0,0.37667,0,0.38,0,0.38333,0,0.38667,0,0.39,0,0.39333,0,0.39667,0,0.4,0,0.40333,0,0.40667,0,0.41,0,0.41333,0,0.41667,0,0.42,0,0.42333,0,0.42667,0,0.43,0,0.43333,0,0.43667,0,0.44,0,0.44333,0,0.44667,0,0.45,0,0.45333,0,0.45667,0,0.46,0,0.46333,0,0.46667,0,0.47,0,0.47333,0.33333,0.47667,0.66667,0.48,1,0.48333,0.66667,0.48667,0.33333,0.49,0,0.49333,0,0.49667,0,0.5,0,0.50333,0,0.50667,0,0.51,0,0.51333,0,0.51667,0,0.52,0,0.52333,0,0.52667,0,0.53,0,0.53333,0,0.53667,0,0.54,0,0.54333,0,0.54667,0,0.55,0,0.55333,0,0.55667,0,0.56,0,0.56333,0,0.56667,0,0.57,0,0.57333,0,0.57667,0,0.58,0,0.58333,0,0.58667,0,0.59,0,0.59333,0,0.59667,0,0.6,0,0.60333,0,0.60667,0,0.61,0,0.61333,0.33333,0.61667,0.66667,0.62,1,0.62333,1,0.62667,1,0.63,1,0.63333,0.66667,0.63667,0.33333,0.64,0,0.64333,0,0.64667,0,0.65,0,0.65333,0.33333,0.65667,0.66667,0.66,1,0.66333,1,0.66667,1,0.67,1,0.67333,0.66667,0.67667,0.33333,0.68,0,0.68333,0.33333,0.68667,0.66667,0.69,1,0.69333,0.66667,0.69667,0.33333,0.7,0,0.70333,0.33333,0.70667,0.66667,0.71,1,0.71333,0.66667,0.71667,0.33333,0.72,0,0.72333,0.33333,0.72667,0.66667,0.73,1,0.73333,0.66667,0.73667,0.33333,0.74,0,0.74333,0,0.74667,0,0.75,0,0.75333,0.33333,0.75667,0.66667,0.76,1,0.76333,0.66667,0.76667,0.33333,0.77,0,0.77333,0,0.77667,0,0.78,0,0.78333,0,0.78667,0,0.79,0,0.79333,0,0.79667,0,0.8,0,0.80333,0,0.80667,0,0.81,0,0.81333,0.33333,0.81667,0.66667,0.82,1,0.82333,0.66667,0.82667,0.33333,0.83,0,0.83333,0.33333,0.83667,0.66667,0.84,1,0.84333,1,0.84667,1,0.85,1,0.85333,1,0.85667,1,0.86,1,0.86333,1,0.86667,1,0.87,1,0.87333,1,0.87667,1,0.88,1,0.88333,1,0.88667,1,0.89,1,0.89333,1,0.89667,1,0.9,1,0.90333,1,0.90667,1,0.91,1,0.91333,1,0.91667,1,0.92,1,0.92333,1,0.92667,1,0.93,1,0.93333,1,0.93667,1,0.94,1,0.94333,1,0.94667,1,0.95,1,0.95333,1,0.95667,1,0.96,1,0.96333,1,0.96667,1,0.97,1,0.97333,1,0.97667,1,0.98,1,0.98333,1,0.98667,1,0.99,1,0.99333,1,0.99667,1,1,1"
} as const;
// #endregion EASES

// #region CHARACTERS ~

export declare namespace PCs {
  export interface GlobalSettingsData {
    actorID: IDString;
    ownerID: IDString;
  }

  export interface LocationSettingsData extends GlobalSettingsData {
    state: PCState;
  }

  export interface GlobalData extends GlobalSettingsData {
    slot: "1" | "2" | "3" | "4" | "5";
    actor: EunosActor & {system: ActorDataPC};
    owner: User;
    isOwner: boolean;
  }

  export interface FullData extends GlobalData, LocationSettingsData { }
}

export declare namespace NPCs {

  export interface GlobalSettingsData {
    actorID: IDString;
  }
  export interface LocationSettingsData extends GlobalSettingsData {
    position: Point;
    state: NPCState;
  }
  export interface GlobalData extends GlobalSettingsData {
    actor: EunosActor & {system: ActorDataNPC};
  }
  export interface FullData extends GlobalData, LocationSettingsData { }
}

// #endregion CHARACTERS

// #region LOCATIONS ~
export declare namespace Location {

  export namespace PCData {
    export type SettingsData = PCs.LocationSettingsData;
    export type FullData = PCs.GlobalData & SettingsData;
  }

  export namespace NPCData {
    export type SettingsData = NPCs.LocationSettingsData;
    export type FullData = NPCs.GlobalData & SettingsData;
  }

  interface StaticSettingsData {
    name: string;
    description?: string;
    images: Record<string, string>;
    mapTransforms: Array<{
      selector: string;
      properties: Record<string, number | string | undefined>;
    }>;
  }

  interface DynamicSettingsData {
    currentImage: string | null;
    pcData: Record<IDString, PCData.SettingsData>;
    npcData: Record<IDString, NPCData.SettingsData>;
    playlists: Record<string, Partial<EunosMediaData>>;
  }

  export interface SettingsData extends StaticSettingsData, DynamicSettingsData {}

  interface DynamicFullData {
    currentImage: string | null;
    pcData: Record<"1" | "2" | "3" | "4" | "5", PCData.FullData>;
    npcData: Record<IDString, NPCData.FullData>;
    playlists: Record<string, EunosMedia<EunosMediaTypes.audio>>;
  }

  export interface FullData extends StaticSettingsData, DynamicFullData {}
}

export const LOCATIONS = {
  "Nowhere": {
    name: "Nowhere",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "black",
          boxShadow: "0 0 50vw black inset",
          "--dramatic-hook-color": "white",
          "--dramatic-hook-text-shadow-color": "black",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -400
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: -3500,
          backgroundPositionY: -2826,
          filter: "hue-rotate(130deg) saturate(100%) brightness(1)",
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-7deg) rotateY(11deg) rotateX(40.0001deg)",
          background: "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-no-entry.webp')",
          backgroundPosition: "0px 0px",
          backgroundRepeat: "no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-7deg) rotateY(11deg) rotateX(40.0001deg)",
          background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.7) 0%, rgb(0, 0, 0) 5%)",
        },
      },
    ],
  },
  "Fire Access Trail South": {
    name: "Fire Access Trail",
    images: {
      "Fire Road 1": "modules/eunos-kult-hacks/assets/images/locations/fire-road-1.webp",
      "Fire Road Car Ahead": "modules/eunos-kult-hacks/assets/images/locations/fire-road-car-ahead.webp",
    },
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "black",
          boxShadow: "0 0 50vw black inset",
          "--dramatic-hook-color": "white",
          "--dramatic-hook-text-shadow-color": "black",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -400
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: -2565,
          backgroundPositionY: -2826,
          filter: "hue-rotate(130deg) saturate(100%) brightness(1)",
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-7deg) rotateY(11deg) rotateX(40.0001deg)",
          background: "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-no-entry.webp')",
          backgroundPosition: "0px 0px",
          backgroundRepeat: "no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-7deg) rotateY(11deg) rotateX(40.0001deg)",
          background: "radial-gradient(circle at 50% 50%, transparent 4%, rgba(0, 0, 0, 0.7) 8%, rgb(0, 0, 0) 19%)",
        },
      },
    ],
  },
  "Fire Access Trail North": {
    name: "Fire Access Trail",
    images: {
      "Fire Road 2": "modules/eunos-kult-hacks/assets/images/locations/fire-road-2.webp",
      "Fire Road Car Ahead": "modules/eunos-kult-hacks/assets/images/locations/fire-road-car-ahead.webp",
    },
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "black",
          boxShadow: "0 0 50vw black inset",
          "--dramatic-hook-color": "white",
          "--dramatic-hook-text-shadow-color": "black",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -400
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: -2870,
          backgroundPositionY: 1478,
          filter: "hue-rotate(130deg) saturate(100%) brightness(1)",
          transform: "matrix3d(-0.876669, 0.30186, 0.374608, 0, -0.477073, -0.64592, -0.595977, 0, 0.0620656, -0.70119, 0.710268, 0, -3500, -3500, 0, 1)",
          background: "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-no-entry.webp')",
          backgroundPosition: "0px 0px",
          backgroundRepeat: "no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(-0.876669, 0.30186, 0.374608, 0, -0.477073, -0.64592, -0.595977, 0, 0.0620656, -0.70119, 0.710268, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 4%, rgba(0, 0, 0, 0.7) 8%, rgb(0, 0, 0) 19%)",
        },
      },
    ]/* [
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -400
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: -2978,
          backgroundPositionY: 1478,
          filter: "hue-rotate(130deg) saturate(100%) brightness(1)",
          transform: "matrix3d(-0.997083, 0.0309705, -0.06976, 0, 0.0210364, -0.767068, -0.64122, 0, -0.0733696, -0.640817, 0.764179, 0, -3500, -3500, 0, 1)",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(-0.997083, 0.0309705, -0.06976, 0, 0.0210364, -0.767068, -0.64122, 0, -0.0733696, -0.640817, 0.764179, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 4%, rgba(0, 0, 0, 0.7) 8%, rgb(0, 0, 0) 19%)",
        },
      },
    ] */,
  },
  "Willow's Wending Entry": {
    name: "Willow's Wending",
    images: {
      "Polaroids - Missing": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-polaroids-missing.webp",
      "Polaroids - In Place": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-polaroids-present.webp",
      "Wending Depths 1": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-1.webp",
      "Wending Depths 2": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-2.webp",
      "Wending Depths 3": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-3.webp",
      "Hollow King": "modules/eunos-kult-hacks/assets/images/locations/hollow-king.webp",
    },
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "black",
          boxShadow: "0 0 50vw black inset",
          "--dramatic-hook-color": "white",
          "--dramatic-hook-text-shadow-color": "black",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -400
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: -2565,
          backgroundPositionY: -1348,
          filter: "hue-rotate(105deg) saturate(100%) brightness(1.5)",
          transform: "matrix3d(0.274526, 0.715165, 0.642786, 0, -0.928205, 0.0225025, 0.371389, 0, 0.25114, -0.698593, 0.669997, 0, -3500, -3500, 0, 1)",
          background: "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.274526, 0.715165, 0.642786, 0, -0.928205, 0.0225025, 0.371389, 0, 0.25114, -0.698593, 0.669997, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 5%, rgba(0, 0, 0, 0.7) 10%, rgb(0, 0, 0) 17%)",
        },
      },
    ]
  },
  "Willow's Wending #1": {
    name: "Willow's Wending",
    images: {
      "Wending Depths 1": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-1.webp",
      "Wending Depths 2": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-2.webp",
      "Wending Depths 3": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-3.webp",
      "Futuristic Soldier": "modules/eunos-kult-hacks/assets/images/locations/futuristic-soldier.webp",
      "Hollow King": "modules/eunos-kult-hacks/assets/images/locations/hollow-king.webp",
    },
    description:
      "The thin, winding road named 'Willow's Wending' takes an unpredictably treacherous route through the pine forests of the Black Hills, the trees on either side so thick they defy attempts to peer into the surrounding woods.",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "black",
          boxShadow: "0 0 50vw black inset",
          "--dramatic-hook-color": "white",
          "--dramatic-hook-text-shadow-color": "black",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: -543,
          backgroundPositionY: -1283,
          filter: "hue-rotate(87deg) saturate(100%) brightness(1)",
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(84.9999deg) rotateY(-31.0001deg) rotateX(3.9998deg)",
          background: "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(84.9999deg) rotateY(-31.0001deg) rotateX(3.9998deg)",
          background: "radial-gradient(circle at 50% 50%, transparent 2.5%, rgba(0, 0, 0, 0.7) 5%, rgb(0, 0, 0) 10%)",
        },
      },
    ]
  },
  "Willow's Wending #2": {
    name: "Willow's Wending",
    images: {
      "Wending Depths 1": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-1.webp",
      "Wending Depths 2": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-2.webp",
      "Wending Depths 3": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-3.webp",
      "Futuristic Soldier": "modules/eunos-kult-hacks/assets/images/locations/futuristic-soldier.webp",
      "Hollow King": "modules/eunos-kult-hacks/assets/images/locations/hollow-king.webp",
    },
    description:
      "The thin, winding road named 'Willow's Wending' takes an unpredictably treacherous route through the pine forests of the Black Hills, the trees on either side so thick they defy attempts to peer into the surrounding woods.",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "black",
          boxShadow: "0 0 50vw black inset",
          "--dramatic-hook-color": "white",
          "--dramatic-hook-text-shadow-color": "black",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 1674,
          backgroundPositionY: -522,
          filter: "hue-rotate(253deg) saturate(100%) brightness(1)",
          transform: "matrix3d(0.0905604, -0.737609, -0.669128, 0, 0.992547, 0.121861, 0, 0, 0.0815404, -0.664141, 0.743147, 0, -3500, -3500, 0, 1)",
          background: "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.0905604, -0.737609, -0.669128, 0, 0.992547, 0.121861, 0, 0, 0.0815404, -0.664141, 0.743147, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 3%, rgba(0, 0, 0, 0.7) 6%, rgb(0, 0, 0) 12%)",
        },
      },
    ],
  },
  "Willow's Wending #3": {
    name: "Willow's Wending",
    images: {
      "Wending Depths 1": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-1.webp",
      "Wending Depths 2": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-2.webp",
      "Wending Depths 3": "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-3.webp",
      "Futuristic Soldier": "modules/eunos-kult-hacks/assets/images/locations/futuristic-soldier.webp",
      "Hollow King": "modules/eunos-kult-hacks/assets/images/locations/hollow-king.webp",
    },
    description:
      "The thin, winding road named 'Willow's Wending' takes an unpredictably treacherous route through the pine forests of the Black Hills, the trees on either side so thick they defy attempts to peer into the surrounding woods.",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "black",
          boxShadow: "0 0 50vw black inset",
          "--dramatic-hook-color": "white",
          "--dramatic-hook-text-shadow-color": "black",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: -1261,
          backgroundPositionY: 565,
          filter: "hue-rotate(-186deg) saturate(100%) brightness(1)",
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(71.9993deg) rotateY(-40.0001deg) rotateX(11.0001deg)",
          background: "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(71.9993deg) rotateY(-40.0001deg) rotateX(11.0001deg)",
          background: "radial-gradient(circle at 50% 50%, transparent 2.5%, rgba(0, 0, 0, 0.7) 5%, rgb(0, 0, 0) 10%)",
        },
      },
    ]
  },
  "Ranger Station #1": {
    name: "Ranger Station #1",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "black",
          boxShadow: "0 0 50vw black inset",
          "--dramatic-hook-color": "white",
          "--dramatic-hook-text-shadow-color": "black",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 500,
          backgroundPositionY: 1696,
          filter: "hue-rotate(96deg) saturate(100%) brightness(1)",
          transform: "matrix3d(0.999391, -0.0348995, 0, 0, 0.0275012, 0.787531, 0.615661, 0, -0.0214863, -0.615286, 0.788011, 0, -3500, -3500, 0, 1)",
          background: "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.999391, -0.0348995, 0, 0, 0.0275012, 0.787531, 0.615661, 0, -0.0214863, -0.615286, 0.788011, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 2.5%, rgba(0, 0, 0, 0.7) 5%, rgb(0, 0, 0) 10%)",
        },
      },
    ]
  },
  "Emma's Rise": {
    name: "Emma's Rise",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -1000
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 826,
          backgroundPositionY: 1652,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.0092613, 0.52984, 0.848047, 0, -0.998721, 0.0470522, -0.0184903, 0, -0.0496993, -0.846792, 0.529598, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.0092613, 0.52984, 0.848047, 0, -0.998721, 0.0470522, -0.0184903, 0, -0.0496993, -0.846792, 0.529598, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgba(255, 255, 255, 0.75) 25%)",
        },
      },
    ]
  },
  "Wainwright Academy": {
    name: "Wainwright Academy",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 1261,
          backgroundPositionY: 1739,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.987689, 1.72384e-06, -0.156429, 0, 0.0919454, 0.809017, 0.580549, 0, 0.126555, -0.587785, 0.799057, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.987689, 1.72384e-06, -0.156429, 0, 0.0919454, 0.809017, 0.580549, 0, 0.126555, -0.587785, 0.799057, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "Emma's Rise Primary School": {
    name: "Emma's Rise Primary School",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100,
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 957,
          backgroundPositionY: 1630,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(-0.080072, -0.761847, -0.642789, 0, 0.98907, 0.0193729, -0.146169, 0, 0.123811, -0.647467, 0.751969, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(-0.080072, -0.761847, -0.642789, 0, 0.98907, 0.0193729, -0.146169, 0, 0.123811, -0.647467, 0.751969, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "Emma's Rise Middle School for Wayward Boys": {
    name: "Emma's Rise Middle School for Wayward Boys",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100,
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 1913,
          backgroundPositionY: 1652,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(-0.0316297, 0.905755, 0.42262, 0, -0.997985, -0.0053527, -0.0632192, 0, -0.0549989, -0.423768, 0.904099, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(-0.0316297, 0.905755, 0.42262, 0, -0.997985, -0.0053527, -0.0632192, 0, -0.0549989, -0.423768, 0.904099, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "Town Hall": {
    name: "Town Hall",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: 621
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 1370,
          backgroundPositionY: 2522,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-0.0001deg) rotateY(8.9998deg) rotateX(40deg)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-0.0001deg) rotateY(8.9998deg) rotateX(40deg)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "First Bank of Emma's Rise": {
    name: "First Bank of Emma's Rise",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: 621
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 1500,
          backgroundPositionY: 2304,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.0960292, 0.78214, 0.615659, 0, -0.994292, 0.0464866, 0.0960305, 0, 0.0464894, -0.621366, 0.78214, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.0960292, 0.78214, 0.615659, 0, -0.994292, 0.0464866, 0.0960305, 0, 0.0464894, -0.621366, 0.78214, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "Days Go By Pub": {
    name: "Days Go By Pub",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: 621
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 1087,
          backgroundPositionY: 2304,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(-0.0282302, -0.808527, -0.587781, 0, 0.999391, -0.0348943, 0, 0, -0.0205102, -0.587423, 0.80902, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(-0.0282302, -0.808527, -0.587781, 0, 0.999391, -0.0348943, 0, 0, -0.0205102, -0.587423, 0.80902, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "Danny's Diner": {
    name: "Danny's Diner",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: 621
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 1087,
          backgroundPositionY: 2478,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.014125, -0.808895, -0.587784, 0, 0.999596, -0.0030655, 0.02824, 0, -0.0246451, -0.587946, 0.808525, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.014125, -0.808895, -0.587784, 0, 0.999596, -0.0030655, 0.02824, 0, -0.0246451, -0.587946, 0.808525, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]/* [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100,
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 1087,
          backgroundPositionY: 2370,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.0137513, -0.787891, -0.615661, 0, 0.979427, 0.134587, -0.150361, 0, 0.201328, -0.600928, 0.773533, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.0137513, -0.787891, -0.615661, 0, 0.979427, 0.134587, -0.150361, 0, 0.201328, -0.600928, 0.773533, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ] */
  },
  "Ranger Station #3": {
    name: "Ranger Station #3",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -124
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 1391,
          backgroundPositionY: 2152,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(-0.999239, -0.01744, 0.0348995, 0, -0.0090616, -0.766318, -0.642397, 0, 0.0379475, -0.642225, 0.765577, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(-0.999239, -0.01744, 0.0348995, 0, -0.0090616, -0.766318, -0.642397, 0, 0.0379475, -0.642225, 0.765577, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ],
  },
  "Medical Clinic": {
    name: "Medical Clinic",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100,
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 804,
          backgroundPositionY: 2630,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(-0.997412, -0.0174099, 0.06976, 0, -0.0291893, -0.78864, -0.614162, 0, 0.065708, -0.614608, 0.786091, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(-0.997412, -0.0174099, 0.06976, 0, -0.0291893, -0.78864, -0.614162, 0, 0.065708, -0.614608, 0.786091, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "Holt Family Lodge": {
    name: "Holt Family Lodge",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100,
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 587,
          backgroundPositionY: 2783,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(-0.0267332, -0.765578, -0.642788, 0, 0.999565, -0.0124617, -0.0267292, 0, 0.0124531, -0.643223, 0.765578, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(-0.0267332, -0.765578, -0.642788, 0, 0.999565, -0.0124617, -0.0267292, 0, 0.0124531, -0.643223, 0.765578, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "Holt Farms": {
    name: "Holt Farms",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100,
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 22,
          backgroundPositionY: 2848,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(-0.0267332, -0.765578, -0.642788, 0, 0.999565, -0.0124617, -0.0267292, 0, 0.0124531, -0.643223, 0.765578, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(-0.0267332, -0.765578, -0.642788, 0, 0.999565, -0.0124617, -0.0267292, 0, 0.0124531, -0.643223, 0.765578, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "The Greenhouse": {
    name: "The Greenhouse",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: -100,
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 0,
          backgroundPositionY: 2978,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.998782, -0.03488, -0.0348995, 0, 0.0489758, 0.786779, 0.615289, 0, 0.0059969, -0.616249, 0.787529, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.998782, -0.03488, -0.0348995, 0, 0.0489758, 0.786779, 0.615289, 0, 0.0059969, -0.616249, 0.787529, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "The Aerie": {
    name: "The Aerie",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1081,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: 100,
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: -543,
          backgroundPositionY: 3087,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.495922, -0.612392, -0.61566, 0, 0.862786, 0.427744, 0.269511, 0, 0.0982984, -0.664839, 0.740491, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.495922, -0.612392, -0.61566, 0, 0.862786, 0.427744, 0.269511, 0, 0.0982984, -0.664839, 0.740491, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "Beacon Hill": {
    name: "Beacon Hill",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: 100
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 674,
          backgroundPositionY: 2239,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-91.9999deg) rotateY(35.9996deg) rotateX(-1.9997deg)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-91.9999deg) rotateY(35.9996deg) rotateX(-1.9997deg)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },
  "The East Tunnel": {
    name: "The East Tunnel",
    images: {},
    description: "",
    mapTransforms: [
      {
        selector: "body",
        properties: {
          background: "white",
          boxShadow: "0 0 0vw transparent inset",
          "--dramatic-hook-color": "black",
          "--dramatic-hook-text-shadow-color": "white",
        }
      },
      {
        selector: "#STAGE",
        properties: {
          perspective: 1000,
        },
      },
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          z: 100,
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 3065,
          backgroundPositionY: -370,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.066773, 0.763126, 0.64279, 0, -0.992693, -0.0140822, 0.119839, 0, 0.100504, -0.646096, 0.75661, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.066773, 0.763126, 0.64279, 0, -0.992693, -0.0140822, 0.119839, 0, 0.100504, -0.646096, 0.75661, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]
  },





  // Easy copy/paste template for new locations:
  "": {
    name: "",
    images: {},
    description: "",
    mapTransforms: []
  },
};

// #endregion

// #region LOADING SCREENS ~
export const LOADING_SCREEN_DATA = {
  Azghoul: {
    prefix: "",
    title: "Azghouls",
    subtitle: "Our Forgotten Thralls",
    home: "Metropolis",
    body: "The azghouls were once exquisite beings with a proud civilization, until we conquered their world and grafted exoskeletal parasites to their bodies to compel their servitude. They haunt the barren streets of Metropolis to this day, but we have forgotten how to make them obey.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/azghoul.webp",
  },
  Gynachid: {
    prefix: "",
    title: "Gynachids",
    subtitle: "Mothers No More",
    home: "Metropolis",
    body: "Solitary carnivores, gynachids hunt in Metropolis and other worlds beyond the Illusion. Once enslaved to our rule, we took their ability to create offspring as a means of control. In the eons since, they have adapted, and now implant their fetuses in human hosts to grow.",
    image:
      "modules/eunos-kult-hacks/assets/images/loading-screen/gynachid.webp",
  },
  Tekron: {
    prefix: "",
    title: "Tekrons",
    subtitle: "Caretakers of the Machine City",
    home: "Metropolis",
    body: "Tekrons are creatures of meat, bone, and plastic, cybernetic life forms originating from the Eternal City where they tend the ancient machinery there. Possessed of little intelligence, they do not understand that Metropolis and its old order have crumbled, and they continue maintaining the aging systems as they have always done.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/tekron.webp",
  },
  "Yōko Sakai": {
    prefix: "",
    title: "Yōko Sakai",
    subtitle: "Dream Princess of the Crimson Delirium",
    home: "Limbo",
    body: "Once a geisha, now a Dream Princess of Limbo, Yōko Sakai rules a realm of opium haze and whispered desires. Here, courtesans offer tea alongside syringes of heroin and the crystallized blood of angels. Those who fail to bow before her beauty are woven into the rice-paper walls of her palace, forever part of her domain. Yet, those who earn her favor may receive whispered secrets of Limbo or passage through the shifting dreamways.",
    image:
      "modules/eunos-kult-hacks/assets/images/loading-screen/dream-princess.webp",
  },
  Lictor: {
    prefix: "",
    title: "Lictors",
    subtitle: "Our Jailers",
    home: "Elysium",
    body: "The Lictors are the veiled wardens of our prison, shaping laws, faith, and industry to keep us blind. They are the unyielding judges, the priests who mold sin into chains, the executives who barter away futures, the police chiefs who dictate law with iron resolve. They rarely kill—unless we try to escape. Beneath the Illusion they are bloated, translucent monsters over eight feet tall, with prehensile, barbed tongues a meter long.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/lictor.webp",
  },
  Nepharite: {
    prefix: "",
    title: "Nepharites",
    subtitle: "Priests of Pain",
    home: "Inferno",
    body: "Nepharites are Inferno's high priests of suffering, torturers and prophets who flay souls to nourish the Death Angels. They weave pacts, shape agony into worship, and slip into Elysium through cracks in the Illusion, draped in robes of flayed flesh and adorned with gleaming knives. Where they walk, the air is thick with the scent of blood and incense.",
    image:
      "modules/eunos-kult-hacks/assets/images/loading-screen/nepharite.webp",
  },
  Purgatide: {
    prefix: "",
    title: "Purgatides",
    subtitle: "The Mutilated Damned",
    home: "Inferno",
    body: "Purgatides are the discarded remnants of Inferno's endless tortures, little more than torn flesh held together by rusted clamps and thread. Their butchered bodies leak blood and pus, concealed beneath tattered coats. Mindless and fanatical, they shuffle through Elysium as hollow servants of razides and nepharites, their fevered eyes betraying the agony they no longer recognize as their own.",
    image:
      "modules/eunos-kult-hacks/assets/images/loading-screen/purgatide.webp",
  },
  Razide: {
    prefix: "",
    title: "Razides",
    subtitle: "Horrors of Flesh and Steel",
    home: "Inferno",
    body: "Razides are forged from the tortured remnants of souls torn from Inferno's purgatories, their flesh fused with tubes, razors and grinding gears, their minds enslaved by a writhing parasitic worm harvested from the Underworld. Hulking brutes of Inferno, they serve the Death Angels as warriors and enforcers, spreading terror and bloodshed in Elysium's shadows.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/razide.webp",
  },
  "Moth Child": {
    prefix: "the",
    title: "Moth Child",
    subtitle: "Whisperer of Dreams",
    home: "Limbo",
    body: "The Moth Child is a tragic dream being, its naked, ash-grey body covered in moths that emerge from its flesh. It haunts solitary victims, whispering in dreams and feeding on their blood in Elysium. As it intrudes upon dreams, the fluttering of moth wings becomes a constant presence, and the victim begins to attract moths in the waking world.",
    image:
      "modules/eunos-kult-hacks/assets/images/loading-screen/the-moth-child.webp",
  },
  "The Seamstress": {
    prefix: "the",
    title: "Seamstress",
    subtitle: "Stitcher of Dreams",
    home: "Limbo",
    body: "The Seamstress is a dream being who disassembles and reassembles her victims, demanding stories from their waking lives as payment. Her realm is a French suburb filled with reanimated corpses, stitched together and controlled by her will. In her sewing chamber, she hoards the organs of dreamers, promising their return for further services.",
    image:
      "modules/eunos-kult-hacks/assets/images/loading-screen/the-seamstress.webp",
  },
  Ferals: {
    prefix: "",
    title: "Ferals",
    subtitle: "Survivors, Twisted",
    home: "Metropolis",
    body: "Once human, ferals have become abominations lurking in Metropolis's shadows. Distorted by contagion and poison, they are grey-skinned, hollow-eyed, and move with an animalistic gait. Living in ruins, they are cannibals, preying on wanderers and scavenging for sustenance. Their sole objective is survival.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/feral.webp",
  },
  Jackals: {
    prefix: "",
    title: "Jackals",
    subtitle: "Mad Predators",
    home: "Elysium",
    body: "Jackals are distorted humans, bound to the Death Angels' principles, living on society's fringes. They are wild, cannibalistic, and lack empathy outside their pack. Recognizable by their animal musk, they blend into extremist groups. Each pack varies by the Death Angel they follow, preying on the vulnerable, reveling in terror, and driven by primal instincts.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/jackal.webp",
  },
  Mancipia: {
    prefix: "",
    title: "Mancipia",
    subtitle: "Built for Pleasure",
    home: "Metropolis",
    body: "Mancipia are eyeless, hairless beings with serpentine tongues, hidden by the Illusion to appear human. They exude an intoxicating allure, inciting obsession and desire, their bodies a perfect symbiosis of male and female. Used by Archons to manipulate and lead astray those who threaten secrets, they can also inspire creativity and reveal humanity's divinity through art.",
    image:
      "modules/eunos-kult-hacks/assets/images/loading-screen/mancipia.webp",
  },
  Cairath: {
    prefix: "",
    title: "Cairath",
    subtitle: "Underworld Abominations",
    home: "the Underworld",
    body: "Cairath are grotesque, bloated abominations dwelling in sewers and catacombs. They meld their victims to their rotting bodies, drawing worship from those on the brink of madness. These creatures influence their surroundings, forming cults that offer sacrifices. As they grow in power, they can transform into something even more terrifying: gransangthir.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/cairath.webp",
  },
  Azadaevae: {
    prefix: "",
    title: "Azadaevae",
    subtitle: "Who Would Be Azghouls",
    home: "the Underworld",
    body: "The azadaevae are long and slender beings with delicate features and surrounded by a scintillating veil of dust that weaves illusions. Remnants of the civilization we enslaved and transformed into the azghouls, their ability to see true souls makes them both revered and hunted to this day, leaving few of them in existence. Only in the depths of the Underworld can they find reprieve from those who hunt them.",
    image:
      "modules/eunos-kult-hacks/assets/images/loading-screen/azadaevae.webp",
  },
} as const;
// #endregion

// #region STABILITY ~
export const STABILITY_VALUES = [
  { value: 10, label: "10 - Composed" },
  { value: 9, label: "9 - Moderate Stress" },
  { value: 8, label: "8 - Moderate Stress" },
  { value: 7, label: "7 - Serious Stress" },
  { value: 6, label: "6 - Serious Stress" },
  { value: 5, label: "5 - Serious Stress" },
  { value: 4, label: "4 - Critical Stress" },
  { value: 3, label: "3 - Critical Stress" },
  { value: 2, label: "2 - Critical Stress" },
  { value: 1, label: "1 - Critical Stress" },
  { value: 0, label: "0 - Broken: Draw from the KULT Tarot" },
];

export const STABILITY_STATES = [
  [
    "irrational",
    "unhinged",
    "frantic",
    "paranoid",
    "hysterical",
    "dissociative",
    "euphoric",
  ],
  [
    "irrational",
    "unhinged",
    "frantic",
    "paranoid",
    "hysterical",
    "dissociative",
    "euphoric",
  ],
  [
    "irrational",
    "unhinged",
    "frantic",
    "paranoid",
    "hysterical",
    "dissociative",
    "euphoric",
  ],
  [
    "irrational",
    "unhinged",
    "frantic",
    "paranoid",
    "hysterical",
    "dissociative",
    "euphoric",
  ],
  [
    "irrational",
    "unhinged",
    "frantic",
    "paranoid",
    "hysterical",
    "dissociative",
    "euphoric",
  ],
  ["anxious", "shaken", "distressed", "agitated", "obsessing", "withdrawn"],
  ["anxious", "shaken", "distressed", "agitated", "obsessing", "withdrawn"],
  ["anxious", "shaken", "distressed", "agitated", "obsessing", "withdrawn"],
  ["uneasy", "irritable", "nervous", "distracted"],
  ["uneasy", "irritable", "nervous", "distracted"],
  ["composed", "calm", "confident", "at ease"],
];

export const STABILITY_MODIFIERS = [
  [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 <span class='move-name'>Keep It Together</span>",
    "&minus;3 to Disadvantage Rolls",
  ],
  [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 <span class='move-name'>Keep It Together</span>",
    "&minus;3 to Disadvantage Rolls",
  ],
  [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 <span class='move-name'>Keep It Together</span>",
    "&minus;3 to Disadvantage Rolls",
  ],
  [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 <span class='move-name'>Keep It Together</span>",
    "&minus;3 to Disadvantage Rolls",
  ],
  [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 <span class='move-name'>Keep It Together</span>",
    "&minus;3 to Disadvantage Rolls",
  ],
  [
    "&minus;1 <span class='move-name'>Keep It Together</span>",
    "&minus;2 to Disadvantage Rolls",
  ],
  [
    "&minus;1 <span class='move-name'>Keep It Together</span>",
    "&minus;2 to Disadvantage Rolls",
  ],
  [
    "&minus;1 <span class='move-name'>Keep It Together</span>",
    "&minus;2 to Disadvantage Rolls",
  ],
  ["&minus;1 to Disadvantage Rolls"],
  ["&minus;1 to Disadvantage Rolls"],
  [],
];
// #endregion

// #region WOUNDS ~
export const WOUND_MODIFIERS = {
  untendedCritical: [
    "+3 <span class='move-name'>See Through the Illusion</span>",
    "&minus;3 to All Other Moves except <span class='move-name'>Endure Injury</span>",
  ],
  fieldTendedCritical: [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 to All Other Moves except <span class='move-name'>Endure Injury</span>",
  ],
  fieldTendedCriticalWithSerious: [
    "+2 <span class='move-name'>See Through the Illusion</span>",
    "&minus;3 to All Other Moves except <span class='move-name'>Endure Injury</span>",
  ],
  multipleSerious: [
    "&minus;2 to All Moves except <span class='move-name'>Endure Injury</span> and <span class='move-name'>See Through the Illusion</span>",
  ],
  singleSerious: [
    "&minus;1 to All Moves except <span class='move-name'>Endure Injury</span> and <span class='move-name'>See Through the Illusion</span>",
  ],
  none: [],
};
export const WOUND_MODIFIERS_GRITTED_TEETH = {
  untendedCritical: [
    "+3 <span class='move-name'>See Through the Illusion</span>",
    "&minus;3 to All Other Moves except <span class='move-name'>Endure Injury</span>",
    "<span class='death-alert'>Death Is Imminent</span>",
  ],
  fieldTendedCritical: [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 to All Other Moves except <span class='move-name'>Endure Injury</span>",
  ],
  fieldTendedCriticalWithSerious: [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 to All Other Moves except <span class='move-name'>Endure Injury</span>",
  ],
  multipleSerious: [],
  singleSerious: [],
  none: [],
};
// #endregion

// #region SESSION DATA~

export function assignGlobals(
  ...newGlobals: Array<Record<string, unknown>>
): void {
  const mergedNewGlobals = newGlobals.reduce((acc, curr) => {
    return { ...acc, ...curr };
  }, {});
  Object.assign(globalThis, {
    ...GLOBAL_VARIABLES,
    LOCATIONS,
    ...mergedNewGlobals,
  });
}

/**
 * Gets the chapter string based on current chapter number or string
 * @param current - Current chapter number or string
 * @param isGettingNext - Whether to increment the chapter by one
 * @returns Chapter string
 */
export function getChapterString(
  num: number | string,
  isGettingNext = false,
): string {
  // Convert input to number
  if (typeof num === "string") {
    num = num.toLowerCase();
    if (num === "preamble") {
      num = 0;
    } else {
      num = deverbalizeNum(num.replace(/chapter\s+/i, ""));
    }
  }

  if (isGettingNext) {
    num = num + 1;
  }

  if (num === 0) return "Preamble";
  return `Chapter ${tCase(verbalizeNum(num))}`;
}

export function getNextChapter(current: number | string): string {
  return getChapterString(current, true);
}
// #endregion

// #region WEAPON CLASSES ~
export const WEAPON_CLASSES = [
  { value: "Melee Weapon", label: "Melee Weapon" },
  { value: "Thrown Weapon", label: "Thrown Weapon" },
  { value: "Firearm", label: "Firearm" },
] as const;

export const WEAPON_SUBCLASSES = {
  "Melee Weapon": [
    { value: "Unarmed", label: "Unarmed" },
    { value: "Edged Weapon", label: "Edged Weapon" },
    { value: "Crushing Weapon", label: "Crushing Weapon" },
    { value: "Chopping Weapon", label: "Chopping Weapon" },
    { value: "Other", label: "Other" },
  ],
  "Thrown Weapon": [
    { value: "Explosive", label: "Explosive" },
    { value: "Other", label: "Other" },
  ],
  Firearm: [
    { value: "Handgun", label: "Handgun" },
    { value: "Magnum Handgun", label: "Magnum Handgun" },
    { value: "Submachine Gun", label: "Submachine Gun" },
    { value: "Assault Rifle", label: "Assault Rifle" },
    { value: "Machine Gun", label: "Machine Gun" },
    { value: "Rifle", label: "Rifle" },
    { value: "Combat Shotgun", label: "Combat Shotgun" },
    { value: "Other", label: "Other" },
  ],
} as const;
// #endregion

/** Pre-session sequence timing constants */
export const PRE_SESSION = {
  /** Interaction events that would enable playing pre-session ambient audio */
  INTERACTION_EVENTS: [
    "click",
    "touchstart",
    "keydown",
    "mousedown",
    "pointerdown",
  ],
  /** Duration data for display and animation of loading screen items */
  LOADING_SCREEN_ITEM_DURATION: {
    ENTRY: 10,
    DISPLAY: 20,
    EXIT: 5,
    DELAY: 3,
  },
  /** Time in seconds before session start when SessionLoading phase begins */
  LOAD_SESSION: 300, // 5 minutes
  /** Progress value of countdown timer at which loading screen images should be stopped.*/
  HIDE_LOADING_SCREEN_IMAGES: 0.35,
  /** Repeat delays for glitch animation */
  GLITCH_REPEAT_DELAY_MIN: 0,
  GLITCH_REPEAT_DELAY_MAX: 7,
  /** Time in seconds before session start when overlay freezes */
  FREEZE_OVERLAY: 30,
  /** Time in seconds before session start when countdown disappears */
  COUNTDOWN_HIDE: 1,
  /** Time in seconds before the end of the video when the chapter title is displayed */
  CHAPTER_TITLE_DISPLAY_VIDEO_OFFSET: 5,
  /** Time in seconds after the start of the video when the black bars are animated out */
  BLACK_BARS_ANIMATION_OUT_VIDEO_DELAY: 17,
  /** Time in seconds for the black bars to animate out */
  BLACK_BARS_ANIMATION_OUT_DURATION: 21,
  /** Default session day (5 = Friday) */
  DEFAULT_SESSION_DAY: 5,
  /** Default session hour in 24h format (19 = 7 PM) */
  DEFAULT_SESSION_HOUR: 19,
  /** Default session minute */
  DEFAULT_SESSION_MINUTE: 30,
} as const;
