import {getHoldFields, getEdgeFields, getMoveFields} from "./fields/itemFields";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;

const ItemSchemaLimitation = {
  ...getEdgeFields(),
  ...getHoldFields(),
  ...getMoveFields()
};

export default class ItemDataLimitation extends TypeDataModel<
  typeof ItemSchemaLimitation,
  Item
> {
  static override defineSchema() {
    return ItemSchemaLimitation;
  }
}
