import type ActorDataPC from "../../data-model/ActorDataPC";

export default function overridePCSheet() {
  const pcSheet: typeof k4ltPCsheet = CONFIG.Actor.sheetClasses.pc["k4lt.k4ltPCsheet"]?.cls as typeof k4ltPCsheet;

  class EunosPCSheet extends pcSheet {
    override get template() {
      return `modules/eunos-kult-hacks/templates/sheets/pc-sheet.hbs`;
    }

    override getData() {
      const data = super.getData() as {
        system: ActorDataPC
      };

      return data;
    }

    override activateListeners(html: JQuery) {
      super.activateListeners(html);


      // html.find(".stability-minus").click(ev => {
      //   const stability_current = Number(this.actor.system.stability.value);
      // })
    }
  }

  Actors.unregisterSheet("k4lt", pcSheet);
  Actors.registerSheet("k4lt", EunosPCSheet, { types: ["pc"], makeDefault: true });
}
