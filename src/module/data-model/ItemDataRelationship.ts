import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;

const ItemSchemaRelationship = {
  description: new fields.HTMLField(),
  summary: new fields.StringField(),
  target: new fields.StringField(),
  strength: new fields.NumberField({min: 0, max: 2, integer: true, required: true, initial: 0})
};

export default class ItemDataRelationship extends TypeDataModel<
  typeof ItemSchemaRelationship,
  Item
> {
  static override defineSchema() {
    return ItemSchemaRelationship;
  }
}
