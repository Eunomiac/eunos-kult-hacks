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
  getOwnedAndActiveActors,
  getActorFromRef,
  camelCase,
  roundNum,
  randElem,
  shuffle,
} from "../scripts/utilities";
import {
  LOADING_SCREEN_DATA,
  PRE_SESSION,
  MEDIA_PATHS,
  LOCATIONS,
  type Location,
  type PCs,
  type EunosMediaData,
  CONTROL_SLIDER_PANELS,
  Sounds,
  EASES,
} from "../scripts/constants";
import type { EmptyObject } from "fvtt-types/utils";
import {
  GamePhase,
  UserTargetRef,
  AlertType,
  MediaLoadStatus,
  EunosMediaTypes,
  PCTargetRef,
  PCState,
  NPCState,
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
        .writeText(
          `[
        {
          selector: "#STAGE",
          properties: {
            perspective: ${gsap.getProperty("#STAGE", "perspective")},
          },
        },
        {
          selector: "#STAGE #SECTION-3D",
          properties: {
            z: ${gsap.getProperty("#STAGE #SECTION-3D", "z")}
          }
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
      ]`.replace(/(\bbrightness\([^)]+\))(?:\s+brightness\([^)]+\))+/g, "$1"),
        )
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
    togglePCSpotlight(
      event: JQuery.MouseDownEvent | JQuery.MouseUpEvent,
      target: HTMLElement,
    ): void {
      kLog.log("togglePCSpotlight", { event, target });
      const pcID = target.dataset["actorId"];
      kLog.log("pcID", pcID);
      if (!pcID) {
        return;
      }
      // Check if this is a click-down vs click-release event
      if (event.type === "mousedown") {
        // Handle click-down
        kLog.log("click-down");
        void EunosSockets.getInstance().call("updatePCUI", UserTargetRef.all, {
          [pcID]: PCState.spotlit
        });

      } else if (event.type === "mouseup") {
        // Handle click-release
        kLog.log("click-up");
        void EunosSockets.getInstance().call("updatePCUI", UserTargetRef.all, {
          [pcID]: EunosOverlay.instance.getPCState(pcID),
        });
      }
    },
    togglePCDimmed(event: PointerEvent, target: HTMLElement): void {
      const pcID = target.dataset["actorId"];
      if (!pcID) {
        return;
      }
      void EunosSockets.getInstance().call("updatePCUI", UserTargetRef.all, {
        [pcID]: PCState.dimmed,
      });
      const locData = EunosOverlay.instance.getLocationSettingsData(
        getSetting("currentLocation"),
      );
      if (locData.pcData[pcID]) {
        locData.pcData[pcID].state = PCState.dimmed;
      }
      void EunosOverlay.instance.setLocationData(
        getSetting("currentLocation"),
        EunosOverlay.instance.deriveLocationFullData(locData),
      );
    },
    togglePCHidden(event: PointerEvent, target: HTMLElement): void {
      const pcID = target.dataset["actorId"];
      if (!pcID) {
        return;
      }
      void EunosSockets.getInstance().call("updatePCUI", UserTargetRef.all, {
        [pcID]: PCState.hidden,
      });
      const locData = EunosOverlay.instance.getLocationSettingsData(
        getSetting("currentLocation"),
      );
      if (locData.pcData[pcID]) {
        locData.pcData[pcID].state = PCState.hidden;
      }
      void EunosOverlay.instance.setLocationData(
        getSetting("currentLocation"),
        EunosOverlay.instance.deriveLocationFullData(locData),
      );
    },
    togglePCBase(event: PointerEvent, target: HTMLElement): void {
      const pcID = target.dataset["actorId"];
      if (!pcID) {
        return;
      }
      void EunosSockets.getInstance().call("updatePCUI", UserTargetRef.all, {
        [pcID]: PCState.base,
      });
      const locData = EunosOverlay.instance.getLocationSettingsData(
        getSetting("currentLocation"),
      );
      if (locData.pcData[pcID]) {
        locData.pcData[pcID].state = PCState.base;
      }
      void EunosOverlay.instance.setLocationData(
        getSetting("currentLocation"),
        EunosOverlay.instance.deriveLocationFullData(locData),
      );
    },
    async sessionScribeClick(
      event: PointerEvent,
      target: HTMLElement,
    ): Promise<void> {
      kLog.log("sessionScribeClick", { event, target });
      const journalPage =
        await EunosOverlay.instance.getOrCreateSessionJournal();
      if (journalPage) {
        // @ts-expect-error - force is a valid option for render
        await journalPage.sheet.render({ force: true });
        $(journalPage.sheet!.element).addClass("session-scribe-open");
      }
    },
    async wakeAllPCs(event: PointerEvent, target: HTMLElement): Promise<void> {
      kLog.log("wakeAllPCs", { event, target });
      const pcs = Object.fromEntries(getOwnedActors().map((actor) => [actor.id!, PCState.base]));
      const locData = EunosOverlay.instance.getLocationSettingsData(
        getSetting("currentLocation"),
      );
      Object.entries(pcs).forEach(([pcID, state]) => {
        if (locData.pcData[pcID]) {
          locData.pcData[pcID].state = state;
        }
      });
      void EunosOverlay.instance.setLocationData(
        getSetting("currentLocation"),
        EunosOverlay.instance.deriveLocationFullData(locData),
      );
      void EunosSockets.getInstance().call("updatePCUI", UserTargetRef.all, pcs);
    },
    async sleepAllPCs(event: PointerEvent, target: HTMLElement): Promise<void> {
      kLog.log("sleepAllPCs", { event, target });
      const pcs = Object.fromEntries(getOwnedActors().map((actor) => [actor.id!, PCState.hidden]));
      const locData = EunosOverlay.instance.getLocationSettingsData(
        getSetting("currentLocation"),
      );
      Object.entries(pcs).forEach(([pcID, state]) => {
        if (locData.pcData[pcID]) {
          locData.pcData[pcID].state = state;
        }
      });
      void EunosOverlay.instance.setLocationData(
        getSetting("currentLocation"),
        EunosOverlay.instance.deriveLocationFullData(locData),
      );
      void EunosSockets.getInstance().call("updatePCUI", UserTargetRef.all, pcs);
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
      togglePCDimmed: EunosOverlay.ACTIONS.togglePCDimmed.bind(EunosOverlay),
      togglePCHidden: EunosOverlay.ACTIONS.togglePCHidden.bind(EunosOverlay),
      togglePCBase: EunosOverlay.ACTIONS.togglePCBase.bind(EunosOverlay),
      sessionScribeClick:
        EunosOverlay.ACTIONS.sessionScribeClick.bind(EunosOverlay),
      wakeAllPCs: EunosOverlay.ACTIONS.wakeAllPCs.bind(EunosOverlay),
      sleepAllPCs: EunosOverlay.ACTIONS.sleepAllPCs.bind(EunosOverlay),
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

    // Register hook to re-render GM overlaywhen any PC actor is updated
    Hooks.on("updateActor", (actor: Actor) => {
      if (!getUser().isGM) {
        return;
      }
      if (actor.type === "pc") {
        void EunosOverlay.instance.render({ parts: ["pcsGM"] });
      }
    });

    // Initialize PCUIStatus for fresh render
    getOwnedActors().forEach((actor) => {
      this.instance.PCUIStatus[actor.id!] = PCState.hidden;
    });

    await this.instance.render({ force: true });
    // const uiForCurrentLocation = this.instance.getPCUIData(getSetting("currentLocation"));
    // await this.instance.updatePCUI(uiForCurrentLocation);

    // setTimeout(() => {
    //   void this.instance.goToLocation(
    //     null,
    //     "High-Z",
    //     true,
    //   );
    // }, 500);
  }

  static async PostInitialize() {
    if (!getSetting("isEntryVisible")) {
      $(".background-layer").addClass("entry-hidden");
    }
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

    setLocation: (data: { fromLocation: string; toLocation: string }) => {
      void EunosOverlay.instance.goToLocation(
        data.fromLocation,
        data.toLocation,
      );
    },

    refreshLocationImage: (data: { imgKey: string }) => {
      void EunosOverlay.instance.refreshLocationImage(data.imgKey);
    },

    updatePCUI: (data: Record<IDString, PCState>) => {
      kLog.log("updatePCUI Called", data);
      void EunosOverlay.instance.updatePCUI(data);
    },

    playMedia: (data: { mediaName: string, mediaData?: Partial<EunosMediaData> }) => {
      data.mediaData ??= {};
      const media = EunosMedia.GetMedia(data.mediaName);
      void media.play(data.mediaData, false);
    },

    killMedia: (data: { mediaName: string }) => {
      const media = EunosMedia.GetMedia(data.mediaName);
      void media.kill(3);
    },

    requestSoundSync: async ({
      userId
    }: {
      userId: string;
    }) => {
      const playingSounds = Object.fromEntries(
        await Promise.all(
          EunosMedia.GetLoopingPlayingSounds()
            .map(async (sound) => [sound.name, await sound.getSettingsData()])
        )
      ) as Record<string, EunosMediaData>;
      kLog.log(`GM returning playing sounds: ${Object.keys(playingSounds).join(", ")}`, playingSounds);
      void EunosSockets.getInstance().call("syncSounds", userId, {
        sounds: playingSounds,
      });
    },

    syncSounds: async ({
      sounds,
    }: {
      sounds: Record<string, EunosMediaData>;
    }) => {
      for (const [soundName, soundData] of Object.entries(sounds)) {
        const sound = EunosMedia.GetMedia(soundName);
        kLog.log(`Syncing sound '${soundName}' to volume '${soundData.volume}' with fade-in '${soundData.fadeInDuration}'`);
        void sound.play({ volume: soundData.volume, fadeInDuration: soundData.fadeInDuration });
      }
    }
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
  // #pcs: Maybe<HTMLElement>;

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
    const pcs = this.element.querySelector(
      getUser().isGM ? "#PCS-GM" : "#PCS",
    ) as Maybe<HTMLElement>;
    if (!pcs) {
      throw new Error("PCS not found");
    }
    return $(pcs);
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
      this.countdownContainer$.css("visibility", PCState.hidden);
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
    await this.getAmbientAudio(false).kill(3);
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
      default: "ok"
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
        duration: PRE_SESSION.BLACK_BARS_ANIMATION_OUT_DURATION,
        ease: "none",
      },
      0,
    ).to(
      bottomBar$,
      {
        height: 0,
        duration: PRE_SESSION.BLACK_BARS_ANIMATION_OUT_DURATION,
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

    // Schedule animating-out of black bars
    setTimeout(() => {
      void this.animateOutBlackBars();
    }, PRE_SESSION.BLACK_BARS_ANIMATION_OUT_VIDEO_DELAY * 1000);
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

  // #region SESSION SCRIBE ~
  private topUpSessionScribeDeck(currentDeck?: IDString[]): IDString[] {
    currentDeck ??= getSetting("sessionScribeDeck");
    const missingUserIDs = getUsers()
      .filter((user) => !user.isGM && !currentDeck.includes(user.id!))
      .map((user) => user.id!);
    // Shuffle the missing IDs and add them to the bottom of the deck
    const shuffledMissingUserIDs = missingUserIDs.sort(
      () => Math.random() - 0.5,
    );
    return [...currentDeck, ...shuffledMissingUserIDs];
  }
  private async setSessionScribe(isDebugging = false): Promise<void> {
    const lastSessionScribeID = getSetting("sessionScribe");
    let currentDeck = getSetting("sessionScribeDeck");
    const setAsideUserIDs: IDString[] = [];
    let sessionScribeID: Maybe<IDString> = undefined;
    while (!sessionScribeID) {
      if (currentDeck.length === 0) {
        currentDeck = this.topUpSessionScribeDeck(setAsideUserIDs).filter(
          (id) => !setAsideUserIDs.includes(id),
        );
      }
      sessionScribeID = currentDeck.shift()!;
      if (lastSessionScribeID === sessionScribeID && currentDeck.length > 0) {
        currentDeck.push(sessionScribeID);
        sessionScribeID = undefined;
      } else if (!isDebugging && !getUser(sessionScribeID).active) {
        setAsideUserIDs.push(sessionScribeID);
        sessionScribeID = undefined;
      }
    }
    // Return set-aside IDs to the top of the deck, then write it to settings
    currentDeck = [...setAsideUserIDs, ...currentDeck];
    void setSetting("sessionScribeDeck", currentDeck);
    await setSetting("sessionScribe", sessionScribeID);
  }
  // #endregion SESSION SCRIBE ~

  // #region DRAMATIC HOOK ASSIGNMENT ~
  private async setDramaticHookAssignments(isDebugging = false): Promise<void> {
    // Collect all active users and their actors
    // let activeUsers = getUsers().filter((user) => !user.isGM && user.active);
    let activeUsers = getUsers().filter((user) => !user.isGM);
    // If there are fewer than three active users, do not assign dramatic hooks.
    if (activeUsers.length < 3) {
      if (isDebugging) {
        const allUsers = getUsers().filter((user) => !user.isGM);
        const missingUser = randElem(allUsers);
        activeUsers = allUsers.filter((user) => user.id !== missingUser.id);
        const missingUserName = missingUser.name;
        kLog.log(
          `Debugging is enabled: Simulating one missing user, '${missingUserName}'`,
        );
      } else {
        kLog.log("Not enough active users to assign dramatic hooks");
        return;
      }
    }
    const activeActors = activeUsers.map((user) => user.character);

    // Create a mapping of userID to their actorID for quick lookup
    const userToActorMap = new Map(
      activeUsers.map((user) => [user.id, user.character]),
    );

    // Keep trying until we get a valid solution
    kLog.log("Getting dramatic hook assignments");
    while (true) {
      // Fisher-Yates shuffle the actors
      const shuffledActors = [...activeActors];
      for (let i = shuffledActors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledActors[i], shuffledActors[j]] = [
          shuffledActors[j]!,
          shuffledActors[i]!,
        ];
      }

      // Check if this shuffle creates any self-assignments
      const hasSelfAssignment = activeUsers.some(
        (user, index) => shuffledActors[index] === userToActorMap.get(user.id),
      );

      // If there are no self-assignments, write to settings and return
      if (!hasSelfAssignment) {
        const assignmentMap = Object.fromEntries(
          activeUsers.map((user, index) => [
            user.name,
            shuffledActors[index]!.name
          ]),
        );
        const dramaticHookAssignments = Object.fromEntries(
          activeUsers.map((user, index) => [
            user.id!,
            shuffledActors[index]!.id!,
          ]),
        ) as Record<IDString, IDString>;
        kLog.log("No self-assignments, returning assignments", {assignmentMap, dramaticHookAssignments});
        await setSetting(
          "dramaticHookAssignments",
          dramaticHookAssignments,
        );
        return;
      }
      // If there were self-assignments, the while loop will continue and try again
      kLog.log("Self-assignments found, trying again");
    }
  }

  // #endregion DRAMATIC HOOK ASSIGNMENT ~

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
    await this.initializeLoadingScreenItemRotation();
    await Promise.all([
      this.initializeCountdown(),
      this.initializePreSessionSong(),
      this.initializeAmbientAudio(),
    ]);
    this.initializeVideoPreloading();
    if (!getUser().isGM) return;

    // GM assigns dramatic hooks and session scribe to settings
    void this.setDramaticHookAssignments();
    void this.setSessionScribe();
  }

  async sync_SessionLoading() {
    addClassToDOM("session-loading");
    await this.initializeLoadingScreenItemRotation();
    await Promise.all([
      this.initializeCountdown(),
      this.initializePreSessionSong(),
      this.preloadIntroVideo(),
      this.initializeAmbientAudio(),
    ]);
    if (!getUser().isGM) return;

    // GM assigns dramatic hooks and session scribe to settings
    void this.setDramaticHookAssignments();
    void this.setSessionScribe();
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
    if (getUser().isGM) {
      // GM triggers video playback for all clients
      void EunosSockets.getInstance().call(
        "startVideoPlayback",
        UserTargetRef.all,
      );
    }
    void this.buildPCPortraitTimelines();
    gsap.to(this.stage$, {
      filter: "brightness(0)",
      duration: 0,
      ease: "none",
    });
  }

  async sync_SessionStarting(): Promise<void> {
    addClassToDOM("session-starting");
    void this.buildPCPortraitTimelines();
    gsap.to(this.stage$, {
      filter: "brightness(0)",
      duration: 0,
      ease: "none",
    });
    await this.playIntroVideo();
  }

  private async cleanup_SessionStarting(): Promise<void> {
    await this.killIntroVideo();
    this.unfreezeOverlay();
    removeClassFromDOM("session-starting");
  }
  // #endregion SessionStarting Methods

  async fadeOutBlackdrop() {
    await gsap
      .timeline()
      .fromTo(
        "#BLACKOUT-LAYER",
        { opacity: 1 },
        { opacity: 0, duration: 3, ease: "power2.inOut" },
      )
      .fromTo(
        "#PCS",
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: "power2.inOut" },
        2,
      );
  }

  // #region SessionRunning Methods
  private async initialize_SessionRunning(): Promise<void> {
    void this.buildPCPortraitTimelines();
    void this.initializeLocation(true);
    addClassToDOM("session-running");
    await this.fadeOutBlackdrop();
    void this.updatePCUI();
    // this.render({parts: ["pcs"]});
    if (!getUser().isGM) {
      return;
    }
    // Send an Alert to the session scribe
    void EunosAlerts.Alert({
      type: AlertType.central,
      header: `<br/>You are the Session Scribe!`,
      body: `<br/>It is your responsibility this session to maintain a bullet list of this chapter's highlights: major plot events, character revelations, and other important details. As a reward, you'll gain 1 Experience Point at the conclusion of the session.<br/><br/>The session scribe icon at the top right of your screen will open a notepad where you can record your notes during play.<br/><br/>Thank you kindly for your service!`,
      target: getSetting("sessionScribe"),
      displayDuration: 12,
      soundName: "alert-hit-session-scribe",
      logoImg: "modules/eunos-kult-hacks/assets/images/stage/session-scribe-quill.webp",
    });
  }

  async sync_SessionRunning() {
    void this.buildPCPortraitTimelines();
    addClassToDOM("session-running");
    kLog.log("Fading Out Backdrop");
    // setTimeout(() => {
    void this.initializeLocation(true);
    // }, 1000);
    await this.fadeOutBlackdrop();
    void this.updatePCUI();

    // kLog.log("Faded Out Backdrop");
    // void this.initializeLocation(true);
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
  private PCsGlobalData: Record<"1" | "2" | "3" | "4" | "5", PCs.GlobalData> =
    {} as Record<"1" | "2" | "3" | "4" | "5", PCs.GlobalData>;
  private getPCsGlobalData(): Record<
    "1" | "2" | "3" | "4" | "5",
    PCs.GlobalData
  > {
    if (Object.keys(this.PCsGlobalData).length > 0) {
      return this.PCsGlobalData;
    }
    const staticData = this.getPCsGlobalSettingsData();
    const fullData: Array<Omit<PCs.GlobalData, "slot">> = [];
    for (const data of staticData) {
      const actor = getActors().find((a) => a.id === data.actorID) as Maybe<
        EunosActor & { system: ActorDataPC }
      >;
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
    const dataRecord: Partial<
      Record<"1" | "2" | "3" | "4" | "5", PCs.GlobalData>
    > = {};
    Object.values(fullData).forEach((data, index) => {
      dataRecord[String(index + 1) as "1" | "2" | "3" | "4" | "5"] = {
        ...data,
        slot: String(index + 1) as "1" | "2" | "3" | "4" | "5",
      };
    });
    this.PCsGlobalData = dataRecord as Record<
      "1" | "2" | "3" | "4" | "5",
      PCs.GlobalData
    >;
    return this.PCsGlobalData;
  }

  private getDefaultLocationPCData(): Array<Location.PCData.SettingsData> {
    const pcGlobalData = this.getPCsGlobalData();
    const pcData: Array<Location.PCData.SettingsData> = [];
    Object.values(pcGlobalData).forEach((data) => {
      pcData.push({
        ...data,
        state: PCState.hidden,
      });
    });
    return pcData;
  }

  private async setLocationPCData(
    location: string,
    fullData: Location.PCData.FullData,
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

  // private pcPortraitTimelines: Record<
  //   IDString,
  //   Record<string, gsap.core.Timeline>
  // > = {} as Record<IDString, Record<string, gsap.core.Timeline>>;

  private pcMasterTimelines: Record<IDString, gsap.core.Timeline> =
    {} as Record<IDString, gsap.core.Timeline>;
  private pcSwayTimelines: Record<IDString, gsap.core.Timeline> = {} as Record<
    IDString,
    gsap.core.Timeline
  >;
  private pcMaskedTimelines: Record<IDString, gsap.core.Timeline> =
    {} as Record<number, gsap.core.Timeline>;

  private slotStats = {
    "1": {
      bottom: -30,
      skewX: 0,
      skewY: -5,
      rotationX: 100,
      scale: 0.9,
    },
    "2": {
      bottom: -15,
      skewX: 0,
      skewY: -2.5,
      rotationX: 100,
      scale: 0.95,
    },
    "3": {
      bottom: 0,
      skewX: 0,
      skewY: 0,
      rotationX: 100,
      scale: 1,
    },
    "4": {
      bottom: -15,
      skewX: 0,
      skewY: 2.5,
      rotationX: 100,
      scale: 0.95,
    },
    "5": {
      bottom: -30,
      skewX: 0,
      skewY: 5,
      rotationX: 100,
      scale: 0.9,
    },
  };

  private buildHiddenToDimmedTimeline(
    pcContainer$: JQuery,
    slot: "1" | "2" | "3" | "4" | "5",
  ): gsap.core.Timeline {
    const pcID = pcContainer$.attr("data-pc-id") as Maybe<IDString>;
    if (!pcID) {
      throw new Error(`PC ID not found for pcContainer$`);
    }

    const spotlightContainer$ = pcContainer$.find(".pc-spotlight-container");
    const shadow$ = pcContainer$.find(".pc-portrait-shadow-main");
    const shadowEmpty$ = pcContainer$.find(".pc-portrait-shadow-empty");
    const sessionScribeIndicator$ = pcContainer$.find(
      ".session-scribe-indicator",
    );

    const portraitContainer$ = pcContainer$.find(".pc-portrait-container");
    const dramaticHookCandleIndicator$ = portraitContainer$.find(
      ".dramatic-hook-candle-indicator",
    );
    const portraitWrapper$ = portraitContainer$.find(".pc-portrait-wrapper");
    const interiorWrapper$ = portraitWrapper$.find(
      ".pc-portrait-interior-wrapper",
    );
    const redLightning$ = interiorWrapper$.find(".pc-portrait-red-lightning");
    const smoke$ = interiorWrapper$.find(".pc-portrait-smoke");
    const portraitFg$ = interiorWrapper$.find(".pc-portrait-fg");
    const portraitBg$ = interiorWrapper$.find(".pc-portrait-bg");
    const nameplate$ = interiorWrapper$.find(".pc-portrait-nameplate");
    const frameDark$ = portraitWrapper$.find(".pc-portrait-frame-dark");
    const frameDim$ = portraitWrapper$.find(".pc-portrait-frame-dim");
    const frameMain$ = portraitWrapper$.find(".pc-portrait-frame-main");
    const frameSpotlit$ = portraitWrapper$.find(".pc-portrait-frame-spotlit");

    const tl = gsap
      .timeline()
      // .call(() => {
      //   this.pcSwayTimelines[pcID]?.seek(0).pause();
      // })
      .fromTo(
        portraitWrapper$,
        {
          opacity: 1,
          y: 200,
        },
        {
          y: this.slotStats[slot].bottom,
          duration: 1,
          ease: "bounce.in",
        },
        0,
      )
      .fromTo(
        frameDim$,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
        },
        0,
      )
      .fromTo(
        frameDark$,
        { opacity: 1 },
        {
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
        },
        0.5,
      )
      .fromTo(
        smoke$,
        { opacity: 0, filter: "contrast(1.5) brightness(0.15)" },
        {
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
        },
        0,
      )
      .fromTo(
        portraitBg$,
        {
          opacity: 0,
          filter: "grayscale(1) brightness(0)"
        },
        {
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
        },
        0.5,
      )
      .fromTo(
        shadowEmpty$,
        {
          opacity: 0.7,
          y: 100,
        },
        {
          opacity: 0,
          y: 0,
          duration: 0.25,
          ease: "power3.out",
        },
        0.25
      )
      .fromTo(
        shadow$,
        {
          opacity: 0,
          y: 100,
        },
        {
          opacity: 0.7,
          y: 0,
          duration: 0.25,
          ease: "power3.out",
        },
        0.25,
      );

    //   if (sessionScribeIndicator$.length || dramaticHookCandleIndicator$.length) {
    //     tl.fromTo([
    //       sessionScribeIndicator$,
    //       dramaticHookCandleIndicator$
    //     ].filter((el) => el.length), {opacity: 0}, {
    //       opacity: 1,
    //       duration: 0.25,
    //       ease: "power3.out"
    //     }, ">")
    // }

    // tl.call(() => {
    //   this.pcSwayTimelines[pcID]?.play();
    // });

    return tl;
  }

  private buildDimmedToBaseTimeline(
    pcContainer$: JQuery,
    slot: "1" | "2" | "3" | "4" | "5",
  ): gsap.core.Timeline {
    const spotlightContainer$ = pcContainer$.find(".pc-spotlight-container");
    const lights$ = spotlightContainer$.find(".pc-spotlight");
    const onLights$ = lights$.filter(".pc-spotlight-on");
    const offLights$ = lights$.filter(".pc-spotlight-off");
    const shadow$ = pcContainer$.find(".pc-portrait-shadow");
    const sessionScribeIndicator$ = pcContainer$.find(
      ".session-scribe-indicator",
    );

    const portraitContainer$ = pcContainer$.find(".pc-portrait-container");
    const dramaticHookCandleIndicator$ = portraitContainer$.find(
      ".dramatic-hook-candle-indicator",
    );
    const portraitWrapper$ = portraitContainer$.find(".pc-portrait-wrapper");
    const interiorWrapper$ = portraitWrapper$.find(
      ".pc-portrait-interior-wrapper",
    );
    const redLightning$ = interiorWrapper$.find(".pc-portrait-red-lightning");
    const smoke$ = interiorWrapper$.find(".pc-portrait-smoke");
    const portraitFg$ = interiorWrapper$.find(".pc-portrait-fg");
    const portraitBg$ = interiorWrapper$.find(".pc-portrait-bg");
    const nameplate$ = interiorWrapper$.find(".pc-portrait-nameplate");
    const frameDark$ = portraitWrapper$.find(".pc-portrait-frame-dark");
    const frameDim$ = portraitWrapper$.find(".pc-portrait-frame-dim");
    const frameMain$ = portraitWrapper$.find(".pc-portrait-frame-main");
    const frameSpotlit$ = portraitWrapper$.find(".pc-portrait-frame-spotlit");

    return gsap
      .timeline()
      .to(
        smoke$,
        {
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
        },
        0.25,
      )
      .fromTo(
        frameMain$,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1,
          ease: "power3.out",
        },
        0,
      )
      .fromTo(
        redLightning$,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.5,
          ease: "power3.out"
        },
        0.5
      )
      .to(
        frameDim$,
        {
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
        },
        0.5,
      )
      .fromTo(
        nameplate$,
        { filter: "grayscale(1) brightness(1)" },
        {
          filter: "grayscale(0) brightness(1)",
          duration: 0.5,
          ease: "power3.out",
        },
        0.5,
      )
      .to(
        portraitBg$,
        {
          filter: "grayscale(0.5) brightness(1)",
          duration: 0.5,
          ease: "power3.out",
        },
        0.5,
      )
      .fromTo(
        portraitFg$,
        {
          opacity: 0,
          scale: 0.8,
          // y: -60,
          filter: "grayscale(0.5) brightness(0) blur(15px)",
        },
        {
          scale: 1,
          y: 0,
          opacity: 1,
          filter: "grayscale(0.5) brightness(1) blur(0px)",
          duration: 0.5,
          ease: "power3.out",
        },
        0.25,
      )
      .fromTo(
        offLights$,
        { y: 500, opacity: 1 },
        {
          y: 0,
          duration: 0.5,
          stagger: {
            amount: 0.5,
            ease: "power2",
          },
        },
        0,
      )
      .fromTo(
        onLights$,
        { y: 500, opacity: 0 },
        {
          y: 0,
          duration: 0.5,
        },
        0,
      );
  }
  private buildBaseToSpotlitTimeline(
    pcContainer$: JQuery,
    slot: "1" | "2" | "3" | "4" | "5",
  ): gsap.core.Timeline {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const ease = CustomEase.create(
      "flickerIn",
      EASES.flickerIn,
    ) as gsap.EaseFunction;

    const spotlightContainer$ = pcContainer$.find(".pc-spotlight-container");
    const lights$ = spotlightContainer$.find(".pc-spotlight");
    const onLights$ = lights$.filter(".pc-spotlight-on");
    const offLights$ = lights$.filter(".pc-spotlight-off");
    const shadow$ = pcContainer$.find(".pc-portrait-shadow");
    const sessionScribeIndicator$ = pcContainer$.find(
      ".session-scribe-indicator",
    );

    const portraitContainer$ = pcContainer$.find(".pc-portrait-container");
    const dramaticHookCandleIndicator$ = portraitContainer$.find(
      ".dramatic-hook-candle-indicator",
    );
    const portraitWrapper$ = portraitContainer$.find(".pc-portrait-wrapper");
    const interiorWrapper$ = portraitWrapper$.find(
      ".pc-portrait-interior-wrapper",
    );
    const redLightning$ = interiorWrapper$.find(".pc-portrait-red-lightning");
    const smoke$ = interiorWrapper$.find(".pc-portrait-smoke");
    const portraitFg$ = interiorWrapper$.find(".pc-portrait-fg");
    const portraitBg$ = interiorWrapper$.find(".pc-portrait-bg");
    const nameplate$ = interiorWrapper$.find(".pc-portrait-nameplate");
    const frameDark$ = portraitWrapper$.find(".pc-portrait-frame-dark");
    const frameDim$ = portraitWrapper$.find(".pc-portrait-frame-dim");
    const frameMain$ = portraitWrapper$.find(".pc-portrait-frame-main");
    const frameSpotlit$ = portraitWrapper$.find(".pc-portrait-frame-spotlit");

    return gsap
      .timeline()
      .to(
        onLights$,
        {
          opacity: 1,
          ease,
          duration: 1,
          stagger: {
            amount: 0.5,
            ease: "power2",
          },
        },
        0,
      )
      .fromTo(
        frameSpotlit$,
        { opacity: 0 },
        {
          opacity: 1,
          ease,
          duration: 0.5,
        },
        0.5,
      )
      .to(
        [portraitBg$, portraitFg$, nameplate$],
        {
          filter: "grayscale(0) brightness(1.5) blur(0px)",
          duration: 0.5,
          ease,
        },
        0.5,
      );
    // .to([portraitBg$, portraitFg$], {
    //   scale: 1.25,
    //   y: 25,
    //   duration: 0.5,
    //   ease
    // }, 0.5);
  }

  private buildToMaskedTimeline(pcID: IDString): gsap.core.Timeline {
    if (this.pcMaskedTimelines[pcID]) {
      this.pcMaskedTimelines[pcID].seek("unmasked").kill();
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.pcMaskedTimelines[pcID];
    }

    const pcContainer$ = $(`.pc-container[data-pc-id="${pcID}"]`);
    if (!pcContainer$.length) {
      throw new Error(`PC container for pcID '${pcID}' not found.`);
    }
    const portraitContainer$ = pcContainer$.find(".pc-portrait-container");
    const frames$ = portraitContainer$.find(".pc-portrait-frame");

    return gsap
      .timeline({ paused: true })
      .addLabel("unmasked")
      .to(frames$, {
        opacity: 0,
        duration: 0.5,
        ease: "power3.out",
      })
      .addLabel(PCState.masked);
  }

  private buildMasterPCTimeline(pcID: IDString): gsap.core.Timeline {
    // If this is a GM user, return a blank timeline.
    if (getUser().isGM) {
      return gsap.timeline({ paused: true });
    }

    if (this.pcMasterTimelines[pcID]) {
      this.pcMasterTimelines[pcID].seek(PCState.hidden).kill();
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.pcMasterTimelines[pcID];
    }

    const pcContainer$ = $(`.pc-container[data-pc-id="${pcID}"]`);
    if (!pcContainer$.length) {
      throw new Error(`PC container for pcID '${pcID}' not found.`);
    }
    const slot = pcContainer$.attr("data-slot") as Maybe<
      "1" | "2" | "3" | "4" | "5"
    >;
    if (!slot) {
      throw new Error(`Slot for PC '${pcID}' not found.`);
    }

    const spotlightContainer$ = pcContainer$.find(".pc-spotlight-container");
    const lights$ = spotlightContainer$.find(".pc-spotlight");
    const onLights$ = lights$.filter(".pc-spotlight-on");
    const offLights$ = lights$.filter(".pc-spotlight-off");
    const shadow$ = pcContainer$.find(".pc-portrait-shadow");
    const sessionScribeIndicator$ = pcContainer$.find(
      ".session-scribe-indicator",
    );

    const portraitContainer$ = pcContainer$.find(".pc-portrait-container");
    const dramaticHookCandleIndicator$ = portraitContainer$.find(
      ".dramatic-hook-candle-indicator",
    );
    const portraitWrapper$ = portraitContainer$.find(".pc-portrait-wrapper");
    const interiorWrapper$ = portraitWrapper$.find(
      ".pc-portrait-interior-wrapper",
    );
    const redLightning$ = interiorWrapper$.find(".pc-portrait-red-lightning");
    const smoke$ = interiorWrapper$.find(".pc-portrait-smoke");
    const portraitFg$ = interiorWrapper$.find(".pc-portrait-fg");
    const portraitBg$ = interiorWrapper$.find(".pc-portrait-bg");
    const nameplate$ = interiorWrapper$.find(".pc-portrait-nameplate");
    const frameDark$ = portraitWrapper$.find(".pc-portrait-frame-dark");
    const frameDim$ = portraitWrapper$.find(".pc-portrait-frame-dim");
    const frameMain$ = portraitWrapper$.find(".pc-portrait-frame-main");
    const frameSpotlit$ = portraitWrapper$.find(".pc-portrait-frame-spotlit");

    kLog.log(`Building master timeline for PC ${pcID}`, {
      slot,
      slotStats: this.slotStats[slot],
      pcContainer$,
      portraitContainer$,
      lights$,
      onLights$,
      offLights$,
      shadow$,
      sessionScribeIndicator$,
      dramaticHookCandleIndicator$,
      portraitWrapper$,
      interiorWrapper$,
      redLightning$,
      smoke$,
      portraitFg$,
      portraitBg$,
      nameplate$,
      frameDark$,
      frameDim$,
      frameMain$,
      frameSpotlit$,
    });

    const tl = gsap.timeline({ paused: true });
    tl.addLabel(PCState.hidden);

    // Add sub-timelines
    tl.add(this.buildHiddenToDimmedTimeline(pcContainer$, slot))
      .addLabel(PCState.dimmed)
      .add(this.buildDimmedToBaseTimeline(pcContainer$, slot))
      .addLabel(PCState.base)
      .add(this.buildBaseToSpotlitTimeline(pcContainer$, slot))
      .addLabel(PCState.spotlit);

    kLog.log("Master timeline for PC", { tl });

    return tl;
  }

  private buildSwayingLoopTimeline(pcID: IDString): gsap.core.Timeline {
    if (this.pcSwayTimelines[pcID]) {
      this.pcSwayTimelines[pcID].seek(PCState.hidden).kill();
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.pcSwayTimelines[pcID];
    }

    const pcContainer$ = $(`.pc-container[data-pc-id="${pcID}"]`);
    if (!pcContainer$.length) {
      throw new Error(`PC container for pcID '${pcID}' not found.`);
    }
    const portraitContainer$ = pcContainer$.find(".pc-portrait-container");
    // const portraitWrapper$ = portraitContainer$.find(".pc-portrait-wrapper");

    return gsap
      .timeline({ repeat: -1, yoyo: true, repeatRefresh: true, paused: true })
      .to(portraitContainer$, {
        // x: "random(-5, 5, 1)",
        y: "random(-25, 25, 1)",
        // rotate: "random(-3, 3, 1)",
        ease: "sine.inOut",
        duration: 20,
        repeatRefresh: true,
      });
  }

  private buildHookDisplayTimeline(hookContainer$: JQuery): gsap.core.Timeline {
    const tl = gsap.timeline({repeatRefresh: true});
    tl.fromTo(hookContainer$, {
      opacity: 0,
      y: 100,
      scale: 0.75,
      filter: "blur(10px)"
    }, {
      opacity: 1,
      y: 30,
      scale: 1,
      filter: "blur(0px)",
      duration: 3,
      ease: "sine.inOut",
    })
    // .fromTo(hookContainer$, {
    //   x: -25,
    // }, {
    //   x: 25,
    //   duration: 3,
    //   repeat: 3,
    //   yoyo: true,
    //   ease: "sine.inOut",
    // }, 0)
    .fromTo(hookContainer$, {
      y: 30,
    }, {
      y: 20,
      duration: 4,
      repeat: 6,
      yoyo: true,
      ease: "sine.inOut",
    }, 0)
    .to(hookContainer$, {
      opacity: 0,
      scale: 2,
      filter: "blur(10px)",
      duration: 3,
      ease: "power3.in",
    })
    .to(hookContainer$, {
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      duration: 0,
    });
    return tl;
  }

  private getDramaticHookContainer(pcID: IDString, index: 1|2): JQuery {
    const container$ = this.pcs$.find(`.pc-container[data-pc-id="${pcID}"]`);
    if (!container$.length) {
      throw new Error(`PC container for pcID '${pcID}' not found.`);
    }
    const hookContainer$ = container$.find(".dramatic-hook-container");
    if (hookContainer$.length < index) {
      throw new Error(`Dramatic hook container for pcID '${pcID}' and index '${index}' not found.`);
    }
    return $(hookContainer$[index - 1] as HTMLElement);
  }

  private buildDramaticHookTimeline(): gsap.core.Timeline {
    const activeActors = getOwnedActors()
      .filter((actor) => actor.isPC() && getOwnerOfDoc(actor)?.id !== getUser().id);
    const activeActorContainers: [IDString, 1|2][] = [];
    activeActors.forEach((actor) => {
      activeActorContainers.push([actor.id!, 1], [actor.id!, 2]);
    });
    kLog.log(`Active actor containers:`, activeActorContainers);
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatRefresh: true });
    shuffle(activeActorContainers).forEach(([pcID, index]) => {
      tl.call(() => {
        const actor = getActorFromRef(pcID);
        if (!actor?.isPC()) {
          kLog.log(`Actor ${pcID} is not a PC, skipping dramatic hook display.`, actor);
          return;
        }
        const hookData = actor.system.dramatichooks[`dramatichook${index}`];
        if (!hookData.content || hookData.isChecked) {
          kLog.log(`Actor ${pcID} has no dramatic hook content or is already checked, skipping dramatic hook display.`, hookData);
          return;
        }
        const container$ = this.getDramaticHookContainer(pcID, index);
        kLog.log(`Playing hook display timeline for actor ${pcID} and index ${index}.`, container$);
        this.buildHookDisplayTimeline(container$).play();
      }, [], "+=50");
    });
    return tl;
  }

  public async buildPCPortraitTimelines() {
    const ownedActors = getOwnedActors();
    ownedActors.forEach((actor) => {
      this.pcMasterTimelines[actor.id!] = this.buildMasterPCTimeline(actor.id!);
      this.pcSwayTimelines[actor.id!] = this.buildSwayingLoopTimeline(
        actor.id!,
      );
      this.pcMaskedTimelines[actor.id!] = this.buildToMaskedTimeline(actor.id!);
      this.pcMasterTimelines[actor.id!]?.seek(0);
    });
    if (!getUser().isGM) {
      this.buildDramaticHookTimeline().play();
    }
  }

  private getPCState(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    pcID: IDString | "1" | "2" | "3" | "4" | "5",
    location?: string,
  ): PCState {
    location ??= getSetting("currentLocation");
    const locData = this.getLocationData(location).pcData;
    if (pcID in locData) {
      return locData[pcID as "1" | "2" | "3" | "4" | "5"].state;
    }
    const pcData = this.extractPCUIDataFromFullData(locData);
    return pcData?.[pcID] ?? PCState.base;
  }

  private extractPCUIDataFromFullData(
    pcData?: Record<"1" | "2" | "3" | "4" | "5", Location.PCData.FullData>,
  ): Record<IDString, PCState> {
    pcData ??= this.getLocationData(getSetting("currentLocation")).pcData;
    const pcUIData: Record<IDString, PCState> = {};
    Object.values(pcData).forEach((data) => {
      pcUIData[data.actorID] = data.state;
    });
    return pcUIData;
  }

  private PCUIStatus: Record<IDString, PCState> = {} as Record<
    IDString,
    PCState
  >;

  public async updatePCUI(
    data?:
      | Record<IDString, PCState>
      | Record<"1" | "2" | "3" | "4" | "5", Location.PCData.FullData>,
  ) {
    kLog.log("updatePCUI function called", data);

    // First check whether this user is the session scribe. If so, add the "session-scribe" class to the #PCS overlay.
    if (getUser().id === getSetting("sessionScribe")) {
      this.pcs$.addClass("session-scribe");
    } else {
      this.pcs$.removeClass("session-scribe");
    }

    // return;
    if (
      data &&
      Object.keys(data).some((key) => ["1", "2", "3", "4", "5"].includes(key))
    ) {
      data = this.extractPCUIDataFromFullData(
        data as Record<"1" | "2" | "3" | "4" | "5", Location.PCData.FullData>,
      );
    }
    data ??= this.extractPCUIDataFromFullData(this.getLocationData().pcData);
    const timelineLabels = shuffle(Object.entries(data));
    const delay = 0;
    // let isDelaying = false;

    timelineLabels.forEach(([pcID, state]: [IDString, PCState]) => {
      // isDelaying = false;
    if (getUser().isGM) {
      this.updatePCUI_GM(pcID, state);
    }
      const swayTimeline = this.pcSwayTimelines[pcID];
      const masterTimeline = this.pcMasterTimelines[pcID];
      const maskedTimeline = this.pcMaskedTimelines[pcID];

      if (!swayTimeline) {
        throw new Error(`PC ${pcID} has no sway timeline.`);
      }
      if (!masterTimeline) {
        throw new Error(`PC ${pcID} has no master timeline.`);
      }
      if (!maskedTimeline) {
        throw new Error(`PC ${pcID} has no masked timeline.`);
      }
      const tl = gsap.timeline({ delay });
      if (state === PCState.masked) {
        swayTimeline.pause();
        if (maskedTimeline.currentLabel() !== (PCState.masked as string)) {
          if (masterTimeline.currentLabel() === (PCState.dimmed as string)) {
            masterTimeline.currentLabel(PCState.dimmed);
          } else {
            tl.add(masterTimeline.tweenTo(PCState.dimmed, { duration: 0.5 }));
          }
          tl.add(maskedTimeline.tweenTo(PCState.masked));
          // delay += 0.25;
          return;
        }
      } else if (maskedTimeline.currentLabel() === (PCState.masked as string)) {
        tl.add(maskedTimeline.tweenTo(0, { duration: 0.5 }));
        // isDelaying = true;
      }


      if ([PCState.masked, PCState.hidden].includes(state)) {
        swayTimeline.pause();
      } else {
        swayTimeline.play();
      }

      tl.add(
        masterTimeline.tweenTo(state),
      );


      // if (state === PCState.hidden) {
      //   if (masterTimeline.currentLabel() !== PCState.hidden as string) {
      //     tl.add(masterTimeline.tweenTo(PCState.hidden, {duration: 1}));
      //     isDelaying = true;
      //   }
      // } else if (state === PCState.dimmed) {
      //   if (masterTimeline.currentLabel() !== PCState.dimmed as string) {
      //     tl.add(masterTimeline.tweenTo(PCState.dimmed, {duration: 1}));
      //     isDelaying = true;
      //   }
      // } else if (state === PCState.base) {
      //   if (masterTimeline.currentLabel() !== PCState.base as string) {
      //     tl.add(masterTimeline.tweenTo(PCState.base, {duration: 1}));
      //     isDelaying = true;
      //   }
      // } else if (state === PCState.spotlit) {
      //   if (masterTimeline.currentLabel() !== PCState.spotlit as string) {
      //     tl.add(masterTimeline.tweenTo(PCState.spotlit, {duration: 1}));
      //     isDelaying = true;
      //   }
      // }

      // delay += 0.25;
    });
  }

  public async updateStabilityBG(actor: EunosActor) {
    const bgImage = actor.getPortraitImage("bg");
    // if (!bgImage) {
    //   return;
    // }
    const pcContainer$ = $(`.pc-container[data-pc-id="${actor.id}"]`);
    const bg$ = pcContainer$.find(".pc-portrait-bg");
    bg$.attr("src", bgImage);
  }

  private updatePCUI_GM(pcID: IDString, state: PCState) {
    const pcContainer$ = EunosOverlay.instance.pcs$
      .find(`.pc-container[data-pc-id="${pcID}"]`);
    switch (state) {
      case PCState.dimmed:
        pcContainer$.addClass("pc-container-dimmed");
        pcContainer$.removeClass("pc-container-spotlit");
        pcContainer$.removeClass("pc-container-hidden");
        pcContainer$.removeClass("pc-container-base");
        pcContainer$
          .find(".pc-stage-control-button")
          .attr("data-value", "false");
        pcContainer$
          .find(".pc-stage-control-button-dim")
          .attr("data-value", "true");
        break;
      case PCState.spotlit:
        pcContainer$.addClass("pc-container-spotlit");
        pcContainer$.removeClass("pc-container-dimmed");
        pcContainer$.removeClass("pc-container-hidden");
        pcContainer$.removeClass("pc-container-base");
        pcContainer$
          .find(".pc-stage-control-button")
          .attr("data-value", "false");
        pcContainer$
          .find(".pc-stage-control-button-spotlight")
          .attr("data-value", "true");
        break;
      case PCState.base:
        pcContainer$.addClass("pc-container-base");
        pcContainer$.removeClass("pc-container-dimmed");
        pcContainer$.removeClass("pc-container-spotlit");
        pcContainer$.removeClass("pc-container-hidden");
        pcContainer$
          .find(".pc-stage-control-button")
          .attr("data-value", "false");
        pcContainer$
          .find(".pc-stage-control-button-base")
          .attr("data-value", "true");
        break;
      case PCState.hidden:
        pcContainer$.addClass("pc-container-hidden");
        pcContainer$.removeClass("pc-container-dimmed");
        pcContainer$.removeClass("pc-container-spotlit");
        pcContainer$.removeClass("pc-container-base");
        pcContainer$
          .find(".pc-stage-control-button")
          .attr("data-value", "false");
        pcContainer$
          .find(".pc-stage-control-button-hide")
          .attr("data-value", "true");
        break;
    }
  }
  // Get current state of PCUI
  // #endregion PC PANEL ~

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

  // #region Assembling Location Data ~
  private getLocationDefaultStaticSettingsData(
    location: string,
  ): Location.StaticSettingsData {
    if (!(location in LOCATIONS)) {
      return {
        name: location,
        images: {},
        description: "",
        mapTransforms: [],
      };
    }
    return LOCATIONS[location as KeyOf<typeof LOCATIONS>];
  }
  private getLocationDefaultDynamicSettingsData(): Location.DynamicSettingsData {
    return {
      currentImage: null,
      pcData: Object.fromEntries(
        this.getDefaultLocationPCData().map((data) => [data.actorID, data]),
      ),
      npcData: {} as Record<IDString, Location.NPCData.SettingsData>,
      playlists: {} as Record<string, EunosMediaData>,
    };
  }
  private getLocationDefaultSettingsData(
    location: string,
  ): Location.SettingsData {
    return {
      ...this.getLocationDefaultStaticSettingsData(location),
      ...this.getLocationDefaultDynamicSettingsData(),
    };
  }
  private getLocationSettingsData(location: string): Location.SettingsData {
    const settingData = getSettings().get(
      "eunos-kult-hacks",
      "locationData",
    ) as Record<string, Location.SettingsData>;

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
  private getLocationPCData(
    pcLocationData?: Record<IDString, Location.PCData.SettingsData>,
  ): Record<"1" | "2" | "3" | "4" | "5", Location.PCData.FullData> {
    const pcGlobalData = this.getPCsGlobalData();
    pcLocationData ??= this.getLocationData(
      getSetting("currentLocation"),
    ).pcData;
    const pcFullData: Record<
      "1" | "2" | "3" | "4" | "5",
      Location.PCData.FullData
    > = {} as Record<"1" | "2" | "3" | "4" | "5", Location.PCData.FullData>;
    (["1", "2", "3", "4", "5"] as const).forEach((slot) => {
      const globalData = pcGlobalData[slot];
      const locData = Object.values(pcLocationData).find(
        (data) => data.actorID === globalData.actorID,
      );
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
  private getLocationNPCData(
    npcLocationData: Record<IDString, Location.NPCData.SettingsData>,
  ): Partial<
    Record<"1" | "2" | "3" | "4" | "5" | "6", Location.NPCData.FullData>
  > {
    const npcFullData: Partial<
      Record<"1" | "2" | "3" | "4" | "5" | "6", Location.NPCData.FullData>
    > = {} as Partial<
      Record<"1" | "2" | "3" | "4" | "5" | "6", Location.NPCData.FullData>
    >;
    (["1", "2", "3", "4", "5", "6"] as const).forEach((slot) => {
      const locData = Object.values(npcLocationData).find(
        (data) => data.slot === slot,
      );
      if (!locData) {
        return;
      }
      npcFullData[slot] = {
        ...locData,
        actor: getActors().find(
          (a) => a.id === locData.actorID,
        ) as EunosActor & { system: ActorDataNPC },
      };
    });
    return npcFullData;
  }
  private getLocationPlaylistData(
    playlists: Record<string, EunosMediaData>,
  ): Record<string, EunosMedia<EunosMediaTypes.audio>> {
    const playlistFullData: Record<string, EunosMedia<EunosMediaTypes.audio>> = {};
    Object.entries(playlists).forEach(([id, data]) => {
      if (EunosMedia.Sounds.has(id)) {
        playlistFullData[id] = EunosMedia.Sounds.get(id)!;
      }
      playlistFullData[id] = new EunosMedia(id, data as EunosMediaData & {type: EunosMediaTypes.audio});
    });
    return playlistFullData;
  }
  private deriveLocationFullData(
    settingsData: Location.SettingsData,
  ): Location.FullData {
    const { pcData, npcData, playlists } = settingsData;

    const pcFullData = this.getLocationPCData(pcData);
    const npcFullData = this.getLocationNPCData(npcData);
    const playlistFullData = this.getLocationPlaylistData(playlists);

    const fullData: Location.FullData = {
      ...settingsData,
      pcData: pcFullData,
      npcData: npcFullData,
      playlists: playlistFullData,
    };
    return fullData;
  }
  private async deriveLocationSettingsData(
    fullData: Location.FullData,
  ): Promise<Location.SettingsData> {
    const { pcData, npcData, playlists, currentImage, ...staticData } = fullData;
    const pcSettingsData: Record<IDString, Location.PCData.SettingsData> =
      Object.fromEntries(
        Object.entries(pcData).map(([slot, data]) => [
          data.actorID,
          { ...data, slot },
        ]),
      );
    const npcSettingsData: Record<IDString, Location.NPCData.SettingsData> =
      Object.fromEntries(
        Object.entries(npcData).map(([slot, data]) => [
          data.actorID,
          {
            slot: slot as "1" | "2" | "3" | "4" | "5" | "6",
            actorID: data.actorID,
            state: data.state,
          },
        ]),
      );
    // Convert playlist data to settings format by getting settings data for each media entry
    const playlistSettingsData: Record<string, EunosMediaData> = Object.fromEntries(
      await Promise.all(
        Object.entries(playlists).map(async ([id, media]: [string, EunosMedia<EunosMediaTypes.audio>]) => {
          const settingsData = await media.getSettingsData();
          return [id, settingsData];
        })
      )
    ) as Record<string, EunosMediaData>;
    return {
      ...staticData,
      currentImage,
      pcData: pcSettingsData,
      npcData: npcSettingsData,
      playlists: playlistSettingsData,
    };
  }
  // #endregion Assembling Location Data ~

  // #region Getting & Setting Location Data & Location PC Data ~
  public getLocationData(location?: string): Location.FullData {
    location ??= getSetting("currentLocation");
    const settingData = this.getLocationSettingsData(location);
    return this.deriveLocationFullData(settingData);
  }

  public getLocationDataForPC(
    location: string,
    pcRef: number | string | EunosActor,
  ): Location.PCData.FullData {
    if (["1", "2", "3", "4", "5"].includes(pcRef as string)) {
      return this.getLocationPCData(this.getLocationData(location).pcData)[
        pcRef as "1" | "2" | "3" | "4" | "5"
      ];
    }
    const actor = getActorFromRef(pcRef as string);
    if (!actor) {
      throw new Error(
        `Actor ${pcRef instanceof Actor ? (pcRef.name ?? "") : String(pcRef)} not found`,
      );
    }
    return Object.values(
      this.getLocationPCData(this.getLocationData(location).pcData),
    ).find((data) => data.actorID === actor.id)!;
  }

  private async setLocationData(location: string, data: Location.FullData) {
    const curData = getSetting("locationData");
    curData[location] = await this.deriveLocationSettingsData(data);
    await setSetting("locationData", curData);
  }

  public async resetLocationData(location?: string) {
    location ??= getSetting("currentLocation");
    const defaultData = this.deriveLocationFullData(this.getLocationDefaultSettingsData(location));
    await this.setLocationData(location, defaultData);
  }

  public async refreshLocationImage(imgKey: string) {
    const locData = this.getLocationData(getSetting("currentLocation"));
    if (imgKey && !locData.images[imgKey]) {
      kLog.error("Location not found", { location: getSetting("currentLocation") });
      return;
    }
    const timeline = gsap.timeline();
    const curSrc = this.locationImage$.attr("src") ?? "";
    const newSrc = imgKey ? locData.images[imgKey]! : "";
    kLog.log("refreshing location image", {curSrc, newSrc});
    if (curSrc === newSrc) {
      return;
    }
    timeline
      .to(this.locationImage$, {opacity: 0, duration: 0.5, ease: "power2.out"})
      .call(() => {
        this.locationImage$.attr("src", newSrc);
      });
    if (newSrc) {
      timeline.to(this.locationContainer$, {
        y: 0,
        x: 0,
        opacity: 1,
        filter: "blur(0)",
        duration: 0,
        ease: "none",
      }).to(this.locationImage$, {opacity: 1, duration: 0.5, ease: "power2.in"}, "<");
    }
  }

  // #endregion

  public async initializeLocation(isSkippingPCs = true) {
    const location = getSetting("currentLocation");
    // if (isZoomingIn) {
    //   await gsap.timeline()
    //     .fromTo(".distant-overlay-layer", {scale: 0.3, filter: "blur(5px)"}, {scale: 1, duration: 10, ease: "power2.in"})
    //     .fromTo(".distant-overlay-layer", {opacity: 1}, {opacity: 0, duration: 3, ease: "power2.out"}, ">=-1")
    // }
    await this.goToLocation(null, location, isSkippingPCs);
  }

  public async setLocation(location: string) {
    if (!getUser().isGM) {
      return;
    }
    const fromLocation = getSetting("currentLocation");
    const locationData = this.getLocationData(location);
    if (!locationData) {
      kLog.error(`Location ${location} not found`);
      return;
    }
    await setSetting("currentLocation", location);
    void EunosSockets.getInstance().call("setLocation", UserTargetRef.all, {
      fromLocation,
      toLocation: location,
    });
  }

  public async setLocationImage(imageKey?: string, location?: string) {
    location ??= getSetting("currentLocation");
    const locationData = this.getLocationData(location);
    if (!locationData) {
      kLog.error("Location not found", { location });
      return;
    }
    if (!imageKey) {
      locationData.currentImage = null;
    } else if (!(imageKey in locationData.images)) {
      kLog.error("Image key not found", { imageKey, location });
      locationData.currentImage = null;
    } else {
      locationData.currentImage = imageKey;
    }
    await this.setLocationData(location, locationData);

    // Refresh for all clients through socket
    kLog.log("refreshing location image", {imgKey: locationData.currentImage ?? ""});
    void EunosSockets.getInstance().call("refreshLocationImage", "all", {imgKey: locationData.currentImage ?? ""});
  }

  #stageWaverTimeline: Maybe<gsap.core.Timeline>;
  public async goToLocation(
    fromLocation: string | null,
    toLocation: string,
    isSkippingPCs = false,
  ) {
    const locationData = this.getLocationData(toLocation);
    const fromLocationData = fromLocation ? this.getLocationData(fromLocation) : null;
    if (!locationData) {
      kLog.error("Location not found", { location: toLocation });
      return;
    }

    if (!this.#stageWaverTimeline) {
      this.#stageWaverTimeline = gsap
        .timeline({ repeat: -1, yoyo: true, repeatRefresh: true })
        .to(this.stage3D$, {
          rotationX: "random(-5, 5, 1)",
          rotationY: "random(-5, 5, 1)",
          rotationZ: "random(-5, 5, 1)",
          ease: "sine.inOut",
          duration: 25,
          repeatRefresh: true,
        });
    }

    const {
      name,
      images,
      currentImage,
      description,
      pcData,
      npcData,
      playlists,
      mapTransforms,
    } = locationData;

    const {
      playlists: fromPlaylists
    } = fromLocationData ?? {playlists: {}};

    // Construct a timeline that will animate all of the map transforms smoothly and simultaneously

    const timeline = gsap.timeline({ paused: true });

    const curImgSrc = currentImage ? images[currentImage] : "";

    // Location Card Animations (currently unimplemented)
    timeline
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
      );

    // If there is a currentImage set, prepare to fade in location panel
    if (curImgSrc) {
      timeline.call(() => {
        this.locationName$.text(name);
        this.locationImage$.attr("src", curImgSrc ?? "");
        this.locationDescription$.html(description ?? "");
      })
      .to(this.locationContainer$, {
        y: 0,
        x: 0,
        filter: "blur(0)",
        duration: 0,
        ease: "none",
      })
    }

    timeline.addLabel("startMoving");

    // Restore brightness to stage background if necessary
    if (gsap.getProperty("#STAGE", "filter") === "brightness(0)") {
      timeline.to("#STAGE", {
        filter: "brightness(1)",
        duration: 1,
        ease: "none",
      }, "startMoving");
    }

    // Apply map transforms for this specific location
    mapTransforms.forEach(({ selector, properties }) => {
      timeline.to(
        selector,
        {
          ...properties,
          duration: 5,
          ease: "back.out(0.1)",
        },
        "startMoving",
      );
    });

    // Fade in the location card
    if (curImgSrc) {
      timeline.to(
        this.locationContainer$,
        {
          opacity: 1,
          duration: 1,
          ease: "power3.inOut",
        },
        "-=0.5",
      );
    }

    await timeline.play();
    if (!isSkippingPCs) {
      void this.updatePCUI(pcData);
    }
    if (getUser().isGM) {
      void this.render({ parts: ["pcsGM"] });
    }
    return timeline;
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

  public togglePlottingPanel(): void {
    const isPlottingLocations = !getSetting("isPlottingLocations");
    this.stage$.find(".positioner-layer").css("visibility", PCState.hidden);
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
    this.locationPlottingPanel$.css("visibility", PCState.hidden);
    // this.removePlottingControlListeners();
  }
  // #endregion Location Plotting ~

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

  private addPCControlListeners() {
    this.pcs$.on(
      "mousedown",
      ".pc-stage-control-button-spotlight",
      (e: JQuery.MouseDownEvent) => {
        const target = e.target as HTMLElement;
        EunosOverlay.ACTIONS.togglePCSpotlight(e, target);
      },
    );
    this.pcs$.on(
      "mouseup",
      ".pc-stage-control-button-spotlight",
      (e: JQuery.MouseUpEvent) => {
        const target = e.target as HTMLElement;
        EunosOverlay.ACTIONS.togglePCSpotlight(e, target);
      },
    );
  }

  private addSafetyButtonListeners() {
    const fadeToBlackRow$ = this.safetyButtons$.find(".safety-button-row-fade");
    const fadeToBlackFg$ = fadeToBlackRow$.find(".label-fg");
    const fadeToBlackIcon$ = fadeToBlackRow$.find(".safety-button-fade");
    const stopSceneRow$ = this.safetyButtons$.find(".safety-button-row-stop");
    const stopSceneFg$ = stopSceneRow$.find(".label-fg");
    const stopSceneIcon$ = stopSceneRow$.find(".safety-button-stop");

    const oldFadeTimeline = fadeToBlackRow$.data("fade-timeline") as Maybe<gsap.core.Timeline>;
    const oldStopSceneTimeline = stopSceneRow$.data("stop-scene-timeline") as Maybe<gsap.core.Timeline>;
    if (oldFadeTimeline) {
      oldFadeTimeline.seek(0).kill();
    }
    if (oldStopSceneTimeline) {
      oldStopSceneTimeline.seek(0).kill();
    }

    const fadeToBlackTimeline = gsap.timeline({
      paused: true
    })
      .to(fadeToBlackFg$, {
        width: 250,
        duration: 2,
        ease: "power2.in",
      })
      .to(fadeToBlackIcon$, {
        filter: "brightness(0)",
        duration: 0.5,
        ease: "power2.inOut",
      }, "-=0.5")
      .call(() => {
        fadeToBlackRow$.css("pointer-events", "none");
        void EunosSockets.getInstance().call("Alert", UserTargetRef.gm, {
          type: AlertType.simple,
          header: "FADE TO BLACK",
          body: "A player has requested a fade to black.",
        });

      })
      .to(fadeToBlackRow$, {
        scale: 2,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out"
      })
      .call(() => {
        fadeToBlackTimeline.seek(0).pause();
        fadeToBlackRow$.attr("style", "");
      }, [],"+=3");

    fadeToBlackRow$.data("fade-timeline", fadeToBlackTimeline);

    const stopSceneTimeline = gsap.timeline({
      paused: true
    })
      .to(stopSceneFg$, {
        width: 250,
        duration: 2,
        ease: "power2.in",
      })
      .to(stopSceneIcon$, {
        filter: "brightness(0)",
        duration: 0.5,
        ease: "power2.inOut",
      }, "-=0.5")
      .call(() => {
        stopSceneRow$.css("pointer-events", "none");
        void EunosSockets.getInstance().call("Alert", UserTargetRef.gm, {
          type: AlertType.simple,
          header: "STOP SCENE",
          body: "A player has requested an immediate scene stop.",
        });

      })
      .to(stopSceneRow$, {
        scale: 2,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out"
      })
      .call(() => {
        stopSceneTimeline.seek(0).pause();
        stopSceneRow$.attr("style", "");
      }, [],"+=3");;

    stopSceneRow$.data("stop-scene-timeline", stopSceneTimeline);

    fadeToBlackRow$.on("mousedown", () => {
      const tl = fadeToBlackRow$.data("fade-timeline") as Maybe<gsap.core.Timeline>;
      kLog.log("fade to black mousedown");
      if (tl) {
        tl.timeScale(1).play();
      }
    })
    .on("mouseup", () => {
      const tl = fadeToBlackRow$.data("fade-timeline") as Maybe<gsap.core.Timeline>;
      if (tl) {
        tl.timeScale(3).reverse();
      }
    });

    stopSceneRow$.on("mousedown", () => {
      const tl = stopSceneRow$.data("stop-scene-timeline") as Maybe<gsap.core.Timeline>;
      if (tl) {
        tl.timeScale(1).play();
      }
    })
    .on("mouseup", () => {
      const tl = stopSceneRow$.data("stop-scene-timeline") as Maybe<gsap.core.Timeline>;
      if (tl) {
        tl.timeScale(3).reverse();
      }
    });
  }

  /**
   * Finds or creates a journal entry for the session scribe
   * @param journalPageName - Name of the journal entry to find or create
   * @returns Promise resolving to the journal entry
   * @private
   */
  private async getOrCreateSessionJournal(
    journalPageName?: string,
    journalName = "Session Scribe Notes",
  ): Promise<JournalEntryPage | null> {
    if (!journalPageName) {
      journalPageName = `Chapter ${getSetting("chapterNumber")} Notes`;
    }
    // Try to find existing journal entry
    let journal: Maybe<JournalEntry> = getJournals().find(
      (j) => j.name === journalName,
    ) as Maybe<JournalEntry>;

    // If the Session Scribe Notes journal entry does not exist, generate the folder (if necessary) and the journal entry.
    if (!journal) {
      // Find the folder for session scribe notes
      const folder: Maybe<Folder> = getFolders().find(
        (f) => f.type === "JournalEntry" && f.name === "Session Scribe Notes",
      );

      // If the folder doesn't exist, send an Alert to the GM to create it.
      if (!folder) {
        void EunosAlerts.Alert({
          type: AlertType.simple,
          target: UserTargetRef.gm,
          header: "Session Scribe Notes Folder Not Found",
          body: "Please create a folder called 'Session Scribe Notes' in the root of your journal collection.",
        });
        return null;
      }

      // Create the journal entry
      const journalData = {
        name: journalName,
        folder: folder.id,
      };
      journal = (await JournalEntry.create(
        journalData as never,
      )) as JournalEntry;
    }

    // Now check if the journal entry has a page with the name `journalPageName`. If not, create it.
    let journalPage = journal?.pages.find((p) => p.name === journalPageName);
    if (!journalPage) {
      journalPage = (
        (await journal?.createEmbeddedDocuments("JournalEntryPage", [{ name: journalPageName, text: { content: "<ul><li><p></p></li></ul>" } },
        ])) as JournalEntryPage[]
      )[0];
    }

    // Add custom styles to the journal page
    this.addJournalStyles(journalPage as JournalEntryPage);

    // Return the journal page.
    return journalPage as JournalEntryPage;
  }

  /**
   * Adds custom styles for a specific journal entry
   * @param journalEntryId - The ID of the journal entry to style
   */
  private addJournalStyles(journalEntryPage: JournalEntryPage): void {
    // Confirm the journal entry page exists and has a sheet
    if (!journalEntryPage.sheet) {
      throw new Error(
        `Journal entry page "${journalEntryPage.name}" does not have a sheet`,
      );
    }

    // Extract the ID attribute of the page's sheet element
    const sheetId = journalEntryPage.sheet.id;

    // Create a unique ID for the style element to avoid duplicates
    const styleId = `custom-journal-style-${sheetId}`;

    // Check if we already added this style
    if (document.getElementById(styleId)) return;

    // Create style element
    const styleElement = document.createElement("style");
    styleElement.id = styleId;

    // Add CSS rules targeting the specific journal
    styleElement.textContent = `
    #${sheetId} {
      top: 0px !important;
      right: var(--sidebar-width) !important;
      scale: 0.8 !important;
      opacity: 0.5 !important;
      transition: all 0.3s ease;
      left: unset !important;
      transform-origin: top right !important;
      &:hover {
        opacity: 1 !important;
      }
    }
  `;

    // Add to document head
    document.head.appendChild(styleElement);
  }
  // #endregion LISTENERS ~

  // #region OVERRIDE: PREPARE CONTEXT ~
  override async _prepareContext(options: ApplicationV2.RenderOptions) {
    const context = await super._prepareContext(options);

    Object.assign(context, {
      isGM: getUser().isGM,
      LOADING_SCREEN_DATA,
    });

    // Prepare location data for stage
    const location = getSetting("currentLocation");
    const locationData = this.getLocationData(location);
    if (locationData) {
      Object.assign(context, {
        location,
        locationData,
      });
    }

    Object.assign(context, {
      sessionScribeID: getSetting("sessionScribe"),
      chainBG: AlertPaths["LINK"]!.cssCode,
    });
    if (!getUser().isGM) {
      const dramaticHookAssignment = getSetting("dramaticHookAssignments")[
        getUser().id!
      ];
      Object.assign(context, {
        dramaticHookCandleID: dramaticHookAssignment ?? "",
      });
    }

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

    if (
      [GamePhase.SessionClosed, GamePhase.SessionLoading].includes(
        getSetting("gamePhase"),
      )
    ) {
      this.addCanvasMaskListeners();
    }
    this.addStartVideoButtonListeners();
    this.addPCControlListeners();
    this.makePlottingControls();
    this.addSafetyButtonListeners();

    // Object.values(this.pcMasterTimelines).forEach((tl) => { tl.seek(0.2); tl.seek(0);});

    if (options.isFirstRender) {
      setTimeout(() => {
        void this.syncPhase();
      }, 2000);
    }
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
