import {getAttackField} from "./fields/itemFields";
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;

const ItemSchemaWeapon = {
  class: new fields.StringField(),
  range: new fields.StringField(),
  ammoCapacity: new fields.NumberField({required: false, min: 1, max: 100}),
  ammo: new fields.NumberField({
    initial: (...args: unknown[]) => {
      console.log("INITIAL WEAPON ARGS", args);
      return 0;
    },
    required: false,
    min: 0,
    max: 100
  }),
  attacks: new fields.ArrayField(getAttackField())
};

export default class ItemDataWeapon extends TypeDataModel<
  typeof ItemSchemaWeapon,
  Item
> {
  static override defineSchema() {
    return ItemSchemaWeapon;
  }
}
