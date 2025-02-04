import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";
import {type ItemDerivedFieldsBase} from "./fields/itemFields";

const ItemSchemaRelationship = {
  target: new fields.StringField(),
  subtitle: new fields.StringField(),
  description: new fields.HTMLField(),
  strength: new fields.NumberField({min: 0, max: 2, integer: true, required: true, initial: 0})
};

export default class ItemDataRelationship extends TypeDataModel<
  typeof ItemSchemaRelationship,
  Item,
  EmptyObject,
  InterfaceToObject<ItemDerivedFieldsBase>
> {
  static override defineSchema() {
    return ItemSchemaRelationship;
  }
}
