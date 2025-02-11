import {type ItemDerivedFieldsBase, getMoveFields, getTokenFields} from "./fields/itemFields";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";
import type EunosItem from "../documents/EunosItem";


const ItemSchemaDisadvantage = {
  ...getTokenFields(),
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

  override prepareDerivedData() {
    this.summary = (this.parent as EunosItem).chatMessage;
  }
}
