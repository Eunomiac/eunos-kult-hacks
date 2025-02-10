import EunosItem from "./EunosItem";
import type ItemDataGear from "../data-model/ItemDataGear";
import type ActorDataPC from "../data-model/ActorDataPC";

declare global {
  class EunosActor extends k4ltActor {
    isPC(): this is EunosActor & { system: ActorDataPC };
    get numSeriousWounds(): number;
    get hasUnstabilizedCriticalWound(): boolean;
    get hasFieldTendedCriticalWound(): boolean;
    get hasGrittedTeeth(): boolean;
    get hasBroken(): boolean;
    get stabilityState(): string;
    get armor(): number;
    getWoundPenaltyFor(move: EunosItem): number;
    getStabilityPenaltyFor(move: EunosItem): number;
    getStabilityConditionsPenalty(): Promise<number>;
    moveroll(moveID: string): Promise<void>;
  }
}

export default function registerEunosActor(): void {
  // Get the original k4ltActor class from the config
  const k4Actor = CONFIG.Actor.documentClass as typeof k4ltActor;

  class EunosActor extends k4Actor {
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

    get numSeriousWounds(): number {
      if (!this.isPC()) { return 0; }
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
        Haunted: this.system.conditionHaunted
      };
      function formatConditionRow(conditions: Array<keyof typeof conditionMap>) {
        return `<div class="flex-row">
        ${conditions.map((condition) => `
          <span class="condition-checkbox">
            <input type="checkbox" name="condition-${condition}" id="condition-${condition}" checked>
            <label for="condition-${condition}">${condition}</label>
          </span>
        `).join("")}
        </div>`
      }
      const activeConditions = Object.keys(conditionMap).filter((condition): condition is keyof typeof conditionMap => conditionMap[condition as keyof typeof conditionMap].state === "checked");
      if (activeConditions.length === 0) {
        return 0;
      }
      const hinderingConditions = await new Promise<Record<keyof typeof conditionMap, boolean>>(
        (resolve) => {
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
                      activeConditions.map(condition => [
                        condition,
                        // Check if checkbox is checked
                        (document.getElementById(`condition-${condition}`) as HTMLInputElement).checked
                      ])
                    ) as Record<keyof typeof conditionMap, boolean>
                  );
                },
              },
            },
          }).render(true);
        },
      );
      kultLogger("Hindering Conditions => ", hinderingConditions);
      kultLogger("Hindering Conditions total => ", -1 * Object.values(hinderingConditions).filter(Boolean).length - (hinderingConditions.Distracted ? 1 : 0));
      return -1 * Object.values(hinderingConditions).filter(Boolean).length - (hinderingConditions.Distracted ? 1 : 0);
    }

    get armor(): number {
      const gearItems = this.items.filter(
        (item) =>
          item.type === "gear" && (item.system as ItemDataGear).isEquipped,
      ) as Array<EunosItem & { system: ItemDataGear }>;
      return gearItems.reduce((acc, gear) => acc + (gear.system.armor ?? 0), 0);
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


    override async displayRollResult({ roll, moveName, result, resultText, moveResultText, optionsText, rollMode }: { roll: Roll, moveName: string, result: string, resultText: string, moveResultText: string, optionsText: string, rollMode: string }) {
      const templateData = {
        total: Math.max(0, roll.total ?? 0),
        result: roll.result,
        moveName: moveName,
        resultClass: `roll-result-${result}`,
        resultText: resultText,
        moveResultText: moveResultText,
        optionsText: optionsText
      };

      const content = await renderTemplate("modules/eunos-kult-hacks/templates/apps/chat/roll-card.hbs", templateData);

      const chatData = {
        speaker: ChatMessage.getSpeaker({ alias: this.name }),
        content: content,
        rolls: [roll],
        rollMode: rollMode
      };

      // Appliquer les destinataires pour le mode gmroll
      if (rollMode === "gmroll") {
        // @ts-expect-error ChatMessage.getWhisperRecipients is not typed
        chatData.whisper = ChatMessage.getWhisperRecipients("GM");
      }

      kultLogger("chatData => ", chatData);
      // @ts-expect-error ChatMessage.create is not typed
      void ChatMessage.create(chatData);
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
          const stabilityConditionsPenalty = await this.getStabilityConditionsPenalty();
          const situation = woundPenalty + stabilityPenalty + stabilityConditionsPenalty;
          const forward: number = this.system.forward ?? 0;
          let ongoing: number = this.system.ongoing ?? 0;

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
          }
          kultLogger("Forward => ", forward);
          kultLogger("Ongoing => ", ongoing);
          kultLogger("Wound Penalty => ", woundPenalty);
          kultLogger("Stability Penalty => ", stabilityPenalty);
          kultLogger("Stability Conditions Penalty => ", stabilityConditionsPenalty);

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
          await this.update({system: {forward: 0}});
          kultLogger(`Forward is ${this.system.forward}`);

          let rollMode = getSettings().get("core", "rollMode");
          if (moveType == "disadvantage") {
            rollMode = "gmroll";
            kultLogger("rollMode => ", rollMode);
          }

          if (r.total >= 15) {
            await this.displayRollResult({
              roll: r,
              moveName,
              result: "completesuccess",
              resultText: getLocalizer().localize("k4lt.Success"),
              moveResultText: completesuccess ?? "",
              optionsText: showOptionsFor.success ? options ?? "" : "",
              rollMode: rollMode ?? "",
            });
          } else if (r.total < 10) {
            await this.displayRollResult({
              roll: r,
              moveName,
              result: "failure",
              resultText: getLocalizer().localize("k4lt.Failure"),
              moveResultText: failure ?? "",
              optionsText: showOptionsFor.failure ? options ?? "" : "",
              rollMode: rollMode ?? "",
            });
          } else {
            await this.displayRollResult({
              roll: r,
              moveName,
              result: "partialsuccess",
              resultText: getLocalizer().localize("k4lt.PartialSuccess"),
              moveResultText: partialsuccess ?? "",
              optionsText: showOptionsFor.partial ? options ?? "" : "",
              rollMode: rollMode ?? "",
            });
          }
        } else {
          await move.showInChat();
        }
      }
    }
  }

  // Replace the default Actor class with our extended version
  CONFIG.Actor.documentClass = EunosActor;
}
