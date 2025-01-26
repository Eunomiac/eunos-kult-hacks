import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;

const ItemSchemaDarkSecret = {
  description: new fields.HTMLField(),
  drive: new fields.StringField()
};

export default class ItemDataDarkSecret extends TypeDataModel<
  typeof ItemSchemaDarkSecret,
  Item
> {
  static override defineSchema() {
    return ItemSchemaDarkSecret;
  }
}
