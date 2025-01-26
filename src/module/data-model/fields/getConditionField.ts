import fields = foundry.data.fields;

export default function getConditionField() {
  return new fields.SchemaField({
    state: new fields.StringField({
      choices: ["none", "checked"],
      initial: "none",
    }),
    tokens: new fields.NumberField({ required: false }),
    answer: new fields.StringField(),
  });
}
