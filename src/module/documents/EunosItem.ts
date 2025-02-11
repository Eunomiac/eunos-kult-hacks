import type ItemDataAbility from "../data-model/ItemDataAbility";
import type ItemDataAdvantage from "../data-model/ItemDataAdvantage";
import type ItemDataDisadvantage from "../data-model/ItemDataDisadvantage";
import type ItemDataLimitation from "../data-model/ItemDataLimitation";
import type ItemDataMove from "../data-model/ItemDataMove";
import type ItemDataWeapon from "../data-model/ItemDataWeapon";
import type ItemDataGear from "../data-model/ItemDataGear";
import type ItemDataDarkSecret from "../data-model/ItemDataDarkSecret";
import type ItemDataRelationship from "../data-model/ItemDataRelationship";

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

  getAttackChatMessage(attack: {
    name: string;
    harm: number;
    ammoCost: number;
    special: string;
    isDefault: boolean;
  }, item: EunosItem): string {
    if (!item.isWeapon()) {
      return "";
    }
    const htmlStrings: string[] = [
      "<div class='item-block item-block-attack'>",
      "<div class='item-header'>",
      `<div class='weapon-name'>${item.name}</div>`,
      `<div class='item-name'>${attack.name}</div>`,
      "</div>",
      "<div class='item-subheader'>",
      `<div class='item-harm key-word'>${attack.harm} Harm</div>`,
      `<div class='item-ammo-cost'>${attack.ammoCost > 0 ? `${attack.ammoCost} Ammo` : ""}</div>`,
      "</div>"
    ];

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

  async showInChat() {
    kultLogger("Show Item => ", this);
    const htmlStrings: string[] = [
      `<div class='item-block item-block-${this.type}'>`,
      "<div class='item-header'>",
      `<img src='${this.img}' alt='${this.name}' />`,
      `<div class='item-name'>${this.name}</div>`,
      "</div>",
      "<div class='item-body'>"
    ];
    // htmlStrings.push(
    // );

    // let effect;
    // if (item.type === "disadvantage" || item.type === "advantage" || item.type === "ability" || item.type === "limitation") {
    //   effect = item.system.effect;
    // } else if (item.type === "move") {
    //   effect = item.system.trigger;
    // } else if (item.type === "weapon") {
    //   effect = item.system.special;
    // } else if (item.type === "gear" || item.type === "darksecret") {
    //   effect = item.system.description;
    // }
    // const content = `<div class='move-name'>${item.name}</div><div>${effect}</div>`;
    // @ts-expect-error ChatMessage.create is not typed
    await ChatMessage.create({ content: htmlStrings.join(""), speaker: ChatMessage.getSpeaker({ alias: this.name }) });
  }

}

Hooks.on("init", () => {
  // Replace the default Actor class with our extended version
  CONFIG.Item.documentClass = EunosItem;
});
