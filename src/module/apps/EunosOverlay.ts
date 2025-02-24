// #region -- IMPORTS ~
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import {
  countdownUntil,
  tCase,
  verbalizeNum,
  objMap,
  padNum,
  isDocID,
  isDocUUID,
  getOwnerOfDoc,
  sortDocsByLastWord,
  getOwnedActors,
  getActorFromRef,
  camelCase,
  roundNum,
} from "../scripts/utilities";
import {
  LOADING_SCREEN_DATA,
  PRE_SESSION,
  MEDIA_PATHS,
  LOCATIONS,
  type Location,
  type PCs,
  CONTROL_SLIDER_PANELS,
  Sounds,
} from "../scripts/constants";
import type { EmptyObject } from "fvtt-types/utils";
import {
  GamePhase,
  UserTargetRef,
  AlertType,
  MediaLoadStatus,
  EunosMediaTypes,
  PCTargetRef,
} from "../scripts/enums";
import EunosSockets from "./EunosSockets";
import EunosAlerts from "./EunosAlerts";
import { AlertPaths } from "../scripts/svgdata";
import ItemDataAdvantage from "../data-model/ItemDataAdvantage";
import ItemDataDisadvantage from "../data-model/ItemDataDisadvantage";
import type EunosItem from "../documents/EunosItem";
import EunosMedia from "./EunosMedia";
import type ActorDataPC from "../data-model/ActorDataPC";
import type ActorDataNPC from "../data-model/ActorDataNPC";
// import AudioHelper from "../scripts/AudioHelper";
// #endregion -- IMPORTS ~

