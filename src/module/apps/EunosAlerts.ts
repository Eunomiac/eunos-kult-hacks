// #region IMPORTS ~
// import C, {K4Influence} from "../scripts/constants.js";
  import {getTemplatePath} from "../scripts/utilities.js";
import EunosActor from "../documents/EunosActor.js";
import {AlertPaths, type SVGPathData} from "../scripts/svgdata.js";
import * as Sounds from "../scripts/sounds.js";
import EunosSockets from "../apps/EunosSockets.js";
import {AlertType, UserTargetRef} from "../scripts/enums.js";
// #endregion

// #region === TYPES, ENUMS, INTERFACE AUGMENTATION === ~

// #region -- TYPES ~
declare namespace EunosAlerts {

  export type AlertPathID = keyof typeof AlertPaths;
  /**
   * The contextual data passed to the .hbs template
   */
  export namespace Context {
    interface Base {
      type: AlertType;
      target: UserTargetRef|IDString|UUIDString;
      skipQueue?: boolean;
    }
    export interface Simple extends Base {
      type: AlertType.simple,
      header: string;
      body: string;
      svgPaths?: Record<string, SVGPathData>;
      logoImg?: string
    }

    export interface GMNotice extends Base {
      type: AlertType.gmNotice,
      header: string;
      body: string;
    }
  }
  // export type Context<T extends AlertType> = T extends AlertType.simple ? Context.Simple
  //   : T extends AlertType.card ? Context.Card
  //   : never;
  export type Context = Context.Simple;

  /**
   * The data passed to the EunosAlerts constructor
   */
  export namespace Data {
    interface Base {
      displayDuration: number;
    }
    export interface Simple extends Context.Simple, Base {
      type: AlertType.simple;
    }
    export interface GMNotice extends Context.GMNotice, Base {
      type: AlertType.gmNotice;
    }
  }
  export type TypedData<T extends AlertType> = T extends AlertType.simple ? Data.Simple
    : T extends AlertType.gmNotice ? Data.GMNotice
    : never;
  export type Data = Data.Simple | Data.GMNotice;
}
// #endregion
// #endregion

// #region === GSAP ANIMATIONS ===
const GSAPEFFECTS: Record<string, GSAPEffectDefinition> = {
  fadeShrinkIn: {
    name: "fadeShrinkIn",
    effect: (target, config) => {
      const {duration, ease, startScale, test} = config;
      return gsap.timeline()
        .fromTo(target,
          {
            autoAlpha: 0,
            scale: startScale as number,
            transformOrigin: "center center",
            y: 30
          }, {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration,
            ease
          }
        );
    },
    defaults: {
      duration: 1,
      ease: "power3.in",
      startScale: 1.25
    },
    extendTimeline: true
  },
  spreadOut: {
    name: "spreadOut",
    effect: (target, config) => {
      const {startWidth, endWidth, duration, ease} = config;
      return gsap.timeline()
        .fromTo(target,
          {
            width: startWidth as number
          }, {
            width: endWidth as number,
            duration,
            ease
          }
        );
    },
    defaults: {
      startWidth: 0,
      endWidth: 200,
      duration: 0.5,
      ease: "power3.in"
    },
    extendTimeline: true
  },
  slideDown: {
    name: "slideDown",
    effect: (target, config) => {
      const {duration, ease, height} = config;
      return gsap.timeline()
        .add(() => { Sounds.play("slow-hit"); })
        .fromTo(target,
          {
            height: 0
          }, {
            height,
            duration,
            ease
          }
        );
    },
    defaults: {
      duration: 0.5,
      ease: "power3.in",
      height: 0
    },
    extendTimeline: true
  },
  fadeIn: {
    name: "fadeIn",
    effect: (target, config) => {
      const {duration, ease} = config;
      return gsap.timeline()
        .fromTo(target,
          {
            opacity: 0
          }, {
            opacity: 1,
            duration,
            ease
          }
        );
    },
    defaults: {
      duration: 0.25,
      ease: "power3.in"
    },
    extendTimeline: true
  },
  fadeOut: {
    name: "fadeOut",
    effect: (target, config) => {
      const {duration, ease} = config;
      return gsap.timeline()
        .fromTo(target,
          {
            opacity: 1
          }, {
            opacity: 0,
            duration,
            ease
          }
        );
    },
    defaults: {
      duration: 0.25,
      ease: "power3.out"
    },
    extendTimeline: true
  }
} as const;

