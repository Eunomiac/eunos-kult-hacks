import type EunosItem from "../documents/EunosItem";
import { verbalizeNum, deverbalizeNum, tCase } from "./utilities";
import type { Quench } from "@ethaks/fvtt-quench";
import { PCTargetRef } from "./enums";
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
export const LOCATION_PLOTTING_SETTINGS: {
  SIMPLE: Array<{
    selector: string;
    property: string;
    rangeMult: number;
  }>;
  GRADIENT: Array<{
    selector: string;
    label: string;
    property: string;
    initialValue: number;
  }>;
  FILTER: Array<{
    selector: string;
    filters: Array<{
      name: string;
      property: string;
      initialValue: number;
      min: number;
      max: number;
      step: number;
    }>;
  }>;
} = {
  SIMPLE: [
    {
      selector: "#STAGE #SECTION-3D",
      property: "perspective",
      rangeMult: 2,
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer",
      property: "x",
      rangeMult: 2,
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer",
      property: "y",
      rangeMult: 2,
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer",
      property: "z",
      rangeMult: 2,
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer",
      property: "rotationX",
      rangeMult: 1,
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer",
      property: "rotationY",
      rangeMult: 1,
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer",
      property: "rotationZ",
      rangeMult: 1,
    },
  ],
  GRADIENT: [
    {
      selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
      label: "Circle Position X",
      property: "circlePositionX",
      initialValue: 25,
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
      label: "Circle Position Y",
      property: "circlePositionY",
      initialValue: 0,
    },
    {
      selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
      label: "Gradient Stop Percentage",
      property: "gradientStopPercentage",
      initialValue: 50,
    },
  ],
  FILTER: [
    {
      selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
      filters: [
        {
          name: "hue",
          property: "hue-rotate",
          initialValue: 0,
          min: 0,
          max: 360,
          step: 1,
        },
        {
          name: "saturation",
          property: "saturate",
          initialValue: 1,
          min: 0,
          max: 1,
          step: 0.01,
        },
      ],
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
    "guns-for-hire": {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-guns-for-hire.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 224,
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
    "arsonists-lulluby": {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-arsonists-lullaby.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 263,
      loop: false,
      sync: true,
      volume: 0.5,
      autoplay: false,
    },
    "broken-crown": {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-broken-crown.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 229,
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
    "to-ashes-and-blood": {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-to-ashes-and-blood.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 243,
      loop: false,
      sync: true,
      volume: 0.5,
      autoplay: false,
    },
    twelve: {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-twelve.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 153,
      loop: false,
      sync: true,
      volume: 0.5,
      autoplay: false,
    },
    "way-down-we-go": {
      path: "modules/eunos-kult-hacks/assets/sounds/music/presession-song-way-down-we-go.ogg",
      alwaysPreload: false,
      delay: 0,
      duration: 214,
      loop: false,
      sync: true,
      volume: 0.5,
      autoplay: false,
    },
  },
  Ambient: {
    "session-closed-ambience": {
      path: "modules/eunos-kult-hacks/assets/sounds/session-closed-ambience.flac",
      alwaysPreload: false,
      delay: 0,
      loop: true,
      sync: false,
      volume: 0.5,
      autoplay: false,
    }
  },
  Effects: {
    "quote-session-1": {
      path: "modules/eunos-kult-hacks/assets/sounds/effects/c01/quote-session-1.ogg",
      alwaysPreload: true,
      delay: 0,
      loop: false,
      sync: false,
      volume: 0.25,
      autoplay: false,
    },
    "effect-car-crash": {
      path: "modules/eunos-kult-hacks/assets/sounds/effects/c01/effect-car-crash.ogg",
      alwaysPreload: true,
      delay: 0,
      loop: false,
      sync: false,
      volume: 1,
      autoplay: false,
    },
    "record-dust-loop": {
      path: "modules/eunos-kult-hacks/assets/sounds/effects/record-dust-loop.ogg",
      alwaysPreload: true,
      delay: 0,
      loop: true,
      sync: false,
      volume: 1,
      autoplay: false,
    }
  },
  Alerts: {
    "alert-hit-wound-1": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-wound-1.ogg",
      alwaysPreload: true,
      delay: 0.75,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-wound-2": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-wound-2.ogg",
      alwaysPreload: true,
      delay: 0.75,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-stability": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-stability.ogg",
      alwaysPreload: true,
      delay: -1.5,
      displayDuration: 6.5,
      loop: false,
      sync: false,
      volume: 0.5,
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
    "alert-hit-01": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-01.ogg",
      alwaysPreload: false,
      delay: 0.75,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-03": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-03.ogg",
      alwaysPreload: false,
      delay: 0.75,
      displayDuration: 7,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-04": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-04.ogg",
      alwaysPreload: false,
      delay: 0.25,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-05": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-05.ogg",
      alwaysPreload: false,
      delay: 0.75,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-07": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-07.ogg",
      alwaysPreload: false,
      delay: 0,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-08": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-08.ogg",
      alwaysPreload: false,
      delay: 0,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-09": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-09.ogg",
      alwaysPreload: false,
      delay: 0,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-10": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-10.ogg",
      alwaysPreload: false,
      delay: 0,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-11": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-11.ogg",
      alwaysPreload: false,
      delay: 0,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-13": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-13.ogg", // Creepy child laugh
      alwaysPreload: false,
      delay: 0.5,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-14": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-14.ogg", // Eerie nature sounds
      alwaysPreload: false,
      delay: 0.5,
      displayDuration: 7.5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-15": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-15.ogg", // Great jump scare
      alwaysPreload: false,
      delay: 0,
      displayDuration: 9,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-16": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-16.ogg", // Cool quick effect
      alwaysPreload: false,
      delay: 0.5,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-17": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-17.ogg", // High-pitched tone
      alwaysPreload: false,
      delay: 0,
      displayDuration: 6,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-18": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-18.ogg", // Great piano slam
      alwaysPreload: false,
      delay: 0,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-20": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-20.ogg", // Short strings
      alwaysPreload: false,
      delay: 0,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-21": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-21.ogg", // Strings & Breathing
      alwaysPreload: false,
      delay: 0,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-23": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-23.ogg",
      alwaysPreload: false,
      delay: -0.5,
      displayDuration: 7,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-25": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-25.ogg", // Cool techy sound
      alwaysPreload: false,
      delay: -0.75,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-26": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-26.ogg", // Skittering insect sound
      alwaysPreload: false,
      delay: -1.75,
      displayDuration: 7,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-27": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-27.ogg", // Skittering lead-in
      alwaysPreload: false,
      delay: -1.8,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-29": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-29.ogg", // Lead in slam
      alwaysPreload: false,
      delay: 0.25,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-30": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-30.ogg", // Long and ominous
      alwaysPreload: false,
      delay: 1,
      displayDuration: 10,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-31": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-31.ogg", // Subtle heartbeat
      alwaysPreload: false,
      delay: 0.5,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-32": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-32.ogg", // Quick slam
      alwaysPreload: false,
      delay: 0.75,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-35": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-35.ogg",
      alwaysPreload: false,
      delay: -1.5,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-36": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-36.ogg", // Breaking glass
      alwaysPreload: false,
      delay: 0.25,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-37": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-37.ogg",
      alwaysPreload: false,
      delay: -1.8,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-38": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-38.ogg", // quick mechanical sound
      alwaysPreload: false,
      delay: -1,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-40": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-40.ogg", // Sovereign-like tone
      alwaysPreload: false,
      delay: 0,
      displayDuration: 7,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-41": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-41.ogg", // Cool lead in
      alwaysPreload: false,
      delay: -0.5,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-43": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-43.ogg",
      alwaysPreload: false,
      delay: -1.6,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-46": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-46.ogg", // throbbing drum beat
      alwaysPreload: false,
      delay: 1,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-47": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-47.ogg", // shorter drum beat
      alwaysPreload: false,
      delay: 0.5,
      displayDuration: 5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-48": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-48.ogg", // great stability heartbeat
      alwaysPreload: false,
      delay: -1.5,
      displayDuration: 6.5,
      loop: false,
      sync: false,
      volume: 0.5,
      autoplay: false,
    },
    "alert-hit-50": {
      path: "modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-50.ogg", // sharp pitchy lead-in
      alwaysPreload: false,
      delay: -1.5,
      displayDuration: 5,
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
      path: "modules/eunos-kult-hacks/assets/sounds/subsonic-stinger.ogg",
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

// #region LOCATIONS ~
export declare namespace Location {

  export interface CharacterData<
  slot extends "1" | "2" | "3" | "4" | "5" | "6" = "1" | "2" | "3" | "4" | "5",
> {
    slot: slot;
    id: IDString;
    actor?: EunosActor;
    isSpotlit: boolean;
    isDimmed: boolean;
    isMasked: boolean;
    isHidden: boolean;
  }

  export interface StaticData {
    name: string;
    image?: string;
    description?: string;
    mapTransforms: Array<{
      selector: string;
      properties: Record<string, number|string|undefined>;
    }>;
  }

  export interface DynamicData {
    pcData: Partial<Record<"1" | "2" | "3" | "4" | "5", CharacterData>>;
    npcData: Partial<Record<"1" | "2" | "3" | "4" | "5" | "6", CharacterData>>;
    playlists: IDString[];
  }

  export interface Data extends StaticData, DynamicData {}

  export interface FullData extends StaticData, DynamicData {
    pcData: Record<"1" | "2" | "3" | "4" | "5", Required<CharacterData>>;
    npcData: Partial<Record<"1" | "2" | "3" | "4" | "5" | "6", Required<CharacterData>>>;
  }
}

export const getLocationDefaultDynamicData = (): Location.DynamicData => ({
    pcData: getUsers()
      .filter((user) => !user.isGM)
      .map((user) => {
          const pc = user.character;
          if (!pc || !pc.isPC()) {
            throw new Error(
              `Unable to find the character assigned to '${user.name}'`,
            );
          }
          return pc;
        })
      .reduce<
        Record<
          IDString,
          {
            id: IDString;
            isSpotlit: boolean;
            isDimmed: boolean;
            isMasked: boolean;
            isHidden: boolean;
          }
        >
      >((acc, pc) => {
        if (pc.id) {
          acc[pc.id] = {
            id: pc.id,
            isSpotlit: false,
            isDimmed: false,
            isMasked: false,
            isHidden: false,
          };
        }
        return acc;
      }, {}),
    npcData: {},
    playlists: [],
});


export const LOCATIONS = {
  "Willow's Wending Entry": {
    name: "Willow's Wending",
    image: "",
    description: "",
    mapTransforms: [
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          perspective: 478.0,
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer",
        properties: {
          x: -5707.6,
          y: -3903.7,
          z: -1467.0,
          rotationX: 38.0,
          rotationY: -9.0,
          rotationZ: 11.0,
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          background:
            "radial-gradient(circle at 75% 93%, transparent, rgba(0, 0, 0, 0.9) 10%)",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          filter: "hue-rotate(183deg) saturate(0.62)",
        },
      },
    ],
  },
  "Willow's Wending #1": {
    name: "Willow's Wending",
    image: "",
    description:
      "The thin, winding road named 'Willow's Wending' takes an unpredictably treacherous route through the pine forests of the Black Hills, the trees on either side so thick they defy attempts to peer into the surrounding woods.",
    mapTransforms: [
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          perspective: 800.0,
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer",
        properties: {
          x: -4857.4,
          y: -3371.3,
          z: -1500.0,
          rotationX: 42.0,
          rotationY: -19.0,
          rotationZ: 17.0,
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          background:
            "radial-gradient(circle at 67% 76%, transparent, rgba(0, 0, 0, 0.9) 9%)",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          filter: "hue-rotate(183deg) saturate(0.62)",
        },
      },
    ],
    //   mapTransforms: [
    //   {
    //     selector: "#STAGE #SECTION-3D",
    //     properties: {
    //       perspective: 800,
    //     },
    //   },
    //   {
    //     selector: "#STAGE #SECTION-3D .canvas-layer",
    //     properties: {
    //       x: -4857.6,
    //       y: -3370.7,
    //       z: -1500,
    //       rotationX: 41.7,
    //       rotationY: -18.9,
    //       rotationZ: 16.9,
    //     },
    //   },
    //   {
    //     selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
    //     properties: {
    //       background:
    //         "radial-gradient(circle at 67% 85%, transparent, rgba(0, 0, 0, 0.9) 13%)",
    //     },
    //   },
    //   {
    //     selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
    //     properties: {
    //       filter: "hue-rotate(130deg) saturate(0.5)",
    //     },
    //   },
    // ],
  },
  "Willow's Wending #2": {
    name: "Willow's Wending",
    image: "",
    description:
      "The thin, winding road named 'Willow's Wending' takes an unpredictably treacherous route through the pine forests of the Black Hills, the trees on either side so thick they defy attempts to peer into the surrounding woods.",
    mapTransforms: [
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          perspective: 790.0,
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer",
        properties: {
          x: -4435.2,
          y: -2323.9,
          z: -457.0,
          rotationX: 42.0,
          rotationY: -19.0,
          rotationZ: 17.0,
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          background:
            "radial-gradient(circle at 56% 53%, transparent, rgba(0, 0, 0, 0.9) 8%)",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          filter: "hue-rotate(226deg) saturate(0.55)",
        },
      },
    ],
  },
  "Willow's Wending #3": {
    name: "Willow's Wending",
    image: "",
    description:
      "The thin, winding road named 'Willow's Wending' takes an unpredictably treacherous route through the pine forests of the Black Hills, the trees on either side so thick they defy attempts to peer into the surrounding woods.",
    mapTransforms: [
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          perspective: 1158.0,
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer",
        properties: {
          x: -4073.2,
          y: -1486.9,
          z: 755.0,
          rotationX: 42.0,
          rotationY: -19.0,
          rotationZ: 17.0,
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          background:
            "radial-gradient(circle at 47% 28%, transparent, rgba(0, 0, 0, 0.9) 7%)",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          filter: "hue-rotate(104deg) saturate(0.53)",
        },
      },
    ],
  },
  "Ranger Station #1": {
    name: "Ranger Station #1",
    image: "",
    description: "",
    mapTransforms: [
      {
        selector: "#STAGE #SECTION-3D",
        properties: {
          perspective: 629.0,
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer",
        properties: {
          x: -3414.4,
          y: -976.0,
          z: 451.0,
          rotationX: 22.0,
          rotationY: 4.0,
          rotationZ: -2.0,
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
        properties: {
          background:
            "radial-gradient(circle at 44% 20%, transparent, rgba(0, 0, 0, 0.9) 6%)",
        },
      },
      {
        selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
        properties: {
          filter: "hue-rotate(34deg) saturate(1)",
        },
      },
    ],
    // mapTransforms: [
    //   {
    //     selector: "#STAGE #SECTION-3D",
    //     properties: {
    //       perspective: 446,
    //     },
    //   },
    //   {
    //     selector: "#STAGE #SECTION-3D .canvas-layer",
    //     properties: {
    //       x: -3689.8,
    //       y: -976,
    //       z: 451,
    //       rotationX: 24,
    //       rotationY: -3.8,
    //       rotationZ: 4,
    //     },
    //   },
    //   {
    //     selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
    //     properties: {
    //       background:
    //         "radial-gradient(circle at 44% 20%, transparent, rgba(0, 0, 0, 0.9) 8%)",
    //     },
    //   },
    //   {
    //     selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
    //     properties: {
    //       filter: "hue-rotate(0deg) saturate(1)",
    //     },
    //   },
    // ],
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
  LOAD_SESSION: 900, // 15 minutes
  /** Progress value of countdown timer at which loading screen images should be stopped.*/
  HIDE_LOADING_SCREEN_IMAGES: 0.4,
  /** Repeat delays for glitch animation */
  GLITCH_REPEAT_DELAY_MIN: 1,
  GLITCH_REPEAT_DELAY_MAX: 7,
  /** Time in seconds before session start when overlay freezes */
  FREEZE_OVERLAY: 15,
  /** Time in seconds before session start when countdown disappears */
  COUNTDOWN_HIDE: 1,
  /** Time in seconds before the end of the video when the chapter title is displayed */
  CHAPTER_TITLE_DISPLAY_VIDEO_OFFSET: 7,
  /** Default session day (5 = Friday) */
  DEFAULT_SESSION_DAY: 5,
  /** Default session hour in 24h format (19 = 7 PM) */
  DEFAULT_SESSION_HOUR: 19,
  /** Default session minute */
  DEFAULT_SESSION_MINUTE: 30,
} as const;
