import type ItemDataAbility from "../data-model/ItemDataAbility";
import type ItemDataAdvantage from "../data-model/ItemDataAdvantage";
import type ItemDataDisadvantage from "../data-model/ItemDataDisadvantage";
import type ItemDataLimitation from "../data-model/ItemDataLimitation";
import type ItemDataMove from "../data-model/ItemDataMove";
import type ItemDataWeapon from "../data-model/ItemDataWeapon";
import type ItemDataGear from "../data-model/ItemDataGear";
import type ItemDataDarkSecret from "../data-model/ItemDataDarkSecret";
import type ItemDataRelationship from "../data-model/ItemDataRelationship";
import type {CounterResetOn} from "../scripts/enums";
import EunosChatMessage, {type ResultRolledContext} from "../apps/EunosChatMessage";
import {getTemplatePath} from "../scripts/utilities";

export default class EunosItem extends Item {

  // static async MigrateTokenData(isSafe = true) {
  //   const items: EunosItem[] = getItems();
  //   const pcs: EunosActor[] = getActors().filter((actor) => actor.type === "pc");
  //   const embeddedItems: EunosItem[] = pcs.flatMap((pc) => pc.items.contents);
  //   let counter = 5;

  //   await Promise.all([
  //     ...items,
  //     ...embeddedItems
  //   ].map(async (item, i, items) => {
  //     if (counter <= 0) {
  //     kLog.error("Migration Interrupted: Test Migrated Items:", items.map((item) => item.name));
  //     throw new Error("Interruption. See console for details.");
  //   }
  //     const system = item.system as ItemDataMove | ItemDataAdvantage | ItemDataDisadvantage | ItemDataAbility | ItemDataLimitation;
  //     const updateData: {system: Record<string, string|number|boolean>} = {system: {}};
  //     if ("hasHold" in system && system.hasHold) {
  //       updateData.system["hasHold"] = false;
  //       updateData.system["hasCounter"] = true;
  //       updateData.system["counterName"] = "Hold";
  //       updateData.system["counterCount"] = system.holdTokens ?? 0;
  //     } else if ("hasTokens" in system && system.hasTokens) {
  //       updateData.system["hasTokens"] = false;
  //       updateData.system["hasCounter"] = true;
  //       updateData.system["counterName"] = "Edges";
  //       updateData.system["counterCount"] = system.tokens ?? 0;
  //     }
  //     await item.update(updateData);
  //     counter--;

  //   }));

  // }

  isMechanicalItem(): this is EunosItem & {
    system:
      | ItemDataMove
      | ItemDataAdvantage
      | ItemDataDisadvantage
      | ItemDataAbility
      | ItemDataLimitation;
  } {
    return (
      this.type === "move" ||
      this.type === "advantage" ||
      this.type === "disadvantage" ||
      this.type === "ability" ||
      this.type === "limitation"
    );
  }
  hasCounter(): this is EunosItem & { system: { hasCounter: true, counterName: string, counterCount: number, counterResetsOn: CounterResetOn }} {
    return Boolean("hasCounter" in (this.system as ItemDataMove | ItemDataAdvantage | ItemDataDisadvantage | ItemDataAbility | ItemDataLimitation) && (this.system as ItemDataMove | ItemDataAdvantage | ItemDataDisadvantage | ItemDataAbility | ItemDataLimitation).hasCounter);
  }
  hasOptions(): this is EunosItem & { system: { options: string } } {
    return Boolean("options" in (this.system as ItemDataMove | ItemDataAdvantage | ItemDataDisadvantage | ItemDataAbility | ItemDataLimitation) && (this.system as ItemDataMove | ItemDataAdvantage | ItemDataDisadvantage | ItemDataAbility | ItemDataLimitation).options);
  }
  isAdvantage(): this is EunosItem & { system: ItemDataAdvantage } {
    return this.type === "advantage";
  }
  isDisadvantage(): this is EunosItem & { system: ItemDataDisadvantage } {
    return this.type === "disadvantage";
  }
  isWeapon(): this is EunosItem & { system: ItemDataWeapon } {
    return this.type === "weapon";
  }
  isGear(): this is EunosItem & { system: ItemDataGear } {
    return this.type === "gear";
  }
  isDarkSecret(): this is EunosItem & { system: ItemDataDarkSecret } {
    return this.type === "darksecret";
  }
  isRelationship(): this is EunosItem & { system: ItemDataRelationship } {
    return this.type === "relationship";
  }

