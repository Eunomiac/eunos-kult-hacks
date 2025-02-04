import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";
import {type ItemDerivedFieldsBase} from "./fields/itemFields";

const ItemSchemaFamily = {
  description: new fields.HTMLField()
};

export default class ItemDataFamily extends TypeDataModel<
  typeof ItemSchemaFamily,
  Item,
  EmptyObject,
  InterfaceToObject<ItemDerivedFieldsBase>
> {
  static override defineSchema() {
    return ItemSchemaFamily;
  }
}
