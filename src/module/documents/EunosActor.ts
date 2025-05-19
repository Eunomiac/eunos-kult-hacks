import EunosItem from "./EunosItem";
import EunosOverlay from "../apps/EunosOverlay";
import type ItemDataGear from "../data-model/ItemDataGear";
import type { AttackSchema } from "../data-model/fields/itemFields";
import type ActorDataPC from "../data-model/ActorDataPC";
import { getTemplatePath, getOwnerOfDoc } from "../scripts/utilities";
import EunosAlerts, { AlertType } from "../apps/EunosAlerts";
import EunosChatMessage, {
  type ResultRolledContext,
} from "../apps/EunosChatMessage";
import { EunosRollResult, CounterResetOn } from "../scripts/enums";

declare global {
  class EunosActor extends k4ltActor {
    isPC(): this is EunosActor & { system: ActorDataPC };
    addBasicMoves(isReplacing?: boolean): Promise<void>;
    get numSeriousWounds(): number;
    get hasUnstabilizedCriticalWound(): boolean;
    get hasFieldTendedCriticalWound(): boolean;
    get hasGrittedTeeth(): boolean;
    get hasBroken(): boolean;
    get stabilityState(): string;
    get woundState(): string;
    get armor(): number;
    get availableWeapons(): EunosItem[];
    getWoundPenaltyFor(move: EunosItem): number;
    getStabilityPenaltyFor(move: EunosItem): number;
    getStabilityConditionsPenalties(): Promise<
      Array<{
        value: number;
        name: string;
        cssClasses?: string;
      }>
    >;
    getPortraitImage(type: "bg" | "fg"): string;
    getGogglesImageSrc(): string;
    askForAttribute(): Promise<string | null>;
    moveroll(moveID: string): Promise<void>;
    resetCounters(resetOn: CounterResetOn): Promise<void>;
    awardXP(): Promise<void>;
    get nextXPKey():
      | "advancementExp1"
      | "advancementExp2"
      | "advancementExp3"
      | "advancementExp4"
      | "advancementExp5";
  }
}

