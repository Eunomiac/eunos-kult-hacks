// #region ▒▒▒▒▒▒▒ [HELPERS] Internal Functions, Data & References Used by Utility Functions ▒▒▒▒▒▒▒ ~

// _noCapWords -- Patterns matching words that should NOT be capitalized when converting to TITLE case.
const _noCapWords = "a|above|after|an|and|at|below|but|by|down|for|for|from|in|nor|of|off|on|onto|or|out|so|the|to|under|up|with|yet"
  .split("|")
  .map((word) => new RegExp(`\\b${String(word)}\\b`, "gui"));

// _capWords -- Patterns matching words that should ALWAYS be capitalized when converting to SENTENCE case.
const _capWords = [
  "I", /[^a-z]{3,}|[.0-9]/gu
].map((word) => (Object.prototype.toString.call(word).includes('RegExp') ? word : new RegExp(`\\b${String(word)}\\b`, "gui"))) as RegExp[];
// #endregion

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
  removeClassFromDOM: function removeClassFromDOM(classes: string|string[]) {
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
      throw new Error(
        `User ${getUser().name} has no PC associated with them.`,
      );
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
  }
}
// #endregion

/**
 * Converts a number to its word representation (1-999)
 * @param num - Number to convert
 * @returns Word representation of the number
 */
function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Preamble";

  if (num >= 1000) throw new Error("Chapter numbers above 999 not supported");

  if (num >= 100) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    return remainder === 0
      ? `${ones[hundred]} Hundred`
      : `${ones[hundred]} Hundred and ${numberToWords(remainder)}`;
  }

  if (num >= 20) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    const numString = one === 0 ? tens[ten] : `${tens[ten]}-${ones[one]}`;
    if (!numString) throw new Error("Invalid chapter number");
    return numString;
  }

  if (num >= 10) {
    const numString = teens[num - 10];
    if (!numString) throw new Error("Invalid chapter number");
    return numString;
  }

  const numString = ones[num];
  if (!numString) throw new Error("Invalid chapter number");
  return numString;
}

/**
 * Converts a word number back to its numeric value
 * @param str - The string to convert (e.g., "Twenty-Three" or "Chapter Twenty-Three")
 * @returns The numeric value
 */
function wordsToNumber(str: string): number {
  str = str.toLowerCase();
  // Handle Preamble
  if (str === "preamble") return 0;

  // Remove "Chapter " if present
  str = str.replace(/^chapter\s+/i, "");

  const ones = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9
  };
  const teens = {
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19
  };
  const tens = {
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90
  };

  const parts = str.split(/\s+and\s+|\s*-\s*|\s+/);
  let result = 0;

  for (let i = 0; i < parts.length; i++) {
    const word = parts[i];
    if (word === "hundred") {
      result = result * 100;
    } else if (teens[word as keyof typeof teens]) {
      result += teens[word as keyof typeof teens];
    } else if (tens[word as keyof typeof tens]) {
      result += tens[word as keyof typeof tens];
    } else if (ones[word as keyof typeof ones]) {
      result += ones[word as keyof typeof ones];
    } else {
      throw new Error(`Invalid number word: ${word}`);
    }
  }

  return result;
}

/**
 * Wraps GM Move phrases in HTML span tags
 * @param html - The HTML string to process
 * @returns The processed HTML with GM Move phrases wrapped in spans
 * @example
 * wrapGMMoves("When the GM makes a Move, players must respond")
 * // Returns: "When the <span class='gm-move-text'>GM makes a Move</span>, players must respond"
 */
function wrapGMMoves(html: string): string {
  // First remove any existing gm-move-text spans
  html = html.replace(/<span class="gm-move-text">|<\/span>/g, "");

  // Replace any &nbsp; with a space
  html = html.replace(/&nbsp;/g, " ");

  const gmMovePattern = /(?:the\s+)?GM(?:\s+[\w\d]+){0,2}\s+(?:\d+ Hold|Move[s]?)(?!\s+[\w\d]+\s+(?:Hold|Move[s]?))/gi;
  return html.replace(gmMovePattern, match => {
    console.log(html);
    console.log(match);
    console.log(`<span class="gm-move-text">${match}</span>`);
    return `<span class="gm-move-text">${match}</span>`;
  });
}

/**
 * Wraps game mechanical terms in HTML span tags
 * @param html - The HTML string to process
 * @returns The processed HTML with key words wrapped in spans
 * @example
 * wrapKeyWords("Make a roll +Violence to attack")
 * // Returns: "Make a <span class='key-word'>roll +Violence</span> to attack"
 */
