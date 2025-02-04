import { WEAPON_SUBCLASSES, WEAPON_CLASSES } from "../../scripts/constants";

export default function overrideItemSheet() {
  const itemSheet: typeof k4ltitemsheet = CONFIG.Item.sheetClasses.base["k4lt.k4ltitemsheet"]?.cls as typeof k4ltitemsheet;

  class EunosItemSheet extends itemSheet {
    override get template() {
      return `modules/eunos-kult-hacks/templates/sheets/${this.item.type}-sheet.hbs`;
    }

    override async getData() {
      const data = await super.getData();

      const type = "type" in data.system ? data.system.type : null;

      Object.assign(data, {
        isGM: getUser().isGM
      });

      if (this.item.isMechanicalItem()) {
        if (!type) {
          console.error("Invalid Type Data", data);
          throw new Error("Type not found");
        }
        Object.assign(data, {
          attributeValues: [
            { value: "", label: getLocalizer().localize("k4lt.None") },
            { value: "ask", label: getLocalizer().localize("k4lt.Ask") },
            { value: "willpower", label: getLocalizer().localize("k4lt.Willpower") },
            { value: "fortitude", label: getLocalizer().localize("k4lt.Fortitude") },
            { value: "reflexes", label: getLocalizer().localize("k4lt.Reflexes") },
            { value: "reason", label: getLocalizer().localize("k4lt.Reason") },
            { value: "intuition", label: getLocalizer().localize("k4lt.Intuition") },
            { value: "perception", label: getLocalizer().localize("k4lt.Perception") },
            { value: "coolness", label: getLocalizer().localize("k4lt.Coolness") },
            { value: "violence", label: getLocalizer().localize("k4lt.Violence") },
            { value: "charisma", label: getLocalizer().localize("k4lt.Charisma") },
            { value: "soul", label: getLocalizer().localize("k4lt.Soul") }
          ],
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
          hasAttributePrompt: type === "active",
          canHaveEdges: ["active", "triggered"].includes(type),
          canHaveHold: ["active", "triggered"].includes(type),
          hasTrigger: ["active", "triggered"].includes(type),
          hasRollResults: type === "active",
          hasSpecialFlag: type === "active",
          hasEffect: true,
          hasOptions: type === "active",
          tooltip: this.item.system.trigger || false
        });
      }

      if (this.item.isWeapon()) {
        Object.assign(data, {
          classOptions: WEAPON_CLASSES,
          subclassOptions: this.item.system.class ? WEAPON_SUBCLASSES[this.item.system.class] : []
        })
      }

      return data;
    }

    override activateListeners(html: JQuery): void {
      super.activateListeners(html);

      // Add attack button listener
      html.find(".add-attack").on("click", (event) => void this._onAddAttack(event));

      // html.find(".stability-minus").click(ev => {
      //   const stability_current = Number(this.actor.system.stability.value);
      // })
    }

    /**
     * Handles adding a new blank attack to the weapon
     * @param event - The triggering click event
     */
    private async _onAddAttack(event: JQuery.ClickEvent): Promise<void> {
      event.preventDefault();

      if (!this.item.isWeapon()) {
        return;
      }

      const attacks = this.item.system.attacks;

      // Create new blank attack
      const newAttack = {
        name: "New Attack",
        harm: 0,
        ammoCost: 0,
        special: "",
        isDefault: attacks.length === 0 // Make default if it's the first attack
      };

      // Update the item with the new attack added
      await this.item.update({
        system: {
          attacks: [...attacks, newAttack]
        }
      });
    }
  }

  Items.unregisterSheet("k4lt", itemSheet);
  Items.registerSheet("k4lt", EunosItemSheet, { types: ["ability", "advantage", "darksecret", "disadvantage", "family", "gear", "limitation", "move", "occupation", "relationship", "weapon"], makeDefault: true });
}
