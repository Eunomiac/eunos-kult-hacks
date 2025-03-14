import EunosItem from "./EunosItem";
import EunosOverlay from "../apps/EunosOverlay";
import type ItemDataGear from "../data-model/ItemDataGear";
import type { AttackSchema } from "../data-model/fields/itemFields";
import type ActorDataPC from "../data-model/ActorDataPC";
import { getTemplatePath } from "../scripts/utilities";

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
    getStabilityConditionsPenalty(): Promise<number>;
    getPortraitImage(type: "bg" | "fg"): string;
    getGogglesImageSrc(): Maybe<string>;
    moveroll(moveID: string): Promise<void>;
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

    async getStabilityConditionsPenalty(): Promise<number> {
      if (!this.isPC()) {
        return 0;
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
      function formatConditionRow(
        conditions: Array<keyof typeof conditionMap>,
      ) {
        return `<div class="flex-row">
        ${conditions
          .map(
            (condition) => `
          <span class="condition-checkbox">
            <input type="checkbox" name="condition-${condition}" id="condition-${condition}" checked>
            <label for="condition-${condition}">${condition}</label>
          </span>
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
        return 0;
      }
      const hinderingConditions = await new Promise<
        Record<keyof typeof conditionMap, boolean>
      >((resolve) => {
        new Dialog({
          title: "Relevant Conditions",
          content: `<div class="stability-condition-dialog"><label>Which Stability Conditions Apply to This Roll?</label>${formatConditionRow(activeConditions)}</div>`,
          default: "one",
          buttons: {
            one: {
              label: "Ok",
              callback: () => {
                resolve(
                  Object.fromEntries(
                    activeConditions.map((condition) => [
                      condition,
                      // Check if checkbox is checked
                      (
                        document.getElementById(
                          `condition-${condition}`,
                        ) as HTMLInputElement
                      ).checked,
                    ]),
                  ) as Record<keyof typeof conditionMap, boolean>,
                );
              },
            },
          },
        }).render(true);
      });
      kultLogger("Hindering Conditions => ", hinderingConditions);
      kultLogger(
        "Hindering Conditions total => ",
        -1 * Object.values(hinderingConditions).filter(Boolean).length -
          (hinderingConditions.Distracted ? 1 : 0),
      );
      return (
        -1 * Object.values(hinderingConditions).filter(Boolean).length -
        (hinderingConditions.Distracted ? 1 : 0)
      );
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

    getGogglesImageSrc(): Maybe<string> {
      if (this.isPC()) {
        return;
      }
      if (/-\d+\.webp$/.test(this.img as string)) {
        return (this.img as string).replace(
          /-(\d+)\.webp$/,
          "-$1-goggles.webp",
        );
      }
      return;
    }

    override async displayRollResult(
      {
        roll,
        moveName,
        result,
        resultText,
        moveResultText,
        optionsText,
        rollMode,
      }: {
        roll: Roll;
        moveName: string;
        result: string;
        resultText: string;
        moveResultText: string;
        optionsText: string;
        rollMode: string;
      },
      secondMessageContent?: string,
    ) {
      const templateData = {
        total: Math.max(0, roll.total ?? 0),
        result: roll.result,
        moveName: moveName,
        resultClass: `roll-result-${result}`,
        resultText: resultText,
        moveResultText: moveResultText,
        optionsText: optionsText,
      };

      const contents: string[] = [
        await renderTemplate(
          getTemplatePath("apps/chat", "roll-card.hbs"),
          templateData,
        ),
      ];

      if (secondMessageContent) {
        contents.push(secondMessageContent);
      }

      const chatData = {
        speaker: ChatMessage.getSpeaker({ alias: this.name }),
        content: contents.join("\n"),
        rolls: [roll],
        rollMode: rollMode,
      };

      // Appliquer les destinataires pour le mode gmroll
      if (rollMode === "gmroll") {
        // @ts-expect-error ChatMessage.getWhisperRecipients is not typed
        chatData.whisper = ChatMessage.getWhisperRecipients("GM");
      }

      kultLogger("chatData => ", chatData);
      // @ts-expect-error ChatMessage.create is not typed
      await ChatMessage.create(chatData);
    }

    override async moveroll(moveID: string) {
      if (!this.isPC()) {
        return;
      }
      kultLogger("Actor Data => ", this);

      const move = this.items.get(moveID);
      if (!move) {
        getNotifier().warn(getLocalizer().localize("k4lt.MoveNotFound"));
        return;
      }
      kultLogger("Move => ", move);

      if (move.isMechanicalItem()) {
        const moveSystemType = move.system.type; // active ou passive
        const moveType = move.type; // advantage, disadvantage...
        const moveName = move.name;
        kultLogger("Move => ", { moveType, moveName, moveSystemType });

        if (moveSystemType === "active") {
          const attr =
            move.system.attributemod == "ask"
              ? await this._attributeAsk()
              : move.system.attributemod;

          kultLogger("Attribute => ", attr);

          const {
            completesuccess,
            options,
            showOptionsFor,
            failure,
            partialsuccess,
            specialflag,
          } = move.system;

          let mod = 0;
          let harm = 0;
          const woundPenalty = this.getWoundPenaltyFor(move);
          const stabilityPenalty = this.getStabilityPenaltyFor(move);
          const stabilityConditionsPenalty =
            await this.getStabilityConditionsPenalty();
          const situation =
            woundPenalty + stabilityPenalty + stabilityConditionsPenalty;
          const forward: number = this.system.forward ?? 0;
          let ongoing: number = this.system.ongoing ?? 0;

          let secondChatMessageContent: Maybe<string> = undefined;

          if (specialflag === 3) {
            // Endure Injury
            const boxoutput = await new Promise<{ harm_value: number }>(
              (resolve) => {
                new Dialog({
                  title: getLocalizer().localize("k4lt.EndureInjury"),
                  content: `<div class="endure-harm-dialog"><label>${getLocalizer().localize("k4lt.EndureInjuryDialog")}</label><input id="harm_value" data-type="number" type="number"></div>`,
                  default: "one",
                  buttons: {
                    one: {
                      label: "Ok",
                      callback: () => {
                        resolve({
                          harm_value: Number(
                            (
                              document.getElementById(
                                "harm_value",
                              ) as HTMLInputElement
                            ).value,
                          ),
                        });
                      },
                    },
                  },
                }).render(true);
              },
            );
            harm = boxoutput.harm_value;
            ongoing += this.armor;
          } else if (specialflag === 4) {
            // Engage In Combat
            const content = await renderTemplate(
              getTemplatePath("dialog", "dialog-engage-in-combat.hbs"),
              this,
            );
            const dialogOutput = await new Promise<
              Maybe<{ weapon: EunosItem; index: number }>
            >((resolve) => {
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
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
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
            if (
              dialogOutput &&
              dialogOutput.weapon &&
              dialogOutput.index !== undefined
            ) {
              secondChatMessageContent =
                dialogOutput.weapon.getAttackChatMessage(dialogOutput.index);
            }
          }
          kultLogger("Forward => ", forward);
          kultLogger("Ongoing => ", ongoing);
          kultLogger("Wound Penalty => ", woundPenalty);
          kultLogger("Stability Penalty => ", stabilityPenalty);
          kultLogger(
            "Stability Conditions Penalty => ",
            stabilityConditionsPenalty,
          );

          if (attr != "" && attr != "none") {
            mod =
              this.system.attributes[attr as keyof ActorDataPC["attributes"]] ??
              0;
          }

          kultLogger("Attribute Mod => ", mod);
          kultLogger("Situation Mod => ", situation);
          kultLogger("Harm => ", harm);

          const r = new Roll(
            `2d10 + ${mod} + ${ongoing} + ${forward} + ${situation} - ${harm}`,
          );
          await r.evaluate();

          if (typeof r.total !== "number") {
            getNotifier().warn("Roll total is not a number.");
            return;
          }
          await this.update({ system: { forward: 0 } });
          kultLogger(`Forward is ${this.system.forward}`);

          let rollMode = getSettings().get("core", "rollMode");
          if (moveType == "disadvantage") {
            rollMode = "gmroll";
            kultLogger("rollMode => ", rollMode);
          }

          if (r.total >= 15) {
            await this.displayRollResult(
              {
                roll: r,
                moveName,
                result: "completesuccess",
                resultText: getLocalizer().localize("k4lt.Success"),
                moveResultText: completesuccess ?? "",
                optionsText: showOptionsFor.success ? (options ?? "") : "",
                rollMode: rollMode ?? "",
              },
              secondChatMessageContent,
            );
          } else if (r.total < 10) {
            await this.displayRollResult(
              {
                roll: r,
                moveName,
                result: "failure",
                resultText: getLocalizer().localize("k4lt.Failure"),
                moveResultText: failure ?? "",
                optionsText: showOptionsFor.failure ? (options ?? "") : "",
                rollMode: rollMode ?? "",
              },
              secondChatMessageContent,
            );
          } else {
            await this.displayRollResult(
              {
                roll: r,
                moveName,
                result: "partialsuccess",
                resultText: getLocalizer().localize("k4lt.PartialSuccess"),
                moveResultText: partialsuccess ?? "",
                optionsText: showOptionsFor.partial ? (options ?? "") : "",
                rollMode: rollMode ?? "",
              },
              secondChatMessageContent,
            );
          }
        } else {
          await move.showInChat();
        }
      }
    }

    override _onUpdate(...args: Parameters<Actor["_onUpdate"]>): void {
      super._onUpdate(...args);
      // if (!this.isPC()) { return; }
      void EunosOverlay.instance.updateStabilityBG(this);
    }
  }

  // Replace the default Actor class with our extended version
  CONFIG.Actor.documentClass = EunosActor;
}
