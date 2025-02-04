import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";
import {type ItemDerivedFieldsRelationship} from "./fields/itemFields";

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
  InterfaceToObject<ItemDerivedFieldsRelationship>
> {
  static override defineSchema() {
    return ItemSchemaRelationship;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();

    this.isGM = game.user?.isGM ?? false;

    this.strengthText = ["Neutral", "Meaningful", "Vital"][this.strength ?? 0] as string;
  }
}
