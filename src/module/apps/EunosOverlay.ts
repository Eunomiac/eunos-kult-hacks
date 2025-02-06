import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import { countdownUntil } from "../scripts/utilities";
import { LOADING_SCREEN_DATA } from "../scripts/constants";
import type { EmptyObject } from "fvtt-types/utils";
import { GamePhase } from "../scripts/enums";
import { type GSAPEffect, OverlayItemSide } from "../scripts/animations";
import * as EunosSocket from "../scripts/sockets";

// #region Type Definitions
interface AudioResource {
  stop: () => Promise<void>;
}

enum EunosOverlayState {
  BlockCanvas = "BlockCanvas",
  BlockAll = "InTransition",
  GameActive = "GameActive",
}

/** Represents a cached loading screen item with its DOM element and loading state
 */
interface LoadingScreenCache {
  /** The DOM element containing the rendered template */
  element: HTMLElement;
  /** Whether all images in this item have finished loading */
  loaded: boolean;
  /** Promise that resolves when all images are loaded, null when complete */
  loading: Promise<void> | null;
}

/** Options for phase change operations
 */
interface PhaseChangeOptions {
  /** Optional data needed for the new phase (e.g. chapter info for SessionStarting) */
  data?: Record<string, unknown>;
  /** Whether to skip cleanup of previous phase */
  skipCleanup?: boolean;
  /** Whether to skip initialization of new phase */
  skipInit?: boolean;
}

/** Tracks active resources for cleanup
 */
interface ResourceTracker {
  /** Active GSAP timelines */
  timelines: Set<gsap.core.Timeline>;
  /** Active video elements */
  videos: Set<HTMLVideoElement>;
  /** Active audio elements/playlists */
  audio: Set<AudioResource>;
  /** Loading screen cache */
  loadingScreenCache: Map<string, LoadingScreenCache>;
  /** Preloaded assets */
  preloadedAssets: Set<string>;
}
// #endregion Type Definitions

