import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import { countdownUntil } from "../scripts/utilities";
import { LOADING_SCREEN_DATA } from "../scripts/constants";
import type { EmptyObject } from "fvtt-types/utils";
import { GamePhase } from "../scripts/enums";
import { type GSAPEffect, OverlayItemSide } from "../scripts/animations";

enum EunosOverlayState {
  BlockCanvas = "BlockCanvas",
  BlockAll = "InTransition",
  GameActive = "GameActive",
}

/**
 * Represents a cached loading screen item with its DOM element and loading state
 */
interface LoadingScreenCache {
  /** The DOM element containing the rendered template */
  element: HTMLElement;
  /** Whether all images in this item have finished loading */
  loaded: boolean;
  /** Promise that resolves when all images are loaded, null when complete */
  loading: Promise<void> | null;
}

export default class EunosOverlay extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  // #region SINGLE INSTANCE FACTORY ~
  /**
   * Private static field to store the singleton instance
   */
  private static _instance: EunosOverlay | null = null;

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    super();
  }

  /**
   * Static getter to access the singleton instance
   * Creates instance if it doesn't exist
   * @returns EunosOverlay The singleton instance
   */
  public static get instance(): EunosOverlay {
    if (!EunosOverlay._instance) {
      EunosOverlay._instance = new EunosOverlay();
    }
    return EunosOverlay._instance;
  }
  // #endregion

  // #region CONFIGURATION ~
  static override DEFAULT_OPTIONS = {
    id: "EUNOS_OVERLAY",
    classes: ["eunos-overlay"],
    position: {
      top: 0,
      left: 0,
      width: "auto" as const,
      height: "auto" as const,
      zIndex: 10000,
    },
    window: {
      frame: false,
      positioned: false,
      icon: false as const,
      controls: [],
      minimizable: false,
      resizable: false,
      contentTag: "div",
      contentClasses: ["eunos-overlay-content"],
    },
    actions: {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      fade_to_black: EunosOverlay.CallFadeToBlack,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      stop_scene: EunosOverlay.CallStopScene,
    },
  };

  static override PARTS = {
    midZIndexMask: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/mid-zindex-mask.hbs",
    },
    topZIndexMask: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/top-zindex-mask.hbs",
    },
    sessionZoom: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/session-zoom.hbs",
    },
    safetyButtons: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/safety-buttons.hbs",
    },
    alerts: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/alerts.hbs",
    },
    tooltips: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/tooltips.hbs",
    },
  };
  // #endregion

  // #region INITIALIZATION ~
  static async Initialize() {
    await this.instance.render({ force: true });
    addClassToDOM("interface-ready");

    // Register hook listener for chapter title reveal into intro zoom
    Hooks.on("revealChapterTitle", (chapter: string, title: string) => {
      EunosOverlay.animateSessionTitle(chapter, title).then(() => {
        void EunosOverlay.animateSessionZoom();
      }).catch((err: unknown) => {
        kultLogger("Error animating session title", err);
      });
    });
  }

  static SyncOverlayState() {
    const gamePhase = getSetting("gamePhase");
    removeClassFromDOM([
      "session-closed",
      "session-starting",
      "session-running",
      "session-ending",
    ]);

    switch (gamePhase) {
      case GamePhase.SessionClosed: {
        addClassToDOM("session-closed");
        break;
      }
      case GamePhase.SessionStarting: {
        addClassToDOM("session-starting");
        break;
      }
      case GamePhase.SessionRunning: {
        addClassToDOM("session-running");
        break;
      }
      case GamePhase.SessionEnding: {
        addClassToDOM("session-ending");
        break;
      }
    }
  }
  // #endregion

  // #region FEATURE: SAFETY BUTTONS ~
  static CallFadeToBlack(this: EunosOverlay, ...args: unknown[]) {
    kultLogger("Fade to black called", args);
  }

  static CallStopScene(this: EunosOverlay, ...args: unknown[]) {
    kultLogger("Stop scene called", args);
  }
  // #endregion

  #overlayState: EunosOverlayState = EunosOverlayState.BlockCanvas;
  get overlayState() {
    return this.#overlayState;
  }
  set overlayState(state: EunosOverlayState) {
    this.#overlayState = state;
  }

  // #region Element Getters ~
  #midZIndexMask: Maybe<HTMLElement>;
  #sidebarMask: Maybe<HTMLElement>;
  #sidebarBars: Maybe<HTMLElement>;
  #canvasMask: Maybe<HTMLElement>;
  #canvasBars: Maybe<HTMLElement>;
  #topZIndexMask: Maybe<HTMLElement>;
  #safetyButtons: Maybe<HTMLElement>;
  #alerts: Maybe<HTMLElement>;
  #tooltips: Maybe<HTMLElement>;

  get midZIndexMask$() {
    if (!this.#midZIndexMask) {
      this.#midZIndexMask = this.element.querySelector(
        ".mid-zindex-mask",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#midZIndexMask) {
      throw new Error("Full screen mask not found");
    }
    return $(this.#midZIndexMask);
  }

  get sidebarMask$() {
    if (!this.#sidebarMask) {
      this.#sidebarMask = this.element.querySelector(
        ".sidebar-mask",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#sidebarMask) {
      throw new Error("Sidebar mask not found");
    }
    return $(this.#sidebarMask);
  }

  get sidebarBars$() {
    if (!this.#sidebarBars) {
      this.#sidebarBars = this.element.querySelector(
        ".sidebar-mask-bars",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#sidebarBars) {
      throw new Error("Sidebar bars not found");
    }
    return $(this.#sidebarBars);
  }

  get canvasMask$() {
    if (!this.#canvasMask) {
      this.#canvasMask = this.element.querySelector(
        ".canvas-mask",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#canvasMask) {
      throw new Error("Canvas mask not found");
    }
    return $(this.#canvasMask);
  }

  get canvasBars$() {
    if (!this.#canvasBars) {
      this.#canvasBars = this.element.querySelector(
        ".canvas-mask-bars",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#canvasBars) {
      throw new Error("Canvas bars not found");
    }
    return $(this.#canvasBars);
  }

  get topZIndexMask$() {
    if (!this.#topZIndexMask) {
      this.#topZIndexMask = this.element.querySelector(
        ".top-zindex-mask",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#topZIndexMask) {
      throw new Error("Transition to top not found");
    }
    return $(this.#topZIndexMask);
  }

  get safetyButtons$() {
    if (!this.#safetyButtons) {
      this.#safetyButtons = this.element.querySelector(
        ".safety-buttons",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#safetyButtons) {
      throw new Error("Safety buttons not found");
    }
    return $(this.#safetyButtons);
  }

  get alerts$() {
    if (!this.#alerts) {
      this.#alerts = this.element.querySelector(
        ".alerts",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#alerts) {
      throw new Error("Alerts not found");
    }
    return $(this.#alerts);
  }

  get tooltips$() {
    if (!this.#tooltips) {
      this.#tooltips = this.element.querySelector(
        ".tooltips",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#tooltips) {
      throw new Error("Tooltips not found");
    }
    return $(this.#tooltips);
  }
  // #endregion

  steps: Record<GamePhase, Array<() => Promise<void>>> = {
    [GamePhase.SessionStarting]: [
      /* PLAY INTRO VIDEO */
      // - have gsap time player introductions and chapter name to video playing
      // - load assets for session beneath playing video
      /* SWOOP INTO GAME CANVAS */
      // - with sidebar and all app windows temporarily hidden for non-GM characters
      // - swoop along map of widow's wending
    ],
    [GamePhase.SessionRunning]: [

    ],
    [GamePhase.SessionEnding]: [

    ],
    [GamePhase.SessionClosed]: [


      // When timer reaches the duration of the song selected by GM in settings, fade out timer, begin song.
      // Start monitoring player connection status and trigger preloading of assets for introduction when they do.
    ]
  }

  /** Cache of all loading screen items, keyed by their data key */
  private loadingScreenCache: Map<string, LoadingScreenCache> = new Map();

  /** Number of items to preload before starting the rotation */
  private preloadBatch = 5;

  /** Key of the next item to be displayed, used to ensure smooth transitions */
  private nextItemKey: string | null = null;

  /** Key of the current item to be displayed, used to ensure smooth transitions */
  private currentItemKey: string | null = null;

  /** Current deck of item keys to display, shuffled and consumed in order */
  private itemDeck: string[] = [];

  /** Timer reference for the countdown display */
  private countdownTimer: number | null = null;

  /** Timer reference for the loading screen content rotation */
  private loadScreenTimer: number | null = null;

  /** Tracks which direction to animate the next item from */
  private animateFromRight = false;

  /** Audio element for ambient background sound */
  private ambientAudio: HTMLAudioElement | null = null;

  /**
   * Preloads a loading screen item by rendering its template and waiting for images
   * @param key - Key identifying this item in LOADING_SCREEN_DATA
   * @param data - Data to render the template with
   */
  private async preloadItem(
    key: string,
    data: typeof LOADING_SCREEN_DATA[keyof typeof LOADING_SCREEN_DATA]
  ): Promise<void> {
    // Skip if already cached
    if (this.loadingScreenCache.has(key)) {
      const cache = this.loadingScreenCache.get(key);
      if (cache?.loading) await cache.loading;
      return;
    }

    // Render template
    const html = await renderTemplate(
      "modules/eunos-kult-hacks/templates/apps/eunos-overlay/partials/loading-screen-item.hbs",
      data
    );
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const element = wrapper.firstElementChild as HTMLElement;
    element.setAttribute("data-key", key);

    // Create cache entry and track image loading
    const cache: LoadingScreenCache = {
      element,
      loaded: false,
      loading: new Promise<void>((resolve) => {
        const images = Array.from(element.getElementsByTagName("img"));
        if (images.length === 0) {
          cache.loaded = true;
          cache.loading = null;
          resolve();
          return;
        }

        let loadedCount = 0;
        images.forEach(img => {
          if (img.complete) {
            loadedCount++;
            if (loadedCount === images.length) {
              cache.loaded = true;
              cache.loading = null;
              resolve();
            }
          } else {
            img.onload = () => {
              loadedCount++;
              if (loadedCount === images.length) {
                cache.loaded = true;
                cache.loading = null;
                resolve();
              }
            };
          }
        });
      })
    };

    // Add to cache and DOM
    this.loadingScreenCache.set(key, cache);
    this.midZIndexMask$.append(element);
    await cache.loading;
  }

  /**
   * Initializes and plays the ambient background audio
   * @returns Promise that resolves when audio is ready to play
   */
  private async initializeAmbientAudio(): Promise<void> {
    // Cleanup any existing audio
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio = null;
    }

    // Create and configure new audio element
    this.ambientAudio = new Audio("modules/eunos-kult-hacks/assets/sounds/session-closed-ambiance.flac");
    this.ambientAudio.loop = true;
    this.ambientAudio.volume = 0.5; // Adjust volume as needed

    try {
      await this.ambientAudio.play();
    } catch (error) {
      console.error("Failed to play ambient audio:", error);
    }
  }

  /**
   * Initializes the loading screen display
   * Sets up the countdown timer and loading screen item rotation
   * Preloads initial batch of items before starting rotation
   */
  private async initializeLoadingScreen(): Promise<void> {
    // Clear any existing timers
    if (this.countdownTimer) window.clearInterval(this.countdownTimer);
    if (this.loadScreenTimer) window.clearInterval(this.loadScreenTimer);

    // Initialize ambient audio
    await this.initializeAmbientAudio();

    // Initialize countdown display
    const countdownElement = document.createElement("div");
    countdownElement.className = "loading-screen-countdown";
    this.canvasBars$.append(countdownElement);

    // Update countdown every second
    const updateCountdown = () => {
      const timeLeft = countdownUntil(5, 19, 30); // Friday (5) at 7:30 PM
      countdownElement.textContent = [
        String(timeLeft.days).padStart(2, "0"),
        String(timeLeft.hours).padStart(2, "0"),
        String(timeLeft.minutes).padStart(2, "0"),
        String(timeLeft.seconds).padStart(2, "0")
      ].join(":");
    };

    updateCountdown(); // Initial update
    this.countdownTimer = window.setInterval(updateCountdown, 1000);

    // Preload initial batch
    const entries = Object.entries(LOADING_SCREEN_DATA);
    const shuffled = entries.sort(() => Math.random() - 0.5);

    await Promise.all(shuffled.slice(0, this.preloadBatch).map(
      ([key, data]) => this.preloadItem(key, data)
    ));

    // Start background loading of remaining items
    void this.backgroundPreload(shuffled.slice(this.preloadBatch));

    let isFirstItem = true;

    const rotateContent = async () => {
      console.log(`===============\nStarting rotation cycle`);

      const loadedItemCount = Array.from(this.loadingScreenCache.entries())
        .filter(([, cache]) => cache.loaded)
        .length;
      console.log(`Loaded items: ${loadedItemCount}`);

      if (loadedItemCount === 0) {
        console.log("No items loaded, skipping rotation");
        return;
      }

      if (isFirstItem) {
        this.nextItemKey = this.getNextFromDeck();
        await this.prepareItem(this.nextItemKey);
        isFirstItem = false;
      }
      this.currentItemKey = this.nextItemKey;
      console.log(`Current Key: ${this.currentItemKey}`);
      this.nextItemKey = this.getNextFromDeck();
      console.log(`Next Key: ${this.nextItemKey}`);

      // Prepare next item as early as possible
      console.log(`Preparing next item: ${this.nextItemKey}`);
      void this.prepareItem(this.nextItemKey);

      // Perform transition animation
      if (!this.currentItemKey) {
        throw new Error("Current item key is null");
      }
      console.log(`Rendering item: ${this.currentItemKey}`);
      console.log("Waiting for animation to complete...");
      await this.renderLoadScreenItem(this.currentItemKey);
      console.log("... completed!");

      // Toggle animation direction for next time
      this.animateFromRight = !this.animateFromRight;
      console.log(`Animation direction for next item ("${this.nextItemKey}"): ${this.animateFromRight ? 'right' : 'left'}`);

      // Schedule next rotation
      console.log("Scheduling next rotation");
      setTimeout(() => void rotateContent(), 10000);
    };

    // Start the rotation
    void rotateContent();
  }

  /**
   * Preloads remaining items in the background
   * Adds delay between loads to prevent network saturation
   * @param entries - Array of remaining items to load
   */
  private async backgroundPreload(entries: Array<[string, typeof LOADING_SCREEN_DATA[keyof typeof LOADING_SCREEN_DATA]]>): Promise<void> {
    for (const [key, data] of entries) {
      await this.preloadItem(key, data);
      // Small delay between loads to prevent network saturation
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Gets the next item key from the deck, reshuffling if necessary
   * Ensures no repeats between deck reshuffles
   * @returns Key of the next item to display
   */
  private getNextFromDeck(): string {
    console.log(`Current deck size: ${this.itemDeck.length}`);

    // Check if we need to reshuffle
    if (this.itemDeck.length === 0) {
      console.log("Deck empty, reshuffling");
      this.shuffleDeck();

      // If the first card matches the last shown card, move it to the end
      if (this.currentItemKey === this.itemDeck[0]) {
        console.log("First card matches last shown, rotating deck");
        const firstCard = this.itemDeck.shift();
        if (firstCard) {
          this.itemDeck.push(firstCard);
        }
      }
    }

    const nextKey = this.itemDeck.shift()!;
    console.log(`Drew key from deck: ${nextKey}`);
    console.log(`Current deck size: ${this.itemDeck.length}`);
    return nextKey;
  }

  /**
   * Preloads and prepares the next item to be displayed
   * @param key - Key of the current item
   */
  private async prepareItem(key: string): Promise<void> {
    console.log(`== Preparing Item: ${key}`);

    // Ensure the next item is fully loaded before setting it as next
    const nextCache = this.loadingScreenCache.get(key);
    if (nextCache?.loading) {
      console.log("Waiting for next item to load");
      await nextCache.loading;
    }
  }

  /**
   * Performs transition animation for a loading screen item
   * @param nextKey - Key of item to display
   */
  private async renderLoadScreenItem(nextKey: string): Promise<void> {
    console.log(`Starting render of item: ${nextKey}`);

    const nextItem = this.loadingScreenCache.get(nextKey)?.element;
    if (!nextItem) {
      console.error(`Item not found: ${nextKey}`);
      throw new Error("Item not found");
    }

    const effect = gsap.effects["displayOverlayItem"] as Maybe<GSAPEffect>;
    if (!effect) {
      console.error("Effect displayOverlayItem not found");
      throw new Error("Effect displayOverlayItem not found");
    }

    console.log(`Animating from ${this.animateFromRight ? 'right' : 'left'}`);
    const tl = effect(nextItem, {
      side: this.animateFromRight ? OverlayItemSide.Right : OverlayItemSide.Left
    });

    await tl;
    console.log(`Finished rendering item: ${nextKey}`);
  }

  /**
   * Cleanup method to stop audio and clear timers
   */
  private cleanup(): void {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio = null;
    }

    if (this.countdownTimer) {
      window.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    if (this.loadScreenTimer) {
      window.clearInterval(this.loadScreenTimer);
      this.loadScreenTimer = null;
    }
  }

  // Add cleanup to phase change methods
  async changePhase_StartSession(
    chapterNum?: string,
    chapterTitle?: string,
  ): Promise<void> {
    this.cleanup();
    // Only proceed if user is GM
    if (!game.user?.isGM) return;

    // Show dialog to get input unless provided
    if (!chapterNum || !chapterTitle) {
      const dialogResult = await Dialog.prompt({
        title: "Session Title",
        content: `
          <div class="form-group">
            <label>Chapter:</label>
            <input class='chapter-number' type="text" name="chapter" placeholder="One, Two, Twenty-Three...">
          </div>
          <div class="form-group">
            <label>Title:</label>
            <input class='chapter-title' type="text" name="title">
          </div>
        `,
        callback: (html: JQuery) => {
          const chapter = html.find(".chapter-number").val() as string;
          const title = html.find(".chapter-title").val() as string;
          return { chapter, title };
        },
      });
      chapterNum = dialogResult.chapter;
      chapterTitle = dialogResult.title;
    }

    // Trigger hook for all clients
    Hooks.callAll("revealChapterTitle", chapterNum, chapterTitle);
  }

  changePhase_EndSession(): void {
    this.cleanup();
    // Fully block screen, show dramatic hook and session scribe prompts
  }

  async changePhase_CloseSession(): Promise<void> {
    // Return to canvas/sidebar blocking and "loading screen" tips
  }

  // Move animation logic to static method so it can be called from Hook
  static async animateSessionTitle(
    chapter: string,
    title: string,
  ): Promise<void> {
    const instance = EunosOverlay.instance;
    $("body").removeClass("session-closed");
    $("body").addClass("session-starting");
    const chapterElem$ = instance.topZIndexMask$.find(".chapter-number");
    const horizRule$ = instance.topZIndexMask$.find(".horiz-rule");
    const titleElem$ = instance.topZIndexMask$.find(".chapter-title");

    chapterElem$.text(`Chapter ${chapter}`);
    titleElem$.text(title);

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: resolve,
      });

      tl.fromTo(
        chapterElem$,
        {
          scale: 0.9,
          autoAlpha: 0,
          // y: "-=20"
        },
        {
          scale: 1,
          autoAlpha: 1,
          // y: 0,
          duration: 5,
          ease: "none",
        },
      )
        .fromTo(
          horizRule$,
          {
            scaleX: 0,
            autoAlpha: 0,
          },
          {
            scaleX: 1,
            autoAlpha: 1,
            duration: 1,
            ease: "none",
          },
          0.2,
        )
        .fromTo(
          titleElem$,
          {
            scale: 0.9,
            autoAlpha: 0,
            // y: "+=20"
          },
          {
            scale: 1,
            autoAlpha: 1,
            // y: 0,
            duration: 5,
            ease: "none",
          },
          0.4,
        );
    });
  }

  // Animate zoom and traversal of map of Emma's Rise
  static async animateSessionZoom(): Promise<void> {
    await gsap.timeline()
      .to([
        ".top-zindex-mask",
        ".mid-zindex-mask"
      ], {
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
      }, 0)
      .fromTo("#reading-section", {
        rotationZ: 65,
        rotationY: -45,
      }, {
        rotationZ: 0,
        rotationY: 0,
        duration: 7,
        ease: "back"
      }, 0)
      .fromTo("#reading-section", {
        scale: 1
      }, {
        scale: 2,
        duration: 16,
        ease: "back.out(2)"
      }, 0)
      .fromTo("#reading-section", {
        perspective: 800
      }, {
        perspective: 300,
        duration: 46,
        ease: "back.out(2)"
      }, 0)
      .to("#blackout-layer", {
        opacity: 0,
        duration: 0.5,
        rotationX: 45,
        ease: "sine",
        onComplete() { $("#blackout-layer").remove() }
      }, 0)
      .to(".canvas-layer", {
        rotationX: 45,
        duration: 10,
        ease: "elastic.out(1, 0.75)" // "sine"
      }, 0);
  }

  // #region OVERRIDES ~
  override _prepareContext(context: ApplicationV2.RenderOptions) {
    return super._prepareContext(context);
  }

  override _onRender(
    context: EmptyObject,
    options: ApplicationV2.RenderOptions,
  ) {
    super._onRender(context, options);

    const elem$ = $(this.element);
    elem$.closest("body").addClass("interface-ready");

    // Initialize loading screen (and audio) when in SessionClosed phase
    if (getSetting("gamePhase") === GamePhase.SessionClosed) {
      void this.initializeLoadingScreen();
    } else {
      this.cleanup();
    }

    const fadeTimeline = gsap.timeline({ paused: true });
    fadeTimeline.to([this.sidebarMask$, this.sidebarBars$],{
      opacity: 0,
      duration: 2,
      ease: "power2.out",
    });

    // Handle cursor movement
    window.addEventListener("mousemove", (e) => {
      if (this.overlayState !== EunosOverlayState.BlockCanvas) {
        return;
      }
      const sidebarOffset = this.sidebarMask$.offset()?.left ?? 0;
      const isOverSidebar = e.clientX >= sidebarOffset;

      if (isOverSidebar) {
        fadeTimeline.play();
      } else {
        fadeTimeline.reverse();
      }
    });

    // Handle cursor leaving window
    document.addEventListener("mouseleave", () => {
      if (this.overlayState !== EunosOverlayState.BlockCanvas) {
        return;
      }
      fadeTimeline.reverse();
    });
  }
  // #endregion

  /**
   * Creates a new shuffled deck containing all currently loaded items
   * Uses Fisher-Yates shuffle algorithm for unbiased randomization
   * @returns The first key from the newly shuffled deck
   */
  private shuffleDeck(): string {
    // Get all keys of fully loaded items
    const loadedKeys = Array.from(this.loadingScreenCache.entries())
      .filter(([, cache]) => cache.loaded)
      .map(([key]) => key);

    // Create new deck and shuffle it
    this.itemDeck = [...loadedKeys];
    for (let i = this.itemDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      if (!this.itemDeck[i] || !this.itemDeck[j]) {
        throw new Error("Item deck is not properly initialized");
      }
      [this.itemDeck[i], this.itemDeck[j]] = [this.itemDeck[j], this.itemDeck[i]!];
    }
    if (!this.itemDeck[0]) {
      throw new Error("Item deck is not properly initialized");
    }
    return this.itemDeck[0];
  }
}
