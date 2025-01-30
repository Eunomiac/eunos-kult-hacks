import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import type { EmptyObject } from "fvtt-types/utils";
import { GamePhase } from "../scripts/enums";

enum EunosOverlayState {
  BlockCanvas = "BlockCanvas",
  BlockAll = "InTransition",
  GameActive = "GameActive",
}

interface test {

}
/**
 * Converts a PascalCase/camelCase string to kebab-case
 * @param str - The string to convert
 * @returns The kebab-case version of the string
 */
// function toKebabCase(str: string): string {
//   return str
//     .replace(/([a-z])([A-Z])/g, "$1-$2")
//     .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
//     .toLowerCase();
// }

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
    fullScreenMask: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/full-screen-mask.hbs",
    },
    transitionToTop: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/transition-to-top.hbs",
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

    await this.instance.render({force: true});
    addClassToDOM("interface-ready");

    // Register hook listener for chapter title reveal
    Hooks.on("revealChapterTitle", (chapter: string, title: string) => {
      void EunosOverlay.animateSessionTitle(chapter, title);
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

  static CallFadeToBlack(this: EunosOverlay, ...args: unknown[]) {
    kultLogger("Fade to black called", args);
  }

  static CallStopScene(this: EunosOverlay, ...args: unknown[]) {
    kultLogger("Stop scene called", args);
  }

  #overlayState: EunosOverlayState = EunosOverlayState.BlockCanvas;
  get overlayState() {
    return this.#overlayState;
  }
  set overlayState(state: EunosOverlayState) {
    this.#overlayState = state;
  }

  // #region Element Getters ~
  #fullScreenMask: Maybe<HTMLElement>;
  #sidebarMask: Maybe<HTMLElement>;
  #canvasMask: Maybe<HTMLElement>;
  #transitionToTop: Maybe<HTMLElement>;
  #safetyButtons: Maybe<HTMLElement>;
  #alerts: Maybe<HTMLElement>;
  #tooltips: Maybe<HTMLElement>;

  get fullScreenMask$() {
    if (!this.#fullScreenMask) {
      this.#fullScreenMask = this.element.querySelector(
        ".full-screen-mask",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#fullScreenMask) {
      throw new Error("Full screen mask not found");
    }
    return $(this.#fullScreenMask);
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

  get transitionToTop$() {
    if (!this.#transitionToTop) {
      this.#transitionToTop = this.element.querySelector(
        ".transition-to-top",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#transitionToTop) {
      throw new Error("Transition to top not found");
    }
    return $(this.#transitionToTop);
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

  async changePhase_StartSession(chapterNum?: string, chapterTitle?: string): Promise<void> {
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
          const chapter = html.find('.chapter-number').val() as string;
          const title = html.find('.chapter-title').val() as string;
          return { chapter, title };
        }
      });
      chapterNum = dialogResult.chapter;
      chapterTitle = dialogResult.title;
    }

    // Trigger hook for all clients
    Hooks.callAll("revealChapterTitle", chapterNum, chapterTitle);
  }

  async changePhase_EndSession(): Promise<void> {
    // Fully block screen, show dramatic hook and session scribe prompts
  }

  async changePhase_CloseSession(): Promise<void> {
    // Return to canvas/sidebar blocking and "loading screen" tips
  }

  // Move animation logic to static method so it can be called from Hook
  static async animateSessionTitle(chapter: string, title: string): Promise<void> {
    const instance = EunosOverlay.instance;
    const chapterElem$ = instance.fullScreenMask$.find(".chapter-number");
    const horizRule$ = instance.fullScreenMask$.find(".horiz-rule");
    const titleElem$ = instance.fullScreenMask$.find(".chapter-title");

    chapterElem$.text(`Chapter ${chapter}`);
    titleElem$.text(title);

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: resolve
      });

      tl.fromTo(chapterElem$, {
        scale: 0.9,
        autoAlpha: 0,
        // y: "-=20"
      }, {
        scale: 1,
        autoAlpha: 1,
        // y: 0,
        duration: 5,
        ease: "none"
      })
      .fromTo(horizRule$, {
        scaleX: 0,
        autoAlpha: 0,
      }, {
        scaleX: 1,
        autoAlpha: 1,
        duration: 1,
        ease: "none"
      }, 0.2)
      .fromTo(titleElem$, {
        scale: 0.9,
        autoAlpha: 0,
        // y: "+=20"
      }, {
        scale: 1,
        autoAlpha: 1,
        // y: 0,
        duration: 5,
        ease: "none"
      }, 0.4);

    });
  }

  // #region OVERRIDES ~
  override _prepareContext(context: ApplicationV2.RenderOptions) {
    return super._prepareContext(context);
  }

  override _onRender(
    context: EmptyObject,
    options: ApplicationV2.RenderOptions,
  ) {
    const elem$ = $(this.element);
    elem$.closest("body").addClass("interface-ready");

    const fadeTimeline = gsap.timeline({ paused: true, delay: 1 });
    fadeTimeline.to(this.sidebarMask$, {
      opacity: 0,
      duration: 2,
      ease: "power2.out",
    });

    // Handle cursor movement
    window.addEventListener("mousemove", (e) => {
      if (this.overlayState !== EunosOverlayState.BlockCanvas) { return; }
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
      if (this.overlayState !== EunosOverlayState.BlockCanvas) { return; }
      fadeTimeline.reverse();
    });

    super._onRender(context, options);
  }
  // #endregion
}
