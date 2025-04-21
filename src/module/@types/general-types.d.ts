// #region IMPORTS ~
// import K4Actor from "../documents/K4Actor.js";
// import {K4ActorType} from "../scripts/enums";
// import K4Item from "../documents/K4Item.js";
// import K4PCSheet from "../documents/K4PCSheet.js";
// import K4NPCSheet from "../documents/K4NPCSheet.js";
// import K4ItemSheet from "../documents/K4ItemSheet.js";
// import K4ActiveEffect from "../documents/K4ActiveEffect.js";
// import K4ChatMessage from "../documents/K4ChatMessage.js";
// import K4Dialog from "../documents/K4Dialog.js";
// import K4Roll from "../documents/K4Roll.js";
// import K4Scene from "../documents/K4Scene.js";

import type {Quench} from "@ethaks/fvtt-quench";
import type EunosActor from "../documents/EunosActor";
import type EunosItem from "../documents/EunosItem";
import type EunosChatMessage from "../apps/EunosChatMessage";
import type {UserTargetRef, PCTargetRef} from "../scripts/enums";

// Should look like:   // type EffectChangeData = import("@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/_types.d.mts").EffectChangeData;
// Except to fvtt-types\src\foundry\client-esm\applications\api\application.d.mts
// import type {ApplicationV2} from "fvtt-types/utils";


// import type {Socket, SocketLib} from "./socketlib";
// #endregion

// #region CONFIGURATION OF SYSTEM CLASSES
// type ActorDoc = K4Actor; // Actor;
// type ItemDoc = K4Item; // Item;
// type ActorSheetDoc = K4PCSheet | K4NPCSheet; // ActorSheet;
// type ItemSheetDoc = K4ItemSheet; // ItemSheet;

// type ActiveEffectDoc = K4ActiveEffect; // ActiveEffect;
// type ChatMessageDoc = K4ChatMessage; // ChatMessage;
// type DialogDoc = K4Dialog; // Dialog;
// type RollDoc = K4Roll; // Roll;
// type SceneDoc = K4Scene; // Scene;
// type UserDoc = User; // User;
// import fields = foundry.data.fields;
// import {SchemaField} from "fvtt-types/utils";

// #endregion
export {};

// #region Internal Convenience Types ~
type HexDigit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "A" | "B" | "C" | "D" | "E" | "F";
type MaybeSpace = " " | "";
type FlexComma = `,${MaybeSpace}`;

// #region Internal Clamp Types ~
interface ClampOptions {
  clamp?: number | string;
  useNativeClamp?: boolean;
  splitOnChars?: string[];
  animate?: boolean | number;
  truncationChar?: string;
  truncationHTML?: string;
}

interface ClampResponse {
  original: string;
  clamped: string | undefined;
}
// #endregion
// #endregion

