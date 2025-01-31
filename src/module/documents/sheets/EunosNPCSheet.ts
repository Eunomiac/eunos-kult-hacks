import type ActorDataNPC from "../../data-model/ActorDataNPC";

export default function overrideNPCSheet() {
  const npcSheet: typeof k4ltNPCsheet = CONFIG.Actor.sheetClasses.npc["k4lt.k4ltNPCsheet"]?.cls as typeof k4ltNPCsheet;

  class EunosNPCSheet extends npcSheet {
    override get template() {
      return `modules/eunos-kult-hacks/templates/sheets/npc-sheet.hbs`;
    }

    override getData() {
      const data = super.getData() as {
        system: ActorDataNPC
      };
      Object.assign(data, {
        isGM: getUser().isGM
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

  Actors.unregisterSheet("k4lt", npcSheet);
  Actors.registerSheet("k4lt", EunosNPCSheet, { types: ["npc"], makeDefault: true });
}
