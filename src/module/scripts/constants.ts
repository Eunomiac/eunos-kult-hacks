import type EunosItem from "../documents/EunosItem";
import { verbalizeNum, deverbalizeNum, tCase, roundNum } from "./utilities";
import type { Quench } from "@ethaks/fvtt-quench";
import {
  PCTargetRef,
  PCState,
  NPCPortraitState,
  NPCNameState,
  EunosMediaTypes,
} from "./enums";
import type ActorDataPC from "../data-model/ActorDataPC";
import type ActorDataNPC from "../data-model/ActorDataNPC";
import EunosMedia from "../apps/EunosMedia";
export const SYSTEM_ID = "eunos-kult-hacks";

export const MEDIA_PATHS = {
  PRESESSION_AMBIENT_AUDIO:
    "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-session-closed.ogg",
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
        if (!element) {
          return 1000;
        }
        return (gsap.getProperty(element, "perspective") ?? 1000) as number;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE")[0];
        if (!element) {
          return;
        }
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
      },
    },
    {
      label: "Z-Height",
      min: -10000,
      max: 10000,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D")[0];
        if (!element) {
          return 0;
        }
        return (gsap.getProperty(element, "z") ?? 0) as number;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE #SECTION-3D")[0];
        if (!element) {
          return;
        }
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "transform");
        }
        gsap.to(element, { duration: 0.5, z: value });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value)}px`;
      },
    },
    {
      label: "Background Position X",
      min: -3500,
      max: 3500,
      initValue: () => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return 0;
        }
        return (gsap.getProperty(element, "background-position-x") ??
          0) as number;
      },
      actionFunction: (value: number) => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return;
        }
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(
            element,
            "background-position-x,background-position-y",
          );
        }
        gsap.to(element, { duration: 0.5, backgroundPositionX: value });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value)}px`;
      },
    },
    {
      label: "Background Position Y",
      min: -3500,
      max: 3500,
      initValue: () => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return 0;
        }
        return (gsap.getProperty(element, "background-position-y") ??
          0) as number;
      },
      actionFunction: (value: number) => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return;
        }
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(
            element,
            "background-position-x,background-position-y",
          );
        }
        gsap.to(element, { duration: 0.5, backgroundPositionY: value });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value)}px`;
      },
    },
    {
      label: "Hue",
      min: -360,
      max: 360,
      initValue: () => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return 0;
        }
        const filterString = (gsap.getProperty(element, "filter") ??
          "") as string;
        const hueRotate = filterString.match(
          /hue-rotate\(([-.\d]+)(?:\s?deg)?\)/,
        )?.[1];
        return hueRotate ? parseFloat(hueRotate) : 0;
      },
      actionFunction: (value: number) => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return;
        }
        const filterString = (gsap.getProperty(element, "filter") ??
          "") as string;
        let saturation = Number(
          filterString.match(/saturate\(([.\d]*)(?:%)?\)/)?.[1] ?? "100",
        );
        if (saturation < 1) {
          saturation *= 100;
        }
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "filter");
        }
        gsap.to(element, {
          duration: 0.5,
          filter: `hue-rotate(${value}deg) saturate(${saturation}%)`,
        });
      },
      formatForDisplay: (value: number) => {
        return `${roundNum(value, 2)}deg`;
      },
    },
    {
      label: "Saturation",
      min: 0,
      max: 100,
      initValue: () => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return 100;
        }
        const filterString = (gsap.getProperty(element, "filter") ??
          "") as string;
        let saturation = Number(
          filterString.match(/saturate\(([.\d]*)(?:%)?\)/)?.[1] ?? "100",
        );
        if (saturation < 1) {
          saturation *= 100;
        }
        return saturation;
      },
      actionFunction: (value: number) => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return;
        }
        const filterString = (gsap.getProperty(element, "filter") ??
          "") as string;
        const hueRotate = Number(
          filterString.match(/hue-rotate\(([.\d]*)(?:\s?deg)?\)/)?.[1] ?? "0",
        );
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "filter");
        }
        gsap.to(element, {
          duration: 0.5,
          filter: `hue-rotate(${hueRotate}deg) saturate(${value}%)`,
        });
      },
      formatForDisplay: (value: number) => {
        return `${value}%`;
      },
    },
    {
      label: "Rotation X",
      min: -360,
      max: 360,
      initValue: () => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return 0;
        }
        const transformString = (gsap.getProperty(element, "transform") ??
          "") as string;
        const rotationX = Number(
          transformString.match(/rotateX\(([-.\d]*)(?:\s?deg)?\)/)?.[1] ?? "0",
        );
        return rotationX;
      },
      actionFunction: (value: number) => {
        const elements = [
          $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0],
          $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0],
        ].filter(Boolean) as Array<HTMLElement>;
        if (elements.length !== 2) {
          return;
        }
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
      },
    },
    {
      label: "Rotation Y",
      min: -360,
      max: 360,
      initValue: () => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return 0;
        }
        const transformString = (gsap.getProperty(element, "transform") ??
          "") as string;
        const rotationY = Number(
          transformString.match(/rotateY\(([-.\d]*)(?:\s?deg)?\)/)?.[1] ?? "0",
        );
        return rotationY;
      },
      actionFunction: (value: number) => {
        const elements = [
          $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0],
          $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0],
        ].filter(Boolean) as Array<HTMLElement>;
        if (elements.length !== 2) {
          return;
        }
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
      },
    },
    {
      label: "Rotation Z",
      min: -360,
      max: 360,
      initValue: () => {
        const element = $(
          "#STAGE #SECTION-3D .canvas-layer.background-layer",
        )[0];
        if (!element) {
          return 0;
        }
        const transformString = (gsap.getProperty(element, "transform") ??
          "") as string;
        const rotationZ = Number(
          transformString.match(/rotate\(([-.\d]*)(?:\s?deg)?\)/)?.[1] ?? "0",
        );
        return rotationZ;
      },
      actionFunction: (value: number) => {
        const elements = [
          $("#STAGE #SECTION-3D .canvas-layer.background-layer")[0],
          $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0],
        ].filter(Boolean) as Array<HTMLElement>;
        if (elements.length !== 2) {
          return;
        }
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
      },
    },
    {
      label: "Inner Stop",
      min: 0,
      max: 100,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0];
        if (!element) {
          return 0;
        }
        const backgroundString = (gsap.getProperty(element, "background") ??
          "") as string;
        const innerStop = Number(
          backgroundString.match(/rgba?\([^)]+\)\s+(\d+)%/)?.[1] ?? "0",
        );
        return innerStop;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0];
        if (!element) {
          return;
        }
        const backgroundString = (gsap.getProperty(element, "background") ??
          "") as string;
        const outerStop = Number(
          backgroundString
            .match(/rgba?\([^)]+\)\s+([-.\d]+)%/g)?.[1]
            ?.match(/([-.\d]+)%/)?.[1] ?? "0",
        );
        kLog.log(
          `Inner Stop: ${value}%, Outer Stop: ${outerStop}%\nBackground String: ${backgroundString}`,
        );
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "background");
        }
        if (value > outerStop - 5) {
          value = outerStop - 5;
        }
        const newBackgroundString = `radial-gradient(circle at 50% 50%, transparent, rgba(0, 0, 0, 0.7) ${value}%, rgb(0, 0, 0) ${outerStop}%)`;
        gsap.to(element, { duration: 0.5, background: newBackgroundString });
      },
      formatForDisplay: (value: number) => {
        return `${value}%`;
      },
    },
    {
      label: "Outer Stop",
      min: 0,
      max: 100,
      initValue: () => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0];
        if (!element) {
          return 0;
        }
        const backgroundString = (gsap.getProperty(element, "background") ??
          "") as string;
        const outerStop = Number(
          backgroundString
            .match(/rgba?\([^)]+\)\s+([-.\d]+)%/g)?.[1]
            ?.match(/([-.\d]+)%/)?.[1] ?? "0",
        );
        return outerStop;
      },
      actionFunction: (value: number) => {
        const element = $("#STAGE #SECTION-3D .canvas-layer.under-layer")[0];
        if (!element) {
          return;
        }
        const backgroundString = (gsap.getProperty(element, "background") ??
          "") as string;
        const innerStop = Number(
          backgroundString.match(/rgba?\([^)]+\)\s+(\d+)%/)?.[1] ?? "0",
        );
        kLog.log(
          `Inner Stop: ${innerStop}%, Outer Stop: ${value}%\nBackground String: ${backgroundString}`,
        );
        if (gsap.getTweensOf(element).length > 0) {
          gsap.killTweensOf(element, "background");
        }
        if (value < innerStop + 5) {
          value = innerStop + 5;
        }
        const newBackgroundString = `radial-gradient(circle at 50% 50%, transparent, rgba(0, 0, 0, 0.7) ${innerStop}%, rgb(0, 0, 0) ${value}%)`;
        gsap.to(element, { duration: 0.5, background: newBackgroundString });
      },
      formatForDisplay: (value: number) => {
        return `${value}%`;
      },
    },
  ],
};

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
  dampeningFactor?: number;
  autoplay?: boolean;
  reportPreloadStatus?: boolean;
  showInSoundMenu?: boolean;

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
    "white-rabbit": {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-white-rabbit.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 155,
      loop: false,
      sync: true,
      volume: 0.75,
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
    "mad-hatter": {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-mad-hatter.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 209,
      loop: false,
      sync: true,
      volume: 0.5,
      autoplay: false,
    },
    "world-on-fire": {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-world-on-fire.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 146,
      loop: false,
      sync: true,
      volume: 0.5,
      autoplay: false,
    },

    // "wonderful-life": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-wonderful-life.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 172, // 2:52
    //   loop: false,
    //   sync: true,
    //   volume: 0.75,
    //   autoplay: false,
    // },
    // "come-along": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-come-along.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 178, // 2:58
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },
    // "guns-for-hire": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-guns-for-hire.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 224,
    //   loop: false,
    //   sync: true,
    //   volume: 0.75,
    //   autoplay: false,
    // },
    // sucker: {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-sucker.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 220,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },
    // playground: {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-playground.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 226,
    //   loop: false,
    //   sync: true,
    //   volume: 0.5,
    //   autoplay: false,
    // },
    // "arsonists-lulluby": {
    //   path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-arsonists-lullaby.ogg",
    //   alwaysPreload: false,
    //   delay: 0,
    //   duration: 263, // 4:23
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
    "ambient-academy": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-academy.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-ash-hill-development": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-ash-hill-development.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.25,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-bar": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-bar.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.1,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-birdsong": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-birdsong.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.1,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-creek": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-creek.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.1,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-creepy": { // Ash Hill, Pact Grove, East Tunnel ...
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-creepy.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.6,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-diner": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-diner.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-distant-combat": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-distant-combat.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.5,
      autoplay: false,
      fadeInDuration: 5,
      showInSoundMenu: true
    },
    "ambient-farm": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-farm.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.5,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-fireplace-2": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-fire-1.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.25,
      autoplay: false,
      showInSoundMenu: true
    },
    "ambient-fireplace-3": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-fire-2.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: true
    },
    "ambient-forest-night": { // Wending, instead of crickets
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-forest-night.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.25,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-generic-buzz": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-generic-buzz.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.3,
      autoplay: false,
      showInSoundMenu: true,
    },
    "ambient-generic-vent": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-generic-vent.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.25,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-good-crowd": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-good-crowd.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.15,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-hall": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-hall.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.075,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-large-crowd": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-large-crowd.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-old-willow": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-old-willow.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.25,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-outdoor-crowd": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-outdoor-crowd.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.15,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-primary-school": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-primary-school.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.5,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-quiet-office": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-quiet-office.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.25,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-ranger-station": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-ranger-station.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.15,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-school": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-school.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.15,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-standing-stones": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-standing-stones.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.3,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-weeping-king": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-weeping-king.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-car-dirt-road": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-car-dirt-road.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-church": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-church.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-crickets": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-crickets.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-divebar": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-divebar.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
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
    "ambient-eerie-forest": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-eerie-forest.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-electricity-night": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-electricity-night.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-fireplace": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-fireplace.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-forest": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-forest.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-gunfire": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-gunfire.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-low-bass-rumble": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-low-bass-rumble.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-medical-clinic": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-medical-clinic.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
      showInSoundMenu: false,
    },
    "ambient-underground": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-underground.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
    },
    "ambient-whispering-ghosts": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-whispering-ghosts.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "ambient-session-closed": {
      path: "modules/eunos-kult-hacks/assets/sounds/ambient/ambient-session-closed.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.5,
      autoplay: false,
      showInSoundMenu: false,
    },
  },
  Weather: {
    "weather-wind-low-2": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-low-2.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.75,
      autoplay: false,
    },
    "weather-wind-low-1": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-low-1.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.75,
      autoplay: false,
    },
    "weather-wind-strong-2": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-strong-2.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "weather-wind-leafy": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-leafy.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.35,
      autoplay: false,
    },
    "weather-wind-blustery": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-blustery.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
    },
    "weather-wind-strong-1": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-strong-1.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.25,
      autoplay: false,
    },
    "weather-low-wind-hum": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-low-wind-hum.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.25,
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
      volume: 0.25,
      autoplay: false,
    },
    "weather-wind-low": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-low.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.05,
      autoplay: false,
    },
    "weather-wind-max": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-wind-max.ogg",
      alwaysPreload: false,
      delay: 0,
      fadeInDuration: 2,
      loop: true,
      sync: false,
      volume: 0.1,
      autoplay: false,
    },
    "weather-lightning": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-lightning.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.08,
      autoplay: false,
      showInSoundMenu: false,
    },
    "weather-park-wind": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-park-wind.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.25,
      autoplay: false,
      showInSoundMenu: false,
    },
    "weather-trees-wind": {
      path: "modules/eunos-kult-hacks/assets/sounds/weather/weather-trees-wind.ogg",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.25,
      autoplay: false,
      showInSoundMenu: false,
    },
  },
  Effects: {
    "effect-angel-chorus": {
      path: "modules/eunos-kult-hacks/assets/sounds/effects/effect-angel-chorus.ogg",
      alwaysPreload: true,
      delay: 0,
      loop: false,
      sync: false,
      volume: 0.75,
      autoplay: false,
      fadeInDuration: 2
    },
    "effect-church-bells": {
      path: "modules/eunos-kult-hacks/assets/sounds/effects/effect-church-bells.ogg",
      alwaysPreload: true,
      delay: 0,
      loop: false,
      sync: false,
      volume: 0.75,
      autoplay: false,
      fadeInDuration: 2
    },
    "effect-shatter-illusion-1": {
      path: "modules/eunos-kult-hacks/assets/sounds/effects/effect-shatter-illusion-1.ogg",
      alwaysPreload: true,
      delay: 0,
      loop: false,
      sync: false,
      volume: 0.75,
      autoplay: false
    },
    "effect-shatter-illusion-2": {
      path: "modules/eunos-kult-hacks/assets/sounds/effects/effect-shatter-illusion-2.ogg",
      alwaysPreload: true,
      delay: 0,
      loop: false,
      sync: false,
      volume: 0.75,
      autoplay: false
    },
    "effect-shatter-illusion-3": {
      path: "modules/eunos-kult-hacks/assets/sounds/effects/effect-shatter-illusion-3.ogg",
      alwaysPreload: true,
      delay: 0,
      loop: false,
      sync: false,
      volume: 0.75,
      autoplay: false
    },
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
      fadeInDuration: 2,
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
    },
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
  flickerIn:
    "M0,0,0.00333,0,0.00667,0,0.01,0,0.01333,0,0.01667,0,0.02,0,0.02333,0,0.02667,0,0.03,0,0.03333,0,0.03667,0,0.04,0,0.04333,0,0.04667,0,0.05,0,0.05333,0,0.05667,0,0.06,0,0.06333,0,0.06667,0,0.07,0,0.07333,0,0.07667,0,0.08,0,0.08333,0,0.08667,0,0.09,0,0.09333,0,0.09667,0,0.1,0,0.10333,0,0.10667,0,0.11,0,0.11333,0,0.11667,0,0.12,0,0.12333,0,0.12667,0,0.13,0,0.13333,0,0.13667,0,0.14,0,0.14333,0,0.14667,0,0.15,0,0.15333,0,0.15667,0,0.16,0,0.16333,0,0.16667,0,0.17,0,0.17333,0,0.17667,0,0.18,0,0.18333,0,0.18667,0,0.19,0,0.19333,0,0.19667,0,0.2,0,0.20333,0,0.20667,0,0.21,0,0.21333,0,0.21667,0,0.22,0,0.22333,0,0.22667,0,0.23,0,0.23333,0,0.23667,0,0.24,0,0.24333,0,0.24667,0,0.25,0,0.25333,0,0.25667,0,0.26,0,0.26333,0,0.26667,0,0.27,0,0.27333,0,0.27667,0,0.28,0,0.28333,0,0.28667,0,0.29,0,0.29333,0,0.29667,0,0.3,0,0.30333,0,0.30667,0,0.31,0,0.31333,0,0.31667,0,0.32,0,0.32333,0,0.32667,0,0.33,0,0.33333,0,0.33667,0,0.34,0,0.34333,0,0.34667,0,0.35,0,0.35333,0,0.35667,0,0.36,0,0.36333,0,0.36667,0,0.37,0,0.37333,0,0.37667,0,0.38,0,0.38333,0,0.38667,0,0.39,0,0.39333,0,0.39667,0,0.4,0,0.40333,0,0.40667,0,0.41,0,0.41333,0,0.41667,0,0.42,0,0.42333,0,0.42667,0,0.43,0,0.43333,0,0.43667,0,0.44,0,0.44333,0,0.44667,0,0.45,0,0.45333,0,0.45667,0,0.46,0,0.46333,0,0.46667,0,0.47,0,0.47333,0.33333,0.47667,0.66667,0.48,1,0.48333,0.66667,0.48667,0.33333,0.49,0,0.49333,0,0.49667,0,0.5,0,0.50333,0,0.50667,0,0.51,0,0.51333,0,0.51667,0,0.52,0,0.52333,0,0.52667,0,0.53,0,0.53333,0,0.53667,0,0.54,0,0.54333,0,0.54667,0,0.55,0,0.55333,0,0.55667,0,0.56,0,0.56333,0,0.56667,0,0.57,0,0.57333,0,0.57667,0,0.58,0,0.58333,0,0.58667,0,0.59,0,0.59333,0,0.59667,0,0.6,0,0.60333,0,0.60667,0,0.61,0,0.61333,0.33333,0.61667,0.66667,0.62,1,0.62333,1,0.62667,1,0.63,1,0.63333,0.66667,0.63667,0.33333,0.64,0,0.64333,0,0.64667,0,0.65,0,0.65333,0.33333,0.65667,0.66667,0.66,1,0.66333,1,0.66667,1,0.67,1,0.67333,0.66667,0.67667,0.33333,0.68,0,0.68333,0.33333,0.68667,0.66667,0.69,1,0.69333,0.66667,0.69667,0.33333,0.7,0,0.70333,0.33333,0.70667,0.66667,0.71,1,0.71333,0.66667,0.71667,0.33333,0.72,0,0.72333,0.33333,0.72667,0.66667,0.73,1,0.73333,0.66667,0.73667,0.33333,0.74,0,0.74333,0,0.74667,0,0.75,0,0.75333,0.33333,0.75667,0.66667,0.76,1,0.76333,0.66667,0.76667,0.33333,0.77,0,0.77333,0,0.77667,0,0.78,0,0.78333,0,0.78667,0,0.79,0,0.79333,0,0.79667,0,0.8,0,0.80333,0,0.80667,0,0.81,0,0.81333,0.33333,0.81667,0.66667,0.82,1,0.82333,0.66667,0.82667,0.33333,0.83,0,0.83333,0.33333,0.83667,0.66667,0.84,1,0.84333,1,0.84667,1,0.85,1,0.85333,1,0.85667,1,0.86,1,0.86333,1,0.86667,1,0.87,1,0.87333,1,0.87667,1,0.88,1,0.88333,1,0.88667,1,0.89,1,0.89333,1,0.89667,1,0.9,1,0.90333,1,0.90667,1,0.91,1,0.91333,1,0.91667,1,0.92,1,0.92333,1,0.92667,1,0.93,1,0.93333,1,0.93667,1,0.94,1,0.94333,1,0.94667,1,0.95,1,0.95333,1,0.95667,1,0.96,1,0.96333,1,0.96667,1,0.97,1,0.97333,1,0.97667,1,0.98,1,0.98333,1,0.98667,1,0.99,1,0.99333,1,0.99667,1,1,1",
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
    actor: EunosActor & { system: ActorDataPC };
    owner: User;
    isOwner: boolean;
  }

  export interface FullData extends GlobalData, LocationSettingsData {}
}

export declare namespace NPCs {
  export interface GlobalSettingsData {
    actorID: IDString;
  }
  export interface LocationSettingsData extends GlobalSettingsData {
    position: Point;
    portraitState: NPCPortraitState;
    nameState: NPCNameState;
  }
  export interface GlobalData extends GlobalSettingsData {
    actor: EunosActor & { system: ActorDataNPC };
  }
  export interface FullData extends GlobalData, LocationSettingsData {}
}

// #endregion CHARACTERS

// #region LOCATIONS ~
export declare namespace Location {
  export namespace PCData {
    export type SettingsData = PCs.LocationSettingsData;
    export type FullData = PCs.FullData;
  }

  export namespace NPCData {
    export type SettingsData = NPCs.LocationSettingsData;
    export type FullData = NPCs.FullData;
  }

  interface StaticSettingsData {
    name: string;
    key: string;
    description?: string;
    images: Record<string, string>;
    mapTransforms: Array<
      Array<{
        selector: string;
        properties: Record<string, number | string | undefined>;
      }>
    >;
    audioDataIndoors?: Record<string, Partial<EunosMediaData>>;
    audioDataOutdoors?: Record<string, Partial<EunosMediaData>>;
    isBright: boolean;
    isIndoors: boolean;
    region?: string;
  }

  interface DynamicSettingsData {
    currentImage: string | null;
    pcData: Record<IDString, PCData.SettingsData>;
    npcData: Record<IDString, NPCData.SettingsData>;
  }

  export interface SettingsData
    extends StaticSettingsData,
      DynamicSettingsData {}

  export interface SettingsData_Explicit {
    // Static properties
    name: string;
    description?: string;
    images: Record<string, string>;
    mapTransforms: Array<
      Array<{
        selector: string;
        properties: Record<string, number | string | undefined>;
      }>
    >;
    isBright: boolean;
    isIndoors: boolean;
    region?: string;
    audioDataIndoors?: Record<string, Partial<EunosMediaData>>;
    audioDataOutdoors?: Record<string, Partial<EunosMediaData>>;

    // Dynamic properties
    currentImage: string | null;
    pcData: Record<IDString, PCData.SettingsData>;
    npcData: Record<IDString, NPCData.SettingsData>;
  }

  interface DynamicFullData {
    currentImage: string | null;
    pcData: Record<"1" | "2" | "3" | "4" | "5", PCData.FullData>;
    npcData: Record<IDString, NPCData.FullData>;
    audioDataIndoors?: Record<string, EunosMedia<EunosMediaTypes.audio>>;
    audioDataOutdoors?: Record<string, EunosMedia<EunosMediaTypes.audio>>;
  }

  export interface FullData
    extends Omit<StaticSettingsData, "audioDataIndoors" | "audioDataOutdoors">,
      DynamicFullData {}
}

export const LOCATIONS: Record<string, Location.StaticSettingsData> = {
  nowhere: {
    name: "Nowhere",
    key: "nowhere",
    images: {},
    description: "",
    isBright: false,
    isIndoors: false,
    region: "",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "black",
            boxShadow: "0 0 50vw black inset",
            "--dramatic-hook-color": "white",
            "--dramatic-hook-text-shadow-color": "black",
          },
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
            z: -400,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: -3500,
            backgroundPositionY: -2826,
            filter: "hue-rotate(130deg) saturate(100%) brightness(1)",
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-7deg) rotateY(11deg) rotateX(40.0001deg)",
            background:
              "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-no-entry.webp')",
            backgroundPosition: "0px 0px",
            backgroundRepeat: "no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-7deg) rotateY(11deg) rotateX(40.0001deg)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.7) 0%, rgb(0, 0, 0) 5%)",
          },
        },
      ],
    ],
  },
  fireAccessTrailSouth: {
    name: "Fire Access Trail",
    key: "fireAccessTrailSouth",
    images: {
      "Fire Road 1":
        "modules/eunos-kult-hacks/assets/images/locations/fire-road-1.webp",
      "Fire Road Car Ahead":
        "modules/eunos-kult-hacks/assets/images/locations/fire-road-car-ahead.webp",
    },
    audioDataOutdoors: {
      "ambient-crickets": {},
      "ambient-car-dirt-road": {},
    },
    isBright: false,
    isIndoors: false,
    region: "realWorld",
    description: "",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "black",
            boxShadow: "0 0 50vw black inset",
            "--dramatic-hook-color": "white",
            "--dramatic-hook-text-shadow-color": "black",
          },
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
            z: -400,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: -2565,
            backgroundPositionY: -2826,
            filter: "hue-rotate(130deg) saturate(100%) brightness(1)",
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-7deg) rotateY(11deg) rotateX(40.0001deg)",
            background:
              "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-no-entry.webp')",
            backgroundPosition: "0px 0px",
            backgroundRepeat: "no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-7deg) rotateY(11deg) rotateX(40.0001deg)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 4%, rgba(0, 0, 0, 0.7) 8%, rgb(0, 0, 0) 19%)",
          },
        },
      ],
    ],
  },
  fireAccessTrailNorth: {
    name: "Fire Access Trail",
    key: "fireAccessTrailNorth",
    images: {
      "Fire Road 2":
        "modules/eunos-kult-hacks/assets/images/locations/fire-road-2.webp",
      "Fire Road Car Ahead":
        "modules/eunos-kult-hacks/assets/images/locations/fire-road-car-ahead.webp",
    },
    audioDataOutdoors: {
      "ambient-crickets": {},
      "ambient-forest": {},
    },
    isBright: false,
    isIndoors: false,
    region: "realWorld",
    description: "",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "black",
            boxShadow: "0 0 50vw black inset",
            "--dramatic-hook-color": "white",
            "--dramatic-hook-text-shadow-color": "black",
          },
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
            z: -400,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: -2870,
            backgroundPositionY: 1478,
            filter: "hue-rotate(130deg) saturate(100%) brightness(1)",
            transform:
              "matrix3d(-0.876669, 0.30186, 0.374608, 0, -0.477073, -0.64592, -0.595977, 0, 0.0620656, -0.70119, 0.710268, 0, -3500, -3500, 0, 1)",
            background:
              "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-no-entry.webp')",
            backgroundPosition: "0px 0px",
            backgroundRepeat: "no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(-0.876669, 0.30186, 0.374608, 0, -0.477073, -0.64592, -0.595977, 0, 0.0620656, -0.70119, 0.710268, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 4%, rgba(0, 0, 0, 0.7) 8%, rgb(0, 0, 0) 19%)",
          },
        },
      ],
    ],
  },
  willowsWendingEntry: {
    name: "Willow's Wending",
    key: "willowsWendingEntry",
    images: {
      "Polaroids - Missing":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-polaroids-missing.webp",
      "Polaroids - In Place":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-polaroids-present.webp",
      "Wending Depths 1":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-1.webp",
      "Wending Depths 2":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-2.webp",
      "Wending Depths 3":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-3.webp",
      "Hollow King":
        "modules/eunos-kult-hacks/assets/images/locations/hollow-king.webp",
    },
    audioDataOutdoors: {
      "ambient-crickets": {},
      "ambient-eerie-forest": {},
      "ambient-low-bass-rumble": {},
    },
    isBright: false,
    isIndoors: false,
    region: "realWorld",
    description: "",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "black",
            boxShadow: "0 0 50vw black inset",
            "--dramatic-hook-color": "white",
            "--dramatic-hook-text-shadow-color": "black",
          },
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
            z: -400,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: -2565,
            backgroundPositionY: -1348,
            filter: "hue-rotate(105deg) saturate(100%) brightness(1.5)",
            transform:
              "matrix3d(0.274526, 0.715165, 0.642786, 0, -0.928205, 0.0225025, 0.371389, 0, 0.25114, -0.698593, 0.669997, 0, -3500, -3500, 0, 1)",
            background:
              "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.274526, 0.715165, 0.642786, 0, -0.928205, 0.0225025, 0.371389, 0, 0.25114, -0.698593, 0.669997, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 5%, rgba(0, 0, 0, 0.7) 10%, rgb(0, 0, 0) 17%)",
          },
        },
      ],
    ],
  },
  willowsWending1: {
    name: "Willow's Wending",
    key: "willowsWending1",
    images: {
      "Wending Depths 1":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-1.webp",
      "Wending Depths 2":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-2.webp",
      "Wending Depths 3":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-3.webp",
      "Futuristic Soldier":
        "modules/eunos-kult-hacks/assets/images/locations/futuristic-soldier.webp",
      "Hollow King":
        "modules/eunos-kult-hacks/assets/images/locations/hollow-king.webp",
    },
    audioDataOutdoors: {
      "ambient-forest-night": {},
      "ambient-eerie-forest": {},
      "ambient-low-bass-rumble": {},
    },
    isBright: false,
    isIndoors: false,
    region: "willowsWending",
    description:
      "The thin, winding road named 'Willow's Wending' takes an unpredictably treacherous route through the pine forests of the Black Hills, the trees on either side so thick they defy attempts to peer into the surrounding woods.",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "black",
            boxShadow: "0 0 50vw black inset",
            "--dramatic-hook-color": "white",
            "--dramatic-hook-text-shadow-color": "black",
          },
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
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: -543,
            backgroundPositionY: -1283,
            filter: "hue-rotate(87deg) saturate(100%) brightness(1)",
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(84.9999deg) rotateY(-31.0001deg) rotateX(3.9998deg)",
            background:
              "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(84.9999deg) rotateY(-31.0001deg) rotateX(3.9998deg)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 2.5%, rgba(0, 0, 0, 0.7) 5%, rgb(0, 0, 0) 10%)",
          },
        },
      ],
    ],
  },
  willowsWending2: {
    name: "Willow's Wending",
    key: "willowsWending2",
    images: {
      "Wending Depths 1":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-1.webp",
      "Wending Depths 2":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-2.webp",
      "Wending Depths 3":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-3.webp",
      "Futuristic Soldier":
        "modules/eunos-kult-hacks/assets/images/locations/futuristic-soldier.webp",
      "Hollow King":
        "modules/eunos-kult-hacks/assets/images/locations/hollow-king.webp",
    },
    audioDataOutdoors: {
      "ambient-forest-night": {},
      "ambient-eerie-forest": {},
      "ambient-low-bass-rumble": {},
    },
    isBright: false,
    isIndoors: false,
    region: "willowsWending",
    description:
      "The thin, winding road named 'Willow's Wending' takes an unpredictably treacherous route through the pine forests of the Black Hills, the trees on either side so thick they defy attempts to peer into the surrounding woods.",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "black",
            boxShadow: "0 0 50vw black inset",
            "--dramatic-hook-color": "white",
            "--dramatic-hook-text-shadow-color": "black",
          },
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
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 1674,
            backgroundPositionY: -522,
            filter: "hue-rotate(253deg) saturate(100%) brightness(1)",
            transform:
              "matrix3d(0.0905604, -0.737609, -0.669128, 0, 0.992547, 0.121861, 0, 0, 0.0815404, -0.664141, 0.743147, 0, -3500, -3500, 0, 1)",
            background:
              "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.0905604, -0.737609, -0.669128, 0, 0.992547, 0.121861, 0, 0, 0.0815404, -0.664141, 0.743147, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 3%, rgba(0, 0, 0, 0.7) 6%, rgb(0, 0, 0) 12%)",
          },
        },
      ],
    ],
  },
  willowsWending3: {
    name: "Willow's Wending",
    key: "willowsWending3",
    images: {
      "Wending Depths 1":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-1.webp",
      "Wending Depths 2":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-2.webp",
      "Wending Depths 3":
        "modules/eunos-kult-hacks/assets/images/locations/willows-wending-depths-3.webp",
      "Futuristic Soldier":
        "modules/eunos-kult-hacks/assets/images/locations/futuristic-soldier.webp",
      "Hollow King":
        "modules/eunos-kult-hacks/assets/images/locations/hollow-king.webp",
    },
    audioDataOutdoors: {
      "ambient-forest-night": {},
      "ambient-eerie-forest": {},
      "ambient-low-bass-rumble": {},
      "weather-wind-max": {},
    },
    isBright: false,
    isIndoors: false,
    region: "willowsWending",
    description:
      "The thin, winding road named 'Willow's Wending' takes an unpredictably treacherous route through the pine forests of the Black Hills, the trees on either side so thick they defy attempts to peer into the surrounding woods.",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "black",
            boxShadow: "0 0 50vw black inset",
            "--dramatic-hook-color": "white",
            "--dramatic-hook-text-shadow-color": "black",
          },
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
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: -1261,
            backgroundPositionY: 565,
            filter: "hue-rotate(-186deg) saturate(100%) brightness(1)",
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(71.9993deg) rotateY(-40.0001deg) rotateX(11.0001deg)",
            background:
              "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(71.9993deg) rotateY(-40.0001deg) rotateX(11.0001deg)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 2.5%, rgba(0, 0, 0, 0.7) 5%, rgb(0, 0, 0) 10%)",
          },
        },
      ],
    ],
  },
  rangerStation1: {
    name: "Ranger Station #1",
    key: "rangerStation1",
    images: {},
    audioDataOutdoors: {
      "ambient-electricity-night": {},
      "ambient-crickets": {},
    },
    audioDataIndoors: {
      "ambient-fireplace-3": {},
      "ambient-generic-vent": {},
    },
    isBright: false,
    isIndoors: true,
    region: "willowsWending",
    description: "",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "black",
            boxShadow: "0 0 50vw black inset",
            "--dramatic-hook-color": "white",
            "--dramatic-hook-text-shadow-color": "black",
          },
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
            backgroundPositionX: 565,
            backgroundPositionY: 1761,
            filter: "hue-rotate(96deg) saturate(100%) brightness(1)",
            transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-2deg) rotateX(38deg)",
            background: "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-2deg) rotateX(38deg)",
            background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.7) 2%, rgb(0, 0, 0) 5%)",
          },
        },
      ]
      // [
      //   {
      //     selector: "body",
      //     properties: {
      //       background: "black",
      //       boxShadow: "0 0 50vw black inset",
      //       "--dramatic-hook-color": "white",
      //       "--dramatic-hook-text-shadow-color": "black",
      //     },
      //   },
      //   {
      //     selector: "#STAGE",
      //     properties: {
      //       perspective: 1000,
      //     },
      //   },
      //   {
      //     selector: "#STAGE #SECTION-3D",
      //     properties: {
      //       z: -100,
      //     },
      //   },
      //   {
      //     selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
      //     properties: {
      //       backgroundPositionX: 500,
      //       backgroundPositionY: 1696,
      //       filter: "hue-rotate(96deg) saturate(100%) brightness(1)",
      //       transform:
      //         "matrix3d(0.999391, -0.0348995, 0, 0, 0.0275012, 0.787531, 0.615661, 0, -0.0214863, -0.615286, 0.788011, 0, -3500, -3500, 0, 1)",
      //       background:
      //         "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
      //     },
      //   },
      //   {
      //     selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
      //     properties: {
      //       transform:
      //         "matrix3d(0.999391, -0.0348995, 0, 0, 0.0275012, 0.787531, 0.615661, 0, -0.0214863, -0.615286, 0.788011, 0, -3500, -3500, 0, 1)",
      //       background:
      //         "radial-gradient(circle at 50% 50%, transparent 2.5%, rgba(0, 0, 0, 0.7) 5%, rgb(0, 0, 0) 10%)",
      //     },
      //   },
      // ],
    ],
  },
  emmasRise: {
    name: "Emma's Rise",
    key: "emmasRise",
    images: {},
    description: "",
    audioDataOutdoors: {},
    isBright: true,
    isIndoors: false,
    region: "",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "black",
            boxShadow: "0 0 50vw black inset",
            "--dramatic-hook-color": "white",
            "--dramatic-hook-text-shadow-color": "black",
            duration: 4,
            ease: "power2.in",
          },
        },
        {
          selector: "#STAGE",
          properties: {
            perspective: 1000,
            duration: 4,
            ease: "power2.in",
          },
        },
        {
          selector: "#STAGE #SECTION-3D",
          properties: {
            z: 100,
            duration: 4,
            ease: "power2.in",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 739,
            backgroundPositionY: 1565,
            filter: "hue-rotate(96deg) saturate(100%) brightness(1)",
            transform:
              "matrix(0.0174803, 0.999847, -0.999847, 0.0174803, -3500, -3500)",
            background:
              "black url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg.webp') 0px 0px no-repeat",
            duration: 4,
            ease: "power2.in",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix(0.0174803, 0.999847, -0.999847, 0.0174803, -3500, -3500)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 2.5%, rgba(0, 0, 0, 0.7) 5%, rgb(0, 0, 0) 10%)",
            duration: 4,
            ease: "power2.in",
          },
        },
      ],
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
            duration: 15,
            ease: "back.out",
          },
        },
        {
          selector: "#STAGE",
          properties: {
            perspective: 1000,
            duration: 15,
            ease: "back.out",
          },
        },
        {
          selector: "#STAGE #SECTION-3D",
          properties: {
            z: -1000,
            duration: 15,
            ease: "back.out",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 826,
            backgroundPositionY: 1652,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(0.0092613, 0.52984, 0.848047, 0, -0.998721, 0.0470522, -0.0184903, 0, -0.0496993, -0.846792, 0.529598, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit-lowres.webp') 0px 0px no-repeat",
            duration: 15,
            ease: "back.out",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.0092613, 0.52984, 0.848047, 0, -0.998721, 0.0470522, -0.0184903, 0, -0.0496993, -0.846792, 0.529598, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgba(255, 255, 255, 0.75) 25%)",
            duration: 15,
            ease: "back.out",
          },
        },
      ],
    ],
  },
  townSquare: {
    name: "Town Square",
    key: "townSquare",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    isBright: true,
    isIndoors: false,
    region: "townSquare",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 311,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 1348,
            backgroundPositionY: 2196,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(1, 0, 0, 0, 0, 0.82904, 0.55919, 0, 0, -0.55919, 0.82904, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(1, 0, 0, 0, 0, 0.82904, 0.55919, 0, 0, -0.55919, 0.82904, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  wainwrightAcademy: {
    name: "Wainwright Academy",
    key: "wainwrightAcademy",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    audioDataIndoors: {
      "ambient-academy": {},
    },
    isBright: true,
    isIndoors: true,
    region: "academy",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 1261,
            backgroundPositionY: 1739,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(0.987689, 1.72384e-06, -0.156429, 0, 0.0919454, 0.809017, 0.580549, 0, 0.126555, -0.587785, 0.799057, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.987689, 1.72384e-06, -0.156429, 0, 0.0919454, 0.809017, 0.580549, 0, 0.126555, -0.587785, 0.799057, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  emmasRisePrimarySchool: {
    name: "Emma's Rise Primary School",
    key: "emmasRisePrimarySchool",
    images: {},
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    audioDataIndoors: {
      "ambient-primary-school": {},
    },
    isBright: true,
    isIndoors: true,
    description: "",
    region: "academy",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 621,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 978,
            backgroundPositionY: 1630,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-87.0001deg) rotateY(35.9997deg)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-87.0001deg) rotateY(35.9997deg)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  emmasRiseMiddleSchoolForWaywardBoys: {
    name: "Emma's Rise Middle School for Wayward Boys",
    key: "emmasRiseMiddleSchoolForWaywardBoys",
    images: {},
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    audioDataIndoors: {
      "ambient-school": {},
    },
    isBright: true,
    isIndoors: true,
    description: "",
    region: "academy",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 1913,
            backgroundPositionY: 1652,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(-0.0316297, 0.905755, 0.42262, 0, -0.997985, -0.0053527, -0.0632192, 0, -0.0549989, -0.423768, 0.904099, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(-0.0316297, 0.905755, 0.42262, 0, -0.997985, -0.0053527, -0.0632192, 0, -0.0549989, -0.423768, 0.904099, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  townHall: {
    name: "Town Hall",
    key: "townHall",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    audioDataIndoors: {
      "ambient-hall": {},
    },
    isBright: true,
    isIndoors: true,
    region: "townSquare",
    mapTransforms: [
      [
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
            z: 200
          }
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 1283,
            backgroundPositionY: 2529,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform: "matrix3d(1, 0, 0, 0, 0, 0.766041, 0.642792, 0, 0, -0.642792, 0.766041, 0, -3500, -3500, 0, 1)",
            background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform: "matrix3d(1, 0, 0, 0, 0, 0.766041, 0.642792, 0, 0, -0.642792, 0.766041, 0, -3500, -3500, 0, 1)",
            background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ]
    ],
  },
  emmasRiseCommunityCenter: {
    name: "Emma's Rise Community Center",
    key: "emmasRiseCommunityCenter",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    audioDataIndoors: {
      "ambient-church": {},
      "ambient-hall": {}
    },
    isBright: true,
    isIndoors: true,
    region: "townSquare",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 373,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 1739,
            backgroundPositionY: 2152,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(1, 0, 0, 0, 0, 0.87462, 0.48481, 0, 0, -0.48481, 0.87462, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(1, 0, 0, 0, 0, 0.87462, 0.48481, 0, 0, -0.48481, 0.87462, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  oldCemetery: {
    name: "Old Cemetery",
    key: "oldCemetery",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    audioDataIndoors: {
      "ambient-old-willow": {},
      "ambient-creepy": {}
    },
    isBright: true,
    isIndoors: false,
    region: "kingsgraveEstate",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 559,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 2043,
            backgroundPositionY: 2022,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(0.0133706, 0.765924, 0.642792, 0, -0.999848, 0.0174542, 0, 0, -0.0112194, -0.642694, 0.766041, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.0133706, 0.765924, 0.642792, 0, -0.999848, 0.0174542, 0, 0, -0.0112194, -0.642694, 0.766041, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  lanternWayEast: {
    name: "Lantern Way, East",
    key: "lanternWayEast",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    audioDataIndoors: {
      "ambient-standing-stones": {}
    },
    isBright: true,
    isIndoors: false,
    region: "kingsgraveEstate",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 745,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 2043,
            backgroundPositionY: 1957,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(0.491331, 0.786297, 0.374608, 0, -0.869914, 0.421823, 0.255568, 0, 0.042934, -0.451445, 0.891265, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.491331, 0.786297, 0.374608, 0, -0.869914, 0.421823, 0.255568, 0, 0.042934, -0.451445, 0.891265, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  lanternWayWest: {
    name: "Lantern Way, West",
    key: "lanternWayWest",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    audioDataIndoors: {
      "ambient-standing-stones": {}
    },
    isBright: true,
    isIndoors: false,
    region: "kingsgraveEstate",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 745,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 2043,
            backgroundPositionY: 2304,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(0.445649, -0.874636, -0.190809, 0, 0.891007, 0.45399, 0, 0, 0.0866255, -0.170012, 0.981627, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.445649, -0.874636, -0.190809, 0, 0.891007, 0.45399, 0, 0, 0.0866255, -0.170012, 0.981627, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  firstBankOfEmmasRise: {
    name: "First Bank of Emma's Rise",
    key: "firstBankOfEmmasRise",
    images: {},
    description: "",
    region: "townSquare",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    audioDataIndoors: {
      "ambient-quiet-office": {},
    },
    isBright: true,
    isIndoors: true,
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 621,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 1500,
            backgroundPositionY: 2304,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(0.0960292, 0.78214, 0.615659, 0, -0.994292, 0.0464866, 0.0960305, 0, 0.0464894, -0.621366, 0.78214, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.0960292, 0.78214, 0.615659, 0, -0.994292, 0.0464866, 0.0960305, 0, 0.0464894, -0.621366, 0.78214, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  daysGoByPub: {
    name: "Days Go By Pub",
    key: "daysGoByPub",
    images: {},
    description: "",
    region: "townSquare",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    audioDataIndoors: {
      "ambient-divebar": {},
    },
    isBright: true,
    isIndoors: true,
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 621,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 1065,
            backgroundPositionY: 2261,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-91.9997deg) rotateY(35.9997deg)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-91.9997deg) rotateY(35.9997deg)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  dannysDiner: {
    name: "Danny's Diner",
    key: "dannysDiner",
    images: {},
    description: "",
    region: "townSquare",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    audioDataIndoors: {
      "ambient-diner": {},
    },
    isBright: true,
    isIndoors: true,
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 621,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 1065,
            backgroundPositionY: 2391,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-88.9999deg) rotateY(35.9997deg)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-88.9999deg) rotateY(35.9997deg)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  rangerStation3: {
    name: "Ranger Station #3",
    key: "rangerStation3",
    images: {},
    description: "",
    region: "townSquare",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    audioDataIndoors: {
      "ambient-fireplace": {},
      "ambient-ranger-station": {}
    },
    isBright: true,
    isIndoors: true,
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 621,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 1283,
            backgroundPositionY: 2152,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(-0.999848, -0.0174507, 0, 0, 0.0149582, -0.857041, -0.515031, 0, 0.0089876, -0.514952, 0.857172, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(-0.999848, -0.0174507, 0, 0, 0.0149582, -0.857041, -0.515031, 0, 0.0089876, -0.514952, 0.857172, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  medicalClinic: {
    name: "Medical Clinic",
    key: "medicalClinic",
    images: {},
    description: "",
    audioDataIndoors: {
      "ambient-medical-clinic": {},
    },
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    isBright: true,
    isIndoors: true,
    region: "holtFarms",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 621,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 804,
            backgroundPositionY: 2630,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(-0.999848, -0.0174507, 0, 0, 0.0152627, -0.874487, -0.48481, 0, 0.0084602, -0.484736, 0.87462, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(-0.999848, -0.0174507, 0, 0, 0.0152627, -0.874487, -0.48481, 0, 0.0084602, -0.484736, 0.87462, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  holtFamilyLodge: {
    name: "Holt Family Lodge",
    key: "holtFamilyLodge",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-leafy": {},
      "ambient-farm": {}
    },
    audioDataIndoors: {
      "ambient-fireplace-2": {},
      "ambient-hall": {}
    },
    isBright: true,
    isIndoors: true,
    region: "holtFarms",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 587,
            backgroundPositionY: 2783,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(-0.0267332, -0.765578, -0.642788, 0, 0.999565, -0.0124617, -0.0267292, 0, 0.0124531, -0.643223, 0.765578, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(-0.0267332, -0.765578, -0.642788, 0, 0.999565, -0.0124617, -0.0267292, 0, 0.0124531, -0.643223, 0.765578, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  holtFarms: {
    name: "Holt Farms",
    key: "holtFarms",
    images: {},
    description: "",
    audioDataOutdoors: {
      "ambient-farm": {},
      "ambient-birdsong": {}
    },
    isBright: true,
    isIndoors: false,
    region: "holtFarms",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 22,
            backgroundPositionY: 2848,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(-0.0267332, -0.765578, -0.642788, 0, 0.999565, -0.0124617, -0.0267292, 0, 0.0124531, -0.643223, 0.765578, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(-0.0267332, -0.765578, -0.642788, 0, 0.999565, -0.0124617, -0.0267292, 0, 0.0124531, -0.643223, 0.765578, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  theGreenhouse: {
    name: "The Greenhouse",
    key: "theGreenhouse",
    images: {},
    description: "",
    audioDataIndoors: {
      "ambient-generic-vent": {}
    },
    audioDataOutdoors: {
      "ambient-farm": {},
      "ambient-birdsong": {}
    },
    isBright: true,
    isIndoors: true,
    region: "holtFarms",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 435,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: -43,
            backgroundPositionY: 3043,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(0.998782, -0.03488, -0.0348995, 0, 0.0489758, 0.786779, 0.615289, 0, 0.0059969, -0.616249, 0.787529, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.998782, -0.03488, -0.0348995, 0, 0.0489758, 0.786779, 0.615289, 0, 0.0059969, -0.616249, 0.787529, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  theAerie: {
    name: "The Aerie",
    key: "theAerie",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
      "ambient-birdsong": {}
    },
    isBright: true,
    isIndoors: false,
    region: "holtFarms",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: -543,
            backgroundPositionY: 3087,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(0.495922, -0.612392, -0.61566, 0, 0.862786, 0.427744, 0.269511, 0, 0.0982984, -0.664839, 0.740491, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.495922, -0.612392, -0.61566, 0, 0.862786, 0.427744, 0.269511, 0, 0.0982984, -0.664839, 0.740491, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  beaconHill: {
    name: "Beacon Hill",
    key: "beaconHill",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    isBright: true,
    isIndoors: false,
    region: "beaconHill",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 674,
            backgroundPositionY: 2239,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-91.9999deg) rotateY(35.9996deg) rotateX(-1.9997deg)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-91.9999deg) rotateY(35.9996deg) rotateX(-1.9997deg)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  bellTower: {
    name: "Bell Tower",
    key: "bellTower",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    audioDataIndoors: {
      "ambient-church": {},
      "effect-church-bells": {loop: false}
    },
    isBright: true,
    isIndoors: true,
    region: "beaconHill",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 621,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 22,
            backgroundPositionY: 2174,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(-0.0621504, -0.888837, -0.453989, 0, 0.997564, -0.069753, 0, 0, -0.0316671, -0.452883, 0.891007, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(-0.0621504, -0.888837, -0.453989, 0, 0.997564, -0.069753, 0, 0, -0.0316671, -0.452883, 0.891007, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  beaconObservatory: {
    name: "Beacon Observatory",
    key: "beaconObservatory",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    audioDataIndoors: {
      "ambient-academy": {},
      "ambient-quiet-office": {}
    },
    isBright: true,
    isIndoors: true,
    region: "beaconHill",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 621,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 174,
            backgroundPositionY: 1935,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-93.9998deg) rotateY(26.9999deg)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotate(-93.9998deg) rotateY(26.9999deg)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  beaconLibrary: {
    name: "Beacon Library",
    key: "beaconLibrary",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-blustery": {},
    },
    audioDataIndoors: {
      "ambient-academy": {},
    },
    isBright: true,
    isIndoors: true,
    region: "beaconHill",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 621,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 391,
            backgroundPositionY: 2174,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(1, 0, 0, 0, 0, 0.82904, 0.55919, 0, 0, -0.55919, 0.82904, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(1, 0, 0, 0, 0, 0.82904, 0.55919, 0, 0, -0.55919, 0.82904, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  theEastTunnel: {
    name: "The East Tunnel",
    key: "theEastTunnel",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-low-wind-hum": {},
    },
    audioDataIndoors: {
      "ambient-underground": {},
      "ambient-creepy": {}
    },
    isBright: true,
    isIndoors: true,
    region: "eastTunnel",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 3065,
            backgroundPositionY: -370,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(0.066773, 0.763126, 0.64279, 0, -0.992693, -0.0140822, 0.119839, 0, 0.100504, -0.646096, 0.75661, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(0.066773, 0.763126, 0.64279, 0, -0.992693, -0.0140822, 0.119839, 0, 0.100504, -0.646096, 0.75661, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  theWeepingKing: {
    name: "The Weeping King",
    key: "theWeepingKing",
    images: {},
    description: "",
    audioDataOutdoors: {
      "ambient-weeping-king": {},
      "ambient-birdsong": {}
    },
    isBright: true,
    isIndoors: false,
    region: "residential",
    mapTransforms: [
      [
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          },
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
            z: 621,
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 739,
            backgroundPositionY: 739,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform:
              "matrix3d(-0.0621505, -0.888838, -0.453987, 0, 0.998062, -0.0539028, -0.0311004, 0, 0.003172, -0.45504, 0.890465, 0, -3500, -3500, 0, 1)",
            background:
              "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform:
              "matrix3d(-0.0621505, -0.888838, -0.453987, 0, 0.998062, -0.0539028, -0.0311004, 0, 0.003172, -0.45504, 0.890465, 0, -3500, -3500, 0, 1)",
            background:
              "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  pactGrove: {
    name: "Pact Grove",
    key: "pactGrove",
    images: {},
    description: "",
    audioDataOutdoors: {
      "ambient-birdsong": {},
      "ambient-creepy": {},
      "ambient-old-willow": {}
    },
    isBright: true,
    isIndoors: false,
    region: "hollowood",
    mapTransforms: [
      [
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
            backgroundPositionX: 2435,
            backgroundPositionY: 2326,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform: "matrix3d(-0.0549731, 0.786093, 0.615659, 0, -0.984895, -0.144086, 0.0960305, 0, 0.164197, -0.60108, 0.78214, 0, -3500, -3500, 0, 1)",
            background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform: "matrix3d(-0.0549731, 0.786093, 0.615659, 0, -0.984895, -0.144086, 0.0960305, 0, 0.164197, -0.60108, 0.78214, 0, -3500, -3500, 0, 1)",
            background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ],
    ],
  },
  oldBridge: {
    name: "Old Bridge",
    key: "oldBridge",
    images: {},
    description: "",
    audioDataOutdoors: {
      "ambient-creek": {},
      "weather-trees-wind": {}
    },
    isBright: true,
    isIndoors: false,
    region: "hollowood",
    mapTransforms: [
      [
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
            backgroundPositionX: 2630,
            backgroundPositionY: 2152,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform: "matrix3d(-0.554731, 0.6161, 0.559191, 0, -0.808272, -0.558496, -0.18649, 0, 0.19741, -0.555431, 0.807791, 0, -3500, -3500, 0, 1)",
            background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform: "matrix3d(-0.554731, 0.6161, 0.559191, 0, -0.808272, -0.558496, -0.18649, 0, 0.19741, -0.555431, 0.807791, 0, -3500, -3500, 0, 1)",
            background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ]
    ],
  },
  oldTreeLine: {
    name: "Old Tree Line",
    key: "oldTreeLine",
    images: {},
    description: "",
    audioDataOutdoors: {
      "ambient-old-willow": {},
      "ambient-creepy": {}
    },
    isBright: true,
    isIndoors: false,
    region: "hollowood",
    mapTransforms: [
      [
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
            z: 373
          }
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 2783,
            backgroundPositionY: 2065,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform: "matrix3d(-0.610574, 0.53076, 0.587787, 0, -0.790826, -0.448311, -0.416668, 0, 0.0423605, -0.719243, 0.693466, 0, -3500, -3500, 0, 1)",
            background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform: "matrix3d(-0.610574, 0.53076, 0.587787, 0, -0.790826, -0.448311, -0.416668, 0, 0.0423605, -0.719243, 0.693466, 0, -3500, -3500, 0, 1)",
            background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ]
    ]
  },
  oldWillow: {
    name: "Old Willow",
    key: "oldWillow",
    images: {},
    description: "",
    audioDataOutdoors: {
      "ambient-old-willow": {},
      "effect-angel-chorus": {loop: false}
    },
    isBright: true,
    isIndoors: false,
    region: "hollowood",
    mapTransforms: [[
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
          backgroundPositionX: 2652,
          backgroundPositionY: 2696,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.0149596, 0.857037, 0.515038, 0, -0.999848, 0.0174524, 0, 0, -0.0089886, -0.51496, 0.857167, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.0149596, 0.857037, 0.515038, 0, -0.999848, 0.0174524, 0, 0, -0.0089886, -0.51496, 0.857167, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]]
  },
  standingStones: {
    name: "Standing Stones",
    key: "standingStones",
    images: {},
    description: "",
    audioDataOutdoors: {
      "ambient-standing-stones": {}
    },
    isBright: true,
    isIndoors: false,
    region: "hollowood",
    mapTransforms: [[
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
          backgroundPositionX: 2870,
          backgroundPositionY: 2348,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.0155487, 0.890872, 0.453989, 0, -0.999848, 0.0174507, 0, 0, -0.0079224, -0.45392, 0.891007, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.0155487, 0.890872, 0.453989, 0, -0.999848, 0.0174507, 0, 0, -0.0079224, -0.45392, 0.891007, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]]
  },
  rangerStation4: {
    name: "Ranger Station #4",
    key: "rangerStation4",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    audioDataIndoors: {
      "ambient-fireplace": {},
      "ambient-ranger-station": {}
    },
    isBright: true,
    isIndoors: true,
    region: "hollowood",
    mapTransforms: [[
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
          backgroundPositionX: 2957,
          backgroundPositionY: 2565,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(0.012971, 0.743034, 0.669128, 0, -0.999848, 0.0174542, 0, 0, -0.0116791, -0.669026, 0.743147, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(0.012971, 0.743034, 0.669128, 0, -0.999848, 0.0174542, 0, 0, -0.0116791, -0.669026, 0.743147, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]]
  },
  redemptionHouse: {
    name: "Redemption House",
    key: "redemptionHouse",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    audioDataIndoors: {
      "ambient-low-bass-rumble": {}
    },
    isBright: true,
    isIndoors: true,
    region: "townSquare",
    mapTransforms: [[
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
          backgroundPositionX: 1739,
          backgroundPositionY: 1978,
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
    ]]
  },
  rangerStation2: {
    name: "Ranger Station #2",
    key: "rangerStation2",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-leafy": {},
      "ambient-old-willow": {},
      "ambient-creepy": {}
    },
    audioDataIndoors: {
      "ambient-fireplace": {},
      "ambient-ranger-station": {}
    },
    isBright: true,
    isIndoors: true,
    region: "eastTunnel",
    mapTransforms: [[
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
          backgroundPositionX: 2674,
          backgroundPositionY: 283,
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
    ]]
  },
  ashHill: {
    name: "Ash Hill",
    key: "ashHill",
    images: {},
    description: "",
    audioDataOutdoors: {
      "ambient-creepy": {},
      "weather-wind-blustery": {}
    },
    isBright: true,
    isIndoors: false,
    region: "ashHill",
    mapTransforms: [[
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
          z: 186
        }
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          backgroundPositionX: 1522,
          backgroundPositionY: 2717,
          filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
          transform: "matrix3d(1, 0, 0, 0, 0, 0.82904, 0.55919, 0, 0, -0.55919, 0.82904, 0, -3500, -3500, 0, 1)",
          background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          transform: "matrix3d(1, 0, 0, 0, 0, 0.82904, 0.55919, 0, 0, -0.55919, 0.82904, 0, -3500, -3500, 0, 1)",
          background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
        },
      },
    ]]
  },
  ashHillDevelopment: {
    name: "Ash Hill Development",
    key: "ashHillDevelopment",
    images: {},
    description: "",
    audioDataIndoors: {
      "ambient-creepy": {},
      "ambient-ash-hill-development": {}
    },
    isBright: true,
    isIndoors: false,
    region: "ashHill",
    mapTransforms: [
      [
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
            backgroundPositionX: 1739,
            backgroundPositionY: 2783,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform: "matrix3d(1, 0, 0, 0, 0, 0.82904, 0.55919, 0, 0, -0.55919, 0.82904, 0, -3500, -3500, 0, 1)",
            background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform: "matrix3d(1, 0, 0, 0, 0, 0.82904, 0.55919, 0, 0, -0.55919, 0.82904, 0, -3500, -3500, 0, 1)",
            background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ]
    ]
  },
  kingsgraveEstate: {
    name: "Kingsgrave Estate",
    key: "kingsgraveEstate",
    images: {},
    description: "",
    audioDataOutdoors: {
      "ambient-old-willow": {}
    },
    isBright: true,
    isIndoors: false,
    region: "kingsgraveEstate",
    mapTransforms: [
      [
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
            z: 186
          }
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 2043,
            backgroundPositionY: 2457,
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
    ]
  },
  oldChapel: {
    name: "Old Chapel",
    key: "oldChapel",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    audioDataIndoors: {
      "ambient-church": {}
    },
    isBright: true,
    isIndoors: true,
    region: "kingsgraveEstate",
    mapTransforms: [
      [
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
            z: 745
          }
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: 2435,
            backgroundPositionY: 2761,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotateX(40.0003deg)",
            background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform: "translate(-50%, -50%) translate3d(0px, 0px, 0px) rotateX(40.0003deg)",
            background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ]
    ]
  },
  kingsgraveManor: {
    name: "Kingsgrave Manor",
    key: "kingsgraveManor",
    images: {},
    description: "",
    audioDataOutdoors: {
      "weather-wind-leafy": {},
    },
    audioDataIndoors: {
      "ambient-hall": {}
    },
    isBright: true,
    isIndoors: true,
    region: "kingsgraveEstate",
    mapTransforms: [
      [
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
            backgroundPositionX: 2174,
            backgroundPositionY: 2761,
            filter: "hue-rotate(9deg) saturate(100%) brightness(2)",
            transform: "matrix3d(1, 0, 0, 0, 0, 0.766041, 0.642792, 0, 0, -0.642792, 0.766041, 0, -3500, -3500, 0, 1)",
            background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform: "matrix3d(1, 0, 0, 0, 0, 0.766041, 0.642792, 0, 0, -0.642792, 0.766041, 0, -3500, -3500, 0, 1)",
            background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ]
    ]
  }

};

// #endregion

// #region LOADING SCREENS ~
export const LOADING_SCREEN_DATA = {
  "Alexandra Errante": {
    prefix: "",
    title: "Alexandra Errante",
    subtitle: "Madness Magician, Enlightened",
    home: "Elysium",
    body: "Once a tormented girl lost in madness, Alexandra Errante found salvation in blood rites and arcane whispers. With her mind tethered by magic, she walks the world, seeking others who glimpse the Truth. Behind her, the echoes of her past linger—parents driven mad, visions burned into consciousness, and a hunger for understanding that may yet consume her.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/alexandra-errante-enlightened-madness-magician.webp",
  },
  "Chayot Ha Kodesh": {
    prefix: "the",
    title: "Chayot Ha Kodesh",
    subtitle: "Angelic Choir of Kether, Archon of Hierarchy",
    home: "Metropolis",
    body: "Angels were once divine warriors and servants of the Demiurge, but with His fall, they became lost and broken. Some still serve the Archons, others have fallen into madness, and a rare few have chosen to walk their own path. <br><br> The Chayot Ha Kodesh were the mightiest of the Choirs, sworn to Kether. Their hymns once made the worlds tremble, proclaiming the Demiurge's absolute dominion. Now, few remain. Those that do reside atop the highest Citadels, waiting in black sarcophagi or frozen upon ebony thrones, refusing to believe their god is gone.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/angel-chayot-ha-kodesh.webp",
  },
  Seraphim: {
    prefix: "the",
    title: "Seraphim",
    subtitle: "Angelic Choir of Geburah, Archon of Law",
    home: "Metropolis",
    body: "Angels were once divine warriors and servants of the Demiurge, but with His fall, they became lost and broken. Some still serve the Archons, others have fallen into madness, and a rare few have chosen to walk their own path. <br><br> The Seraphim serve Geburah, bound to uphold the Law. They etch ancient decrees onto iron tablets and follow them without question, suppressing doubt with rigid obedience. Their devotion makes them fearsome warriors, sent into Elysium and beyond to crush defiance and impose Geburah's will upon the unruly.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/angel-seraphim.webp",
  },
  Cherubim: {
    prefix: "the",
    title: "Cherubim",
    subtitle: "Angelic Choir of Yesod, Archon of Avarice",
    home: "Elysium",
    body: "Angels were once divine warriors and servants of the Demiurge, but with His fall, they became lost and broken. Some still serve the Archons, others have fallen into madness, and a rare few have chosen to walk their own path. <br><br> The Cherubim were once administrators of Yesod's domain, tending the machinery that kept the Illusion intact. When Yesod fell, they scattered. Some were hunted down, while others slipped into Elysium, gathering power in secret. Now, they build their own empires, clinging to faded authority or pledging themselves to new masters.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/angel-cherubim.webp",
  },
  "Gamichicoth's Clergy": {
    prefix: "the",
    title: "Clergy of Gamichicoth",
    subtitle: "Preachers of Fear",
    home: "Inferno",
    body: "Inferno's clergies are both preachers and interpreters of the Death Angels' will, spreading their dark gospel through ritual, agony, and madness. They are nepharites, fallen angels, and broken souls, bound to their masters in both devotion and suffering. <br><br> Gamichicoth's clergy are the diviners of hidden truths, sifting through dreams, numbers, and paranoia to find meaning. Their whispers spread like wildfire, seeding fear and uncertainty. Every gesture, every rumor is a cipher, a riddle meant to unravel trust and drown the world in doubt.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/clergy-gamichicoth.webp",
  },
  "Golab's Clergy": {
    prefix: "the",
    title: "Clergy of Golab",
    subtitle: "Preachers of Torment",
    home: "Inferno",
    body: "Inferno's clergies are both preachers and interpreters of the Death Angels' will, spreading their dark gospel through ritual, agony, and madness. They are nepharites, fallen angels, and broken souls, bound to their masters in both devotion and suffering. <br><br> Golab's clergy carve their scripture into flesh, hammer sacred nails into skulls, and offer agony as worship. Their rituals are a hymn of screams, their sacred fires fed with severed flesh. Through pain, they seek enlightenment, scouring the soul clean in blood and torment.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/clergy-golab.webp",
  },
  "Nahemoth's Clergy": {
    prefix: "the",
    title: "Clergy of Nahemoth",
    subtitle: "Preachers of Discord",
    home: "Inferno",
    body: "Inferno's clergies are both preachers and interpreters of the Death Angels' will, spreading their dark gospel through ritual, agony, and madness. They are nepharites, fallen angels, and broken souls, bound to their masters in both devotion and suffering. <br><br> Nahemoth's clergy twist the world to their master's design, warping nature and wrenching truth from storm and silence. They push their followers through mazes of blades, drown them in brackish waters, and read omens in the grinding of ancient machines. Their bodies fester with infection, their flesh reshaped by unseen forces.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/clergy-nahemoth.webp",
  },
  "Biomechanical Keepers": {
    prefix: "",
    title: "Biomechanical Keepers",
    subtitle: "Wardens of the Underworld",
    home: "the Underworld",
    body: "Once rulers of Ktonor, the Biomechanical Keepers were created to safeguard the Children of the Underworld. Towering beings of flesh and metal, they birth the next generation through artificial wombs but cannot create more of themselves. Their dwindling numbers and growing opposition threaten their grip on the Underworld, yet their love for the children they protect remains absolute.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/biomechanical-keeper.webp",
  },
  "Famaria": {
    prefix: "",
    title: "Famaria",
    subtitle: "Heirs of Ktonor",
    home: "the Underworld",
    body: "Draped in ceremonial robes and armed with venom-dripping relics, the Famaria claim to be Ktonor's true architects. They openly oppose the Biomechanical Keepers, seeking to reclaim dominion over the Underworld. Their whispered dealings with Inferno's clergy hint at a coming war, and soon, the shadows may rise against their former wardens.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/famaria.webp",
  },
  "God of the Highways": {
    prefix: "the",
    title: "God of the Highways",
    subtitle: "Drifter Between Worlds",
    home: "Elysium",
    body: "The pulse of the cities has drawn gods from beyond, dwelling in the periphery of our world, hidden in the static between moments. They linger in alleys, sit beside us on buses, and whisper from flickering screens. <br><br> The God of the Highways exists in the glow of streetlights and the roar of engines. A tattered figure at truck stops, a shadow at the roadside, its presence lingers in distorted radio signals and phantom handprints on fogged glass. It moves at lightning speed along asphalt veins, drinking from the dying after collisions, hoarding keys and relics of the True Reality.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/the-god-of-the-highways.webp",
  },
  "Iaineivša and Ašvieniai": {
    prefix: "",
    title: "Iaineivša and Ašvieniai",
    subtitle: "The Song of Power",
    home: "Elysium",
    body: "The pulse of the cities has drawn gods from beyond, dwelling in the periphery of our world, hidden in the static between moments. They linger in alleys, sit beside us on buses, and whisper from flickering screens. <br><br> Iaineivša is the past, Ašvieniai the future, twin forces meeting at 65.41 Hz. He stains reflections with blood and bends the world's edges. She moves like a storm, crackling with digital fury. Their music sings through the airwaves, but their hunger remains, recalling the screams of young boys lashed to death on their altar. When the hunger grows unbearable, they hunt, devouring flesh in the dead of night.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/iaineivsa-and-asvieniai.webp",
  },
  "Swap Dealer": {
    prefix: "the",
    title: "Swap Dealer",
    subtitle: "Merchant of the Forgotten",
    home: "Elysium",
    body: "The pulse of the cities has drawn gods from beyond, dwelling in the periphery of our world, hidden in the static between moments. They linger in alleys, sit beside us on buses, and whisper from flickering screens. <br><br> The Swap Dealer sits in a shack within a landfill at the world's fraying edges, surrounded by trinkets both mundane and divine. Sickly and bloated, he smells of decay and old promises. He sees everything his visitors own and understands every object he has ever touched. He does not give—he trades. And his prices are never fair.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/the-swap-dealer.webp",
  },
  "Iramin-Sul": {
    prefix: "",
    title: "Iramin-Sul",
    subtitle: "Face of the Void",
    home: "Gaia",
    body: "Iramin-Sul moves ceaselessly through forests, deserts, and frozen plains, its wake littered with broken worshippers—humans, angels, and forgotten gods who sing its praises or die screaming. It has no face of its own, only a gaping void, but when it wears the skinned face of a devoured slave, it can laugh, drink, and see for a single night. It searches tirelessly for its lost twin, hoping its song will pierce the Illusion and lead them home.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/iramin-sul.webp",
  },
  "Crazed Dancers": {
    prefix: "the",
    title: "Crazed Dancers",
    subtitle: "Mad Dervishes",
    home: "Elysium",
    body: "Once human, the Crazed Dancers are now grotesque abominations, fused back to back, spinning in endless dervish dances. Their ragged limbs and tattered feet move in eerie patterns, their twisted melodies eroding the Illusion and tearing open portals between worlds. They are indifferent to onlookers—until their dance is interrupted. Then, with shrieking mouths and flailing limbs, they slaughter without hesitation before vanishing into the void.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/the-crazed-dancers.webp",
  },




  // Azghoul: {
  //   prefix: "",
  //   title: "Azghouls",
  //   subtitle: "Our Forgotten Thralls",
  //   home: "Metropolis",
  //   body: "The azghouls were once exquisite beings with a proud civilization, until we conquered their world and grafted exoskeletal parasites to their bodies to compel their servitude. They haunt the barren streets of Metropolis to this day, but we have forgotten how to make them obey.",
  //   image: "modules/eunos-kult-hacks/assets/images/loading-screen/azghoul.webp",
  // },
  // Gynachid: {
  //   prefix: "",
  //   title: "Gynachids",
  //   subtitle: "Mothers No More",
  //   home: "Metropolis",
  //   body: "Solitary carnivores, gynachids hunt in Metropolis and other worlds beyond the Illusion. Once enslaved to our rule, we took their ability to create offspring as a means of control. In the eons since, they have adapted, and now implant their fetuses in human hosts to grow.",
  //   image:
  //     "modules/eunos-kult-hacks/assets/images/loading-screen/gynachid.webp",
  // },
  // Tekron: {
  //   prefix: "",
  //   title: "Tekrons",
  //   subtitle: "Caretakers of the Machine City",
  //   home: "Metropolis",
  //   body: "Tekrons are creatures of meat, bone, and plastic, cybernetic life forms originating from the Eternal City where they tend the ancient machinery there. Possessed of little intelligence, they do not understand that Metropolis and its old order have crumbled, and they continue maintaining the aging systems as they have always done.",
  //   image: "modules/eunos-kult-hacks/assets/images/loading-screen/tekron.webp",
  // },
  // "Yōko Sakai": {
  //   prefix: "",
  //   title: "Yōko Sakai",
  //   subtitle: "Dream Princess of the Crimson Delirium",
  //   home: "Limbo",
  //   body: "Once a geisha, now a Dream Princess of Limbo, Yōko Sakai rules a realm of opium haze and whispered desires. Here, courtesans offer tea alongside syringes of heroin and the crystallized blood of angels. Those who fail to bow before her beauty are woven into the rice-paper walls of her palace, forever part of her domain. Yet, those who earn her favor may receive whispered secrets of Limbo or passage through the shifting dreamways.",
  //   image:
  //     "modules/eunos-kult-hacks/assets/images/loading-screen/dream-princess.webp",
  // },
  // Lictor: {
  //   prefix: "",
  //   title: "Lictors",
  //   subtitle: "Our Jailers",
  //   home: "Elysium",
  //   body: "The Lictors are the veiled wardens of our prison, shaping laws, faith, and industry to keep us blind. They are the unyielding judges, the priests who mold sin into chains, the executives who barter away futures, the police chiefs who dictate law with iron resolve. They rarely kill—unless we try to escape. Beneath the Illusion they are bloated, translucent monsters over eight feet tall, with prehensile, barbed tongues a meter long.",
  //   image: "modules/eunos-kult-hacks/assets/images/loading-screen/lictor.webp",
  // },
  // Nepharite: {
  //   prefix: "",
  //   title: "Nepharites",
  //   subtitle: "Priests of Pain",
  //   home: "Inferno",
  //   body: "Nepharites are Inferno's high priests of suffering, torturers and prophets who flay souls to nourish the Death Angels. They weave pacts, shape agony into worship, and slip into Elysium through cracks in the Illusion, draped in robes of flayed flesh and adorned with gleaming knives. Where they walk, the air is thick with the scent of blood and incense.",
  //   image:
  //     "modules/eunos-kult-hacks/assets/images/loading-screen/nepharite.webp",
  // },
  // Purgatide: {
  //   prefix: "",
  //   title: "Purgatides",
  //   subtitle: "The Mutilated Damned",
  //   home: "Inferno",
  //   body: "Purgatides are the discarded remnants of Inferno's endless tortures, little more than torn flesh held together by rusted clamps and thread. Their butchered bodies leak blood and pus, concealed beneath tattered coats. Mindless and fanatical, they shuffle through Elysium as hollow servants of razides and nepharites, their fevered eyes betraying the agony they no longer recognize as their own.",
  //   image:
  //     "modules/eunos-kult-hacks/assets/images/loading-screen/purgatide.webp",
  // },
  // Razide: {
  //   prefix: "",
  //   title: "Razides",
  //   subtitle: "Horrors of Flesh and Steel",
  //   home: "Inferno",
  //   body: "Razides are forged from the tortured remnants of souls torn from Inferno's purgatories, their flesh fused with tubes, razors and grinding gears, their minds enslaved by a writhing parasitic worm harvested from the Underworld. Hulking brutes of Inferno, they serve the Death Angels as warriors and enforcers, spreading terror and bloodshed in Elysium's shadows.",
  //   image: "modules/eunos-kult-hacks/assets/images/loading-screen/razide.webp",
  // },
  // "Moth Child": {
  //   prefix: "the",
  //   title: "Moth Child",
  //   subtitle: "Whisperer of Dreams",
  //   home: "Limbo",
  //   body: "The Moth Child is a tragic dream being, its naked, ash-grey body covered in moths that emerge from its flesh. It haunts solitary victims, whispering in dreams and feeding on their blood in Elysium. As it intrudes upon dreams, the fluttering of moth wings becomes a constant presence, and the victim begins to attract moths in the waking world.",
  //   image:
  //     "modules/eunos-kult-hacks/assets/images/loading-screen/the-moth-child.webp",
  // },
  // "The Seamstress": {
  //   prefix: "the",
  //   title: "Seamstress",
  //   subtitle: "Stitcher of Dreams",
  //   home: "Limbo",
  //   body: "The Seamstress is a dream being who disassembles and reassembles her victims, demanding stories from their waking lives as payment. Her realm is a French suburb filled with reanimated corpses, stitched together and controlled by her will. In her sewing chamber, she hoards the organs of dreamers, promising their return for further services.",
  //   image:
  //     "modules/eunos-kult-hacks/assets/images/loading-screen/the-seamstress.webp",
  // },
  // Ferals: {
  //   prefix: "",
  //   title: "Ferals",
  //   subtitle: "Survivors, Twisted",
  //   home: "Metropolis",
  //   body: "Once human, ferals have become abominations lurking in Metropolis's shadows. Distorted by contagion and poison, they are grey-skinned, hollow-eyed, and move with an animalistic gait. Living in ruins, they are cannibals, preying on wanderers and scavenging for sustenance. Their sole objective is survival.",
  //   image: "modules/eunos-kult-hacks/assets/images/loading-screen/feral.webp",
  // },
  // Jackals: {
  //   prefix: "",
  //   title: "Jackals",
  //   subtitle: "Mad Predators",
  //   home: "Elysium",
  //   body: "Jackals are distorted humans, bound to the Death Angels' principles, living on society's fringes. They are wild, cannibalistic, and lack empathy outside their pack. Recognizable by their animal musk, they blend into extremist groups. Each pack varies by the Death Angel they follow, preying on the vulnerable, reveling in terror, and driven by primal instincts.",
  //   image: "modules/eunos-kult-hacks/assets/images/loading-screen/jackal.webp",
  // },
  // Mancipia: {
  //   prefix: "",
  //   title: "Mancipia",
  //   subtitle: "Built for Pleasure",
  //   home: "Metropolis",
  //   body: "Mancipia are eyeless, hairless beings with serpentine tongues, hidden by the Illusion to appear human. They exude an intoxicating allure, inciting obsession and desire, their bodies a perfect symbiosis of male and female. Used by Archons to manipulate and lead astray those who threaten secrets, they can also inspire creativity and reveal humanity's divinity through art.",
  //   image:
  //     "modules/eunos-kult-hacks/assets/images/loading-screen/mancipia.webp",
  // },
  // Cairath: {
  //   prefix: "",
  //   title: "Cairath",
  //   subtitle: "Underworld Abominations",
  //   home: "the Underworld",
  //   body: "Cairath are grotesque, bloated abominations dwelling in sewers and catacombs. They meld their victims to their rotting bodies, drawing worship from those on the brink of madness. These creatures influence their surroundings, forming cults that offer sacrifices. As they grow in power, they can transform into something even more terrifying: gransangthir.",
  //   image: "modules/eunos-kult-hacks/assets/images/loading-screen/cairath.webp",
  // },
  // Azadaevae: {
  //   prefix: "",
  //   title: "Azadaevae",
  //   subtitle: "Who Would Be Azghouls",
  //   home: "the Underworld",
  //   body: "The azadaevae are long and slender beings with delicate features and surrounded by a scintillating veil of dust that weaves illusions. Remnants of the civilization we enslaved and transformed into the azghouls, their ability to see true souls makes them both revered and hunted to this day, leaving few of them in existence. Only in the depths of the Underworld can they find reprieve from those who hunt them.",
  //   image:
  //     "modules/eunos-kult-hacks/assets/images/loading-screen/azadaevae.webp",
  // },
} as const;
// #endregion

// #region STABILITY ~
export const STABILITY_VALUES = [
  { value: 0, label: "<div class='stability-value-container stability-broken'><span class='stability-value'>0</span><span class='stability-label'>Broken</span></div>" },
  { value: 1, label: "<div class='stability-value-container stability-critical'><span class='stability-value'>1</span><span class='stability-label'>Critical Stress</span></div>" },
  { value: 2, label: "<div class='stability-value-container stability-critical'><span class='stability-value'>2</span><span class='stability-label'>Critical Stress</span></div>" },
  { value: 3, label: "<div class='stability-value-container stability-critical'><span class='stability-value'>3</span><span class='stability-label'>Critical Stress</span></div>" },
  { value: 4, label: "<div class='stability-value-container stability-critical'><span class='stability-value'>4</span><span class='stability-label'>Critical Stress</span></div>" },
  { value: 5, label: "<div class='stability-value-container stability-serious'><span class='stability-value'>5</span><span class='stability-label'>Serious Stress</span></div>" },
  { value: 6, label: "<div class='stability-value-container stability-serious'><span class='stability-value'>6</span><span class='stability-label'>Serious Stress</span></div>" },
  { value: 7, label: "<div class='stability-value-container stability-serious'><span class='stability-value'>7</span><span class='stability-label'>Serious Stress</span></div>" },
  { value: 8, label: "<div class='stability-value-container stability-moderate'><span class='stability-value'>8</span><span class='stability-label'>Moderate Stress</span></div>" },
  { value: 9, label: "<div class='stability-value-container stability-moderate'><span class='stability-value'>9</span><span class='stability-label'>Moderate Stress</span></div>" },
  { value: 10, label: "<div class='stability-value-container stability-composed'><span class='stability-value'>10</span><span class='stability-label'>Composed</span></div>" },
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
