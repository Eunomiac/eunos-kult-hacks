import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;
import getDramaticHookField from "./fields/getDramaticHookField";
import getWoundField from "./fields/getWoundField";
import getConditionField from "./fields/getConditionField";
import getAdvancementField from "./fields/getAdvancementField";
import type {EmptyObject, InterfaceToObject} from "fvtt-types/utils";
import { STABILITY_MODIFIERS, STABILITY_STATES, WOUND_MODIFIERS, WOUND_MODIFIERS_GRITTED_TEETH } from "../scripts/constants";


const ActorSchemaPC = {
  whoareyou: new fields.HTMLField(),
  whatyouholddear: new fields.HTMLField(),
  thingsinyourpossession: new fields.HTMLField(),
  relationtotheothercharacters: new fields.HTMLField(),
  dramatichooks: new fields.SchemaField({
    dramatichook1: getDramaticHookField(),
    dramatichook2: getDramaticHookField(),
  }),
  notes: new fields.HTMLField(),
  majorwound1: getWoundField(),
  majorwound2: getWoundField(),
  majorwound3: getWoundField(),
  majorwound4: getWoundField(),
  criticalwound: getWoundField(),
  stability: new fields.SchemaField({
    value: new fields.NumberField({ initial: 10, min: 0, max: 10, required: true, nullable: false }),
    min: new fields.NumberField({ initial: 0 }),
    max: new fields.NumberField({ initial: 10, min: 10, max: 10 }),
  }),
  stabilityModifiers: new fields.ArrayField(new fields.HTMLField()),
  stabilityValues: new fields.ArrayField(new fields.SchemaField({
    value: new fields.NumberField(),
    label: new fields.StringField()
  })),
  stabilityStates: new fields.StringField(),
  attributes: new fields.SchemaField({
    willpower: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
    fortitude: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
    reflexes: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
    reason: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
    intuition: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
    perception: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
    coolness: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
    violence: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
    charisma: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
    soul: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
  }),
  ongoing: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
  forward: new fields.NumberField({ initial: 0, min: -5, max: 5 }),
  conditionAngry: getConditionField(),
  conditionSad: getConditionField(),
  conditionScared: getConditionField(),
  conditionGuiltRidden: getConditionField(),
  conditionObsessed: getConditionField(),
  conditionDistracted: getConditionField(),
  conditionHaunted: getConditionField(),
  advancement: new fields.SchemaField({
    statut: new fields.StringField({choices: ["Sleeper", "Aware", "Enlightened"], initial: "Aware"})
  }),
  advancementExp1: getAdvancementField(),
  advancementExp2: getAdvancementField(),
  advancementExp3: getAdvancementField(),
  advancementExp4: getAdvancementField(),
  advancementExp5: getAdvancementField(),
  advancementLevel: new fields.SchemaField({
    value: new fields.NumberField({ initial: 0 }),
    sleeper: new fields.NumberField({ initial: 0 }),
    aware: new fields.NumberField({ initial: 6 }),
  }),
  advancementSleeper1: getAdvancementField(),
  advancementSleeper2: getAdvancementField(),
  advancementSleeper3: getAdvancementField(),
  advancementSleeper4: getAdvancementField(),
  advancementSleeper5: getAdvancementField(),
  advancementSleeper6: getAdvancementField(),
  advancementAware11: getAdvancementField(),
  advancementAware12: getAdvancementField(),
  advancementAware13: getAdvancementField(),
  advancementAware14: getAdvancementField(),
  advancementAware15: getAdvancementField(),
  advancementAware16: getAdvancementField(),
  advancementAware21: getAdvancementField(),
  advancementAware22: getAdvancementField(),
  advancementAware31: getAdvancementField(),
  advancementAware41: getAdvancementField(),
  advancementAware42: getAdvancementField(),
  advancementAware43: getAdvancementField(),
  advancementAware51: getAdvancementField(),
  advancementAware52: getAdvancementField(),
  advancementAware61: getAdvancementField(),
  advancementAware62: getAdvancementField(),
  advancementAware71: getAdvancementField(),
  advancementAware81: getAdvancementField(),
  advancementAware91: getAdvancementField(),
  advancementEnlightened11: getAdvancementField(),
  advancementEnlightened21: getAdvancementField(),
  advancementEnlightened22: getAdvancementField(),
  advancementEnlightened23: getAdvancementField(),
  advancementEnlightened24: getAdvancementField(),
  advancementEnlightened25: getAdvancementField(),
  advancementEnlightened26: getAdvancementField(),
  advancementEnlightened31: getAdvancementField(),
  advancementEnlightened32: getAdvancementField(),
  advancementEnlightened41: getAdvancementField(),
  advancementEnlightened42: getAdvancementField(),
  advancementEnlightened43: getAdvancementField(),
  advancementEnlightened51: getAdvancementField(),
  advancementEnlightened52: getAdvancementField(),
  advancementEnlightened61: getAdvancementField(),
  advancementEnlightened62: getAdvancementField(),
  advancementEnlightened63: getAdvancementField(),
  advancementEnlightened71: getAdvancementField(),
  advancementEnlightened81: getAdvancementField(),
  advancementEnlightened91: getAdvancementField(),
};

interface ActorDerivedSchemaPC {
  stabilityStates: string;
  stabilityValues: Array<{value: number, label: string}>;
  stabilityModifiers: string[];
  woundModifiers: string[];
}

export default class ActorDataPC extends TypeDataModel<
  typeof ActorSchemaPC,
  EunosActor,
  EmptyObject,
  InterfaceToObject<ActorDerivedSchemaPC>
> {
  static override defineSchema() {
    return ActorSchemaPC;
  }

  override prepareDerivedData() {
    const stabilityVal = this.stability.value;
    this.stabilityValues = [
      {value: 10, label: "10 - Composed"},
      {value: 9, label: "9 - Moderate Stress"},
      {value: 8, label: "8 - Moderate Stress"},
      {value: 7, label: "7 - Serious Stress"},
      {value: 6, label: "6 - Serious Stress"},
      {value: 5, label: "5 - Serious Stress"},
      {value: 4, label: "4 - Critical Stress"},
      {value: 3, label: "3 - Critical Stress"},
      {value: 2, label: "2 - Critical Stress"},
      {value: 1, label: "1 - Critical Stress"},
      {value: 0, label: "0 - Broken: Draw from the KULT Tarot"},
    ];
    this.stabilityStates = (STABILITY_STATES[stabilityVal] ?? []).join(", ");
    this.stabilityModifiers = STABILITY_MODIFIERS[stabilityVal] ?? [];

    const woundModifiers = this.parent.hasGrittedTeeth ? WOUND_MODIFIERS_GRITTED_TEETH : WOUND_MODIFIERS;

    this.woundModifiers = [];
    if (this.parent.hasUnstabilizedCriticalWound) {
      this.woundModifiers = woundModifiers.untendedCritical;
    } else if (this.parent.hasFieldTendedCriticalWound) {
      if (this.parent.numSeriousWounds > 0) {
        this.woundModifiers = woundModifiers.fieldTendedCriticalWithSerious;
      } else {
        this.woundModifiers = woundModifiers.fieldTendedCritical;
      }
    } else if (this.parent.numSeriousWounds > 1) {
      this.woundModifiers = woundModifiers.multipleSerious;
    } else if (this.parent.numSeriousWounds === 1) {
      this.woundModifiers = woundModifiers.singleSerious;
    }

  }
}
