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
    return "";
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();

    (this.system as ItemDataWeapon).isGM = game.user?.isGM ?? false;

    if (this.isMechanicalItem() && ["active", "triggered"].includes(this.system.type)) {
      this.system.tooltip = this.system.trigger ? this.system.trigger : false;
    }
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
