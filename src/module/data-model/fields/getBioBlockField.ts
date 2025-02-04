import fields = foundry.data.fields;

export default function getBioBlockField() {
  return new fields.SchemaField({
    label: new fields.StringField(),
    content: new fields.HTMLField(),
  });
}
