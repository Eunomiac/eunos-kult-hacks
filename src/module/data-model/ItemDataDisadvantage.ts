import {type ItemDerivedFieldsBase, getHoldFields, getEdgeFields, getMoveFields} from "./fields/itemFields";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";


const ItemSchemaDisadvantage = {
  ...getEdgeFields(),
  ...getHoldFields(),
  ...getMoveFields()
};

export default class ItemDataDisadvantage extends TypeDataModel<
  typeof ItemSchemaDisadvantage,
  Item,
  EmptyObject,
  InterfaceToObject<ItemDerivedFieldsBase>
> {
  static override defineSchema() {
    return ItemSchemaDisadvantage;
  }
}
