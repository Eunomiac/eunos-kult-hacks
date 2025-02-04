import {type ItemDerivedFieldsBase, getHoldFields, getEdgeFields, getMoveFields} from "./fields/itemFields";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";

const ItemSchemaLimitation = {
  ...getEdgeFields(),
  ...getHoldFields(),
  ...getMoveFields()
};

export default class ItemDataLimitation extends TypeDataModel<
  typeof ItemSchemaLimitation,
  Item,
  EmptyObject,
  InterfaceToObject<ItemDerivedFieldsBase>
> {
  static override defineSchema() {
    return ItemSchemaLimitation;
  }
}