const ALERTANIMATIONS: Record<AlertType, {
  in: GSAPEffectDefinition,
  out: GSAPEffectDefinition,
  setup?: (target: JQuery, data: EunosAlerts.Data) => void;
}> = {
  [AlertType.simple]: {
    in: {
      name: "simpleAlertIn",
      effect: (target, config) => {
        const {duration,  ease} = config;
        const target$ = $(target as HTMLElement);
        const container$ = target$.find(".alert-frame-body");
        const containerHeight = container$.height() ?? 0;
        const imgLogo$ = target$.find("img.k4-alert-logo");
        const heading$ = target$.find("h2");
        // const hr$ = target$.find("hr");
        const body$ = target$.find("p");

        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const tl = gsap.timeline()
          ["fadeShrinkIn"](target$, {duration, ease: "power2.inOut"})
          ["fadeIn"](imgLogo$, {duration: 1}, "<50%")
          ["slideDown"](container$, {duration: 0.5, height: containerHeight, ease: "power2.in"}, "<50%")
          ["fadeIn"](heading$, {duration: 0.5}, "<50%")
          // ["spreadOut"](hr$, {endWidth: 500})
          ["fadeIn"](body$, {}, "<50%")
          .add(() => { Sounds.play("subsonic-stinger"); }, 0.25)
        return tl as gsap.core.Timeline;
        /* eslint-enable */
      },
      defaults: {
        duration: 1,
        stagger: 0.25,
        ease: "power3.in"
      },
      extendTimeline: true
    },
    out: {
      name: "simpleAlertOut",
      effect: (target, config) => {
        const {duration, stagger, ease} = config;
        return gsap.timeline()
          .fromTo(target, {opacity: 1}, {opacity: 0, duration, stagger, ease});
      },
      defaults: {
        duration: 0.5,
        stagger: 0.25,
        ease: "power3.out"
      },
      extendTimeline: true
    }
  },
  [AlertType.gmNotice]: {
    in: {
      name: "gmNoticeAlertIn",
      effect: (target) => {
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        return gsap.timeline()
          ["fadeShrinkIn"](target, {duration: 1.5, ease: "power2.inOut"}) as gsap.core.Timeline;
      },
      defaults: {},
      extendTimeline: true
    },
    out: {
      name: "gmNoticeAlertOut",
      effect: (target) => {
        return gsap.timeline()
          ["fadeOut"](target, {duration: 0.5, ease: "power2.inOut"}) as gsap.core.Timeline;
      },
      defaults: {
        duration: 0.5,
        ease: "power3.out"
      },
      extendTimeline: true
    },
    setup: (target$, _data) => {
      const container$ = target$.find(".alert-frame-body");
      const containerHeight = container$.height() ?? 0;
    }
  }
};
// #endregion

/**
 * A class representing an ordered set of unique items.
 *
 * This class maintains the order of items as they are added and ensures that each item is unique.
 * It provides methods to add, check, delete, and retrieve items, as well as to get the size of the set.
 *
 * @template T - The type of items to be stored in the set.
 */
class OrderedSet<T> {
  private readonly items: T[] = [];

  /**
   * Adds a unique item to the set. If the item already exists, it will not be added again.
   *
   * @param {T} item - The item to be added to the set.
   */
  add(item: T): void {
      if (!this.has(item)) {
          this.items.push(item);
      }
  }

  /**
   * Checks if the item exists in the set.
   *
   * @param {T} item - The item to check for existence in the set.
   * @returns {boolean} - Returns true if the item exists in the set, otherwise false.
   */
  has(item: T): boolean {
      return this.items.includes(item);
  }

  /**
   * Deletes an item from the set if it exists.
   *
   * @param {T} item - The item to be deleted from the set.
   */
  delete(item: T): void {
      const index = this.items.indexOf(item);
      if (index !== -1) {
          this.items.splice(index, 1);
      }
  }

  /**
   * Returns an iterable iterator of the items in the set.
   *
   * @returns {IterableIterator<T>} - An iterable iterator of the items in the set.
   */
  values(): IterableIterator<T> {
      return this.items.values();
  }

  /**
   * Gets the number of items in the set.
   *
   * @returns {number} - The number of items in the set.
   */
  get size(): number {
      return this.items.length;
  }

  /**
   * Returns the oldest element in the set.
   *
   * @returns {T | undefined} - The oldest element in the set, or undefined if the set is empty.
   */
  next(): T | undefined {
      return this.items.length > 0 ? this.items[0] : undefined;
  }
}

// #region === EunosAlerts CLASS ===
class EunosAlerts {
  // #region INITIALIZATION ~

  public static readonly SocketFunctions: Record<string, SocketFunction> = {
    "Alert": (data: Partial<EunosAlerts.Data>) => {
      const thisAlert = new EunosAlerts(data);
      kLog.log("Alert", data, thisAlert);
      if (data.skipQueue) {
        void thisAlert.run();
        return;
      }
      const {context} = thisAlert;

      function isRepeatAlert(ctext: EunosAlerts.Context): boolean {
        const queuedAlertsOfType = Array.from(EunosAlerts.AlertQueue.values())
          .filter((al) => al.type === ctext.type)
          .map((al) => al.context);
        if (!queuedAlertsOfType.length) { return false; }
        if ([AlertType.simple].includes(ctext.type)) {
          return queuedAlertsOfType
            .some((al) => [AlertType.simple].includes(al.type) && al.body === ctext.body);
        }
        return false;
      }

      if (isRepeatAlert(context)) { return; }
      EunosAlerts.AlertQueue.add(thisAlert);
      EunosAlerts.RunQueue();
    }
  }

