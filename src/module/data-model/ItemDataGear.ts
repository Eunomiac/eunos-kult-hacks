import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";
import {type ItemDerivedFieldsBase} from "./fields/itemFields";

const ItemSchemaGear = {
  description: new fields.HTMLField(),
  usesMax: new fields.NumberField({min: 0, max: 100, required: false, nullable: true}),
  uses: new fields.NumberField({min: 0, max: 100, required: false, nullable: true}),
  armor: new fields.NumberField({min: 0, max: 5, required: false, nullable: true}),
  isEquipped: new fields.BooleanField({initial: true})
};


export default class ItemDataGear extends TypeDataModel<
  typeof ItemSchemaGear,
  Item,
  EmptyObject,
  InterfaceToObject<ItemDerivedFieldsBase>
> {
  static override defineSchema() {
    return ItemSchemaGear;
  }
}