// #region Type Definitions ~
// Define a shared state object for coordinating filter values
interface AuroraState {
  baseHue: number; // Normal state hue
  glitchHue: number; // Glitch state hue
  glitchIntensity: number; // How dramatic the color shift is
  baseSaturation: number;
  glitchSaturation: number;
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
        type: AlertType.stability,
        header: `${pc.name} is ${conditionName}`,
        body: getBody(),
      });
    },
    criticalWoundClick(event: PointerEvent, target: HTMLElement) {
      const elem$ = $(target);
      const actorName = elem$.attr("data-actor-name");
      const woundName = elem$.attr("data-wound-name");
      if (!woundName) {
        getNotifier().error("No wound name found for criticalWoundClick");
        return;
      }
      if (!actorName) {
        throw new Error("No actor name found for criticalWoundClick");
      }
      void EunosSockets.getInstance().call("Alert", UserTargetRef.all, {
        type: AlertType.criticalWound,
        header: `${actorName} has Suffered a CRITICAL WOUND!`,
        body: `${actorName} has suffered a CRITICAL WOUND (${woundName}). Without immediate treatment, death is certain!`,
      });
    },
    seriousWoundClick(event: PointerEvent, target: HTMLElement) {
      const elem$ = $(target);
      const actorName = elem$.attr("data-actor-name");
      const woundName = elem$.attr("data-wound-name");
      if (!woundName) {
        getNotifier().error("No wound name found for seriousWoundClick");
        return;
      }
      if (!actorName) {
        throw new Error("No actor name found for seriousWoundClick");
      }
      void EunosSockets.getInstance().call("Alert", UserTargetRef.all, {
        type: AlertType.criticalWound,
        header: `${actorName} has Suffered a Serious Wound`,
        body: `${actorName} has suffered a Serious Wound (${woundName}), hampering their every action until it is tended to.`,
      });
    },
    async addCounter(event: PointerEvent, target: HTMLElement) {
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
      if (!itemData.hasCounter) {
        kLog.error("Item does not have counter", { itemId });
        return;
      }
      await item.update({
        system: { counterCount: (itemData.counterCount ?? 0) + 1 },
      });
      void EunosOverlay.instance.render({ parts: ["pcs", "pcsGM"] });
    },
    async spendCounter(event: PointerEvent, target: HTMLElement) {
      const elem$ = $(target).closest("[data-item-id]");
      const itemId = elem$.attr("data-item-id");
      const actorId = elem$.attr("data-actor-id");
      if (!itemId || !actorId) {
        kLog.error("No itemId or actorId found for spendCounter", {
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
      if (!itemData.hasCounter) {
        kLog.error("Item does not have counter", { itemId });
        return;
      }
      if ((itemData.counterCount ?? 0) <= 0) {
        return;
      }
      await item.update({
        system: { counterCount: (itemData.counterCount ?? 0) - 1 },
      });
      void EunosOverlay.instance.render({ parts: ["pcs", "pcsGM"] });
    },
    /**
     * Saves current values as new defaults and updates ranges
     */
    saveDefaults(event: PointerEvent, target: HTMLElement): void {
      void EunosOverlay.instance.render({ parts: ["locationPlottingPanel"] });
    },

    /**
     * Outputs current values to console and alert
     */
    outputValues(event: PointerEvent, target: HTMLElement): void {
      // Copy to clipboard
      void navigator.clipboard
        .writeText(`[
        {
          selector: "#STAGE",
          properties: {
            perspective: ${gsap.getProperty("#STAGE", "perspective")},
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.background-layer",
          properties: {
            backgroundPositionX: ${gsap.getProperty(
              "#STAGE #SECTION-3D .canvas-layer.background-layer",
              "background-position-x",
            )},
            backgroundPositionY: ${gsap.getProperty(
              "#STAGE #SECTION-3D .canvas-layer.background-layer",
              "background-position-y",
            )},
            filter: "${gsap.getProperty(
              "#STAGE #SECTION-3D .canvas-layer.background-layer",
              "filter",
            )} brightness(1.5)",
            transform: "${gsap.getProperty(
              "#STAGE #SECTION-3D .canvas-layer.background-layer",
              "transform",
            )}",
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform: "${gsap.getProperty(
              "#STAGE #SECTION-3D .canvas-layer.under-layer",
              "transform",
            )}",
            background: "${gsap.getProperty(
              "#STAGE #SECTION-3D .canvas-layer.under-layer",
              "background",
            )}",
          },
        },
      ]`)
        .then(() => {
          getNotifier().info("Location plotting values copied to clipboard");
        })
        .catch((err: unknown) => {
          console.error("Failed to copy to clipboard:", err);
          getNotifier().warn("Failed to copy to clipboard");
        });
      //     // Group settings by selector
      //     const transformsBySelector: Record<
      //       string,
      //       {
      //         selector: string;
      //         properties: Record<string, string | number>;
      //       }
      //     > = {};

      //     // Collect transform values
      //     CONTROL_SLIDER_PANELS.LOCATION_PLOTTING.forEach((config) => {
      //       const elements = document.querySelectorAll(config.selector);
      //       if (elements.length > 0) {
      //         if (!transformsBySelector[config.selector]) {
      //           transformsBySelector[config.selector] = {
      //             selector: config.selector,
      //             properties: {},
      //           };
      //         }
      //         let property = config.outputProperty ?? config.property;

      //         // Get the computed value based on property type
      //         let value: string | number;
      //         if (property.startsWith("--")) {
      //           // Handle CSS custom properties
      //           const computedStyle = getComputedStyle(elements[0]!);
      //           const rawValue = computedStyle.getPropertyValue(property).trim();
      //           const numValue = parseFloat(rawValue);
      //           value = !Number.isNaN(numValue) ? numValue : rawValue;
      //         } else {
      //           // Handle regular CSS properties
      //           const computedStyle = getComputedStyle(elements[0]!);
      //           const rawValue = computedStyle[camelCase(property) as keyof CSSStyleDeclaration] as string;
      //           const numValue = parseFloat(rawValue);
      //           value = !Number.isNaN(numValue) ? numValue : rawValue;
      //         }

      //         // Format property name for output
      //         if (property.startsWith("--") || /-| /g.test(property)) {
      //           property = `"${property}"`;
      //         } else {
      //           property = camelCase(property);
      //         }

      //         transformsBySelector[config.selector]!.properties[property] = value;
      //       }
      //     });

      //     // Format the output
      //     const output = `mapTransforms: [
      //   ${Object.values(transformsBySelector)
      //     .map(
      //       (transform) => `{
      //     selector: "${transform.selector}",
      //     properties: {
      //       ${Object.entries(transform.properties)
      //         .map(([key, value]) =>
      //           typeof value === "string"
      //             ? `${key}: "${value}"`
      //             : `${key}: ${value.toFixed(1)}`,
      //         )
      //         .join(",\n      ")}
      //     }
      //   }`,
      //     )
      //     .join(",\n  ")}
      // ]`;
      //     // Copy to clipboard
      //     void navigator.clipboard
      //       .writeText(output)
      //       .then(() => {
      //         getNotifier().info("Location plotting values copied to clipboard");
      //       })
      //       .catch((err: unknown) => {
      //         console.error("Failed to copy to clipboard:", err);
      //         getNotifier().warn("Failed to copy to clipboard");
      //       });

      //     // Send as whispered chat message
      //     // @ts-expect-error Again, bad typing on this
      //     void ChatMessage.create({
      //       content: `<pre>${output}</pre>`,
      //       whisper: [getUser().id],
      //     });
    },

    /**
     * Resets an individual control to its initial value
     */
    resetControl(event: PointerEvent, target: HTMLElement): void {
      const control = EunosOverlay.instance.overlay$
        .find(target)
        .closest(".control-row");
      const input = control.find("input[type='range']");
      const controlType = input.attr("data-control-type");
      const property = input.attr("data-property");

      if (!controlType || !property) return;

      let initialValue: number;
      switch (controlType) {
        case "transform":
          initialValue =
            EunosOverlay.instance.initialValues.transforms[property] ?? 0;
          break;
        case "background":
          initialValue =
            EunosOverlay.instance.initialValues.gradients[property] ?? 0;
          break;
        case "filter":
          initialValue =
            EunosOverlay.instance.initialValues.filters[property] ?? 0;
          break;
        default:
          return;
      }

      if (typeof initialValue !== "number") return;

      input.val(initialValue);
      input.trigger("input"); // Trigger input event to update display and apply changes
    },
    togglePCSpotlight(event: PointerEvent, target: HTMLElement): void {
      const pcID = target.dataset["actorId"];
      if (!pcID) {
        return;
      }
      void EunosOverlay.instance.togglePCSpotlight(pcID);
    },
    togglePCDimmed(event: PointerEvent, target: HTMLElement): void {
      const pcID = target.dataset["actorId"];
      if (!pcID) {
        return;
      }
      void EunosOverlay.instance.togglePCDimmed(pcID);
    },
    togglePCHidden(event: PointerEvent, target: HTMLElement): void {
      const pcID = target.dataset["actorId"];
      if (!pcID) {
        return;
      }
      void EunosOverlay.instance.togglePCHide(pcID);
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
      addCounter: EunosOverlay.ACTIONS.addCounter.bind(EunosOverlay),
      spendCounter: EunosOverlay.ACTIONS.spendCounter.bind(EunosOverlay),
      saveDefaults: EunosOverlay.ACTIONS.saveDefaults.bind(EunosOverlay),
      outputValues: EunosOverlay.ACTIONS.outputValues.bind(EunosOverlay),
      resetControl: EunosOverlay.ACTIONS.resetControl.bind(EunosOverlay),
      seriousWoundClick:
        EunosOverlay.ACTIONS.seriousWoundClick.bind(EunosOverlay),
      criticalWoundClick:
        EunosOverlay.ACTIONS.criticalWoundClick.bind(EunosOverlay),
      togglePCSpotlight:
        EunosOverlay.ACTIONS.togglePCSpotlight.bind(EunosOverlay),
      togglePCDimmed: EunosOverlay.ACTIONS.togglePCDimmed.bind(EunosOverlay),
      togglePCHidden: EunosOverlay.ACTIONS.togglePCHidden.bind(EunosOverlay),
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
    maxZIndexBars: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/max-zindex-bars.hbs",
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
    locationPlottingPanel: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/location-plotting-panel.hbs",
    },
    locations: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-locations.hbs",
    },
    npcs: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-npcs.hbs",
    },
    npcsGM: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-npcs-gm.hbs",
    },
    pcs: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-pcs.hbs",
    },
    pcsGM: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-pcs-gm.hbs",
    },
    mediaContainer: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/media-container.hbs",
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
        if (!getUser().isGM) {
          return;
        }
        if (!setting.key.endsWith("gamePhase")) {
          return;
        }
        if (typeof setting.value !== "string") {
          return;
        }
        const curValue = (setting.value as string).replace(/[^a-zA-Z]/g, "");
        if (!(curValue in GamePhase)) {
          return;
        }
        if (typeof newValue === "string") {
          newValue = newValue.replace(/[^a-zA-Z]/g, "") as GamePhase;
        }
        if (newValue === curValue) {
          return;
        }
        kLog.log("preUpdateSetting hook triggered", { curValue, newValue });
        if ((curValue as GamePhase) === this.#lastPhaseChange) {
          return;
        }
        this.#lastPhaseChange = curValue as GamePhase;
        void EunosSockets.getInstance().call("changePhase", UserTargetRef.all, {
          prevPhase: curValue as GamePhase,
          newPhase: newValue as GamePhase,
        });
      },
    );

    // Register hook to re-render when any PC actor is updated
    Hooks.on("updateActor", (actor: Actor) => {
      if (actor.type === "pc") {
        void EunosOverlay.instance.render({ parts: ["pcs", "pcsGM"] });
      }
    });

    await this.instance.render({ force: true });

    setTimeout(() => {
      this.instance.goToLocation(getSetting("currentLocation"), true);
    }, 500);

    if (!getUser().isGM) {
      return;
    }
    if (getSetting("isPlottingLocations")) {
      EunosOverlay.instance.showPlottingPanel();
    }
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

    preloadPreSessionSong: () => {
      void EunosOverlay.instance.sessionStartingSong.preload();
    },

    playPreSessionSong: () => {
      void EunosOverlay.instance.playPreSessionSong();
    },

    preloadIntroVideo: () => {
      void EunosOverlay.instance.preloadIntroVideo();
    },

    reportPreloadStatus: ({
      userId,
      status,
    }: {
      userId: string;
      status: MediaLoadStatus;
    }) => {
      if (!getUser().isGM) return;
      kLog.log("reportPreloadStatus", { userId, status });
      EunosOverlay.instance.updateVideoStatusPanel(userId, status);
    },

    refreshPCs: () => {
      void EunosOverlay.instance.render({ parts: ["pcs", "pcsGM"] });
    },

    startVideoPlayback: async () => {
      await EunosOverlay.instance.playIntroVideo();
    },

    requestMediaSync: async ({
      userId,
      mediaName,
    }: {
      userId: string;
      mediaName: string;
    }) => {
      const media = EunosMedia.GetMedia(mediaName);
      const timestamp = media.currentTime;
      kLog.log(`GM returning media timestamp: ${timestamp} for ${mediaName}`);
      void EunosSockets.getInstance().call("syncMedia", userId, {
        mediaName,
        timestamp,
      });
      return timestamp;
    },

    syncMedia: async ({
      mediaName,
      timestamp,
    }: {
      mediaName: string;
      timestamp: number;
    }) => {
      const media = EunosMedia.GetMedia(mediaName);
      const currentTime = media.currentTime;
      const timeDelta = Math.abs(timestamp - currentTime);
      if (timeDelta > 5) {
        kLog.log(
          `Setting media timestamp: ${timestamp} for ${mediaName} (timeDelta: ${timeDelta})`,
        );
        media.currentTime = timestamp;
      } else {
        kLog.log(
          `Media timestamp already synced: ${timestamp} for ${mediaName} (timeDelta: ${timeDelta})`,
        );
      }
    },

    setLocation: (data: { location: string }) => {
      EunosOverlay.instance.goToLocation(data.location);
    },
  };
  // #endregion SOCKET FUNCTIONS

  // #region DOM ELEMENT GETTERS ~
  #midZIndexMask: Maybe<HTMLElement>;
  #uiRight: Maybe<HTMLElement>;
  #canvasMask: Maybe<HTMLElement>;
  #canvasBars: Maybe<HTMLElement>;
  #topZIndexMask: Maybe<HTMLElement>;
  #maxZIndexBars: Maybe<HTMLElement>;
  #safetyButtons: Maybe<HTMLElement>;
  #alerts: Maybe<HTMLElement>;
  #countdownContainer: Maybe<HTMLElement>;
  #countdownAurora: Maybe<HTMLElement>;
  #redLightning: Maybe<HTMLElement>;
  #countdown: Maybe<HTMLElement>;
  #videoStatusPanel: Maybe<HTMLElement>;
  #locationPlottingPanel: Maybe<HTMLElement>;
  #stage: Maybe<HTMLElement>;
  #stage3D: Maybe<HTMLElement>;
  #pcs: Maybe<HTMLElement>;

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

  get maxZIndexBars$() {
    if (!this.#maxZIndexBars) {
      this.#maxZIndexBars = this.element.querySelector(
        ".max-zindex-bars",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#maxZIndexBars) {
      throw new Error("Max z-index bars not found");
    }
    return $(this.#maxZIndexBars);
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

  get countdownAurora$() {
    if (!this.#countdownAurora) {
      this.#countdownAurora = this.countdownContainer$.find(
        ".aurora-background",
      )[0] as Maybe<HTMLElement>;
    }
    if (!this.#countdownAurora) {
      throw new Error("Countdown aurora not found");
    }
    return $(this.#countdownAurora);
  }

  get redLightning$() {
    if (!this.#redLightning) {
      this.#redLightning = this.midZIndexMask$.find(
        ".red-lightning",
      )[0] as Maybe<HTMLElement>;
    }
    if (!this.#redLightning) {
      throw new Error("Red lightning not found");
    }
    return $(this.#redLightning);
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

  get locationPlottingPanel$() {
    if (!this.#locationPlottingPanel) {
      this.#locationPlottingPanel = this.element.querySelector(
        ".location-plotting-panel",
      ) as Maybe<HTMLElement>;
    }
    if (!this.#locationPlottingPanel) {
      throw new Error("Location plotting panel not found");
    }
    return $(this.#locationPlottingPanel);
  }

  get stage$() {
    if (!this.#stage) {
      this.#stage = this.element.querySelector("#STAGE") as Maybe<HTMLElement>;
    }
    if (!this.#stage) {
      throw new Error("Stage not found");
    }
    return $(this.#stage);
  }

  get stage3D$() {
    if (!this.#stage3D) {
      this.#stage3D = this.stage$.find("#SECTION-3D")[0] as Maybe<HTMLElement>;
    }
    if (!this.#stage3D) {
      throw new Error("Stage 3D not found");
    }
    return $(this.#stage3D);
  }

  get pcs$() {
    if (!this.#pcs) {
      this.#pcs = this.element.querySelector("#PCS") as Maybe<HTMLElement>;
    }
    if (!this.#pcs) {
      throw new Error("PCS not found");
    }
    return $(this.#pcs);
  }

  // #endregion DOM ELEMENT GETTERS

  // #region ===== PRE-SESSION MANAGEMENT & GAME PHASE CONTROL =====
  // #region COUNTDOWN ~
  #countdownTimer: Maybe<number>;
  #glitchTimeline: Maybe<gsap.core.Timeline>;
  #countdownContainerTimeline: Maybe<gsap.core.Timeline>;
  #isCountdownContainerTimelinePlaying = false;

  public async getGlitchRepeatDelay(): Promise<number> {
    const songDuration = await this.getPreSessionSongDuration();
    const timeRemaining = this.timeRemaining;
    const maxDur = PRE_SESSION.GLITCH_REPEAT_DELAY_MAX;
    const minDur = PRE_SESSION.GLITCH_REPEAT_DELAY_MIN;

    // If presession song has not started playing, return max delay
    if (timeRemaining > songDuration) {
      return maxDur;
    }

    // Otherwise, interpolate between min and max delay based on time remaining
    const delay = Math.min(
      maxDur,
      minDur + (maxDur - minDur) * (timeRemaining / songDuration),
    );
    return delay;
  }

  private async buildCountdownContainerTimeline(): Promise<gsap.core.Timeline> {
    const duration = await this.getPreSessionSongDuration();
    const timeOffset = Math.max(0, duration - this.timeRemaining);

    // Progressive intensity increase
    gsap.to(this.auroraState, {
      duration,
      glitchHue: 180, // More extreme red shift
      glitchIntensity: 0.8, // More dramatic effect
      baseHue: 20, // Slight red tint in normal state
      glitchSaturation: 2, // More saturated during glitches
      baseSaturation: 1.3, // Slightly more saturated base state
      ease: "power2.in",
    });

    kLog.log("buildCountdownContainerTimeline", duration, timeOffset);

    this.#countdownContainerTimeline = gsap
      .timeline()
      .fromTo(
        this.countdownContainer$,
        {
          filter: "drop-shadow(rgba(0, 0, 0, 0.55) 0px 0px 0px)",
        },
        {
          top: "50%",
          filter: "drop-shadow(rgba(0, 0, 0, 0.55) 100px 100px 5px)",
          scale: 3,
          duration,
          ease: "power4.inOut",
        },
      )
      .to(
        this.redLightning$,
        {
          autoAlpha: 1,
          duration: 0.1,
          ease: "none",
        },
        ">-20%",
      )
      .fromTo(
        this.countdownAurora$,
        {
          autoAlpha: 0,
        },
        {
          autoAlpha: 1,
          duration: duration, // Fade in during first 30% of animation
          ease: "power4.in",
        },
        0, // Start at beginning of timeline
      )
      .to(
        [this.redLightning$, this.countdownAurora$],
        {
          autoAlpha: 0,
        },
        "-=2",
      );

    this.#isCountdownContainerTimelinePlaying = true;
    return this.#countdownContainerTimeline.seek(timeOffset);
  }

  private auroraState: AuroraState = {
    baseHue: 0, // Starting at natural color
    glitchHue: 140, // Shift towards red
    glitchIntensity: 0.3, // Initial intensity
    baseSaturation: 1,
    glitchSaturation: 1.2,
  };

  private buildGlitchTimeline(repeatDelay: number): gsap.core.Timeline {
    const glitchText$ = this.countdown$.find(".glitch-text");
    const glitchTop$ = this.countdown$.find(".glitch-top");
    const glitchBottom$ = this.countdown$.find(".glitch-bottom");

    this.#glitchTimeline = gsap
      .timeline({
        repeat: -1,
        repeatDelay,
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

      .to(glitchTop$, { duration: 0.5, x: -30, ease: "power4.inOut" }, "split")
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

    const aurora$ = this.countdownAurora$.find(".aurora");

    this.#glitchTimeline
      .to(
        aurora$,
        {
          duration: 0.1,
          filter: "brightness(2.5)",
          ease: "power2.inOut",
        },
        "split",
      )
      .to(
        aurora$,
        {
          duration: 0.2,
          filter: "brightness(1)",
          ease: "power2.in",
        },
        "+=0.1",
      );

    return this.#glitchTimeline.seek(0);
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
    // Update countdown immediately
    kLog.log("initializeCountdown -> updateCountdown");
    await this.updateCountdown();
  }

  private async killCountdown(isStopping = false, isHiding = false) {
    kLog.log("killCountdown");
    if (isStopping && this.#countdownTimer) {
      window.clearInterval(this.#countdownTimer);
      this.#countdownTimer = undefined;
    }
    await this.#countdownContainerTimeline?.seek(0).kill();
    await this.#glitchTimeline?.seek(0).kill();
    this.countdownContainer$.removeAttr("style"); // Remove style attribute from the container
    this.countdownContainer$.find("*").removeAttr("style"); // Remove style attribute from all descendants
    this.#isCountdownContainerTimelinePlaying = false;
    if (isHiding) {
      this.countdownContainer$.css("visibility", "hidden");
    }
    this.#countdownContainerTimeline = undefined;
    this.#glitchTimeline = undefined;
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

  #timeRemaining: Maybe<number> = undefined;
  #durationOfSong: Maybe<number> = undefined;
  #isCountdownHidden = false;
  #areAppElementsFaded = false;
  #areLoadingScreenImagesStopped = false;
  // #isCountdownContainerTimelineSynced = false;
  #isPreSessionSongPlaying = false;
  #isPreSessionSongSynced = false;

  get timeRemaining(): number {
    if (typeof this.#timeRemaining !== "number") {
      this.#timeRemaining = this.updateCountdownText().totalSeconds;
    }
    return this.#timeRemaining;
  }
  async getPreSessionSongDuration(): Promise<number> {
    if (typeof this.#durationOfSong !== "number") {
      this.#durationOfSong = await this.sessionStartingSong.getDuration();
    }
    return this.#durationOfSong;
  }

  private async syncCountdownContainerTimeline() {
    const preSessionSongDuration = await this.getPreSessionSongDuration();
    const countdownProgress = 1 - this.timeRemaining / preSessionSongDuration;
    this.#countdownContainerTimeline?.progress(countdownProgress);
  }

  /** Updates the countdown display and handles pre-session sequence */
  private async updateCountdown(): Promise<void> {
    this.#timeRemaining = this.updateCountdownText().totalSeconds;
    const preSessionSongDuration = await this.getPreSessionSongDuration();

    if (
      this.#isCountdownContainerTimelinePlaying &&
      this.timeRemaining % 5 === 0
    ) {
      void this.syncCountdownContainerTimeline();
    }

    if (this.#isPreSessionSongPlaying && !this.#isPreSessionSongSynced) {
      const preSessionSongCurrentTime =
        preSessionSongDuration - this.#timeRemaining;
      kLog.log(`Pre-session song current time: ${preSessionSongCurrentTime}`);
      this.sessionStartingSong.currentTime = preSessionSongCurrentTime;
      this.#isPreSessionSongSynced = true;
    }
    if (this.#isPreSessionSongSynced && this.#glitchTimeline?.isActive()) {
      const newRepeatDelay = await this.getGlitchRepeatDelay();
      if (
        Math.abs(
          newRepeatDelay - (this.#glitchTimeline?.repeatDelay() ?? Infinity),
        ) > 2
      ) {
        kLog.log(`updateCountdown -> newRepeatDelay: ${newRepeatDelay}`);
        this.#glitchTimeline.repeatDelay(newRepeatDelay);
      }
    }

    // T-LOAD_SESSION time: Set gamePhase to SESSION LOADING
    if (
      this.timeRemaining <= PRE_SESSION.LOAD_SESSION &&
      getSetting("gamePhase") === GamePhase.SessionClosed
    ) {
      kLog.log("updateCountdown -> set gamePhase to SESSION LOADING");
      await setSetting("gamePhase", GamePhase.SessionLoading);
      return;
    }

    // T-1 secs: Hide Countdown, fade in topZIndexMask & video
    if (
      this.timeRemaining <= PRE_SESSION.COUNTDOWN_HIDE &&
      !this.#isCountdownHidden
    ) {
      kLog.log("updateCountdown -> killCountdown (COUNTDOWN HIDE)");
      setTimeout(() => {
        void this.killCountdown(true, true).then(() => {
          void this.fadeInIntroVideo();
        });
      }, 1000);
      this.#isCountdownHidden = true;
      setTimeout(
        () => {
          this.#isCountdownHidden = false;
        },
        5 * 60 * 1000, // 5 minutes
      );
      return;
    }

    // T-30 secs: Kill canvas mask listeners, fade out .app elements
    if (
      this.timeRemaining <= PRE_SESSION.FREEZE_OVERLAY &&
      !this.#areAppElementsFaded
    ) {
      kLog.log("updateCountdown -> freezeOverlay");
      this.freezeOverlay();
      this.#areAppElementsFaded = true;
      return;
    }

    // T-60 secs: Stop loading screen images, decrease glitch delay
    if (
      (this.#countdownContainerTimeline?.progress() ?? 0) >= 0.45 &&
      !this.#areLoadingScreenImagesStopped
    ) {
      kLog.log("updateCountdown -> stopLoadingScreenImages");
      void this.killLoadingScreenItems();
      this.#areLoadingScreenImagesStopped = true;
      this.#glitchTimeline?.repeatDelay(
        0.5 * (this.#glitchTimeline?.repeatDelay() ?? Infinity),
      );
      return;
    }

    // T-<Song Duration> secs: Begin glitch AND container timelines
    if (
      this.timeRemaining <= preSessionSongDuration &&
      !this.#isCountdownContainerTimelinePlaying
    ) {
      kLog.log("updateCountdown -> beginGlitchAndContainerTimelines");
      this.buildGlitchTimeline(await this.getGlitchRepeatDelay()).play();
      ((await this.buildCountdownContainerTimeline()) as gsap.core.Timeline)[
        "play"
      ]();
      this.#isCountdownContainerTimelinePlaying = true;
      setTimeout(() => {
        void this.killSessionClosedAmbientAudio();
      }, 10000);
      return;
    } else if (
      this.timeRemaining > preSessionSongDuration &&
      this.timeRemaining < 1000 &&
      (this.#glitchTimeline || this.#countdownContainerTimeline)
    ) {
      kLog.display("updateCountdown -> killCountdown");
      void this.killCountdown(false, false);
    }
  }
  // #endregion COUNTDOWN ~

  // #region SESSION CLOSED AMBIENT AUDIO ~

  #ambientAudio?: EunosMedia<EunosMediaTypes.audio>;

  getAmbientAudio(isCreating = true): EunosMedia<EunosMediaTypes.audio> {
    if (!this.#ambientAudio) {
      this.#ambientAudio = EunosMedia.Sounds.get("session-closed-ambience");
    }
    if (!this.#ambientAudio && isCreating) {
      this.#ambientAudio = new EunosMedia("session-closed-ambience", {
        type: EunosMediaTypes.audio,
        path: MEDIA_PATHS.PRESESSION_AMBIENT_AUDIO,
        volume: 0.5,
        autoplay: true,
        loop: true,
        alwaysPreload: false,
        reportPreloadStatus: false,
      });
    }
    if (!this.#ambientAudio) {
      throw new Error("Ambient audio not found, not instructed to create it.");
    }
    return this.#ambientAudio;
  }

  private async initializeAmbientAudio(): Promise<void> {
    try {
      await this.getAmbientAudio().play();
    } catch (error: unknown) {
      kLog.error("Failed to play ambient audio", error);
    }
  }

  private async killSessionClosedAmbientAudio(): Promise<void> {
    // if (!this.#ambientAudio) { return; }
    await this.getAmbientAudio(false).kill();
    // this.#ambientAudio = undefined;
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
      await this.killLoadingScreenItems();

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

  private async killLoadingScreenItems(): Promise<void> {
    // Kill the rotation interval
    window.clearInterval(this.#loadScreenRotationTimer);

    // Fade out current loading screen item
    const currentItem = this.#loadingScreenItems.get(
      this.#currentLoadingScreenItem ?? "",
    );
    if (currentItem?.[0]) {
      gsap.to(currentItem[0], {
        autoAlpha: 0,
        duration: 0.5,
        ease: "power2.inOut",
      });
      setTimeout(() => {
        currentItem.attr("style", "");
      }, 15000);
    }

    // Wait for any currently-running timeline to complete
    const currentTimeline = this.#loadingScreenItemTimelines.get(
      this.#currentLoadingScreenItem ?? "",
    );
    if (currentTimeline?.isActive()) {
      await currentTimeline.timeScale(5);
      currentTimeline.seek(0).kill();
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
  #sessionStartingSong: Maybe<EunosMedia<EunosMediaTypes.audio>>;
  #sessionStartingSongTimeout: Maybe<number>;
  get sessionStartingSong(): EunosMedia<EunosMediaTypes.audio> {
    if (!this.#sessionStartingSong) {
      const songIndex = (getSetting("chapterNumber") ?? 1) - 1;
      const songName = Object.keys(Sounds.PreSessionSongs)[songIndex] as Maybe<
        KeyOf<typeof Sounds.PreSessionSongs>
      >;
      if (!songName) {
        throw new Error(
          `No song defined for Chapter ${getSetting("chapterNumber")} in Pre-Session Tracks playlist`,
        );
      }
      this.#sessionStartingSong = new EunosMedia(songName, {
        ...Sounds.PreSessionSongs[songName],
        type: EunosMediaTypes.audio,
        alwaysPreload: true,
      });
    }
    return this.#sessionStartingSong;
  }

  /** Schedules playing of the pre-session song based on its duration */
  private async initializePreSessionSong(): Promise<void> {
    const timeRemaining = this.timeRemaining;
    const preSessionSong = this.sessionStartingSong;
    const duration = await preSessionSong.getDuration();

    kLog.log(
      `Initializing Pre-Session Song: timeRemaining: ${padNum(timeRemaining / 60, 0)}:${padNum(timeRemaining % 60, 0)}, songDuration: ${padNum(duration / 60, 0)}:${padNum(duration % 60, 0)}`,
    );

    if (timeRemaining <= duration) {
      if (!getUser().isGM) {
        void this.playPreSessionSong();
        return;
      } else {
        void EunosSockets.getInstance().call(
          "playPreSessionSong",
          UserTargetRef.all,
        );
        return;
      }
    } else {
      if (!getUser().isGM) {
        void this.sessionStartingSong.preload();
        return;
      }
      void EunosSockets.getInstance().call(
        "preloadPreSessionSong",
        UserTargetRef.all,
      );
      const delay = timeRemaining - duration;
      kLog.log(
        `playing song in ${padNum(delay / 60, 0)}:${padNum(delay % 60, 0)}`,
      );
      this.#sessionStartingSongTimeout = window.setTimeout(() => {
        void EunosSockets.getInstance().call(
          "playPreSessionSong",
          UserTargetRef.all,
        );
      }, delay * 1000);
    }
  }
  /** Plays the pre-session song */
  async playPreSessionSong(): Promise<void> {
    void this.killSessionClosedAmbientAudio();
    void this.sessionStartingSong.play();
    this.#isPreSessionSongPlaying = true;
  }

  async killPreSessionSong(): Promise<void> {
    if (this.#sessionStartingSongTimeout) {
      window.clearTimeout(this.#sessionStartingSongTimeout);
      this.#sessionStartingSongTimeout = undefined;
    }
    this.#isPreSessionSongPlaying = false;
    return this.sessionStartingSong.kill();
  }
  // #endregion PRE-SESSION SONG ~

  // #region FREEZING OVERLAY ~
  private freezeOverlay(): void {
    $(document)
      .off("mousemove.overlaySidebar")
      .off("mouseleave.overlaySidebar");
    const appElements: HTMLElement[] = $(".app").toArray();
    gsap
      .timeline()
      .set(appElements, {
        pointerEvents: "none",
      })
      .to(appElements, {
        autoAlpha: 0,
        duration: 0.5,
      });
    this.sidebarTimeline.reverse();
  }

  private unfreezeOverlay(): void {
    this.addCanvasMaskListeners();
    const appElements: HTMLElement[] = $(".app").toArray();
    gsap
      .timeline()
      .set(appElements, {
        pointerEvents: "auto", // Reset pointer events back to default
      })
      .to(appElements, {
        autoAlpha: 1,
        duration: 0.5,
      });
  }

  // #endregion FREEZING OVERLAY ~

  // #region INTRO VIDEO ~
  #introVideo: Maybe<EunosMedia<EunosMediaTypes.video>>;
  get introVideo(): EunosMedia<EunosMediaTypes.video> {
    if (!this.#introVideo) {
      this.#introVideo = new EunosMedia("intro-video", {
        path: "modules/eunos-kult-hacks/assets/video/something-unholy-intro.webm",
        type: EunosMediaTypes.video,
        parentSelector: "#TOP-ZINDEX-MASK",
        autoplay: false,
        loop: false,
        mute: false,
        volume: 1,
        alwaysPreload: true,
        reportPreloadStatus: true,
      });
    }
    return this.#introVideo;
  }
  /** Initializes video preloading with user interaction handling */
  private async preloadIntroVideo(): Promise<void> {
    try {
      await this.introVideo.preload();
    } catch (error) {
      kLog.error("Failed to preload intro video:", error);
    }
  }

  /** Initiates video preloading for all users */
  private initializeVideoPreloading(): void {
    if (!getUser().isGM) return;
    void EunosSockets.getInstance().call(
      "preloadIntroVideo",
      UserTargetRef.all,
    );
    this.confirmChapterTitle();
  }

  private confirmChapterTitle(): void {
    const chapterTitle = getSetting("chapterTitle");
    const chapterNum = getSetting("chapterNumber");

    new Dialog({
      title: "Confirm Chapter",
      content: `
            <div class="form-group">
                <label>Chapter:</label>
                <input type="number" name="chapter" value="${chapterNum}">
            </div>
            <div class="form-group">
                <label>Title:</label>
                <input type="text" name="title" value="${chapterTitle}">
            </div>
        `,
      buttons: {
        ok: {
          label: "Ok",
          callback: (html) => {
            const chapter = $(html).find("[name=chapter]").val() as number;
            const title = $(html).find("[name=title]").val() as string;
            if (chapter !== chapterNum) {
              void setSetting("chapterNumber", chapter);
            }
            if (title !== chapterTitle) {
              void setSetting("chapterTitle", title);
            }
          },
        },
      },
    }).render(true);
  }

  async animateOutBlackBars() {
    const topBar$ = this.maxZIndexBars$.find(".canvas-mask-bar-top");
    const bottomBar$ = this.maxZIndexBars$.find(".canvas-mask-bar-bottom");

    const tl = gsap.timeline();

    tl.to(
      topBar$,
      {
        height: 0,
        duration: 5,
        ease: "none",
      },
      0,
    ).to(
      bottomBar$,
      {
        height: 0,
        duration: 5,
        ease: "none",
      },
      0,
    );

    return tl;
  }

  async animateSessionTitle(
    chapter?: string,
    title?: string,
  ): Promise<gsap.core.Timeline> {
    chapter = chapter ?? tCase(verbalizeNum(getSetting("chapterNumber")));
    title = title ?? getSetting("chapterTitle");

    const instance = EunosOverlay.instance;
    const chapterElem$ = instance.topZIndexMask$.find(".chapter-number");
    const horizRule$ = instance.topZIndexMask$.find(".horiz-rule");
    const titleElem$ = instance.topZIndexMask$.find(".chapter-title");

    chapterElem$.text(`Chapter ${chapter}`);
    titleElem$.text(title);

    const tl = gsap.timeline();

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
      )
      .to(
        [
          instance.topZIndexMask$[0],
          instance.maxZIndexBars$[0],
          instance.midZIndexMask$[0],
        ],
        {
          autoAlpha: 0,
          duration: 1,
          ease: "none",
        },
        "-=1",
      );

    return tl;
  }

  /** Fades in the topZIndexMask and the intro video */
  private async fadeInIntroVideo(): Promise<void> {
    kLog.log("Fading in intro video");
    await gsap
      .timeline()
      .set(this.maxZIndexBars$, { zIndex: 10001 })
      .to(this.topZIndexMask$, {
        autoAlpha: 1,
        duration: 1,
      })
      .to(this.midZIndexMask$, {
        autoAlpha: 0,
        duration: 0.25,
      });
  }

  /** Plays the intro video from the start */
  public async playIntroVideo(): Promise<void> {
    // Reset volume in case it was faded out
    this.introVideo.volume = 1;

    // Add ended event listener before playing
    this.introVideo.element.addEventListener(
      "ended",
      () =>
        void (async () => {
          kLog.log("Video playback complete");
          // await this.fadeOutIntroVideo();
          if (getUser().isGM) {
            void setSetting("gamePhase", GamePhase.SessionRunning);
          }
        })(),
      { once: true },
    );

    void this.animateOutBlackBars();

    await this.introVideo.play();
    if (!getUser().isGM) {
      void EunosSockets.getInstance().call(
        "requestMediaSync",
        UserTargetRef.gm,
        {
          mediaName: "intro-video",
          userId: getUser().id!,
        },
      );
    }

    // Schedule playback of session quote
    const sessionQuoteName = `quote-session-${getSetting("chapterNumber")}`;
    const sessionQuote = EunosMedia.GetMedia(sessionQuoteName);
    if (sessionQuote) {
      setTimeout(() => {
        void sessionQuote.play();
      }, 2000);
    }

    // Schedule animation of the title
    const videoDuration = await this.introVideo.getDuration();
    const currentVideoTime = this.introVideo.currentTime;
    const titleDisplayOffset = PRE_SESSION.CHAPTER_TITLE_DISPLAY_VIDEO_OFFSET;
    const titleDisplayTime =
      videoDuration - titleDisplayOffset - currentVideoTime;
    setTimeout(() => {
      void this.animateSessionTitle().then(() => {
        if (getUser().isGM) {
          void setSetting("gamePhase", GamePhase.SessionRunning);
        }
      });
    }, titleDisplayTime * 1000);
  }

  private async killIntroVideo(): Promise<void> {
    await gsap.to(
      [this.topZIndexMask$[0], this.maxZIndexBars$[0], this.midZIndexMask$[0]],
      {
        autoAlpha: 0,
        duration: 0.5,
        ease: "power1.out",
      },
    );
    await this.introVideo.kill();
  }

  // #region GM Video Status Panel ~

  /** Updates the video status panel */
  public videoLoadStatus: Map<string, MediaLoadStatus> = new Map<
    string,
    MediaLoadStatus
  >();

  private updateVideoStatusPanel(
    userId: string,
    status: MediaLoadStatus,
  ): void {
    if (!getUser().isGM) return;

    const allUsers = getUsers();
    for (const user of allUsers) {
      if (user.id === userId) {
        this.videoLoadStatus.set(user.id, status);
      } else if (!this.videoLoadStatus.has(user.id!)) {
        this.videoLoadStatus.set(user.id!, MediaLoadStatus.PreloadNotRequested);
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
    setTimeout(() => {
      addClassToDOM("interface-ready");
    }, 1000);
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
  }

  async syncPhase() {
    // Get current game phase from settings.
    const gamePhase = getSetting("gamePhase");
    kLog.log(`Syncing phase: ${gamePhase}`);
    // Add the appropriate class based on the game phase.
    setTimeout(() => {
      addClassToDOM("interface-ready");
    }, 1000);
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
      this.initializePreSessionSong(),
      this.preloadIntroVideo(),
    ]);
    // this.addStartVideoButtonListeners();
  }

  private async cleanup_SessionLoading(): Promise<void> {
    await this.killCountdown(true);
    void this.killLoadingScreenItems();
    void this.killPreSessionSong();
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
    await this.playIntroVideo();
  }

  private async cleanup_SessionStarting(): Promise<void> {
    await this.killIntroVideo();
    this.unfreezeOverlay();
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

  // #region PC PANEL ~

  private PCsGlobalSettingsData: Array<PCs.GlobalSettingsData> = [];
  private getPCsGlobalSettingsData(): Array<PCs.GlobalSettingsData> {
    if (this.PCsGlobalSettingsData.length > 0) {
      return this.PCsGlobalSettingsData;
    }
    const ownedActors = getOwnedActors();
    for (const actor of ownedActors) {
      this.PCsGlobalSettingsData.push({
        actorID: actor.id!,
        ownerID: getOwnerOfDoc(actor)!.id!,
      });
    }
    return this.PCsGlobalSettingsData;
  }
  /**
   * Gathers and memoizes PC data that is common across all locations.
   * The owner's character is also marked as isOwner, and any actors whose owners are offline are marked as isMasked.
   *
   * @returns An array of PCs sorted by slot number, except for the owner, who is always at the center of the array.
   */
  private PCsGlobalData: Record<"1"|"2"|"3"|"4"|"5", PCs.GlobalData> = {} as Record<"1"|"2"|"3"|"4"|"5", PCs.GlobalData>;
  private getPCsGlobalData(): Record<"1"|"2"|"3"|"4"|"5", PCs.GlobalData> {
    if (Object.keys(this.PCsGlobalData).length > 0) {
      return this.PCsGlobalData;
    }
    const staticData = this.getPCsGlobalSettingsData();
    const fullData: Array<Omit<PCs.GlobalData, "slot">> = [];
    for (const data of staticData) {
      const actor = getActors().find((a) => a.id === data.actorID) as Maybe<EunosActor & {system: ActorDataPC}>;
      if (!actor) {
        throw new Error(`Actor ${data.actorID} not found`);
      }
      const owner = getOwnerOfDoc(actor);
      if (!owner) {
        throw new Error(`Owner of actor ${actor.id} not found`);
      }
      fullData.push({
        ...data,
        actor,
        owner,
        isOwner: owner.id === getUser().id,
        isMasked: !owner.active,
      });
    }

    // Iterate through and, if any actor's owner is the current user, remove it from the array and assign it to myActor
    const myActorIndex = fullData.findIndex((data) => data.isOwner);
    if (myActorIndex !== -1) {
      const myActor = fullData.splice(myActorIndex, 1)[0]!;
      // Now insert myActor into the middle of the array
      fullData.splice(Math.floor(fullData.length / 2), 0, myActor);
    }
    // With the actors sorted, assign slot data and online data, format as a record
    const dataRecord: Partial<Record<"1"|"2"|"3"|"4"|"5", PCs.GlobalData>> = {};
    Object.values(fullData).forEach((data, index) => {
      dataRecord[String(index + 1) as "1" | "2" | "3" | "4" | "5"] = {
        ...data,
        slot: String(index + 1) as "1" | "2" | "3" | "4" | "5"
      };
    });
    this.PCsGlobalData = dataRecord as Record<"1"|"2"|"3"|"4"|"5", PCs.GlobalData>;
    return this.PCsGlobalData;
  }

  private getDefaultLocationPCData(): Array<Location.PCData.SettingsData> {
    const pcGlobalData = this.getPCsGlobalData();
    const pcData: Array<Location.PCData.SettingsData> = [];
    Object.values(pcGlobalData).forEach((data) => {
      pcData.push({
        ...data,
        isSpotlit: false,
        isDimmed: false,
        isHidden: false,
      });
    });
    return pcData;
  }

  private async setLocationPCData(
    location: string,
    fullData: Location.PCData.FullData
  ) {
    const locationFullData = this.getLocationData(location);
    locationFullData.pcData[fullData.slot] = fullData;
    await this.setLocationData(location, locationFullData);
  }

  public async setLocationPCValue(
    location: string,
    pcRef: number | string | EunosActor,
    dotKey: string,
    value: unknown,
  ) {
    const locationPCData = this.getLocationDataForPC(location, pcRef);
    const curVal: unknown = foundry.utils.getProperty(locationPCData, dotKey);
    if (curVal === value) {
      return;
    }
    foundry.utils.setProperty(locationPCData, dotKey, value);
    await this.setLocationPCData(location, locationPCData);
  }


  private pcPortraitTimelines: Record<"1"|"2"|"3"|"4"|"5", Record<string, gsap.core.Timeline>> = {} as Record<"1"|"2"|"3"|"4"|"5", Record<string, gsap.core.Timeline>>;

  private buildIsHiddenTimeline(slot: "1" | "2" | "3" | "4" | "5"): gsap.core.Timeline {
    if (Object.keys(this.pcPortraitTimelines[slot]).length > 0) {
      if (!this.pcPortraitTimelines[slot]["isHidden"]) {
        throw new Error(`'buildIsHiddenTimelines' have been created, but timeline for slot ${slot} not found`);
      }
      return this.pcPortraitTimelines[slot]["isHidden"];
    }
    const chainSelector = `#PCS .pc-container[data-slot="${slot}"] .chain`;
    const portraitSelector = `#PCS .pc-container[data-slot="${slot}"] .pc-portrait-container`;
    const tl = gsap.timeline({paused: true});
    tl.addLabel("startFalse")
      .to(chainSelector, {autoAlpha: 1, duration: 0})
      .to(portraitSelector, {filter: "brightness(1) blur(0)", duration: 0, ease: "none"}, 0)
      .fromTo(chainSelector, {y: -1000}, {y: 100, duration: 1, ease: "bounce.out"}, 0)
      .to(portraitSelector, {rotate: 5, duration: 0.1, ease: "power3.out"}, ">-0.2")
      .to(chainSelector, {y: -1000, duration: 1.5, ease: "power2.out"}, 1)
      .to(portraitSelector, {y: -1000, duration: 1, ease: "power4.out"}, 1)
      .to(chainSelector, {autoAlpha: 0, duration: 0.25, ease: "power3.out"}, 1.75)
      // .to(portrait, {scale: 0.7, duration: 0.5, ease: "power2.out"}, 1)
      .to(portraitSelector, {filter: "brightness(0.2) blur(5px)", ease: "power2.out", duration: 0.5}, 1)
      .to([chainSelector, portraitSelector], {autoAlpha: 0, duration: 0.1, ease: "none"}, ">-0.1")
      .addLabel("true")
      .addLabel("startTrue")
      .to([chainSelector, portraitSelector], {autoAlpha: 1, duration: 0.1, ease: "none"})
      .to(portraitSelector, {y: 0, duration: 1, ease: "bounce.out"}, "<")
      .to(portraitSelector, {scale: 1, filter: "brightness(1) blur(0px)", ease: "power2.out", duration: 0.5}, "<")
      .to(chainSelector, {y: 100, duration: 3, ease: "bounce.out"}, "<")
      .to(portraitSelector, {rotate: 0, duration: 0.2, ease: "power2.out"})
      .to(chainSelector, {y: -1000, duration: 1, ease: "power4.out"})
      .to(chainSelector, {autoAlpha: 0, duration: 0.1, ease: "none"}, ">-0.1")
      .addLabel("false");
    return tl;
  }

  private buildIsSpotlitTimeline(slot: "1" | "2" | "3" | "4" | "5"): gsap.core.Timeline {
    const chain = this.pcs$.find(`[data-slot="${slot}"] .chain`)[0];
    if (!chain) {
      throw new Error(`Chain for slot ${slot} not found`);
    }
    return gsap.timeline({paused: true});

  }

  private buildIsDimmedTimeline(slot: "1" | "2" | "3" | "4" | "5"): gsap.core.Timeline {
    const chain = this.pcs$.find(`[data-slot="${slot}"] .chain`)[0];
    if (!chain) {
      throw new Error(`Chain for slot ${slot} not found`);
    }
    return gsap.timeline({paused: true});
  }

  private buildIsMaskedTimeline(slot: "1" | "2" | "3" | "4" | "5"): gsap.core.Timeline {
    const chain = this.pcs$.find(`[data-slot="${slot}"] .chain`)[0];
    if (!chain) {
      throw new Error(`Chain for slot ${slot} not found`);
    }
    return gsap.timeline({paused: true});
  }


  public buildPCPortraitTimelines() {
    (["1", "2", "3", "4", "5"] as const).forEach((slot) => {
      this.pcPortraitTimelines[slot] = {} as Record<string, gsap.core.Timeline>;
      this.pcPortraitTimelines[slot]["isHidden"] = this.buildIsHiddenTimeline(slot);
      this.pcPortraitTimelines[slot]["isSpotlit"] = this.buildIsSpotlitTimeline(slot);
      this.pcPortraitTimelines[slot]["isDimmed"] = this.buildIsDimmedTimeline(slot);
      this.pcPortraitTimelines[slot]["isMasked"] = this.buildIsMaskedTimeline(slot);
    });
  }

  public async togglePCSpotlight(pcID: IDString, isSpotlit?: boolean) {
    const pcData = this.getLocationDataForPC(getSetting("currentLocation"), pcID);
    if (!pcData) {
      kLog.error(`PC ${pcID} not found`);
      return;
    }
    pcData.isSpotlit = isSpotlit ?? !pcData.isSpotlit;
    await this.setLocationPCData(getSetting("currentLocation"), pcData);
  }

  public async togglePCHide(pcID: IDString, isHidden?: boolean): Promise<void> {
    const pcData = this.getLocationDataForPC(getSetting("currentLocation"), pcID);
    if (!pcData) {
      kLog.error(`PC ${pcID} not found`);
      return;
    }
    if (isHidden !== undefined && isHidden === pcData.isHidden) {
      return;
    }
    pcData.isHidden = isHidden ?? !pcData.isHidden;
    if (pcData.slot === "3") {
      return;
    }
    if (pcData.isHidden) {
      await this.pcPortraitTimelines[pcData.slot]["isHidden"]!.tweenTo("true");
    } else {
      await this.pcPortraitTimelines[pcData.slot]["isHidden"]!.tweenTo("false");
      void this.pcPortraitTimelines[pcData.slot]["isHidden"]!.progress(0);
    }
    await this.setLocationPCData(getSetting("currentLocation"), pcData);
  }

  public async togglePCDimmed(pcID: IDString, isDimmed?: boolean) {
    const pcData = this.getLocationDataForPC(getSetting("currentLocation"), pcID);
    if (!pcData) {
      kLog.error(`PC ${pcID} not found`);
      return;
    }
    pcData.isDimmed = isDimmed ?? !pcData.isDimmed;
    await this.setLocationPCData(getSetting("currentLocation"), pcData);
  }
  // #endregion PC PANEL ~

  // #region LOCATIONS

  get locationContainer$(): JQuery {
    return this.overlay$.find("#LOCATIONS");
  }
  get locationName$(): JQuery {
    return this.locationContainer$.find(".location-name");
  }
  get locationImage$(): JQuery {
    return this.locationContainer$.find(".location-image");
  }
  get locationDescription$(): JQuery {
    return this.locationContainer$.find(".location-description");
  }

  private getLocationDefaultStaticSettingsData(location: string): Location.StaticSettingsData {
    if (!(location in LOCATIONS)) {
      return {
        name: location,
        image: "",
        description: "",
        mapTransforms: [],
      };
    }
    return LOCATIONS[location as KeyOf<typeof LOCATIONS>];
  }
  private getLocationDefaultDynamicSettingsData(): Location.DynamicSettingsData {
    return {
      pcData: Object.fromEntries(this.getDefaultLocationPCData().map((data) => [data.actorID, data])),
      npcData: {} as Record<IDString, Location.NPCData.SettingsData>,
      playlists: [] as IDString[],
    };
  }
  private getLocationDefaultSettingsData(location: string): Location.SettingsData {
    return {
      ...this.getLocationDefaultStaticSettingsData(location),
      ...this.getLocationDefaultDynamicSettingsData(),
    };
  }

  private getStaticLocationData(location: string): Location.SettingsData {
    const settingData = getSettings().get("eunos-kult-hacks", "locationData") as Record<string, Location.SettingsData>;

    if (!(location in settingData) || !settingData[location]) {
      settingData[location] = this.getLocationDefaultSettingsData(location);
    } else {
      // If hard-coded map transforms are available, use them, overwriting setting data.
      const staticMapTransforms =
        LOCATIONS[location as KeyOf<typeof LOCATIONS>]?.mapTransforms;
      if (staticMapTransforms) {
        settingData[location].mapTransforms = staticMapTransforms;
      }
      const fullSettingsData: Location.SettingsData = {
        ...this.getLocationDefaultDynamicSettingsData(),
        ...settingData[location],
      };
      settingData[location] = fullSettingsData;
    }
    return settingData[location];
  }

  private getLocationPCData(pcLocationData: Record<IDString, Location.PCData.SettingsData>): Record<"1"|"2"|"3"|"4"|"5", Location.PCData.FullData> {
    const pcGlobalData = this.getPCsGlobalData();
    const pcFullData: Record<"1"|"2"|"3"|"4"|"5", Location.PCData.FullData> = {} as Record<"1"|"2"|"3"|"4"|"5", Location.PCData.FullData>;
    (["1", "2", "3", "4", "5"] as const).forEach((slot) => {
      const globalData = pcGlobalData[slot];
      const locData = Object.values(pcLocationData).find((data) => data.actorID === globalData.actorID);
      if (!locData) {
        throw new Error(`PC ${globalData.actorID} not found in location data`);
      }
      pcFullData[slot] = {
        ...locData,
        ...globalData,
      };
    });
    return pcFullData;
  }

  private getLocationDataForPC(location: string, pcRef: number | string | EunosActor): Location.PCData.FullData {
    if (["1", "2", "3", "4", "5"].includes(pcRef as string)) {
      return this.getLocationPCData(this.getLocationData(location).pcData)[pcRef as "1" | "2" | "3" | "4" | "5"];
    }
    const actor = getActorFromRef(pcRef as string);
    if (!actor) {
      throw new Error(`Actor ${pcRef instanceof Actor ? (pcRef.name ?? "") : String(pcRef)} not found`);
    }
    return Object.values(this.getLocationPCData(this.getLocationData(location).pcData)).find((data) => data.actorID === actor.id)!;
  }

  private getLocationNPCData(npcLocationData: Record<IDString, Location.NPCData.SettingsData>): Partial<Record<"1"|"2"|"3"|"4"|"5"|"6", Location.NPCData.FullData>> {
    const npcFullData: Partial<Record<"1"|"2"|"3"|"4"|"5"|"6", Location.NPCData.FullData>> = {} as Partial<Record<"1"|"2"|"3"|"4"|"5"|"6", Location.NPCData.FullData>>;
    (["1", "2", "3", "4", "5", "6"] as const).forEach((slot) => {
      const locData = Object.values(npcLocationData).find((data) => data.slot === slot);
      if (!locData) { return; }
      npcFullData[slot] = {
        ...locData,
        actor: getActors().find((a) => a.id === locData.actorID) as EunosActor & {system: ActorDataNPC},
      };
    });
    return npcFullData;
  }

  private deriveLocationFullData(settingsData: Location.SettingsData): Location.FullData {
    const { pcData, npcData, playlists } = settingsData;

    const pcFullData = this.getLocationPCData(pcData);
    const npcFullData = this.getLocationNPCData(npcData);

    const fullData: Location.FullData = {
      ...settingsData,
      pcData: pcFullData,
      npcData: npcFullData,
      playlists: playlists.map((id) => getGame().playlists.get(id) as Playlist),
    };
    return fullData;
  }

  private deriveLocationSettingsData(fullData: Location.FullData): Location.SettingsData {
    const { pcData, npcData, playlists, ...staticData } = fullData;
    const pcSettingsData: Record<IDString, Location.PCData.SettingsData> = Object.fromEntries(Object.entries(pcData)
    .map(([slot, data]) => [data.actorID, { ...data, slot }]));
    const npcSettingsData: Record<IDString, Location.NPCData.SettingsData> = Object.fromEntries(Object.entries(npcData).map(([slot, data]) => [data.actorID, {
      slot: slot as "1" | "2" | "3" | "4" | "5" | "6",
      actorID: data.actorID,
      isSpotlit: data.isSpotlit,
      isDimmed: data.isDimmed,
      isHidden: data.isHidden,
      isMasked: data.isMasked,
    }]));
    const playlistSettingsData = playlists.map((playlist) => playlist.id!);
    return {
      ...staticData,
      pcData: pcSettingsData,
      npcData: npcSettingsData,
      playlists: playlistSettingsData,
    };
  }

  public getLocationData(location: string): Location.FullData {
    const settingData = this.getStaticLocationData(location);
    return this.deriveLocationFullData(settingData);
  }

  private async setLocationData(location: string, data: Location.FullData) {
    const curData = getSetting("locationData");
    curData[location] = this.deriveLocationSettingsData(data);
    await setSetting("locationData", curData);
    void this.render({
      parts: ["pcs", "pcsGM", "npcs", "npcsGM", "locations"],
    });
  }

  public async setLocationValue(
    location: string,
    dotKey: string,
    value: unknown,
  ) {
    const locationData = this.getLocationData(location);
    if (!locationData) {
      throw new Error(`Location ${location} not found`);
    }
    const curVal: unknown = foundry.utils.getProperty(locationData, dotKey);
    if (curVal === value) {
      return;
    }
    foundry.utils.setProperty(locationData, dotKey, value);
    await this.setLocationData(location, locationData);
  }

  public initializeLocation() {
    const location = getSetting("currentLocation");
    const locationData = this.getLocationData(location);
    if (!locationData) {
      kLog.error(`Location ${location} not found`);
      return;
    }
    this.goToLocation(location, true);
  }

  public async setLocation(location: string) {
    if (!getUser().isGM) {
      return;
    }
    const locationData = this.getLocationData(location);
    if (!locationData) {
      kLog.error(`Location ${location} not found`);
      return;
    }
    await setSetting("currentLocation", location);
    void EunosSockets.getInstance().call("setLocation", UserTargetRef.all, {
      location,
    });
  }

  #stageWaverTimeline: Maybe<gsap.core.Timeline>;
  public goToLocation(location: string, isInstant = false) {
    const locationData = this.getLocationData(location);
    if (!locationData) {
      kLog.error("Location not found", { location });
      return;
    }

    if (!this.#stageWaverTimeline) {
      this.#stageWaverTimeline = gsap
        .timeline({ repeat: -1, yoyo: true })
        .to(this.stage3D$, {
          rotationX: "random(-3, 3, 1)",
          rotationY: "random(-3, 3, 1)",
          rotationZ: "random(-3, 3, 1)",
          ease: "sine.inOut",
          duration: 5,
          repeatRefresh: true,
        });
    }

    const {
      name,
      image,
      description,
      mapTransforms,
      pcData,
      npcData,
      playlists,
    } = locationData;

    // Construct a timeline that will animate all of the map transforms smoothly and simultaneously

    const timeline = gsap
      .timeline({
        paused: true,
        onComplete: () => {
          void this.render({
            parts: ["pcs", "pcsGM", "npcs", "npcsGM", "locations"],
          });
        },
      })
      .to(
        this.locationContainer$,
        {
          y: "-=200",
          x: "-=100",
          filter: "blur(30px)",
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
        },
        0,
      )
      .call(() => {
        this.locationName$.text(name);
        this.locationImage$.attr("src", image ?? "");
        this.locationDescription$.html(description ?? "");
      })
      .to(this.locationContainer$, {
        y: 0,
        x: 0,
        filter: "blur(0)",
        duration: 0,
        ease: "none",
      })
      .addLabel("startMoving");
    // .to(this.stage3D$, {
    //   z: -200,
    //   duration: 1.5,
    //   ease: "back.in(1.7)",
    //   repeat: 1,
    //   yoyo: true
    // }, "startMoving")

    mapTransforms.forEach(({ selector, properties }) => {
      // Extract transform properties to be compiled separately
      // const {rotationX, rotationY, rotationZ, z, ...rest} = properties;
      // Bump the z shift for the shadowing element
      let zShift = 0;
      if (selector.includes("under-layer")) {
        zShift = 10;
      }
      // rest["transform"] = `translate(-50%, -50%) translate3d(0, 0, ${(parseInt(`${z ?? "0"}`) ?? 0) + zShift}px) rotateX(${rotationX ?? 0}deg) rotateY(${rotationY ?? 0}deg) rotate(${rotationZ ?? 0}deg)`;
      timeline.to(
        selector,
        {
          ...properties,
          duration: 3,
          ease: "power2.inOut",
        },
        "startMoving",
      );
    });

    timeline.to(
      this.locationContainer$,
      {
        opacity: 1,
        duration: 1,
        ease: "power3.inOut",
      },
      "-=0.5",
    );

    // timeline.to(this.stage3D$, {
    //   filter: "blur(15px)",
    //   duration: 2,
    //   ease: "power2.out",
    // }, "startMoving")
    // .to(this.stage3D$, {
    //   filter: "blur(0)",
    //   duration: 2,
    //   ease: "power2.out",
    // });

    if (isInstant) {
      timeline.progress(0.9).play();
    } else {
      timeline.play();
    }
  }


  // #endregion LOCATIONS

  // #region LOCATION PLOTTING PANEL ~
  private initialValues: {
    transforms: Record<string, number>;
    gradients: Record<string, number>;
    filters: Record<string, number>;
  } = {
    transforms: {},
    gradients: {},
    filters: {},
  };

  public togglePlottingPanel(): void {
    const isPlottingLocations = !getSetting("isPlottingLocations");
    this.stage$.find(".positioner-layer").css("visibility", "hidden");
    void setSetting("isPlottingLocations", isPlottingLocations);
    if (isPlottingLocations) {
      this.showPlottingPanel();
    } else {
      this.hidePlottingPanel();
    }
  }

  /** Creates and displays the debug panel */
  public showPlottingPanel(): void {
    this.stage$.find(".positioner-layer").css("visibility", "visible");
    this.locationPlottingPanel$.css("visibility", "visible");
    // this.refreshPlottingPanel();
    // this.addPlottingControlListeners();
  }

  public hidePlottingPanel(): void {
    this.locationPlottingPanel$.css("visibility", "hidden");
    // this.removePlottingControlListeners();
  }

  // private getGradientValues(): {
  //   circlePositionX: number;
  //   circlePositionY: number;
  //   gradientStopPercentage: number;
  // } {
  //   const underLayer = this.stage$.find(".canvas-layer.under-layer");
  //   const gradientString = window.getComputedStyle(underLayer[0]!).background;
  //   const match = gradientString.match(/circle at (\d+)% (\d+)%.*?(\d+)%/);
  //   if (!match) {
  //     return {
  //       circlePositionX: 0,
  //       circlePositionY: 0,
  //       gradientStopPercentage: 0,
  //     };
  //   }
  //   const [, x, y, stop] = match;
  //   return {
  //     circlePositionX: parseInt(x ?? "0"),
  //     circlePositionY: parseInt(y ?? "0"),
  //     gradientStopPercentage: parseInt(stop ?? "0"),
  //   };
  // }
  // public resetPlottingPanel(): void {
  //   // Reset 3D transform values
  //   LOCATION_PLOTTING_SETTINGS.SIMPLE.forEach((config) => {
  //     const elements = document.querySelectorAll(config.selector);
  //     const initialValue = this.initialValues.transforms[config.property];
  //     if (typeof initialValue === "number") {
  //       elements.forEach((element) => {
  //         gsap.to(element, { [config.property]: initialValue });
  //       });
  //     }
  //   });

  //   // Reset gradient values
  //   // const elements = document.querySelectorAll(
  //   //   "#STAGE #SECTION-3D .canvas-layer.under-layer",
  //   // );
  //   // const { circlePositionX, circlePositionY, gradientStopPercentage } =
  //   //   this.initialValues.gradients;
  //   // elements.forEach((element) => {
  //   //   (element as HTMLElement).style.background =
  //   //     `radial-gradient(circle at ${circlePositionX}% ${circlePositionY}%, transparent, rgba(0, 0, 0, 1) ${gradientStopPercentage}%)`;
  //   // });

  //   // // Reset filter values
  //   // LOCATION_PLOTTING_SETTINGS.FILTER.forEach((config) => {
  //   //   const elements = document.querySelectorAll(config.selector);
  //   //   const filterString = config.filters
  //   //     .map((filter) => {
  //   //       const initialValue = this.initialValues.filters[filter.property];
  //   //       if (!initialValue) {
  //   //         return "";
  //   //       }
  //   //       return `${filter.property}(${this.getFilterValue(filter.property, initialValue)})`;
  //   //     })
  //   //     .join(" ");

  //   //   elements.forEach((element) => {
  //   //     (element as HTMLElement).style.filter = filterString;
  //   //   });
  //   // });
  // }

  /** Gets the CSS value for a filter property */
  private getFilterValue(property: string, value: number): string {
    switch (property) {
      case "hue-rotate":
        return `${value}deg`;
      case "saturate":
        return String(value);
      default:
        return String(value);
    }
  }
  // #endregion Location Plotting ~

  /**
   * Creates a slider control with a label, reset button, and action function
   * @param label - The label text for the control
   * @param min - The minimum value for the slider
   * @param max - The maximum value for the slider
   * @param initValue - The initial value for the slider, or a function that returns the initial value
   * @param actionFunction - The function to call when the slider value changes
   */
  private makeSliderControl(
    label: string,
    min: number,
    max: number,
    initValue: number | (() => number),
    actionFunction: (value: number) => void,
    formatForDisplay: (value: number) => string,
  ): HTMLDivElement {
    const controlRow = document.createElement("div");
    controlRow.classList.add("control-row");

    const labelElement = document.createElement("label");
    labelElement.textContent = label;

    const valueDisplay = document.createElement("span");
    valueDisplay.classList.add("value-display");

    const sliderElement = document.createElement("input");
    sliderElement.type = "range";
    sliderElement.min = String(min);
    sliderElement.max = String(max);

    let initialValue = Number(
      typeof initValue === "number" ? initValue : initValue(),
    );
    sliderElement.value = String(initialValue); // Set initial value
    valueDisplay.textContent = formatForDisplay(initialValue);

    const resetButton = document.createElement("i");
    resetButton.classList.add("fas", "fa-undo");

    resetButton.addEventListener("click", () => {
      sliderElement.value = String(initialValue);
      actionFunction(initialValue);
      valueDisplay.textContent = formatForDisplay(initialValue);
    });

    // Update the value display when the slider value changes
    sliderElement.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement;
      valueDisplay.textContent = formatForDisplay(Number(target.value));
      actionFunction(Number(target.value));
    });

    // // Only trigger action when user finishes changing the value
    // sliderElement.addEventListener("change", (event) => {
    //   const target = event.target as HTMLInputElement;
    //   actionFunction(Number(target.value));
    // });

    // If a function was provided for initValue, add another button with a save icon, which calls the initValue function and updates the initialValue variable
    if (typeof initValue === "function") {
      const saveButton = document.createElement("i");
      saveButton.classList.add("fas", "fa-save");
      saveButton.addEventListener("click", () => {
        initialValue = initValue();
        sliderElement.value = String(initialValue);
        valueDisplay.textContent = formatForDisplay(initialValue);
        actionFunction(initialValue);
      });
      controlRow.appendChild(saveButton);
    }

    controlRow.appendChild(labelElement);
    controlRow.appendChild(sliderElement);
    controlRow.appendChild(resetButton);
    controlRow.appendChild(valueDisplay);
    return controlRow;
  }

  // #endregion STAGE CONTROL

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
        .set([this.midZIndexMask$, this.maxZIndexBars$], { zIndex: 50 })
        .set(this.uiRight$, { zIndex: 51 })
        .to(this.uiRight$, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        });
    }
    return this.#sidebarTimeline;
  }

  private addCanvasMaskListeners() {
    if (
      this.timeRemaining <= PRE_SESSION.FREEZE_OVERLAY ||
      ![GamePhase.SessionClosed, GamePhase.SessionLoading].includes(
        getSetting("gamePhase") as GamePhase,
      )
    ) {
      return;
    }

    $(document)
      // Handle cursor movement
      .on("mousemove.overlaySidebar", (event) => {
        const isOverSidebar =
          event.clientX && event.clientX >= (this.uiRight$.offset()?.left ?? 0);
        if (isOverSidebar) {
          this.sidebarTimeline.play();
        } else {
          this.sidebarTimeline.reverse();
        }
      })
      // Handle cursor leaving
      .on("mouseleave.overlaySidebar", () => {
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

    Object.assign(context, {
      isGM: getUser().isGM,
      LOADING_SCREEN_DATA,
    });

    if (
      [GamePhase.SessionClosed, GamePhase.SessionLoading].includes(
        getSetting("gamePhase") as GamePhase,
      )
    ) {
      if (getUser().isGM) {
        // Prepare video status data for template
        const users = getUsers().map((user: User) => {
          const status =
            !user.active ||
            this.videoLoadStatus.get(user.id ?? "") ===
              MediaLoadStatus.NotConnected
              ? MediaLoadStatus.NotConnected
              : (this.videoLoadStatus.get(user.id ?? "") ??
                MediaLoadStatus.PreloadNotRequested);

          return {
            id: user.id,
            name: user.name,
            active: user.active,
            status,
            statusClass: status.toLowerCase(),
            isNotConnected: status === MediaLoadStatus.NotConnected,
            isPreloadNotRequested:
              status === MediaLoadStatus.PreloadNotRequested,
            isLoadPending: status === MediaLoadStatus.LoadPending,
            isLoading: status === MediaLoadStatus.Loading,
            isReady: status === MediaLoadStatus.Ready,
          };
        });
        Object.assign(context, { users });
      }
    } else {
      Object.assign(context, {
        sessionScribeID: getSetting("sessionScribeID"),
        chainBG: AlertPaths["LINK"]!.cssCode,
      });
      if (!getUser().isGM) {
        const pcActor = getActor();
        if (pcActor.isPC()) {
          Object.assign(context, {
            dramaticHookCandleID: pcActor.system.dramatichooks.assigningFor,
          });
        }
      }
      // Prepare location data for stage
      const location = getSetting("currentLocation");
      const locationData = this.getLocationData(location);
      if (locationData) {
        Object.assign(context, {
          location,
          locationData,
        });
      }
    }

    return context;
  }

  // #endregion OVERRIDE: PREPARE CONTEXT ~

  // #region OVERRIDE: ON RENDER ~
  protected override _onRender(
    context: EmptyObject,
    options: ApplicationV2.RenderOptions,
  ): void {
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
    this.makePlottingControls();
    this.buildPCPortraitTimelines();
  }

  // private formatControlValue(
  //   controlType: string,
  //   property: string,
  //   value: number|string,
  // ): string {
  //   switch (property) {
  //     case "hue-rotate":
  //     case "rotationX":
  //     case "rotationY":
  //     case "rotationZ":
  //       return `${Math.round(Number(value))}°`;
  //     case "saturate":
  //       return Number(value).toFixed(2);
  //     case "circlePositionX":
  //     case "circlePositionY":
  //     case "gradientStopPercentage":
  //       return `${Math.round(Number(value))}%`;
  //     default:
  //       return String(value);
  //   }
  // }

  private makePlottingControls() {
    // Confirm that location plotting panel is visible
    if (this.locationPlottingPanel$.css("visibility") !== "visible") {
      return;
    }

    // If there are already any plotting controls, remove them
    this.locationPlottingPanel$.find(".control-row").remove();

    // Create a control row for each transform control defined in CONTROL_SLIDER_PANELS.LOCATION_PLOTTING
    CONTROL_SLIDER_PANELS.LOCATION_PLOTTING.forEach((panel) => {
      const controlRow = this.makeSliderControl(
        panel.label,
        panel.min,
        panel.max,
        panel.initValue,
        panel.actionFunction,
        panel.formatForDisplay,
      );
      this.locationPlottingPanel$.find(".control-section").append(controlRow);
    });
  }
  // #endregion OVERRIDE: ON RENDER ~
}
