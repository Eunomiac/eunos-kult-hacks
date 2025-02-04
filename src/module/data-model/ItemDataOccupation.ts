import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import {type ItemDerivedFieldsBase} from "./fields/itemFields";
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";

const ItemSchemaOccupation = {
  archetype: new fields.StringField(),
  description: new fields.HTMLField()
};

export default class ItemDataOccupation extends TypeDataModel<
  typeof ItemSchemaOccupation,
  Item,
  EmptyObject,
  InterfaceToObject<ItemDerivedFieldsBase>
> {
  static override defineSchema() {
    return ItemSchemaOccupation;
  }
}