function wrapKeyWords(html: string): string {
  // First remove any existing key-word spans
  html = html.replace(/<span class="key-word">|<\/span>/g, "");

  // Replace any &nbsp; with a space
  html = html.replace(/&nbsp;/g, " ");

  // const keyWordPattern = /[Rr]oll \+[0-9a-zA-Z]+|Attribute|Reflexes|Fortitude|Willpower|Coolness|Violence|Charisma|Reason|Perception|Intuition|Soul|(?:-|&minus;|–|\+|[\d/\s]+)? ?(?:Stability|Harm|Relations?h?i?p?s?) ?(?:-|&minus;|–|\+|[\d/\s]+)?|(Critical |Serious )?Wounds?/g;
  const keyWordPattern = /<p><em>Suggested personal drives:<\/em><\/p>/g;
  return html.replace(keyWordPattern, match =>
    `<h3>Suggested Personal Drives:</h3>`
  );
}

/**
 * Wraps trigger words in HTML span tags
 * @param html - The HTML string to process
 * @returns The processed HTML with trigger words wrapped in spans
 * @example
 * wrapTriggers("When the GM makes a Move, players must respond")
 * // Returns: "When the <span class='trigger-words'><em>GM makes a Move</em></span>, players must respond"
 */
function wrapTriggers(html: string): string {
  // First remove any existing trigger spans
  html = html.replace(/<span class="trigger-words">|<\/span>/g, "");

  // Replace any &nbsp; with a space
  html = html.replace(/&nbsp;/g, " ");

  const triggerPattern = /<em>(?:\s*\b\S+\b[,\s.]*){4,}<\/em>/gi;
  return html.replace(triggerPattern, match =>
    `<span class="trigger-words"><em>${match}</em></span>`
  );
}

/**
 * Recursively processes Foundry Documents, applying wrapGMMoves to HTML strings in system data
 * @param obj - Single Document or array of Documents to process
 * @returns Promise that resolves when all updates are complete
 */
async function processHTMLStrings(obj: Document|Document[]): Promise<void> {
  const documents = (Array.isArray(obj) ? obj : [obj]) as Array<Document & Maybe<{name: string,system: Record<string, unknown>}>>;

  const updates = documents.map((doc) => {
    const updateData: Record<string, unknown> = {};

    function processObject(obj: Record<string, unknown>, path: string[] = []): void {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];

        if (typeof value === 'string' && /<\/[^>]+>/g.test(value)) {
          // Process HTML string and add to updates if changed
          const processed = wrapTriggers(wrapKeyWords(wrapGMMoves(value)));
          if (processed !== value) {
            updateData[`system.${currentPath.join('.')}`] = processed;
          }
        } else if (value && typeof value === 'object') {
          // Recursively process nested objects
          processObject(value as Record<string, unknown>, currentPath);
        }
      }
    }

    // Only process the system data
    if (doc.system) {
      processObject(doc.system);
    }

    return updateData;
  });

  // Only update documents that have changes
  const updatePromises = documents.map((doc, index) => {
    const updateData = updates[index];
    if (
      !updateData ||
      !("update" in doc) ||
      typeof doc.update !== "function" ||
      Object.keys(updateData).length === 0
    ) {
      return Promise.resolve();
    }

    try {
      // intentionally unsound type assertion
      return (doc.update as (updateData: Record<string, unknown>) => Promise<void>)(updateData);
    } catch (error) {
      console.error(`Error updating document ${doc.name}:`, error);
      return Promise.resolve();
    }
  });

  await Promise.all(updatePromises);
}

// #region ■■■■■■■[Case Conversion]■■■■ Upper, Lower, Sentence & Title Case ■■■■■■■ ~
const uCase = (str: unknown): Uppercase<string> => String(str).toUpperCase() as Uppercase<string>;
const lCase = (str: unknown): Lowercase<string> => String(str).toLowerCase() as Lowercase<string>;
const sCase = (str: unknown): Capitalize<string> => {
  if (typeof str === "object") {
    throw new Error("Cannot convert object to sentence case.");
  }
  const strValue = String(str as Exclude<typeof str, object>); // Explicitly convert to string after the check
  let [first, ...rest] = strValue.split(/\s+/) as [string, ...unknown[]];
  first = testRegExp(first, _capWords)
    ? first
    : `${String(uCase(first.charAt(0)))}${String(lCase(first.slice(1)))}`;
  if (hasItems(rest)) {
    rest = rest.map((word) => (testRegExp(word, _capWords) ? word : lCase(word)));
  }
  return [first, ...rest].join(" ").trim() as Capitalize<string>;
};
const tCase = (str: unknown): Capitalize<string> => String(str).split(/\s/)
  .map((word, i) => (i && testRegExp(word, _noCapWords) ? lCase(word) : sCase(word)))
  .join(" ").trim() as Capitalize<string>;