export default class EunosOverlay extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  // #region SINGLETON PATTERN ~
  private static _instance: EunosOverlay | null = null;

  private constructor() {
    super();
  }

  public static get instance(): EunosOverlay {
    if (!EunosOverlay._instance) {
      EunosOverlay._instance = new EunosOverlay();
    }
    return EunosOverlay._instance;
  }
  // #endregion SINGLETON PATTERN

  // #region STATIC CONFIGURATION ~
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
  // #endregion STATIC CONFIGURATION

  // #region STATIC METHODS ~
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

  static CallFadeToBlack(this: EunosOverlay, ...args: unknown[]) {
    kultLogger("Fade to black called", args);
  }

  static CallStopScene(this: EunosOverlay, ...args: unknown[]) {
    kultLogger("Stop scene called", args);
  }

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
  // #endregion STATIC METHODS

  // #region INSTANCE PROPERTIES ~
  #overlayState: EunosOverlayState = EunosOverlayState.BlockCanvas;
  get overlayState() {
    return this.#overlayState;
  }
  set overlayState(state: EunosOverlayState) {
    this.#overlayState = state;
  }

  /** Cache of all loading screen items, keyed by their data key */
  private loadingScreenCache: Map<string, LoadingScreenCache> = new Map();
  /** Number of items to preload before starting the rotation */
  private preloadBatch = 5;
  /** Key of the next item to be displayed */
  private nextItemKey: string | null = null;
  /** Key of the current item to be displayed */
  private currentItemKey: string | null = null;
  /** Current deck of item keys to display */
  private itemDeck: string[] = [];
  /** Timer reference for the countdown display */
  private countdownTimer: number | null = null;
  /** Timer reference for the loading screen content rotation */
  private loadScreenTimer: number | null = null;
  /** Tracks which direction to animate the next item from */
  private animateFromRight = false;
  /** Audio element for ambient background sound */
  private ambientAudio: HTMLAudioElement | null = null;
  /** Tracks active resources for cleanup */
  private resourceTracker: ResourceTracker = {
    timelines: new Set(),
    videos: new Set(),
    audio: new Set(),
    loadingScreenCache: new Map(),
    preloadedAssets: new Set()
  };
  // #endregion INSTANCE PROPERTIES

  // #region DOM ELEMENT GETTERS ~
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
  // #endregion DOM ELEMENT GETTERS

  // #region RESOURCE MANAGEMENT ~
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

  private async backgroundPreload(entries: Array<[string, typeof LOADING_SCREEN_DATA[keyof typeof LOADING_SCREEN_DATA]]>): Promise<void> {
    for (const [key, data] of entries) {
      await this.preloadItem(key, data);
      // Small delay between loads to prevent network saturation
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

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

  private async prepareItem(key: string): Promise<void> {
    console.log(`== Preparing Item: ${key}`);

    // Ensure the next item is fully loaded before setting it as next
    const nextCache = this.loadingScreenCache.get(key);
    if (nextCache?.loading) {
      console.log("Waiting for next item to load");
      await nextCache.loading;
    }
  }

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

  private createPhaseTimeline(phase: GamePhase): gsap.core.Timeline {
    const timeline = gsap.timeline({
      onComplete: () => {
        this.resourceTracker.timelines.delete(timeline);
      }
    });
    this.resourceTracker.timelines.add(timeline);
    return timeline;
  }

  private trackResource<T extends keyof ResourceTracker>(
    type: T,
    resource: ResourceTracker[T] extends Set<infer U> ? U : never
  ): void {
    if (resource instanceof Set) {
      (this.resourceTracker[type] as Set<unknown>).add(resource);
    }
  }

  private async cleanupResources(type: keyof ResourceTracker): Promise<void> {
    const resources = this.resourceTracker[type];
    if (resources instanceof Set) {
      for (const resource of resources) {
        if (resource instanceof HTMLVideoElement) {
          resource.pause();
          resource.removeAttribute("src");
          resource.load(); // Triggers garbage collection
        } else if (
          typeof resource === "object" &&
          resource !== null &&
          "stop" in resource &&
          typeof (resource as AudioResource).stop === "function"
        ) {
          await (resource as AudioResource).stop();
        } else if (resource instanceof gsap.core.Timeline) {
          // GSAP timelines
          resource.kill(); // This automatically cleans up all child tweens
        }
      }
      resources.clear();
    } else if (resources instanceof Map) {
      resources.clear();
    }
  }
  // #endregion RESOURCE MANAGEMENT

  // #region PHASE MANAGEMENT ~
  async changePhase(newPhase: GamePhase, options: PhaseChangeOptions = {}): Promise<void> {
    const currentPhase = getSetting("gamePhase");
    if (!currentPhase) {
      throw new Error("Game phase setting not found");
    }

    // 1. Run cleanup for current phase if needed
    if (!options.skipCleanup) {
      await this.cleanupPhase(currentPhase);
    }

    // 2. Update phase in settings
    await getSettings().set("eunos-kult-hacks", "gamePhase", newPhase);

    // 3. Sync UI state across all clients
    try {
      await EunosSocket.call("syncOverlayState", "all", newPhase);
    } catch (error) {
      console.error("Failed to sync overlay state:", error);
      throw new Error("Socket functionality not properly initialized");
    }

    // 4. Initialize new phase if needed
    if (!options.skipInit) {
      await this.initializePhase(newPhase, options.data);
    }
  }

  private async cleanupPhaseResources(phase: GamePhase): Promise<void> {
    switch (phase) {
      case GamePhase.SessionClosed:
        // Clean up loading screen animations and ambient audio
        await this.cleanupResources("timelines");
        await this.cleanupResources("audio");
        await this.cleanupResources("loadingScreenCache");
        break;
      case GamePhase.SessionStarting:
        // Clean up video elements and related animations
        await this.cleanupResources("videos");
        await this.cleanupResources("timelines");
        break;
      case GamePhase.SessionRunning:
        // Clean up any remaining video/audio from intro
        await this.cleanupResources("videos");
        await this.cleanupResources("audio");
        break;
      case GamePhase.SessionEnding:
        // Clean up stage animations
        await this.cleanupResources("timelines");
        break;
    }
  }

  private async cleanupPhase(phase: GamePhase): Promise<void> {
    await this.cleanupPhaseResources(phase);
    switch (phase) {
      case GamePhase.SessionClosed:
        await this.cleanup_SessionClosed();
        break;
      case GamePhase.SessionStarting:
        await this.cleanup_SessionStarting();
        break;
      case GamePhase.SessionRunning:
        await this.cleanup_SessionRunning();
        break;
      case GamePhase.SessionEnding:
        await this.cleanup_SessionEnding();
        break;
    }
  }

  private async initializePhase(phase: GamePhase, data?: Record<string, unknown>): Promise<void> {
    switch (phase) {
      case GamePhase.SessionClosed:
        await this.initialize_SessionClosed();
        break;
      case GamePhase.SessionStarting:
        await this.initialize_SessionStarting(data);
        break;
      case GamePhase.SessionRunning:
        await this.initialize_SessionRunning();
        break;
      case GamePhase.SessionEnding:
        await this.initialize_SessionEnding();
        break;
    }
  }
  // #endregion PHASE MANAGEMENT

  // #region LOADING SCREEN ~
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
  // #endregion LOADING SCREEN

  // #region APPLICATION OVERRIDES ~
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
  // #endregion APPLICATION OVERRIDES

  // #region PHASE LIFECYCLE METHODS ~
  // #region Cleanup Methods
  private async cleanup_SessionClosed(): Promise<void> {
    kLog.log("Would cleanup SessionClosed phase", "Stopping countdown timer and ambient audio");
  }

  private async cleanup_SessionStarting(): Promise<void> {
    kLog.log("Would cleanup SessionStarting phase", "Cleaning up intro video and chapter title animations");
  }

  private async cleanup_SessionRunning(): Promise<void> {
    kLog.log("Would cleanup SessionRunning phase", "Cleaning up stage elements and UI components");
  }

  private async cleanup_SessionEnding(): Promise<void> {
    kLog.log("Would cleanup SessionEnding phase", "Cleaning up dramatic hook UI and session summary");
  }
  // #endregion Cleanup Methods

  // #region Initialization Methods
  private async initialize_SessionClosed(): Promise<void> {
    kLog.log("Would initialize SessionClosed phase", "Starting countdown timer and ambient audio");
  }

  private async initialize_SessionStarting(data?: Record<string, unknown>): Promise<void> {
    kLog.log("Would initialize SessionStarting phase", "Starting intro video and chapter animations", data);
  }

  private async initialize_SessionRunning(): Promise<void> {
    kLog.log("Would initialize SessionRunning phase", "Setting up stage and UI components");
  }

  private async initialize_SessionEnding(): Promise<void> {
    kLog.log("Would initialize SessionEnding phase", "Setting up dramatic hook UI and session summary");
  }
  // #endregion Initialization Methods
  // #endregion PHASE LIFECYCLE METHODS
}
