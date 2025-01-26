import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;

const ItemSchemaFamily = {
  description: new fields.HTMLField()
};

export default class ItemDataFamily extends TypeDataModel<
  typeof ItemSchemaFamily,
  Item
> {
  static override defineSchema() {
    return ItemSchemaFamily;
  }
}
