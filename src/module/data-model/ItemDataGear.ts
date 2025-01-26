import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;

const ItemSchemaGear = {
  description: new fields.HTMLField(),
  usesMax: new fields.NumberField({min: 1, max: 100, required: false}),
  uses: new fields.NumberField({min: 1, max: 100, required: false}),
  armor: new fields.NumberField({min: 1, max: 5, required: false}),
  isEquipped: new fields.BooleanField({initial: true})
};

export default class ItemDataGear extends TypeDataModel<
  typeof ItemSchemaGear,
  Item
> {
  static override defineSchema() {
    return ItemSchemaGear;
  }
}
