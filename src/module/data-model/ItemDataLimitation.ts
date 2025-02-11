import {type ItemDerivedFieldsBase, getMoveFields, getTokenFields} from "./fields/itemFields";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";

const ItemSchemaLimitation = {
  ...getTokenFields(),
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
