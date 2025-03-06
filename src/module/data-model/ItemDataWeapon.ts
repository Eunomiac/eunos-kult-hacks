import {type ItemDerivedFieldsWeapon, getAttackField} from "./fields/itemFields";
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";


const ItemSchemaWeapon = {
  isEquipped: new fields.BooleanField({required: false, default: false}),
  class: new fields.StringField({choices: ["Melee Weapon", "Thrown Weapon", "Firearm"], initial: "Melee Weapon"}),
  subClass: new fields.StringField({choices: ["Unarmed", "Edged Weapon", "Crushing Weapon", "Chopping Weapon", "Handgun", "Magnum Handgun", "Submachine Gun", "Assault Rifle", "Machine Gun", "Rifle", "Combat Shotgun", "Explosive", "Other"], initial: "Unarmed"}),
  range: new fields.StringField({initial: "arm"}),
  ammo: new fields.SchemaField({
    value: new fields.NumberField({
      required: false,
      min: 0,
      max: 100,
      initial: 1
    }),
    max: new fields.NumberField({
      required: false,
      min: 1,
      max: 100,
      initial: 1
    })
  }),
  attacks: new fields.ArrayField(getAttackField())
};

export default class ItemDataWeapon extends TypeDataModel<
  typeof ItemSchemaWeapon,
  Item,
  EmptyObject,
  InterfaceToObject<ItemDerivedFieldsWeapon>
> {
  static override defineSchema() {
    return ItemSchemaWeapon;
  }

  override prepareDerivedData() {
    const {ammo, attacks} = this;
    const curAmmo = ammo.value ?? 0;
    this.availableAttacks = attacks.filter((attack) => {
      if (!attack.ammoCost) {
        return true;
      }
      return curAmmo >= attack.ammoCost;
    }).map((attack) => ({
      name: attack.name ?? "",
      harm: attack.harm ?? 0,
      ammoCost: attack.ammoCost ?? 0,
      special: attack.special ?? "",
      isDefault: attack.isDefault ?? false
    }))

  }
}
