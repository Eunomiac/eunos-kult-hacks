import type ActorDataPC from "../../data-model/ActorDataPC";
import type EunosActor from "../EunosActor";
import EunosAlerts, {AlertType} from "../../apps/EunosAlerts";
import {UserTargetRef} from "../../scripts/sockets";

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
      Object.assign(data, {
        isGM: getUser().isGM
      });
      return data;
    }

    override activateListeners(html: JQuery) {
      super.activateListeners(html);

      html = $(html);
      if (!this.actor.isPC()) { return; }
      const actor = this.actor as EunosActor & { system: ActorDataPC };

      html.find(".lock-sheet-button")
        .on("click", () => {
          const isLocked = !actor.system.isSheetLocked;
          void actor.update({ system: {isSheetLocked: isLocked }} );
          if (isLocked) {
            this.element.addClass("locked");
          } else {
            this.element.removeClass("locked");
          }
        });


      if (actor.system.isSheetLocked) {
        this.element.addClass("locked");
      } else {
        this.element.removeClass("locked");
      }

      html.find(".item-delete")
        .off("click")
        .on("click", (event) => {
                    const li = $(event.currentTarget).closest("[data-item-id]");
          const itemId = li.attr("data-item-id");
          kultLogger("Delete Item => ", { currentTarget: event.currentTarget, li, itemId });
          if (itemId) {
            void actor.deleteEmbeddedDocuments("Item", [itemId]);
          }
        });


      html.find(".item-edit")
        .off("click")
        .on("click", (event) => {
                    const li = $(event.currentTarget).closest("[data-item-id]");
          const itemId = li.attr("data-item-id");
          if (itemId) {
            const item = actor.items.get(itemId);
            if (item) {
              // eslint-disable-next-line @typescript-eslint/no-deprecated
              item.sheet?.render(true);
            }
          }
        });

      html.find(".item-show")
        .off("click")
        .on("click", (event) => {
                    const li = $(event.currentTarget).closest("[data-item-id]");
          const itemId = li.attr("data-item-id");
          if (itemId) {
            const item = actor.items.get(itemId);
            kultLogger("Show Item => ", item);
            if (item) {
              // @ts-expect-error Not sure why this is throwing an error.
              void ChatMessage.create({
                content: item.chatMessage,
                speaker: ChatMessage.getSpeaker({ alias: actor.name })
              });
            }
          }
        });

      html.find(".move-roll")
        .off("click")
        .on("click", (event) => {
          const li = $(event.currentTarget).closest("[data-item-id]");
          const itemId = li.attr("data-item-id");
          if (itemId) {
            const item = actor.items.get(itemId);
            if (item) {
              void actor.moveroll(itemId);
            }
          }
        });

      html.find(".stability-minus")
        .off("click")
        .on("click", (event) => {
          const stability_current = Number(actor.system.stability.value);
          if (stability_current > 0) {
            const stability_new = stability_current - 1;
            actor.update({ system: { stability: { value: stability_new } } })
              .then(() => {
                void EunosAlerts.Alert({
                  type: AlertType.simple,
                  header: `${actor.name} Loses Stability!`,
                  body: `${actor.name} is now ${actor.stabilityState}.`,
                  target: UserTargetRef.all
                });
              },
              (error: unknown) => {
                getNotifier().warn("Unable to send alert to all users.");
              });
          } else {
            getNotifier().warn(getLocalizer().localize("k4lt.PCIsBroken"));
          }
      });

      html.find(".stability-plus")
        .off("click")
        .on("click", (event) => {
          const stability_current = Number(actor.system.stability.value);
          if (stability_current < Number(actor.system.stability.max)) {
            const stability_new = stability_current + 1;
            actor.update({ system: { stability: { value: stability_new } } })
              .then(() => {
                void EunosAlerts.Alert({
                  type: AlertType.simple,
                  header: `${actor.name} Gains Stability!`,
                  body: `${actor.name} is now ${actor.stabilityState}.`,
                  target: UserTargetRef.all
                });
              },
              (error: unknown) => {
                getNotifier().warn("Unable to send alert to all users.");
              });
          } else {
          getNotifier().warn(getLocalizer().localize("k4lt.PCIsComposed"));
        }
      });

      // Add equipped toggle listener
      html.find(".item-toggle-equipped")
        .off("click")
        .on("click", (event) => {
          event.preventDefault();
          const element = $(event.currentTarget);
          const itemId = element.attr("data-item-id");
          if (!itemId) { return; }
          const item = this.actor.items.get(itemId);
          if (!item) { return; }
          if (!("isEquipped" in (item.system as { isEquipped: boolean }))) { return; }

          void item.update({
            system: { isEquipped: !(item.system as { isEquipped: boolean }).isEquipped }
          });
        });


    }
  }

  Actors.unregisterSheet("k4lt", pcSheet);
  Actors.registerSheet("k4lt", EunosPCSheet, { types: ["pc"], makeDefault: true });
}
