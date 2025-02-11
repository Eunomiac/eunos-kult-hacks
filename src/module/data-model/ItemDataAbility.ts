// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import {type ItemDerivedFieldsBase, getMoveFields, getTokenFields} from "./fields/itemFields";
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";

const ItemSchemaAbility = {
  ...getTokenFields(),
  ...getMoveFields()
};

export default class ItemDataAbility extends TypeDataModel<
typeof ItemSchemaAbility,
Item,
EmptyObject,
InterfaceToObject<ItemDerivedFieldsBase>
> {
  static override defineSchema() {
    return ItemSchemaAbility;
  }
}
