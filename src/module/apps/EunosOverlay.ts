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
  sortDocsByLastWord,
} from "../scripts/utilities";
import {
  LOADING_SCREEN_DATA,
  getLocationDefaultDynamicData,
  PRE_SESSION,
  MEDIA_PATHS,
  LOCATIONS,
  type Location,
  LOCATION_PLOTTING_SETTINGS,
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
import ItemDataAdvantage from "../data-model/ItemDataAdvantage";
import ItemDataDisadvantage from "../data-model/ItemDataDisadvantage";
import type EunosItem from "../documents/EunosItem";
import EunosMedia from "./EunosMedia";
import type ActorDataPC from "../data-model/ActorDataPC";
// import AudioHelper from "../scripts/AudioHelper";
// #endregion -- IMPORTS ~

// #region Type Definitions ~
/** Status of video loading for each user */

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
      // Group settings by selector
      const transformsBySelector: Record<
        string,
        {
          selector: string;
          properties: Record<string, string | number>;
        }
      > = {};

      // Collect transform values
      LOCATION_PLOTTING_SETTINGS.SIMPLE.forEach((config) => {
        const elements = document.querySelectorAll(config.selector);
        if (elements.length > 0) {
          if (!transformsBySelector[config.selector]) {
            transformsBySelector[config.selector] = {
              selector: config.selector,
              properties: {},
            };
          }
          transformsBySelector[config.selector]!.properties[config.property] =
            gsap.getProperty(elements[0]!, config.property) as number;
        }
      });

      // Collect gradient values
      LOCATION_PLOTTING_SETTINGS.GRADIENT.forEach((config) => {
        const elements = document.querySelectorAll(config.selector);
        if (elements.length > 0) {
          if (!transformsBySelector[config.selector]) {
            transformsBySelector[config.selector] = {
              selector: config.selector,
              properties: {},
            };
          }
          const element = elements[0] as HTMLElement;
          transformsBySelector[config.selector]!.properties["background"] =
            element.style.background;
        }
      });

      // Collect filter values
      LOCATION_PLOTTING_SETTINGS.FILTER.forEach((config) => {
        const elements = document.querySelectorAll(config.selector);
        if (elements.length > 0) {
          if (!transformsBySelector[config.selector]) {
            transformsBySelector[config.selector] = {
              selector: config.selector,
              properties: {},
            };
          }
          const element = elements[0] as HTMLElement;
          transformsBySelector[config.selector]!.properties["filter"] =
            element.style.filter;
        }
      });

      // Format the output
      const output = `mapTransforms: [
    ${Object.values(transformsBySelector)
      .map(
        (transform) => `{
      selector: "${transform.selector}",
      properties: {
        ${Object.entries(transform.properties)
          .map(([key, value]) =>
            typeof value === "string"
              ? `${key}: "${value}"`
              : `${key}: ${value.toFixed(1)}`,
          )
          .join(",\n      ")}
      }
    }`,
      )
      .join(",\n  ")}
  ]`;
      // Copy to clipboard
      void navigator.clipboard
        .writeText(output)
        .then(() => {
          getNotifier().info("Location plotting values copied to clipboard");
        })
        .catch((err: unknown) => {
          console.error("Failed to copy to clipboard:", err);
          getNotifier().warn("Failed to copy to clipboard");
        });

      // Send as whispered chat message
      // @ts-expect-error Again, bad typing on this
      void ChatMessage.create({
        content: `<pre>${output}</pre>`,
        whisper: [getUser().id],
      });
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
    refreshControl(event: PointerEvent, target: HTMLElement): void {
      const control = EunosOverlay.instance.overlay$
        .find(target)
        .closest(".control-row");
      EunosOverlay.instance.refreshPlottingControl(control);
    },
    syncWithLocation(event: PointerEvent, target: HTMLElement): void {
      const currentLocation = getSetting("currentLocation");
      const locationData = EunosOverlay.instance.getLocationData(currentLocation);

      if (!locationData?.mapTransforms) {
        ui.notifications?.warn(
          `No transform data found for location: ${currentLocation}`,
        );
        return;
      }

      // Update each control based on the mapTransforms data
      locationData.mapTransforms.forEach((transform) => {
        const { selector, properties } = transform;

        // Update transform controls
        Object.entries(properties).forEach(([property, value]) => {
          if (property === "background") {
            // Handle gradient properties
            const match = (value as string).match(
              /circle at (\d+)% (\d+)%.*?(\d+)%/,
            );
            if (match) {
              const [, x, y, stop] = match;
              EunosOverlay.instance.overlay$
                .find(`input[data-property='circlePositionX']`)
                .val(x!)
                .trigger("input");
              EunosOverlay.instance.overlay$
                .find(`input[data-property='circlePositionY']`)
                .val(y!)
                .trigger("input");
              EunosOverlay.instance.overlay$
                .find(`input[data-property='gradientStopPercentage']`)
                .val(stop!)
                .trigger("input");
            }
          } else if (property === "filter") {
            // Handle filter properties
            const hueMatch = (value as string).match(/hue-rotate\((\d+)deg\)/);
            const saturateMatch = (value as string).match(
              /saturate\((\d+(?:\.\d+)?)\)/,
            );

            if (hueMatch) {
              EunosOverlay.instance.overlay$
                .find(`input[data-property='hue-rotate']`)
                .val(hueMatch[1]!)
                .trigger("input");
            }
            if (saturateMatch) {
              EunosOverlay.instance.overlay$
                .find(`input[data-property='saturate']`)
                .val(saturateMatch[1]!)
                .trigger("input");
            }
          } else {
            // Handle transform properties
            EunosOverlay.instance.overlay$
              .find(
                `input[data-property='${property}'][data-selector='${selector}']`,
              )
              .val(value as number)
              .trigger("input");
          }
        });
      });

      ui.notifications?.info(
        `Synced controls with location: ${currentLocation}`,
      );
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
      refreshControl: EunosOverlay.ACTIONS.refreshControl.bind(EunosOverlay),
      seriousWoundClick:
        EunosOverlay.ACTIONS.seriousWoundClick.bind(EunosOverlay),
      criticalWoundClick:
        EunosOverlay.ACTIONS.criticalWoundClick.bind(EunosOverlay),
      togglePCSpotlight:
        EunosOverlay.ACTIONS.togglePCSpotlight.bind(EunosOverlay),
      togglePCDimmed:
        EunosOverlay.ACTIONS.togglePCDimmed.bind(EunosOverlay),
      togglePCHidden:
        EunosOverlay.ACTIONS.togglePCHidden.bind(EunosOverlay),
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
  #countdown: Maybe<HTMLElement>;
  #videoStatusPanel: Maybe<HTMLElement>;
  #locationPlottingPanel: Maybe<HTMLElement>;
  #stage: Maybe<HTMLElement>;
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

  // #endregion DOM ELEMENT GETTERS

  // #region MEDIA GETTERS ~

  // #endregion MEDIA GETTERS

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
    kLog.log("buildCountdownContainerTimeline", duration, timeOffset);
    this.#countdownContainerTimeline = gsap.timeline().fromTo(
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
    );
    this.#isCountdownContainerTimelinePlaying = true;
    return this.#countdownContainerTimeline.seek(timeOffset);
  }

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
  #isCountdownContainerTimelineSynced = false;
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
  /** Updates the countdown display and handles pre-session sequence */
  private async updateCountdown(): Promise<void> {
    this.#timeRemaining = this.updateCountdownText().totalSeconds;
    const preSessionSongDuration = await this.getPreSessionSongDuration();

    if (
      this.#isCountdownContainerTimelinePlaying &&
      !this.#isCountdownContainerTimelineSynced
    ) {
      const countdownProgress =
        1 - this.#timeRemaining / preSessionSongDuration;
      kLog.log(`Countdown progress: ${countdownProgress}`);
      this.#countdownContainerTimeline?.progress(countdownProgress);
      this.#isCountdownContainerTimelineSynced = true;
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
      if (Math.abs(newRepeatDelay - (this.#glitchTimeline?.repeatDelay() ?? Infinity)) > 2) {
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

    // T-120 secs: Begin glitch AND container timelines
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
      void this.killSessionClosedAmbientAudio();
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
    const currentItem = this.#loadingScreenItems.get(this.#currentLoadingScreenItem ?? "");
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

  // #region LOCATIONS ~

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

  private addActorsToLocationData(locationData: Location.Data): Location.FullData {
    const { pcData, npcData } = locationData;
    const actors = getActors();
    Object.values(pcData).forEach((data) => {
      const actor = actors.find((a) => a.id === data.id) as Maybe<EunosActor & {system: ActorDataPC}>;
      if (actor) {
        data.actor = actor;
        // Check if actor is online; if not, set isMasked to true
        if (!actor.system.isOnline) {
          data.isMasked = true;
        }
      } else {
        throw new Error(`PC Actor '${data.id}' for slot '${data.slot}' not found`);
      }
    });
    Object.values(npcData).forEach((data) => {
      const actor = actors.find((a) => a.id === data.id);
      if (actor) {
        data.actor = actor;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete npcData[data.slot];
      }
    });
    return locationData as Location.FullData;
  }

  public getLocationData(location: string): Maybe<Location.FullData> {
    const settingData = getSettings().get("eunos-kult-hacks", "locationData");
    if (!(location in settingData) || !settingData[location]) {
      if (!(location in LOCATIONS && LOCATIONS[location as KeyOf<typeof LOCATIONS>])) {
        kLog.error(
          `Location ${location} not found in settingData or in LOCATIONS constant`,
        );
        return undefined;
      }

      const staticData: Location.StaticData = LOCATIONS[location as KeyOf<typeof LOCATIONS>];
      const fullData: Location.Data = {
        ...getLocationDefaultDynamicData(),
        ...staticData,
      };
      settingData[location] = fullData;
    } else {
      const fullData: Location.Data = {
        ...getLocationDefaultDynamicData(),
        ...settingData[location]
      };
      settingData[location] = fullData;
    }
    this.addActorsToLocationData(settingData[location] as Location.Data);
    return settingData[location] as Location.FullData;
  }

  private async setLocationData(location: string, data: Location.Data) {
    const curData = getSetting("locationData");
    curData[location] = data;
    await setSetting("locationData", curData);
    void this.render({ parts: ["pcs", "pcsGM", "npcs", "npcsGM", "locations"] });
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

  private getLocationPCData(
    location: string,
    pcRef: number | string | EunosActor,
  ): Maybe<Location.CharacterData & {actor: EunosActor}> {
    let charData: Maybe<Location.CharacterData & {actor: EunosActor}>;
    const locationPCData = this.getLocationData(location)?.pcData;
    if (!locationPCData) {
      kLog.error(`Location ${location} has no PC data`);
      return undefined;
    }
    if (typeof pcRef === "number") {
      pcRef = `${pcRef}`;
    }
    if (typeof pcRef === "string") {
      if (["1", "2", "3", "4", "5"].includes(pcRef)) {
        charData = locationPCData[pcRef as "1" | "2" | "3" | "4" | "5"];
      } else {
        if (isDocUUID(pcRef)) {
          const actor = fromUuidSync<EunosActor>(pcRef) as Maybe<EunosActor>;
          if (!(actor instanceof Actor)) {
            kLog.error(`Invalid PC reference: ${pcRef}`);
            return undefined;
          }
          if (!actor.id) {
            kLog.error(`Actor ${actor.name} has no ID`);
            return undefined;
          }
          pcRef = actor.id;
        }
        if (isDocID(pcRef)) {
          const actor = getActors().find((a) => a.id === pcRef);
          if (!(actor instanceof Actor)) {
            kLog.error(`Invalid PC reference: ${pcRef}`);
            return undefined;
          }
          charData = Object.values(locationPCData).find(
            (data) => data.id === pcRef,
          );
        }
      }
    } else if (pcRef instanceof Actor) {
      charData = Object.values(locationPCData).find(
        (data) => data.id === (pcRef as EunosActor).id,
      );
    }
    if (!charData) {
      kLog.error(
        `Character data not found for ${pcRef instanceof Actor ? (pcRef.name ?? "") : String(pcRef)}`,
      );
      return undefined;
    }
    return charData;
  }

  private async setLocationPCData(
    location: string,
    fullData: Location.CharacterData,
  ) {
    const { actor, ...data } = fullData;
    await this.setLocationValue(location, `pcData.${data.slot}`, data);
  }

  public async setLocationPCValue(
    location: string,
    pcRef: number | string | EunosActor,
    dotKey: string,
    value: unknown,
  ) {
    const locationPCData = this.getLocationPCData(location, pcRef);
    if (!locationPCData) {
      throw new Error(
        `Character data not found for ${pcRef instanceof Actor ? (pcRef.name ?? "") : String(pcRef)}`,
      );
    }
    const curVal: unknown = foundry.utils.getProperty(locationPCData, dotKey);
    if (curVal === value) {
      return;
    }
    foundry.utils.setProperty(locationPCData, dotKey, value);
    await this.setLocationPCData(location, locationPCData);
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

  public goToLocation(location: string, isInstant = false) {
    const locationData = this.getLocationData(location);
    if (!locationData) {
      kLog.error("Location not found", { location });
      return;
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
          void this.render({ parts: ["pcs", "pcsGM", "npcs", "npcsGM", "locations"] });
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

    mapTransforms.forEach(({ selector, properties }) => {
      timeline.to(
        selector,
        {
          ...properties,
          duration: 3,
          ease: "back.out(1.7)",
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

    if (isInstant) {
      timeline.progress(0.9).play();
    } else {
      timeline.play();
    }
  }

  public async togglePCSpotlight(pcID: IDString, isSpotlit?: boolean) {
    const pcData = this.getLocationPCData(getSetting("currentLocation"), pcID);
    if (!pcData) {
      kLog.error(`PC ${pcID} not found`);
      return;
    }
    pcData.isSpotlit = isSpotlit ?? !pcData.isSpotlit;
    await this.setLocationPCData(getSetting("currentLocation"), pcData);
  }

  public async togglePCHide(pcID: IDString, isHidden?: boolean) {
    const pcData = this.getLocationPCData(getSetting("currentLocation"), pcID);
    if (!pcData) {
      kLog.error(`PC ${pcID} not found`);
      return;
    }
    pcData.isHidden = isHidden ?? !pcData.isHidden;
    await this.setLocationPCData(getSetting("currentLocation"), pcData);
  }

  public async togglePCDimmed(pcID: IDString, isDimmed?: boolean) {
    const pcData = this.getLocationPCData(getSetting("currentLocation"), pcID);
    if (!pcData) {
      kLog.error(`PC ${pcID} not found`);
      return;
    }
    pcData.isDimmed = isDimmed ?? !pcData.isDimmed;
    await this.setLocationPCData(getSetting("currentLocation"), pcData);
  }



  // #region Location Plotting ~
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
    void setSetting("isPlottingLocations", !getSetting("isPlottingLocations"));
  }

  /** Creates and displays the debug panel */
  public showPlottingPanel(): void {
    this.locationPlottingPanel$.css("visibility", "visible");
    this.refreshPlottingPanel();
    this.addPlottingControlListeners();
  }

  private getGradientValues(): {
    circlePositionX: number;
    circlePositionY: number;
    gradientStopPercentage: number;
  } {
    const underLayer = this.stage$.find(".canvas-layer.under-layer");
    const gradientString = window.getComputedStyle(underLayer[0]!).background;
    const match = gradientString.match(/circle at (\d+)% (\d+)%.*?(\d+)%/);
    if (!match) {
      return {
        circlePositionX: 0,
        circlePositionY: 0,
        gradientStopPercentage: 0,
      };
    }
    const [, x, y, stop] = match;
    return {
      circlePositionX: parseInt(x ?? "0"),
      circlePositionY: parseInt(y ?? "0"),
      gradientStopPercentage: parseInt(stop ?? "0"),
    };
  }
  public resetPlottingPanel(): void {
    // Reset 3D transform values
    LOCATION_PLOTTING_SETTINGS.SIMPLE.forEach((config) => {
      const elements = document.querySelectorAll(config.selector);
      const initialValue = this.initialValues.transforms[config.property];
      if (typeof initialValue === "number") {
        elements.forEach((element) => {
          gsap.to(element, { [config.property]: initialValue });
        });
      }
    });

    // Reset gradient values
    const elements = document.querySelectorAll(
      "#STAGE #SECTION-3D .canvas-layer.under-layer",
    );
    const { circlePositionX, circlePositionY, gradientStopPercentage } =
      this.initialValues.gradients;
    elements.forEach((element) => {
      (element as HTMLElement).style.background =
        `radial-gradient(circle at ${circlePositionX}% ${circlePositionY}%, transparent, rgba(0, 0, 0, 0.9) ${gradientStopPercentage}%)`;
    });

    // Reset filter values
    LOCATION_PLOTTING_SETTINGS.FILTER.forEach((config) => {
      const elements = document.querySelectorAll(config.selector);
      const filterString = config.filters
        .map((filter) => {
          const initialValue = this.initialValues.filters[filter.property];
          if (!initialValue) {
            return "";
          }
          return `${filter.property}(${this.getFilterValue(filter.property, initialValue)})`;
        })
        .join(" ");

      elements.forEach((element) => {
        (element as HTMLElement).style.filter = filterString;
      });
    });
  }

  refreshPlottingControl(control: JQuery): void {
    const input = control.find("input[type='range']");
    const valueDisplay = control.find(".value-display");
    const controlType = input.attr("data-control-type");
    const property = input.attr("data-property");
    const selector = input.attr("data-selector");

    if (!controlType || !property) return;

    if (controlType === "transform" && selector) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const currentValue = gsap.getProperty(elements[0]!, property) as number;
        const rangeMult = parseFloat(input.attr("data-range-mult") ?? "1");
        const range = EunosOverlay.instance.getSliderRange(
          property,
          currentValue,
          rangeMult,
        );

        input
          .attr("min", String(range.min))
          .attr("max", String(range.max))
          .val(currentValue)
          .trigger("input");

        valueDisplay.text(
          EunosOverlay.instance.formatControlValue(
            controlType,
            property,
            currentValue,
          ),
        );
      }
    } else if (controlType === "background") {
      const currentValue =
        this.getGradientValues()[
          property as keyof ReturnType<typeof this.getGradientValues>
        ];
      input.val(currentValue).trigger("input");
      valueDisplay.text(
        EunosOverlay.instance.formatControlValue(
          controlType,
          property,
          currentValue,
        ),
      );
    } else if (controlType === "filter" && selector) {
      const element = document.querySelector(selector);
      if (!element) return;

      const style = window.getComputedStyle(element);
      const filterRegex = new RegExp(
        `${property}\\((\\d+(?:\\.\\d+)?(?:deg|%|)?)\\)`,
      );
      const match = style.filter.match(filterRegex);
      if (match) {
        const currentValue = parseFloat(match[1] ?? "0");
        input.val(currentValue).trigger("input");
        valueDisplay.text(
          EunosOverlay.instance.formatControlValue(
            controlType,
            property,
            currentValue,
          ),
        );
      }
    }
  }

  public refreshPlottingPanel(): void {
    // Refresh all transform controls
    this.overlay$.find(".transform-controls .control-row").each((_, row) => {
      const input = $(row).find("input[type='range']");
      const controlType = input.attr("data-control-type");
      const property = input.attr("data-property");
      const selector = input.attr("data-selector");
      const valueDisplay = $(row).find(".value-display");

      if (controlType === "transform" && selector) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const currentValue = gsap.getProperty(
            elements[0]!,
            property!,
          ) as number;
          const rangeMult = parseFloat(input.attr("data-range-mult") ?? "1");
          const range = EunosOverlay.instance.getSliderRange(
            property!,
            currentValue,
            rangeMult,
          );

          input
            .attr("min", String(range.min))
            .attr("max", String(range.max))
            .val(currentValue)
            .trigger("input");

          valueDisplay.text(
            this.formatControlValue(controlType, property!, currentValue),
          );
        }
      }
    });

    // Refresh all gradient controls
    this.overlay$.find(".gradient-controls .control-row").each((_, row) => {
      const input = $(row).find("input[type='range']");
      const controlType = input.attr("data-control-type");
      const property = input.attr("data-property");
      const selector = input.attr("data-selector");
      const valueDisplay = $(row).find(".value-display");

      if (selector) {
        const element = document.querySelector(selector) as HTMLElement;
        if (!element) return;

        const value =
          this.getGradientValues()[
            property as keyof ReturnType<typeof this.getGradientValues>
          ];

        input.val(value).trigger("input");
        valueDisplay.text(
          this.formatControlValue(controlType!, property!, value),
        );
      }
    });

    // Refresh all filter controls
    this.overlay$.find(".filter-controls .control-row").each((_, row) => {
      const input = $(row).find("input[type='range']");
      const controlType = input.attr("data-control-type");
      const property = input.attr("data-property");
      const selector = input.attr("data-selector");
      const valueDisplay = $(row).find(".value-display");

      if (property && selector) {
        const element = document.querySelector(selector) as HTMLElement;
        if (!element) return;

        const style = window.getComputedStyle(element);
        const filterRegex = new RegExp(
          `${property}\\((\\d+(?:\\.\\d+)?(?:deg|%|)?)\\)`,
        );
        const match = style.filter.match(filterRegex);

        if (match) {
          const value = parseFloat(match[1] ?? "0");
          input.val(value).trigger("input");
          valueDisplay.text(
            this.formatControlValue(controlType!, property, value),
          );
        }
      }
    });
  }

  public hidePlottingPanel(): void {
    this.locationPlottingPanel$.css("visibility", "hidden");
    this.removePlottingControlListeners();
  }

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

  // #endregion LOCATIONS

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

    // Prepare location data for stage
    const location = getSetting("currentLocation");
    const locationData = this.getLocationData(location);
    if (!locationData) {
      kLog.error(`Location ${location} not found`);
      return context;
    }
    const { pcData, npcData, playlists } = locationData;

    // Prepare loading screen item data
    Object.assign(context, {
      location,
      locationData,
      npcData,
      pcData,
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
        this.videoLoadStatus.get(user.id ?? "") === MediaLoadStatus.NotConnected
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
        isPreloadNotRequested: status === MediaLoadStatus.PreloadNotRequested,
        isLoadPending: status === MediaLoadStatus.LoadPending,
        isLoading: status === MediaLoadStatus.Loading,
        isReady: status === MediaLoadStatus.Ready,
      };
    });

    Object.assign(context, {
      users,
      isGM: true,
    });

    // Prepare location plotting panel
    // Transform controls data
    const transformControls = LOCATION_PLOTTING_SETTINGS.SIMPLE.map(
      (config) => {
        const elements = document.querySelectorAll(config.selector);
        const initialValue =
          elements.length > 0
            ? (gsap.getProperty(
                elements[0] as Element,
                config.property,
              ) as number)
            : 0;
        return {
          ...config,
          initialValue,
          ...this.getSliderRange(
            config.property,
            initialValue,
            config.rangeMult,
          ),
        };
      },
    );

    // Gradient controls data
    const gradientControls = LOCATION_PLOTTING_SETTINGS.GRADIENT.map(
      (setting) => ({
        ...setting,
      }),
    );

    // Filter controls data
    const filterControls = LOCATION_PLOTTING_SETTINGS.FILTER.map((config) => ({
      selector: config.selector,
      filters: config.filters.map((filter) => ({
        ...filter,
      })),
    }));

    Object.assign(context, {
      transformControls,
      gradientControls,
      filterControls,
    });

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
    this.addPlottingControlListeners();
  }

  private formatControlValue(
    controlType: string,
    property: string,
    value: number,
  ): string {
    switch (property) {
      case "hue-rotate":
      case "rotationX":
      case "rotationY":
      case "rotationZ":
        return `${Math.round(value)}°`;
      case "saturate":
        return value.toFixed(2);
      case "circlePositionX":
      case "circlePositionY":
      case "gradientStopPercentage":
        return `${Math.round(value)}%`;
      default:
        return String(value);
    }
  }

  private addPlottingControlListeners(): void {
    $(document).on(
      "input.plottingControls",
      "#LOCATION-PLOTTING-PANEL input[type='range']",
      (event) => {
        const input = $(event.currentTarget);
        const controlType = input.attr("data-control-type");
        const property = input.attr("data-property");
        const selector = input.attr("data-selector");
        const value = parseFloat(input.val() as string);

        if (!controlType || !property) return;

        // Update value display using the shared formatting method
        const valueDisplay = input
          .closest(".control-row")
          .find(".value-display");
        valueDisplay.text(
          this.formatControlValue(controlType, property, value),
        );

        // Apply the value based on control type
        if (controlType === "transform" && selector) {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element) => {
            gsap.set(element, { [property]: value });
          });
        } else if (controlType === "background" && selector) {
          const controls = this.overlay$.find(".gradient-controls");
          const xInput = controls.find(
            "input[data-property='circlePositionX']",
          );
          const yInput = controls.find(
            "input[data-property='circlePositionY']",
          );
          const stopInput = controls.find(
            "input[data-property='gradientStopPercentage']",
          );

          const xVal = parseInt(xInput.val() as string);
          const yVal = parseInt(yInput.val() as string);
          const stopVal = parseInt(stopInput.val() as string);

          const gradientString = `radial-gradient(circle at ${xVal}% ${yVal}%, transparent, rgba(0, 0, 0, 0.9) ${stopVal}%)`;

          kLog.log("GRADIENT CHANGE", { xVal, yVal, stopVal, gradientString });

          const elements = document.querySelectorAll(selector);
          elements.forEach((element) => {
            (element as HTMLElement).style.background = gradientString;
          });
        } else if (controlType === "filter" && selector) {
          const controls = this.overlay$.find(".filter-controls");
          const filterInputs = controls.find("input[type='range']");

          const filterString = Array.from(filterInputs)
            .map((input) => {
              const filterProperty = $(input).attr("data-property");
              const filterValue = $(input).val() as string;
              return `${filterProperty}(${filterValue}${filterProperty === "hue-rotate" ? "deg" : ""})`;
            })
            .join(" ");

          const elements = document.querySelectorAll(selector);
          elements.forEach((element) => {
            (element as HTMLElement).style.filter = filterString;
          });
        }
      },
    );
  }

  private removePlottingControlListeners(): void {
    $(document).off(".plottingControls");
  }
  // #endregion OVERRIDE: ON RENDER ~

  private getSliderRange(
    property: string,
    initialValue: number,
    rangeMult: number,
  ): { min: number; max: number } {
    const isAngle = ["rotationX", "rotationY", "rotationZ"].includes(property);

    if (isAngle) {
      return { min: -360, max: 360 };
    }

    const range = rangeMult * Math.abs(initialValue);
    return {
      min: initialValue - range,
      max: initialValue + range,
    };
  }
}

// #region DEBUGGING ~
/** Settings for 3D debug controls */