  /**
  * Pre-Initialization of the EunosAlerts class. This method should be run during the "init" hook.
  *
  * - Generates the overlay element to contain EunosAlerts instances
  * - Sets up socketlib to synchronize EunosAlerts instances across clients
  * - Registers gsap effects for EunosAlerts instances
  */
  static PreInitialize() {

    // Register GSAP Effects
    Object.values(GSAPEFFECTS).forEach((effect) => {
      gsap.registerEffect(effect);
    });
  }
  // #endregion

  static get Overlay$(): JQuery {
    return $("#ALERTS");
  }
  static readonly AlertQueue: OrderedSet<EunosAlerts> = new OrderedSet<EunosAlerts>();

  static Alert(fullData: Partial<EunosAlerts.Data>) {
    const {target, ...data} = fullData;
    const sockets = EunosSockets.getInstance();
    const userTargets = sockets.getUsersFromTarget(target);
    kLog.log(`target: ${target} -> Users: ${userTargets.map((user) => user.name).join(", ")}`,0);
    return Promise.all(userTargets.map((user) => user.id && sockets.call(
        "Alert",
        user.id,
        data
      )));
  }

  static RunQueue() {
    if (this.AlertQueue.size === 0) {
      gsap.to(
        $("#interface")[0]!,
        {
          background: "rgba(0, 0, 0, 0)",
          duration: 0.5,
          ease: "power3.out"
        }
      );
      return;
    }
    const alert = this.AlertQueue.next()!;
    if (alert.isTweening) { return; }
    gsap.to(
      $("#interface")[0]!,
      {
        background: "rgba(0, 0, 0, 0.75)",
        duration: 0.5,
        ease: "power3.in"
      }
    );
    void alert.run();
  }


  // #region STATIC METHODS ~
  /**
   * Given a string, will return the URL to the drop cap image for the first character of that string.
   * @param {string} content - The string to extract the first character from.
   * @returns {string} The URL to the drop cap image for the first character of the string.
   */
  static GetDropCap(content: string): string {
    if (!content.length) {
      return "";
    };
    return `modules/eunos-kult-hacks/assets/chat/dropcaps/${content.slice(0, 1).toUpperCase()}.png`;
  }

  static GetDefaultData<T extends AlertType>(type: T): EunosAlerts.TypedData<T> {
    switch (type) {
      case AlertType.simple: {
        return {
          type,
          target: UserTargetRef.all,
          skipQueue: false,
          header: "",
          body: "",
          displayDuration: 5,
          svgPaths: AlertPaths,
          logoImg: "modules/eunos-kult-hacks/assets/alerts/logo-bird.webp"
        } as EunosAlerts.Data.Simple & EunosAlerts.TypedData<T>;
      }
      default: return undefined as never;
    }
  }
  // #endregion

  // #region GETTERS & SETTERS ~
  _type: AlertType;
  _context: EunosAlerts.Context;
  _displayDuration: number;
  _timeline: Maybe<GSAPAnimation>;
  _element: Maybe<JQuery>;

  get type(): AlertType {
    return this._type;
  }
  get context(): EunosAlerts.Context {
    return this._context;
  }
  get displayDuration(): number {
    return this._displayDuration;
  }
  get element(): Maybe<JQuery> {
    return this._element;
  }
  hasElement(): this is typeof this & { _element: JQuery} {
    return Boolean(this._element?.[0]);
  }
  hasTimeline(): this is typeof this & { _timeline: GSAPAnimation } {
    return Boolean(this._timeline);
  }
  get isTweening(): boolean {
    return this.hasTimeline() && this._timeline.isActive();
  }

  // #endregion

  // #region CONSTRUCTOR
  constructor(data: Partial<EunosAlerts.Data>) {
    this._type = data.type ?? AlertType.simple;
    const {displayDuration, ...contextData} = {
      ...EunosAlerts.GetDefaultData(this._type),
      ...data
    };
    this._context = contextData as EunosAlerts.Context;
    this._displayDuration = displayDuration!;
  }
  // #endregion

  async run() {
    kLog.log("Running alert", this.type, this.context);
    if (!this.hasElement()) {
      kLog.log("No element, creating");
      const elementCode: string = await renderTemplate(
        getTemplatePath("alerts", `alert-${this.type}`),
        this.context
      );
      this._element = $(elementCode).appendTo(EunosAlerts.Overlay$);
      kLog.log("Element created", this._element);
    }
    // return;
    if (!this.hasTimeline()) {
      const animations = ALERTANIMATIONS[this.type];
      kLog.log("No timeline, creating");
      const self = this;
      this._timeline = gsap.timeline(
        {
          onComplete() {
            self.element!.remove();
            EunosAlerts.AlertQueue.delete(self);
            EunosAlerts.RunQueue();
          }
        }
      )
        .add(animations.in.effect(this._element!, animations.in.defaults))
        .add(animations.out.effect(this._element!, animations.out.defaults), `>+=${this.displayDuration}`);
      kLog.log("Timeline created", this._timeline);
    }
    kLog.log("Alert ready");
  }
  // #region HTML PARSING

  // #endregion

}
// #ENDREGION

// #region EXPORTS ~
export default EunosAlerts;
export {AlertType};
// #endregion
