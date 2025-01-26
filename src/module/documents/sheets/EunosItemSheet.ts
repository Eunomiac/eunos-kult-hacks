
export default function overrideItemSheet() {
  const itemSheet: typeof k4ltitemsheet = CONFIG.Item.sheetClasses.base["k4lt.k4ltitemsheet"]?.cls as typeof k4ltitemsheet;

  class EunosItemSheet extends itemSheet {
    override get template() {
      return `modules/eunos-kult-hacks/templates/sheets/${this.item.type}-sheet.hbs`;
    }

    override async getData() {
      const data = await super.getData();

      Object.assign(data, {
        typeValues: [{
          value: "active",
          label: "Active"
        }, {
          value: "triggered",
          label: "Triggered"
        }, {
          value: "passive",
          label: "Passive"
        }],
        hasAttributePrompt: "type" in data.system && data.system.type === "active",
        canHaveEdges: "type" in data.system && ["active", "triggered"].includes(data.system.type),
        canHaveHold: "type" in data.system && ["active", "triggered"].includes(data.system.type),
        hasTrigger: "type" in data.system && ["active", "triggered"].includes(data.system.type),
        hasRollResults: "type" in data.system && data.system.type === "active",
        hasSpecialFlag: "type" in data.system && data.system.type === "active",
        hasEffect: true,
        hasOptions: "type" in data.system && data.system.type === "active",
      });

      return data;
    }

    override activateListeners(html: JQuery) {
      super.activateListeners(html);


      // html.find(".stability-minus").click(ev => {
      //   const stability_current = Number(this.actor.system.stability.value);
      // })
    }
  }

  Items.unregisterSheet("k4lt", itemSheet);
  Items.registerSheet("k4lt", EunosItemSheet, { types: ["ability", "advantage", "darksecret", "disadvantage", "family", "gear", "limitation", "move", "occupation", "relationship", "weapon"], makeDefault: true });
}