declare global {
  interface EunosOverlayConfiguration extends foundry.applications.api.ApplicationV2.Configuration {
    dragDrop?: DragDrop[];
  }

  // This ensures ApplicationV2 can work with our extended configuration
  namespace ApplicationV2 {
    interface ConfigurationMap {
      EunosOverlay: EunosOverlayConfiguration;
    }
  }

  const InitializableClasses: Record<string, Constructor>;

  const AudioHelper: Exclude<typeof game.audio, undefined>;

  type PCTarget = PCTargetRef | IDString | UUIDString;

  type UserTarget = UserTargetRef | IDString | UUIDString;

  type EunosDocument = EunosActor | EunosItem;

  // type EffectChangeData = import("@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/_types.d.mts").EffectChangeData;
  // type EffectChangeData = import("fvtt-types/_types").EffectChangeData;

  type EffectChangeData = {
    /**
     * The attribute path in the Actor or Item data which the change modifies
     * @defaultValue `""`
     */
    key: string;

    /**
     * The value of the change effect
     * @defaultValue `""`
     */
    value: string;

    /**
     * The modification mode with which the change is applied
     * @defaultValue `CONST.ACTIVE_EFFECT_MODES.ADD`
     */
    mode: number | null;

    /**
     * The priority level with which this change is applied
     * @defaultValue `null`
     */
    priority: number | null;
  };

  // #region CORE JAVASCRIPT AUGMENTATIONS ~
  /**
   * Extends the Array interface to provide a more precise type for the `includes` method.
   * This allows for better type inference when checking if an array includes a specific item.
   *
   * T - The type of elements in the array.
   * IncludesType - The type of the item being checked for inclusion.
   *
   * @param item - The item to search for in the array. The type is conditionally determined:
   *               If T & IncludesType is never, it falls back to T; otherwise, it uses IncludesType.
   * @param fromIndex - Optional. The position in the array at which to begin searching for item.
   *
   * @returns A boolean indicating whether the item is found in the array.
   */
  interface Array<T> {
    includes<IncludesType>(
      item: [T & IncludesType] extends [never] ? T : IncludesType,
      fromIndex?: number
    ): boolean;
  }
  // #endregion

  // #region FUNCTIONS IN THE GLOBAL SCOPE ~

  /**
   * Adds a class to the DOM.
   * @param className - The name of the class to add.
   */
  function addClassToDOM(className: string): void;

  /**
   * Removes a class from the DOM.
   * @param className - The name of the class to remove.
   */
  function removeClassFromDOM(className: string|string[]): void;

  /**
   * Retrieves the current Game instance.
   * @returns The current Game instance.
   * @throws Error if the Game is not ready.
   */
  function getGame(): ReadyGame;

  /**
   * Retrieves the current User instance.
   * @returns The current User instance.
   * @throws Error if the User is not ready.
   */
  function getUser(userId?: string): User;

  /**
   * Retrieves the collection of all K4Actor instances in the game.
   * @returns A Collection of K4Actor instances.
   * @throws Error if the Actors collection is not ready.
   */
  function getActors(): EunosActor[];

  /**
   * Retrieves the client settings for the game.
   * @returns The client settings.
   * @throws Error if the settings are not ready.
   */
  function getSettings(): ClientSettings;

  function getSetting<K extends ClientSettings.KeyFor<ClientSettings.Namespace>>(
    setting: K,
    namespace?: ClientSettings.Namespace
  ): ClientSettings.SettingInitializedType<ClientSettings.Namespace, K>;

  function setSetting<K extends ClientSettings.KeyFor<ClientSettings.Namespace>>(
    setting: K,
    value: ClientSettings.SettingAssignmentType<ClientSettings.Namespace, K>,
    namespace?: ClientSettings.Namespace
  ): Promise<ClientSettings.SettingInitializedType<ClientSettings.Namespace, K>>;

  /**
   * Retrieves the collection of all K4Item instances in the game.
   * @returns A Collection of K4Item instances.
   * @throws Error if the Items collection is not ready.
   */
  function getItems(): EunosItem[];

  /**
   * Retrieves the collection of all K4ChatMessage instances in the game.
   * @returns A Collection of K4ChatMessage instances.
   * @throws Error if the Messages collection is not ready.
   */
  function getMessages(): Collection<EunosChatMessage>;

  /**
   * Retrieves the collection of all User instances in the game.
   * @returns A Collection of User instances.
   * @throws Error if the Users collection is not ready.
   */
  function getUsers(): User[];

  /**
   * Retrieves the PC actor owned by the current user.
   * @returns The current Actor instance.
   * @throws Error if the Actor is not ready.
   */
  function getActor(): EunosActor;

  /**
   * Retrieves the current I18n instance.
   * @returns The current I18n instance.
   * @throws Error if the I18n is not ready.
   */
  function getLocalizer(): Localization;

  /**
   * Retrieves the current Notifications instance.
   * @returns The current Notifications instance.
   * @throws Error if the Notifications are not ready.
   */
  function getNotifier(): Notifications;

  /**
   * Retrieves the current AudioHelper instance.
   * @returns The current AudioHelper instance.
   * @throws Error if the AudioHelper is not ready.
   */
  function getAudioHelper(): typeof AudioHelper;

  /**
   * Retrieves the collection of all CompendiumPacks instances in the game.
   * @returns A Collection of CompendiumPacks instances.
   * @throws Error if the CompendiumPacks collection is not ready.
   */
  function getPacks(): CompendiumPacks;

  /**
   * Retrieves the collection of all JournalEntry instances in the game.
   * @returns A Collection of JournalEntry instances.
   * @throws Error if the Journal collection is not ready.
   */
  function getJournals(): Journal;

  /**
   * Retrieves the collection of all Folder instances in the game.
   * @returns A Collection of Folder instances.
   * @throws Error if the Folder collection is not ready.
   */
  function getFolders(): Folders;

  /**
   * The kLog object provides a set of functions for logging messages to the console, displaying them in the chat,
   * and opening and closing reports.
   */
  const kLog: {
    display: (...content: [string, ...unknown[]]) => void,
    log: (...content: [string, ...unknown[]]) => void,
    socketCall: (...content: [string, ...unknown[]]) => void,
    socketResponse: (...content: [string, ...unknown[]]) => void,
    socketReceived: (...content: [string, ...unknown[]]) => void,
    error: (...content: [string, ...unknown[]]) => void,
    hbsLog: (...content: [string, ...unknown[]]) => void,
    openReport: (name: string, title?: string, dbLevel?: number) => void,
    report: (name: string, ...content: [string, ...unknown[]]) => void,
    closeReport: (name: string) => void,
  };


  function kultLogger(...content: unknown[]): void;

  /**
   * Retrieves the current Quench instance.
   * @returns The current Quench instance.
   * @throws Error if the Quench is not ready.
   */
  function getQuench(): Quench;
  // #endregion

  // #region MISCELLANEOUS TYPE ALIASES (nonfunctional; for clarity) ~

  // Represents a an object literal Record of typed values and ambiguous keys (i.e. where the keys do not matter)
  type List<V = unknown, K extends Key = Key> = Record<K, V>;

  // A union of the List, above, with the array, to collectively represent a list of values (i.e. where the keys do not matter)
  type Index<V = unknown> = List<V> | V[];

  // Represents either a value or an index of values
  // (Often used as a function parameter, to allow for a single target for a process or a list of targets to iterate through)
  type ValueOrIndex<V = unknown> = V | Index<V>;
  // Represents either a value or an array of values (i.e. the above, but excluding an object literal Record)
  type ValueOrArray<V = unknown> = V | V[];
  // Represents either a value or a list of values
  type ValueOrList<V = unknown, K extends Key = Key> = V | List<V, K>;


  // Represents a key which can be a string, number, or symbol
  type Key = string | number | symbol;

  // Represents a small integer from -10 to 10
  type SmallInt = -10 | -9 | -8 | -7 | -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

  // Represents a string-like value
  type StringLike = string | number | boolean | null | undefined;

  // Represents a type that may be either of type T or undefined.
  type Maybe<T> = T | undefined;

  // Represents a tuple of two elements
  type Tuple<T1, T2 = T1> = [T1, T2];

  // Represents a tuple of three elements
  type Threeple<T1, T2 = T1, T3 = T2> = [T1, T2, T3];

  // Represents a tuple of four elements
  type Fourple<T1, T2 = T1, T3 = T2, T4 = T3> = [T1, T2, T3, T4];
  // Represents falsy values and empty objects to be pruned when cleaning list of values
  type UncleanValues = false | null | undefined | "" | 0 | Record<string, never> | never[];




  // Represents a value or a Promise resolving to a value
  type ValueOrPromise<V = unknown> = V | Promise<V>;

  type Point = {x: number, y: number};

  // Represents a function with an unknown number of parameters, returning a value of type R
  type Func<R = unknown, T extends unknown[] = unknown[]> = (...args: T) => R; // a function with a known return type and a tuple of parameter types
  // Represents either an element or a jQuery object wrapping that element
  type ElemOrJQuery<T extends HTMLElement = HTMLElement> = T | JQuery<T>;

  // Represents an async function with an unknown number of parameters, returning a Promise resolving to a value of type R
  type AsyncFunc<R = unknown, T extends unknown[] = unknown[]> = (...args: T) => Promise<R>;

  // Represents any class constructor with an unknown number of parameters
  type AnyClass<T = unknown> = abstract new (...args: unknown[]) => T;

  // Represents one of three simple scalar types of values found at the end-point of system schemas (string, number, boolean)
  type SystemScalar = string | number | boolean;

  // Represents an object with number-strings as keys
  type StringArray<T> = Record<NumString, T>;

  // Represents a number represented as a string
  type NumString = `${number}`;

  // Represents "true" or "false" as a string
  type BoolString = `${boolean}`;
  // Represents a string conversion to title case
  type tCase<S extends string> = S extends `${infer A} ${infer B}`
    ? `${tCase<A>} ${tCase<B>}`
    : Capitalize<Lowercase<S>>;

  // Represents an allowed gender key
  type Gender = "M" | "F" | "U" | "X";

  // Represents an allowed direction
  type Direction = "top" | "bottom" | "left" | "right";

  // Represents an allowed string case
  type StringCase = "upper" | "lower" | "sentence" | "title";




  /**
   * Represents a function that takes a key of type `Key` and an optional value of type `T`, and returns a value of type `R`.
   * T - The type of the value parameter (defaults to `unknown` if not specified).
   * R - The return type of the function (defaults to `unknown` if not specified).
   */
  type keyFunc<T = unknown, R = unknown> = (key: Key, val?: T) => R;

  /**
   * Represents a function that takes a value of type `T` and an optional key of type `Key`, and returns a value of type `R`.
   * T - The type of the value parameter (defaults to `unknown` if not specified).
   * R - The return type of the function (defaults to `unknown` if not specified).
   */
  type valFunc<T = unknown, R = unknown> = (val: T, key?: Key) => R;

  /**
   * Represents a test function that takes the same parameters as either `keyFunc` or `valFunc` and returns a boolean.
   * This function is used to test conditions or validate arguments dynamically.
   * T - The type of the value parameter used in the function being tested.
   * R - The return type of the function being tested.
   * Type - The type of the function being tested, constrained to either `keyFunc` or `valFunc`.
   */
  type testFunc<T = unknown, R = unknown, Type extends keyFunc<T, R> | valFunc<T, R> = keyFunc<T, R> | valFunc<T, R>> = (...args: Parameters<Type>) => boolean;

  /**
   * Represents a map function that takes the same parameters as either `keyFunc` or `valFunc` and returns the return type of the function being mapped.
   * This function is typically used to transform elements of an array or properties of an object.
   * T - The type of the value parameter used in the function being mapped.
   * R - The return type of the function being mapped.
   * Type - The type of the function being mapped, constrained to either `keyFunc` or `valFunc`.
   */
  type mapFunc<T = unknown, R = unknown, Type extends keyFunc<T, R> | valFunc<T, R> = keyFunc<T, R> | valFunc<T, R>> = (...args: Parameters<Type>) => ReturnType<Type>;

  /**
   * Represents a type that can be used to check values. It can be a function that takes any number of unknown parameters and returns unknown,
   * a `testFunc` for either `keyFunc` or `valFunc`, a regular expression, a number, or a string.
   */
  type checkTest = ((...args: unknown[]) => unknown) | testFunc<unknown, unknown, keyFunc> | testFunc<unknown, unknown, valFunc> | RegExp | number | string;

  type ObjectKey = string | number | symbol;
  type ObjectValue = unknown;
  type ObjectEntry = [ObjectKey, ObjectValue];

  type MapFunction = (value: ObjectValue, key: ObjectKey) => unknown;
  type TestFunction = (value: ObjectValue, key: ObjectKey) => boolean;

  type BoolFunction<Args extends unknown[] = unknown[]> = (...args: Args) => boolean;
  // #endregion

  // #region BRANDED TYPES ~
  const brand: unique symbol;
  type Brand<T, BrandName extends string> = T & {[brand]: BrandName;};

  // number === Float type guard
  type Float = number; // Brand<number, "Float">;
  // number === Positive float type guard
  type PosFloat = number; // Brand<number & Float, "PosFloat">;
  // string === HTML code
  type HTMLString = string; // Brand<string, "HTMLString">; // e.g. "<p>Hello World</p>"
  // string === RGB color
  type RGBColor = string //   `rgb(${number}${FlexComma}${number}${FlexComma}${number})` |
    // `rgba(${number}${FlexComma}${number}${FlexComma}${number}${FlexComma}${number})`;
  // string === Hex color
  type HexColor = string // Brand<string, "HexColor">; // e.g. "#FF0000"
  // string === Document id
  type IDString = string // Brand<string, "IDString">; // e.g. "5e4e7b1c322f2e1c"
  // string === UUID
  type UUIDString = string; // Brand<string, "UUIDString">; // e.g. "Actor.5e4e7b1c322f2e1c"
  // string === Dotkey
  type DotKey = string; // Brand<string, "DotKey">; // e.g. "system.attributes.hp.value"
  // string === Dotkey appropriate for update() data object
  type TargetKey = string; // Brand<string & DotKey, "TargetKey">;
  // string === Dotkey pointing to a flag instead of the document schema
  type TargetFlagKey = string; // Brand<string & DotKey, "TargetFlagKey">;
  // #endregion

  // #region UTILITY TYPES ~

  // Represents the return value of Object.entries when the object is a known constant
  type Entries<T> = [keyof T, T[keyof T]][];

  // Represents an object describing dimensions of an HTML element, of form {x: number, y: number, width: number, height: number}
  interface ElemPosData {x: number, y: number, width: number, height: number;}

  // Represents an object describing dimensions of an HTML element, in the form of a DOMRect object with mutable properties.
  type MutableRect = Omit<Mutable<DOMRect>, "toJSON">;



  // Represents an object with frozen properties
  type FreezeProps<T> = {
    [Prop in keyof T as string extends Prop ? never : number extends Prop ? never : Prop]: T[Prop]
  };

  // Represents a deep-partial of an object
  type FullPartial<T> = {
    [P in keyof T]?: T[P] extends object ? FullPartial<T[P]> : T[P];
  };

  // Represents a mutable version of a readonly type
  type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
  };

  // Represents a value with a minimum, maximum, and current value
  interface ValueMax {min: number, max: number, value: number;}

  // Represents a value with a minimum, maximum, and current value, and a name
  type NamedValueMax = ValueMax & {name: string;};

  type KeyOf<T> = keyof T;

  type ValOf<T> = T[keyof T];
  // #endregion

  // #region ENTITY-DOCUMENT TYPES ~
  /**
   * An "entity Document" represents a system Actor or Item document.
   */
  // type EntityDoc = ActorDoc | ItemDoc;

  // Represents the DocumentSheet for any system entity Document.
  // type EntitySheet = ActorSheetDoc | ItemSheetDoc;

  // Represents any entity Document or entity DocumentSheet
  // type AnyEntity = EntityDoc | EntitySheet;

  // // Represents the constructor (i.e. class) of an object
  type ConstructorOf<T> = new (...args: unknown[]) => T;

  // Represents any constructor
  type Constructor = ConstructorOf<unknown>;

  // Represents a constructor for an entity document
  // type EntityConstructor = foundry.abstract.Document.Internal.Constructor;

  // Represents a constructor for any entity
  // type AnyEntityConstructor = ConstructorOf<AnyEntity>;
  // #endregion

  // #region DOCUMENT REFERENCE TYPES ~

  // Represents a reference to a Blades document
  // type DocRef = string | EntityDoc;

  // // Represents a reference to a Blades actor
  // type ActorRef = string | ActorDoc;

  // // Represents a reference to a Blades item
  // type ItemRef = string | ItemDoc;

  // #endregion

  // #region TARGET-LINK DOCUMENT TYPES ~

  /**
   * A "target-link Document" is any Document that can be the target of a TargetLink subclass, i.e.
   * a Document that can store data for a linked object.
   */
  // type TargetLinkDoc = EntityDoc | ChatMessageDoc | UserDoc;

  // #endregion

  // #region THIRD-PARTY TYPES ~

  // #region TinyMCE ~
  interface TinyMCEConfig {
    skin: string | boolean;
    skin_url?: string;
    content_css: string | string[];
    font_css: string | string[];
    max_height: number;
    min_height: number;
    autoresize_overflow_padding: number;
    autoresize_bottom_margin: number;
    menubar: boolean;
    statusbar: boolean;
    elementPath: boolean;
    branding: boolean;
    resize: boolean;
    plugins: string;
    save_enablewhendirty: boolean;
    table_default_styles?: Record<string, unknown>;
    style_formats: StyleFormat[];
    style_formats_merge: boolean;
    toolbar: string;
    toolbar_groups: ToolbarGroups;
    toolbar_mode: string;
    quickbars_link_toolbar: boolean;
    quickbars_selection_toolbar: string;
    quickbars_insert_toolbar: string;
    quickbars_table_toolbar: string;
  }

  interface StyleFormat {
    title: string;
    items: StyleItem[];
  }

  interface StyleItem {
    title: string;
    block?: string;
    inline?: string;
    wrapper: boolean;
    classes?: string;
    attributes?: Record<string, string>;
  }

  interface ToolbarGroups {
    formatting: ToolbarGroup;
    alignment: ToolbarGroup;
    lists: ToolbarGroup;
    elements: ToolbarGroup;
  }

  interface ToolbarGroup {
    icon: string;
    tooltip: string;
    items: string;
  }
  // #endregion

  // #region SocketLib ~
  const socketlib: SocketLib;
  const socket: Socket;
  // #endregion

  // #region GreenSock ~
  // Represents a gsap animation
  type GsapAnimation = gsap.core.Tween | gsap.core.Timeline;

  // Represents a valid gsap animation target
  type TweenTarget = NonNullable<JQuery | gsap.TweenTarget>;

  type GSAPEffectFunction<Schema extends gsap.TweenVars = gsap.TweenVars> = (targets: TweenTarget, config?: Partial<Schema>) => GSAPAnimation;
  type GSAPEffectFunctionWithDefaults<Schema extends gsap.TweenVars = gsap.TweenVars> = (targets: TweenTarget, config: Schema) => GSAPAnimation;

  interface GSAPEffectDefinition<Schema extends gsap.TweenVars = gsap.TweenVars> {
    name: string,
    effect: GSAPEffectFunctionWithDefaults<Schema>,
    defaults: Schema,
    extendTimeline: boolean;
  }


  // type GsapEffectConfig = typeof gsapEffects[keyof typeof gsapEffects]["defaults"];
  // namespace gsap.core {
  //   interface Timeline {
  //     // Use a mapped type to dynamically add methods based on gsapEffects keys
  //     [K in gsapEffectKey]?: (
  //       targets: gsap.TweenTarget,
  //       config: {duration?: number} & GsapEffectConfig
  //     ) => gsap.core.Timeline;
  //   }
  // }

  // #endregion

  // #region JQuery ~
  // Represents a jQuery text term
  type jQueryTextTerm = SystemScalar | (
    (this: Element, index: number, text: string) => SystemScalar
  );

  // Simplified JQuery Events
  type ClickEvent = JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>;
  type DoubleClickEvent = JQuery.DoubleClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>;
  type ContextMenuEvent = JQuery.ContextMenuEvent<HTMLElement, undefined, HTMLElement, HTMLElement>;
  type TriggerEvent = JQuery.TriggeredEvent<HTMLElement, undefined, HTMLElement, HTMLElement>;
  type InputChangeEvent = JQuery.ChangeEvent<HTMLInputElement, undefined, HTMLInputElement, HTMLInputElement>;
  type BlurEvent = JQuery.BlurEvent<HTMLElement, undefined, HTMLElement, HTMLElement>;
  type DropEvent = JQuery.DropEvent<HTMLElement, undefined, HTMLElement, HTMLElement>;
  type OnSubmitEvent = Event & ClickEvent & {
    result: Promise<Record<string, SystemScalar>>;
  };
  type ChangeEvent = JQuery.ChangeEvent<HTMLElement, undefined, HTMLElement, HTMLElement>;
  type SelectChangeEvent = JQuery.ChangeEvent<HTMLSelectElement, undefined, HTMLSelectElement, HTMLSelectElement>;
  // #endregion

  // #region Clamp ~
  function $clamp(element: HTMLElement, options?: ClampOptions): ClampResponse;
  // #endregion

  // #region CQ API ~
  const cqApi: {
    reprocess: () => void,
    reparse: () => void,
    reevaluate: () => void,
    config: Record<string, unknown>;
  };
  // #endregion

  // #endregion

  /** Represents the time remaining until a target date/time */
  interface CountdownTime {
    /** Days remaining */
    days: number;
    /** Hours remaining */
    hours: number;
    /** Minutes remaining */
    minutes: number;
    /** Seconds remaining */
    seconds: number;
    /** Total seconds remaining */
    totalSeconds: number;
  }

  /** Pre-session sequence state */
  interface PreSessionState {
    /** Whether the loading screen content should continue rotating */
    loadingScreenActive: boolean;
    /** Whether the countdown should be visible */
    countdownVisible: boolean;
    /** Whether UI elements should be visible */
    uiVisible: boolean;
    /** Whether the video element should be visible */
    videoVisible: boolean;
    /** Whether the pre-session song is playing */
    songPlaying: boolean;
    /** Whether the video is preloaded and ready */
    videoPreloaded: boolean;
  }

}
