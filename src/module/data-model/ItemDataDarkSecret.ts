import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";
import {type ItemDerivedFieldsBase} from "./fields/itemFields";
const ItemSchemaDarkSecret = {
  description: new fields.HTMLField(),
  drive: new fields.StringField(),
  emmas_rise: new fields.HTMLField()
};

export default class ItemDataDarkSecret extends TypeDataModel<
  typeof ItemSchemaDarkSecret,
  Item,
  EmptyObject,
  InterfaceToObject<ItemDerivedFieldsBase>
> {
  static override defineSchema() {
    return ItemSchemaDarkSecret;
  }
}
