import {getHoldFields, getEdgeFields, getMoveFields} from "./fields/itemFields";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;

const ItemSchemaDisadvantage = {
  ...getEdgeFields(),
  ...getHoldFields(),
  ...getMoveFields()
};

export default class ItemDataDisadvantage extends TypeDataModel<
  typeof ItemSchemaDisadvantage,
  Item
> {
  static override defineSchema() {
    return ItemSchemaDisadvantage;
  }
}
