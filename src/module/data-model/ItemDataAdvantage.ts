import {type ItemDerivedFieldsBase, getMoveFields, getTokenFields} from "./fields/itemFields";
import type EunosItem from "../documents/EunosItem";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";

const ItemSchemaAdvantage = {
  ...getTokenFields(),
  ...getMoveFields()
};

export default class ItemDataAdvantage extends TypeDataModel<
  typeof ItemSchemaAdvantage,
  Item,
  EmptyObject,
  InterfaceToObject<ItemDerivedFieldsBase>
> {
  static override defineSchema() {
    return ItemSchemaAdvantage;
  }

  override prepareDerivedData() {
    this.summary = (this.parent as EunosItem).chatMessage;
  }


}