export default function registerEunosActor(): void {
  // Get the original k4ltActor class from the config
  const k4Actor = CONFIG.Actor.documentClass as typeof k4ltActor;

  class EunosActor extends k4Actor {
    async createGeneralNPCs() {
      const npcImages = [
        "modules/eunos-kult-hacks/assets/images/npcs/boy-1.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/boy-2.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/boy-3.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/boy-4.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/boy-5.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/boy-6.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/boy-7.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/boy-8.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/boy-9.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/boy-10.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/boy-11.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/elderly-woman-1.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/elderly-woman-2.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/girl-1.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/man-1.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/man-2.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/man-3.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/man-4.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/woman-1.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/woman-2.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/woman-3.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/woman-4.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-1.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-2.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-3.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-4.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-5.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-6.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-7.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-8.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-9.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-10.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-11.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-12.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-man-13.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-woman-1.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-woman-2.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-woman-3.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-woman-4.webp",
        "modules/eunos-kult-hacks/assets/images/npcs/young-woman-5.webp",
      ];

      /**
       * Create a EunosActor of type "npc" for each image in the npcImages array.
       * The actor should be named by reference to the image filename,cased appropriately (i.e. "young-man-1.webp" -> "Young Man 1")
       * The actor should be placed in the "Generic NPCs" folder, which should be created if it does not exist.
       */

      // Find or create the "Generic NPCs" folder
      let folder = game.folders?.find(
        (f) => f.name === "Generic NPCs" && f.type === "Actor",
      );
      if (!folder) {
        // @ts-expect-error Folder.create is not typed
        folder = await Folder.create({
          name: "Generic NPCs",
          type: "Actor",
          parent: null,
        });
      }

      // Process each image path
      for (const imagePath of npcImages) {
        // Extract the base name without extension and path
        const baseName = imagePath.split("/").pop()?.split(".")[0] ?? "";

        // Convert kebab-case to Title Case (e.g., "young-man-1" -> "Young Man 1")
        const actorName = baseName
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        // Check if actor already exists in the folder
        const existingActor = getActors().find(
          (a) => a.name === actorName && a.folder?.id === folder!.id,
        );

        // Only create if it doesn't exist
        if (!existingActor) {
          // @ts-expect-error EunosActor.create is not typed
          await EunosActor.create({
            name: actorName,
            type: "npc",
            img: imagePath,
            folder: folder!.id,
            sort: 0,
            system: {}, // Add any default system data needed for NPCs
          });
        }
      }
    }

    isPC(): this is EunosActor & { system: ActorDataPC } {
      return this.type === "pc";
    }

    override prepareDerivedData(): void {
      super.prepareDerivedData();
      if (this.isPC() && this.hasBroken) {
        this.system.stability.max = 6;
        this.system.stability.value = Math.min(this.system.stability.value, 6);
      }
    }

    // Register your new implementation with the same function name
    async addBasicMoves(isReplacing = false) {
      if (!this.isPC()) {
        return;
      }
      if (this.items.size > 0 && !isReplacing) {
        return;
      }
      // First, remove any existing basic moves
      const basicMoves = this.items.contents.filter(
        (item) => item.type === "move",
      );
      await this.deleteEmbeddedDocuments(
        "Item",
        basicMoves.map((move) => move._id ?? ""),
      );

      const pack = getPacks().get("eunos-kult-hacks.moves");
      if (!pack) {
        throw new Error("Moves pack not found");
      }
      const index = pack.indexed ? pack.index : await pack.getIndex();
      const moves = index.map((move) =>
        pack.getDocument(move._id).then((item) => item?.toObject()),
      );
      await Promise.all(moves).then(async (objects) => {
        if (objects) {
          await this.createEmbeddedDocuments(
            "Item",
            objects.filter(Boolean) as foundry.documents.BaseItem.CreateData[],
          );
        }
      });
    }

    get numSeriousWounds(): number {
      if (!this.isPC()) {
        return 0;
      }
      return [
        this.system.majorwound1,
        this.system.majorwound2,
        this.system.majorwound3,
        this.system.majorwound4,
      ].filter((wound) => wound.state === "unstabilized").length;
    }

    override get hasUnstabilizedCriticalWound(): boolean {
      if (!this.isPC()) {
        return false;
      }
      return this.system.criticalwound.state === "unstabilized";
    }

    get hasFieldTendedCriticalWound(): boolean {
      if (!this.isPC()) {
        return false;
      }
      return this.system.criticalwound.state === "stabilized";
    }

    get hasGrittedTeeth(): boolean {
      return this.items.some((item) => item.name === "Gritted Teeth");
    }

    get hasBroken(): boolean {
      return this.items.some((item) => item.name === "Broken");
    }

    getWoundPenaltyFor(move: EunosItem): number {
      if (!this.isPC()) {
        return 0;
      }
      if (!move.isMechanicalItem()) {
        return 0;
      }
      if (move.system.specialflag === 3) {
        // Endure Injury
        return 0;
      }
      if (move.system.specialflag === 2) {
        // See Through the Illusion
        if (this.hasUnstabilizedCriticalWound) {
          return 3;
        } else if (this.hasFieldTendedCriticalWound) {
          if (this.numSeriousWounds > 0) {
            return 2;
          } else {
            return 1;
          }
        }
        return 0;
      }
      if (this.hasUnstabilizedCriticalWound) {
        return -3;
      } else if (this.hasFieldTendedCriticalWound) {
        if (this.numSeriousWounds > 0 && !this.hasGrittedTeeth) {
          return -3;
        } else {
          return -2;
        }
      } else if (this.numSeriousWounds > 1 && !this.hasGrittedTeeth) {
        return -2;
      } else if (this.numSeriousWounds === 1 && !this.hasGrittedTeeth) {
        return -1;
      }
      return 0;
    }

    getStabilityPenaltyFor(move: EunosItem): number {
      if (!this.isPC()) {
        return 0;
      }
      if (!move.isMechanicalItem()) {
        return 0;
      }
      let mod = 0;
      if (move.system.specialflag === 1) {
        // Keep It Together
        if (this.system.stability.value <= 4) {
          mod -= 2;
        } else if (this.system.stability.value <= 7) {
          mod -= 1;
        }
      }
      if (move.type === "disadvantage") {
        if (this.system.stability.value <= 4) {
          mod -= 3;
        } else if (this.system.stability.value <= 7) {
          mod -= 2;
        } else if (this.system.stability.value <= 9) {
          mod -= 1;
        }
      }
      if (move.system.specialflag === 2) {
        // See Through the Illusion
        if (this.system.stability.value <= 4) {
          mod += 1;
        }
      }
      return mod;
    }

    async getStabilityConditionsPenalties(): Promise<
      Array<{
        value: number;
        name: string;
        cssClasses?: string;
      }>
    > {
      if (!this.isPC()) {
        return [];
      }
      const conditionMap = {
        Angry: this.system.conditionAngry,
        Sad: this.system.conditionSad,
        Scared: this.system.conditionScared,
        GuiltRidden: this.system.conditionGuiltRidden,
        Obsessed: this.system.conditionObsessed,
        Distracted: this.system.conditionDistracted,
        Haunted: this.system.conditionHaunted,
      };
      const conditionPenaltyMap = {
        Angry: -1,
        Sad: -1,
        Scared: -1,
        GuiltRidden: -1,
        Obsessed: -1,
        Distracted: -2,
        Haunted: -1,
      };
      function formatConditionRow(
        conditions: Array<keyof typeof conditionMap>,
      ) {
        return `<div class="condition-buttons">
          ${conditions
            .map(
              (condition) => `
            <button class="condition-button active" data-condition="${condition}">
              <span class="active-icon">✅</span>
              <span class="inactive-icon">❌</span>
              <span class="condition-label">${condition.replace("GuiltRidden", "Guilt-Ridden")}</span>
            </button>
          `,
            )
            .join("")}
        </div>`;
      }
      const activeConditions = Object.keys(conditionMap).filter(
        (condition): condition is keyof typeof conditionMap =>
          conditionMap[condition as keyof typeof conditionMap].state ===
          "checked",
      );
      if (activeConditions.length === 0) {
        return [];
      }
      const hinderingConditions = await new Promise<Record<
        keyof typeof conditionMap,
        boolean
      > | null>((resolve) => {
        new Dialog({
          title: "Relevant Conditions",
          content: `
            <div class="stability-condition-dialog">
              <label>Disable Inapplicable Conditions</label>
              ${formatConditionRow(activeConditions)}
            </div>`,
          default: "one",
          buttons: {
            one: {
              label: "Ok",
              callback: (html: HTMLElement | JQuery) => {
                resolve(
                  Object.fromEntries(
                    activeConditions.map((condition) => [
                      condition,
                      $(html)
                        .find(`button[data-condition="${condition}"]`)
                        .hasClass("active"),
                    ]),
                  ) as Record<keyof typeof conditionMap, boolean>,
                );
              },
            },
            cancel: {
              label: "❌",
              callback: () => {
                resolve(null);
              },
            },
          },
          render: (html: HTMLElement | JQuery) => {
            $(html)
              .closest(".app.window-app.dialog")
              .addClass("blurred-bg-dialog stability-condition-dialog");
            $(html)
              .find(".condition-button")
              .on("click", function (event) {
                event.preventDefault();
                $(event.currentTarget).toggleClass("active");
              });
          },
        }).render(true);
      });
      if (hinderingConditions === null) {
        return [];
      }
      kLog.log("Hindering Conditions => ", hinderingConditions);
      kLog.log(
        "Hindering Conditions total => ",
        -1 * Object.values(hinderingConditions).filter(Boolean).length -
          (hinderingConditions.Distracted ? 1 : 0),
      );
      return Object.entries(hinderingConditions)
        .filter(([_, value]) => value)
        .map(([key]) => ({
          value: conditionPenaltyMap[key as keyof typeof conditionPenaltyMap],
          name: key,
          cssClasses: "modifier-negative",
        }));
    }

    get armor(): number {
      const gearItems = this.items.filter(
        (item) =>
          item.type === "gear" && (item.system as ItemDataGear).isEquipped,
      ) as Array<EunosItem & { system: ItemDataGear }>;
      return gearItems.reduce((acc, gear) => acc + (gear.system.armor ?? 0), 0);
    }

    get availableWeapons(): EunosItem[] {
      return this.items.filter(
        (item) =>
          item.isWeapon() &&
          item.system.isEquipped &&
          item.system.availableAttacks.length > 0,
      );
    }

    get stabilityState(): string {
      if (!this.isPC()) {
        return "";
      }
      if (this.system.stability.value === 0) {
        return "Broken";
      }
      if (this.system.stability.value === 10) {
        return "Composed";
      }
      if (this.system.stability.value >= 8) {
        return "Moderately Stressed";
      }
      if (this.system.stability.value >= 5) {
        return "Seriously Stressed";
      }
      return "Critically Stressed";
    }

    get woundState(): string {
      if (!this.isPC()) {
        return "";
      }
      if (this.hasUnstabilizedCriticalWound) {
        return "MORTALLY WOUNDED";
      }
      if (this.hasFieldTendedCriticalWound) {
        return "Critically Wounded";
      }
      if (this.hasUnstabilizedMajorWounds) {
        return "Wounded";
      }
      return "";
    }

    get nextXPKey():
      | "advancementExp1"
      | "advancementExp2"
      | "advancementExp3"
      | "advancementExp4"
      | "advancementExp5" {
      if (!this.isPC()) {
        throw new Error("nextXPKey is only available for PCs");
      }
      const curXP = Math.max(
        0,
        (
          [
            "advancementExp1",
            "advancementExp2",
            "advancementExp3",
            "advancementExp4",
            "advancementExp5",
          ] as const
        ).findIndex((xp) => this.system[xp].state === "none"),
      );
      return `advancementExp${curXP + 1}` as
        | "advancementExp1"
        | "advancementExp2"
        | "advancementExp3"
        | "advancementExp4"
        | "advancementExp5";
    }

    public async resetCounters(resetOn: CounterResetOn): Promise<void> {
      if (!this.isPC()) {
        return;
      }
      const itemsToReset = this.items.filter((item) => item.hasCounter() && item.system.counterResetsOn === resetOn);

      if (itemsToReset.length > 0) {
        // Create an array of update data objects for each item that needs to be reset
        const updateData = itemsToReset.map(item => ({
          _id: item.id,
          "system.counterCount": 0
        }));

        // Update all items at once using updateEmbeddedDocuments
        await this.updateEmbeddedDocuments("Item", updateData);
      }
    }

    public async awardXP(): Promise<void> {
      if (!this.isPC()) {
        throw new Error("awardXP is only available for PCs");
      }
      const xpKey = this.nextXPKey;
      await this.update({ system: { [xpKey]: { state: "checked" } } });
      if (xpKey === "advancementExp5") {
        void EunosAlerts.Alert({
          type: AlertType.advancementReward,
          header: "You've Gained an Advancement!",
          body: "Between sessions, navigate to the 'Advancement' tab on your sheet and choose one of the available options.",
          target: getOwnerOfDoc(this)?.id ?? undefined,
        });
      }
    }

    getPortraitImage(type: "bg" | "fg"): string {
      const img = this.img as string;
      if (type === "bg") {
        const imgParts = [img.replace(".webp", "")];
        // ["https://assets.forge-vtt.com/611b8f58cee1c3b8c7f83ba3/modules/eunos-kult-hacks/assets/images/pcs/jesus-de-costa-fg-color"]
        imgParts.push("-bg-color");
        switch (this.stabilityState) {
          case "Broken": {
            return "";
          }
          case "Critically Stressed": {
            imgParts.push("-critical-stress");
            break;
          }
          case "Seriously Stressed": {
            imgParts.push("-serious-stress");
            break;
          }
          case "Moderately Stressed": {
            imgParts.push("-moderate-stress");
            break;
          }
        }
        imgParts.push(".webp");
        // kLog.log(`Portrait Image ${type} '${img}' => `, imgParts.join(""));
        return imgParts.join("");
      }
      // kLog.log(`Portrait Image ${type} (!== "bg") '${img}' => `, img.replace(".webp", "-fg-color.webp"));
      return img.replace(".webp", "-fg-color.webp");
    }

    getGogglesImageSrc(): string {
      if (!this.isPC() && /-\d+\.webp$/.test(this.img as string)) {
        return (this.img as string).replace(
          /-(\d+)\.webp$/,
          "-$1-goggles.webp",
        );
      }
      return this.img as string;
    }

    async displayRollToChat({
      roll,
      attribute,
      modifiers,
      source,
      resultText,
      optionsText,
      rollMode,
    }: {
      roll: Roll;
      attribute: string;
      modifiers: Array<{
        value: number;
        name: string;
        cssClasses?: string;
      }>;
      source: EunosItem;
      resultText: string;
      optionsText: string;
      rollMode: string;
    },
      auxChatContent$?: JQuery,
    ) {
      if (!this.isPC()) {
        return;
      }

      const dieVals = roll.dice
        .map((die) => die.values)
        .flat()
        .filter(Boolean);

      if (dieVals.length !== 2) {
        kLog.error(`Kult rolls require two dice, found ${dieVals.length} dice: ${dieVals.join(", ")}`, {roll, dice: roll.dice, dieVals});
        throw new Error(
          `Kult rolls require two dice, found ${dieVals.length} dice: ${dieVals.join(", ")}`,
        );
      }

      const total = Math.max(0, roll.total ?? 0);

      const outcome: EunosRollResult = total >= 15
        ? EunosRollResult.completeSuccess
        : total >= 10
        ? EunosRollResult.partialSuccess
        : EunosRollResult.failure;

      const themeCSSClasses: string[] = [];

      switch (outcome) {
        case EunosRollResult.completeSuccess: {
          themeCSSClasses.push("k4-theme-gold", "roll-result-completeSuccess");
          break;
        }
        case EunosRollResult.partialSuccess: {
          themeCSSClasses.push("k4-theme-gold", "roll-result-partialSuccess");
          break;
        }
        case EunosRollResult.failure: {
          themeCSSClasses.push("k4-theme-gold", "roll-result-failure");
          break;
        }
      }

      const isWideDropCap = this.name.startsWith("M") || this.name.startsWith("W");
      const templateData: ResultRolledContext = {
        cssClass: `chat-roll-result roll-result-${outcome} ${isWideDropCap ? "wide-drop-cap" : ""}`,
        rollerName: this.name.split(" ")[0] as string,
        isWideDropCap,
        attribute,
        attrType: ["fortitude", "willpower", "reflexes"].includes(
          attribute.toLowerCase(),
        )
          ? "passive"
          : "active",
        attrVal:
          this.system.attributes[
            attribute.toLowerCase() as keyof typeof this.system.attributes
          ] ?? 0,
        sourceName: source.name,
        sourcePrefix: source.type === "move" ? "to …" : "for",
        sourceImg: source.img as string,
        dice: dieVals as [number, number],
        modifiers,
        total,
        outcome,
        resultText,
        optionsText,
      };

      const contents: string[] = [
        await renderTemplate(
          getTemplatePath("sidebar", "result-rolled.hbs"),
          templateData,
        ),
      ];

      if (auxChatContent$) {
        const chatContent$ = $(contents.join("\n"));
        // Locate the ".roll-source-header" element, and append auxChatContent$ as its next sibling
        const rollSourceHeader$ = chatContent$.find(".roll-source-header");
        if (rollSourceHeader$.length > 0) {
          rollSourceHeader$.after(auxChatContent$);
        }
        // Clear the contents array.
        contents.length = 0;
        // Push the new chat content with outer HTML.
        contents.push((chatContent$.prop('outerHTML') as Maybe<string>) ?? "");
      }

      const chatData = {
        speaker: EunosChatMessage.getSpeaker({ alias: this.name }),
        content: contents.join("\n"),
        rolls: [roll],
        rollMode: rollMode,
        flags: {
          "eunos-kult-hacks": {
            cssClasses: themeCSSClasses,
            isSummary: false,
            isAnimated: true,
            isRoll: true,
            isTrigger: false,
            rollOutcome: outcome,
            isEdge: false
          }
        }
      };

      // Appliquer les destinataires pour le mode gmroll
      if (rollMode === "gmroll") {
        // @ts-expect-error ChatMessage.getWhisperRecipients is not typed
        chatData.whisper = EunosChatMessage.getWhisperRecipients("GM");
      }

      kLog.log("chatData => ", chatData);
      // @ts-expect-error ChatMessage.create is not typed
      await EunosChatMessage.create(chatData);
    }

    async askForAttribute(): Promise<string | null> {
      const passiveAttributes = ["Reflexes", "Willpower", "Fortitude"];
      const mainAttributes = [
        "Reason",
        "Intuition",
        "Perception",
        "Coolness",
        "Violence",
        "Charisma",
        "Soul",
      ];

      function formatAttributeButtons(attributes: string[]) {
        return `<div class="attribute-buttons">
          ${attributes
            .map(
              (attribute) => `
            <button class="attribute-button" data-attribute="${attribute.toLowerCase()}">
              <span class="attribute-label">${getLocalizer().localize(`k4lt.${attribute}`)}</span>
            </button>
          `,
            )
            .join("")}
        </div>`;
      }

      const result = await new Promise<string | null>((resolve) => {
        new Dialog({
          title: getLocalizer().localize("k4lt.AskAttribute"),
          content: `
            <div class="attribute-select-dialog">
              <label>Select Attribute</label>
              ${formatAttributeButtons(passiveAttributes)}
              ${formatAttributeButtons(mainAttributes)}
              ${formatAttributeButtons(["None"])}
            </div>
          `,
          buttons: {
            cancel: {
              label: "❌",
              callback: () => {
                resolve(null);
              },
            },
          },
          render: (html: HTMLElement | JQuery) => {
            $(html)
              .closest(".app.window-app.dialog")
              .addClass("blurred-bg-dialog attribute-select-dialog");
            $(html)
              .find(".attribute-button")
              .on("click", function (event) {
                const value = $(event.currentTarget).data(
                  "attribute",
                ) as string;
                resolve(value);
                $(event.currentTarget)
                  .closest(".dialog")
                  .find(".close")
                  .trigger("click");
              });
          },
          default: "cancel",
        }).render(true);
      });

      return result;
    }

    override async moveroll(moveID: string) {
      if (!this.isPC()) {
        return;
      }
      kLog.log("Actor Data => ", this);

      const move = this.items.get(moveID);
      if (!move) {
        getNotifier().warn(getLocalizer().localize("k4lt.MoveNotFound"));
        return;
      }
      kLog.log("Move => ", move);

      if (move.isMechanicalItem()) {
        const moveSystemType = move.system.type; // active ou passive
        const moveType = move.type; // advantage, disadvantage...
        const moveName = move.name;
        kLog.log("Move => ", { move, moveType, moveName, moveSystemType });

        if (moveSystemType === "active") {
          const attr =
            move.system.attributemod == "ask"
              ? await this.askForAttribute()
              : move.system.attributemod;

          kLog.log("Attribute => ", attr);

          // if (!attr) { return; }

          const {
            completesuccess,
            options,
            showOptionsFor,
            failure,
            partialsuccess,
            specialflag,
          } = move.system;

          const simpleOptionsCheck = {
            [EunosRollResult.completeSuccess]: showOptionsFor.success,
            [EunosRollResult.partialSuccess]: showOptionsFor.partial,
            [EunosRollResult.failure]: showOptionsFor.failure,
          }

          let auxChatContent$: Maybe<JQuery> = undefined;

          const modifiers: Array<{
            value: number;
            name: string;
            cssClasses?: string;
          }> = [];

          const woundPenalty = this.getWoundPenaltyFor(move);
          if (woundPenalty) {
            modifiers.push({
              value: woundPenalty,
              name: "Wounds",
              cssClasses: "modifier-negative",
            });
          }

          const stabilityPenalty = this.getStabilityPenaltyFor(move);
          if (stabilityPenalty) {
            modifiers.push({
              value: stabilityPenalty,
              name: "Stability",
              cssClasses: "modifier-negative",
            });
          }

          const stabilityConditionPenalties = await this.getStabilityConditionsPenalties();
          modifiers.push(...stabilityConditionPenalties);

          if (this.system.forward) {
            modifiers.push({
              value: this.system.forward,
              name: "One-Time Modifier",
              cssClasses: this.system.forward > 0 ? "modifier-positive" : "modifier-negative",
            })
          }

          if (this.system.ongoing) {
            modifiers.push({
              value: this.system.ongoing,
              name: "Ongoing Modifier",
              cssClasses: this.system.ongoing > 0 ? "modifier-positive" : "modifier-negative",
            })
          }

          if (specialflag === 3) { // Endure Injury
            const boxoutput = await new Promise<{ harm_value: number | null }>(
              (resolve) => {
                new Dialog({
                  title: getLocalizer().localize("k4lt.EndureInjury"),
                  content: `
                    <div class="endure-harm-dialog">
                      <label>Incoming Harm</label>
                      <div class="harm-buttons">
                        ${[1, 2, 3, 4, 5, 6]
                          .map(
                            (num) =>
                              `<button class="harm-button" data-value="${num}">${num}</button>`,
                          )
                          .join("")}
                      </div>
                    </div>`,
                  buttons: {
                    cancel: {
                      label: "❌",
                      callback: () => {
                        resolve({ harm_value: null });
                      },
                    },
                  },
                  render: function (html: HTMLElement | JQuery) {
                    $(html)
                      .closest(".app.window-app.dialog")
                      .addClass("blurred-bg-dialog endure-harm-dialog");
                    $(html)
                      .find(".harm-button")
                      .on("click", function (event) {
                        const value = Number(
                          event.currentTarget.dataset["value"],
                        );
                        resolve({ harm_value: value });
                        $(event.currentTarget)
                          .closest(".dialog")
                          .find(".close")
                          .trigger("click");
                      });
                  },
                  default: "cancel",
                }).render(true);
              },
            );

            if (boxoutput.harm_value === null) {
              return;
            }

            modifiers.push({
              value: -1 * boxoutput.harm_value,
              name: "Harm",
              cssClasses: "modifier-negative",
            });

            if (this.armor > 0) {
              modifiers.push({
                value: this.armor,
                name: "Armor",
                cssClasses: "modifier-positive",
              });
            }
          } else if (specialflag === 4) { // Engage In Combat
            const content = await renderTemplate(
              getTemplatePath("dialog", "dialog-engage-in-combat.hbs"),
              this,
            );
            const dialogOutput = await new Promise<Maybe<{
              weapon: EunosItem;
              index: number;
            }> | null>((resolve) => {
              new Dialog({
                title: "Select Attack",
                content,
                buttons: {
                  submit: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Ok",
                    callback: (html) => {
                      const selectedAttack = $(html).find(
                        ".weapon-attack-block[data-is-selected='true']",
                      );
                      const weaponID = selectedAttack.data(
                        "item-id",
                      ) as Maybe<string>;
                      const attackIndex = selectedAttack.data(
                        "attack-index",
                      ) as Maybe<string>;
                      if (!weaponID || attackIndex === undefined) {
                        getNotifier().warn("Weapon or attack index not found");
                        return;
                      }
                      const weapon = this.items.get(weaponID);
                      if (!weapon?.isWeapon()) {
                        getNotifier().warn("Weapon not found");
                        return;
                      }
                      const attack =
                        weapon.system.availableAttacks[parseInt(attackIndex)];
                      if (!attack) {
                        getNotifier().warn("Attack not found");
                        return;
                      }
                      // Subtract ammo cost from weapon ammo
                      if (attack.ammoCost && weapon.system.ammo?.value) {
                        void this.updateEmbeddedDocuments("Item", [
                          {
                            _id: weapon._id,
                            "system.ammo.value":
                              weapon.system.ammo.value - attack.ammoCost,
                          },
                        ]);
                      }
                      resolve({
                        weapon,
                        index: Number(attackIndex),
                      });
                    },
                  },
                  cancel: {
                    label: "❌",
                    callback: () => {
                      resolve(null);
                    },
                  },
                },
                render: (html) => {
                  // Add click handlers for each weapon attack block, which will update the data-is-selected attribute to true
                  // and set all other data-is-selected attributes to false
                  const html$ = $(html);
                  const weaponAttackBlocks$ = html$.find(
                    ".weapon-attack-block",
                  );
                  weaponAttackBlocks$.on({
                    click: (event) => {
                      weaponAttackBlocks$.attr("data-is-selected", "false");
                      $(event.currentTarget).attr("data-is-selected", "true");
                      html$
                        .find(".dialog-button.submit")
                        .prop("disabled", false);
                    },
                  });

                  // If there is only one weapon being displayed, and if one of its attacks 'isDefault', select it by default
                  if (html$.find(".weapon-card-container").length === 1) {
                    const defaultAttackBlock$ = html$.find(
                      ".weapon-attack-block[data-attack-index='0']",
                    );
                    if (defaultAttackBlock$.length > 0) {
                      $(defaultAttackBlock$).attr("data-is-selected", "true");
                    }
                  }

                  // If there are no selected attacks, disable the submit button
                  const selectedAttackBlocks$ = html$.find(
                    ".weapon-attack-block[data-is-selected='true']",
                  );
                  if (selectedAttackBlocks$.length === 0) {
                    html$.find(".dialog-button.submit").prop("disabled", true);
                  } else {
                    html$.find(".dialog-button.submit").prop("disabled", false);
                  }
                },
                default: "submit",
              }).render(true);
            });
            if (dialogOutput === null) {
              return;
            }
            if (dialogOutput?.weapon && dialogOutput?.index !== undefined) {
              auxChatContent$ =
                $(dialogOutput.weapon.getAttackChatMessage(dialogOutput.index));
            }
          }

          kLog.log("Modifiers => ", modifiers);

          const attrVal = attr ? this.system.attributes[attr as keyof ActorDataPC["attributes"]] ?? 0 : 0;
          const modTotal = modifiers.reduce((acc, mod) => acc + mod.value, 0);

          const r = new Roll(
            `2d10 + ${attrVal} + ${modTotal}`,
          );
          await r.evaluate();

          if (typeof r.total !== "number") {
            getNotifier().warn("Roll total is not a number.");
            return;
          }

          const outcome = r.total >= 15
            ? EunosRollResult.completeSuccess
            : r.total >= 10
            ? EunosRollResult.partialSuccess
            : EunosRollResult.failure;

          const resultText = {
            [EunosRollResult.completeSuccess]: completesuccess ?? "",
            [EunosRollResult.partialSuccess]: partialsuccess ?? "",
            [EunosRollResult.failure]: failure ?? "",
          }[outcome] ?? "";

          await this.update({ system: { forward: 0 } });

          const rollMode = getSettings().get("core", "rollMode");

          await this.displayRollToChat({
            roll: r,
            attribute: attr ?? "zero",
            modifiers,
            source: move,
            resultText,
            optionsText: simpleOptionsCheck[outcome] ? (options ?? "") : "",
            rollMode: rollMode ?? "",
          }, auxChatContent$);
        } else {
          await move.showInChat();
        }
      }
    }

    override _onUpdate(...args: Parameters<Actor["_onUpdate"]>): void {
      super._onUpdate(...args);
      if (!this.isPC()) {
        return;
      }
      void EunosOverlay.instance.updateStabilityBG(this);
      if (!getUser().isGM) {
        return;
      }
      if (EunosOverlay.instance.isAssigningDramaticHooks) {
        EunosOverlay.instance.updateDramaticHookAssignmentPopUp(
          getOwnerOfDoc(this)?.id ?? "",
          this.system.dramatichooks.assignedHook ?? "",
        );
      }
    }
  }

  // Replace the default Actor class with our extended version
  CONFIG.Actor.documentClass = EunosActor;
}
