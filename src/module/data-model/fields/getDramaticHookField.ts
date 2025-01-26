import fields = foundry.data.fields;

export default function getDramaticHookField() {
  return new fields.SchemaField({
    content: new fields.StringField(),
    isChecked: new fields.BooleanField({ initial: false }),
  });
}
