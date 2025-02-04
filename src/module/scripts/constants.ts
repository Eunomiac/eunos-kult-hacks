import { numberToWords, wordsToNumber } from "./utilities_old";

export const SYSTEM_ID = "eunos-kult-hacks";

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
    return getSettings().set(namespace, setting, value);
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
  getAudioHelper: function getAudioHelper(): AudioHelper {
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

// #region LOADING SCREENS ~
export const LOADING_SCREEN_DATA = {
  "Azghoul": {
    prefix: "the",
    title: "Azghouls",
    subtitle: "Our Forgotten Thralls",
    home: "Metropolis",
    body: "The azghouls were once exquisite beings with a proud civilization, until we conquered their world and grafted exoskeletal parasites to their bodies to compel their servitude. They haunt the barren streets of Metropolis to this day, but we have forgotten how to make them obey.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/azghoul.webp",
  },
  "Gynachid": {
    prefix: "the",
    title: "Gynachids",
    subtitle: "Mothers No More",
    home: "Metropolis",
    body: "Solitary carnivores, gynachids hunt in Metropolis and other worlds beyond the Illusion. Once enslaved to our rule, we took their ability to create offspring as a means of control. In the eons since, they have adapted, and now implant their fetuses in human hosts to grow.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/gynachid.webp",
  },
  "Tekron": {
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
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/dream-princess.webp",
  },
  "Lictor": {
    prefix: "the",
    title: "Lictors",
    subtitle: "Our Jailers",
    home: "Elysium",
    body: "The Lictors are the veiled wardens of our prison, shaping laws, faith, and industry to keep us blind. They are the unyielding judges, the priests who mold sin into chains, the executives who barter away futures, the police chiefs who dictate law with iron resolve. They rarely kill—unless we try to escape. Beneath the Illusion they are bloated, translucent monsters over eight feet tall, with prehensile, barbed tongues a meter long.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/lictor.webp",
  },
  "Nepharite": {
    prefix: "",
    title: "Nepharites",
    subtitle: "Priests of Pain",
    home: "Inferno",
    body: "Nepharites are Inferno's high priests of suffering, torturers and prophets who flay souls to nourish the Death Angels. They weave pacts, shape agony into worship, and slip into Elysium through cracks in the Illusion, draped in robes of flayed flesh and adorned with gleaming knives. Where they walk, the air is thick with the scent of blood and incense.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/nepharite.webp",
  },
  "Purgatide": {
    prefix: "",
    title: "Purgatides",
    subtitle: "The Mutilated Damned",
    home: "Inferno",
    body: "Purgatides are the discarded remnants of Inferno's endless tortures, little more than torn flesh held together by rusted clamps and thread. Their butchered bodies leak blood and pus, concealed beneath tattered coats. Mindless and fanatical, they shuffle through Elysium as hollow servants of razides and nepharites, their fevered eyes betraying the agony they no longer recognize as their own.",
    // short_body: "Purgatides are husks of suffering, bodies shredded by Inferno's tortures and crudely stitched back together. Their minds are broken, their purpose singular: serve, suffer, and obey.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/purgatide.webp",
  },
  "Razide": {
    prefix: "",
    title: "Razides",
    subtitle: "Horrors of Flesh and Steel",
    home: "Inferno",
    body: "Razides are forged from the tortured remnants of souls torn from Inferno's purgatories, their flesh fused with tubes, razors and grinding gears, their minds enslaved by a writhing parasitic worm harvested from the Underworld. Hulking brutes of Inferno, they serve the Death Angels as warriors and enforcers, spreading terror and bloodshed in Elysium's shadows.",
    image: "modules/eunos-kult-hacks/assets/images/loading-screen/razide.webp",
  }
};
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

export function assignGlobals(): void {
  Object.assign(globalThis, GLOBAL_VARIABLES);
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
  num = typeof num === "string" ? wordsToNumber(num) : num;

  if (isGettingNext) {
    num = num + 1;
  }

  if (num === 0) return "Preamble";
  return `Chapter ${numberToWords(num)}`;
}

export function getNextChapter(current: number | string): string {
  // Convert input to number
  const currentNum =
    typeof current === "string" ? wordsToNumber(current) : current;

  return getChapterString(currentNum + 1);
}
// #endregion

// #region WEAPON CLASSES ~
export const WEAPON_CLASSES = [
  { value: "Melee Weapon", label: "Melee Weapon" },
  { value: "Thrown Weapon", label: "Thrown Weapon" },
  { value: "Firearm", label: "Firearm" }
] as const;

export const WEAPON_SUBCLASSES = {
  "Melee Weapon": [
    { value: "Unarmed", label: "Unarmed" },
    { value: "Edged Weapon", label: "Edged Weapon" },
    { value: "Crushing Weapon", label: "Crushing Weapon" },
    { value: "Chopping Weapon", label: "Chopping Weapon" },
    { value: "Other", label: "Other" }
  ],
  "Thrown Weapon": [
    { value: "Explosive", label: "Explosive" },
    { value: "Other", label: "Other" }
  ],
  "Firearm": [
    { value: "Handgun", label: "Handgun" },
    { value: "Magnum Handgun", label: "Magnum Handgun" },
    { value: "Submachine Gun", label: "Submachine Gun" },
    { value: "Assault Rifle", label: "Assault Rifle" },
    { value: "Machine Gun", label: "Machine Gun" },
    { value: "Rifle", label: "Rifle" },
    { value: "Combat Shotgun", label: "Combat Shotgun" },
    { value: "Other", label: "Other" }
  ]
} as const;
// #endregion
