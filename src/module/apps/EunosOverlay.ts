// #region -- IMPORTS ~
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import { countdownUntil, formatDateAsISO } from "../scripts/utilities";
import {
  LOADING_SCREEN_DATA,
  PRE_SESSION,
  MEDIA_PATHS,
  LOCATIONS,
} from "../scripts/constants";
import type { EmptyObject } from "fvtt-types/utils";
import { GamePhase } from "../scripts/enums";
import { type GSAPEffect, OverlayItemSide } from "../scripts/animations";
import EunosSockets, { UserTargetRef, SocketState } from "./EunosSockets";
import { AlertType } from "./EunosAlerts";
import ItemDataAdvantage from "../data-model/ItemDataAdvantage";
import ItemDataDisadvantage from "../data-model/ItemDataDisadvantage";
import type EunosItem from "../documents/EunosItem";
// #endregion -- IMPORTS ~

// #region Type Definitions ~
/** Status of video loading for each user */
export enum VideoLoadStatus {
  NotConnected = "NotConnected",
  NotStarted = "NotStarted",
  Loading = "Loading",
  Ready = "Ready",
  LoadPending = "LoadPending",
  PreloadNotRequested = "PreloadNotRequested",
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

  // #region ACTIONS ~
  static readonly ACTIONS = {
    pcPortraitClick(event: PointerEvent, target: HTMLElement) {
      const pcId = $(target).closest("[data-pc-id]").attr("data-pc-id");
      if (!pcId) {
        kLog.error("No pcId found for pc portrait click");
        return;
      }
      const pc = getActors().find((actor) => actor.id === pcId);
      if (!pc || !pc.isPC()) {
        kLog.error("No pc found for pcId", { pcId });
        return;
      }
      // @ts-expect-error Don't know why the types won't recognize this syntax.
      pc.sheet?.render({ force: true });
    },
    stopSceneClick(event: PointerEvent, target: HTMLElement) {
      void EunosSockets.getInstance().call("Alert", UserTargetRef.gm, {
        type: AlertType.gmNotice,
        header: "STOP SCENE",
        body: "A player has requested an immediate scene stop.",
      });
    },
    fadeToBlackClick(event: PointerEvent, target: HTMLElement) {
      void EunosSockets.getInstance().call("Alert", UserTargetRef.gm, {
        type: AlertType.gmNotice,
        header: "FADE TO BLACK",
        body: "A player has requested a fade to black.",
      });
    },
    conditionCardClick(event: PointerEvent, target: HTMLElement) {
      const pcId = $(target).closest("[data-pc-id]").attr("data-pc-id");
      if (!pcId) {
        kLog.error("No pcId found for condition card click");
        return;
      }
      const pc = getActors().find((actor) => actor.id === pcId);
      if (!pc || !pc.isPC()) {
        kLog.error("No pc found for pcId", { pcId });
        return;
      }
      const conditionName = target.dataset["conditionName"];

      if (!conditionName) {
        kLog.error("No condition name found for condition card click");
        return;
      }

      const getBody = () => {
        switch (conditionName) {
          case "Angry":
          case "Guilt Ridden":
          case "Sad":
          case "Scared":
            return `${pc.name} loses <span class='key-word'>1 Stability</span>, and will suffer <em>&minus;1 ongoing</em> to all rolls where this condition would apply.`;
          case "Distracted":
            return `${pc.name} will suffer <em>&minus;2 ongoing</em> to all rolls where this condition would apply.`;
          case "Haunted":
            return `${pc.name} will be haunted by this experience at a later time: <span class='gm-move-text'>The GM takes 1 Hold.</span>`;
          case "Obsessed":
            return `${pc.name} grows obsessed, gaining <span class='key-word'>+1 Relation</span> towards the source of their obsession.`;
        }
      };

      void EunosSockets.getInstance().call("Alert", UserTargetRef.all, {
        type: AlertType.simple,
        header: `${pc.name} is ${conditionName}`,
        body: getBody(),
      });
    },
    async addHold(event: PointerEvent, target: HTMLElement) {
      const elem$ = $(target).closest("[data-item-id]");
      const itemId = elem$.attr("data-item-id");
      const actorId = elem$.attr("data-actor-id");
      if (!itemId || !actorId) {
        kLog.error("No itemId or actorId found for addHold", {
          itemId,
          actorId,
        });
        return;
      }
      const item = fromUuidSync(`Actor.${actorId}.Item.${itemId}`) as EunosItem;
      if (!item) {
        kLog.error("No item found for itemId", { itemId });
        return;
      }
      const itemData = item.system as ItemDataAdvantage | ItemDataDisadvantage;
      if (!itemData.hasHold) {
        kLog.error("Item does not have hold", { itemId });
        return;
      }
      await item.update({
        system: { holdTokens: (itemData.holdTokens ?? 0) + 1 },
      });
      void EunosOverlay.instance.render({ parts: ["pcs"] });
    },
    async spendHold(event: PointerEvent, target: HTMLElement) {
      const elem$ = $(target).closest("[data-item-id]");
      const itemId = elem$.attr("data-item-id");
      const actorId = elem$.attr("data-actor-id");
      if (!itemId || !actorId) {
        kLog.error("No itemId or actorId found for spendHold", {
          itemId,
          actorId,
        });
        return;
      }
      const item = fromUuidSync(`Actor.${actorId}.Item.${itemId}`) as EunosItem;
      if (!item) {
        kLog.error("No item found for itemId", { itemId });
        return;
      }
      const itemData = item.system as ItemDataAdvantage | ItemDataDisadvantage;
      if (!itemData.hasHold) {
        kLog.error("Item does not have hold", { itemId });
        return;
      }
      if ((itemData.holdTokens ?? 0) <= 0) {
        return;
      }
      await item.update({
        system: { holdTokens: (itemData.holdTokens ?? 0) - 1 },
      });
      void EunosOverlay.instance.render({ parts: ["pcs"] });
    },
  };
  // #endregion ACTIONS

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
      pcPortraitClick: EunosOverlay.ACTIONS.pcPortraitClick.bind(EunosOverlay),
      stopSceneClick: EunosOverlay.ACTIONS.stopSceneClick.bind(EunosOverlay),
      fadeToBlackClick:
        EunosOverlay.ACTIONS.fadeToBlackClick.bind(EunosOverlay),
      conditionCardClick:
        EunosOverlay.ACTIONS.conditionCardClick.bind(EunosOverlay),
      addHold: EunosOverlay.ACTIONS.addHold.bind(EunosOverlay),
      spendHold: EunosOverlay.ACTIONS.spendHold.bind(EunosOverlay),
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
    safetyButtons: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/safety-buttons.hbs",
    },
    alerts: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/alerts.hbs",
    },
    stage: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage.hbs",
    },
    countdown: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/countdown.hbs",
    },
    videoStatus: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/video-status.hbs",
      classes: ["gm-only"], // This class will hide it from non-GM users
      position: {
        top: 10,
        right: 10,
        width: "auto",
        height: "auto",
      },
    },
    locations: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-locations.hbs",
    },
    npcs: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-npcs.hbs",
    },
    pcs: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-pcs.hbs",
    },
  };
  // #endregion STATIC CONFIGURATION

  // #region STATIC METHODS ~
  static #lastPhaseChange: GamePhase | undefined;
  static async Initialize() {
    // Register hook for game phase changes
    Hooks.on(
      "preUpdateSetting",
      (setting: Setting, { value: newValue }: { value: unknown }) => {
        if (
          getUser().isGM &&
          setting.key.endsWith("gamePhase") &&
          typeof setting.value === "string" &&
          setting.value in GamePhase
        ) {
          if (typeof newValue === "string") {
            newValue = newValue.slice(1, -1) as GamePhase;
          }
          if (newValue === setting.value) {
            return;
          }
          kLog.log("preUpdateSetting hook triggered", {
            "setting.value": setting.value,
            prevValue: newValue,
            "typeof prevValue": typeof newValue,
            "prevValue in GamePhase":
              typeof newValue === "string" && newValue in GamePhase,
            "setting.value in GamePhase": setting.value in GamePhase,
            "setting.value !== prevValue": setting.value !== newValue,
          });
          if (setting.value === this.#lastPhaseChange) {
            return;
          }
          this.#lastPhaseChange = setting.value as GamePhase;
          void EunosSockets.getInstance().call(
            "changePhase",
            UserTargetRef.all,
            {
              prevPhase: setting.value as GamePhase,
              newPhase: newValue as GamePhase,
            },
          );
          // void EunosOverlay.instance.cleanupPhase(setting.value as GamePhase)
          //   .then(() => {
          //     kLog.log(`Initializing phase: ${String(newValue)}`);
          //     return EunosOverlay.instance.initializePhase(newValue as GamePhase);
          //   })
          //   .catch((error: unknown) => {
          //     kLog.error("Error initializing phase:", error);
          //   });
        }
      },
    );

    Hooks.on("updateSetting", (setting: Setting, data: unknown) => {
      kLog.log("UpdateSetting hook triggered", {
        setting: JSON.stringify(setting.toObject()),
        data: JSON.stringify(data),
      });
    });
    // Register hook to re-render when any PC actor is updated
    Hooks.on("updateActor", (actor: Actor) => {
      if (actor.type === "pc") {
        void EunosOverlay.instance.render({ parts: ["stage"] });
      }
    });

    await this.instance.render({ force: true });
  }

  static async animateSessionTitle(
    chapter: string,
    title: string,
  ): Promise<void> {
    const instance = EunosOverlay.instance;
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
  // #endregion STATIC METHODS

  // #region SOCKET FUNCTIONS ~
  public static readonly SocketFunctions: Record<string, SocketFunction> = {
    changePhase: (data: { prevPhase: GamePhase; newPhase: GamePhase }) => {
      void EunosOverlay.instance
        .cleanupPhase(data.prevPhase)
        .then(() => {
          return EunosOverlay.instance.initializePhase(data.newPhase);
        })
        .catch((error: unknown) => {
          kLog.error("Error initializing phase:", error);
        });
    },

    preloadIntroVideo: () => {
      void EunosOverlay.instance.preloadIntroVideo();
    },

    reportPreloadStatus: ({
      userId,
      status,
    }: {
      userId: string;
      status: VideoLoadStatus;
    }) => {
      if (!getUser().isGM) return;
      kLog.log("reportPreloadStatus", { userId, status });
      EunosOverlay.instance.updateVideoStatusPanel(userId, status);
    },

    startVideoPlayback: () => {
      EunosOverlay.instance.playIntroVideo().catch((error: unknown) => {
        kLog.error("Failed to play intro video:", error);
      });
    },

    requestVideoSync: (userId: string) => {
      // GM returns the current timestamp
      if (getUser().isGM) {
        const timestamp =
          EunosOverlay.instance.introVideo$[0]?.currentTime ?? 0;
        kLog.log("GM returning video timestamp:", timestamp);
        return timestamp;
      }
    },

    setLocation: (data: { location: string }) => {
      EunosOverlay.instance.goToLocation(data.location as KeyOf<typeof LOCATIONS>);
    },
  };
  // #endregion SOCKET FUNCTIONS

  // #region DOM ELEMENT GETTERS ~
  #midZIndexMask: Maybe<HTMLElement>;
  #uiRight: Maybe<HTMLElement>;
  #canvasMask: Maybe<HTMLElement>;
  #canvasBars: Maybe<HTMLElement>;
  #topZIndexMask: Maybe<HTMLElement>;
  #safetyButtons: Maybe<HTMLElement>;
  #alerts: Maybe<HTMLElement>;
  #countdownContainer: Maybe<HTMLElement>;
  #countdown: Maybe<HTMLElement>;
  #videoStatusPanel: Maybe<HTMLElement>;
  #sessionStartingSong?: PlaylistSound;
  #introVideo: Maybe<HTMLVideoElement>;

  get overlay$() {
    return $(this.element);
  }

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

  get uiRight$() {
    if (!this.#uiRight) {
      this.#uiRight = $("#ui-right")[0] as Maybe<HTMLElement>;
    }
    if (!this.#uiRight) {
      throw new Error("UI right not found");
    }
    return $(this.#uiRight);
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

  get countdownContainer$() {
    if (!this.#countdownContainer) {
      this.#countdownContainer = this.element.querySelector(
        ".loading-screen-countdown-container",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#countdownContainer) {
      throw new Error("Countdown container not found");
    }
    return $(this.#countdownContainer);
  }

  get countdown$() {
    // if (!this.#countdown) {
    this.#countdown = this.element.querySelector(
      ".loading-screen-countdown",
    ) as Maybe<HTMLElement>;
    // }
    if (!this.#countdown) {
      throw new Error("Countdown not found");
    }
    return $(this.#countdown);
  }

  get videoStatusPanel$() {
    if (!getUser().isGM) {
      throw new Error("Attempted to access video status panel as non-GM");
    }
    if (!this.#videoStatusPanel) {
      this.#videoStatusPanel = this.element.querySelector(
        ".video-status-panel",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#videoStatusPanel) {
      throw new Error("Video status panel not found");
    }
    return $(this.#videoStatusPanel);
  }

  /** Gets or creates the ambient audio element */
  get sessionClosedAmbientAudio$(): JQuery<HTMLAudioElement> {
    const audio = this.element.querySelector(
      ".session-closed-ambiance",
    ) as Maybe<HTMLAudioElement>;
    if (!audio) {
      return $();
    }
    return $(audio);
  }

  get sessionStartingPlaylist(): Playlist {
    const playlist = getGame().playlists?.getName("Pre-Session Tracks");
    if (!playlist) {
      throw new Error("Pre-Session Tracks playlist not found");
    }
    return playlist as Playlist;
  }

  get sessionStartingSong(): PlaylistSound {
    this.#sessionStartingSong =
      this.sessionStartingPlaylist.sounds.contents[0] ?? undefined;
    if (!this.#sessionStartingSong) {
      throw new Error("No songs in Pre-Session Tracks playlist");
    }
    return this.#sessionStartingSong;
  }

  /** Gets or creates the intro video element */
  get introVideo$() {
    if (!this.#introVideo) {
      // First try to find existing element
      this.#introVideo = this.element.querySelector(
        ".intro-video",
      ) as Maybe<HTMLVideoElement>;
    }

    if (!this.#introVideo) {
      throw new Error("Intro video not found");
    }
    return $(this.#introVideo);
  }
  // #endregion DOM ELEMENT GETTERS

  // #region ===== PRE-SESSION MANAGEMENT & GAME PHASE CONTROL =====
  // #region COUNTDOWN ~
  #countdownTimer: Maybe<number>;
  #countdownTimeline: Maybe<gsap.core.Timeline>;
  isCountdownContainerTimelineActive = false;

  public get glitchRepeatDelay(): number {
    const totalSeconds = 7 * 24 * 60 * 60;
    const currentSeconds = countdownUntil().totalSeconds;
    const progress = currentSeconds / totalSeconds;
    const delay = gsap.utils.interpolate(20, 500, progress);
    return delay;
  }
  private get preSessionSongDuration(): number {
    const preSessionSong = this.sessionStartingSong;
    if (!preSessionSong.sound) {
      throw new Error(
        "Attempt to access pre-session song duration before song is loaded.",
      );
    }
    return preSessionSong.sound.duration;
  }

  private get countdownContainerTimeline(): gsap.core.Timeline {
    const duration = countdownUntil().totalSeconds;
    this.isCountdownContainerTimelineActive = true;
    const self = this;
    return gsap
      .timeline({
        onComplete() {
          self.isCountdownContainerTimelineActive = false;
        },
      })
      .to(this.countdownContainer$, {
        top: "50%",
        scale: 3,
        duration,
        ease: "power4.out",
      })
      .call(this.killLoadingScreenItems.bind(this), [], 0.5 * duration)
      .fromTo(
        [this.topZIndexMask$, this.introVideo$],
        {
          autoAlpha: 0,
        },
        {
          autoAlpha: 1,
          duration: 0.5,
          ease: "power2.inOut",
        },
        duration - 0.5,
      );
  }

  private get countdownTimeline(): gsap.core.Timeline {
    if (!this.#countdownTimeline) {
      const glitchText$ = this.countdown$.find(".glitch-text");
      const glitchTop$ = this.countdown$.find(".glitch-top");
      const glitchBottom$ = this.countdown$.find(".glitch-bottom");
      const self = this;

      this.#countdownTimeline = gsap
        .timeline({
          repeat: -1,
          repeatDelay: this.glitchRepeatDelay,
        })
        .addLabel("glitch")
        .to(glitchText$, {
          duration: 0.1,
          skewX: "random([20,-20])",
          ease: "power4.inOut",
        })
        .to(glitchText$, { duration: 0.04, skewX: 0, ease: "power4.inOut" })

        .to(glitchText$, { duration: 0.04, opacity: 0 })
        .to(glitchText$, { duration: 0.04, opacity: 1 })

        .to(glitchText$, { duration: 0.04, x: "random([20,-20])" })
        .to(glitchText$, { duration: 0.04, x: 0 })

        .add("split", 0)

        .to(
          glitchTop$,
          { duration: 0.5, x: -30, ease: "power4.inOut" },
          "split",
        )
        .to(
          glitchBottom$,
          { duration: 0.5, x: 30, ease: "power4.inOut" },
          "split",
        )
        .to(
          glitchText$,
          { duration: 0.08, textShadow: "-13px -13px 0px var(--K4-dRED)" },
          "split",
        )
        .to(this.countdown$, { duration: 0, scale: 1.2 }, "split")
        .to(this.countdown$, { duration: 0, scale: 1 }, "+=0.02")
        .to(
          glitchText$,
          { duration: 0.08, textShadow: "0px 0px 0px var(--K4-dRED)" },
          "+=0.09",
        )
        .to(glitchText$, { duration: 0.02, color: "#FFF" }, "-=0.05")
        .to(glitchText$, { duration: 0.02, color: "var(--K4-bGOLD)" })
        .to(
          glitchText$,
          { duration: 0.03, textShadow: "13px 13px 0px #FFF" },
          "split",
        )
        .to(
          glitchText$,
          {
            duration: 0.08,
            textShadow: "0px 0px 0px transparent",
            clearProps: "textShadow",
          },
          "+=0.01",
        )
        .to(glitchTop$, { duration: 0.2, x: 0, ease: "power4.inOut" })
        .to(glitchBottom$, { duration: 0.2, x: 0, ease: "power4.inOut" })
        .to(glitchText$, { duration: 0.02, scaleY: 1.1, ease: "power4.inOut" })
        .to(glitchText$, { duration: 0.04, scaleY: 1, ease: "power4.inOut" });
    }
    return this.#countdownTimeline;
  }

  private async initializeCountdown(): Promise<void> {
    kLog.log("initializeCountdown");
    // Clear any existing countdown timer
    if (this.#countdownTimer) {
      window.clearInterval(this.#countdownTimer);
      this.#countdownTimer = undefined;
    }
    // Initialize new countdown timer
    this.#countdownTimer = window.setInterval(() => {
      void this.updateCountdown().catch((error: unknown) => {
        kLog.error("Failed to update countdown:", error);
      });
    }, 1000);
    // Show countdown & apply countdown timeline
    this.countdownContainer$.css("visibility", "visible");
    this.countdownTimeline.seek(0).play();
    // Update countdown immediately
    kLog.log("initializeCountdown -> updateCountdown");
    await this.updateCountdown();
  }

  private killCountdown() {
    kLog.log("killCountdown");
    if (this.#countdownTimer) {
      window.clearInterval(this.#countdownTimer);
      this.#countdownTimer = undefined;
    }
    this.countdownContainer$.css("visibility", "hidden");
    this.countdownTimeline.seek(0).kill();
  }

  private updateCountdownText() {
    const timeLeft = countdownUntil();
    const textElements$ = this.countdown$.find(".glitch-text");
    textElements$.text(
      [
        String(timeLeft.days).padStart(2, "0"),
        String(timeLeft.hours).padStart(2, "0"),
        String(timeLeft.minutes).padStart(2, "0"),
        String(timeLeft.seconds).padStart(2, "0"),
      ].join(":"),
    );
    return timeLeft;
  }

  /** Updates the countdown display and handles pre-session sequence */
  private async updateCountdown(): Promise<void> {
    const timeLeft = this.updateCountdownText().totalSeconds;

    if (timeLeft <= PRE_SESSION.COUNTDOWN_HIDE) {
      kLog.log("updateCountdown -> killCountdown (COUNTDOWN HIDE)");
      this.killCountdown();
      return;
    }

    if (!this.countdownTimeline.isActive()) {
      kLog.log("updateCountdown -> countdownTimeline.play('glitch')");
      this.countdownTimeline.play("glitch");
    }

    if (
      timeLeft <= (this.sessionStartingSong.sound?.duration ?? 0) &&
      !this.isCountdownContainerTimelineActive
    ) {
      this.countdownContainerTimeline.play();
      return;
    }

    if (
      timeLeft <= PRE_SESSION.LOAD_SESSION &&
      getSetting("gamePhase") === GamePhase.SessionClosed &&
      getUser().isGM
    ) {
      kLog.log("updateCountdown -> set gamePhase to SESSION LOADING");
      await setSetting("gamePhase", GamePhase.SessionLoading);
      kLog.log(`updateCountdown - set gamePhase to ${getSetting("gamePhase")}`);
      return;
    }
  }
  // #endregion COUNTDOWN ~

  // #region SESSION CLOSED AMBIENT AUDIO ~

  /** Initializes ambient audio playback with user interaction handling */
  private async initializeAmbientAudio(): Promise<void> {
    try {
      // Use native play() method since it returns a Promise for autoplay handling
      // jQuery's trigger('play') doesn't handle this properly
      if (document.hasFocus() && !document.hidden) {
        // assert existence of element; if this fails, will throw an error that will be caught below
        await this.sessionClosedAmbientAudio$[0]!.play();
        return;
      }
    } catch (error: unknown) {
      kLog.error("Failed to play ambient audio, setting up handlers", error);
    } finally {
      // Set up handlers if we couldn't play immediately or if playback failed
      this.setupAudioInteractionHandlers();
    }
  }

  private handleAudioInteraction(e: Event): void {
    // Ignore clicks on the start video button
    if (
      e.target instanceof Element &&
      (e.target.classList.contains("start-video") ||
        e.target.closest(".start-video"))
    ) {
      return;
    }

    try {
      void this.sessionClosedAmbientAudio$[0]!.play();
    } catch (error: unknown) {
      console.warn("Handler failed to play ambient audio:", error);
    }
  }

  /** Sets up event listeners to handle audio autoplay after user interaction */
  private setupAudioInteractionHandlers(): void {
    PRE_SESSION.INTERACTION_EVENTS.forEach((event) => {
      document.addEventListener(event, this.handleAudioInteraction.bind(this), {
        once: true,
      });
    });
  }

  private async killSessionClosedAmbientAudio(): Promise<void> {
    const audio = this.sessionClosedAmbientAudio$[0];

    if (!audio || audio.volume === 0) {
      return;
    }

    // Create a promise that resolves when the fade is complete
    return new Promise<void>((resolve) => {
      gsap.to(audio, {
        volume: 0,
        duration: 0.5,
        ease: "power1.out",
        onComplete: () => {
          PRE_SESSION.INTERACTION_EVENTS.forEach((event) => {
            document.removeEventListener(
              event,
              this.handleAudioInteraction.bind(this),
            );
          });
          audio.pause();
          audio.currentTime = 0;
          resolve();
        },
      });
    });
  }
  // #endregion SESSION CLOSED AMBIENT AUDIO ~

  // #region LOADING SCREEN ITEM ROTATION ~
  #loadScreenRotationTimer: Maybe<number>;
  #loadingScreenItems: Map<string, JQuery> = new Map<string, JQuery>();
  #loadingScreenItemTimelines: Map<string, gsap.core.Timeline> = new Map<
    string,
    gsap.core.Timeline
  >();
  #currentLoadingScreenItem: Maybe<KeyOf<typeof LOADING_SCREEN_DATA>>;
  #loadingScreenItemDeck: Array<KeyOf<typeof LOADING_SCREEN_DATA>> = [];

  private cacheLoadingScreenItems(): void {
    $(".loading-screen-item").each((index, element) => {
      const key = $(element).data("key") as KeyOf<typeof LOADING_SCREEN_DATA>;
      this.#loadingScreenItems.set(key, $(element));
      // this.#loadingScreenItemTimelines.set(key, this.buildLoadingScreenItemTimeline(key));
    });
  }

  private fillLoadingScreenItemDeck(): void {
    const entries = Object.entries(LOADING_SCREEN_DATA) as Entries<
      typeof LOADING_SCREEN_DATA
    >;
    const shuffled = entries.sort(() => Math.random() - 0.5);
    // Confirm first item is not equal to last item stored in #currentLoadingScreenItem
    if (
      this.#currentLoadingScreenItem &&
      shuffled[0]![0] === this.#currentLoadingScreenItem
    ) {
      // Swap first and last items
      [shuffled[0], shuffled[shuffled.length - 1]] = [
        shuffled[shuffled.length - 1]!,
        shuffled[0]!,
      ];
    }
    this.#loadingScreenItemDeck = shuffled.map(([key]) => key);
  }

  get loadingScreenItemDeck(): Array<KeyOf<typeof LOADING_SCREEN_DATA>> {
    if (this.#loadingScreenItemDeck.length === 0) {
      this.fillLoadingScreenItemDeck();
    }
    return this.#loadingScreenItemDeck;
  }

  private get nextLoadingScreenItem(): KeyOf<typeof LOADING_SCREEN_DATA> {
    this.#currentLoadingScreenItem = this.loadingScreenItemDeck.shift()!;
    return this.#currentLoadingScreenItem;
  }

  private get currentLoadingScreenItem(): KeyOf<typeof LOADING_SCREEN_DATA> {
    return this.#currentLoadingScreenItem ?? this.nextLoadingScreenItem;
  }

  private get currentLoadingScreenItemTimeline(): Maybe<gsap.core.Timeline> {
    let timeline = this.#loadingScreenItemTimelines.get(
      this.currentLoadingScreenItem,
    );
    if (!timeline) {
      timeline = this.buildLoadingScreenItemTimeline(
        this.currentLoadingScreenItem,
      );
    }
    this.#loadingScreenItemTimelines.set(
      this.currentLoadingScreenItem,
      timeline,
    );
    return timeline;
  }

  private buildLoadingScreenItemTimeline(
    key: keyof typeof LOADING_SCREEN_DATA,
  ): gsap.core.Timeline {
    if (!this.#loadingScreenItemTimelines.has(key)) {
      const item$ = this.#loadingScreenItems.get(key)!;
      const $image = item$.find(".loading-screen-item-image");
      const $title = item$.find(".loading-screen-item-title");
      const $subtitle = item$.find(".loading-screen-item-subtitle");
      const $home = item$.find(".loading-screen-item-home");
      const $body = item$.find(".loading-screen-item-body");

      const entryDuration = PRE_SESSION.LOADING_SCREEN_ITEM_DURATION.ENTRY;
      const displayDuration = PRE_SESSION.LOADING_SCREEN_ITEM_DURATION.DISPLAY;
      const exitDuration = PRE_SESSION.LOADING_SCREEN_ITEM_DURATION.EXIT;

      const tl = gsap
        .timeline({
          paused: true,
          onStart: function onStart() {
            item$.show();
          },
          onComplete: function onComplete(this: gsap.core.Timeline) {
            // Set timeline position to "start", using label designator "start"
            this.seek("start");
            this.pause();
          },
        })
        .addLabel("start")
        .fromTo(
          $image,
          {
            filter: "brightness(0) blur(10px)",
            // left:"0%",
            x: "+=100",
            scale: 1.5,
            height: "100vh",
            // height: "600vh"
          },
          {
            filter: "brightness(1) blur(0px)",
            x: 0,
            // height: "100vh",
            scale: 1,
            duration: entryDuration + displayDuration + exitDuration,
            ease: "back.out(2)",
          },
        )
        .fromTo(
          $image,
          {
            autoAlpha: 0,
          },
          {
            autoAlpha: 1,
            duration: 0.25 * entryDuration + displayDuration + exitDuration,
            ease: "power3.out",
          },
          0.25 * entryDuration,
        )
        .fromTo(
          $title,
          {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100",
          },
          {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out",
          },
          (2 * entryDuration) / 5,
        )
        .fromTo(
          $subtitle,
          {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100",
          },
          {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out",
          },
          (3 * entryDuration) / 5,
        )
        .fromTo(
          $home,
          {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100",
          },
          {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out",
          },
          (3.5 * entryDuration) / 5,
        )
        .fromTo(
          $body,
          {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100",
          },
          {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out",
          },
          (4 * entryDuration) / 5,
        )
        .addLabel("display", entryDuration)
        .to(
          [$image, $title, $subtitle, $home, $body],
          {
            autoAlpha: 0,
            filter: "blur(10px)",
            duration: exitDuration,
            ease: "power2.in",
          },
          `display+=${displayDuration}`,
        );

      // Store the total duration as data on the timeline
      const totalDuration = tl.duration();
      tl.data = { totalDuration };

      this.#loadingScreenItemTimelines.set(key, tl);
    }
    return this.#loadingScreenItemTimelines.get(key)!;
  }

  private async renderNextItem(): Promise<void> {
    if (!this.isFirstItem) {
      this.#currentLoadingScreenItem = this.loadingScreenItemDeck.shift()!;
    }
    this.isFirstItem = false;
    await this.currentLoadingScreenItemTimeline?.play();
  }

  private async initializeLoadingScreenItemRotation(): Promise<void> {
    try {
      // Clear any existing loading screen timelines
      this.killLoadingScreenItems();

      // Caching loading screen items & build timelines
      this.cacheLoadingScreenItems();

      // Begin item rotation
      void this.rotateLoadingScreenItems();
    } catch (error) {
      kLog.error("Failed to initialize loading screen:", error);
      throw error;
    }
  }

  private isFirstItem = true;
  private async rotateLoadingScreenItems() {
    // Immediately display the first item
    void this.renderNextItem().then(() => {
      this.isFirstItem = false;
      // Schedule next rotation
      this.#loadScreenRotationTimer = window.setTimeout(() => {
        void this.rotateLoadingScreenItems();
      }, PRE_SESSION.LOADING_SCREEN_ITEM_DURATION.DELAY);
    });
  }

  private killLoadingScreenItems(): void {
    // Kill the rotation interval
    window.clearInterval(this.#loadScreenRotationTimer);

    // Wait for any currently-running timeline to complete
    const currentTimeline = this.#loadingScreenItemTimelines.get(
      this.#currentLoadingScreenItem ?? "",
    );
    if (currentTimeline?.isActive()) {
      void currentTimeline.timeScale(5).then(() => {
        currentTimeline.seek(0).kill();
      });
    }

    this.#loadingScreenItemTimelines.forEach((timeline) => {
      timeline.seek(0).kill();
    });
    this.#loadingScreenItemTimelines.clear();
    this.#currentLoadingScreenItem = undefined;
    this.isFirstItem = true;
    this.#loadScreenRotationTimer = undefined;
  }
  // #endregion LOADING SCREEN

  // #region PRE-SESSION SONG ~
  /** Schedules playing of the pre-session song based on its duration */

  private async initializePreSessionSong(): Promise<void> {
    if (!getUser().isGM) {
      return;
    }

    kLog.log("initializePreSessionSong");

    await getGame().audio.unlock;
    const timeRemaining = countdownUntil().totalSeconds;
    const preSessionSong = this.sessionStartingSong;
    await preSessionSong.load();
    const songDuration = preSessionSong.sound?.duration ?? 0;

    kLog.display("Initializing pre-session song");
    kLog.log(
      `timeRemaining: ${Math.floor(timeRemaining / 60)}:${timeRemaining % 60}, songDuration: ${Math.floor(songDuration / 60)}:${songDuration % 60}`,
    );

    if (timeRemaining <= songDuration) {
      kLog.log("playing song IMMEDIATELY");
      this.playPreSessionSong();
    } else {
      const delay = timeRemaining - songDuration;
      kLog.log(`playing song in ${Math.floor(delay / 60)}:${delay % 60}`);
      window.setTimeout(this.playPreSessionSong.bind(this), delay * 1000);
    }
  }
  /** Plays the pre-session song */
  private playPreSessionSong(): void {
    kLog.log("playing song");
    this.countdownContainerTimeline.play();
    void this.killSessionClosedAmbientAudio();
    void this.sessionStartingPlaylist.playAll();
  }

  // #endregion PRE-SESSION SONG ~

  // #region INTRO VIDEO ~

  /** Initializes video preloading with user interaction handling */
  private async preloadIntroVideo(): Promise<void> {
    const video$ = this.introVideo$;
    const reportStatus = (status: VideoLoadStatus) => {
      if (!getUser().isGM) {
        void EunosSockets.getInstance().call("reportPreloadStatus", "gm", {
          userId: getUser().id ?? "",
          status,
        });
      } else {
        this.updateVideoStatusPanel(getUser().id ?? "", status);
      }
    };

    try {
      // Try to preload if page is focused and visible
      if (document.hasFocus() && !document.hidden) {
        reportStatus(VideoLoadStatus.Loading);

        const video = video$[0]!;

        // Restore video attributes if they were cleared
        if (!video.hasAttribute("src")) {
          video.src = MEDIA_PATHS.INTRO_VIDEO;
          video.preload = "auto";
        }

        // Check if video is already loaded
        if (video.readyState >= 4) {
          // HAVE_ENOUGH_DATA
          reportStatus(VideoLoadStatus.Ready);
        } else {
          video.addEventListener(
            "canplaythrough",
            () => {
              reportStatus(VideoLoadStatus.Ready);
            },
            { once: true },
          );
          video.load();
        }
        return;
      }

      // If we can't load immediately, report pending status
      reportStatus(VideoLoadStatus.LoadPending);
    } finally {
      this.setupVideoPreloadHandlers();
    }
  }

  /** Sets up event listeners to handle video preloading after user interaction */
  private setupVideoPreloadHandlers(): void {
    const interactionEvents = [
      "click",
      "touchstart",
      "keydown",
      "mousedown",
      "pointerdown",
    ];

    const handleVideoPreload = (e: Event) => {
      // Ignore clicks on the start video button
      if (
        e.target instanceof Element &&
        (e.target.classList.contains("start-video") ||
          e.target.closest(".start-video"))
      ) {
        return;
      }

      const video = this.introVideo$[0]!;

      // Restore video attributes if they were cleared
      if (!video.hasAttribute("src")) {
        video.src = MEDIA_PATHS.INTRO_VIDEO;
        video.preload = "auto";
      }

      // Update status to Loading once user interacts
      if (!getUser().isGM) {
        void EunosSockets.getInstance().call("reportPreloadStatus", "gm", {
          userId: getUser().id ?? "",
          status: VideoLoadStatus.Loading,
        });
      } else {
        this.updateVideoStatusPanel(
          getUser().id ?? "",
          VideoLoadStatus.Loading,
        );
      }

      video.addEventListener(
        "canplaythrough",
        () => {
          if (!getUser().isGM) {
            void EunosSockets.getInstance().call("reportPreloadStatus", "gm", {
              userId: getUser().id ?? "",
              status: VideoLoadStatus.Ready,
            });
          } else {
            this.updateVideoStatusPanel(
              getUser().id ?? "",
              VideoLoadStatus.Ready,
            );
          }
        },
        { once: true },
      );

      video.load();
    };

    interactionEvents.forEach((event) => {
      document.addEventListener(event, handleVideoPreload, { once: true });
    });
  }

  /** Initiates video preloading for all users */
  private initializeVideoPreloading(): void {
    if (!getUser().isGM) return;
    void EunosSockets.getInstance().call(
      "preloadIntroVideo",
      UserTargetRef.all,
    );
  }

  /** Plays the intro video from the start */
  public async playIntroVideo(): Promise<void> {
    const video$ = this.introVideo$;
    const video = video$[0]!;

    // Reset volume in case it was faded out
    video.volume = 1;

    // Add ended event listener before playing
    video.addEventListener(
      "ended",
      () => {
        kLog.log("Video playback complete");
        if (getUser().isGM) {
          void setSetting("gamePhase", GamePhase.SessionRunning);
        }
      },
      { once: true },
    );

    await gsap.to(this.introVideo$, {
      autoAlpha: 1,
      duration: 0.5,
    });

    await video.play();
  }

  /** Handles late-join video synchronization */
  private async handleLateJoinSync(): Promise<void> {
    gsap.to([this.introVideo$, this.topZIndexMask$], {
      autoAlpha: 1,
      duration: 0.5,
    });

    const syncRequestTime = Date.now();
    const gmTimestamp = await EunosSockets.getInstance().call<number>(
      "requestVideoSync",
      UserTargetRef.gm,
    );
    const latency = (Date.now() - syncRequestTime) / 2;

    // Calculate where video should be now, including network delay
    const targetTimestamp = gmTimestamp + latency / 1000;

    const video$ = this.introVideo$;
    const video = video$[0]!;
    const bufferOffset = 2; // seconds

    // Start loading from slightly before target time
    video.currentTime = Math.max(0, targetTimestamp - bufferOffset);

    await new Promise<void>((resolve) => {
      const handleCanPlay = () => {
        const totalTimePassed = (Date.now() - syncRequestTime) / 1000;
        video.currentTime = gmTimestamp + totalTimePassed;
        video.play().catch(console.error);
        video.removeEventListener("canplay", handleCanPlay);
        resolve();
      };

      video.addEventListener("canplay", handleCanPlay);
      video.load();
    });
  }

  private async killIntroVideo(): Promise<void> {
    const video$ = this.introVideo$;
    const video = video$[0]!;

    // Create a promise that resolves when the fade is complete
    return new Promise<void>((resolve) => {
      // Create a timeline to handle both video and container fade
      gsap
        .timeline({
          onComplete: () => {
            // Stop playback
            video.pause();

            // Reset playback position
            video.currentTime = 0;

            // Clear source buffer
            video.removeAttribute("src");
            video.load();

            // Reset properties that might prevent garbage collection
            video.preload = "none";

            // Clear any media keys or encrypted media data
            if (video.mediaKeys) {
              video.setMediaKeys(null).catch(() => {
                // Ignore errors, this is just cleanup
              });
            }

            resolve();
          },
        })
        .to(video, {
          volume: 0,
          duration: 0.5,
          ease: "power1.out",
        });
    });
  }

  // #region GM Video Status Panel ~

  /** Updates the video status panel */
  public videoLoadStatus: Map<string, VideoLoadStatus> = new Map<
    string,
    VideoLoadStatus
  >();

  private updateVideoStatusPanel(
    userId: string,
    status: VideoLoadStatus,
  ): void {
    if (!getUser().isGM) return;

    const allUsers = getUsers();
    for (const user of allUsers) {
      if (user.id === userId) {
        this.videoLoadStatus.set(user.id, status);
      } else if (!this.videoLoadStatus.has(user.id!)) {
        this.videoLoadStatus.set(user.id!, VideoLoadStatus.PreloadNotRequested);
      }
    }

    // Render just the videoStatus part instead of the whole application
    void this.render({ parts: ["videoStatus"] });
  }

  // #endregion GM Video Status Panel ~

  // #endregion INTRO VIDEO ~

  // #region PHASE LIFECYCLE METHODS ~

  async initializePhase(gamePhase?: GamePhase) {
    gamePhase = gamePhase ?? getSetting("gamePhase");
    kLog.log(`Initializing phase: ${gamePhase}`);
    switch (gamePhase) {
      case GamePhase.SessionClosed: {
        await this.initialize_SessionClosed();
        break;
      }
      case GamePhase.SessionLoading: {
        await this.initialize_SessionLoading();
        break;
      }
      case GamePhase.SessionStarting: {
        await this.initialize_SessionStarting();
        break;
      }
      case GamePhase.SessionRunning: {
        await this.initialize_SessionRunning();
        break;
      }
      case GamePhase.SessionEnding: {
        await this.initialize_SessionEnding();
        break;
      }
    }
    setTimeout(() => {
      addClassToDOM("interface-ready");
    }, 1000);
  }

  async syncPhase() {
    // Get current game phase from settings.
    const gamePhase = getSetting("gamePhase");
    kLog.log(`Syncing phase: ${gamePhase}`);
    // Add the appropriate class based on the game phase.
    switch (gamePhase) {
      case GamePhase.SessionClosed: {
        await this.sync_SessionClosed();
        break;
      }
      case GamePhase.SessionLoading: {
        await this.sync_SessionLoading();
        break;
      }
      case GamePhase.SessionStarting: {
        await this.sync_SessionStarting();
        break;
      }
      case GamePhase.SessionRunning: {
        await this.sync_SessionRunning();
        break;
      }
      case GamePhase.SessionEnding: {
        await this.sync_SessionEnding();
        break;
      }
    }
    setTimeout(() => {
      addClassToDOM("interface-ready");
    }, 1000);
  }

  async cleanupPhase(gamePhase?: GamePhase) {
    gamePhase = gamePhase ?? getSetting("gamePhase");
    kLog.log(`Cleaning up phase: ${gamePhase}`);
    switch (gamePhase) {
      case GamePhase.SessionClosed: {
        await this.cleanup_SessionClosed();
        break;
      }
      case GamePhase.SessionLoading: {
        await this.cleanup_SessionLoading();
        break;
      }
      case GamePhase.SessionStarting: {
        await this.cleanup_SessionStarting();
        break;
      }
      case GamePhase.SessionRunning: {
        await this.cleanup_SessionRunning();
        break;
      }
      case GamePhase.SessionEnding: {
        await this.cleanup_SessionEnding();
        break;
      }
    }
  }

  // #region SessionClosed Methods
  private async initialize_SessionClosed(): Promise<void> {
    // If there are fewer than 15 minutes remaining, immediately switch to SessionLoading phase
    // if (countdownUntil().totalSeconds <= PRE_SESSION.LOAD_SESSION) {
    //   if (getUser().isGM) {
    //     await setSetting("gamePhase", GamePhase.SessionLoading);
    //   }
    //   return;
    // }
    addClassToDOM("session-closed");
    await this.initializeLoadingScreenItemRotation();
    await Promise.all([
      this.initializeCountdown(),
      this.initializeAmbientAudio(),
    ]);
    // this.addCanvasMaskListeners();
  }
  async sync_SessionClosed() {
    addClassToDOM("session-closed");
    await this.initializeLoadingScreenItemRotation();
    await Promise.all([
      this.initializeCountdown(),
      this.initializeAmbientAudio(),
    ]);
    // this.addCanvasMaskListeners();
  }
  private async cleanup_SessionClosed(): Promise<void> {
    removeClassFromDOM("session-closed");
  }
  // #endregion SessionClosed Methods

  // #region SessionLoading Methods
  private async initialize_SessionLoading(): Promise<void> {
    addClassToDOM("session-loading");
    await Promise.all([
      this.initializeCountdown(),
      this.initializePreSessionSong(),
    ]);
    this.initializeVideoPreloading();
  }

  async sync_SessionLoading() {
    addClassToDOM("session-loading");
    await this.initializeLoadingScreenItemRotation();
    await Promise.all([
      this.initializeCountdown(),
      this.initializeAmbientAudio(),
      this.preloadIntroVideo(),
    ]);
    // this.addStartVideoButtonListeners();
  }

  private async cleanup_SessionLoading(): Promise<void> {
    this.killCountdown();
    this.killLoadingScreenItems();
    if (getUser().isGM) {
      void this.sessionStartingPlaylist.stopAll();
    }
    removeClassFromDOM("session-loading");
  }

  // #endregion SessionLoading Methods

  // #region SessionStarting Methods
  private async initialize_SessionStarting(
    data?: Record<string, unknown>,
  ): Promise<void> {
    addClassToDOM("session-starting");
    if (!getUser().isGM) return;

    // GM triggers video playback for all clients
    void EunosSockets.getInstance().call(
      "startVideoPlayback",
      UserTargetRef.all,
    );
  }

  async sync_SessionStarting(): Promise<void> {
    addClassToDOM("session-starting");
    if (getUser().isGM) {
      // GM already has video preloaded
      await this.playIntroVideo();
    } else {
      // Late-join handling for players
      try {
        await this.handleLateJoinSync();
      } catch (error) {
        kLog.error("Failed to sync video playback:", error);
        // Fallback to normal playback if sync fails
        await this.playIntroVideo();
      }
    }
  }

  private async cleanup_SessionStarting(): Promise<void> {
    await this.killIntroVideo();
    removeClassFromDOM("session-starting");
  }
  // #endregion SessionStarting Methods

  // #region SessionRunning Methods
  private async initialize_SessionRunning(): Promise<void> {
    this.initializeLocation();
    addClassToDOM("session-running");
    kLog.log(
      "Would initialize SessionRunning phase",
      "Setting up stage and UI components",
    );
  }

  async sync_SessionRunning() {
    this.initializeLocation();
    addClassToDOM("session-running");
  }

  private async cleanup_SessionRunning(): Promise<void> {
    removeClassFromDOM("session-running");
  }

  // #endregion SessionRunning Methods

  // #region SessionEnding Methods
  private async initialize_SessionEnding(): Promise<void> {
    addClassToDOM("session-ending");
    kLog.log(
      "Would initialize SessionEnding phase",
      "Setting up dramatic hook UI and session summary",
    );
  }

  async sync_SessionEnding() {
    addClassToDOM("session-ending");
  }

  private async cleanup_SessionEnding(): Promise<void> {
    removeClassFromDOM("session-ending");
    kLog.log(
      "Would cleanup SessionEnding phase",
      "Cleaning up dramatic hook UI and session summary",
    );
  }
  // #endregion SessionEnding Methods

  // #endregion PHASE LIFECYCLE METHODS

  // #endregion PRE-SESSION MANAGEMENT & GAME PHASE CONTROL ~

  // #region ===== STAGE CONTROL =====

  get locationContainer(): JQuery {
    return this.overlay$.find("#LOCATIONS");
  }
  get locationName(): JQuery {
    return this.locationContainer.find(".location-name");
  }
  get locationImage(): JQuery {
    return this.locationContainer.find(".location-image");
  }
  get locationDescription(): JQuery {
    return this.locationContainer.find(".location-description");
  }

  public initializeLocation() {
    const location = getSetting("location");
    if (!location || !(location in LOCATIONS)) {
      kLog.error(`Location ${location} not found`);
      return;
    }
    this.goToLocation(location as KeyOf<typeof LOCATIONS>, true);
  }

  public async setLocation(location: KeyOf<typeof LOCATIONS>) {
    if (!getUser().isGM) { return; }
    await setSetting("location", location);
    void EunosSockets.getInstance().call("setLocation", UserTargetRef.all, { location });
  }

  public goToLocation(location: KeyOf<typeof LOCATIONS>, isInstant = false) {
    const locationData = LOCATIONS[location];
    if (!locationData) {
      kLog.error("Location not found", { location });
      return;
    }

    const {image, description,mapTransforms} = locationData;

    // Construct a timeline that will animate all of the map transforms smoothly and simultaneously

    const timeline = gsap.timeline({paused: true})
      .to(
        this.locationContainer,
        {
          y: "-=200",
          x: "-=100",
          filter: "blur(30px)",
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
        }, 0)
      .call(() => {
        this.locationName.text(location);
        this.locationImage.attr("src", image ?? "");
        this.locationDescription.html(description ?? "");
      })
      .to(
        this.locationContainer,
        {
          y: 0,
          x: 0,
          filter: "blur(0)",
          duration: 0,
          ease: "none"
        }
      )
      .addLabel("startMoving");

    mapTransforms.forEach(({selector, properties}) => {
      timeline.to(selector, {
        ...properties,
        duration: 3,
        ease: "power3.inOut"
      }, "startMoving");
    });

    timeline
      .to(this.locationContainer, {
        opacity: 1,
        duration: 1,
        ease: "power3.inOut",
      }, "-=0.5");

    if (isInstant) {
      timeline.progress(1);
    } else {
      timeline.play();
    }
  }

  // #endregion

  // #region LISTENERS ~

  #sidebarTimeline: Maybe<gsap.core.Timeline>;
  private get sidebarTimeline(): gsap.core.Timeline {
    if (!this.#sidebarTimeline) {
      this.#sidebarTimeline = gsap
        .timeline({ paused: true })
        .to(this.uiRight$, {
          opacity: 0,
          duration: 0.01,
          ease: "none",
        })
        .to(this.uiRight$, {
          opacity: 1,
          zIndex: 500,
          duration: 0.5,
          ease: "power2.out",
        });
    }
    return this.#sidebarTimeline;
  }

  private addCanvasMaskListeners() {
    this.sessionClosedAmbientAudio$[0]!.volume = Number(
      this.sessionClosedAmbientAudio$[0]?.dataset["volume"] ?? 0.5,
    );

    $(document)
      // Handle cursor movement
      .on("mousemove", (event) => {
        const isOverSidebar =
          event.clientX >= (this.uiRight$.offset()?.left ?? 0);
        if (isOverSidebar) {
          this.sidebarTimeline.play();
        } else {
          this.sidebarTimeline.reverse();
        }
      })
      // Handle cursor leaving
      .on("mouseleave", () => {
        this.sidebarTimeline.reverse();
      });
  }

  #startVideoListenerAdded = false;

  private addStartVideoButtonListeners() {
    if (!getUser().isGM || this.#startVideoListenerAdded) {
      return;
    }

    kLog.log("adding start video button listener");

    // Use event delegation on document
    $(document)
      .off("click.startVideo")
      .on("click.startVideo", ".start-video", (e) => {
        kLog.log("start video button clicked");
        void setSetting("gamePhase", GamePhase.SessionStarting);
      });

    this.#startVideoListenerAdded = true;
  }

  // #endregion LISTENERS ~

  // #region OVERRIDE: PREPARE CONTEXT ~
  override async _prepareContext(options: ApplicationV2.RenderOptions) {
    const context = await super._prepareContext(options);

    // Prepare location data for stage
    const location = getSetting("location");

    // Prepare NPC data for stage
    const npcSceneData = getSetting("npcSceneData");
    const npcsData = Object.fromEntries(
      Object.entries<string | null>(npcSceneData ?? {}).map(
        ([sceneIndex, npcId]) => [
          parseInt(sceneIndex, 10),
          npcId ? getActors().find((actor) => actor.id === npcId) : null,
        ],
      ),
    );

    // Prepare PC data for stage
    const pcsData = getActors().filter((actor) => actor.type === "pc");
    const pcsPresent = getSetting("pcsPresent");

    // Prepare loading screen item data

    Object.assign(context, {
      location,
      npcsData,
      pcsData,
      pcsPresent,
      LOADING_SCREEN_DATA,
      sessionScribeID: getSetting("sessionScribeID"),
      isGM: getUser().isGM,
    });

    if (!getUser().isGM) {
      const pcActor = getActor();
      if (pcActor.isPC()) {
        Object.assign(context, {
          dramaticHookCandleID: pcActor.system.dramatichooks.assigningFor,
        });
      }
    }

    if (!getUser().isGM) {
      return context;
    }

    // Prepare video status data for template
    const users = getUsers().map((user: User) => {
      const status =
        !user.active ||
        this.videoLoadStatus.get(user.id ?? "") === VideoLoadStatus.NotConnected
          ? VideoLoadStatus.NotConnected
          : (this.videoLoadStatus.get(user.id ?? "") ??
            VideoLoadStatus.PreloadNotRequested);

      return {
        id: user.id,
        name: user.name,
        active: user.active,
        status,
        statusClass: status.toLowerCase(),
        isNotConnected: status === VideoLoadStatus.NotConnected,
        isPreloadNotRequested: status === VideoLoadStatus.PreloadNotRequested,
        isLoadPending: status === VideoLoadStatus.LoadPending,
        isLoading: status === VideoLoadStatus.Loading,
        isReady: status === VideoLoadStatus.Ready,
      };
    });

    Object.assign(context, {
      users,
      isGM: true,
    });

    return context;
  }
  // #endregion OVERRIDE: PREPARE CONTEXT ~

  // #region OVERRIDE: ON RENDER ~
  override _onRender(
    context: EmptyObject,
    options: ApplicationV2.RenderOptions,
  ) {
    super._onRender(context, options);

    if (options.isFirstRender) {
      void this.syncPhase();
    }
    if (
      [GamePhase.SessionClosed, GamePhase.SessionLoading].includes(
        getSetting("gamePhase"),
      )
    ) {
      this.addCanvasMaskListeners();
    }
    this.addStartVideoButtonListeners();
  }
  // #endregion OVERRIDE: ON RENDER ~
}

