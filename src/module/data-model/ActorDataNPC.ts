import fields = foundry.data.fields;
import TypeDataModel = foundry.abstract.TypeDataModel;

const ActorSchemaNPC = {
  home: new fields.StringField(),
  creaturetype: new fields.StringField(),
  shortDescription: new fields.StringField(),
  harm: new fields.SchemaField({
    value: new fields.NumberField(),
    min: new fields.NumberField(),
    max: new fields.NumberField(),
  }),
  harmmoves: new fields.HTMLField(),
  combatmoves: new fields.HTMLField(),
  influencemoves: new fields.HTMLField(),
  magicmoves: new fields.HTMLField(),
  description: new fields.HTMLField(),
  attacks: new fields.HTMLField(),
  abilities: new fields.HTMLField(),
  level: new fields.SchemaField({
    combat: new fields.NumberField(),
    influence: new fields.NumberField(),
    magic: new fields.NumberField(),
  }),
  isSpotlit: new fields.BooleanField(),
  sceneIndex: new fields.NumberField({nullable: true}),
  isGeneric: new fields.BooleanField(),
};

export default class ActorDataNPC extends TypeDataModel<
  typeof ActorSchemaNPC,
  EunosActor
> {
  static override defineSchema() {
    return ActorSchemaNPC;
  }
}
