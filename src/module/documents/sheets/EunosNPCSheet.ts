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

      const textareas = html.find("textarea[data-auto-resize]");


      // Function to resize textarea to fit content
      const autoResize = (textarea: HTMLElement) => {
        // Save the current scroll position
        const scrollPos = textarea.scrollTop;

        // Temporarily collapse the textarea to compute proper height
        textarea.style.height = "0";

        // Get the correct height based on content
        const newHeight = Math.max(
          textarea.scrollHeight,          // Content height
          textarea.dataset["minHeight"] ? parseInt(textarea.dataset["minHeight"]) : 24  // Minimum height
        );

        // Set the new height
        textarea.style.height = `${newHeight}px`;

        // Restore scroll position
        textarea.scrollTop = scrollPos;

        const container$ = $(textarea).parent();
        container$.css("height", `${newHeight}px`);
      };

      textareas.each((i, el: HTMLElement) => {
        // Initialize height
        autoResize(el);

        // Update height when text changes
        $(el).on("input", function() {
          autoResize(this);
        });
      });

      // html.find(".stability-minus").click(ev => {
      //   const stability_current = Number(this.actor.system.stability.value);
      // })
    }
  }

  Actors.unregisterSheet("k4lt", npcSheet);
  Actors.registerSheet("k4lt", EunosNPCSheet, { types: ["npc"], makeDefault: true });
}