  get chatMessage(): string {
    switch (this.type) {
      case "move":
      case "advantage":
      case "disadvantage":
      case "ability":
      case "limitation":
        return this.getMechanicalItemChatMessage();
      case "gear":
        return this.getGearChatMessage();
      case "relationship":
        return this.getRelationshipChatMessage();
      case "darksecret":
        return this.getDarkSecretChatMessage();
      case "weapon":
        return this.getWeaponChatMessage();
      default:
        return "";
    }
  }

  getMechanicalItemChatMessage(): string {
    if (!this.isMechanicalItem()) {
      return "";
    }

    const htmlStrings: string[] = [
      `<div class='item-block item-block-${this.type}'>`,
      "<div class='item-header'>",
      `<img src='${this.img}' alt='${this.name}' />`,
      `<div class='move-name'>${this.name}</div>`,
      "</div>",
      "<div class='item-body'>",
      `<div class='item-effect'>${this.system.effect}</div>`
    ];

    if (this.system.type === "active") {
      htmlStrings.push(
        "<div class='roll-results-block'>",
        "<div class='complete-success-row'>",
        "<label>15+:</label>",
        `<div>${this.system.completesuccess}</div>`,
        "</div>",
        "<div class='partial-success-row'>",
        "<label>10-14:</label>",
        `<div>${this.system.partialsuccess}</div>`,
        "</div>",
        "<div class='failure-row'>",
        "<label>0-9</label>",
        `<div>${this.system.failure}</div>`,
        "</div>",
        "</div>"
      );
    }

    if (this.system.options) {
      htmlStrings.push(
        `<div class='item-options'>${this.system.options}</div>`
      );
    }

    htmlStrings.push(
      "</div></div>"
    );

    return htmlStrings.join("");
  }

  /**
   * Checks if this item is a consumable gear item
   * @returns True if this item is a consumable gear item
   */
  get isConsumable(): boolean {
    return Boolean(this.isGear() && this.system.usesMax && this.system.usesMax > 0);
  }

  get usesRemaining(): number {
    if (!this.isGear()) {
      return 0;
    }
    if (!this.isConsumable) {
      return 0;
    }
    return this.system.uses ?? 0;
  }

  async spendUse() {
    if (!this.isGear()) {
      return;
    }
    if (!this.system.uses || this.system.uses < 0) {
      return;
    }
    await this.update({ system: { uses: this.system.uses - 1 } });
  }

  getGearChatMessage(): string {
    if (!this.isGear()) {
      return "";
    }
    const htmlStrings: string[] = [
      "<div class='item-block item-block-gear'>",
        "<div class='item-header'>",
          `<img src='${this.img}' alt='${this.name}' />`,
          `<div class='item-name'>${this.name}</div>`,
        "</div>",
      "<div class='item-body'>",
        `<div>${this.system.description}</div>`,
        this.system.usesMax || this.system.armor ? "<div class='gear-footer-wrapper'>" : "",
          this.system.usesMax ? `<div class='gear-uses'>
            <span class='uses'>${this.system.uses ?? 0}</span> <strong>/</strong> <span class='uses-max'>${this.system.usesMax ?? 0}</span>
          </div>` : "",
      this.system.armor ? `<div class='gear-armor'><i class="far fa-shield"></i><span class='value'>${this.system.armor}</span></div>` : "",
      this.system.usesMax || this.system.armor ? "</div>" : "",
      "</div></div>"
    ];
    return htmlStrings.join("");
  }

  getRelationshipChatMessage(): string {
    const htmlStrings: string[] = [];
    return htmlStrings.join("");
  }

