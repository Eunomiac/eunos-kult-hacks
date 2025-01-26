// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import {getEdgeFields, getHoldFields, getMoveFields} from "./fields/itemFields";

const ItemSchemaAbility = {
  ...getEdgeFields(),
  ...getHoldFields(),
  ...getMoveFields()
};

export default class ItemDataAbility extends TypeDataModel<
typeof ItemSchemaAbility,
Item
> {
  static override defineSchema() {
    return ItemSchemaAbility;
  }
}
