import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;

const ItemSchemaOccupation = {
  archetype: new fields.StringField(),
  description: new fields.HTMLField()
};

export default class ItemDataOccupation extends TypeDataModel<
  typeof ItemSchemaOccupation,
  Item
> {
  static override defineSchema() {
    return ItemSchemaOccupation;
  }
}
