// #region IMPORTS ~
// import C, {K4Influence} from "../scripts/constants.js";
  import {getTemplatePath} from "../scripts/utilities.js";
  import {Sounds} from "../scripts/constants.js";
import EunosActor from "../documents/EunosActor.js";
import {AlertPaths, type SVGPathData} from "../scripts/svgdata.js";
import EunosMedia from "./EunosMedia";
import EunosSockets from "./EunosSockets.js";
import {AlertType, UserTargetRef, EunosMediaTypes} from "../scripts/enums.js";
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
      soundName: string;
      soundDelay?: number;
      duration?: number;
      skipQueue?: boolean;
    }
    export interface Simple extends Base {
      type: AlertType.simple,
      header: string;
      body: string;
      svgPaths?: Record<string, SVGPathData>;
      logoImg?: string
    }

    export interface Central extends Omit<Simple, "type"> {
      type: AlertType.central;
    }

    export interface GMNotice extends Base {
      type: AlertType.gmNotice,
      header: string;
      body: string;
    }

    export interface CriticalWound extends Base {
      type: AlertType.criticalWound,
      header: string;
      body: string;
    }

    export interface SeriousWound extends Base {
      type: AlertType.seriousWound,
      header: string;
      body: string;
    }

    export interface Stability extends Base {
      type: AlertType.stability,
      header: string;
      body: string;
    }

    export interface ShatterIllusion extends Base {
      type: AlertType.shatterIllusion,
      header: string;
      body: string;
    }
  }
  export type Context<T extends AlertType = AlertType.simple> = T extends AlertType.simple ? Context.Simple
    : T extends AlertType.central ? Context.Central
    : T extends AlertType.gmNotice ? Context.GMNotice
    : T extends AlertType.criticalWound ? Context.CriticalWound
    : T extends AlertType.seriousWound ? Context.SeriousWound
    : T extends AlertType.stability ? Context.Stability
    : T extends AlertType.shatterIllusion ? Context.ShatterIllusion
    : never;

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
    export interface Central extends Context.Central, Base {
      type: AlertType.central;
    }
    export interface GMNotice extends Context.GMNotice, Base {
      type: AlertType.gmNotice;
    }
    export interface CriticalWound extends Context.CriticalWound, Base {
      type: AlertType.criticalWound;
    }
    export interface SeriousWound extends Context.SeriousWound, Base {
      type: AlertType.seriousWound;
    }
    export interface Stability extends Context.Stability, Base {
      type: AlertType.stability;
    }
    export interface ShatterIllusion extends Context.ShatterIllusion, Base {
      type: AlertType.shatterIllusion;
    }
  }
  export type TypedData<T extends AlertType> = T extends AlertType.simple ? Data.Simple

    : T extends AlertType.gmNotice ? Data.GMNotice
    : T extends AlertType.criticalWound ? Data.CriticalWound
    : T extends AlertType.seriousWound ? Data.SeriousWound
    : T extends AlertType.stability ? Data.Stability
    : T extends AlertType.shatterIllusion ? Data.ShatterIllusion
    : never;
  export type Data = Data.Simple | Data.Central | Data.GMNotice | Data.CriticalWound | Data.SeriousWound | Data.Stability | Data.ShatterIllusion;
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
      const {duration, ease, height, soundName} = config;
      return gsap.timeline()
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
      height: 0,
      soundName: "slow-hit"
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
  [AlertType.test]: {
    in: {
      name: "testAlertIn",
      effect: (target, config) => {
        const {duration, ease} = config;
        const target$ = $(target as HTMLElement);
        const container$ = target$.find(".alert-frame-body");
        const containerHeight = container$.height() ?? 0;
        const imgLogo$ = target$.find("img.k4-alert-logo");
        const heading$ = target$.find("h2");
        const hr$ = target$.find("hr");
        const body$ = target$.find("p");

        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const tl = gsap.timeline()
          ["fadeShrinkIn"](target$, {duration, ease: "power2.inOut"})
          ["fadeIn"](imgLogo$, {duration: 1}, "<50%")
          ["slideDown"](container$, {duration: 0.5, height: containerHeight, ease}, 0.5)
          ["fadeIn"](heading$, {duration: 0.5}, "<50%")
          ["spreadOut"](hr$, {endWidth: 500})
          ["fadeIn"](body$, {}, "<50%")
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
      name: "testAlertOut",
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
    },
  },
  [AlertType.seriousWound]: {
    in: {
      name: "seriousWoundAlertIn",
      effect: (target, config) => {
        const {duration,  ease} = config;
        const target$ = $(target as HTMLElement);
        const container$ = target$.find(".alert-frame-body");
        const containerHeight = container$.height() ?? 0;
        const imgLogo$ = target$.find("img.k4-alert-logo");
        const heading$ = target$.find("h2");
        const hr$ = target$.find("hr");
        const body$ = target$.find("p");

        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const tl = gsap.timeline()
          ["fadeShrinkIn"](target$, {duration, ease: "power2.inOut"})
          ["fadeIn"](imgLogo$, {duration: 1}, "<50%")
          ["slideDown"](container$, {duration: 0.5, height: containerHeight, ease}, "<50%")
          ["fadeIn"](heading$, {duration: 0.5}, "<50%")
          ["spreadOut"](hr$, {endWidth: 500})
          ["fadeIn"](body$, {}, "<50%")
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
      name: "seriousWoundAlertOut",
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
  [AlertType.criticalWound]: {
    in: {
      name: "criticalWoundAlertIn",
      effect: (target, config) => {
        const {duration, ease} = config;
        const target$ = $(target as HTMLElement);
        const container$ = target$.find(".alert-frame-body");
        const containerHeight = container$.height() ?? 0;
        const imgLogo$ = target$.find("img.k4-alert-logo");
        const heading$ = target$.find("h2");
        const hr$ = target$.find("hr");
        const body$ = target$.find("p");

        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const tl = gsap.timeline()
          ["fadeShrinkIn"](target$, {duration, ease: "power2.inOut"})
          ["fadeIn"](imgLogo$, {duration: 1}, "<50%")
          ["slideDown"](container$, {duration: 0.5, height: containerHeight, ease}, "<50%")
          ["fadeIn"](heading$, {duration: 0.5}, "<50%")
          ["spreadOut"](hr$, {endWidth: 500})
          ["fadeIn"](body$, {}, "<50%")
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
      name: "criticalWoundAlertOut",
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
  [AlertType.stability]: {
    in: {
      name: "stabilityAlertIn",
      effect: (target, config) => {
        const {duration, ease} = config;
        const target$ = $(target as HTMLElement);
        const container$ = target$.find(".alert-frame-body");
        const containerHeight = container$.height() ?? 0;
        const imgLogo$ = target$.find("img.k4-alert-logo");
        const heading$ = target$.find("h2");
        const hr$ = target$.find("hr");
        const body$ = target$.find("p");

        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const tl = gsap.timeline()
          ["fadeShrinkIn"](target$, {duration, ease: "power2.inOut"})
          ["fadeIn"](imgLogo$, {duration: 1}, "<50%")
          ["slideDown"](container$, {duration: 0.5, height: containerHeight, ease}, "<50%")
          ["fadeIn"](heading$, {duration: 0.5}, "<50%")
          ["spreadOut"](hr$, {endWidth: 500})
          ["fadeIn"](body$, {}, "<50%")
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
      name: "stabilityAlertOut",
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
  [AlertType.shatterIllusion]: {
    in: {
      name: "shatterIllusionAlertIn",
      effect: (target, config) => {
        const {duration, ease} = config;
        const target$ = $(target as HTMLElement);
        const container$ = target$.find(".alert-frame-body");
        const containerHeight = container$.height() ?? 0;
        const imgLogo$ = target$.find("img.k4-alert-logo");
        const heading$ = target$.find("h2");
        const hr$ = target$.find("hr");
        const body$ = target$.find("p");

        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const tl = gsap.timeline()
          ["fadeShrinkIn"](target$, {duration, ease: "power2.inOut"})
          ["fadeIn"](imgLogo$, {duration: 1}, "<50%")
          ["slideDown"](container$, {duration: 0.5, height: containerHeight, ease}, "<50%")
          ["fadeIn"](heading$, {duration: 0.5}, "<50%")
          ["spreadOut"](hr$, {endWidth: 500})
          ["fadeIn"](body$, {}, "<50%")
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
      name: "shatterIllusionAlertOut",
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
  [AlertType.central]: {
    in: {
      name: "centralAlertIn",
      effect: (target, config) => {
        const {duration,  ease} = config;
        const alerts$ = $("#ALERTS");
        const target$ = $(target as HTMLElement);
        const container$ = target$.find(".alert-frame-body");
        const containerHeight = container$.height() ?? 0;
        const imgLogo$ = target$.find("img.k4-alert-logo");
        const heading$ = target$.find("h2");
        const hr$ = target$.find("hr");
        const body$ = target$.find("p");

        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const tl = gsap.timeline()
          .call(() => {
            alerts$.addClass("k4-central");
          })
          ["fadeShrinkIn"](target$, {duration, ease: "power2.inOut"})
          ["fadeIn"](imgLogo$, {duration: 1}, "<50%")
          ["slideDown"](container$, {duration: 0.5, height: containerHeight, ease}, "<50%")
          ["fadeIn"](heading$, {duration: 0.5}, "<50%")
          ["spreadOut"](hr$, {endWidth: 500})
          ["fadeIn"](body$, {}, "<50%")
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
      name: "centralAlertOut",
      effect: (target, config) => {
        const {duration, stagger, ease} = config;
        const alerts$ = $("#ALERTS");
        return gsap.timeline()
          .call(() => {
            alerts$.removeClass("k4-central");
          })
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
        const hr$ = target$.find("hr");
        const body$ = target$.find("p");

        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        const tl = gsap.timeline()
          ["fadeShrinkIn"](target$, {duration, ease: "power2.inOut"})
          ["fadeIn"](imgLogo$, {duration: 1}, "<50%")
          ["slideDown"](container$, {duration: 0.5, height: containerHeight, ease}, "<50%")
          ["fadeIn"](heading$, {duration: 0.5}, "<50%")
          ["spreadOut"](hr$, {endWidth: 500})
          ["fadeIn"](body$, {}, "<50%")
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

  public static readonly SocketFunctions: Record<string, SocketFunction<void, Partial<EunosAlerts.Data>>> = {
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
    const type = fullData.type ?? AlertType.simple;
    const {target, ...data} = {
      ...EunosAlerts.GetDefaultData(type),
      ...fullData
    };
    const sockets = EunosSockets.getInstance();
    const userTargets = sockets.getUsersFromTarget(target);
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
  static GetDefaultData<T extends AlertType>(type: T): EunosAlerts.TypedData<T> {
    let defaultSoundName: string|null = null;
    switch (type) {
      case AlertType.simple:
      case AlertType.central:
      case AlertType.test:
        defaultSoundName ??= "slow-hit";
        // falls through
      case AlertType.seriousWound:
        defaultSoundName ??= "alert-hit-wound-1";
        // falls through
      case AlertType.criticalWound:
        defaultSoundName ??= "alert-hit-wound-2";
        // falls through
      case AlertType.stability:
        defaultSoundName ??= "alert-hit-stability";
        // falls through
      case AlertType.shatterIllusion: {
        defaultSoundName ??= "alert-hit-shatterIllusion";
        return {
          type,
          target: UserTargetRef.all,
          skipQueue: false,
          header: "",
          body: "",
          soundName: defaultSoundName,
          displayDuration: 5,
          svgPaths: AlertPaths,
          logoImg: "modules/eunos-kult-hacks/assets/images/logo-bird.webp"
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
  sound: EunosMedia<EunosMediaTypes.audio>|null = null;
  soundDelay: number|null = null;
  constructor(data: Partial<EunosAlerts.Data>) {
    this._type = data.type ?? AlertType.simple;
    const {displayDuration, soundName, soundDelay, ...contextData} = {
      ...EunosAlerts.GetDefaultData(this._type),
      ...data
    };
    this.sound = EunosMedia.Sounds.get(soundName) ?? null;
    this.soundDelay = soundDelay ?? this.sound?.delay ?? null;
    this._context = contextData as EunosAlerts.Context;
    this._displayDuration = displayDuration ?? this.sound?.displayDuration ?? 5;
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
      if (!this.sound) {
        kLog.log("No sound, creating");
      }
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
        .add(animations.out.effect(this._element!, animations.out.defaults), `>+=${this.displayDuration}`)
        .add(() => { void this.sound?.play(); }, this.soundDelay ?? 0.5);
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
