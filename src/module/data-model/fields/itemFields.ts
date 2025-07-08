import fields = foundry.data.fields;
import { CounterResetOn } from "../../scripts/enums";

// export function getEdgeFields() {
//   return {
//     hasTokens: new fields.BooleanField({initial: false}),
//     tokens: new fields.NumberField({initial: 0, min: 0, max: 5})
//   }
// }

// export function getHoldFields() {
//   return {
//     hasHold: new fields.BooleanField({initial: false}),
//     holdTokens: new fields.NumberField({initial: 0, min: 0, max: 10})
//   }
// }



export function getTokenFields() {
  return {
    hasCounter: new fields.BooleanField({initial: false}),
    counterName: new fields.StringField({required: false, nullable: true, initial: null}),
    counterCount: new fields.NumberField({initial: 0, min: 0, max: 10}),
    counterResetsOn: new fields.StringField({required: false, nullable: false, initial: CounterResetOn.Never})
  };
}

export function getMoveFields() {
  return {
    type: new fields.StringField({choices: ["active", "triggered", "passive"], initial: "active"}),
    trigger: new fields.HTMLField({required: false}),
    effect: new fields.HTMLField({required: false}),
    options: new fields.HTMLField({required: false}),
    completesuccess: new fields.HTMLField({required: false}),
    partialsuccess: new fields.HTMLField({required: false}),
    failure: new fields.HTMLField({required: false}),
    attributemod: new fields.StringField({
      choices: ["none", "ask", "reflexes", "fortitude", "willpower", "charisma", "coolness", "violence", "intuition", "reason", "soul", "perception"],
      required: false
    }),
    specialflag: new fields.NumberField({initial: 0, min: 0, max: 5}), // 1: KiT, 2: STtI, 3: Endure Injury, 4: Combat, 5: Dreamweave
    showOptionsFor: new fields.SchemaField({
      success: new fields.BooleanField({initial: true}),
      partial: new fields.BooleanField({initial: true}),
      failure: new fields.BooleanField({initial: false})
    })
  };
}

export function getAttackField() {
  return new fields.SchemaField({
    name: new fields.StringField(),
    harm: new fields.NumberField({min: 0, max: 10}),
    ammoCost: new fields.NumberField({min: 0, max: 10, required: false}),
    special: new fields.StringField(),
    isDefault: new fields.BooleanField({initial: false})
  });
}

export interface AttackSchema {
  name: string;
  harm: number;
  ammoCost: number;
  special: string;
  isDefault: boolean;
}

export interface ItemDerivedFieldsBase {
  isGM: boolean;
  tooltip: string|false;
  summary: string;
}

export interface ItemDerivedFieldsRelationship extends ItemDerivedFieldsBase {
  strengthText: string;
}

export interface ItemDerivedFieldsWeapon extends ItemDerivedFieldsBase {
  availableAttacks: Array<{
    name: string;
    harm: number;
    ammoCost: number;
    special: string;
    isDefault: boolean;
  }>;
}