// #endregion ■■■■[Case Conversion]■■■■

const isNumber = <T>(ref: T): ref is T & number => typeof ref === "number" && !isNaN(ref);
const isArray = <T>(ref: T): ref is T & Array<ValOf<T>> => Array.isArray(ref);
const isList = <T>(ref: T): ref is T & List => ref === Object(ref) && !isArray(ref);
const isEmpty = (ref: Index): boolean => Object.keys(ref).length === 0;
const hasItems = (ref: Index): boolean => !isEmpty(ref);
const isFunc = <T>(ref: T): ref is T & ((...args: unknown[]) => unknown) => typeof ref === "function";
const isUndefined = (ref: unknown): ref is undefined => ref === undefined;
const isNullOrUndefined = <T>(ref: T): ref is T & (null | undefined) => ref === null || ref === undefined;
const isDefined = <T>(ref: T): ref is T & (null | NonNullable<T>) => !isUndefined(ref);

// #region ■■■■■■■[RegExp]■■■■ Regular Expressions ■■■■■■■ ~
const testRegExp = (str: unknown, patterns: Array<RegExp | string> = [], flags = "gui", isTestingAll = false) => patterns
  .map((pattern) => (pattern instanceof RegExp
    ? pattern
    : new RegExp(`\\b${String(pattern)}\\b`, flags)))[isTestingAll ? "every" : "some"]((pattern) => pattern.test(String(str)));
// #endregion

const getID = (): IDString => foundry.utils.randomID();
const toKey = (text: string): string => text.toLowerCase().replace(/ /g, "-").replace(/default/, "DEFAULT");

// #region ========== Numbers: Formatting Numbers Into Strings =========== ~
const pFloat = <IsStrict extends boolean>(
  ref: unknown,
  sigDigits?: number,
  isStrict = false as IsStrict
): IsStrict extends true ? (typeof NaN  ) : Float => {
  let num: number;

  if (typeof ref === "string") {
    num = parseFloat(ref);
  } else if (typeof ref === "number") {
    num = ref;
  } else {
    return (isStrict ? NaN : 0) as IsStrict extends true ? (typeof NaN  ) : Float;
  }

  if (isNaN(num)) {
    return (isStrict ? NaN : 0) as IsStrict extends true ? (typeof NaN  ) : Float;
  }

  if (isUndefined(sigDigits)) {
    return num;
  }

  // Calculate the number to the specified significant digits
  const factor = Math.pow(10, sigDigits);
  const rounded = Math.round(num * factor) / factor;

  return rounded; // Explicitly cast to Float for clarity
};

const pInt: {
  (ref: unknown, isStrict?: boolean): number;
  (ref: unknown, index: number, array: unknown[]): number; // So this can be used in Array.map()
} = (ref: unknown, isStrictOrIndex?: boolean | number, _arr?: unknown[]): typeof NaN => {
  let isStrict = false;
  if (typeof isStrictOrIndex === "boolean") {
    isStrict = isStrictOrIndex;
  }
  return isNaN(pFloat(ref, 0, isStrict))
    ? NaN
    : Math.round(pFloat(ref, 0, isStrict));
};
const signNum = (num: number, delim = "", zeroSign = "+") => {
  let sign;
  const parsedNum = pFloat(num);
  if (parsedNum < 0) {
    sign = "-";
  } else if (parsedNum === 0) {
    sign = zeroSign;
  } else {
    sign = "+";
  }
  return `${String(sign)}${String(delim)}${String(Math.abs(parsedNum))}`;
};
// #endregion
export {
  GLOBAL_VARIABLES,
  numberToWords,
  wordsToNumber,
  wrapGMMoves,
  wrapKeyWords,
  wrapTriggers,
  processHTMLStrings,
  uCase,
  lCase,
  sCase,
  tCase,
  isNumber,
  isArray,
  isList,
  isEmpty,
  hasItems,
  isFunc,
  isUndefined,
  isNullOrUndefined,
  isDefined,
  testRegExp,
  getID,
  toKey,
  signNum,
  pFloat,
  pInt
}
