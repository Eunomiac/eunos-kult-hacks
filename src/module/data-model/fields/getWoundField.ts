import fields = foundry.data.fields;

export default function getWoundField() {
  return new fields.SchemaField({
    value: new fields.StringField({initial: ""}),
    state: new fields.StringField({
      choices: ["none", "unstabilized", "stabilized"],
      initial: "none",
    }),
  });
}
