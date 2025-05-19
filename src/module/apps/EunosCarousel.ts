import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import type { EmptyObject } from "fvtt-types/utils";

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
  /** Width of each carousel item in pixels */
  private itemWidth: number = 300;

  /** Height of each carousel item in pixels */
  private itemHeight: number = 500;

  /** Fixed radius of the carousel (80vw converted to pixels) */
  private carouselRadius: number = 0; // Will be calculated on initialization

  /** Current index position of the carousel (0-based) */
  private currentIndex: number = 0;

  /** Items to display in the carousel */
  private items: Array<{
    description?: string;
  }> = [];

  /** Number of items in the carousel */
  private numItems: number = 0;

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

  // #endregion

  // #region ACCESSORS ~
  /**
   * Get a jQuery wrapper for the element
   * @returns {JQuery} jQuery object wrapping the element
   * @throws {Error} If element is not initialized
   */
  get element$(): JQuery {
    if (!this.element) {
      throw new Error("Carousel element is not initialized");
    }
    return $(this.element);
  }
  // #endregion

  // #region DATA METHODS ~
  /**
   * Set the items to display in the carousel
   * @param {Array} items - Array of items to display
   * @returns {EunosCarousel} The carousel instance for chaining
   */
  setItems(items: Array<{
    description?: string;
  }>): this {
    this.items = items;
    this.numItems = items.length;
    return this;
  }

  /**
   * Prepare context data for the template
   * @param {ApplicationV2.RenderOptions} options - Render options
   * @returns {Promise<object>} The context data
   * @override
   */
  override async _prepareContext(options: ApplicationV2.RenderOptions): Promise<EmptyObject> {
    const context = await super._prepareContext(options);

    // Add items to the context
    Object.assign(context, {
      items: this.items
    });

    return context;
  }
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

  const items$ = carousel$.find(".stone-carousel-item");
  if (!items$.length) {
    kLog.error("No .stone-carousel-item elements found");
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
      const rotationY = index * angleStep + gsap.utils.random(-10, 10);

      gsap.set(item, {
        rotationX: gsap.utils.random(-5, 5),
        transformStyle: "preserve-3d",
        transformOrigin: "bottom center"
      });

      // Apply transforms to position and rotate the item
      gsap.set(item, {
        x: x,
        z: z,
        rotationY: rotationY,
      });
    });

    // Set initial rotation of the carousel
    gsap.set(carousel$, { rotationY: 0 });
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