  getDarkSecretChatMessage(): string {
    const htmlStrings: string[] = [];
    return htmlStrings.join("");
  }

  getWeaponChatMessage(): string {
    const htmlStrings: string[] = [];
    return htmlStrings.join("");
  }

  getAttackChatMessage(attackIndex: number): string {
    if (!this.isWeapon()) {
      return "";
    }
    const attack = this.system.attacks[attackIndex];
    if (!attack) {
      return "";
    }
    const htmlStrings: string[] = [
      "<div class='item-block item-block-attack'>",
      "<div class='item-header'>",
      "<div class='weapon-name-wrapper'>",
      `<span class='weapon-name-prefix'>... using</span>&nbsp;<div class='weapon-name'>${this.name}</div>`,
      "</div>",
      `<div class='item-name'>${attack.name}</div>`,
      "</div>",
      "<div class='item-subheader'>",
      `<div class='item-harm key-word'>[${attack.harm}]</div>`,
      `<div class='item-range'>range: ${this.system.range?.replace(/\//g, " / ")}</div>`
    ];

    if (attack.ammoCost) {
      htmlStrings.push(
        `<div class='item-ammo-cost'>${"<span class='bullet-icon'></span>".repeat(attack.ammoCost)}</div>`
      );
    }

    htmlStrings.push("</div>");

    if (attack.special) {
      htmlStrings.push(
        "<div class='item-body'>",
        `<div class='item-description'>${attack.special}</div>`,
        "</div>"
      );
    }
    htmlStrings.push(
      "</div>"
    );
    return htmlStrings.join("");
  }

  async showInChat(li?: JQuery) {
    if (this.parent && this.isWeapon()) {
      if (!li?.length) {
        kLog.error("Unable to derive attack chat message -- no list element provided.");
      } else {
        const attackIndex = li.attr("data-attack-index");
        if (attackIndex !== undefined) {
          const attack = this.system.attacks[Number(attackIndex)];
          if (attack) {
            // @ts-expect-error Not sure why this is throwing an error.
            void ChatMessage.create({
              content: this.getAttackChatMessage(Number(attackIndex)),
              speaker: ChatMessage.getSpeaker({ alias: this.parent.name })
            });
            return;
          }
        }
      }
    }
    // @ts-expect-error Not sure why this is throwing an error.
    void ChatMessage.create({
      content: this.chatMessage,
      speaker: ChatMessage.getSpeaker({ alias: this.parent?.name ?? "" })
    });
  }

  async moveTrigger() {

    const owner = this.parent as Maybe<EunosActor>;
    kLog.log("OWNER FOUND:", {owner});
    if (!owner) {
      kLog.error(`No parent found for triggered item '${this.name}'`);
      return;
    }
    const isWideDropCap = owner.name.startsWith("M") || owner.name.startsWith("W");
    if (!this.isMechanicalItem()) {
      return "";
    }
    const templateData = {
      cssClass: `chat-trigger-result k4-theme-gold roll-result-completeSuccess ${isWideDropCap ? "wide-drop-cap" : ""}`,
      rollerName: owner.name.split(" ")[0] as string,
      isWideDropCap,
      sourceName: this.name,
      sourceImg: this.img as string,
      resultText: this.system.effect as string
    };
    const content = await renderTemplate(
      getTemplatePath("sidebar", "result-triggered.hbs"),
      templateData
    );

    const chatData = {
      speaker: EunosChatMessage.getSpeaker({ alias: this.name }),
      content,
      flags: {
        "eunos-kult-hacks": {
          cssClasses: [templateData.cssClass],
          isSummary: false,
          isAnimated: true,
          isRoll: false,
          isTrigger: true,
          isEdge: false
        }
      }
    };

    kLog.log("chatData => ", chatData);
    // @ts-expect-error ChatMessage.create is not typed
    await EunosChatMessage.create(chatData);
  }
}

Hooks.on("init", () => {
  // Replace the default Actor class with our extended version
  CONFIG.Item.documentClass = EunosItem;
});
