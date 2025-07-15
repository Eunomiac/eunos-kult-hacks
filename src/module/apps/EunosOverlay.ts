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
  roundNum,
  // SlowMo,
  randElem,
  shuffle,
  getDistance,
  timeline,
  getTimeStamp,
  camelCase,
  assertIs,
  get,
  sleep
} from "../scripts/utilities";
import {
  LOADING_SCREEN_DATA,
  PRE_SESSION,
  SESSION,
  POST_SESSION,
  MEDIA_PATHS,
  LOCATIONS,
  NPC_PORTRAIT,
  LOCATION_IMAGE_MODES,
  type Location,
  type PCs,
  type EunosMediaData,
  type NPCs,
  CONTROL_SLIDER_PANELS,
  Sounds,
  EASES
} from "../scripts/constants";
import type { EmptyObject, DeepPartial } from "fvtt-types/utils";
import {
  GamePhase,
  UserTargetRef,
  AlertType,
  LocationImageModes,
  MediaLoadStatus,
  EunosMediaTypes,
  PCTargetRef,
  PCState,
  NPCPortraitState,
  NPCNameState,
  EunosMediaCategories,
  CounterResetOn
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
import EunosCarousel from "./EunosCarousel";
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

interface TransitionAudioData {
  toKill: Array<EunosMedia<EunosMediaTypes.audio>>;
  toPlay: Array<EunosMedia<EunosMediaTypes.audio>>;
  volumeOverrides: Record<string, number>;
}

// #endregion Type Definitions
export default class EunosOverlay extends HandlebarsApplicationMixin(
  ApplicationV2
)<
  EmptyObject, // RenderContext
  EunosOverlayConfiguration, // Configuration
  ApplicationV2.RenderOptions // RenderOptions
> {
  // #region SINGLETON PATTERN ~
  private static _instance: EunosOverlay | null = null;

  private constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  public static get instance(): EunosOverlay {
    EunosOverlay._instance ??= new EunosOverlay();
    return EunosOverlay._instance;
  }
  // #endregion SINGLETON PATTERN

  // #region ACTIONS ~
  static readonly ACTIONS: Record<string, ApplicationV2.ClickAction> = {
    pcPortraitClick(_event: PointerEvent, target: HTMLElement) {
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
    async sessionScribeClick(
      event: PointerEvent,
      target: HTMLElement
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
    dramaticHookCandleClick(_event: PointerEvent, target: HTMLElement) {
      const targetActorId = target.dataset["targetActorId"];
      const userActorId = target.dataset["userActorId"];
      if (!targetActorId) {
        kLog.error("No targetActorId found for dramatic hook candle click");
        return;
      }
      if (!userActorId) {
        kLog.error("No userActorId found for dramatic hook candle click");
        return;
      }

      const userPC = getActors().find((actor) => actor.id === userActorId);
      if (!userPC || !userPC.isPC()) {
        kLog.error("No pc found for userActorId", { userActorId });
        return;
      }
      const targetPC = getActors().find((actor) => actor.id === targetActorId);
      if (!targetPC || !targetPC.isPC()) {
        kLog.error("No pc found for targetActorId", { targetActorId });
        return;
      }

      EunosOverlay.instance.displayAssignDramaticHookDialog(
        targetPC,
        userPC,
        true
      );
    },
    conditionCardClick(_event: PointerEvent, target: HTMLElement) {
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
        body: getBody()
      });
    },
    criticalWoundClick(_event: PointerEvent, target: HTMLElement) {
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
        body: `${actorName} has suffered a CRITICAL WOUND (${woundName}). Without immediate treatment, death is certain!`
      });
    },
    seriousWoundClick(_event: PointerEvent, target: HTMLElement) {
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
        body: `${actorName} has suffered a Serious Wound (${woundName}), hampering their every action until it is tended to.`
      });
    },
    async addCounter(_event: PointerEvent, target: HTMLElement) {
      const elem$ = $(target).closest("[data-item-id]");
      const itemId = elem$.attr("data-item-id");
      const actorId = elem$.attr("data-actor-id");
      if (!itemId || !actorId) {
        kLog.error("No itemId or actorId found for addHold", {
          itemId,
          actorId
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
        system: { counterCount: (itemData.counterCount ?? 0) + 1 }
      });
      void EunosOverlay.instance.render({ parts: ["pcs", "pcsGM"] });
    },
    async spendCounter(_event: PointerEvent, target: HTMLElement) {
      const elem$ = $(target).closest("[data-item-id]");
      const itemId = elem$.attr("data-item-id");
      const actorId = elem$.attr("data-actor-id");
      if (!itemId || !actorId) {
        kLog.error("No itemId or actorId found for spendCounter", {
          itemId,
          actorId
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
        system: { counterCount: (itemData.counterCount ?? 0) - 1 }
      });
      void EunosOverlay.instance.render({ parts: ["pcs", "pcsGM"] });
    },
    /**
     * Saves current values as new defaults and updates ranges
     */
    saveDefaults(): void {
      void EunosOverlay.instance.render({ parts: ["locationPlottingPanel"] });
    },

    /**
     * Outputs current values to console and alert
     */
    outputValues(): void {
      // Copy to clipboard
      void navigator.clipboard
        .writeText(
          `[
        {
          selector: "body",
          properties: {
            background: "white",
            boxShadow: "0 0 0vw transparent inset",
            "--dramatic-hook-color": "black",
            "--dramatic-hook-text-shadow-color": "white",
          }
        },
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
              "background-position-x"
            )},
            backgroundPositionY: ${gsap.getProperty(
              "#STAGE #SECTION-3D .canvas-layer.background-layer",
              "background-position-y"
            )},
            filter: "${gsap.getProperty(
              "#STAGE #SECTION-3D .canvas-layer.background-layer",
              "filter"
            )} brightness(2)",
            transform: "${gsap.getProperty(
              "#STAGE #SECTION-3D .canvas-layer.background-layer",
              "transform"
            )}",
            background: "white url('modules/eunos-kult-hacks/assets/images/stage/stage-map-bg-lit.webp') 0px 0px no-repeat"
          },
        },
        {
          selector: "#STAGE #SECTION-3D .canvas-layer.under-layer",
          properties: {
            transform: "${gsap.getProperty(
              "#STAGE #SECTION-3D .canvas-layer.under-layer",
              "transform"
            )}",
            background: "radial-gradient(circle at 50% 50%, transparent 10%, rgba(255, 255, 255, 0.5) 15%, rgb(255 250 212) 25%)",
          },
        },
      ]`.replace(/(\bbrightness\([^)]+\))(?:\s+brightness\([^)]+\))+/g, "$1")
        )
        .then(() => {
          getNotifier().info("Location plotting values copied to clipboard");
        })
        .catch((err: unknown) => {
          console.error("Failed to copy to clipboard:", err);
          getNotifier().warn("Failed to copy to clipboard");
        });
    },

    /**
     * Refreshes all controls to their initial values
     */
    refreshControls(event: PointerEvent, target: HTMLElement): void {
      kLog.log("refreshControls", { event, target });
      EunosOverlay.instance.makePlottingControls();
    },

    /**
     * Resets an individual control to its initial value
     */
    resetControl(_event: PointerEvent, target: HTMLElement): void {
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
    refreshStatus() {
      if (!getUser().isGM) return;
      kLog.log("Refresh status button clicked");
      EunosOverlay.instance.requestStatusUpdate();
    },
    togglePCSpotlight(event: PointerEvent, target: HTMLElement): void {
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
        void EunosSockets.getInstance().call("spotlightPC", UserTargetRef.all, {
          pcID
        });
      } else if (event.type === "mouseup") {
        // Handle click-release
        kLog.log("click-up");
        void EunosSockets.getInstance().call(
          "unspotlightPC",
          UserTargetRef.all,
          {
            pcID
          }
        );
      }
    },
    togglePCDimmed(_event: PointerEvent, target: HTMLElement): void {
      const pcID = target.dataset["actorId"];
      if (!pcID) {
        return;
      }
      EunosOverlay.instance.queueUIChanges({
        [pcID]: PCState.dimmed
      });
    },
    togglePCHidden(_event: PointerEvent, target: HTMLElement): void {
      const pcID = target.dataset["actorId"];
      if (!pcID) {
        return;
      }
      EunosOverlay.instance.queueUIChanges({
        [pcID]: PCState.hidden
      });
    },
    togglePCBase(_event: PointerEvent, target: HTMLElement): void {
      const pcID = target.dataset["actorId"];
      if (!pcID) {
        return;
      }
      EunosOverlay.instance.queueUIChanges({
        [pcID]: PCState.base
      });
    },
    async wakeAllPCs(event: PointerEvent, target: HTMLElement): Promise<void> {
      kLog.log("wakeAllPCs", { event, target });
      const pcs = Object.fromEntries(
        getOwnedActors().map((actor) => [actor.id!, PCState.base])
      );
      EunosOverlay.instance.queueUIChanges(pcs);
    },
    async sleepAllPCs(event: PointerEvent, target: HTMLElement): Promise<void> {
      kLog.log("sleepAllPCs", { event, target });
      const pcs = Object.fromEntries(
        getOwnedActors().map((actor) => [actor.id!, PCState.hidden])
      );
      EunosOverlay.instance.queueUIChanges(pcs);
    },
    toggleNPCSpotlight(event: PointerEvent, target: HTMLElement): void {
      kLog.log("toggleNPCSpotlight", { event, target });
      const npcID = target.dataset["actorId"];
      kLog.log("npcID", npcID);
      if (!npcID) {
        return;
      }
      // Check if this is a click-down vs click-release event
      if (event.type === "mousedown") {
        // Handle click-down
        kLog.log("click-down");
        void EunosSockets.getInstance().call(
          "spotlightNPC",
          UserTargetRef.all,
          {
            npcID
          }
        );
      } else if (event.type === "mouseup") {
        // Handle click-release
        kLog.log("click-up");
        void EunosSockets.getInstance().call(
          "unspotlightNPC",
          UserTargetRef.all,
          {
            npcID
          }
        );
      }
    },
    toggleNPCDimmed(_event: PointerEvent, target: HTMLElement): void {
      const npcID = target.dataset["actorId"];
      if (!npcID) return;
      EunosOverlay.instance.queueUIChanges({
        [npcID]: {
          portraitState: NPCPortraitState.dimmed
        }
      });
    },
    toggleNPCInvisible(_event: PointerEvent, target: HTMLElement): void {
      const npcID = target.dataset["actorId"];
      if (!npcID) return;
      EunosOverlay.instance.queueUIChanges({
        [npcID]: {
          portraitState: NPCPortraitState.invisible
        }
      });
    },
    toggleNPCBase(_event: PointerEvent, target: HTMLElement): void {
      const npcID = target.dataset["actorId"];
      if (!npcID) return;

      EunosOverlay.instance.queueUIChanges({
        [npcID]: {
          portraitState: NPCPortraitState.base
        }
      });
    },
    toggleNPCNameBase(_event: PointerEvent, target: HTMLElement): void {
      const npcID = target.dataset["actorId"];
      if (!npcID) return;

      EunosOverlay.instance.queueUIChanges({
        [npcID]: {
          nameState: NPCNameState.base
        }
      });
    },
    toggleNPCNameShrouded(_event: PointerEvent, target: HTMLElement): void {
      const npcID = target.dataset["actorId"];
      if (!npcID) return;

      EunosOverlay.instance.queueUIChanges({
        [npcID]: {
          nameState: NPCNameState.shrouded
        }
      });
    },
    toggleNPCNameInvisible(_event: PointerEvent, target: HTMLElement): void {
      const npcID = target.dataset["actorId"];
      if (!npcID) return;

      EunosOverlay.instance.queueUIChanges({
        [npcID]: {
          nameState: NPCNameState.invisible
        }
      });
    },
    removeNPC(_event: PointerEvent, target: HTMLElement): void {
      const npcContainer = target.closest(".npc-portrait") as HTMLElement;
      const npcID = npcContainer?.dataset["actorId"];
      if (!npcID) return;

      EunosOverlay.instance.queueUIChanges({
        [npcID]: {
          portraitState: NPCPortraitState.removed
        }
      });
    },
    openNPCSheet(_event: PointerEvent, target: HTMLElement): void {
      const npcID = target.dataset["actorId"];
      if (!npcID) return;
      const actor = getActors().find((actor) => actor.id === npcID);
      // @ts-expect-error - force is not typed
      actor?.sheet?.render({ force: true });
    },
    async pushUIChanges(): Promise<void> {
      void EunosOverlay.instance.pushUIChanges();
    },
    clearUIChanges(): void {
      EunosOverlay.instance.clearUIChanges();
    },
    async beginXPQuestions(): Promise<void> {
      if (!getUser().isGM) {
        return;
      }
      const controlPanel$ = EunosOverlay.instance.endPhase$.find(
        ".master-gm-control-panel"
      );
      const beginButton$ = controlPanel$.find(".gm-control-button-begin");
      const approveButton$ = controlPanel$.find(".gm-control-button-approve");
      const denyButton$ = controlPanel$.find(".gm-control-button-deny");
      beginButton$.css("visibility", "hidden");
      approveButton$.css("visibility", "visible");
      denyButton$.css("visibility", "visible");
      void setSetting("endPhaseQuestion", 1);
    },
    async approveXPQuestion(): Promise<void> {
      if (!getUser().isGM) {
        return;
      }
      const questionNumber = getSetting("endPhaseQuestion");
      kLog.log("approveXPQuestion", { questionNumber });
      await Promise.all(
        getOwnedActors().map(async (actor) => {
          return actor.awardXP();
        })
      );
      void setSetting("endPhaseQuestion", questionNumber + 1);
    },
    async denyXPQuestion(): Promise<void> {
      if (!getUser().isGM) {
        return;
      }
      const questionNumber = getSetting("endPhaseQuestion");
      void setSetting("endPhaseQuestion", questionNumber + 1);
    },

    async endScene(): Promise<void> {
      if (!getUser().isGM) {
        return;
      }

      // Get PC data from current location
      const pcUIData = EunosOverlay.instance.extractPCUIDataFromFullData(
        EunosOverlay.instance.getLocationData().pcData
      );

      // Create an object to track which PCs are toggled on
      const selectedPCs: Record<string, boolean> = {};

      // Set initial toggle state based on PC state
      Object.entries(pcUIData).forEach(([pcId, state]) => {
        // PC is initially toggled ON if state is base, dimmed, or spotlit
        selectedPCs[pcId] = [
          PCState.base,
          PCState.dimmed,
          PCState.spotlit
        ].includes(state);
      });

      // Get all PC actors and prepare data for the template
      const pcActors = getActors()
        .filter((actor) => actor.isPC())
        .map((pc) => {
          return {
            id: pc.id,
            actor: pc,
            name: pc.name,
            isSelected: pc.id ? selectedPCs[pc.id] || false : false
          };
        });

      // Render the template
      const dialogContent = await renderTemplate(
        "modules/eunos-kult-hacks/templates/dialog/end-scene-dialog.hbs",
        { pcActors }
      );

      // Create and render the dialog
      new Dialog({
        title: "End Scene",
        content: dialogContent,
        buttons: {
          reset: {
            icon: "<i class=\"fas fa-check\"></i>",
            label: "Reset Counters",
            callback: async (html) => {
              // Get all selected PC IDs
              const selectedPcIds: string[] = [];
              $(html)
                .find(".pc-portrait-toggle.selected")
                .each((index: number, el: HTMLElement) => {
                  const pcId = el.dataset["pcId"];
                  if (pcId) selectedPcIds.push(pcId);
                });

              // Reset counters for all selected PCs
              for (const pcId of selectedPcIds) {
                const pc = getActors().find((actor) => actor.id === pcId);
                if (pc && pc.isPC()) {
                  await pc.resetCounters(CounterResetOn.Scene);
                }
              }

              // Notify the GM
              getNotifier().info(
                `Reset scene counters for ${selectedPcIds.length} characters`
              );
            }
          },
          cancel: {
            icon: "<i class=\"fas fa-times\"></i>",
            label: "Cancel"
          }
        },
        default: "reset",
        render: (html) => {
          // Add click handler for portrait toggles
          $(html)
            .find(".pc-portrait-toggle")
            .on("click", function (this: HTMLElement) {
              const pcId = this.dataset["pcId"];
              if (!pcId) return;

              // Toggle selected state
              $(this).toggleClass("selected");
              selectedPCs[pcId] = $(this).hasClass("selected");
            });
        }
      }).render(true);
    }
  };

  // #endregion ACTIONS

  // #region STATIC CONFIGURATION ~
  static override readonly DEFAULT_OPTIONS = {
    id: "EUNOS_OVERLAY",
    classes: ["eunos-overlay"],
    position: {
      top: 0,
      left: 0,
      width: "auto" as const,
      height: "auto" as const,
      zIndex: 10000
    },
    window: {
      frame: false,
      positioned: false,
      icon: false as const,
      controls: [],
      minimizable: false,
      resizable: false,
      contentTag: "div",
      contentClasses: ["eunos-overlay-content"]
    },
    actions: Object.fromEntries(
      Object.entries(EunosOverlay.ACTIONS).map(([key, action]) => [
        key,
        action.bind(EunosOverlay)
      ])
    ),
    dragDrop: [
      { dragSelector: ".actor, .npc-drag-handle", dropSelector: "#NPCS-GM" }
    ]
  };

  static override readonly PARTS = {
    midZIndexMask: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/mid-zindex-mask.hbs"
    },
    topZIndexMask: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/top-zindex-mask.hbs"
    },
    maxZIndexBars: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/max-zindex-bars.hbs"
    },
    safetyButtons: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/safety-buttons.hbs"
    },
    alerts: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/alerts.hbs"
    },
    stage: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage.hbs"
    },
    countdown: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/countdown.hbs"
    },
    videoStatus: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/video-status.hbs",
      classes: ["gm-only"], // This class will hide it from non-GM users
      position: {
        top: 10,
        right: 10,
        width: "auto",
        height: "auto"
      }
    },
    locationPlottingPanel: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/location-plotting-panel.hbs"
    },
    locations: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-locations.hbs"
    },
    npcs: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-npcs.hbs"
    },
    npcsGM: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-npcs-gm.hbs"
    },
    pcs: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-pcs.hbs"
    },
    pcsGM: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-pcs-gm.hbs"
    },
    mediaContainer: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/media-container.hbs"
    },
    stageChangesLog: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-changes-log.hbs"
    },
    stageEndPhase: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage-end-phase.hbs"
    },
    limbo_stage: {
      template:
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/limbo_stage.hbs"
    }
  };
  // #endregion STATIC CONFIGURATION

  // #region STATIC METHODS ~
  static #lastPhaseChange: GamePhase | undefined;
  static currentLocationLog: Maybe<keyof typeof LOCATIONS>;
  static #currentLocationDataLog: Maybe<Record<string, Location.SettingsData>>;

  static get currentLocationDataLog() {
    kLog.log(
      `Retrieving currentLocationDataLog for location ${this.currentLocationLog}`,
      { currentLocationDataLog: this.#currentLocationDataLog }
    );
    return this.#currentLocationDataLog;
  }

  static set currentLocationDataLog(
    value: Maybe<Record<string, Location.SettingsData>>
  ) {
    kLog.log(
      `Setting currentLocationDataLog for location ${this.currentLocationLog}`,
      { currentLocationDataLog: value }
    );
    this.#currentLocationDataLog = JSON.parse(JSON.stringify(value)) as Record<
      string,
      Location.SettingsData
    >;
  }

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
          newPhase: newValue as GamePhase
        });
      }
    );

    this.currentLocationLog = getSetting("currentLocation");
    this.currentLocationDataLog = getSetting("locationData");

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

    // Add dream-warp filter for limbo NPC and location image transitions
    if ($("#dream-warp").length === 0) {
      $("body").append(`
        <svg style="display: none;">
          <filter id="dream-warp">
            <feTurbulence id="turbulence" type="fractalNoise" baseFrequency="0.02" numOctaves="1" result="warpNoise" />
            <feDisplacementMap in="SourceGraphic" in2="warpNoise" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      `);
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
  public static readonly SocketFunctions: {
    changePhase: SocketFunction<
      void,
      { prevPhase: GamePhase; newPhase: GamePhase }
    >;
    preloadPreSessionSong: SocketFunction<void, void>;
    playPreSessionSong: SocketFunction<void, void>;
    preloadIntroVideo: SocketFunction<void, void>;
    reportPreloadStatus: SocketFunction<
      void,
      { userId: string; status: MediaLoadStatus }
    >;
    refreshPCs: SocketFunction<void, void>;
    startVideoPlayback: SocketFunction<void, void>;
    requestMediaSync: AsyncSocketFunction<number, { mediaName: string }>;
    setLocation: SocketFunction<
      void,
      { fromLocation: string; toLocation: string }
    >;
    refreshLocationImage: SocketFunction<void, { imgKey: string }>;
    updatePCUI: SocketFunction<void, Record<string, PCState>>;
    spotlightPC: SocketFunction<void, { pcID: string }>;
    unspotlightPC: SocketFunction<void, { pcID: string }>;
    spotlightNPC: SocketFunction<void, { npcID: string }>;
    unspotlightNPC: SocketFunction<void, { npcID: string }>;
    playMedia: SocketFunction<
      void,
      { mediaName: string; mediaData?: Partial<EunosMediaData> }
    >;
    killMedia: SocketFunction<void, { mediaName: string }>;
    requestSoundSync: SocketFunction<void, { userId: string }>;
    setIndoors: SocketFunction<void, { isIndoors: boolean }>;
    closeAssignDramaticHookDialog: SocketFunction<void, void>;
    endDramaticHookAssignment: SocketFunction<void, void>;
    updateMediaVolumes: SocketFunction<
      void,
      { volumes: Record<string, number> }
    >;
    enterLimbo: SocketFunction<void, void>;
    leaveLimbo: SocketFunction<void, void>;
  } = {
    changePhase: (data: { prevPhase: GamePhase; newPhase: GamePhase }) => {
      pLog.startFlow(`Phase Transition: ${data.prevPhase} → ${data.newPhase}`, true);
      pLog.funcIn("Socket changePhase handler", data);

      void EunosOverlay.instance
        .cleanupPhase(data.prevPhase)
        .then(() => {
          return EunosOverlay.instance.initializePhase(data.newPhase);
        })
        .then(() => {
          pLog.funcOut("Phase transition completed successfully");
          pLog.endFlow();
        })
        .catch((error: unknown) => {
          kLog.error("Error initializing phase:", error);
          pLog.error("Phase transition failed", error);
          pLog.funcOut("Phase transition failed with error");
          pLog.endFlow();
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
      status
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
      await EunosOverlay.instance.playIntroVideo(true);
    },

    requestMediaSync: async ({ mediaName }: { mediaName: string }) => {
      const media = EunosMedia.GetMedia(mediaName);
      if (!media) {
        kLog.error(`Media ${mediaName} not found`);
        return 0;
      }
      const timestamp = media.currentTime;
      kLog.log(`GM returning media timestamp: ${timestamp} for ${mediaName}`);
      return timestamp;
    },

    setLocation: (data: { fromLocation: string; toLocation: string }) => {
      void EunosOverlay.instance.goToLocation(
        data.fromLocation,
        data.toLocation
      );
    },

    refreshLocationImage: (data: { imgKey: string }) => {
      void EunosOverlay.instance.refreshLocationImage(data.imgKey);
    },

    updatePCUI: (data: Record<string, PCState>) => {
      kLog.log("updatePCUI Called", data);
      void EunosOverlay.instance.updatePCUI(data);
    },

    spotlightPC: ({ pcID }: { pcID: string }) => {
      void EunosOverlay.instance.updatePCUI({ [pcID]: PCState.spotlit });
    },

    unspotlightPC: ({ pcID }: { pcID: string }) => {
      void EunosOverlay.instance.updatePCUI({ [pcID]: PCState.base });
    },

    // updateNPCUI: (
    //   data: Record<string, { state?: NPCPortraitState; position?: Point }>,
    // ) => {
    //   void EunosOverlay.instance.updateNPCUI(data, {
    //     isUpdatingExplicitOnly: true,
    //   });
    // },

    spotlightNPC: ({ npcID }: { npcID: string }) => {
      void EunosOverlay.instance.spotlightNPC(npcID);
    },

    unspotlightNPC: ({ npcID }: { npcID: string }) => {
      void EunosOverlay.instance.unspotlightNPC(npcID);
    },
    playMedia: (data: {
      mediaName: string;
      mediaData?: Partial<EunosMediaData>;
    }) => {
      data.mediaData ??= {};
      const media = EunosMedia.GetMedia(data.mediaName);
      if (!media) {
        kLog.error(`Media ${data.mediaName} not found`);
        return;
      }
      void media.play(data.mediaData, false);
    },

    killMedia: (data: { mediaName: string }) => {
      const media = EunosMedia.GetMedia(data.mediaName);
      if (!media) {
        kLog.error(`Media ${data.mediaName} not found`);
        return;
      }
      void EunosMedia.Kill(media.name, 3);
    },

    requestSoundSync: async () => {
      const playingSounds = Object.fromEntries(
        await Promise.all(
          EunosMedia.GetPlayingSounds().map(
            async (sound) => [sound.name, sound.volume] as const
          )
        )
      );

      kLog.log(
        `GM returning playing sounds: ${Object.keys(playingSounds).join(", ")}`,
        playingSounds
      );

      return playingSounds;
    },

    setIndoors: ({ isIndoors }: { isIndoors: boolean }) => {
      if (isIndoors) {
        void EunosOverlay.instance.goIndoors();
      } else {
        void EunosOverlay.instance.goOutdoors();
      }
    },
    closeAssignDramaticHookDialog: () => {
      EunosOverlay.instance.closeAssignDramaticHookDialog();
    },
    endDramaticHookAssignment: () => {
      EunosOverlay.instance.#endDramaticHookAssignment();
    },
    updateMediaVolumes: (data: { volumes: Record<string, number> }) => {
      Object.entries(data.volumes).forEach(([soundName, volume]) => {
        const sound = EunosMedia.GetMedia(soundName);
        if (sound && sound.playing) {
          // Update internal volume value
          sound.volume = volume;
          // Use GSAP for smooth volume transitions over 0.5 seconds
          gsap.to(sound.element, {
            volume: sound.volume, // Uses getter which applies dampening if needed
            duration: 0.5,
            ease: "none"
          });
        } else if (sound) {
          // If not playing, just update the internal volume
          sound.volume = volume;
        }
      });
    },
    enterLimbo: () => {
      void EunosOverlay.instance.enterLimbo();
    },
    leaveLimbo: () => {
      void EunosOverlay.instance.leaveLimbo();
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
  #countdownWrapper: Maybe<HTMLElement>;
  #countdownAuroraContainer: Maybe<HTMLElement>;
  #countdownAurora: Maybe<HTMLElement>;
  #redLightning: Maybe<HTMLElement>;
  #countdownContainer: Maybe<HTMLElement>;
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
        ".mid-zindex-mask"
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
        ".canvas-mask"
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
        ".canvas-mask-bars"
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
        ".top-zindex-mask"
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
        ".max-zindex-bars"
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
        ".safety-buttons"
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
        ".alerts"
      ) as Maybe<HTMLElement>;
    }
    if (!this.#alerts) {
      throw new Error("Alerts not found");
    }
    return $(this.#alerts);
  }

  get countdownWrapper$() {
    if (!this.#countdownWrapper) {
      this.#countdownWrapper = this.element.querySelector(
        ".loading-screen-countdown-container"
      ) as Maybe<HTMLElement>;
    }
    if (!this.#countdownWrapper) {
      throw new Error("Countdown wrapper not found");
    }
    return $(this.#countdownWrapper);
  }

  get countdownAuroraContainer$() {
    if (!this.#countdownAuroraContainer) {
      this.#countdownAuroraContainer = this.countdownWrapper$.find(
        ".aurora-container"
      )[0] as Maybe<HTMLElement>;
    }
    if (!this.#countdownAuroraContainer) {
      throw new Error("Countdown aurora container not found");
    }
    return $(this.#countdownAuroraContainer);
  }

  get countdownAurora$() {
    if (!this.#countdownAurora) {
      this.#countdownAurora = this.countdownWrapper$.find(
        ".aurora-background"
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
        ".red-lightning"
      )[0] as Maybe<HTMLElement>;
    }
    if (!this.#redLightning) {
      throw new Error("Red lightning not found");
    }
    return $(this.#redLightning);
  }

  get countdownContainer$() {
    if (!this.#countdownContainer) {
      this.#countdownContainer = this.element.querySelector(
        ".countdown-container"
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
      ".loading-screen-countdown"
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
        ".video-status-panel"
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
        ".location-plotting-panel"
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
      getUser().isGM ? "#PCS-GM" : "#PCS"
    ) as Maybe<HTMLElement>;
    if (!pcs) {
      throw new Error("PCS not found");
    }
    return $(pcs);
  }

  get npcs$() {
    const npcs = this.element.querySelector(
      getUser().isGM ? "#NPCS-GM" : "#NPCS"
    ) as Maybe<HTMLElement>;
    if (!npcs) {
      throw new Error("NPCS not found");
    }
    return $(npcs);
  }

  get limbo$() {
    const limbo = this.element.querySelector("#LIMBO") as Maybe<HTMLElement>;
    if (!limbo) {
      throw new Error("Limbo not found");
    }
    return $(limbo);
  }

  get changesLog$() {
    const changesLog = this.element.querySelector(
      "#STAGE-CHANGES-LOG .stage-changes-log-content"
    ) as Maybe<HTMLElement>;
    if (!changesLog) {
      throw new Error("Changes log not found");
    }
    return $(changesLog);
  }

  get endPhase$() {
    const endPhase = this.element.querySelector(
      "#STAGE-END-PHASE"
    ) as Maybe<HTMLElement>;
    if (!endPhase) {
      throw new Error("End phase not found");
    }
    return $(endPhase);
  }

  get dramaticHookSplashContainer$() {
    const dramaticHookSplashContainer = this.element.querySelector(
      ".dramatic-hook-splash-container"
    ) as Maybe<HTMLElement>;
    if (!dramaticHookSplashContainer) {
      throw new Error("Dramatic hook splash container not found");
    }
    return $(dramaticHookSplashContainer);
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
      minDur + (maxDur - minDur) * (timeRemaining / songDuration)
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
      ease: "power2.in"
    });

    kLog.log("buildCountdownContainerTimeline", duration, timeOffset);

    this.#countdownContainerTimeline = gsap
      .timeline()
      .fromTo(
        this.countdownContainer$,
        {
          filter: "drop-shadow(rgba(0, 0, 0, 0.55) 0px 0px 0px)"
        },
        {
          top: "50%",
          filter: "drop-shadow(rgba(0, 0, 0, 0.55) 100px 100px 5px)",
          scale: 3,
          duration,
          ease: "power4.inOut"
        }
      )
      .to(
        this.countdownAuroraContainer$,
        {
          top: "50%",
          scale: 3,
          duration,
          ease: "power4.inOut"
        },
        0
      )
      .to(
        this.redLightning$,
        {
          autoAlpha: 1,
          duration: 0.1,
          ease: "none"
        },
        ">-20%"
      )
      .fromTo(
        this.countdownAurora$,
        {
          autoAlpha: 0
        },
        {
          autoAlpha: 1,
          duration: duration, // Fade in during first 30% of animation
          ease: "power4.in"
        },
        0 // Start at beginning of timeline
      )
      .to(
        [this.redLightning$, this.countdownAurora$],
        {
          autoAlpha: 0
        },
        "-=2"
      );

    this.#isCountdownContainerTimelinePlaying = true;
    return this.#countdownContainerTimeline.seek(timeOffset);
  }

  private auroraState: AuroraState = {
    baseHue: 0, // Starting at natural color
    glitchHue: 140, // Shift towards red
    glitchIntensity: 0.3, // Initial intensity
    baseSaturation: 1,
    glitchSaturation: 1.2
  };

  private buildGlitchTimeline(repeatDelay: number): gsap.core.Timeline {
    const glitchText$ = this.countdown$.find(".glitch-text");
    const glitchTop$ = this.countdown$.find(".glitch-top");
    const glitchBottom$ = this.countdown$.find(".glitch-bottom");

    this.#glitchTimeline = gsap
      .timeline({
        repeat: -1,
        repeatDelay
      })
      .addLabel("glitch")
      // Target the entire text container for skew effects
      .to(glitchText$, {
        duration: 0.1,
        skewX: "random([20,-20])",
        ease: "power4.inOut"
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
        "split"
      )
      .to(
        glitchText$,
        {
          duration: 0.08,
          textShadow: "-13px -13px 0px var(--K4-dRED)"
        },
        "split"
      )
      .to(this.countdown$, { duration: 0, scale: 1.2 }, "split")
      .to(this.countdown$, { duration: 0, scale: 1 }, "+=0.02")
      .to(
        glitchText$,
        {
          duration: 0.08,
          textShadow: "0px 0px 0px var(--K4-dRED)"
        },
        "+=0.09"
      )
      .to(glitchText$, { duration: 0.02, color: "#FFF" }, "-=0.05")
      .to(glitchText$, { duration: 0.02, color: "var(--K4-bGOLD)" })
      .to(
        glitchText$,
        {
          duration: 0.03,
          textShadow: "13px 13px 0px #FFF"
        },
        "split"
      )
      .to(
        glitchText$,
        {
          duration: 0.08,
          textShadow: "0px 0px 0px transparent",
          clearProps: "textShadow"
        },
        "+=0.01"
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
          ease: "power2.inOut"
        },
        "split"
      )
      .to(
        aurora$,
        {
          duration: 0.2,
          filter: "brightness(1)",
          ease: "power2.in"
        },
        "+=0.1"
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
    this.countdownWrapper$.css("visibility", "visible");
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
    this.countdownWrapper$.removeAttr("style"); // Remove style attribute from the container
    this.countdownWrapper$.find("*").removeAttr("style"); // Remove style attribute from all descendants
    this.#isCountdownContainerTimelinePlaying = false;
    if (isHiding) {
      this.countdownWrapper$.css("visibility", PCState.hidden);
    }
    this.#countdownContainerTimeline = undefined;
    this.#glitchTimeline = undefined;
  }

  private updateCountdownText() {
    const timeLeft = countdownUntil();
    const textElements$ = this.countdown$.find(".glitch-text");

    const formattedText = [
      String(timeLeft.days).padStart(2, "0"),
      String(timeLeft.hours).padStart(2, "0"),
      String(timeLeft.minutes).padStart(2, "0"),
      String(timeLeft.seconds).padStart(2, "0")
    ].join(":");

    const firstSignificantPos = formattedText
      .split("")
      .findIndex((char) => char !== "0" && char !== ":");

    const significantPos =
      firstSignificantPos === -1
        ? formattedText.length - 1
        : firstSignificantPos;

    const spanWrappedText = formattedText
      .split("")
      .map((char, index) => {
        const posFromSignificant =
          index < significantPos ? significantPos - index : 0;

        return `<span data-pos="${posFromSignificant}" data-char="${char}">${char}</span>`;
      })
      .join("");

    textElements$.html(spanWrappedText);
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
      // Only sync song time if difference is more than 5 seconds
      const timeDiff = Math.abs(
        this.sessionStartingSong.currentTime - preSessionSongCurrentTime
      );
      if (timeDiff > 5) {
        kLog.log(`Syncing pre-session song time - diff: ${timeDiff}s`);
        this.sessionStartingSong.currentTime = preSessionSongCurrentTime;
      }
      this.#isPreSessionSongSynced = true;
    }
    if (this.#isPreSessionSongSynced && this.#glitchTimeline?.isActive()) {
      const newRepeatDelay = await this.getGlitchRepeatDelay();
      if (
        Math.abs(
          newRepeatDelay - (this.#glitchTimeline?.repeatDelay() ?? Infinity)
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
        5 * 60 * 1000 // 5 minutes
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
        0.5 * (this.#glitchTimeline?.repeatDelay() ?? Infinity)
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
      this.#ambientAudio = EunosMedia.Sounds.get("ambient-session-closed");
    }
    if (!this.#ambientAudio && isCreating) {
      this.#ambientAudio = new EunosMedia("ambient-session-closed", {
        type: EunosMediaTypes.audio,
        path: MEDIA_PATHS.PRESESSION_AMBIENT_AUDIO,
        volume: 0.5,
        autoplay: true,
        loop: true,
        alwaysPreload: false,
        reportPreloadStatus: false
      });
    }
    if (!this.#ambientAudio) {
      throw new Error("Ambient audio not found, not instructed to create it.");
    }
    return this.#ambientAudio;
  }

  private async killSessionClosedAmbientAudio(): Promise<void> {
    // if (!this.#ambientAudio) { return; }
    await EunosMedia.Kill(this.getAmbientAudio(false).name, 5);
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
        shuffled[0]!
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
      this.currentLoadingScreenItem
    );
    if (!timeline) {
      timeline = this.buildLoadingScreenItemTimeline(
        this.currentLoadingScreenItem
      );
    }
    this.#loadingScreenItemTimelines.set(
      this.currentLoadingScreenItem,
      timeline
    );
    return timeline;
  }

  private buildLoadingScreenItemTimeline(
    key: keyof typeof LOADING_SCREEN_DATA
  ): gsap.core.Timeline {
    if (!this.#loadingScreenItemTimelines.has(key)) {
      const item$ = this.#loadingScreenItems.get(key)!;
      const $image = item$.find(".loading-screen-item-image");
      const $title = item$.find(".loading-screen-item-title");
      const $subtitle = item$.find(".loading-screen-item-subtitle");
      const $home = item$.find(".loading-screen-item-home");
      const $body = item$.find(".loading-screen-item-body");
      const $rightSideImage = item$.find(
        ".loading-screen-item-right-side-image"
      );

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
          }
        })
        .addLabel("start")
        .to(
          $rightSideImage,
          {
            y: "-80vh",
            duration:
              entryDuration +
              displayDuration +
              exitDuration -
              (3 * entryDuration) / 5,
            ease: "slow(0.6, 1.25)"
          },
          (3 * entryDuration) / 5
        )
        .fromTo(
          $rightSideImage,
          {
            autoAlpha: 0,
            filter: "blur(20px)"
          },
          {
            autoAlpha: 1,
            filter: "blur(0px)",
            duration:
              entryDuration +
              displayDuration +
              exitDuration -
              (3 * entryDuration) / 5,
            ease: "slow(0.6, 1.25, true)"
          },
          (3 * entryDuration) / 5
        )
        .fromTo(
          $image,
          {
            filter: "brightness(0) blur(10px)",
            // left:"0%",
            x: "+=100",
            scale: 1.5,
            height: "100vh"
            // height: "600vh"
          },
          {
            filter: "brightness(1) blur(0px)",
            x: 0,
            // height: "100vh",
            scale: 1,
            duration: entryDuration + displayDuration + exitDuration,
            ease: "back.out(2)"
          },
          "start"
        )
        .fromTo(
          $image,
          {
            autoAlpha: 0
          },
          {
            autoAlpha: 1,
            duration: 0.25 * entryDuration + displayDuration + exitDuration,
            ease: "power3.out"
          },
          0.25 * entryDuration
        )
        .fromTo(
          $title,
          {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100"
          },
          {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out"
          },
          (2 * entryDuration) / 5
        )
        .fromTo(
          $subtitle,
          {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100"
          },
          {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out"
          },
          (3 * entryDuration) / 5
        )
        .fromTo(
          $home,
          {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100"
          },
          {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out"
          },
          (3.5 * entryDuration) / 5
        )
        .fromTo(
          $body,
          {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100"
          },
          {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out"
          },
          (4 * entryDuration) / 5
        )
        .addLabel("display", entryDuration)
        .to(
          [$image, $title, $subtitle, $home, $body],
          {
            autoAlpha: 0,
            filter: "blur(10px)",
            duration: exitDuration,
            ease: "power2.in"
          },
          `display+=${displayDuration}`
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
      this.#areLoadingScreenImagesStopped = false;
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
      this.#currentLoadingScreenItem ?? ""
    );
    if (currentItem?.[0]) {
      gsap.to(currentItem[0], {
        autoAlpha: 0,
        duration: 0.5,
        ease: "power2.inOut"
      });
      setTimeout(() => {
        currentItem.attr("style", "");
      }, 15000);
    }

    // Wait for any currently-running timeline to complete
    const currentTimeline = this.#loadingScreenItemTimelines.get(
      this.#currentLoadingScreenItem ?? ""
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
          `No song defined for Chapter ${getSetting("chapterNumber")} in Pre-Session Tracks playlist`
        );
      }
      this.#sessionStartingSong = new EunosMedia(songName, {
        ...Sounds.PreSessionSongs[songName],
        type: EunosMediaTypes.audio,
        alwaysPreload: true
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
      `Initializing Pre-Session Song: timeRemaining: ${padNum(timeRemaining / 60, 0)}:${padNum(timeRemaining % 60, 0)}, songDuration: ${padNum(duration / 60, 0)}:${padNum(duration % 60, 0)}`
    );

    if (timeRemaining <= duration) {
      if (!getUser().isGM) {
        void this.playPreSessionSong();
        return;
      } else {
        void EunosSockets.getInstance().call(
          "playPreSessionSong",
          UserTargetRef.all
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
        UserTargetRef.all
      );
      const delay = timeRemaining - duration;
      kLog.log(
        `playing song in ${padNum(delay / 60, 0)}:${padNum(delay % 60, 0)}`
      );
      this.#sessionStartingSongTimeout = window.setTimeout(() => {
        void EunosSockets.getInstance().call(
          "playPreSessionSong",
          UserTargetRef.all
        );
      }, delay * 1000);
    }
  }
  /** Plays the pre-session song */
  async playPreSessionSong(): Promise<void> {
    void this.killSessionClosedAmbientAudio();
    await EunosMedia.Play(this.sessionStartingSong.name);
    this.#isPreSessionSongPlaying = true;
  }

  async killPreSessionSong(): Promise<void> {
    if (this.#sessionStartingSongTimeout) {
      window.clearTimeout(this.#sessionStartingSongTimeout);
      this.#sessionStartingSongTimeout = undefined;
    }
    this.#isPreSessionSongPlaying = false;
    return EunosMedia.Kill(this.sessionStartingSong.name);
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
        pointerEvents: "none"
      })
      .to(appElements, {
        autoAlpha: 0,
        duration: 0.5
      });
    this.sidebarTimeline.reverse();
  }

  private unfreezeOverlay(): void {
    this.addCanvasMaskListeners();
    const appElements: HTMLElement[] = $(".app").toArray();
    gsap
      .timeline()
      .set(appElements, {
        pointerEvents: "auto" // Reset pointer events back to default
      })
      .to(appElements, {
        autoAlpha: 1,
        duration: 0.5
      });
  }

  // #endregion FREEZING OVERLAY ~

  // #region GM Video Status Panel ~

  /** Updates the video status panel */
  public videoLoadStatus: Map<string, MediaLoadStatus> = new Map<
    string,
    MediaLoadStatus
  >();

  private updateVideoStatusPanel(
    userId: string,
    status: MediaLoadStatus
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

  // #region SESSION SCRIBE ~
  private topUpSessionScribeDeck(currentDeck?: string[]): string[] {
    currentDeck ??= getSetting("sessionScribeDeck");
    const missingUserIDs = getUsers()
      .filter((user) => !user.isGM && !currentDeck.includes(user.id!))
      .map((user) => user.id!);
    // Shuffle the missing IDs and add them to the bottom of the deck
    const shuffledMissingUserIDs = missingUserIDs.sort(
      () => Math.random() - 0.5
    );
    return [...currentDeck, ...shuffledMissingUserIDs];
  }
  private async setSessionScribe(isDebugging = false): Promise<void> {
    const lastSessionScribeID = getSetting("sessionScribe");
    let currentDeck = getSetting("sessionScribeDeck");
    const setAsideUserIDs: string[] = [];
    let sessionScribeID: Maybe<string> = undefined;
    while (!sessionScribeID) {
      if (currentDeck.length === 0) {
        currentDeck = this.topUpSessionScribeDeck(setAsideUserIDs).filter(
          (id) => !setAsideUserIDs.includes(id)
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
          `Debugging is enabled: Simulating one missing user, '${missingUserName}'`
        );
      } else {
        kLog.log("Not enough active users to assign dramatic hooks");
        return;
      }
    }
    const activeActors = activeUsers.map((user) => user.character);

    // Wipe previous assignments
    void Promise.all(
      activeActors.map((actor) =>
        actor?.update({
          system: {
            dramatichooks: {
              assignedHook: ""
            }
          }
        })
      )
    );

    // Create a mapping of userID to their actorID for quick lookup
    const userToActorMap = new Map(
      activeUsers.map((user) => [user.id, user.character])
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
          shuffledActors[i]!
        ];
      }

      // Check if this shuffle creates any self-assignments
      const hasSelfAssignment = activeUsers.some(
        (user, index) => shuffledActors[index] === userToActorMap.get(user.id)
      );

      // If there are no self-assignments, write to settings and return
      if (!hasSelfAssignment) {
        const assignmentMap = Object.fromEntries(
          activeUsers.map((user, index) => [
            user.name,
            shuffledActors[index]!.name
          ])
        );
        const dramaticHookAssignments = Object.fromEntries(
          activeUsers.map((user, index) => [
            user.id!,
            shuffledActors[index]!.id!
          ])
        ) as Record<string, string>;
        kLog.log("No self-assignments, returning assignments", {
          assignmentMap,
          dramaticHookAssignments
        });
        await setSetting("dramaticHookAssignments", dramaticHookAssignments);
        return;
      }
      // If there were self-assignments, the while loop will continue and try again
      kLog.log("Self-assignments found, trying again");
    }
  }

  // #endregion DRAMATIC HOOK ASSIGNMENT ~

  // #region PHASE LIFECYCLE METHODS ~

  async initializePhase(gamePhase?: GamePhase) {
    pLog.funcIn(); // Auto-detect "initializePhase"
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
    pLog.funcOut(); // Match with funcIn above
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
    pLog.funcIn(); // Auto-detect "cleanupPhase"
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
    pLog.funcOut(); // Match with funcIn above
  }

  // #region SessionClosed Methods
  private async initialize_SessionClosed(): Promise<void> {
    addClassToDOM("session-closed");
    gsap.to([this.midZIndexMask$[0], this.maxZIndexBars$[0]], {
      autoAlpha: 1,
      duration: 3,
      clearProps: "all",
      ease: "power2.out"
    });
    this.topZIndexMask$.attr("style", "");
    this.topZIndexMask$.find(".horiz-rule").attr("style", "");
    this.topZIndexMask$.children().children().attr("style", "");
    this.resetOverlayFromIntroVideo();
    await this.initializeLoadingScreenItemRotation();
    await Promise.all([
      this.initializeCountdown(),
      EunosMedia.SetSoundscape({
        "ambient-session-closed":
          this.getVolumeOverride("ambient-session-closed") ?? null
      })
    ]);
    // this.addCanvasMaskListeners();
  }
  async sync_SessionClosed() {
    addClassToDOM("session-closed");
    this.resetOverlayFromIntroVideo();
    await this.initializeLoadingScreenItemRotation();
    await Promise.all([
      this.initializeCountdown(),
      EunosMedia.SetSoundscape({
        "ambient-session-closed":
          this.getVolumeOverride("ambient-session-closed") ?? null
      })
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
    this.resetOverlayFromIntroVideo();
    await this.initializeLoadingScreenItemRotation();
    await Promise.all([
      this.initializeCountdown(),
      this.initializePreSessionSong()
    ]);
    this.initializeVideoPreloading();
    if (!getUser().isGM) return;

    // GM assigns dramatic hooks and session scribe to settings
    void this.setDramaticHookAssignments();
    void this.setSessionScribe();
  }

  async sync_SessionLoading() {
    addClassToDOM("session-loading");
    this.resetOverlayFromIntroVideo();
    await this.initializeLoadingScreenItemRotation();
    await Promise.all([
      this.initializeCountdown(),
      this.initializePreSessionSong(),
      this.preloadIntroVideo(),
      EunosMedia.SetSoundscape({
        "ambient-session-closed":
          this.getVolumeOverride("ambient-session-closed") ?? null
      })
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
  private async initialize_SessionStarting(): Promise<void> {
    addClassToDOM("session-starting");
    if (getUser().isGM) {
      // GM triggers video playback for all clients
      void EunosSockets.getInstance().call(
        "startVideoPlayback",
        UserTargetRef.all
      );
    }
    void this.buildPCPortraitTimelines();
    gsap.to(this.stage$, {
      filter: "brightness(0)",
      duration: 0,
      ease: "none"
    });
  }

  async sync_SessionStarting(): Promise<void> {
    addClassToDOM("session-starting");
    void this.buildPCPortraitTimelines();
    gsap.to(this.stage$, {
      filter: "brightness(0)",
      duration: 0,
      ease: "none"
    });
    await this.playIntroVideo();
  }

  private async cleanup_SessionStarting(): Promise<void> {
    pLog.funcIn(); // Auto-detect "cleanup_SessionStarting"
    await this.killIntroVideo();
    this.unfreezeOverlay();
    removeClassFromDOM("session-starting");
    pLog.funcOut(); // Match with funcIn above
  }
  // #endregion SessionStarting Methods

  fadeOutBlackdrop() {
    return gsap
      .timeline()
      .fromTo(
        "#BLACKOUT-LAYER",
        { autoAlpha: 1 },
        { autoAlpha: 0, duration: 5, ease: "power2.inOut" }
      )
      .fromTo(
        "#PCS",
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 3, ease: "power2.inOut" },
        2
      );
  }

  // #region SessionRunning Methods
  private async initialize_SessionRunning(): Promise<void> {
    pLog.funcIn(); // Auto-detect "initialize_SessionRunning"

    kLog.display("=== Killing Soundscape ===");
    pLog.startTimestamp("Killing soundscape");
    await EunosMedia.SetSoundscape({});
    pLog.endTimestamp("Soundscape killed");

    // Kill countdown if it's running
    kLog.display("=== Killing Countdown ===");
    pLog.startTimestamp("Killing countdown");
    await this.killCountdown(true, true);
    pLog.endTimestamp("Countdown killed");

    kLog.display("=== Building Portrait Timelines ===");
    pLog.startTimestamp("Building PC portrait timelines");
    await this.buildPCPortraitTimelines();
    pLog.endTimestamp("PC portrait timelines built");

    kLog.display("=== Adding Class to DOM ===");
    addClassToDOM("session-running");

    kLog.display("=== Revealing Stage ===");
    gsap.set(this.stage$, { autoAlpha: 1 });

    kLog.display("=== Alerting Session Scribe ===");
    void this.alertSessionScribe();

    kLog.display("=== Going to Location ===");
    pLog.startTimestamp("Going to location");
    if (getSetting("inLimbo")) {
      await this.enterLimbo();
    } else {
      await this.goToLocation(null, undefined, {
        fadeOutBlackdrop: true,
        delayPCs: true,
        delayWeather: true
      });
    }
    pLog.endTimestamp("Location transition completed");

    // kLog.display("=== Updating PCUI ===");
    // await this.updatePCUI();
    // kLog.display("=== Updating Weather Audio ===");
    // await this.updateWeatherAudio();
    // this.render({parts: ["pcs"]});
    if (!getUser().isGM) {
      pLog.funcOut(); // Match with funcIn above
      return;
    }
    // Send an Alert to the session scribe
    pLog.funcOut(); // Match with funcIn above
  }

  public async alertSessionScribe() {
    void EunosAlerts.Alert({
      type: AlertType.central,
      header: "<br/>You are the Session Scribe!",
      body: "<br/>The easiest place to add your notes is the <span style='color: var(--K4-bbGOLD)'>Session Scribe icon at the top right of your screen</span>, which will open a notepad where you can record your notes during play. <em>Please let me know if this doesn't work for you!</em><br/><br/>As a reward for sumbitting, you'll gain 1 Experience Point!",
      target: getSetting("sessionScribe"),
      displayDuration: 7,
      soundName: "alert-hit-session-scribe",
      logoImg:
        "modules/eunos-kult-hacks/assets/images/stage/session-scribe-quill.webp"
    });
  }

  async sync_SessionRunning() {
    kLog.display("=== Killing Soundscape ===");
    await EunosMedia.SetSoundscape({});
    // Kill countdown if it's running
    kLog.display("=== Killing Countdown ===");
    await this.killCountdown(true, true);
    kLog.display("=== Building Portrait Timelines ===");
    await this.buildPCPortraitTimelines();
    kLog.display("=== Adding Class to DOM ===");
    addClassToDOM("session-running");
    kLog.display("=== Revealing Stage ===");
    gsap.set(this.stage$, { autoAlpha: 1 });
    kLog.display("=== Fading Out Backdrop ===");
    await this.fadeOutBlackdrop();
    kLog.display("=== Going to Location ===");
    if (getSetting("inLimbo")) {
      await this.enterLimbo();
    } else {
      await this.goToLocation(null);
    }
    // kLog.display("=== Updating PCUI ===");
    // await this.updatePCUI();
    // kLog.display("=== Updating Weather Audio ===");
    // await this.updateWeatherAudio();
  }

  private async cleanup_SessionRunning(): Promise<void> {
    removeClassFromDOM("session-running");
    gsap.to(this.stage$, {
      autoAlpha: 0,
      duration: 4,
      ease: "power2.out"
    });
    if (!getUser().isGM) {
      return;
    }

    // Get all PC actors and prepare data for the template
    const pcActors = getActors().filter((actor) => actor.isPC());
    void Promise.all(
      pcActors.map((pc) => pc.resetCounters(CounterResetOn.Session))
    );
  }

  // #endregion SessionRunning Methods

  // #region SessionEnding Methods
  private async animateEndOfSession(isInstant = false): Promise<void> {
    void EunosMedia.SetSoundscape({}, 5);
    // gsap.fromTo(
    //   this.endPhase$,
    //   {
    //     scale: 1,
    //     rotateX: 5,
    //     rotateY: 5,
    //     rotateZ: 5
    //   }, {
    //     rotateX: -5,
    //     rotateY: -5,
    //     rotateZ: -5,
    //     ease: "back.inOut(0.5)",
    //     repeat: -1,
    //     yoyo: true,
    //     uration: 25
    //   })
    const tl = gsap.timeline();
    tl.call(() => {
      void this.animateInBlackBars(0, isInstant ? 0 : 10);
    });
    tl.fromTo(
      this.topZIndexMask$,
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        duration: 5,
        ease: "power2.out",
        onComplete: () => {
          addClassToDOM("session-ending");
        }
      },
      1
    );
    tl.fromTo(
      this.endPhase$,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.5, ease: "power2.out" },
      6
    );
    tl.to(".app.sheet", { autoAlpha: 0, duration: 0.5, ease: "power2.out" }, 6);
    tl.call(
      () => {
        void this.animateSessionTitle(undefined, undefined, true, isInstant);
      },
      undefined,
      5
    );
    tl.call(
      () => {
        void this.initializeCountdown();
      },
      [],
      10
    );

    tl.timeScale(isInstant ? 20 : 1);

    await tl.play();
  }
  private async initialize_SessionEnding(isInstant = false): Promise<void> {
    gsap.set(this.topZIndexMask$, {
      background: this.isLocationBright ? "var(--K4-WHITE)" : "var(--K4-BLACK)"
    });
    gsap.set(this.midZIndexMask$, {
      autoAlpha: 0
    });
    if (!this.isLocationBright) {
      this.topZIndexMask$.find(".horiz-rule").css("filter", "invert(1)");
      this.topZIndexMask$.children().children().css("color", "var(--K4-WHITE)");
    }

    await this.animateEndOfSession(isInstant);

    if (getUser().isGM) {
      void setSetting("endPhaseQuestion", 0);
    }
  }

  async sync_SessionEnding() {
    void this.initialize_SessionEnding(true);
    addClassToDOM("session-ending");
    // EunosMedia.GetPlayingSounds().forEach((sound) => {
    //   void sound.kill();
    // });
  }

  private async cleanup_SessionEnding(): Promise<void> {
    this.closeAssignDramaticHookDialog();
    removeClassFromDOM("session-ending");
    gsap.to(
      [
        this.endPhase$[0],
        this.topZIndexMask$[0],
        this.midZIndexMask$[0],
        this.maxZIndexBars$[0]
      ],
      {
        autoAlpha: 0,
        duration: 3,
        ease: "power2.out"
      }
    );
    gsap.to(".app.sheet", { autoAlpha: 1, duration: 0.5, ease: "power2.out" });
  }
  // #endregion SessionEnding Methods

  // #endregion PHASE LIFECYCLE METHODS

  // #endregion PRE-SESSION MANAGEMENT & GAME PHASE CONTROL ~

  // #region INTRO VIDEO ~

  #animateOutBlackBarsTimeout: Maybe<number>;
  #animateSessionTitleTimeout: Maybe<number>;
  #introVideo: Maybe<EunosMedia<EunosMediaTypes.video>>;
  get introVideo(): EunosMedia<EunosMediaTypes.video> {
    if (!this.#introVideo) {
      this.#introVideo = new EunosMedia("intro-video", {
        path: `modules/eunos-kult-hacks/assets/video/${getSetting("introVideoFilename")}`,
        type: EunosMediaTypes.video,
        parentSelector: "#TOP-ZINDEX-MASK",
        autoplay: false,
        fadeInDuration: 2,
        sync: true,
        loop: false,
        mute: false,
        volume: 0.65,
        alwaysPreload: true,
        reportPreloadStatus: true
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

  /** Requests all clients to report their current video preload status */
  private requestStatusUpdate(): void {
    if (!getUser().isGM) return;
    kLog.log("Requesting status update from all clients");
    void EunosSockets.getInstance().call(
      "preloadIntroVideo",
      UserTargetRef.all
    );
  }

  /** Initiates video preloading for all users */
  private initializeVideoPreloading(): void {
    if (!getUser().isGM) return;
    void EunosSockets.getInstance().call(
      "preloadIntroVideo",
      UserTargetRef.all
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
          }
        }
      },
      default: "ok"
    }).render(true);
  }

  async animateOutBlackBars(
    startTime = 0,
    duration = PRE_SESSION.BLACK_BARS_ANIMATION_OUT_DURATION
  ) {
    const topBarElement = this.maxZIndexBars$.find(".canvas-mask-bar-top")[0];
    const bottomBarElement = this.maxZIndexBars$.find(
      ".canvas-mask-bar-bottom"
    )[0];

    if (!topBarElement || !bottomBarElement) {
      kLog.error("Failed to find top or bottom bar element");
      return;
    }

    const tl = gsap.timeline();

    tl.fromTo(
      [topBarElement, bottomBarElement],
      {
        height: 150
      },
      {
        height: 0,
        duration,
        ease: "none"
      },
      0
    ).seek(startTime);

    return tl;
  }

  async animateInBlackBars(
    startTime = 0,
    duration: number = POST_SESSION.BLACK_BARS_ANIMATION_IN_DURATION
  ) {
    const topBarElement = this.maxZIndexBars$.find(".canvas-mask-bar-top")[0];
    const bottomBarElement = this.maxZIndexBars$.find(
      ".canvas-mask-bar-bottom"
    )[0];

    if (!topBarElement || !bottomBarElement) {
      kLog.error("Failed to find top or bottom bar element");
      return;
    }

    const tl = gsap.timeline();

    tl.fromTo(
      [topBarElement, bottomBarElement],
      {
        height: 0,
        ease: "none"
      },
      {
        height: 150,
        duration,
        onStart: () => {
          gsap.set(this.maxZIndexBars$, { autoAlpha: 1 });
        }
      },
      0
    ).seek(startTime);

    return tl;
  }

  resetOverlayFromIntroVideo(): void {
    if (this.#animateOutBlackBarsTimeout) {
      clearTimeout(this.#animateOutBlackBarsTimeout);
      this.#animateOutBlackBarsTimeout = undefined;
    }
    if (this.#animateSessionTitleTimeout) {
      clearTimeout(this.#animateSessionTitleTimeout);
      this.#animateSessionTitleTimeout = undefined;
    }
    this.midZIndexMask$.attr("style", "");
    this.maxZIndexBars$.attr("style", "");
    this.maxZIndexBars$.find(".canvas-mask-bar-top").attr("style", "");
    this.maxZIndexBars$.find(".canvas-mask-bar-bottom").attr("style", "");
    this.topZIndexMask$.attr("style", "");
  }

  async animateSessionTitle(
    chapter?: string,
    title?: string,
    isEndOfSession = false,
    isInstant = false
  ): Promise<void> {
    chapter = chapter ?? tCase(verbalizeNum(getSetting("chapterNumber")));
    title = title ?? getSetting("chapterTitle");

    const instance = EunosOverlay.instance;
    const introElem$ = instance.topZIndexMask$.find(".chapter-ending-intro");
    const chapterElem$ = instance.topZIndexMask$.find(".chapter-number");
    const horizRule$ = instance.topZIndexMask$.find(".horiz-rule");
    const titleElem$ = instance.topZIndexMask$.find(".chapter-title");

    chapterElem$.text(`Chapter ${chapter}`);
    titleElem$.text(title);

    const tl = gsap.timeline();

    let position = 0;

    if (isEndOfSession) {
      tl.fromTo(
        introElem$,
        {
          scale: 0.9,
          autoAlpha: 0
        },
        {
          scale: 1,
          duration: 5,
          autoAlpha: 1
        },
        position
      );
      position += 0.2;
    }
    tl.fromTo(
      chapterElem$,
      {
        scale: 0.9,
        autoAlpha: 0
        // y: "-=20"
      },
      {
        scale: 1,
        autoAlpha: 1,
        // y: 0,
        duration: 5,
        ease: "none"
      },
      position
    );
    position += 0.2;
    tl.fromTo(
      horizRule$,
      {
        scaleX: 0,
        autoAlpha: 0
      },
      {
        scaleX: 1,
        duration: 3,
        ease: "none"
      },
      position
    );
    position += 0.2;
    tl.to(
      horizRule$,
      {
        autoAlpha: 1,
        ease: "none",
        duration: 5
      },
      position
    ).fromTo(
      titleElem$,
      {
        scale: 0.9,
        autoAlpha: 0
        // y: "+=20"
      },
      {
        scale: 1,
        autoAlpha: 1,
        // y: 0,
        duration: 5,
        ease: "none"
      },
      position
    );

    this.addFadeOutSessionTitleToTimeline(tl, isEndOfSession, isInstant);

    await tl;
  }

  addFadeOutSessionTitleToTimeline(
    timeline: gsap.core.Timeline,
    isEndOfSession = false,
    isInstant = false
  ) {
    const layersToFade = [
      EunosOverlay.instance.topZIndexMask$[0],
      EunosOverlay.instance.midZIndexMask$[0],
      EunosOverlay.instance.topZIndexMask$.find(".chapter-ending-intro")[0],
      EunosOverlay.instance.topZIndexMask$.find(".chapter-number")[0],
      EunosOverlay.instance.topZIndexMask$.find(".horiz-rule")[0],
      EunosOverlay.instance.topZIndexMask$.find(".chapter-title")[0]
    ];
    if (!isEndOfSession) {
      layersToFade.push(EunosOverlay.instance.maxZIndexBars$[0]);
    }
    timeline.to(
      layersToFade,
      {
        autoAlpha: 0,
        duration: isInstant ? 0.1 : 1,
        ease: "none"
      },
      isInstant ? 0 : undefined
    );
  }

  /** Fades in the topZIndexMask and the intro video */
  private async fadeInIntroVideo(): Promise<void> {
    kLog.log("Fading in intro video");
    await gsap
      .timeline()
      .set(this.maxZIndexBars$, { zIndex: 10001 })
      .to(this.topZIndexMask$, {
        autoAlpha: 1,
        duration: 1
      })
      .to(this.midZIndexMask$, {
        autoAlpha: 0,
        duration: 0.25
      });
  }

  /** Plays the intro video from the start */
  public async playIntroVideo(isPlayingQuote = false): Promise<void> {
    // Reset volume in case it was faded out
    this.introVideo.setVolumeImmediate(1);

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
      { once: true }
    );

    await EunosMedia.Play(this.introVideo.name, { fadeInDuration: 1 });

    // Schedule playback of session quote if intro video is just starting
    if (this.introVideo.currentTime <= 2) {
      const sessionQuoteName = `quote-session-${getSetting("chapterNumber")}`;
      const quoteMedia = EunosMedia.GetMedia(sessionQuoteName);
      if (quoteMedia) {
        void EunosMedia.Play(sessionQuoteName);
      }
    }

    // Schedule animating-out of black bars (or set them instantly if intro video has been playing for too long)
    const blackBarsAnimationOutStart =
      PRE_SESSION.BLACK_BARS_ANIMATION_OUT_VIDEO_DELAY -
      this.introVideo.currentTime;
    const blackBarsAnimationOutEnd =
      PRE_SESSION.BLACK_BARS_ANIMATION_OUT_VIDEO_DELAY +
      PRE_SESSION.BLACK_BARS_ANIMATION_OUT_DURATION -
      this.introVideo.currentTime;
    if (blackBarsAnimationOutEnd <= 0) {
      void this.animateOutBlackBars(
        PRE_SESSION.BLACK_BARS_ANIMATION_OUT_DURATION
      );
    } else if (blackBarsAnimationOutStart < 0) {
      void this.animateOutBlackBars(-1 * blackBarsAnimationOutStart);
    } else {
      this.#animateOutBlackBarsTimeout = window.setTimeout(() => {
        void this.animateOutBlackBars();
      }, blackBarsAnimationOutStart * 1000);
    }

    // Schedule animation of the title
    const videoDuration = await this.introVideo.getDuration();
    const currentVideoTime = this.introVideo.currentTime;
    const titleDisplayOffset = PRE_SESSION.CHAPTER_TITLE_DISPLAY_VIDEO_OFFSET;
    const titleDisplayTime =
      videoDuration - titleDisplayOffset - currentVideoTime;
    this.#animateSessionTitleTimeout = window.setTimeout(() => {
      void this.animateSessionTitle().then(() => {
        if (getUser().isGM) {
          void setSetting("gamePhase", GamePhase.SessionRunning);
        }
      });
    }, titleDisplayTime * 1000);
  }

  private async killIntroVideo(): Promise<void> {
    pLog.funcIn(); // Auto-detect "killIntroVideo"
    if (this.#animateOutBlackBarsTimeout) {
      clearTimeout(this.#animateOutBlackBarsTimeout);
      this.#animateOutBlackBarsTimeout = undefined;
    }
    if (this.#animateSessionTitleTimeout) {
      clearTimeout(this.#animateSessionTitleTimeout);
      this.#animateSessionTitleTimeout = undefined;
    }
    await gsap.to(
      [this.topZIndexMask$[0], this.maxZIndexBars$[0], this.midZIndexMask$[0]],
      {
        autoAlpha: 0,
        duration: 0.5,
        ease: "power1.out"
      }
    );
    await EunosMedia.Kill(this.introVideo.name);
    pLog.funcOut(); // Match with funcIn above
  }
  // #endregion INTRO VIDEO ~

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
        ownerID: getOwnerOfDoc(actor)!.id!
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
        isOwner: owner.id === getUser().id
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
        slot: String(index + 1) as "1" | "2" | "3" | "4" | "5"
      };
    });
    this.PCsGlobalData = dataRecord as Record<
      "1" | "2" | "3" | "4" | "5",
      PCs.GlobalData
    >;
    return this.PCsGlobalData;
  }

  private getDefaultLocationPCData(): Array<Location.PCData.SettingsData> {
    const pcGlobalData = this.getPCsGlobalSettingsData();
    const pcData: Array<Location.PCData.SettingsData> = [];
    Object.values(pcGlobalData).forEach((data) => {
      pcData.push({
        ...data,
        state: PCState.hidden
      });
    });
    return pcData;
  }

  private async setLocationPCData(
    location: string,
    fullData: Location.PCData.FullData
  ) {
    const locationSettingsData = this.getLocationSettingsData(location);
    // Extract only the settings data fields
    const settingsData: Location.PCData.SettingsData = {
      actorID: fullData.actorID,
      ownerID: fullData.ownerID,
      state: fullData.state
    };
    locationSettingsData.pcData[fullData.actorID] = settingsData;
    await this.setLocationData(location, locationSettingsData);
  }

  public async setLocationPCValue(
    location: string,
    pcRef: number | string | EunosActor,
    dotKey: string,
    value: unknown
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
  //   string,
  //   Record<string, gsap.core.Timeline>
  // > = {} as Record<string, Record<string, gsap.core.Timeline>>;

  private pcMasterTimelines: Record<string, gsap.core.Timeline> = {} as Record<
    string,
    gsap.core.Timeline
  >;
  private pcSwayTimelines: Record<string, gsap.core.Timeline> = {} as Record<
    string,
    gsap.core.Timeline
  >;
  private pcMaskedTimelines: Record<string, gsap.core.Timeline> = {} as Record<
    number,
    gsap.core.Timeline
  >;

  private slotStats = {
    "1": {
      bottom: -30,
      skewX: 0,
      skewY: -5,
      rotationX: 100,
      scale: 0.9
    },
    "2": {
      bottom: -15,
      skewX: 0,
      skewY: -2.5,
      rotationX: 100,
      scale: 0.95
    },
    "3": {
      bottom: 0,
      skewX: 0,
      skewY: 0,
      rotationX: 100,
      scale: 1
    },
    "4": {
      bottom: -15,
      skewX: 0,
      skewY: 2.5,
      rotationX: 100,
      scale: 0.95
    },
    "5": {
      bottom: -30,
      skewX: 0,
      skewY: 5,
      rotationX: 100,
      scale: 0.9
    }
  };

  private buildHiddenToDimmedTimeline(
    pcContainer$: JQuery,
    slot: "1" | "2" | "3" | "4" | "5"
  ): gsap.core.Timeline {
    const pcID = pcContainer$.attr("data-pc-id") as Maybe<string>;
    if (!pcID) {
      throw new Error("PC ID not found for pcContainer$");
    }

    const shadow$ = pcContainer$.find(".pc-portrait-shadow-main");
    const shadowEmpty$ = pcContainer$.find(".pc-portrait-shadow-empty");

    const portraitContainer$ = pcContainer$.find(".pc-portrait-container");
    const portraitWrapper$ = portraitContainer$.find(".pc-portrait-wrapper");
    const interiorWrapper$ = portraitWrapper$.find(
      ".pc-portrait-interior-wrapper"
    );
    const smoke$ = interiorWrapper$.find(".pc-portrait-smoke");
    const portraitBg$ = interiorWrapper$.find(".pc-portrait-bg");
    const frameDark$ = portraitWrapper$.find(".pc-portrait-frame-dark");
    const frameDim$ = portraitWrapper$.find(".pc-portrait-frame-dim");

    const tl = gsap
      .timeline()
      // .call(() => {
      //   this.pcSwayTimelines[pcID]?.seek(0).pause();
      // })
      .fromTo(
        portraitWrapper$,
        {
          opacity: 1,
          y: 200
        },
        {
          y: this.slotStats[slot].bottom,
          duration: 1,
          ease: "bounce.in"
        },
        0
      )
      .fromTo(
        frameDim$,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.5,
          ease: "power3.out"
        },
        0
      )
      .fromTo(
        frameDark$,
        { opacity: 1 },
        {
          opacity: 0,
          duration: 0.5,
          ease: "power3.out"
        },
        0.5
      )
      .fromTo(
        smoke$,
        { opacity: 0, filter: "contrast(1.5) brightness(0.15)" },
        {
          opacity: 1,
          duration: 0.5,
          ease: "power3.out"
        },
        0
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
          ease: "power3.out"
        },
        0.5
      )
      .fromTo(
        shadowEmpty$,
        {
          opacity: 0.7,
          y: 100
        },
        {
          opacity: 0,
          y: 0,
          duration: 0.25,
          ease: "power3.out"
        },
        0.25
      )
      .fromTo(
        shadow$,
        {
          opacity: 0,
          y: 100
        },
        {
          opacity: 0.7,
          y: 0,
          duration: 0.25,
          ease: "power3.out"
        },
        0.25
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
    slot: "1" | "2" | "3" | "4" | "5"
  ): gsap.core.Timeline {
    const spotlightContainer$ = pcContainer$.find(".pc-spotlight-container");
    const lights$ = spotlightContainer$.find(".pc-spotlight");
    const onLights$ = lights$.filter(".pc-spotlight-on");
    const offLights$ = lights$.filter(".pc-spotlight-off");

    const portraitContainer$ = pcContainer$.find(".pc-portrait-container");
    const portraitWrapper$ = portraitContainer$.find(".pc-portrait-wrapper");
    const interiorWrapper$ = portraitWrapper$.find(
      ".pc-portrait-interior-wrapper"
    );
    const redLightning$ = interiorWrapper$.find(".pc-portrait-red-lightning");
    const smoke$ = interiorWrapper$.find(".pc-portrait-smoke");
    const portraitFg$ = interiorWrapper$.find(".pc-portrait-fg");
    const portraitBg$ = interiorWrapper$.find(".pc-portrait-bg");
    const nameplate$ = interiorWrapper$.find(".pc-portrait-nameplate");
    const frameDim$ = portraitWrapper$.find(".pc-portrait-frame-dim");
    const frameMain$ = portraitWrapper$.find(".pc-portrait-frame-main");

    return gsap
      .timeline()
      .to(
        smoke$,
        {
          opacity: 0,
          duration: 0.5,
          ease: "power3.out"
        },
        0.25
      )
      .fromTo(
        frameMain$,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1,
          ease: "power3.out"
        },
        0
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
          ease: "power3.out"
        },
        0.5
      )
      .fromTo(
        nameplate$,
        { filter: "grayscale(1) brightness(1)" },
        {
          filter: "grayscale(0) brightness(1)",
          duration: 0.5,
          ease: "power3.out"
        },
        0.5
      )
      .to(
        portraitBg$,
        {
          filter: "grayscale(0.5) brightness(1)",
          duration: 0.5,
          ease: "power3.out"
        },
        0.5
      )
      .fromTo(
        portraitFg$,
        {
          opacity: 0,
          scale: 0.8,
          // y: -60,
          filter: "grayscale(0.5) brightness(0) blur(15px)"
        },
        {
          scale: 1,
          y: 0,
          opacity: 1,
          filter: "grayscale(0.5) brightness(1) blur(0px)",
          duration: 0.5,
          ease: "power3.out"
        },
        0.25
      )
      .fromTo(
        offLights$,
        { y: 500, opacity: 1 },
        {
          y: 0,
          duration: 0.5,
          stagger: {
            amount: 0.5,
            ease: "power2"
          }
        },
        0
      )
      .fromTo(
        onLights$,
        { y: 500, opacity: 0 },
        {
          y: 0,
          duration: 0.5
        },
        0
      );
  }
  private buildBaseToSpotlitTimeline(
    pcContainer$: JQuery,
    slot: "1" | "2" | "3" | "4" | "5"
  ): gsap.core.Timeline {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const ease = CustomEase.create(
      "flickerIn",
      EASES.flickerIn
    ) as gsap.EaseFunction;

    const spotlightContainer$ = pcContainer$.find(".pc-spotlight-container");
    const lights$ = spotlightContainer$.find(".pc-spotlight");
    const onLights$ = lights$.filter(".pc-spotlight-on");

    const portraitContainer$ = pcContainer$.find(".pc-portrait-container");
    const portraitWrapper$ = portraitContainer$.find(".pc-portrait-wrapper");
    const interiorWrapper$ = portraitWrapper$.find(
      ".pc-portrait-interior-wrapper"
    );
    const portraitFg$ = interiorWrapper$.find(".pc-portrait-fg");
    const portraitBg$ = interiorWrapper$.find(".pc-portrait-bg");
    const nameplate$ = interiorWrapper$.find(".pc-portrait-nameplate");
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
            ease: "power2"
          }
        },
        0
      )
      .fromTo(
        frameSpotlit$,
        { opacity: 0 },
        {
          opacity: 1,
          ease,
          duration: 0.5
        },
        0.5
      )
      .to(
        [portraitBg$, portraitFg$, nameplate$],
        {
          filter: "grayscale(0) brightness(1.5) blur(0px)",
          duration: 0.5,
          ease
        },
        0.5
      );
    // .to([portraitBg$, portraitFg$], {
    //   scale: 1.25,
    //   y: 25,
    //   duration: 0.5,
    //   ease
    // }, 0.5);
  }

  private buildToMaskedTimeline(pcID: string): gsap.core.Timeline {
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
        ease: "power3.out"
      })
      .addLabel(PCState.masked);
  }

  private buildMasterPCTimeline(pcID: string): gsap.core.Timeline {
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
      ".session-scribe-indicator"
    );

    const portraitContainer$ = pcContainer$.find(".pc-portrait-container");
    const dramaticHookCandleIndicator$ = portraitContainer$.find(
      ".dramatic-hook-candle-indicator"
    );
    const portraitWrapper$ = portraitContainer$.find(".pc-portrait-wrapper");
    const interiorWrapper$ = portraitWrapper$.find(
      ".pc-portrait-interior-wrapper"
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
      frameSpotlit$
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

  private buildSwayingLoopTimeline(pcID: string): gsap.core.Timeline {
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
        repeatRefresh: true
      });
  }

  private buildHookDisplayTimeline(
    pcID: string,
    index: 1 | 2
  ): gsap.core.Timeline {
    const hookContainer$ = this.getDramaticHookContainer(pcID, index);
    const actor = getActorFromRef(pcID);
    if (!actor?.isPC()) {
      kLog.log(
        `Actor ${pcID} is not a PC, skipping dramatic hook display.`,
        actor
      );
      return gsap.timeline();
    }
    const tl = gsap
      .timeline({
        repeatRefresh: true,
        onStart: function (this: gsap.core.Timeline) {
          const hookData = actor.system.dramatichooks[`dramatichook${index}`];
          if (!hookData.content || hookData.isChecked) {
            kLog.log(
              `Actor ${pcID} has no dramatic hook content or is already checked, skipping dramatic hook display.`,
              hookData
            );
            this.progress(1).kill();
          }
        }
      })
      .fromTo(
        hookContainer$,
        {
          opacity: 0,
          y: 100,
          scale: 0.75,
          filter: "blur(10px)"
        },
        {
          opacity: 1,
          y: 30,
          scale: 1,
          filter: "blur(0px)",
          duration: 3,
          ease: "sine.inOut"
        }
      )
      .fromTo(
        hookContainer$,
        {
          y: 30
        },
        {
          y: 20,
          duration: 4,
          repeat: 6,
          yoyo: true,
          ease: "sine.inOut"
        },
        0
      )
      .to(hookContainer$, {
        opacity: 0,
        scale: 2,
        filter: "blur(10px)",
        duration: 3,
        ease: "power3.in"
      })
      .to(hookContainer$, {
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 0
      });
    return tl;
  }

  private getDramaticHookContainer(pcID: string, index: 1 | 2): JQuery {
    const container$ = this.pcs$.find(`.pc-container[data-pc-id="${pcID}"]`);
    if (!container$.length) {
      throw new Error(`PC container for pcID '${pcID}' not found.`);
    }
    const hookContainer$ = container$.find(".dramatic-hook-container");
    if (hookContainer$.length < index) {
      throw new Error(
        `Dramatic hook container for pcID '${pcID}' and index '${index}' not found.`
      );
    }
    return $(hookContainer$[index - 1] as HTMLElement);
  }

  #dramaticHookTimeline: Maybe<gsap.core.Timeline>;

  private get dramaticHookTimeline(): gsap.core.Timeline {
    if (!this.#dramaticHookTimeline) {
      this.#dramaticHookTimeline = this.buildDramaticHookTimeline();
    }
    return this.#dramaticHookTimeline;
  }

  private buildDramaticHookTimeline(): gsap.core.Timeline {
    const activeActors = getOwnedActors().filter(
      (actor) => actor.isPC() && getOwnerOfDoc(actor)?.id !== getUser().id
    );
    const activeActorContainers: [string, 1 | 2][] = [];
    activeActors.forEach((actor) => {
      activeActorContainers.push([actor.id!, 1], [actor.id!, 2]);
    });
    kLog.log("Active actor containers:", activeActorContainers);
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatRefresh: true });
    shuffle(activeActorContainers).forEach(([pcID, index]) => {
      tl.add(this.buildHookDisplayTimeline(pcID, index), "+=20");
    });
    return tl;
  }

  public async buildPCPortraitTimelines(isForcing = false) {
    const ownedActors = getOwnedActors();
    ownedActors.forEach((actor) => {
      if (isForcing || !this.pcMasterTimelines[actor.id!] ) {
        this.pcMasterTimelines[actor.id!] = this.buildMasterPCTimeline(actor.id!);
        this.pcMasterTimelines[actor.id!]?.seek(0);
      }
      if (isForcing || !this.pcSwayTimelines[actor.id!]) {
        this.pcSwayTimelines[actor.id!] = this.buildSwayingLoopTimeline(
          actor.id!
        );
      }
      if (isForcing || !this.pcMaskedTimelines[actor.id!]) {
        this.pcMaskedTimelines[actor.id!] = this.buildToMaskedTimeline(actor.id!);
      }
    });
    if (!getUser().isGM && !this.dramaticHookTimeline.isActive()) {
      this.dramaticHookTimeline.play();
    }
  }

  private PCUIChanges: Map<string, PCState> = new Map();
  private NPCUIChanges: Map<
    string,
    {
      portraitState: NPCPortraitState;
      nameState: NPCNameState;
      position: Point;
    }
  > = new Map();

  private refreshChangesDisplay(): void {
    this.changesLog$.empty();
    const changeDisplayLines: string[] = [];
    const stateDisplayStrings: string[] = [];
    this.PCUIChanges.forEach((state, id) => {
      changeDisplayLines.push(
        `<div class="change-log-entry change-log-entry-pc"><strong>${getActorFromRef(id)?.name}</strong> is now ${state.toUpperCase()}</div>`
      );
    });
    this.NPCUIChanges.forEach((change, id) => {
      if ("portraitState" in change && change.portraitState) {
        stateDisplayStrings.push(`P: ${change.portraitState.toUpperCase()}`);
      }
      if ("nameState" in change && change.nameState) {
        stateDisplayStrings.push(`N: ${change.nameState.toUpperCase()}`);
      }
      let stateString = stateDisplayStrings.join(" and ");
      stateDisplayStrings.length = 0; // Clear array by setting length to 0
      if ("position" in change && change.position) {
        stateString += ` at {${change.position.x}, ${change.position.y}}`;
      }
      changeDisplayLines.push(
        `<div class="change-log-entry change-log-entry-npc"><strong>${getActorFromRef(id)?.name}</strong> is now ${stateString}</div>`
      );
    });
    this.changesLog$.html(changeDisplayLines.join(""));
  }

  private queueUIChanges(
    changes: Record<
      string,
      | PCState
      | {
          portraitState?: NPCPortraitState;
          nameState?: NPCNameState;
          position?: Point;
        }
    >
  ): void {
    // Separate the changes into PC and NPC changes
    Object.entries(changes)
      .filter(([id]) => getActorFromRef(id)?.isPC())
      .forEach(([pcID, state]) => {
        this.PCUIChanges.set(pcID, state as PCState);
        this.updatePCUI_GM(pcID, state as PCState);
      });

    (
      Object.entries(changes).filter(
        ([id]): this is [
          string,
          {
            portraitState?: NPCPortraitState;
            nameState?: NPCNameState;
            position?: Point;
          },
        ] => !getActorFromRef(id)?.isPC()
      ) as [
        string,
        {
          portraitState?: NPCPortraitState;
          nameState?: NPCNameState;
          position?: Point;
        },
      ][]
    ).forEach(([npcID, { portraitState, nameState, position }]) => {
      const npcContainer$ = $(`.npc-portrait[data-actor-id="${npcID}"]`);
      // If there are missing states, derive it from the data attributes of the NPC container
      portraitState ??= npcContainer$.attr(
        "data-portrait-state"
      ) as NPCPortraitState;
      nameState ??= npcContainer$.attr("data-name-state") as NPCNameState;
      // If there is no position, derive it from the position of the NPC container
      position ??= {
        x: parseInt(`${gsap.getProperty(npcContainer$[0]!, "x")}`),
        y: parseInt(`${gsap.getProperty(npcContainer$[0]!, "y")}`)
      };

      this.NPCUIChanges.set(npcID, { portraitState, nameState, position });
      void this.updateNPCUI_GM(npcID, { portraitState, nameState, position });
    });

    this.refreshChangesDisplay();
  }

  private async pushUIChanges(): Promise<void> {
    const timer = getTimeStamp();

    // Add the 'disabled' class to #NPCS-GM to prevent button usage while updating.
    kLog.log(`[pushUIChanges ${timer()}] Adding Disabled Class`);
    this.npcs$.addClass("disabled");

    kLog.log(`[pushUIChanges ${timer()}] Getting Current Location Data`);
    const locData = this.getLocationSettingsData(getSetting("currentLocation"));

    kLog.log(`[pushUIChanges ${timer()}] Updating PCUIChanges`);
    this.PCUIChanges.forEach((state, actorID) => {
      locData.pcData[actorID] ??= {} as Location.PCData.SettingsData;
      Object.assign(locData.pcData[actorID], {
        state
      });
    });

    kLog.log(`[pushUIChanges ${timer()}] Updating NPCUIChanges`);
    this.NPCUIChanges.forEach(
      ({ portraitState, nameState, position }, actorID) => {
        if (portraitState === NPCPortraitState.removed) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete locData.npcData[actorID];
          return;
        }
        locData.npcData[actorID] ??= {} as Location.NPCData.SettingsData;
        Object.assign(locData.npcData[actorID], {
          portraitState,
          nameState,
          position
        });
        const actor = getActors().find((actor) => actor.id === actorID);
        if (
          actor &&
          [
            foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.INHERIT,
            foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE
          ].includes(actor.ownership["default"]) &&
          nameState === NPCNameState.base &&
          [NPCPortraitState.base, NPCPortraitState.dimmed].includes(
            portraitState
          )
        ) {
          void actor.update({
            ownership: {
              default: foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED
            }
          });
        }
      }
    );

    kLog.log(`[pushUIChanges ${timer()}] Setting Location Data`);
    await this.setLocationData(getSetting("currentLocation"), locData);

    // Clear the changes
    kLog.log(`[pushUIChanges ${timer()}] Clearing UI Changes`);
    this.clearUIChanges();

    // Remove the 'disabled' class from #NPCS-GM to allow button usage again.
    kLog.log(`[pushUIChanges ${timer()}] Removing Disabled Class`);
    this.npcs$.removeClass("disabled");
  }

  private clearUIChanges(): void {
    this.PCUIChanges.clear();
    this.NPCUIChanges.clear();
    this.refreshChangesDisplay();
  }

  private extractPCUIDataFromFullData(
    pcData?: Record<"1" | "2" | "3" | "4" | "5", Location.PCData.FullData>
  ): Record<string, PCState> {
    pcData ??= this.getLocationData(getSetting("currentLocation")).pcData;
    const pcUIData: Record<string, PCState> = {};
    Object.values(pcData).forEach((data) => {
      pcUIData[data.actorID] = data.state;
    });
    return pcUIData;
  }

  private PCUIStatus: Record<string, PCState> = {} as Record<string, PCState>;

  public async updatePCUI(
    data?:
      | Record<string, PCState>
      | Record<"1" | "2" | "3" | "4" | "5", Location.PCData.FullData>
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
        data as Record<"1" | "2" | "3" | "4" | "5", Location.PCData.FullData>
      );
    }
    data ??= this.extractPCUIDataFromFullData(this.getLocationData().pcData);
    const timelineLabels = shuffle(Object.entries(data));
    const delay = 0;
    // let isDelaying = false;

    timelineLabels.forEach(([pcID, state]: [string, PCState]) => {
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

      tl.add(masterTimeline.tweenTo(state));

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

  public getDramaticHookRewardTimeline(dramaticHookContainer$: JQuery) {
    const actorID = dramaticHookContainer$.data("pc-id") as string;
    const hookID = dramaticHookContainer$.data("hook-id") as
      | "dramatichook1"
      | "dramatichook2";
    const actor = getActorFromRef(actorID);
    if (!actor?.isPC()) return;
    const hook = actor.system.dramatichooks[hookID];
    if (!hook) return;
    const hookContent = actor.system.dramatichooks[hookID].content;
    return gsap
      .timeline({
        onComplete: () => {
          void actor.update({
            system: {
              dramatichooks: {
                [hookID]: {
                  isChecked: true
                }
              }
            }
          });
          void actor.awardXP();
          void EunosAlerts.Alert({
            type: AlertType.dramaticHookReward,
            header: "You've Gained 1 XP for Satisfying a Dramatic Hook:",
            body: `"${hookContent}"`,
            target: getOwnerOfDoc(actor)?.id ?? undefined
          });
        }
      })
      .fromTo(
        dramaticHookContainer$,
        {
          background:
            "linear-gradient(to right, rgb(150, 140, 106) 0%, rgb(0, 0, 0) 0%)"
        },
        {
          background:
            "linear-gradient(to right, rgb(150, 140, 106) 100%, rgb(0, 0, 0) 100%)",
          duration: 2,
          ease: "power2.inOut"
        }
      );
  }

  private updatePCUI_GM(pcID: string, state: PCState) {
    const pcContainer$ = EunosOverlay.instance.pcs$.find(
      `.pc-container[data-pc-id="${pcID}"]`
    );
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
  // #endregion PC PANEL ~

  // #region NPC PANEL ~

  /**
   * Create drag-and-drop workflow handlers for this Application
   * @returns {DragDrop[]}     An array of DragDrop handlers
   * @private
   */
  #createDragDropHandlers() {
    if (!this.options.dragDrop) return [];

    // Single handler for both actor dragging and NPC repositioning
    const dragHandler = new DragDrop({
      dragSelector: ".actor, .npc-drag-handle",
      dropSelector: "#NPCS-GM",
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this)
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this)
      }
    });

    return [dragHandler];
  }

  #dragDrop: DragDrop[] = [];
  get dragDrop() {
    return this.#dragDrop;
  }

  // Track bound elements to prevent duplicate bindings
  private boundElements = new Set<HTMLElement>();

  private dragPreview?: JQuery;
  private dragGuidelineX?: JQuery;
  private dragGuidelineY?: JQuery;

  _canDragStart(selector: string | null | undefined): boolean {
    return getUser().isGM;
  }

  _canDragDrop(selector: string | null | undefined): boolean {
    return getUser().isGM;
  }

  _onDragStart(event: DragEvent): void {
    event.stopPropagation();
    kLog.log("OnDragStart", event);

    const el = event.currentTarget as Maybe<HTMLElement>;
    if (!el) return;

    // Clear existing guidelines & previews
    this._clearDragElements();

    // Handle NPC repositioning
    if (el.classList.contains("npc-drag-handle")) {
      const npcContainer = el.closest(".npc-portrait") as HTMLElement;
      if (!npcContainer) return;

      const npcID = npcContainer.dataset["actorId"];
      if (!npcID) return;

      // Create preview from the actual NPC portrait
      this.dragPreview = $(npcContainer)
        .clone()
        .addClass("npc-portrait-preview")
        .css("opacity", "0.7");

      this.npcs$.append(this.dragPreview);

      event.dataTransfer?.setData(
        "text/plain",
        JSON.stringify({
          type: "reposition",
          npcID
        })
      );
      return;
    }

    // Handle actor dragging from sidebar
    const actor = getActors().find(
      (actor) => actor.id === el.dataset["documentId"]!
    );
    if (!actor) return;

    // Create guidelines
    this.dragGuidelineY = $(
      "<div class=\"npc-drag-guideline drag-guideline-y\"></div>"
    ).css({ top: `${NPC_PORTRAIT.viewportCollisions.y}px` });
    this.dragGuidelineX = $(
      "<div class=\"npc-drag-guideline drag-guideline-x\"></div>"
    ).css({ left: `${NPC_PORTRAIT.viewportCollisions.x}px` });

    this.npcs$.append(this.dragGuidelineY, this.dragGuidelineX);

    event.dataTransfer?.setData(
      "text/plain",
      JSON.stringify({ actorID: actor.id })
    );
  }

  _onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // kLog.log("OnDragOver", event);

    const stage = this.stage$[0];
    if (!stage) return;

    // Create/update preview
    if (!this.dragPreview) {
      kLog.log("Creating drag preview");
      this.dragPreview = $("<div class=\"npc-portrait-preview\"></div>");
      this.npcs$.append(this.dragPreview);
    }

    const stageRect = stage.getBoundingClientRect();
    const x = event.clientX - stageRect.left - NPC_PORTRAIT.size.width / 2;
    const y = event.clientY - stageRect.top - NPC_PORTRAIT.size.height / 2;

    this.dragPreview.css({
      width: `${NPC_PORTRAIT.size.width}px`,
      height: `${NPC_PORTRAIT.size.height}px`,
      position: "absolute",
      border: "2px dashed #fff",
      borderRadius: "50%",
      backgroundColor: "rgba(255, 255, 155, 0.8)",
      pointerEvents: "none",
      transformOrigin: "center center",
      transform: `translate3d(${x}px, ${y}px, 0) scale(0.5)`
    });
  }

  private _clearDragElements(): void {
    this.dragPreview?.remove();
    this.dragPreview = undefined;
    this.dragGuidelineY?.remove();
    this.dragGuidelineY = undefined;
    this.dragGuidelineX?.remove();
    this.dragGuidelineX = undefined;
  }

  /**
   * Clean up bound elements that are no longer in the DOM
   * This prevents memory leaks and ensures accurate tracking
   */
  private _cleanupBoundElements(): void {
    const elementsToRemove: HTMLElement[] = [];

    this.boundElements.forEach((element) => {
      // Check if element is still in the DOM
      if (!document.contains(element)) {
        elementsToRemove.push(element);
      }
    });

    elementsToRemove.forEach((element) => {
      this.boundElements.delete(element);
    });
  }

  _onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    kLog.log("onDrop", event);

    this._clearDragElements();

    const data = TextEditor.getDragEventData(event);
    if (typeof data === "number" || data instanceof Promise) return;

    const parsedData = data as unknown as {
      type?: string;
      uuid?: string;
      actorID?: string;
    };

    if (parsedData.uuid) {
      const actor = fromUuidSync(parsedData.uuid as `Actor.${string}`) as Maybe<
        EunosActor & { system: ActorDataNPC }
      >;
      if (!actor) return;
      parsedData.actorID = actor.id!;
    }

    // Handle NPC repositioning
    if (parsedData.type === "reposition" && parsedData.actorID) {
      const stage = this.stage$[0];
      if (!stage) return;

      const stageRect = stage.getBoundingClientRect();
      const x = event.clientX - stageRect.left;
      const y = event.clientY - stageRect.top;

      const npc = getActors().find((a) => a.id === parsedData.actorID);

      if (!(npc instanceof EunosActor)) return;

      // Queue the update call
      this.queueUIChanges({
        [npc.id!]: {
          position: { x, y }
        }
      });

      const npcContainer$ = this.npcs$.find(`[data-actor-id="${npc.id}"]`);
      if (!npcContainer$.length) return;

      gsap.set(npcContainer$[0]!, {
        xPercent: -50,
        yPercent: -50,
        x,
        y
      });
      return;
    }

    // Handle new actor drop
    if (parsedData.actorID) {
      const actor = getActors().find(
        (a) => a.id === parsedData.actorID
      ) as Maybe<EunosActor & { system: ActorDataNPC }>;
      if (!actor || actor.isPC()) return;

      const actorID = actor.id!;

      const npcOverlay = this.npcs$[0];
      if (!npcOverlay) return;

      const stageRect = npcOverlay.getBoundingClientRect();
      const x = event.clientX - stageRect.left;
      const y = event.clientY - stageRect.top;

      // Rest of your existing actor drop logic...
      const currentLocation = getSetting("currentLocation");
      const locationData = getSetting("locationData");
      if (!locationData?.[currentLocation]) return;

      locationData[currentLocation].npcData =
        locationData[currentLocation].npcData || {};

      let portraitState = NPCPortraitState.invisible;
      let nameState = NPCNameState.base;

      if (
        locationData[currentLocation].npcData[actorID] &&
        !actor.system.isGeneric
      ) {
        kLog.log("Removing duplicate NPC from overlay", { actorID });
        const existingNPC$ = this.npcs$.find(`[data-actor-id="${actorID}"]`);

        // Get all drag handles in the existing container before removing
        const dragHandles: HTMLElement[] = existingNPC$.find(".npc-drag-handle").toArray();

        // Remove the existing container
        existingNPC$.remove();

        // Clean up bound elements for the removed drag handles
        dragHandles.forEach(handle => {
          this.boundElements.delete(handle);
        });
        portraitState =
          locationData[currentLocation].npcData[actorID].portraitState;
        nameState = locationData[currentLocation].npcData[actorID].nameState;
      }

      void this.renderNPCPortrait(actor, { x, y });

      this.queueUIChanges({
        [actorID]: {
          position: { x, y },
          portraitState,
          nameState
        }
      });
    }
  }

  private buildNPCHiddenToDimmedTimeline(
    npcContainer$: JQuery
  ): gsap.core.Timeline {
    const tokenScale = npcContainer$.attr("data-token-scale") as Maybe<string>;
    const tokenScaleNumber = tokenScale ? parseFloat(tokenScale) : 1;
    const hiddenScale = getUser().isGM ? 1 : 0.5 * tokenScaleNumber;
    const dimmedScale = getUser().isGM ? 1 : 0.8 * tokenScaleNumber;

    const portraitContainer$ = npcContainer$.find(".npc-portrait-container");
    const portraitNameContainer$ = npcContainer$.find(
      ".npc-portrait-name-container"
    );
    const portraitShadow$ = npcContainer$.find(".npc-portrait-shadow");

    const tl = gsap.timeline({ paused: true });

    if (getSetting("inLimbo")) {
      const actorID = npcContainer$.attr("data-actor-id");
      if (!actorID) {
        kLog.error("No actorID found for NPC container", { npcContainer$ });
        return gsap.timeline();
      }
      const dreamFilter$ = npcContainer$.find(`#displace-${actorID}`);
      const turbulence$ = npcContainer$.find(`#turbulence-${actorID}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const ease: gsap.EaseFunction = CustomWiggle.create("myWiggle", {
        wiggles: 3,
        type: "easeOut"
      });
      tl.fromTo(
        npcContainer$,
        {
          autoAlpha: 0,
          filter: `brightness(1.5) sepia(2) hue-rotate(90deg) url("#dream-warp-${actorID}") blur(50px)`
        },
        {
          autoAlpha: 1,
          filter: `brightness(1.5) sepia(2) hue-rotate(90deg) url("#dream-warp-${actorID}") blur(10px)`,
          duration: 3,
          ease: "power2.out"
        },
        0
      )
        .fromTo(
          dreamFilter$,
          { attr: { scale: 0 } },
          { attr: { scale: 150 }, duration: 3, ease },
          0
        )
        .fromTo(
          npcContainer$,
          {
            scaleX: getUser().isGM ? 1 : 3,
            scaleY: getUser().isGM ? 1 : 2
          },
          { scaleX: 1, scaleY: 1, duration: 3, ease: "power2.in" },
          0
        )
        .fromTo(
          npcContainer$,
          {
            filter: `brightness(1) sepia(0) brightness(1) hue-rotate(0deg) url("#dream-warp-${actorID}") blur(0px)`
          },
          {
            filter: `brightness(0.5) sepia(2) brightness(1.5) hue-rotate(180deg) url("#dream-warp-${actorID}") blur(10px)`,
            duration: 3,
            ease
          },
          0
        )
        .fromTo(
          turbulence$,
          { attr: { baseFrequency: "0.001 0.05" } },
          {
            attr: { baseFrequency: "0.04 0.04" },
            duration: 3,
            ease: "power2.in"
          },
          0
        );
    } else {
      tl.fromTo(
        portraitContainer$,
        {
          autoAlpha: 0,
          y: "-=100",
          // skewX: -30,
          scale: hiddenScale,
          filter: "brightness(5) blur(300px)"
        },
        {
          autoAlpha: 1,
          y: 0,
          // skewX: 0,
          scale: dimmedScale,
          filter: "brightness(0.5) blur(0px)",
          duration: 0.5,
          ease: "none"
        },
        0
      )
        .fromTo(
          portraitNameContainer$,
          {
            scale: getUser().isGM ? 1 : 0.5
          },
          {
            scale: getUser().isGM ? 1 : 0.8,
            duration: 0.5,
            ease: "none"
          },
          0
        )
        .fromTo(
          portraitShadow$,
          {
            scale: hiddenScale,
            filter: "brightness(0) blur(100px)",
            autoAlpha: 0
          },
          {
            scale: dimmedScale,
            filter: "brightness(0) blur(10px)",
            autoAlpha: 0.5,
            duration: 0.25,
            ease: "none"
          },
          0.25
        );
    }

    tl.call(() => {
      npcContainer$.attr("data-portrait-state", NPCPortraitState.dimmed);
      npcContainer$.removeClass(
        "npc-portrait-invisible npc-portrait-base npc-portrait-spotlit"
      );
      npcContainer$.addClass("npc-portrait-dimmed");
    });

    return tl;
  }

  private buildNPCDimmedToBaseTimeline(
    npcContainer$: JQuery
  ): gsap.core.Timeline {
    const tokenScale = npcContainer$.attr("data-token-scale") as Maybe<string>;
    const baseScale = tokenScale ? parseFloat(tokenScale) : 1;
    const portraitContainer$ = npcContainer$.find(".npc-portrait-container");
    const portraitNameContainer$ = npcContainer$.find(
      ".npc-portrait-name-container"
    );
    const portraitShadow$ = npcContainer$.find(".npc-portrait-shadow");

    const tl = gsap
      .timeline({ paused: true })
      .to(portraitContainer$, {
        scale: baseScale,
        filter: "brightness(1) blur(0px)",
        duration: 1,
        ease: "none"
      })
      .to(
        portraitNameContainer$,
        {
          scale: 1,
          duration: 1,
          ease: "none"
        },
        0
      );

    if (!getSetting("inLimbo")) {
      tl.to(
        portraitShadow$,
        {
          scale: baseScale,
          filter: "brightness(0) blur(5px)",
          autoAlpha: 0.8,
          duration: 1,
          ease: "none"
        },
        0
      );
    }

    tl.call(() => {
      npcContainer$.attr("data-portrait-state", NPCPortraitState.base);
      npcContainer$.removeClass(
        "npc-portrait-dimmed npc-portrait-invisible npc-portrait-spotlit"
      );
      npcContainer$.addClass("npc-portrait-base");
    });

    return tl;
  }

  private buildNPCBaseToSpotlitTimeline(
    npcContainer$: JQuery
  ): gsap.core.Timeline {
    const portraitContainer$ = npcContainer$.find(".npc-portrait-container");

    return gsap
      .timeline({ paused: true })
      .to(portraitContainer$, {
        filter: "brightness(1.5) blur(0px)",
        duration: 1,
        ease: "none"
      })
      .call(() => {
        npcContainer$.attr("data-portrait-state", NPCPortraitState.spotlit);
        npcContainer$.removeClass(
          "npc-portrait-base npc-portrait-invisible npc-portrait-dimmed"
        );
        npcContainer$.addClass("npc-portrait-spotlit");
      });
  }

  private buildNPCNameHiddenToShroudedTimeline(
    npcContainer$: JQuery
  ): gsap.core.Timeline {
    const portraitNameContainer$ = npcContainer$.find(
      ".npc-portrait-name-container"
    );
    const portraitName$ = npcContainer$.find(".npc-portrait-name");
    return gsap
      .timeline({ paused: true })
      .call(() => {
        npcContainer$.attr("data-name-state", NPCNameState.invisible);
        npcContainer$.removeClass(
          "npc-portrait-name-shrouded npc-portrait-name-base"
        );
        npcContainer$.addClass("npc-portrait-name-invisible");
      })
      .fromTo(
        portraitNameContainer$,
        {
          autoAlpha: 0,
          scale: 0.5,
          filter: "blur(10px)",
          // skewX: -30,
          // x: "+=200",
          y: -10,
          xPercent: -50,
          yPercent: 0
        },
        {
          duration: 1,
          ease: "none",
          scale: 1,
          autoAlpha: 1,
          x: 0,
          y: -10,
          skewX: 0,
          xPercent: -50,
          yPercent: 0,
          filter: "blur(0px)"
        },
        0
      )
      .fromTo(
        portraitName$,
        {
          autoAlpha: 0,
          scale: 1,
          filter: "blur(10px)"
        },
        {
          autoAlpha: 1,
          ease: "none",
          duration: 0.5
        },
        0.5
      )
      .call(() => {
        npcContainer$.attr("data-name-state", NPCNameState.shrouded);
        npcContainer$.removeClass(
          "npc-portrait-name-invisible npc-portrait-name-base"
        );
        npcContainer$.addClass("npc-portrait-name-shrouded");
      });
  }

  private buildNPCNameShroudedToBaseTimeline(
    npcContainer$: JQuery
  ): gsap.core.Timeline {
    const portraitName$ = npcContainer$.find(".npc-portrait-name");

    return gsap
      .timeline({ paused: true })
      .to(portraitName$, {
        filter: "blur(0px)",
        duration: 1,
        ease: "none"
      })
      .call(() => {
        npcContainer$.attr("data-name-state", NPCNameState.base);
        npcContainer$.removeClass(
          "npc-portrait-name-shrouded npc-portrait-name-invisible"
        );
        npcContainer$.addClass("npc-portrait-name-base");
      });
  }

  private buildNPCPortraitTimeline(npcContainer$: JQuery): gsap.core.Timeline {
    kLog.log("buildNPCPortraitTimeline", { npcContainer$ });

    npcContainer$.data(
      "portrait-timeline",
      gsap
        .timeline({ paused: true })
        .addLabel(NPCPortraitState.removed)
        .addLabel(NPCPortraitState.invisible)
        .add(this.buildNPCHiddenToDimmedTimeline(npcContainer$).paused(false))
        .addLabel(NPCPortraitState.dimmed)
        .add(this.buildNPCDimmedToBaseTimeline(npcContainer$).paused(false))
        .addLabel(NPCPortraitState.base)
        .add(this.buildNPCBaseToSpotlitTimeline(npcContainer$).paused(false))
        .addLabel(NPCPortraitState.spotlit)
    );

    return npcContainer$.data("portrait-timeline") as gsap.core.Timeline;
  }

  private buildNPCNameTimeline(npcContainer$: JQuery): gsap.core.Timeline {
    npcContainer$.data(
      "name-timeline",
      gsap
        .timeline({ paused: true })
        .addLabel(NPCNameState.invisible)
        .add(
          this.buildNPCNameHiddenToShroudedTimeline(npcContainer$).paused(
            false
          )
        )
        .addLabel(NPCNameState.shrouded)
        .add(
          this.buildNPCNameShroudedToBaseTimeline(npcContainer$).paused(false)
        )
        .addLabel(NPCNameState.base)
    );

    return npcContainer$.data("name-timeline") as gsap.core.Timeline;
  }

  private buildNPCGogglesTimeline(npcContainer$: JQuery): gsap.core.Timeline {
    const actorID = npcContainer$.attr("data-actor-id") as Maybe<string>;
    if (!actorID) {
      kLog.error("No actorID found for NPC container", { npcContainer$ });
      npcContainer$.data("goggles-timeline", gsap.timeline());
      return gsap.timeline();
    }
    const actor = getActorFromRef(actorID) as EunosActor;
    if (actor.isPC()) {
      kLog.error(
        "Actor on stage is a PC: No goggles transition timeline created.",
        { actorID, actor }
      );
      npcContainer$.data("goggles-timeline", gsap.timeline());
      return gsap.timeline();
    }
    const gogglesImg = actor.getGogglesImageSrc();
    if (!gogglesImg) {
      kLog.error("No goggles image found for NPC", { actorID, actor });
      npcContainer$.data("goggles-timeline", gsap.timeline());
      return gsap.timeline();
    }

    const portraitImage$ = npcContainer$.find(".npc-portrait-image-base");
    const portraitImageGoggles$ = npcContainer$.find(
      ".npc-portrait-image-goggles"
    );

    npcContainer$.data(
      "goggles-timeline",
      gsap
        .timeline({ paused: true })
        .addLabel("noGoggles")
        .call(() => {
          npcContainer$.attr("data-goggles-state", "noGoggles");
          npcContainer$.removeClass("npc-portrait-goggles");
          kLog.log("goggles Timeline at NO GOGGLES", { npcContainer$ });
        })
        .fromTo(
          portraitImage$,
          {
            autoAlpha: 1
          },
          {
            autoAlpha: 0,
            duration: 1,
            ease: "none"
          },
          0
        )
        .fromTo(
          portraitImageGoggles$,
          {
            autoAlpha: 0
          },
          {
            autoAlpha: 1,
            duration: 1,
            ease: "none"
          },
          0
        )
        .call(() => {
          npcContainer$.attr("data-goggles-state", "goggles");
          npcContainer$.addClass("npc-portrait-goggles");
          kLog.log("goggles Timeline at GOGGLES", { npcContainer$ });
        })
        .addLabel("goggles")
    );

    return npcContainer$.data("goggles-timeline") as gsap.core.Timeline;
  }

  private buildNPCTransitionTimeline(
    npcContainer$: JQuery,
    portraitState?: NPCPortraitState,
    nameState?: NPCNameState,
    gogglesState?: "goggles" | "noGoggles",
    position?: Point
  ): gsap.core.Timeline {
    if (getUser().isGM) {
      return gsap.timeline();
    }
    const SMOKE_EFFECT_DELAY = 1.15;

    const npcID = npcContainer$.attr("data-actor-id") as string;
    const smokeEffect$ = npcContainer$.find(".npc-smoke-effect");
    const actor = getActorFromRef(npcID) as EunosActor;
    portraitState ??= npcContainer$.attr(
      "data-portrait-state"
    ) as NPCPortraitState;
    nameState ??= npcContainer$.attr("data-name-state") as NPCNameState;
    position ??= {
      x: gsap.getProperty(npcContainer$[0]!, "x") as number,
      y: gsap.getProperty(npcContainer$[0]!, "y") as number
    };
    gogglesState ??=
      this.isOutdoors && this.isLocationBright && actor.getGogglesImageSrc()
        ? "goggles"
        : "noGoggles";

    // Get timelines as JQuery data elements from npcContainer$
    const portraitTimeline = npcContainer$.data(
      "portrait-timeline"
    ) as gsap.core.Timeline;
    const nameTimeline = npcContainer$.data(
      "name-timeline"
    ) as gsap.core.Timeline;
    const gogglesTimeline = npcContainer$.data(
      "goggles-timeline"
    ) as gsap.core.Timeline;
    const currentPortraitState =
      this.getNPCStatusFromOverlay(npcContainer$).portraitState;
    const positionTimeline = gsap.to(npcContainer$, {
      xPercent: -50,
      yPercent: -50,
      x: position.x,
      y: position.y,
      duration: 1,
      ease: "power2.out",
      onComplete: () => {
        this.updateShadowSkew(npcContainer$);
      }
    });

    let onComplete: gsap.Callback;

    if (portraitState === NPCPortraitState.removed) {
      onComplete = () => {
        // Get all drag handles in this container before removing
        const dragHandles: HTMLElement[] = npcContainer$.find(".npc-drag-handle").toArray();

        // Remove the container
        npcContainer$.remove();

        // Clean up bound elements for the removed drag handles
        dragHandles.forEach(handle => {
          this.boundElements.delete(handle);
        });
      };
    } else {
      onComplete = () => {
        // Update data-attributes and classes for new NPC state
        npcContainer$.attr("data-portrait-state", portraitState);
        npcContainer$.attr("data-name-state", nameState);
        npcContainer$.attr("data-goggles-state", gogglesState);
        npcContainer$.removeClass(
          "npc-portrait-name-shrouded npc-portrait-name-invisible npc-portrait-name-base"
        );
        npcContainer$.addClass(`npc-portrait-name-${nameState}`);
        npcContainer$.removeClass(
          "npc-portrait-base npc-portrait-dimmed npc-portrait-invisible npc-portrait-spotlit"
        );
        npcContainer$.addClass(`npc-portrait-${portraitState}`);
        npcContainer$.removeClass(
          "npc-portrait-goggles npc-portrait-noGoggles"
        );
        npcContainer$.addClass(`npc-portrait-${gogglesState}`);
      };
    }

    // Create timeline of tweenTo's to update portrait, name, and goggles
    const tl = gsap.timeline({
      paused: true,
      onComplete
    });

    const timeOffset = [
      NPCPortraitState.invisible,
      NPCPortraitState.removed
    ].includes(portraitState)
      ? 0
      : 0.2;

    kLog.log(`buildNPCTransitionTimeline for ${actor.name}`, {
      portraitState,
      nameState,
      gogglesState,
      gogglesStateReasons: {
        isOutdoors: this.isOutdoors,
        isLocationBright: this.isLocationBright,
        hasGoggles: Boolean(actor.getGogglesImageSrc())
      },
      position,
      currentPortraitLabel: currentPortraitState,
      timeOffset
    });

    if (
      [NPCPortraitState.invisible, NPCPortraitState.removed].includes(
        currentPortraitState
      )
    ) {
      // Create a sub-timeline that will be controlled by the master timeline
      const subTl = gsap.timeline({ paused: true });
      // Starting from invisible/removed state
      subTl
        // First set initial position and goggles image instantly
        .add(positionTimeline.duration(0), 0)
        .add(
          gogglesTimeline.tweenTo(gogglesState, { ease: "power2.inOut" }),
          0
        );
      // Start smoke effect IF new portrait state is not invisible/removed (and not in limbo)
      if (
        portraitState !== NPCPortraitState.invisible &&
        portraitState !== NPCPortraitState.removed
      ) {
        if (!getSetting("inLimbo")) {
          subTl
            .call(
              () => {
                const videoElement = smokeEffect$[0] as HTMLVideoElement;
                videoElement.currentTime = 0; // Reset to start
                void videoElement.play();
              },
              [],
              0
            )
            // Fade in smoke
            .to(
              smokeEffect$,
              {
                autoAlpha: 1,
                duration: 0.1
              },
              0
            );
        }

        // After smoke is visible, start portrait transition
        subTl.add(
          portraitTimeline.tweenFromTo(
            NPCPortraitState.invisible,
            portraitState,
            { ease: "power2.in" }
          ),
          SMOKE_EFFECT_DELAY
        );
      }

      // Add goggles and name transitions in parallel with portrait
      subTl
        .add(
          gogglesTimeline.tweenTo(gogglesState, { ease: "power2.inOut" }),
          SMOKE_EFFECT_DELAY
        )
        .add(
          nameTimeline.tweenFromTo(NPCNameState.invisible, nameState, {
            ease: "power2.inOut"
          }),
          SMOKE_EFFECT_DELAY + timeOffset
        );

      // Create the master control timeline
      tl.to(subTl, {
        progress: 1,
        duration: subTl.duration() * (getSetting("inLimbo") ? 2 : 1),
        ease: "none"
      });

      kLog.log("buildNPCTransitionTimeline: FROM invis/removed", {
        subDuration: subTl.duration(),
        subTotalDuration: subTl.totalDuration(),
        tlDuration: tl.duration(),
        tlTotalDuration: tl.totalDuration()
      });
    } else if (
      [NPCPortraitState.invisible, NPCPortraitState.removed].includes(
        portraitState
      )
    ) {
      tl.add(
        portraitTimeline.tweenTo(portraitState, { ease: "power2.inOut" }),
        0
      );
      tl.add(
        nameTimeline.tweenTo(NPCNameState.invisible, { ease: "power2.inOut" }),
        timeOffset
      );
      tl.duration(1);
      kLog.log("buildNPCTransitionTimeline: TO invis/removed", { tl });
    } else {
      tl.add(portraitTimeline.tweenTo(portraitState, { ease: "power4.in" }), 0);
      tl.add(
        nameTimeline.tweenTo(nameState, { ease: "power2.in" }),
        timeOffset
      );
      tl.add(positionTimeline, "<");
      tl.add(gogglesTimeline.tweenTo(gogglesState, { ease: "power2.in" }), "<");
      tl.duration(1);
      kLog.log("buildNPCTransitionTimeline: GENERIC", { tl });
    }

    tl.play();

    return tl;
  }

  private async buildNPCUIUpdateTimeline(
    data: Record<
      string,
      {
        portraitState?: NPCPortraitState;
        nameState?: NPCNameState;
        position?: Point;
      }
    >
  ): Promise<{ tl: gsap.core.Timeline }> {
    const masterTl = gsap.timeline({ paused: true });

    const TIMELINE_STAGGER_AMOUNT = 2;
    const numChanges = Object.keys(data).length;
    await Promise.all(
      Object.entries(data).map(
        async ([npcID, { portraitState, nameState, position }], index) => {
          let npcContainer$ = this.npcs$.find(
            `.npc-portrait[data-actor-id="${npcID}"]`
          );
          kLog.log(`Seeking NPC container for NPC ${npcID}`, { npcContainer$ });
          if (!npcContainer$.length) {
            if (
              portraitState === NPCPortraitState.removed ||
              portraitState === NPCPortraitState.invisible
            ) {
              // If we're trying to remove/hide an NPC that doesn't exist in the DOM,
              // there's nothing to do, so return early
              kLog.log(`NPC ${npcID} not found in DOM and state is ${portraitState}, skipping`);
              return;
            }
            npcContainer$ = await this.renderNPCPortrait(
              getActorFromRef(npcID) as EunosActor,
              position
            );
          } else if (portraitState === NPCPortraitState.removed) {
            // If we found the NPC container and need to remove it, handle it directly
            kLog.log(`Removing NPC ${npcID} from client overlay`);

            // Get all drag handles in this container before removing
            const dragHandles: HTMLElement[] = npcContainer$.find(".npc-drag-handle").toArray();

            // // Remove the container
            // npcContainer$.remove();

            // Clean up bound elements for the removed drag handles
            dragHandles.forEach(handle => {
              this.boundElements.delete(handle);
            });

            // return; // Exit early since we've handled the removal
          }
          const gogglesState =
            this.isOutdoors && this.isLocationBright ? "goggles" : "noGoggles";
          if (getUser().isGM) {
            return;
          }
          masterTl.add(
            this.buildNPCTransitionTimeline(
              npcContainer$,
              portraitState,
              nameState,
              gogglesState,
              position
            ),
            (index * TIMELINE_STAGGER_AMOUNT) / numChanges
          );
        }
      )
    );

    masterTl.play();

    return { tl: masterTl };
  }

  private async renderNPCPortrait(
    actor: EunosActor,
    position?: Point
  ): Promise<JQuery> {
    const isInLimbo = getSetting("inLimbo");

    await sleep(500);

    // First check whether there's an existing portrait, and return that if there is.
    const existingNPC$ = this.npcs$.find(
      `.npc-portrait[data-actor-id="${actor.id}"]`
    );
    kLog.log(`renderNPCPortrait: existingNPC for ${actor.name} with id ${actor.id}`, {
      existingNPC: existingNPC$
    });
    if (existingNPC$.length) {
      if (!isInLimbo) {
        kLog.log(
          "renderNPCPortrait: updating shadow and returning existing NPC",
          { existingNPC: existingNPC$ }
        );
        this.updateShadowSkew(existingNPC$);
      }
      return existingNPC$;
    }

    if (!position) {
      // Attempt to retrieve it from current location
      const currentLocation = getSetting("currentLocation");
      const locationData = this.getLocationData(currentLocation);
      position = locationData?.npcData?.[actor.id!]?.position;
    }

    if (!position) {
      throw new Error("No position provided");
    }

    // Render the template
    let path: string;
    if (getUser().isGM) {
      path =
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/partials/npc-portrait-gm.hbs";
    } else if (isInLimbo) {
      path =
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/partials/npc-portrait-limbo.hbs";
    } else {
      path =
        "modules/eunos-kult-hacks/templates/apps/eunos-overlay/partials/npc-portrait.hbs";
    }
    const html = await renderTemplate(path, {
      actor,
      portraitState: NPCPortraitState.invisible,
      nameState: NPCNameState.invisible
    });

    // Create jQuery element but don't append yet
    const npcContainer$ = $(html);
    const element = npcContainer$[0] as HTMLElement;

    await gsap.set(element, {
      opacity: 0
    });

    // Now append the element
    npcContainer$.appendTo(this.npcs$);

    await gsap.set(element, {
      xPercent: -50,
      yPercent: -50,
      x: position.x,
      y: position.y
    });

    // Use the dedicated method instead of direct gsap.set
    if (!isInLimbo) {
      this.updateShadowSkew(npcContainer$);
    }

    // Build timelines for the new NPC
    this.buildNPCPortraitTimeline(npcContainer$);
    this.buildNPCNameTimeline(npcContainer$);
    this.buildNPCGogglesTimeline(npcContainer$);

    void gsap.set(element, {
      opacity: 1
    });

    return npcContainer$;
  }

  getShadowSkewX(element: HTMLElement) {
    const xPos = gsap.getProperty(element, "x") as number;
    const viewportWidth = NPC_PORTRAIT.viewportCollisions.x;
    const normalizedPos = (xPos / viewportWidth) * 2 - 1; // -1 to 1
    return -normalizedPos * 40; // -20 to 20 degrees
  }

  private updateShadowSkew(npcContainer$: JQuery) {
    if (!npcContainer$[0]) {
      return;
    }
    const element = npcContainer$.find(".npc-portrait-shadow")[0];
    if (!element) {
      return;
    }
    const skewX = this.getShadowSkewX(npcContainer$[0]);
    gsap.set(element, {
      skewX
    });
  }

  private initializeDramaticHookHoldTriggers(): void {
    if (!getUser().isGM) {
      return;
    }
    $(document).on("mousedown", ".dramatic-hook-container", (event) => {
      const $hook = $(event.currentTarget) as JQuery;
      let tl = $hook.data("timeline") as Maybe<gsap.core.Timeline>;

      if (!tl) {
        // Create timeline if it doesn't exist
        tl = this.getDramaticHookRewardTimeline($hook);
        if (!tl) return;
        tl.pause();
        $hook.data("timeline", tl);
      }

      // Continue playing from current position
      tl.timeScale(1).play();
    });

    $(document).on(
      "mouseup mouseleave",
      ".dramatic-hook-container",
      (event) => {
        const $hook = $(event.currentTarget);
        const tl = $hook.data("timeline") as Maybe<gsap.core.Timeline>;

        if (tl) {
          // Reverse the timeline if it hasn't completed
          if (tl.progress() < 1) {
            tl.timeScale(3).reverse();
          }
        }
      }
    );
  }

  private getNPCStatusFromOverlay(npcContainer$: JQuery): {
    portraitState: NPCPortraitState;
    nameState: NPCNameState;
    position: Point;
  } {
    if (!npcContainer$?.length) {
      return {
        portraitState: NPCPortraitState.removed,
        nameState: NPCNameState.base,
        position: { x: 0, y: 0 }
      };
    }
    return {
      portraitState: npcContainer$.attr(
        "data-portrait-state"
      ) as NPCPortraitState,
      nameState: npcContainer$.attr("data-name-state") as NPCNameState,
      position: {
        x: gsap.getProperty(npcContainer$[0]!, "x") as number,
        y: gsap.getProperty(npcContainer$[0]!, "y") as number
      }
    };
  }

  private getNPCDataFromOverlay(
    isVisibleOnly = false
  ): Record<string, NPCs.FullData> {
    const npcContainers$ = this.npcs$.children();
    const npcData: Record<string, NPCs.FullData> = {};
    npcContainers$.each((i, el) => {
      const npcID = $(el).attr("data-actor-id") as Maybe<string>;
      if (!npcID) {
        kLog.log("Removing NPC from overlay: no actorID", { el });
        $(el).remove();
        return;
      }
      const npcStatus = this.getNPCStatusFromOverlay($(el));
      if (
        isVisibleOnly &&
        [NPCPortraitState.removed, NPCPortraitState.invisible].includes(
          npcStatus.portraitState
        )
      ) {
        return;
      }
      npcData[npcID] = {
        ...npcStatus,
        actor: getActorFromRef(npcID) as EunosActor & { system: ActorDataNPC },
        actorID: npcID
      };
    });
    return npcData;
  }

  public async refreshNPCUI_Hide(
    locName: string = getSetting("currentLocation")
  ) {
    // Get ALL NPCs data from overlay (including invisible ones)
    const allNPCs = this.getNPCDataFromOverlay(false);
    // Get actual npc data from settings
    const { npcData } = this.getLocationData(locName);
    const locationNPCData = this.getLocationNPCData(npcData);
    // Get NPCs that are in the overlay but absent OR invisible/removed in the settings
    // Because all of these NPCs will not be visible to players, we can ignore name and goggles states
    const NPCsToHide = Object.fromEntries(
      Object.keys(allNPCs)
        .filter((npcID) => {
          return (
            !locationNPCData[npcID] ||
            [NPCPortraitState.removed, NPCPortraitState.invisible].includes(
              locationNPCData[npcID].portraitState
            )
          );
        })
        .map((npcID) => {
          // Set the portrait state to "invisible" if invisible in the settings, "removed" otherwise
          const npcData = allNPCs[npcID]!;
          npcData.portraitState =
            locationNPCData[npcID]?.portraitState === NPCPortraitState.invisible
              ? NPCPortraitState.invisible
              : NPCPortraitState.removed;
          return [npcID, npcData];
        })
    );

    if (getUser().isGM) {
      void this.updateNPCUI_GM();
      return { tl: gsap.timeline() };
    }

    // Update the UI for the hidden NPCs
    const { tl } = await this.buildNPCUIUpdateTimeline(NPCsToHide);
    // tl.play();
    return { tl };
  }

  public async refreshNPCUI_Show(
    locName: string = getSetting("currentLocation")
  ) {
    // The refreshNPCUI_Hide method will have already hidden all NPCs on the overlay that are not in settings
    // so we can simplify this method by just showing the NPCs that are in settings
    const { npcData } = this.getLocationData(locName);
    const locationNPCData = this.getLocationNPCData(npcData);
    const NPCsToUpdate = Object.fromEntries(
      Object.keys(locationNPCData)
        .filter(
          (npcID) =>
            ![NPCPortraitState.removed, NPCPortraitState.invisible].includes(
              locationNPCData[npcID]?.portraitState
            )
        )
        .map((npcID) => {
          const npcData = locationNPCData[npcID]!;
          if (getUser().isGM) {
            void this.updateNPCUI_GM(npcID, npcData);
          }
          return [npcID, npcData];
        })
    );
    if (getUser().isGM) {
      return { tl: gsap.timeline() };
    }
    const { tl } = await this.buildNPCUIUpdateTimeline(NPCsToUpdate);
    // tl.play();
    return { tl };
  }

  public async refreshNPCUI_All() {
    const timelines = (
      await Promise.all([this.refreshNPCUI_Hide(), this.refreshNPCUI_Show()])
    ).map(({ tl }) => tl) as [gsap.core.Timeline, gsap.core.Timeline];
    timelines[1].delay(0.5);
    return timelines;
  }

  public async spotlightNPC(npcID: string) {
    // Get NPC overlay data
    const npcData = this.getNPCDataFromOverlay(true)[npcID];
    if (!npcData) {
      return;
    }
    const npcContainer$ = this.npcs$.find(
      `.npc-portrait[data-actor-id="${npcID}"]`
    );
    // Get current portrait state, and store it as a JQuery data variable on npcContainer$, so unspotlight can return to it
    const currentPortraitState = npcContainer$.attr(
      "data-portrait-state"
    ) as NPCPortraitState;
    npcContainer$.data("currentPortraitState", currentPortraitState);
    npcData.portraitState = NPCPortraitState.spotlit;
    const tl = this.buildNPCTransitionTimeline(
      npcContainer$,
      NPCPortraitState.spotlit
    );
    tl.play();
    if (getUser().isGM) {
      void this.updateNPCUI_GM(npcID, npcData);
    }
  }

  public async unspotlightNPC(npcID: string) {
    // Get NPC overlay data
    const npcData = this.getNPCDataFromOverlay(true)[npcID];
    if (!npcData) {
      return;
    }
    const npcContainer$ = this.npcs$.find(
      `.npc-portrait[data-actor-id="${npcID}"]`
    );
    const currentPortraitState =
      (npcContainer$.data("currentPortraitState") as Maybe<NPCPortraitState>) ??
      NPCPortraitState.base;
    npcData.portraitState = currentPortraitState;
    const tl = this.buildNPCTransitionTimeline(
      npcContainer$,
      currentPortraitState
    );
    tl.play();
    if (getUser().isGM) {
      void this.updateNPCUI_GM(npcID, npcData);
    }
  }

  public async refreshUI(diffData: DeepPartial<Location.SettingsData>) {
    const { currentImage, pcData, npcData, audioDataIndoors } = diffData;

    kLog.log("refreshUI", diffData);

    if (currentImage) {
      void this.refreshLocationImage(currentImage);
    }

    if (pcData) {
      void this.updatePCUI();
    }

    if (npcData) {
      void this.refreshNPCUI_All();
    }

    // if (audioDataIndoors) {
    //   void EunosMedia.SyncPlayingSounds();
    // }
  }

  /**
   * Updates the UI for all NPCs when called without parameters,
   * or for a specific NPC when called with an ID and data
   */
  private async updateNPCUI_GM(): Promise<void>;
  private async updateNPCUI_GM(
    npcID: string,
    data: {
      portraitState?: NPCPortraitState;
      nameState?: NPCNameState;
      position?: Point;
    },
  ): Promise<void>;
  private async updateNPCUI_GM(
    npcID?: string,
    data?: {
      portraitState?: NPCPortraitState;
      nameState?: NPCNameState;
      position?: Point;
    }
  ): Promise<void> {
    // If no NPC ID is given, recursively call this function for each NPC in the overlay and in the settings data
    if (!npcID) {
      // Retrieve the current settings data
      const currentLocation = getSetting("currentLocation");
      const currentLocationData = this.getLocationData(currentLocation);

      // Identify NPCs in the GM overlay that are not in the settings data.
      const npcContainers$ = this.npcs$.children();
      npcContainers$.each((i, el) => {
        const npcID = $(el).attr("data-actor-id") as Maybe<string>;
        if (npcID && !currentLocationData.npcData[npcID]) {
          void this.updateNPCUI_GM(npcID, {
            portraitState: NPCPortraitState.removed
          });
        }
      });

      // Now update all NPCs in setting data
      const npcData = this.getLocationNPCData();
      for (const npcID in npcData) {
        void this.updateNPCUI_GM(
          npcID,
          npcData[npcID] as {
            portraitState?: NPCPortraitState;
            nameState?: NPCNameState;
            position?: Point;
          }
        );
      }
      return;
    }

    if (npcID && data) {
      let npcContainer$ = EunosOverlay.instance.npcs$.find(
        `.npc-portrait[data-actor-id="${npcID}"]`
      );
      kLog.log("Updating NPC UI (GM)", { npcID, data, npcContainer$ });
      if (
        !npcContainer$.length &&
        data.portraitState !== NPCPortraitState.removed
      ) {
        kLog.log(`Rendering NPC portrait for ${getActorFromRef(npcID)?.name}`, {
          npcID,
          data
        });
        npcContainer$ = await this.renderNPCPortrait(
          getActorFromRef(npcID) as EunosActor,
          data.position
        );
      }
      let { portraitState, nameState, position } = data;
      // If no state, determine from class name of npcContainer
      portraitState ??=
        this.getNPCStatusFromOverlay(npcContainer$).portraitState;
      nameState ??= this.getNPCStatusFromOverlay(npcContainer$).nameState;

      const gogglesState =
        this.isOutdoors &&
        this.isLocationBright &&
        getActorFromRef(npcID)!.getGogglesImageSrc()
          ? "goggles"
          : "noGoggles";

      kLog.log(
        "Updating NPC UI (GM): portraitState, nameState, gogglesState from getNPCStatus",
        { portraitState, nameState, gogglesState }
      );

      if (position) {
        gsap.set(npcContainer$, {
          xPercent: -50,
          yPercent: -50,
          x: position.x,
          y: position.y,
          scale: 1,
          zIndex: position.y
        });
      }

      this.updateNPCPortraitState(npcContainer$, portraitState);
      this.updateNPCNameState(npcContainer$, nameState);
      this.updateNPCGogglesState(npcContainer$, gogglesState);
    }
  }

  private updateNPCPortraitState(
    npcContainer$: JQuery,
    portraitState: NPCPortraitState
  ) {
    npcContainer$.attr("data-portrait-state", portraitState);
    // Get all drag handles in this container before removing
    const dragHandles: HTMLElement[] = npcContainer$.find(".npc-drag-handle").toArray();
    switch (portraitState) {
      case NPCPortraitState.removed:
        kLog.log(
          "Removing NPC from overlay (updateNPCPortraitState): state === removed",
          { npcContainer$ }
        );

        // Remove the container
        npcContainer$.remove();

        // Clean up bound elements for the removed drag handles
        dragHandles.forEach(handle => {
          this.boundElements.delete(handle);
        });

        break;
      case NPCPortraitState.invisible:
        npcContainer$
          .removeClass(
            "npc-portrait-base npc-portrait-spotlit npc-portrait-dimmed"
          )
          .addClass("npc-portrait-invisible");
        break;

      case NPCPortraitState.dimmed:
        npcContainer$
          .removeClass(
            "npc-portrait-base npc-portrait-spotlit npc-portrait-invisible"
          )
          .addClass("npc-portrait-dimmed");
        break;

      case NPCPortraitState.spotlit:
        npcContainer$
          .removeClass(
            "npc-portrait-base npc-portrait-dimmed npc-portrait-invisible"
          )
          .addClass("npc-portrait-spotlit");
        break;

      case NPCPortraitState.base:
      default:
        npcContainer$
          .removeClass(
            "npc-portrait-spotlit npc-portrait-dimmed npc-portrait-invisible"
          )
          .addClass("npc-portrait-base");
        break;
    }
  }

  private updateNPCNameState(npcContainer$: JQuery, nameState: NPCNameState) {
    npcContainer$.attr("data-name-state", nameState);
    switch (nameState) {
      case NPCNameState.invisible:
        npcContainer$
          .removeClass("npc-portrait-name-base npc-portrait-name-shrouded")
          .addClass("npc-portrait-name-invisible");
        break;

      case NPCNameState.shrouded:
        npcContainer$
          .removeClass("npc-portrait-name-base npc-portrait-name-invisible")
          .addClass("npc-portrait-name-shrouded");
        break;
      case NPCNameState.base:
      default:
        npcContainer$
          .removeClass("npc-portrait-name-invisible npc-portrait-name-shrouded")
          .addClass("npc-portrait-name-base");
        break;
    }
  }

  private updateNPCGogglesState(
    npcContainer$: JQuery,
    gogglesState: "goggles" | "noGoggles"
  ) {
    const gogglesImg$ = npcContainer$.find(".npc-portrait-image-goggles");
    const noGogglesImg$ = npcContainer$.find(".npc-portrait-image-base");
    npcContainer$.attr("data-goggles-state", gogglesState);
    switch (gogglesState) {
      case "goggles":
        npcContainer$.addClass("npc-portrait-goggles");
        gogglesImg$.css("opacity", 1);
        noGogglesImg$.css("opacity", 0);
        break;
      case "noGoggles":
        npcContainer$.removeClass("npc-portrait-goggles");
        gogglesImg$.css("opacity", 0);
        noGogglesImg$.css("opacity", 1);
        break;
    }
  }
  // #endregion NPC PANEL ~

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
  get isLocationBright(): boolean {
    return this.getLocationData().isBright;
  }
  get isOutdoors(): boolean {
    return !this.getLocationData().isIndoors || getSetting("isOutdoors");
  }

  // #region Assembling Location Data ~
  private getLocationDefaultStaticSettingsData(
    location: string
  ): Location.StaticSettingsData {
    if (!(location in LOCATIONS)) {
      return {
        name: location,
        key: camelCase(location),
        images: {},
        imageMode: LocationImageModes.UpperRight,
        description: "",
        mapTransforms: [],
        audioDataIndoors: {},
        isBright: true,
        isIndoors: false
      };
    }
    return LOCATIONS[location]!;
  }
  private getLocationDefaultDynamicSettingsData(): Location.DynamicSettingsData {
    return {
      currentImage: null,
      pcData: Object.fromEntries(
        this.getDefaultLocationPCData().map((data) => [data.actorID, data])
      ),
      npcData: {} as Record<string, Location.NPCData.SettingsData>
    };
  }
  private getLocationDefaultSettingsData(
    location: string
  ): Location.SettingsData {
    return {
      ...this.getLocationDefaultStaticSettingsData(location),
      ...this.getLocationDefaultDynamicSettingsData()
    };
  }
  private getLocationSettingsData(location: string): Location.SettingsData {
    const finalSettingData = {
      ...this.getLocationDefaultDynamicSettingsData(),
      ...getSettings().get("eunos-kult-hacks", "locationData")[location],
      ...this.getLocationDefaultStaticSettingsData(location)
    };

    return finalSettingData;
  }
  private getLocationPCData(
    pcLocationData?: Record<string, Location.PCData.SettingsData>
  ): Record<"1" | "2" | "3" | "4" | "5", Location.PCData.FullData> {
    const pcGlobalData = this.getPCsGlobalData();
    pcLocationData ??= this.getLocationData(
      getSetting("currentLocation")
    ).pcData;
    const pcFullData: Record<
      "1" | "2" | "3" | "4" | "5",
      Location.PCData.FullData
    > = {} as Record<"1" | "2" | "3" | "4" | "5", Location.PCData.FullData>;
    (["1", "2", "3", "4", "5"] as const).forEach((slot) => {
      const globalData = pcGlobalData[slot];
      const locData = Object.values(pcLocationData).find(
        (data) => data.actorID === globalData.actorID
      );
      if (!locData) {
        throw new Error(`PC ${globalData.actorID} not found in location data`);
      }
      pcFullData[slot] = {
        ...locData,
        ...globalData
      };
    });
    return pcFullData;
  }
  private getLocationNPCData(
    npcLocationData?: Record<string, Location.NPCData.SettingsData>
  ): Record<string, Location.NPCData.FullData> {
    npcLocationData ??= this.getLocationData(
      getSetting("currentLocation")
    ).npcData;
    const npcFullData: Record<string, Location.NPCData.FullData> = {};
    Object.entries(npcLocationData).forEach(([id, data]) => {
      const actor = getActors().find((a) => a.id === id);
      if (!actor) return;
      npcFullData[id] = {
        ...data,
        actor: actor as EunosActor & { system: ActorDataNPC }
      };
    });
    return npcFullData;
  }
  private getLocationAudioData(
    audioDataIndoors: Record<string, Partial<EunosMediaData>>
  ): Record<string, EunosMedia<EunosMediaTypes.audio>> {
    const audioFullData: Record<string, EunosMedia<EunosMediaTypes.audio>> = {};

    Object.entries(audioDataIndoors).forEach(([id, data]) => {
      if (EunosMedia.Sounds.has(id)) {
        audioFullData[id] = EunosMedia.Sounds.get(id)!;
        return;
      }
      const thisAudioData = {
        type: EunosMediaTypes.audio,
        ...data
      } as EunosMediaData & { type: EunosMediaTypes.audio };
      audioFullData[id] = new EunosMedia(id, thisAudioData);
    });
    return audioFullData;
  }
  private deriveLocationFullData(
    settingsData: Location.SettingsData
  ): Location.FullData {
    const {
      key,
      pcData,
      npcData,
      audioDataIndoors,
      audioDataOutdoors,
      audioDataByImage
    } = settingsData;

    const pcFullData = this.getLocationPCData(pcData);
    const npcFullData = this.getLocationNPCData(npcData);

    const fullData: Location.FullData = {
      ...settingsData,
      pcData: pcFullData,
      npcData: npcFullData,
      audioDataIndoors: undefined,
      audioDataOutdoors: undefined,
      audioDataByImage: undefined
    };

    if (key in LOCATIONS && LOCATIONS[key]) {
      const locationData = LOCATIONS[key];

      // Override audio data in settings with LOCATIONS data if available
      if (locationData.audioDataIndoors) {
        fullData.audioDataIndoors = this.getLocationAudioData(
          locationData.audioDataIndoors
        );
      }
      if (locationData.audioDataOutdoors) {
        fullData.audioDataOutdoors = this.getLocationAudioData(
          locationData.audioDataOutdoors
        );
      }
      if (locationData.audioDataByImage) {
        fullData.audioDataByImage = {};
        for (const [imgKey, audioData] of Object.entries(
          locationData.audioDataByImage
        )) {
          fullData.audioDataByImage[imgKey] =
            this.getLocationAudioData(audioData);
        }
      }
    } else {
      if (audioDataIndoors) {
        const audioIndoorsFullData =
          this.getLocationAudioData(audioDataIndoors);
        fullData.audioDataIndoors = audioIndoorsFullData;
      }
      if (audioDataOutdoors) {
        const audioOutdoorsFullData =
          this.getLocationAudioData(audioDataOutdoors);
        fullData.audioDataOutdoors = audioOutdoorsFullData;
      }
      if (audioDataByImage) {
        fullData.audioDataByImage = {};
        for (const [imgKey, audioData] of Object.entries(audioDataByImage)) {
          fullData.audioDataByImage[imgKey] =
            this.getLocationAudioData(audioData);
        }
      }
    }

    return fullData;
  }
  // #endregion Assembling Location Data ~

  // #region Getting & Setting Location Data & Location PC Data ~
  public chooseLocation() {
    const currentLocation = getSetting("currentLocation");

    // Sort the keys of LOCATIONS by the region property, and then the name, DISCOUNTING the word "the" if it appears at the start
    const sortedLocations = Object.keys(LOCATIONS).sort((a, b) => {
      const regionA = LOCATIONS[a]!.region ?? "";
      const regionB = LOCATIONS[b]!.region ?? "";
      if (regionA === regionB) {
        return a
          .replace(/^the\b\s*/i, "")
          .localeCompare(b.replace(/^the\b\s*/i, ""));
      }
      return regionA.localeCompare(regionB);
    });

    new Dialog({
      title: "Go To Location",
      content: `
    <form>
      <div class="form-group">
        <div class="location-grid">
          ${sortedLocations
            .map(
              (loc) =>
                `<div class="location-button ${loc === currentLocation ? "selected" : ""} location-region-${LOCATIONS[loc]!.region}"
                  data-location="${loc}">${LOCATIONS[loc]!.name}</div>`
            )
            .join("")}
        </div>
      </div>
      <div class="reset-location-container">
          <div class="reset-location-button reset-location">RESET</div>
          <div class="reset-location-button reset-all">RESET ALL</div>
      </div>
    </form>
  `,
      buttons: {
        cancel: {
          icon: "<i class=\"fas fa-times\"></i>",
          label: "Cancel"
        }
      },
      render: (html) => {
        const html$ = $(html);
        // Add click handlers for the location buttons
        html$.find(".location-button").on("click", (event) => {
          const location = event.currentTarget.dataset["location"]!;
          void (async function() {
            if (EunosCarousel.instance.isRevealed && location !== "") {
              await EunosCarousel.instance.hideStandingStones();
            }
            if (getSetting("inLimbo") && location !== "limbo") {
              await EunosOverlay.instance.gmLeaveLimbo();
            }
            await EunosOverlay.instance.setLocation(location);
            if (location === "limbo") {
              await EunosOverlay.instance.gmEnterLimbo();
            }
          })();
          // Close the dialog after selection
          html$.closest(".dialog").find(".close").trigger("click");
        });
        html$.find(".reset-location").on("click", () => {
          void EunosOverlay.instance.resetLocationData();
        });
        html$.find(".reset-all").on("click", () => {
          void EunosOverlay.instance.resetAllLocationData();
        });
      },
      default: "cancel"
    }).render(true);
  }
  public getLocationData(location?: string): Location.FullData {
    location ??= getSetting("currentLocation");
    const settingData = this.getLocationSettingsData(location);
    return this.deriveLocationFullData(settingData);
  }

  public getLocationDataForPC(
    location: string,
    pcRef: number | string | EunosActor
  ): Location.PCData.FullData {
    if (["1", "2", "3", "4", "5"].includes(pcRef as string)) {
      return this.getLocationPCData(this.getLocationData(location).pcData)[
        pcRef as "1" | "2" | "3" | "4" | "5"
      ];
    }
    const actor = getActorFromRef(pcRef as string);
    if (!actor) {
      throw new Error(
        `Actor ${pcRef instanceof Actor ? (pcRef.name ?? "") : String(pcRef)} not found`
      );
    }
    return Object.values(
      this.getLocationPCData(this.getLocationData(location).pcData)
    ).find((data) => data.actorID === actor.id)!;
  }

  private async setLocationData(
    location: string,
    data: Partial<Location.SettingsData>
  ): Promise<void> {
    // Check and fix if we're getting FullData
    if ("pcData" in data && data.pcData) {
      const pcDataKeys = Object.keys(data.pcData);
      if (pcDataKeys.some((key) => /^[1-5]$/.test(key))) {
        getNotifier().warn(
          "Detected attempt to store FullData instead of SettingsData. Converting to proper format."
        );

        // Convert slot-indexed FullData to ID-indexed SettingsData
        const fullPCData = data.pcData as Record<
          "1" | "2" | "3" | "4" | "5",
          Location.PCData.FullData
        >;
        const settingsPCData: Record<string, Location.PCData.SettingsData> = {};

        Object.values(fullPCData).forEach((pcData) => {
          if (pcData) {
            settingsPCData[pcData.actorID] = {
              actorID: pcData.actorID,
              ownerID: pcData.ownerID,
              state: pcData.state
            };
          }
        });

        data = {
          ...data,
          pcData: settingsPCData
        };
      }
    }

    const locationData = getSetting("locationData");
    const locationDataEntry = Object.assign(
      {},
      this.getLocationSettingsData(location),
      data
    );
    locationData[location] = locationDataEntry;
    await setSetting("locationData", locationData);
  }

  public async resetLocationData(location?: string) {
    location ??= getSetting("currentLocation");
    await this.setLocationData(
      location,
      this.getLocationDefaultSettingsData(location)
    );
  }

  public async resetAllLocationData() {
    const newLocData: Record<string, Location.SettingsData> = {};
    Object.keys(LOCATIONS).forEach((location) => {
      newLocData[location] = this.getLocationDefaultSettingsData(location);
    });
    await setSetting("locationData", newLocData);
    getNotifier().info("All location data reset");
  }

  // #endregion Getting & Setting Location Data & Location PC Data ~

  public getVolumeOverride(
    mediaName: string,
    location?: string,
    imgKey?: string | null
  ): Maybe<number> {
    const volumeOverrideData = foundry.utils.flattenObject(
      getSetting("volumeOverrides")
    ) as Record<string, number>;
    const dotKeyImg = [mediaName, location, imgKey].filter(Boolean).join(".");
    const dotKeyLoc = [mediaName, location].filter(Boolean).join(".");
    const dotKeyMedia = [mediaName].filter(Boolean).join(".");
    const volumeOverride =
      volumeOverrideData[dotKeyImg] ??
      volumeOverrideData[dotKeyLoc] ??
      volumeOverrideData[dotKeyMedia];

    // Validate volume override to prevent corruption
    if (volumeOverride !== undefined) {
      const media = EunosMedia.GetMedia(mediaName);
      const defaultVolume = media?.defaultVolume ?? SESSION.MIN_AUDIO_VOLUME;
      const minVolume = Math.max(SESSION.MIN_AUDIO_VOLUME, defaultVolume);

      if (volumeOverride < minVolume) {
        kLog.error(
          `Volume corruption detected in volumeOverrides for "${mediaName}": ` +
          `override value ${volumeOverride} is below minimum ${minVolume}. Returning minimum instead.`
        );
        return minVolume;
      }
    }

    return volumeOverride;
  }

  public async setVolumeOverride(
    mediaName: string,
    volumeOverride: number
  ): Promise<void> {
    let dotKey: Maybe<string> = undefined;
    // Need to determine whether this is a location-specific override, an image-specific override, or a media-specific override
    const location = getSetting("currentLocation");
    const locData = this.getLocationData(location);
    const { audioDataOutdoors, audioDataIndoors, audioDataByImage } = locData;
    if (audioDataByImage) {
      const currentImage = locData.currentImage;
      if (currentImage) {
        const imgData = audioDataByImage[currentImage];
        const imgSpecificMedia = imgData?.[mediaName];
        if (imgSpecificMedia) {
          dotKey = [mediaName, location, currentImage].join(".");
        }
      }
    }
    if (!dotKey) {
      const audioData =
        this.isIndoors && audioDataIndoors
          ? audioDataIndoors
          : !this.isIndoors && audioDataOutdoors
            ? audioDataOutdoors
            : (audioDataIndoors ?? audioDataOutdoors);
      if (audioData) {
        const locSpecificMedia = audioData[mediaName];
        if (locSpecificMedia) {
          dotKey = [mediaName, location].join(".");
        }
      }
    }
    if (!dotKey) {
      dotKey = mediaName;
    }

    const overrideUpdateData = foundry.utils.expandObject({
      [dotKey]: volumeOverride
    });
    const fullOverrideData = foundry.utils.mergeObject(
      getSetting("volumeOverrides"),
      overrideUpdateData
    );
    await setSetting("volumeOverrides", fullOverrideData);
  }

  // #region Updating Weather Audio ~
  public async updateWeatherAudio(
    isIndoors: Maybe<true | false> = !this.isOutdoors
  ) {
    const weatherAudio = getSetting("weatherAudio");
    const locationAudio = Object.keys(
      this.getLocationAudioData(this.getLocationData().audioDataOutdoors ?? {})
    );
    const currentWeatherAudio = EunosMedia.GetMediaByCategory(
      EunosMediaCategories.Weather
    ).filter((media) => media.playing && !locationAudio.includes(media.name));

    // Identify all tracks that are no longer present in the value, and stop them
    currentWeatherAudio.forEach((media) => {
      if (!weatherAudio[media.name]) {
        void EunosMedia.Kill(media.name, 3);
      }
    });
    // Identify all tracks that are present in the value, and start them. Reduce the volume to 10% if currently indoors.
    Object.entries(weatherAudio).forEach(([mediaName, volume]) => {
      const media = EunosMedia.GetMedia(mediaName);
      // Check volumeOverrides setting to see whether this media name has a volume override unassociated with a location or location image
      volume = this.getVolumeOverride(mediaName) ?? volume;
      if (media) {
        void EunosMedia.Play(mediaName, { volume });
        if (isIndoors) {
          // If we're indoors, dampen the audio
          media.dampenAudio();
        } else {
          media.unDampenAudio();
        }
      }
    });
  }
  // #endregion Updating Weather Audio ~

  // #region Updating Indoors/Outdoors State ~
  public async setIndoors(isIndoors: boolean) {
    const locData = this.getLocationData();
    if (!locData.isIndoors) {
      kLog.error("Cannot set indoors when location is not indoors");
      return;
    }
    kLog.log(
      `Setting isOutdoors to ${!isIndoors} because we're calling setIndoors.`
    );
    await setSetting("isOutdoors", !isIndoors);
  }

  private buildGoIndoorsTimeline(key = this.getLocationData().key) {
    const underLayer$ = this.stage3D$.find(".under-layer");
    const backgroundLayer$ = this.stage3D$.find(".background-layer");

    const background = get(underLayer$, "background");
    const rotationX = get(underLayer$, "rotationX");
    const rotationY = get(underLayer$, "rotationY");
    const z = get(underLayer$, "z");

    const { currentImage, audioDataIndoors, audioDataOutdoors } =
      this.getLocationData(key);

    const goIndoorsTimeline = gsap.timeline({ paused: true }).call(
      () => {
        void this.updateWeatherAudio();
      },
      [],
      0
    );
    const goOutdoorsTimeline = gsap.timeline({ paused: true }).call(
      () => {
        void this.updateWeatherAudio();
      },
      [],
      0
    );

    if (audioDataOutdoors) {
      goIndoorsTimeline.call(
        () => {
          Object.values(audioDataOutdoors).forEach((media) => {
            if (audioDataIndoors?.[media.name]) {
              media.unDampenAudio();
            } else {
              media.dampenAudio();
            }
          });
        },
        [],
        0
      );
      goOutdoorsTimeline.call(
        () => {
          Object.values(audioDataOutdoors).forEach((media) => {
            media.unDampenAudio();
          });
        },
        [],
        0
      );
    }

    if (audioDataIndoors) {
      goIndoorsTimeline.call(
        () => {
          Object.values(audioDataIndoors).forEach((media) => {
            const volume =
              this.getVolumeOverride(
                media.name,
                key,
                currentImage ?? undefined
              ) ?? media.volume;
            void EunosMedia.Play(media.name, { volume, fadeInDuration: 2 });
          });
        },
        [],
        0
      );
      goOutdoorsTimeline.call(
        () => {
          Object.values(audioDataIndoors).forEach((media) => {
            void EunosMedia.Kill(media.name, 1);
          });
        },
        [],
        0
      );
    }

    goIndoorsTimeline
      .add(this.stageWaverTimeline.tweenTo(0, { duration: 0.15 }), 0)
      .call(() => {
        this.#stageWaverTimeline?.pause();
      })
      .fromTo(
        underLayer$,
        {
          background
        },
        {
          background:
            "radial-gradient(circle at 50% 50%, transparent 2%, rgb(123 46 0 / 75%) 4%, rgb(0 0 0) 6%)",
          duration: 1,
          ease: "power2.inOut"
        },
        0
      )
      .fromTo(
        [underLayer$[0], backgroundLayer$[0]],
        {
          rotationX,
          rotationY,
          z
        },
        {
          rotationX: 0,
          rotationY: 0,
          z: 500,
          duration: 1,
          ease: "power2.inOut"
        },
        0
      )
      .call(
        () => {
          void this.refreshNPCUI_Show().then(({ tl }) => {
            tl.play();
          });
        },
        [],
        0
      )
      .call(
        () => {
          this.isIndoors = true;
        },
        [],
        3
      )
      .addLabel("goIndoorsComplete");

    goOutdoorsTimeline
      .call(
        () => {
          void this.updateWeatherAudio;
        },
        [],
        0
      )
      .fromTo(
        underLayer$,
        {
          background:
            "radial-gradient(circle at 50% 50%, transparent 2%, rgb(123 46 0 / 75%) 4%, rgb(0 0 0) 6%)"
        },
        {
          background,
          duration: 1,
          ease: "power2.inOut"
        },
        0
      )
      .fromTo(
        [underLayer$[0], backgroundLayer$[0]],
        {
          rotationX: 0,
          rotationY: 0,
          z: 500
        },
        {
          rotationX,
          rotationY,
          z,
          duration: 1,
          ease: "power2.inOut"
        },
        0
      )
      .call(() => {
        this.stageWaverTimeline?.resume();
      });

    goOutdoorsTimeline
      .call(
        () => {
          void this.refreshNPCUI_Show().then(({ tl }) => {
            tl.play();
          });
        },
        [],
        0
      )
      .call(
        () => {
          this.isIndoors = false;
        },
        [],
        3
      )
      .addLabel("goOutdoorsComplete");

    $("#BLACKOUT-LAYER").data(`${key}-goIndoors`, goIndoorsTimeline);
    $("#BLACKOUT-LAYER").data(`${key}-goOutdoors`, goOutdoorsTimeline);
  }

  public isIndoors: boolean = false;

  public canGoIndoors(locationName?: string) {
    locationName ??= getSetting("currentLocation");
    const locationData = this.getLocationData(locationName);
    return locationData.isIndoors;
  }

  public getGoIndoorsTimeline(locName = getSetting("currentLocation")) {
    if (!$("#BLACKOUT-LAYER").data(`${locName}-goIndoors`)) {
      this.buildGoIndoorsTimeline();
    }
    return $("#BLACKOUT-LAYER").data(
      `${locName}-goIndoors`
    ) as gsap.core.Timeline;
  }

  public getGoOutdoorsTimeline(locName = getSetting("currentLocation")) {
    if (!$("#BLACKOUT-LAYER").data(`${locName}-goOutdoors`)) {
      this.buildGoIndoorsTimeline();
    }
    return $("#BLACKOUT-LAYER").data(
      `${locName}-goOutdoors`
    ) as gsap.core.Timeline;
  }

  public async goIndoors() {
    if (!this.canGoIndoors()) {
      return;
    }
    if ((this.#goToLocationTimeline?.progress() ?? 1) < 1) {
      kLog.log("Waiting for goToLocation to finish");
      await this.#goToLocationTimeline;
    }
    this.getGoIndoorsTimeline().play();
  }

  public async goOutdoors() {
    if (!this.canGoIndoors()) {
      return;
    }
    if ((this.#goToLocationTimeline?.progress() ?? 1) < 1) {
      kLog.log("Waiting for goToLocation to finish");
      await this.#goToLocationTimeline;
    }
    this.getGoOutdoorsTimeline().play();
  }
  // #endregion Updating Indoors/Outdoors State ~

  // #region Location Image Control ~

  /**
   * Sets the current display image for a location and propagates the change.
   * Handles validation of image keys and updates location data storage.
   * @param imageKey - Optional key of image to set from location's image list. If omitted, clears current image
   * @param location - Optional location ID to update. Defaults to current active location
   * @returns Promise that resolves when image is set and data is saved
   * @throws Will not throw but logs error if location or image key is invalid
   */
  #initializeLocationWrapper() {
    const locationWrapper$ = this.locationContainer$.find(".location-wrapper");
    const locationImageWrapper$ = locationWrapper$.find(
      ".location-image-wrapper"
    );
    const locationImage$ = locationImageWrapper$.find("img");

    const imageMode = this.getLocationData().imageMode;
    const { locationWrapper, locationImageWrapper, locationImage } =
      LOCATION_IMAGE_MODES[imageMode];
    gsap.set(locationWrapper$, locationWrapper.css);
    gsap.set(locationImageWrapper$, locationImageWrapper.css);
    gsap.set(locationImage$, locationImage.css);

    kLog.log("Initialized location wrapper", {
      locationWrapper$,
      locationImageWrapper$,
      locationImage$,
      locationWrapper,
      locationImageWrapper,
      locationImage
    });
  }

  public async setLocationImage(
    imageKey?: string,
    location?: string
  ): Promise<void> {
    if (!getUser().isGM) {
      return;
    }
    // Default to current location if none specified
    location ??= getSetting("currentLocation");
    const locationData = assertIs(this.getLocationData(location));

    // Handle image key updates with validation
    if (!imageKey) {
      // No image key provided - clear current image
      locationData.currentImage = null;
    } else if (!(imageKey in locationData.images)) {
      // Invalid image key - log error and clear current image
      kLog.error("Image key not found", { imageKey, location });
      locationData.currentImage = null;
    } else {
      // Valid image key - update current image
      locationData.currentImage = imageKey;
    }

    // Persist updated location data to storage
    await this.setLocationData(location, locationData);
  }

  #getVisibleImageWrapper(): JQuery | null {
    const visibleImageWrapper$ = this.locationContainer$
      .find(".location-image-wrapper")
      .filter((index, element) => {
        return $(element).find("img").attr("src") !== "";
      });
    return visibleImageWrapper$.length > 0 ? visibleImageWrapper$ : null;
  }

  #getInvisibleImageWrapper(): JQuery {
    const visibleImageWrapper$ = this.#getVisibleImageWrapper();
    if (!visibleImageWrapper$) {
      return $(
        assertIs(this.locationContainer$.find(".location-image-wrapper")[0])
      );
    }
    return $(
      assertIs(
        this.locationContainer$
          .find(".location-image-wrapper")
          .not(visibleImageWrapper$)[0]
      )
    );
  }

  #buildFadeOutImageTimeline(): gsap.core.Timeline | null {
    const visibleImageWrapper$ = this.#getVisibleImageWrapper();
    kLog.log("Building fade out image timeline", { visibleImageWrapper$ });
    if (!visibleImageWrapper$) {
      return null;
    }
    const timeline = gsap
      .timeline()
      .to(visibleImageWrapper$, {
        rotateX: 45,
        duration: 1,
        ease: "power2.out"
      })
      .to(
        visibleImageWrapper$,
        {
          duration: 0.25,
          autoAlpha: 0,
          ease: "power2.out"
        },
        0.75
      )
      .call(() => {
        kLog.log("Fade out image timeline complete", { visibleImageWrapper$ });
        visibleImageWrapper$.find("img").attr("src", "");
      });
    return timeline;
  }

  #buildFadeInImageTimeline(imgKey: string | null): gsap.core.Timeline | null {
    if (!imgKey) {
      return null;
    }
    const invisibleImageWrapper$ = this.#getInvisibleImageWrapper();
    kLog.log("Building fade in image timeline", { invisibleImageWrapper$ });
    const invisibleImage$ = invisibleImageWrapper$.find("img");
    const locData = this.getLocationData();
    const imgSrc = assertIs(locData.images[imgKey]);

    // invisibleImageWrapper$.find("img").attr("src", imgSrc);

    const timeline = gsap
      .timeline()
      .fromTo(
        invisibleImage$,
        {
          autoAlpha: 0
        },
        {
          autoAlpha: 1,
          filter: "brightness(0.5) blur(10px)",
          // scale: 0.6,
          duration: 0,
          ease: "none"
        }
      )
      .call(() => {
        kLog.log("Fade in image timeline started", { invisibleImage$ });
        invisibleImage$.attr("src", imgSrc);
      })
      .fromTo(
        invisibleImageWrapper$,
        {
          autoAlpha: 0,
          rotateX: -45, // Rotate back around X axis
          rotateY: 0 // No side-to-side rotation initially
        },
        {
          // Will animate to these default values
          autoAlpha: 1,
          rotateX: 0,
          rotateY: 0,
          // z: 0,
          // scale: 1,
          // height: "100%",
          // width: "100%",
          // filter: "blur(0px)",
          duration: 2,
          ease: "back.out"
        }
      )
      .to(
        invisibleImage$,
        {
          autoAlpha: 1,
          // scale: 1,
          filter: "brightness(1) blur(0px)",
          duration: 2,
          ease: "power2.out"
        },
        0.1
      );
    return timeline;
  }

  public async fadeOutLocationImage(): Promise<void> {
    await this.#buildFadeOutImageTimeline()?.play();
  }

  public async fadeInLocationImage(imgKey: string | null): Promise<void> {
    await this.#buildFadeInImageTimeline(imgKey)?.play();
  }

  public async refreshLocationImage(imgKey: string | null): Promise<void> {
    const timelines = [
      this.#buildFadeOutImageTimeline(),
      this.#buildFadeInImageTimeline(imgKey)
    ].filter(Boolean) as gsap.core.Timeline[];

    kLog.log(`Refreshing location image to key: ${imgKey}`, { timelines });

    const tl = gsap.timeline();
    for (const t of timelines) {
      tl.add(t, "<+=0.25");
    }

    // If the location has audioDataByImage, and if this imgKey has associated audioData, then that audio data overrides all other audio (including weather).
    if (imgKey) {
      const locData = this.getLocationData();
      if (locData.audioDataByImage?.[imgKey]) {
        const audioToPlay = locData.audioDataByImage[imgKey];
        const audioPlaying = EunosMedia.GetPlayingSounds();
        const audioToKill = audioPlaying.filter(
          (media) => !(media.name in audioToPlay)
        );
        audioToKill.forEach((media) => {
          void EunosMedia.Kill(media.name, 2);
        });
        Object.entries(audioToPlay).forEach(([mediaName, media]) => {
          // We must first retrieve any specific settings for this audio from the audioDataByImage object and apply them.
          const locSettingsData = this.getLocationSettingsData(locData.key);
          const audioSettings =
            locSettingsData.audioDataByImage?.[imgKey]?.[mediaName] ?? {};
          audioSettings.volume =
            this.getVolumeOverride(mediaName, locData.key, imgKey) ??
            audioSettings.volume;
          void EunosMedia.Play(mediaName, audioSettings);
        });
      }
    }
    await tl.play();
  }

  // #endregion

  // #REGION INITIALIZING & TRANSITIONING LOCATIONS ~

  /**
   * Sets the current location for all users and updates related settings.
   * This method handles the high-level location change logic including:
   * - Weather effects based on location brightness
   * - Indoor/outdoor state tracking
   * - Global location settings updates
   * @param location - The ID/key of the location to set as the current location
   * @returns Promise that resolves when location is set and all settings are updated
   * @throws Will not throw but logs error if location data is missing
   */
  public async setLocation(location: string, isInstant = false): Promise<void> {
    // Only GMs can change location - early return for players
    if (!getUser().isGM) {
      return;
    }

    // Get data for both the current and target locations to handle transitions
    const locationData = this.getLocationData(location); // Load target location data

    // Validate the target location exists to prevent invalid state
    if (!locationData) {
      kLog.error(`Location ${location} not found`);
      return;
    }

    // Update weather effects based on location brightness
    // Weather settings are stored as a map of effect names to volume levels
    const weatherSoundSettings = getSetting("weatherAudio") ?? {};
    if (!locationData.isBright) {
      // For dark locations, completely remove the lightning effect from settings
      delete weatherSoundSettings["weather-lightning"];
    } else {
      // For bright locations, set lightning to a low ambient level (8% volume)
      weatherSoundSettings["weather-lightning"] = 0.08;
    }
    // Update core location settings atomically
    kLog.log(
      "Setting isOutdoors to TRUE because we're setting a new location."
    );

    if (isInstant) {
      void setSetting("weatherAudio", weatherSoundSettings);
      void setSetting("isOutdoors", true);
      void setSetting("currentLocation", location);
    } else {
      await setSetting("weatherAudio", weatherSoundSettings);
      await setSetting("isOutdoors", true);
      await setSetting("currentLocation", location);
    }
  }

  // Timeline references for managing animations
  #stageWaverTimeline: Maybe<gsap.core.Timeline>;

  get stageWaverTimeline(): gsap.core.Timeline {
    // Initialize persistent stage wave animation if not already running
    // Creates subtle movement in the stage background
    this.#stageWaverTimeline ??= gsap
      .timeline({ paused: true, repeat: -1, yoyo: true, repeatRefresh: true })
      .to(this.stage3D$, {
        rotationX: "random(-5, 5, 1)", // Random rotation on X axis
        rotationY: "random(-5, 5, 1)", // Random rotation on Y axis
        rotationZ: "random(-5, 5, 1)", // Random rotation on Z axis
        ease: "sine.inOut", // Smooth sinusoidal easing
        duration: 25, // 25 second animation cycle
        repeatRefresh: true // Generate new random values each cycle
      });
    return this.#stageWaverTimeline;
  }

  #goToLocationTimeline: Maybe<gsap.core.Timeline>;

  /**
   * Orchestrates the complete transition animation and state updates when moving between locations.
   * Handles:
   * - Visual transitions (fade outs, movements, etc)
   * - Audio crossfades
   * - UI element updates (NPCs, PCs, location cards)
   * - Special effects (lightning, stage effects)
   * - Map transformations
   * @param fromLocation - Starting location ID or null if no previous location
   * @param toLocation - Destination location ID to transition to
   * @returns Promise resolving to the GSAP timeline controlling the transition, or undefined if error
   * @throws Will not throw but logs error if destination location is invalid
   */
  public async goToLocation(
    fromLocation: string | null,
    toLocation?: string,
    options?: Partial<Location.Options>
    // isGoingOutdoors: boolean,
  ): Promise<gsap.core.Timeline | undefined> {
    // Create main transition timeline
    const timeline = gsap.timeline({ paused: true });

    // Extract options data
    const { fadeOutBlackdrop, delayPCs, delayWeather } = options ?? {};

    // Load location data for both source and destination
    toLocation ??= getSetting("currentLocation");
    const locationData = this.getLocationData(toLocation);
    // Validate destination location exists
    if (!locationData) {
      kLog.error("Location not found", { location: toLocation });
      return;
    }

    // Await any in-progress transition to prevent animation conflicts
    if (this.#goToLocationTimeline) {
      await this.#goToLocationTimeline;
    }

    // If we're fading in the blackdrop, add that to the beginning of the timeline
    if (fadeOutBlackdrop) {
      timeline.add(this.fadeOutBlackdrop());
    }
    timeline.addLabel("stageVisible");

    // If we're supposed to be outdoors, but we're indoors, go outdoors first
    if (getSetting("isOutdoors") && this.isIndoors) {
      timeline.add(this.getGoOutdoorsTimeline(), "stageVisible");
    }
    timeline.addLabel("readyToMove");

    // Extract all needed data from location configuration
    const { key, pcData, npcData, mapTransforms } = locationData;

    // Get transitional audio data
    const transitionAudioData = this.getTransitionAudioData(key);

    // Phase 1: Animate out current location image UNLESS (a) one of the image src attributes match and (b) that image is visible
    let fadeOutTimeline: Maybe<gsap.core.Timeline>;
    let fadeInTimeline: Maybe<gsap.core.Timeline>;

    const locationWrapper$ = this.locationContainer$.find(".location-wrapper");
    const visibleLocationImageWrappers$ = locationWrapper$
      .find(".location-image-wrapper")
      .filter((i, wrapper) => wrapper.style.opacity !== "0");
    kLog.log("Visible location image wrappers", {
      visibleLocationImageWrappers$
    });

    if (visibleLocationImageWrappers$.length > 0) {
      kLog.log("Visible location image wrappers found", {
        visibleLocationImageWrappers$
      });
      const currentDisplayedSrc = visibleLocationImageWrappers$
        .find("img")
        .attr("src");
      kLog.log("Current displayed src", { currentDisplayedSrc });
      if (currentDisplayedSrc) {
        const nextImage = locationData.currentImage;
        kLog.log("Next image", { nextImage });
        if (nextImage) {
          kLog.log("Next image found", { nextImage });
          const nextImageSrc = locationData.images[nextImage];
          kLog.log("Next image src", { nextImageSrc });
          if (!nextImageSrc) {
            kLog.error("Next image src not found", { nextImage, locationData });
          } else {
            kLog.log("Equality Check", {
              nextImageSrc,
              currentDisplayedSrc,
              equality: nextImageSrc === currentDisplayedSrc
            });
            if (nextImageSrc !== currentDisplayedSrc) {
              fadeOutTimeline = this.#buildFadeOutImageTimeline() ?? undefined;
              fadeInTimeline =
                this.#buildFadeInImageTimeline(locationData.currentImage) ??
                undefined;
              kLog.log("Sources Don't Match: Fade timelines built.", {
                fadeOutTimeline,
                fadeInTimeline
              });
            }
          }
        } else {
          fadeOutTimeline = this.#buildFadeOutImageTimeline() ?? undefined;
          kLog.log("No next image found, building fade-out timeline only", {
            fadeOutTimeline
          });
        }
      } else {
        fadeInTimeline =
          this.#buildFadeInImageTimeline(locationData.currentImage) ??
          undefined;
        kLog.log(
          "No current displayed src found, building fade-in timeline only",
          { fadeInTimeline }
        );
      }
    } else {
      fadeInTimeline =
        this.#buildFadeInImageTimeline(locationData.currentImage) ?? undefined;
      kLog.log(
        "No visible location image wrappers found, building fade-in timeline only",
        { fadeInTimeline }
      );
    }

    if (fadeOutTimeline) {
      timeline.add(fadeOutTimeline, 0);
    }

    // Add marker for movement phase start
    timeline.addLabel("startMoving_0");

    // Phase 2: Stop old audio tracks with 5 second fadeout
    timeline.call(
      () => {
        this.killLocationAudio(transitionAudioData);
      },
      [],
      "startMoving_0"
    );

    // Phase 3: Hide NPC UI elements
    timeline.add((await this.refreshNPCUI_Hide()).tl, "startMoving_0");

    // Phase 4: Restore stage brightness if currently dimmed
    if (
      (gsap.getProperty("#STAGE", "filter") as Maybe<string>)?.includes(
        "brightness(0)"
      )
    ) {
      timeline.to(
        "#STAGE",
        {
          filter: "brightness(1)", // Restore full brightness
          duration: 1, // 1 second fade
          ease: "none" // Linear brightness change
        },
        "startMoving_0"
      );
    }

    // Phase 5: Apply map transforms sequentially
    mapTransforms.forEach((transforms, setIndex) => {
      transforms.forEach(({ selector, properties }, index) => {
        if (mapTransforms.length === 1) {
          // Single transform set - simple transition
          kLog.log("Applying single map transform at startMoving_0", {
            selector,
            properties
          });
          timeline.to(
            selector,
            {
              duration: 5,
              ease: "back.out(0.1)", // Slight overshoot
              ...properties
            },
            "startMoving_0"
          );
        } else {
          // Multiple transform sets - complex transition
          // Ease varies based on position in sequence for smooth chain effect
          const ease =
            setIndex === 0
              ? "power3.in" // Strong acceleration at start
              : setIndex === mapTransforms.length - 1
                ? "power3.out" // Strong deceleration at end
                : setIndex % 2 === 0
                  ? "power3.out" // Alternating deceleration
                  : "power3.in"; // Alternating acceleration
          kLog.log(
            `Applying map transform ${index === 0 ? `at startMoving_${setIndex} at ${timeline.duration()}` : "with last transform"} - ${ease}`,
            { selector, properties, ease }
          );
          timeline.to(
            selector,
            {
              duration: 5,
              ease,
              ...properties
            },
            `startMoving_${setIndex}`
          );
        }
      });
      // Add marker for next transform set
      kLog.log(
        `Adding label startMoving_${setIndex + 1} at ${timeline.duration()}`
      );
      timeline.addLabel(`startMoving_${setIndex + 1}`);
    });

    // Add marker for movement end
    kLog.log("Adding label stopMoving at", timeline.duration());
    timeline.addLabel("stopMoving", "-=0.5"); // Overlap slightly with last transform

    // Phase 6: Fade in location image, if there is one
    timeline.call(
      () => {
        kLog.display(
          `Initializing location wrapper for location '${toLocation}'`
        );
        this.#initializeLocationWrapper();
      },
      [],
      "stopMoving"
    );

    if (fadeInTimeline) {
      timeline.add(fadeInTimeline, "stopMoving");
    }

    // Phase 7: Start stage waver timeline
    timeline.call(
      () => {
        void this.stageWaverTimeline.play();
      },
      [],
      "stopMoving"
    );

    // Phase 7: Start new audio tracks with 5 second fadein
    timeline.call(
      () => {
        this.playLocationAudio(transitionAudioData);
      },
      [],
      delayWeather ? "stopMoving" : "stopMoving-=3"
    );

    // Phase 8: If supposed to be indoors, but we're outdoors, go indoors
    if (!getSetting("isOutdoors") && !this.isIndoors) {
      timeline.add(this.getGoOutdoorsTimeline(), "stopMoving");
    }

    // Phase 9: Show NPC UI elements
    timeline.add((await this.refreshNPCUI_Show()).tl, "stopMoving+=1");

    // Phase 10: Update PC UI & GM NPC UI
    timeline.call(
      () => {
        void this.updatePCUI(pcData);
        void this.updateNPCUI_GM();
      },
      [],
      getUser().isGM ? 1 : "stopMoving+=1" // Different timing for GM vs player
    );

    // Store timeline reference and start playback
    this.#goToLocationTimeline = timeline;
    timeline.play();

    return timeline;
  }

  private async handleLightningAudio(data?: Location.FullData) {
    data ??= this.getLocationData(getSetting("currentLocation"));
    const lightningAudio = EunosMedia.GetMedia("weather-lightning");
    if (lightningAudio && !data.isBright) {
      // For dark locations, fade out lightning over 2 seconds
      await EunosMedia.Kill(lightningAudio.name, 2);
    } else if (lightningAudio) {
      const lightningVolume = Sounds.Weather["weather-lightning"].volume;
      if (data.name === "Emma's Rise") {
        // Special handling for Emma's Rise location
        // Kill lightning immediately, then restart with fade after delay
        await EunosMedia.Kill(lightningAudio.name, 0);
        setTimeout(() => {
          void EunosMedia.Play(lightningAudio.name, { volume: 1, fadeInDuration: 0 }).then(() => {
            // Fade element volume down over 10 seconds - DO NOT animate the EunosMedia volume property!
            gsap.fromTo(
              lightningAudio.element,
              { volume: 1 }, // Start at full element volume
              { volume: lightningVolume, duration: 10, ease: "none" } // Fade element to configured volume
            );
          });
        }, 5000); // 5 second delay before lightning starts
      } else {
        // For other bright locations, just play lightning normally
        void EunosMedia.Play(lightningAudio.name);
        if (this.isIndoors) {
          lightningAudio.dampenAudio();
        } else {
          lightningAudio.unDampenAudio();
        }
      }
    }
  }

  private getTransitionAudioData(
    locKey?: null | keyof typeof LOCATIONS
  ): TransitionAudioData {
    const returnData: TransitionAudioData = {
      toKill: [],
      toPlay: [],
      volumeOverrides: {}
    };
    if (locKey === null) {
      return returnData;
    }
    locKey ??= getSetting("currentLocation");

    const {
      key,
      currentImage,
      audioDataIndoors,
      audioDataOutdoors,
      audioDataByImage
    } = this.getLocationData(locKey);

    const imgAudio = audioDataByImage?.[currentImage ?? ""];
    const audioData = imgAudio ?? audioDataOutdoors ?? audioDataIndoors ?? {};

    // Get all audio from the new location and apply volume overrides
    Object.values(audioData).forEach((audio) => {
      returnData.toPlay.push(audio);
      const volumeOverride = this.getVolumeOverride(
        audio.name,
        key,
        currentImage
      );
      if (typeof volumeOverride === "number") {
        returnData.volumeOverrides[audio.name] = volumeOverride;
      }
    });

    // Get all currently-playing audio, excluding weather audio
    const weatherAudio = getSetting("weatherAudio");
    const playingAudio = EunosMedia.GetPlayingSounds().filter(
      (media) => !(media.name in weatherAudio)
    );

    // Mark playing audio not present at location as audio to kill
    returnData.toKill.push(
      ...playingAudio.filter((media) => !(media.name in audioData))
    );

    return returnData;
  }

  private killLocationAudio(data?: TransitionAudioData) {
    const { toKill } = data ?? this.getTransitionAudioData();
    void Promise.all(toKill.map((media) => EunosMedia.Kill(media.name, 5)));
  }

  private playLocationAudio(data?: TransitionAudioData) {
    const { toPlay, volumeOverrides } = data ?? this.getTransitionAudioData();
    toPlay.forEach((media) => {
      if (media.name in volumeOverrides) {
        void EunosMedia.Play(media.name, {
          volume: volumeOverrides[media.name],
          fadeInDuration: 5
        });
      } else {
        void EunosMedia.Play(media.name, { fadeInDuration: 5 });
      }
    });
    void this.handleLightningAudio();
  }
  // #endregion LOCATIONS

  // #region LOCATION PLOTTING PANEL ~
  private readonly initialValues: {
    transforms: Record<string, number>;
    gradients: Record<string, number>;
    filters: Record<string, number>;
  } = {
    transforms: {},
    gradients: {},
    filters: {}
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
    formatForDisplay: (value: number) => string
  ): HTMLDivElement {
    const controlRow = document.createElement("div");
    controlRow.classList.add("control-row");

    kLog.log("makeSliderControl", {
      label,
      min,
      max,
      initValue,
      actionFunction,
      formatForDisplay,
      controlRow
    });

    const labelElement = document.createElement("label");
    labelElement.textContent = label;

    const valueDisplay = document.createElement("span");
    valueDisplay.classList.add("value-display");

    const sliderElement = document.createElement("input");
    sliderElement.type = "range";
    sliderElement.min = String(min);
    sliderElement.max = String(max);

    let initialValue = Number(
      typeof initValue === "number" ? initValue : initValue()
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

  // #region ===== LIMBO ===== ~

  /** GM-only method to trigger enterLimbo for all clients */
  public async gmEnterLimbo() {
    if (!getUser().isGM) return;
    await Promise.all([
      setSetting("inLimbo", true),
      this.setLocation("limbo")]
    );
    void EunosSockets.getInstance().call("enterLimbo", UserTargetRef.all);
    setTimeout(() => {
      void this.setLocation("limbo");
    }, 5000);
  }

  public async enterLimbo() {
    await Promise.all([
      this.fadeInBlackOverlay(),
      EunosMedia.SetSoundscape({}, 5)
    ]);
    void Promise.all([
      this.fadeOutStage(),
      this.fadeOutLocationImage(),
      this.prepareLimbo()
    ]);
    await Promise.all([
      this.displayLimbo(),
      EunosMedia.SetSoundscape({}, 5)
    ]);
    await this.fadeOutBlackOverlay();
  }

  private async fadeInBlackOverlay() {
    this.topZIndexMask$.css("background", "black");
    return gsap.to(this.topZIndexMask$, {
      autoAlpha: 1,
      duration: 5,
      ease: "power3.out"
    });
  }

  private async fadeOutBlackOverlay() {
    return gsap.to(this.topZIndexMask$, {
      autoAlpha: 0,
      duration: 5,
      ease: "power3.out",
      onComplete: () => {
        this.topZIndexMask$.attr("style", "");
      }
    });
  }

  private async fadeOutStage() {
    $("body").css("background", "black");
    return gsap.to(this.stage$, {
      autoAlpha: 0,
      duration: 5,
      ease: "power3.out",
      onComplete: () => {
        this.stage$.css("display", "none");
      }
    });
  }

  private async prepareLimbo() {
    this.overlay$.addClass("limbo");
    await this.render({ parts: ["limbo_stage"] });
    // await this.goToLocation("limbo");
  }

  private async displayLimbo() {
    await this.goToLocation(null, "limbo", {
      fadeOutBlackdrop: true,
      delayPCs: true,
      delayWeather: true
    });


    return gsap.fromTo(
      this.limbo$,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 2, ease: "power2.in" }
    );
  }

  /** GM-only method to trigger leaveLimbo for all clients */
  public async gmLeaveLimbo() {
    if (!getUser().isGM) return;
    await Promise.all([
      setSetting("inLimbo", false)
    ]);
    void EunosSockets.getInstance().call("leaveLimbo", UserTargetRef.all);
    setTimeout(() => {
      void this.setLocation("standingStones");
    }, 5000);
  }

  public async leaveLimbo() {
    await this.fadeInBlackOverlay();
    this.overlay$.removeClass("limbo");
    this.stage$.css("display", "block");
    void Promise.all([
      this.render({ parts: ["stage"] }),
      gsap.to(this.limbo$, { autoAlpha: 0, duration: 1, ease: "power2.out" })
    ]);
    setTimeout(() => {
      void this.fadeOutBlackOverlay();
    }, 5000);
  }

  // #endregion

  // #region END PHASE ~

  #fadeInQuestion(question$: JQuery): GSAPAnimation {
    const fadeInTimeline = (
      gsap.timeline({ paused: true })["fadeInPopText"] as GSAPEffectFunction
    )(question$);
    question$.data("fadeInTimeline", fadeInTimeline);
    return fadeInTimeline.timeScale(1).play();
  }

  #fadeOutQuestion(question$: JQuery): GSAPAnimation {
    kLog.log("Fading out question", question$);
    const fadeInTimeline = question$.data(
      "fadeInTimeline"
    ) as Maybe<gsap.core.Timeline>;
    if (!fadeInTimeline) {
      kLog.error(
        "No fade in timeline found for question, applying default animation",
        question$
      );
      return gsap.to(question$, {
        autoAlpha: 0,
        duration: 1,
        filter: "blur(10px)",
        x: "+=50",
        y: "-=100",
        ease: "power3.out"
      });
    }
    kLog.log("Reversing Timeline", fadeInTimeline);
    return fadeInTimeline.timeScale(3).reverse();
  }

  public async transitionToEndPhaseQuestion(
    questionNumber: number
  ): Promise<void> {
    const lastQuestion = questionNumber - 1;
    kLog.log(`transitioning to end phase question #${questionNumber}`, {
      lastQuestion,
      lastQuestion$: this.endPhase$.find(
        `[data-question-number="${lastQuestion}"]`
      )
    });
    if (lastQuestion > 0) {
      const lastQuestion$ = this.endPhase$.find(
        `[data-question-number="${lastQuestion}"]`
      );
      if (lastQuestion$.length > 0) {
        await this.#fadeOutQuestion(lastQuestion$);
      }
    }
    if (questionNumber < 4) {
      const currentQuestion$ = this.endPhase$.find(
        `[data-question-number="${questionNumber}"]`
      );
      if (currentQuestion$.length > 0) {
        await this.#fadeInQuestion(currentQuestion$);
      }
    } else {
      void this.transitionToDramaticHookAssignment();
    }
  }

  #fadeInDramaticHookAssignmentSplash(): gsap.core.Timeline {
    const tl = gsap.timeline();

    tl.fromTo(
      this.dramaticHookSplashContainer$,
      {
        autoAlpha: 0,
        filter: "blur(10px)"
      },
      {
        autoAlpha: 1,
        filter: "blur(0px)",
        duration: 1,
        ease: "power2.out"
      }
    );

    return tl;
  }

  assignDramaticHookDialog: Maybe<Dialog>;
  displayAssignDramaticHookDialog(
    targetPC: EunosActor,
    userPC: EunosActor,
    isCloseable = true
  ) {
    if (!targetPC.isPC() || !userPC.isPC()) {
      return;
    }
    this.assignDramaticHookDialog = new Dialog({
      title: "Assign Dramatic Hook",
      content: `
        <div class="form-group">
          <span class='hook-for'>for</span><span class='hook-target'>${targetPC.name}</span>
          <div class='hook-container'>
            <span class='hook-prefix'>
I should
            </span>
            <span class='hook-entry'>
              <textarea name="hook" rows="1">${userPC.system.dramatichooks.assignedHook ?? ""}</textarea>
            </span>
          </div>
        </div>
      `,
      buttons: isCloseable
        ? {
            one: {
              label: "Ok",
              callback: async (html) => {
                const hook = $(html).find("[name=hook]").val() as string;
                await userPC.update({
                  system: {
                    dramatichooks: {
                      assignedHook: hook
                    }
                  }
                });
              }
            },
            cancel: {
              label: "❌",
              callback: () => null
            }
          }
        : {},
      render: function (html: HTMLElement | JQuery) {
        $(html)
          .closest(".app.window-app.dialog")
          .addClass("blurred-bg-dialog assign-dramatic-hook-dialog");
        // If this isn't closeable, there are no buttons -- so a change listener should attach to the input element, and update the assignedHook on change.
        if (!isCloseable) {
          $(html).on("change", "[name=hook]", (event) => {
            const hook = $(event.currentTarget).val() as string;
            void userPC.update({
              system: { dramatichooks: { assignedHook: hook } }
            });
          });
        }
      },
      default: "one"
    });

    this.assignDramaticHookDialog.render(true);
  }

  closeAssignDramaticHookDialog() {
    void this.assignDramaticHookDialog?.close();
    this.assignDramaticHookDialog = undefined;
  }

  #dramaticHookAssignmentDialog$: Maybe<JQuery>;
  #dramaticHookAssignmentDialog: Maybe<Dialog>;
  #displayDramaticHookAssignmentPopUp(): void {
    this.#dramaticHookAssignmentDialog = new Dialog({
      title: "Dramatic Hook Assignments",
      content: `
        <div class="dramatic-hook-assignments">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Assigning To</th>
                <th>Hook Text</th>
                <th>Assign To Hook</th>
              </tr>
            </thead>
            <tbody>
              ${getUsers()
                .filter((u) => !u.isGM)
                .map((user) => {
                  const actor = getActors().find(
                    (a) => a.id === user.character?.id
                  );
                  if (!actor?.isPC() || !user.id) return "";

                  const dramaticHookAssignments = getSetting(
                    "dramaticHookAssignments"
                  );
                  if (!dramaticHookAssignments) return "";

                  const assigningFor = dramaticHookAssignments[user.id];
                  const assignedHook = actor.system.dramatichooks.assignedHook;
                  const targetActor = getActors().find(
                    (a) => a.id === assigningFor
                  );

                  if (!targetActor?.isPC()) return "";

                  const hook1 = targetActor.system.dramatichooks.dramatichook1;
                  const hook2 = targetActor.system.dramatichooks.dramatichook2;

                  // If neither hook is checked OR both hooks are checked, both buttons are enabled
                  // If only one hook is checked, only that hook's button is enabled
                  const hook1Disabled = !hook1.isChecked && hook2.isChecked;
                  const hook2Disabled = !hook2.isChecked && hook1.isChecked;

                  return `
                    <tr data-user-id="${user.id}" data-target-id="${targetActor.id}">
                      <td>${user.name}</td>
                      <td>${targetActor.name}</td>
                      <td>
                        <input type="text" class="hook-text" data-user-id="${
                          user.id
                        }" value="${assignedHook ?? ""}" />
                      </td>
                      <td class="hook-buttons">
                        <button class="hook-button${
                          hook1Disabled ? " disabled" : ""
                        }" data-hook-number="1" title="${
                          hook1.content ?? "Empty hook"
                        }"${hook1Disabled ? " disabled" : ""}>
                          <i class="fas ${
                            hook1.isChecked ? "fa-circle-check" : "fa-circle"
                          }"></i>
                        </button>
                        <button class="hook-button${
                          hook2Disabled ? " disabled" : ""
                        }" data-hook-number="2" title="${
                          hook2.content ?? "Empty hook"
                        }"${hook2Disabled ? " disabled" : ""}>
                          <i class="fas ${
                            hook2.isChecked ? "fa-circle-check" : "fa-circle"
                          }"></i>
                        </button>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `,
      buttons: {
        close: {
          label: "Done",
          callback: () => {
            void EunosSockets.getInstance().call(
              "endDramaticHookAssignment",
              UserTargetRef.all
            );
          }
        }
      },
      render: (html: JQuery | HTMLElement) => {
        html = $(html);
        this.#dramaticHookAssignmentDialog$ = html;

        $(html)
          .closest(".app.window-app.dialog")
          .addClass("dramatic-hook-assignments-dialog");

        // Handle hook text changes
        html.on("change", ".hook-text", (event) => {
          const input = event.currentTarget as HTMLInputElement;
          const userId = input.dataset["userId"] as Maybe<string>;
          const actor = getActors().find(
            (a) =>
              a.id === getUsers().find((u) => u.id === userId)?.character?.id
          );
          if (actor?.isPC()) {
            void actor.update({
              system: {
                dramatichooks: {
                  assignedHook: input.value
                }
              }
            });
          }
        });

        // Handle hook button clicks
        html.on("click", ".hook-button", (event) => {
          const button = event.currentTarget as HTMLElement;
          const tr = button.closest("tr") as HTMLElement;
          const hookNumber = button.dataset["hookNumber"] as Maybe<string>;
          const userId = tr.dataset["userId"] as Maybe<string>;
          const targetId = tr.dataset["targetId"] as Maybe<string>;
          const hookText = (tr.querySelector(".hook-text") as HTMLInputElement)
            ?.value;

          if (!userId || !targetId || !hookNumber || !hookText) return;

          this.#assignDramaticHook(
            userId,
            targetId,
            Number(hookNumber),
            hookText
          );
        });
      }
    });

    this.#dramaticHookAssignmentDialog?.render(true);
  }

  public updateDramaticHookAssignmentPopUp(
    assigningUserID: string,
    assignedHookText: string
  ): void {
    const dialog = this.#dramaticHookAssignmentDialog$;
    if (!dialog) return;

    const tr = dialog.find(`tr[data-user-id="${assigningUserID}"]`);
    if (!tr) return;

    //

    // Find the input field for the assigned hook text and update it
    const hookTextInput = tr.find(".hook-text");
    if (!hookTextInput) return;

    hookTextInput.val(assignedHookText);
  }

  readonly #assignedHooksMap: Map<string, string> = new Map<string, string>();

  #assignDramaticHook(
    userId: string,
    actorId: string,
    hookNumber: number,
    hookText: string
  ): void {
    const targetActor = getActors().find((a) => a.id === actorId);
    const userActor = getActors().find(
      (a) => a.isPC() && getOwnerOfDoc(a)?.id === userId
    );
    if (!targetActor || !userActor) {
      getNotifier().error(
        `Target or user actor not found for actorId: ${actorId} or userId: ${userId}`
      );
      return;
    }

    const targetUserID = getOwnerOfDoc(targetActor)?.id;
    if (!targetUserID) {
      getNotifier().error(`User not found for actor: ${targetActor.name}`);
      return;
    }

    void targetActor.update({
      system: {
        dramatichooks: {
          [`dramatichook${hookNumber}`]: {
            content: `I should ${hookText}`,
            isChecked: false
          }
        }
      }
    });

    void userActor.update({
      system: {
        dramatichooks: {
          assignedHook: ""
        }
      }
    });

    // Update the assigned hooks map
    this.#assignedHooksMap.set(targetUserID, hookText);

    // Update the dialog box by adding the "hook-assigned" class to the proper row.
    const dialog = this.#dramaticHookAssignmentDialog$;
    if (!dialog) return;

    const tr = dialog.find(`tr[data-user-id="${userId}"]`);
    if (!tr) return;

    tr.addClass("hook-assigned");

    // Socket-call the assigning user to close their hook assignment dialog
    void EunosSockets.getInstance().call(
      "closeAssignDramaticHookDialog",
      userId
    );

    // Alert the target user
    void EunosAlerts.Alert({
      type: AlertType.dramaticHookAssigned,
      target: targetUserID,
      header: "New Dramatic Hook",
      soundDelay: 0,
      displayDuration: 4.87,
      body: `"I should ${hookText}"`
    });
  }

  #endDramaticHookAssignment(): void {
    void this.#dramaticHookAssignmentDialog?.close();
    this.#dramaticHookAssignmentDialog = undefined;
    this.#dramaticHookAssignmentDialog$ = undefined;
    const tl = gsap.timeline();
    tl.set(this.topZIndexMask$, { background: "black" });
    tl.add(this.#fadeOutDramaticHookAssignmentSplash());
    tl.to(
      this.topZIndexMask$,
      {
        autoAlpha: 1,
        duration: 6,
        ease: "power2.out",
        onComplete: () => {
          if (getUser().isGM) {
            void setSetting("gamePhase", GamePhase.SessionClosed);
          }
        }
      },
      2
    );
  }

  #fadeOutDramaticHookAssignmentSplash(): gsap.core.Timeline {
    const tl = gsap.timeline();

    return tl;
  }

  public get isAssigningDramaticHooks(): boolean {
    return this.#dramaticHookAssignmentDialog !== undefined;
  }
  public async transitionToDramaticHookAssignment(): Promise<void> {
    kLog.log("transitionToDramaticHookAssignment");

    // #1:  Fade in the dramatic hook assignment splash
    void this.#fadeInDramaticHookAssignmentSplash();

    if (!getUser().isGM) {
      const user = getUser();
      const userId = user.id;
      if (!userId) {
        getNotifier().error(`User not found for user: ${user.name}`);
        return;
      }
      // Get user actor via getOwnerOfDoc
      const userActor = getActors().find(
        (a) => a.isPC() && getOwnerOfDoc(a)?.id === userId
      );
      if (!userActor) {
        getNotifier().error(`User actor not found for user: ${user.name}`);
        return;
      }
      // Get target actor from system.dramatichooks.assigningFor
      const targetActor = getActors().find(
        (a) => a.id === getSetting("dramaticHookAssignments")[userId]
      );
      if (!targetActor) {
        getNotifier().error(`Target actor not found for user: ${user.name}`);
        return;
      }

      kLog.log("displayAssignDramaticHookDialog", { targetActor, userActor });
      this.displayAssignDramaticHookDialog(targetActor, userActor, false);
      return;
    }
    EunosOverlay.instance.endPhase$
      .find(".master-gm-control-panel")
      .css("visibility", "hidden");

    // #2:  Display the dramatic hook assignment pop-up to the GM.
    this.#displayDramaticHookAssignmentPopUp();

    /**   - User Name
     *    - The Actor Name they're assigning a hook to (from system.dramatichooks.assigningFor)
     *    - The assigned hook (from system.dramatichooks.assignedHook)
     *      - this should be an editable field for the GM, which updates the system.dramatichooks.assignedHook field on change
     *      - whenever this field is updated (whether by the GM or the player), the displayed field to the GM should be likewise updated
     *    - two circular buttons, one for each dramatic hook
     *      - the button should be filled in if the dramatic hook is still "live" (i.e. system.dramatichooks.dramatichook#.isChecked === false), or empty otherwise
     *      - each button should have a popover tooltip containing the text of the associated dramatic hook (from system.dramatichooks.dramatichook#.content)
     *      - on a click, the button should replace the content for that dramatic hook with the text string entered by the user into the system.dramatichooks.assignedHook field AND set that dramatic hook's isChecked field to false AND display an Alert to the user that the dramatic hook has been assigned
     */
  }

  // #endregion END PHASE ~

  // #region LISTENERS ~

  #sidebarTimeline: Maybe<gsap.core.Timeline>;
  private get sidebarTimeline(): gsap.core.Timeline {
    if (!this.#sidebarTimeline) {
      this.#sidebarTimeline = gsap
        .timeline({ paused: true })
        .to(this.uiRight$, {
          opacity: 0,
          duration: 0.01,
          ease: "none"
        })
        .set([this.midZIndexMask$, this.maxZIndexBars$], { zIndex: 50 })
        .set(this.uiRight$, { zIndex: 51 })
        .to(this.uiRight$, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out"
        });
    }
    return this.#sidebarTimeline;
  }

  private addCanvasMaskListeners() {
    if (
      this.timeRemaining <= PRE_SESSION.FREEZE_OVERLAY ||
      ![GamePhase.SessionClosed, GamePhase.SessionLoading].includes(
        getSetting("gamePhase") as GamePhase
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
      .on("click.startVideo", ".start-video", () => {
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
        if (e.originalEvent instanceof PointerEvent) {
          void EunosOverlay.ACTIONS["togglePCSpotlight"]?.(
            e.originalEvent,
            target
          );
        }
      }
    );
    this.pcs$.on(
      "mouseup",
      ".pc-stage-control-button-spotlight",
      (e: JQuery.MouseUpEvent) => {
        const target = e.target as HTMLElement;
        if (e.originalEvent instanceof PointerEvent) {
          void EunosOverlay.ACTIONS["togglePCSpotlight"]?.(
            e.originalEvent,
            target
          );
        }
      }
    );
  }

  private addSafetyButtonListeners() {
    const fadeToBlackRow$ = this.safetyButtons$.find(".safety-button-row-fade");
    const fadeToBlackFg$ = fadeToBlackRow$.find(".label-fg");
    const fadeToBlackIcon$ = fadeToBlackRow$.find(".safety-button-fade");
    const stopSceneRow$ = this.safetyButtons$.find(".safety-button-row-stop");
    const stopSceneFg$ = stopSceneRow$.find(".label-fg");
    const stopSceneIcon$ = stopSceneRow$.find(".safety-button-stop");

    const oldFadeTimeline = fadeToBlackRow$.data(
      "fade-timeline"
    ) as Maybe<gsap.core.Timeline>;
    const oldStopSceneTimeline = stopSceneRow$.data(
      "stop-scene-timeline"
    ) as Maybe<gsap.core.Timeline>;
    if (oldFadeTimeline) {
      oldFadeTimeline.seek(0).kill();
    }
    if (oldStopSceneTimeline) {
      oldStopSceneTimeline.seek(0).kill();
    }

    const fadeToBlackTimeline = gsap
      .timeline({
        paused: true
      })
      .to(fadeToBlackFg$, {
        width: 250,
        duration: 2,
        ease: "power2.in"
      })
      .to(
        fadeToBlackIcon$,
        {
          filter: "brightness(0)",
          duration: 0.5,
          ease: "power2.inOut"
        },
        "-=0.5"
      )
      .call(() => {
        fadeToBlackRow$.css("pointer-events", "none");
        void EunosSockets.getInstance().call("Alert", UserTargetRef.gm, {
          type: AlertType.simple,
          header: "FADE TO BLACK",
          body: "A player has requested a fade to black."
        });
      })
      .to(fadeToBlackRow$, {
        scale: 2,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out"
      })
      .call(
        () => {
          fadeToBlackTimeline.seek(0).pause();
          fadeToBlackRow$.attr("style", "");
        },
        [],
        "+=3"
      );

    fadeToBlackRow$.data("fade-timeline", fadeToBlackTimeline);

    const stopSceneTimeline = gsap
      .timeline({
        paused: true
      })
      .to(stopSceneFg$, {
        width: 250,
        duration: 2,
        ease: "power2.in"
      })
      .to(
        stopSceneIcon$,
        {
          filter: "brightness(0)",
          duration: 0.5,
          ease: "power2.inOut"
        },
        "-=0.5"
      )
      .call(() => {
        stopSceneRow$.css("pointer-events", "none");
        void EunosSockets.getInstance().call("Alert", UserTargetRef.gm, {
          type: AlertType.simple,
          header: "STOP SCENE",
          body: "A player has requested an immediate scene stop."
        });
      })
      .to(stopSceneRow$, {
        scale: 2,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out"
      })
      .call(
        () => {
          stopSceneTimeline.seek(0).pause();
          stopSceneRow$.attr("style", "");
        },
        [],
        "+=3"
      );

    stopSceneRow$.data("stop-scene-timeline", stopSceneTimeline);

    fadeToBlackRow$
      .on("mousedown", () => {
        const tl = fadeToBlackRow$.data(
          "fade-timeline"
        ) as Maybe<gsap.core.Timeline>;
        kLog.log("fade to black mousedown");
        if (tl) {
          tl.timeScale(1).play();
        }
      })
      .on("mouseup", () => {
        const tl = fadeToBlackRow$.data(
          "fade-timeline"
        ) as Maybe<gsap.core.Timeline>;
        if (tl) {
          tl.timeScale(3).reverse();
        }
      });

    stopSceneRow$
      .on("mousedown", () => {
        const tl = stopSceneRow$.data(
          "stop-scene-timeline"
        ) as Maybe<gsap.core.Timeline>;
        if (tl) {
          tl.timeScale(1).play();
        }
      })
      .on("mouseup", () => {
        const tl = stopSceneRow$.data(
          "stop-scene-timeline"
        ) as Maybe<gsap.core.Timeline>;
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
    journalName = "Session Scribe Notes"
  ): Promise<JournalEntryPage | null> {
    journalPageName ??= `Chapter ${getSetting("chapterNumber")} Notes`;
    // Try to find existing journal entry
    let journal: Maybe<JournalEntry> = getJournals().find(
      (j) => j.name === journalName
    ) as Maybe<JournalEntry>;

    // If the Session Scribe Notes journal entry does not exist, generate the folder (if necessary) and the journal entry.
    if (!journal) {
      // Find the folder for session scribe notes
      const folder: Maybe<Folder> = getFolders().find(
        (f) => f.type === "JournalEntry" && f.name === "Session Scribe Notes"
      );

      // If the folder doesn't exist, send an Alert to the GM to create it.
      if (!folder) {
        void EunosAlerts.Alert({
          type: AlertType.simple,
          target: UserTargetRef.gm,
          header: "Session Scribe Notes Folder Not Found",
          body: "Please create a folder called 'Session Scribe Notes' in the root of your journal collection."
        });
        return null;
      }

      // Create the journal entry
      const journalData = {
        name: journalName,
        folder: folder.id
      };
      journal = (await JournalEntry.create(
        journalData as never
      )) as JournalEntry;
    }

    // Now check if the journal entry has a page with the name `journalPageName`. If not, create it.
    let journalPage = journal?.pages.find((p) => p.name === journalPageName);
    journalPage ??= (
      (await journal?.createEmbeddedDocuments("JournalEntryPage", [
        {
          name: journalPageName,
          text: { content: "<ul><li><p></p></li></ul>" }
        }
      ])) as JournalEntryPage[]
    )[0];

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
        `Journal entry page "${journalEntryPage.name}" does not have a sheet`
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
      LOADING_SCREEN_DATA
    });

    // Prepare location data for stage
    const location = getSetting("currentLocation");
    const locationData = this.getLocationData(location);
    if (locationData) {
      Object.assign(context, {
        location,
        locationData
      });
    }

    Object.assign(context, {
      sessionScribeID: getSetting("sessionScribe"),
      chainBG: AlertPaths["LINK"]!.cssCode,
      userActorID: getActor()?.id ?? ""
    });
    if (!getUser().isGM) {
      const dramaticHookAssignment = getSetting("dramaticHookAssignments")[
        getUser().id!
      ];
      Object.assign(context, {
        dramaticHookCandleID: dramaticHookAssignment ?? ""
      });
    }

    if (
      [GamePhase.SessionClosed, GamePhase.SessionLoading].includes(
        getSetting("gamePhase") as GamePhase
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
            isReady: status === MediaLoadStatus.Ready
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
    options: ApplicationV2.RenderOptions
  ): void {
    super._onRender(context, options);

    if (
      [GamePhase.SessionClosed, GamePhase.SessionLoading].includes(
        getSetting("gamePhase")
      )
    ) {
      this.addCanvasMaskListeners();
    }
    this.addStartVideoButtonListeners();
    this.addPCControlListeners();
    this.makePlottingControls();
    this.addSafetyButtonListeners();
    this.initializeDramaticHookHoldTriggers();

    // Clean up any bound elements that are no longer in the DOM
    this._cleanupBoundElements();

    this.#dragDrop.forEach((d) => {
      // Bind to the sidebar actors list
      const sidebarActors = document.querySelector(
        "#sidebar #actors .directory-list"
      ) as HTMLElement;
      if (sidebarActors && !this.boundElements.has(sidebarActors)) {
        d.bind(sidebarActors);
        this.boundElements.add(sidebarActors);
      }

      // Bind to NPC portraits (only new ones)
      const npcPortraits: NodeListOf<HTMLElement> =
        this.element.querySelectorAll(".npc-drag-handle");
      npcPortraits.forEach((portrait) => {
        if (!this.boundElements.has(portrait)) {
          d.bind(portrait);
          this.boundElements.add(portrait);
        }
      });

      // Bind to drop target
      const dropTarget = this.element.querySelector("#NPCS-GM") as HTMLElement;
      if (dropTarget && !this.boundElements.has(dropTarget)) {
        d.bind(dropTarget);
        this.boundElements.add(dropTarget);
      }
    });

    if (options.isFirstRender) {
      setTimeout(() => {
        void this.syncPhase();
      }, 2000);
    }
  }

  private makePlottingControls() {
    kLog.log("makePlottingControls");
    // Confirm that location plotting panel is visible
    if (this.locationPlottingPanel$.css("visibility") !== "visible") {
      return;
    }

    kLog.log("locationPlottingPanel$", this.locationPlottingPanel$);
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
        panel.formatForDisplay
      );
      this.locationPlottingPanel$.find(".control-section").append(controlRow);
    });
  }
  // #endregion OVERRIDE: ON RENDER ~
}
