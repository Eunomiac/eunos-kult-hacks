import fields = foundry.data.fields;

export default function getAdvancementField() {
  return new fields.SchemaField({
    state: new fields.StringField({
      choices: ["none", "checked"],
      initial: "none",
    }),
  });
}