// #region DEBUGGING ~
// Define the 3D_DEBUG_SETTINGS array
const DEBUG_3D_SETTINGS: Array<{
  selector: string;
  property: string;
  rangeMult: number;
}> = [
  {
    selector: "#STAGE #SECTION-3D",
    property: "perspective",
    rangeMult: 1,
  },
  {
    selector: "#STAGE #SECTION-3D .canvas-layer",
    property: "x",
    rangeMult: 2,
  },
  {
    selector: "#STAGE #SECTION-3D .canvas-layer",
    property: "y",
    rangeMult: 2,
  },
  {
    selector: "#STAGE #SECTION-3D .canvas-layer",
    property: "z",
    rangeMult: 2,
  },
  {
    selector: "#STAGE #SECTION-3D .canvas-layer",
    property: "rotationX",
    rangeMult: 1,
  },
  {
    selector: "#STAGE #SECTION-3D .canvas-layer",
    property: "rotationY",
    rangeMult: 1,
  },
  {
    selector: "#STAGE #SECTION-3D .canvas-layer",
    property: "rotationZ",
    rangeMult: 1,
  },
  // Add more entries as needed
];

jQuery(function () {
  // Function to create the debugging panel
  function createDebugPanel() {
    const panel = document.createElement("div");
    panel.classList.add("debug-panel");
    panel.style.position = "fixed";
    panel.style.top = "10px";
    panel.style.left = "10px"; // Move to the left side
    panel.style.width = "400px"; // Double the width
    panel.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    panel.style.padding = "10px";
    panel.style.borderRadius = "5px";
    panel.style.zIndex = "10001";
    panel.style.color = "white";
    panel.style.fontFamily = "Arial, sans-serif";

    const sliderValues: Record<string, number> = {};

    // Add sliders for 3D settings
    DEBUG_3D_SETTINGS.forEach((config) => {
      const row = document.createElement("div");
      row.style.marginBottom = "10px";
      row.style.position = "relative";

      const label = document.createElement("label");
      label.textContent = `${config.property}: `;
      label.style.marginRight = "5px";

      const slider = document.createElement("input");
      slider.type = "range";

      const elements = document.querySelectorAll(config.selector);
      const initialValue =
        elements.length > 0
          ? (gsap.getProperty(
              elements[0] as Element,
              config.property,
            ) as number)
          : 0;
      console.log(`Initial value for ${config.property}: ${initialValue}`);

      const range = config.rangeMult * Math.abs(initialValue);
      slider.min = String(initialValue - range);
      slider.max = String(initialValue + range);
      slider.value = String(initialValue);

      sliderValues[config.property] = initialValue;

      const valueDisplay = document.createElement("span");
      valueDisplay.textContent = String(Math.round(initialValue));
      valueDisplay.style.marginLeft = "10px";
      valueDisplay.style.cursor = "pointer";
      valueDisplay.style.userSelect = "text";

      const resetButton = document.createElement("i");
      resetButton.className = "fas fa-undo";
      resetButton.style.position = "absolute";
      resetButton.style.right = "0";
      resetButton.style.top = "0"; // Align with the top of the row
      resetButton.style.transform = "translateY(0)"; // Remove vertical centering
      resetButton.style.cursor = "pointer";
      resetButton.style.color = "white";

      resetButton.addEventListener("click", () => {
        slider.value = String(initialValue);
        valueDisplay.textContent = String(Math.round(initialValue));
        elements.forEach((element) => {
          gsap.to(element, { [config.property]: initialValue });
        });
        sliderValues[config.property] = initialValue;
      });

      slider.addEventListener("input", () => {
        const value = parseFloat(slider.value);
        valueDisplay.textContent = String(Math.round(value));
        elements.forEach((element) => {
          gsap.to(element, { [config.property]: value });
        });
        sliderValues[config.property] = value;
      });

      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(valueDisplay);
      row.appendChild(resetButton);
      panel.appendChild(row);
    });

    // Add sliders for gradient settings
    const gradientSettings = [
      {
        label: "Circle Position X",
        property: "circlePositionX",
        initialValue: 25,
      },
      {
        label: "Circle Position Y",
        property: "circlePositionY",
        initialValue: 0,
      },
      {
        label: "Gradient Stop Percentage",
        property: "gradientStopPercentage",
        initialValue: 50,
      },
    ];

    const gradientValues: Record<string, number> = {};

    gradientSettings.forEach((setting) => {
      const row = document.createElement("div");
      row.style.marginBottom = "10px";
      row.style.position = "relative";

      const label = document.createElement("label");
      label.textContent = `${setting.label}: `;
      label.style.marginRight = "5px";

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "100";
      slider.value = String(setting.initialValue);

      gradientValues[setting.property] = setting.initialValue;

      const valueDisplay = document.createElement("span");
      valueDisplay.textContent = `${setting.initialValue}%`;
      valueDisplay.style.marginLeft = "10px";
      valueDisplay.style.cursor = "pointer";
      valueDisplay.style.userSelect = "text";

      const resetButton = document.createElement("i");
      resetButton.className = "fas fa-undo";
      resetButton.style.position = "absolute";
      resetButton.style.right = "0";
      resetButton.style.top = "0"; // Align with the top of the row
      resetButton.style.transform = "translateY(0)"; // Remove vertical centering
      resetButton.style.cursor = "pointer";
      resetButton.style.color = "white";

      resetButton.addEventListener("click", () => {
        slider.value = String(setting.initialValue);
        valueDisplay.textContent = `${setting.initialValue}%`;
        gradientValues[setting.property] = setting.initialValue;
        updateGradient();
      });

      slider.addEventListener("input", () => {
        const value = parseFloat(slider.value);
        valueDisplay.textContent = `${value}%`;
        gradientValues[setting.property] = value;
        updateGradient();
      });

      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(valueDisplay);
      row.appendChild(resetButton);
      panel.appendChild(row);
    });

    const updateGradient = () => {
      const { circlePositionX, circlePositionY, gradientStopPercentage } =
        gradientValues;
      const elements = document.querySelectorAll(
        "#STAGE #SECTION-3D .canvas-layer.under-layer",
      );
      elements.forEach((element) => {
        (element as HTMLElement).style.background =
          `radial-gradient(circle at ${circlePositionX}% ${circlePositionY}%, transparent, rgba(0, 0, 0, 0.9) ${gradientStopPercentage}%)`;
      });
    };

    const outputButton = document.createElement("button");
    outputButton.textContent = "Output Values";
    outputButton.style.marginTop = "10px";
    outputButton.style.width = "100%";
    outputButton.style.cursor = "pointer";

    outputButton.addEventListener("click", () => {
      const gradientString = `radial-gradient(circle at ${gradientValues["circlePositionX"]}% ${gradientValues["circlePositionY"]}%, transparent, rgba(0, 0, 0, 0.9) ${gradientValues["gradientStopPercentage"]}%)`;
      console.log("GSAP Timeline Data:", sliderValues);
      console.log("Gradient String:", gradientString);
      alert(
        `GSAP Timeline Data: ${JSON.stringify(sliderValues, null, 2)}\nGradient String: ${gradientString}`,
      );
    });

    panel.appendChild(outputButton);
    document.body.appendChild(panel);
  }

  setTimeout(() => {
    // Call the function to create the panel
    createDebugPanel();
  }, 4000);
});
// #endregion DEBUGGING ~
