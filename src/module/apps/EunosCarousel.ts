import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import EunosMedia from "./EunosMedia";
import type { EmptyObject } from "fvtt-types/utils";
import { sleep } from "../scripts/utilities";
import EunosSockets from "./EunosSockets";
import {AlertType, UserTargetRef} from "../scripts/enums";

/**
 * A 3D carousel component that displays items in a circular arrangement
 * and allows rotation between them.
 *
 * @class EunosCarousel
 * @extends {ApplicationV2}
 */
export default class EunosCarousel extends HandlebarsApplicationMixin(
  ApplicationV2
)<
  EmptyObject, // RenderContext
  EunosOverlayConfiguration, // Configuration
  ApplicationV2.RenderOptions // RenderOptions
> {
  /** Fixed radius of the carousel (80vw converted to pixels) */
  private carouselRadius: number = 0; // Will be calculated on initialization

  /** Current index position of the carousel (0-based) */
  private currentIndex: number = 0;

  /** Number of items in the carousel */
  private numItems: number = 5;

  // #region SINGLETON PATTERN ~
  /** Singleton instance of the carousel */
  private static _instance: EunosCarousel | null = null;

  /**
   * Private constructor to enforce singleton pattern
   * @param {object} options - Configuration options for the application
   */
  private constructor(options = {}) {
    super(options);
    // Remove the radius calculation here - we'll calculate it in initializeCarousel
  }

  /**
   * Get the singleton instance of the carousel
   * @returns {EunosCarousel} The singleton instance
   */
  public static get instance(): EunosCarousel {
    if (!EunosCarousel._instance) {
      EunosCarousel._instance = new EunosCarousel();
    }
    return EunosCarousel._instance;
  }
  // #endregion SINGLETON PATTERN

  /**
   * Template parts used by the application
   */
  static override PARTS = {
    carousel: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-carousel/carousel.hbs"
    },
    controls: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-carousel/controls.hbs"
    }
  };

  public static readonly SocketFunctions: {
    showStandingStones: AsyncSocketFunction<void, void>;
    hideStandingStones: AsyncSocketFunction<void, void>;
  } = {
    showStandingStones: async () => {
      await EunosCarousel.instance.initializeCarousel();
    },
    hideStandingStones: async () => {
      await EunosCarousel.instance.hideCarousel();
    }
  };

  /**
   * Event handlers for the application
   */
  static readonly ACTIONS: Record<string, ApplicationV2.ClickAction> = {
    prevStoneClick(event: PointerEvent, target: HTMLElement) {
      EunosCarousel.instance.rotateToIndex(
        EunosCarousel.instance.currentIndex - 1
      );
    },
    nextStoneClick(event: PointerEvent, target: HTMLElement) {
      EunosCarousel.instance.rotateToIndex(
        EunosCarousel.instance.currentIndex + 1
      );
    }
  };

  // #region STATIC CONFIGURATION ~
  /**
   * Default configuration options for the application
   */
  static override DEFAULT_OPTIONS = {
    id: "EUNOS_CAROUSEL",
    classes: ["eunos-carousel"],
    position: {
      width: "auto" as const,
      height: "auto" as const
    },
    window: {
      frame: false,
      positioned: false,
      contentTag: "div",
      contentClasses: ["eunos-carousel-content"]
    },
    actions: Object.fromEntries(
      Object.entries(EunosCarousel.ACTIONS).map(([key, action]) => [
        key,
        action.bind(EunosCarousel)
      ])
    )
  };

  static MEMORIAL_TABLE_SCROLL_DURATION = 400;

  // #endregion

  // #region ACCESSORS ~
  /**
   * Get a jQuery table for the element
   * @returns {JQuery} jQuery object wrapping the element
   * @throws {Error} If element is not initialized
   */
  get element$(): JQuery {
    if (!this.element) {
      throw new Error("Carousel element is not initialized");
    }
    return $(this.element);
  }

  private rangerScrollAnimation: gsap.core.Timeline | null = null;
  // #endregion

  // #region CAROUSEL METHODS ~

  private async scrollMemorialTable(item: HTMLElement) {
    const outerWrapper = $(item).find(".lost-rangers-wrapper")[0];
    const tableWrappers = $(item).find(".lost-rangers-table-wrapper");

    if (!outerWrapper || tableWrappers.length < 2) {
      kLog.error("Failed to find .lost-rangers-wrapper or table wrappers");
      return;
    }

    const wrapper1 = tableWrappers[0]!;
    const wrapper2 = tableWrappers[1];

    const table1 = $(wrapper1).find(".lost-rangers-table")[0]!;

    kLog.log(`Wrapper1 Outer Height: ${$(wrapper1).outerHeight()}`);
    kLog.log(`Table1 Outer Height: ${$(table1).outerHeight()}`);

    setTimeout(() => {
      kLog.log(`Wrapper1 Outer Height: ${$(wrapper1).outerHeight()}`);
      kLog.log(`Table1 Outer Height: ${$(table1).outerHeight()}`);
    }, 5000);

    if (!wrapper1 || !wrapper2) {
      kLog.error("Failed to find .lost-rangers-table-wrapper elements");
      return;
    }

    // Generate both timelines after a short delay to let the wrapper heights be calculated
    await sleep(0.5);

    const wrapperHeight = $(wrapper1).outerHeight() ?? 0;

    this.rangerScrollAnimation = gsap
      .timeline({ repeat: -1 })
      .fromTo(
        wrapper1,
        {
          y: 0
        },
        {
          y: -1 * wrapperHeight,
          ease: "none",
          duration: EunosCarousel.MEMORIAL_TABLE_SCROLL_DURATION / 2
        }
      )
      .set(wrapper1, { y: wrapperHeight })
      .to(wrapper1, {
        y: 0,
        ease: "none",
        duration: EunosCarousel.MEMORIAL_TABLE_SCROLL_DURATION / 2
      })
      .fromTo(
        wrapper2,
        {
          y: wrapperHeight
        },
        {
          y: -1 * wrapperHeight,
          ease: "none",
          duration: EunosCarousel.MEMORIAL_TABLE_SCROLL_DURATION
        },
        0
      )
      .set(wrapper2, { y: wrapperHeight });

    kLog.log("Wrapper Timelines", {
      wrapperTl1: this.rangerScrollAnimation
    });
  }

  public revealTimeline: gsap.core.Timeline | null = null;
  public isRevealed: boolean = false;

  public async showStandingStones() {
    if (!getUser().isGM) { return; }
    await EunosSockets.getInstance().call("showStandingStones", UserTargetRef.all);
  }

  public async hideStandingStones() {
    if (!getUser().isGM) { return; }
    await EunosSockets.getInstance().call("hideStandingStones", UserTargetRef.all);
  }

  /**
   * Initialize the carousel by positioning items in 3D space
   * @returns {Promise<void>}
   */
  async initializeCarousel(): Promise<void> {

    // Render the carousel
    await this.render({ force: true, parts: ["carousel", "controls"] });

    this.isRevealed = true;

    // Position the carousel in 3D space
    const carousel$ = this.element$.find(".stone-carousel");
    if (!carousel$.length) {
      kLog.error("Failed to find .stone-carousel element");
      return;
    }

    const carouselBase$ = $("#EUNOS_CAROUSEL .stone-carousel-base");
    if (!carouselBase$.length) {
      kLog.error("Failed to find .stone-carousel-base element");
      return;
    }

    const items$ = carousel$.find(".standing-stone");
    if (!items$.length) {
      kLog.error("No .standing-stone elements found");
      return;
    }

    try {
      // Calculate radius based on viewport width minus sidebar width
      const sidebarWidth =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--sidebar-width"
          )
        ) || 300;
      const availableWidth = window.innerWidth - sidebarWidth;
      this.carouselRadius = availableWidth * 0.4; // 40% of available width

      // Set the carousel z position and ensure preserve-3d
      gsap.set(carousel$, {
        z: -1 * this.carouselRadius,
        transformStyle: "preserve-3d"
      });

      // Position each stone in 3D space
      items$.each((index, item) => {
        // Calculate angle in radians (clockwise from the front)
        const angle = (index / this.numItems) * Math.PI * 2;

        // Vary the radius randomly to slightly offset the stones radially
        const minRadius = this.carouselRadius * 0.7;
        const maxRadius = this.carouselRadius * 1;
        const thisRadius = gsap.utils.random(minRadius, maxRadius);

        // Calculate x and z positions based on angle
        const x = Math.sin(angle) * thisRadius;
        const z = Math.cos(angle) * thisRadius;

        // Calculate rotation in degrees
        const angleStep = 360 / this.numItems;
        const rotationY = index * angleStep /* + gsap.utils.random(-3, 3) */;

        gsap.set(item, {
          rotationX: 0 /* gsap.utils.random(0, 10 */,
          transformStyle: "preserve-3d",
          transformOrigin: "bottom center"
        });

        // Apply transforms to position and rotate the item
        gsap.set(item, {
          x: x,
          z: z,
          rotationY: rotationY
        });

        if (index === 0) {
          void this.scrollMemorialTable(item);
        }
      });

      // Set initial rotation of the carousel to a random index
      const randIndex = gsap.utils.random(0, this.numItems - 1, 1);
      const rotationY = this.getRotationForIndex(randIndex);
      gsap.set(carousel$, { rotationY });

      // Animate entry of carousel
      const stageBGMap$ = $(
        "#STAGE #SECTION-3D .canvas-layer.background-layer"
      );
      const PCContainer$ = $("#EUNOS_OVERLAY #PCS");
      const sessionScribeIndicator$ = PCContainer$.find(".session-scribe-indicator");
      const standingStones$ = $("#EUNOS_CAROUSEL .standing-stone");
      gsap.set(Array.from(standingStones$), { autoAlpha: 0 });
      const carouselVerticals$ = $("#EUNOS_CAROUSEL .standing-stone-face");
      const carouselContent$ = $("#EUNOS_CAROUSEL .standing-stone-content");
      const carouselControls$ = $("#EUNOS_CAROUSEL .stone-carousel-controls");

      void EunosMedia.GetMedia("effect-standing-stones")?.play();

      this.revealTimeline = gsap
        .timeline({})
        .to(stageBGMap$, { autoAlpha: 0, duration: 3, ease: "none" })
        .fromTo(
          carouselBase$,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 2, ease: "none" },
          1
        )
        .fromTo(
          carouselBase$,
          { y: -1500, scale: 0.75 },
          { y: -1600, scale: 1, duration: 1, ease: "none" },
          2
        )
        .fromTo(
          standingStones$,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.25 },
          3
        )
        .fromTo(
          standingStones$,
          { y: 700 },
          { y: 0, ease: "none", duration: 10, stagger: 1.5 },
          3
        )
        .fromTo(
          carouselControls$,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.25 },
          ">"
        )
        .to(PCContainer$, { y: 150, duration: 5, ease: "back.out(1.5)"}, 7)
        .to(sessionScribeIndicator$, { y: -150, duration: 5, ease: "back.out(1.5)"}, 7)
        .call(() => {
          void EunosMedia.GetMedia("effect-standing-stones")?.play();
        }, [], 5)
        // .from(carouselContent$, {filter: "blur(5px)", duration: 2, stagger: 0.5})
        .fromTo(
          [carouselVerticals$, carouselContent$],
          { y: 15 },
          {
            y: 0,
            ease: "rough({ strength: 0.002, points: 1000, template: none, taper: none, randomize: true, clamp: true })",
            duration: 15,
            stagger: 0.1
          },
          3
        );
      // .from(carouselVerticals$, {transformOrigin: "bottom center", scaleY: 0, duration: 5})
      // .from(carouselTop$, {autoAlpha: 0, duration: 1.5})
    } catch (error) {
      // Properly type the error
      const err = error instanceof Error ? error : new Error(String(error));
      kLog.error("Failed to initialize carousel:", err);
    }
  }

  /**
   * Hide the carousel and remove it from the DOM
   */
  async hideCarousel() {
    if (this.isRevealed) {
      const stageBGMap$ = $(
        "#STAGE #SECTION-3D .canvas-layer.background-layer"
      );
      const PCContainer$ = $("#EUNOS_OVERLAY #PCS");
      void gsap.timeline()
        .to(stageBGMap$, { autoAlpha: 1, duration: 1, ease: "none" })
        .to(PCContainer$, { y: 0, duration: 1, ease: "none" }, 1)
        .to(this.element$, {autoAlpha: 0, scale: 0.75, duration: 1, ease: "power2.inOut", onComplete: () => {
        void this.close();
      }});
      this.isRevealed = false;
    }
  }

  /**
   * Rotate the carousel to a specific index
   * @param {number} index - The target index to rotate to
   * @returns {number} The wrapped index that was actually rotated to
   */
  rotateToIndex(index: number, isInstant = false): number {
    try {
      // Wrap the index to stay within bounds
      const wrappedIndex =
        ((index % this.numItems) + this.numItems) % this.numItems;

      // Get the carousel element
      const carousel$ = this.element$.find(".stone-carousel");
      if (!carousel$.length) {
        kLog.error("Failed to find .stone-carousel element");
        return wrappedIndex;
      }

      // Get the HTMLElement from the jQuery object with proper null checking
      const carouselElement = carousel$[0];
      if (!carouselElement) {
        kLog.error("Failed to get HTMLElement from jQuery object");
        return wrappedIndex;
      }

      // Calculate how many steps we need to move (positive or negative)
      const steps = index - this.currentIndex;

      // Calculate the angle to rotate by
      const anglePerItem = 360 / this.numItems;
      const rotationDelta = -steps * anglePerItem; // Negative because we're rotating the container, not the items

      // Get current rotation and add our delta
      const currentRotation =
        (gsap.getProperty(carouselElement, "rotationY") as number) || 0;
      let targetRotation = currentRotation + rotationDelta;

      // Use GSAP's snap utility to ensure we land exactly on a stone position
      // Snap to the nearest multiple of anglePerItem
      targetRotation = gsap.utils.snap(anglePerItem, targetRotation);

      kLog.log(
        `Rotating carousel from ${this.currentIndex} (${currentRotation}deg) to ${wrappedIndex} (${targetRotation}deg)`
      );

      // Update the current index AFTER calculating the rotation
      this.currentIndex = wrappedIndex;

      // Create and store the timeline
      const tl = gsap.timeline();
      tl.to(carousel$, {
        rotationY: targetRotation,
        duration: isInstant ? 0 : 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          // Dispatch event when rotation completes
          this.element.dispatchEvent(
            new CustomEvent("stoneSelected", {
              detail: { index: wrappedIndex }
            })
          );
        }
      });

      // Store the timeline on the element for potential future reference
      carousel$.data("rotation-timeline", tl);

      return wrappedIndex;
    } catch (error) {
      // Properly type the error
      const err = error instanceof Error ? error : new Error(String(error));
      kLog.error("Failed to rotate carousel:", err);
      return this.currentIndex;
    }
  }

  /**
   * Get the exact rotation angle for a specific index
   * @param {number} index - The index to get the rotation for
   * @returns {number} The exact rotation angle in degrees
   */
  getRotationForIndex(index: number): number {
    const anglePerItem = 360 / this.numItems;
    return -index * anglePerItem; // Negative because we're rotating the container, not the items
  }
  // #endregion
}
