import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import type { EmptyObject } from "fvtt-types/utils";
import {sleep} from "../scripts/utilities";

/**
 * A 3D carousel component that displays items in a circular arrangement
 * and allows rotation between them.
 *
 * @class EunosCarousel
 * @extends {ApplicationV2}
 */
export default class EunosCarousel extends HandlebarsApplicationMixin(
  ApplicationV2,
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
      template: "modules/eunos-kult-hacks/templates/apps/eunos-carousel/carousel.hbs",
    }
  };

  /**
   * Event handlers for the application
   */
  static readonly ACTIONS: Record<string, ApplicationV2.ClickAction> = {
    prevStoneClick(event: PointerEvent, target: HTMLElement) {
      EunosCarousel.instance.rotateToIndex(EunosCarousel.instance.currentIndex - 1);
    },
    nextStoneClick(event: PointerEvent, target: HTMLElement) {
      EunosCarousel.instance.rotateToIndex(EunosCarousel.instance.currentIndex + 1);
    }
  }

  // #region STATIC CONFIGURATION ~
  /**
   * Default configuration options for the application
   */
  static override DEFAULT_OPTIONS = {
    id: "EUNOS_CAROUSEL",
    classes: ["eunos-carousel"],
    position: {
      width: "auto" as const,
      height: "auto" as const,
    },
    window: {
      frame: false,
      positioned: false,
      contentTag: "div",
      contentClasses: ["eunos-carousel-content"],
    },
    actions: Object.fromEntries(
      Object.entries(EunosCarousel.ACTIONS).map(([key, action]) => [
        key,
        action.bind(EunosCarousel),
      ]),
    ),
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
  /**
 * Initialize the carousel by positioning items in 3D space
 * @returns {Promise<void>}
 */
async initializeCarousel(): Promise<void> {
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
    const sidebarWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 300;
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
      const rotationY = index * angleStep + gsap.utils.random(-3, 3);

      gsap.set(item, {
        rotationX: gsap.utils.random(0, 10),
        transformStyle: "preserve-3d",
        transformOrigin: "bottom center"
      });

      // Apply transforms to position and rotate the item
      gsap.set(item, {
        x: x,
        z: z,
        rotationY: rotationY,
      });

      // Special logic for the memorial table at index 0
      const scrollMemorialTable = async (item: HTMLElement) => {

        const outerWrapper = $(item).find(".lost-rangers-wrapper")[0];
        const tableWrappers = $(item).find(".lost-rangers-table-wrapper");

        if (!outerWrapper || tableWrappers.length < 2) {
          kLog.error("Failed to find .lost-rangers-wrapper or table wrappers");
          return;
        }

        /**
         * .lost-rangers-wrapper stays fixed, overflow hidden: it's the 'window' through which we see the scrolling table
         * .lost-rangers-table-wrapper is the wrapper with background, that contains one table
         *    - we want to move this wrapper up until it is out of view, then move it to beneath the second wrapper
         * So, the looping animation for the FIRST wrapper is:
         *    - start at y: 0
         *    - scroll up to y: -1 * element's height
         *    - move immediately to y: element's height
         * Since the table will spend exactly half the time in view, we can instead write the animation as:
         *    - start at y = element's height
         *    - scroll up to y = -1 * element's height
         *    - repeat
         *    - BUT start the animation initially at 50% of the way through.
         * This same animation can apply to the second table, except we don't start it at 50% of the way through.
         */

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

        // const scrollTable = (wrapper: HTMLElement, delay = 0) => {
        //   // Get the wrapper's height


        //   kLog.log(`wrapperHeight: ${wrapperHeight}`);

        //   // Return a timeline that scrolls from y: -1 * wrapperHeight to y: wrapperHeight
        //   // and repeats indefinitely
        //   return gsap.timeline().fromTo(wrapper, {
        //     y: `+=${wrapperHeight}`
        //   }, {
        //     y: `-=${2 * wrapperHeight}`,
        //     duration: EunosCarousel.MEMORIAL_TABLE_SCROLL_DURATION,
        //     ease: "none",
        //     delay: delay,
        //     onRepeat: () => {
        //       kLog.log("Memorial table animation repeating");
        //     }
        //   });
        // }

        // Generate both timelines after a short delay to let the wrapper heights be calculated
        await sleep(0.5);

        const wrapperHeight = $(wrapper1).outerHeight() ?? 0;

        this.rangerScrollAnimation = gsap.timeline({repeat: -1})
          .fromTo(wrapper1, {
            y: 0
          }, {
            y: -1 * wrapperHeight,
            ease: "none",
            duration: EunosCarousel.MEMORIAL_TABLE_SCROLL_DURATION / 2,
          })
          .set(wrapper1, {y: wrapperHeight})
          .to(wrapper1, {
            y: 0,
            ease: "none",
            duration: EunosCarousel.MEMORIAL_TABLE_SCROLL_DURATION / 2,
          })
          .fromTo(wrapper2, {
            y: wrapperHeight,
          }, {
            y: -1 * wrapperHeight,
            ease: "none",
            duration: EunosCarousel.MEMORIAL_TABLE_SCROLL_DURATION,
          }, 0)
          .set(wrapper2, {y: wrapperHeight});


        // const wrapperTl1 = scrollTable(wrapper1);
        // const wrapperTl2 = scrollTable(wrapper2, EunosCarousel.MEMORIAL_TABLE_SCROLL_DURATION / 2);

        kLog.log(`Wrapper Timelines`, {wrapperTl1: this.rangerScrollAnimation});

        // // Construct a master timeline containing both animations
        // this.rangerScrollAnimation = gsap.timeline({
        //   repeat: -1,
        //   onRepeat: () => {
        //     kLog.log("Memorial table animation repeating");
        //   }
        // });

        // // // Animate the first wrapper
        // this.rangerScrollAnimation.add(wrapperTl1, 0);

        // // Animate the second wrapper
        // this.rangerScrollAnimation.add(wrapperTl2, 0);


      }

      if (index === 0) {
        void scrollMemorialTable(item);
      }
    });

    // Set initial rotation of the carousel
    gsap.set(carousel$, { rotationY: 0 });

    // Animate entry of carousel
      const standingStones$ = $("#EUNOS_CAROUSEL .standing-stone");
      const carouselVerticals$ = $("#EUNOS_CAROUSEL .standing-stone-face");
      const carouselContent$ = $("#EUNOS_CAROUSEL .standing-stone-content");
      gsap.timeline({})
        .from([carouselBase$, standingStones$], {autoAlpha: 0, duration: 0.5})
        // .from([carouselVerticals$, carouselContent$], {filter: "brightness(0.5)", ease: "power2.in", duration: 10})
        // .from(carouselContent$, {autoAlpha: 0, duration: 0.5}, ">-0.5")
        .fromTo(standingStones$, {y: 700}, {y: 0, ease: "none", duration: 10, stagger: 0.5}, 0)
        // .from(carouselContent$, {filter: "blur(5px)", duration: 2, stagger: 0.5})
        .fromTo(carouselVerticals$, {y: 15}, {y: 0, ease: "rough({ strength: 0.002, points: 1000, template: none, taper: none, randomize: true, clamp: true })", duration: 10, stagger: 0.1}, 0)
        // .from(carouselVerticals$, {transformOrigin: "bottom center", scaleY: 0, duration: 5})
        // .from(carouselTop$, {autoAlpha: 0, duration: 1.5})
  } catch (error) {
    // Properly type the error
    const err = error instanceof Error ? error : new Error(String(error));
    kLog.error("Failed to initialize carousel:", err);
  }
}

  /**
   * Rotate the carousel to a specific index
   * @param {number} index - The target index to rotate to
   * @returns {number} The wrapped index that was actually rotated to
   */
  rotateToIndex(index: number): number {
    try {
      // Wrap the index to stay within bounds
      const wrappedIndex = ((index % this.numItems) + this.numItems) % this.numItems;

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
      const currentRotation = gsap.getProperty(carouselElement, "rotationY") as number || 0;
      let targetRotation = currentRotation + rotationDelta;

      // Use GSAP's snap utility to ensure we land exactly on a stone position
      // Snap to the nearest multiple of anglePerItem
      targetRotation = gsap.utils.snap(anglePerItem, targetRotation);

      kLog.log(`Rotating carousel from ${this.currentIndex} (${currentRotation}deg) to ${wrappedIndex} (${targetRotation}deg)`);

      // Update the current index AFTER calculating the rotation
      this.currentIndex = wrappedIndex;

      // Create and store the timeline
      const tl = gsap.timeline();
      tl.to(carousel$, {
        rotationY: targetRotation,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          // Dispatch event when rotation completes
          this.element.dispatchEvent(new CustomEvent('stoneSelected', {
            detail: { index: wrappedIndex }
          }));
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
