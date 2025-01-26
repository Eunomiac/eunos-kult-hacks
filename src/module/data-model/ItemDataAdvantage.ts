import {getHoldFields, getEdgeFields, getMoveFields} from "./fields/itemFields";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;

const ItemSchemaAdvantage = {
  ...getEdgeFields(),
  ...getHoldFields(),
  ...getMoveFields()
};

export default class ItemDataAdvantage extends TypeDataModel<
  typeof ItemSchemaAdvantage,
  Item
> {
  static override defineSchema() {
    return ItemSchemaAdvantage;
  }
}
