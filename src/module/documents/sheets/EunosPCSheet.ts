import type ActorDataPC from "../../data-model/ActorDataPC";
import EunosAlerts, { AlertType } from "../../apps/EunosAlerts";
import { UserTargetRef } from "../../scripts/enums";
import EunosOverlay from "../../apps/EunosOverlay";
import type ItemDataAdvantage from "../../data-model/ItemDataAdvantage";
import type ItemDataDisadvantage from "../../data-model/ItemDataDisadvantage";
import type EunosItem from "../EunosItem";
import EunosSockets from "../../apps/EunosSockets";

export default function overridePCSheet() {
  const pcSheet: typeof k4ltPCsheet = CONFIG.Actor.sheetClasses.pc[
    "k4lt.k4ltPCsheet"
  ]?.cls as typeof k4ltPCsheet;

  class EunosPCSheet extends pcSheet {
    override get template() {
      return `modules/eunos-kult-hacks/templates/sheets/pc-sheet.hbs`;
    }

    override getData() {
      const data = super.getData() as {
        system: ActorDataPC;
      };
      Object.assign(data, {
        isGM: getUser().isGM
      });
      return data;
    }

    override activateListeners(html: JQuery) {
      super.activateListeners(html);

      html = $(html);
      if (!this.actor.isPC()) {
        return;
      }
      const actor = this.actor as EunosActor & { system: ActorDataPC };

      html.find(".lock-sheet-button").on("click", () => {
        const isLocked = !actor.system.isSheetLocked;
        void actor.update({ system: { isSheetLocked: isLocked } });
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

      if (!this.actor.isOwner && !getUser().isGM) {
        return;
      }
      html
        .find(".item-delete")
        .off("click")
        .on("click", (event) => {
          const li = $(event.currentTarget).closest("[data-item-id]");
          const itemId = li.attr("data-item-id");
          kultLogger("Delete Item => ", {
            currentTarget: event.currentTarget,
            li,
            itemId,
          });
          if (itemId) {
            void actor.deleteEmbeddedDocuments("Item", [itemId]);
          }
        });

      html
        .find(".item-edit")
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

      html
        .find(".item-show, .move-show, .weapon-attack-block")
        .off("click")
        .on("click", (event) => {
          const li = $(event.currentTarget).closest("[data-item-id]");
          const itemId = li.attr("data-item-id");

          if (itemId) {
            const item = actor.items.get(itemId);
            kultLogger("Show Item => ", item);
            if (item) {
              if (item.isWeapon()) {
                const attackIndex = li.attr("data-attack-index");
                if (attackIndex !== undefined) {
                  const attack = item.system.attacks[Number(attackIndex)];
                  if (attack) {
                    // @ts-expect-error Not sure why this is throwing an error.
                    void ChatMessage.create({
                      content: item.getAttackChatMessage(Number(attackIndex)),
                      speaker: ChatMessage.getSpeaker({ alias: actor.name }),
                    });
                    return;
                  }
                }
              }
              // @ts-expect-error Not sure why this is throwing an error.
              void ChatMessage.create({
                content: item.chatMessage,
                speaker: ChatMessage.getSpeaker({ alias: actor.name }),
              });
            }
          }
        });

      html
        .find(".move-roll")
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

      html
        .find(".stability-minus")
        .off("click")
        .on("click", () => {
          const stability_from = actor.system.stability.value;
          if (stability_from <= (actor.system.stability.min ?? 0)) {
            getNotifier().warn(getLocalizer().localize("k4lt.PCIsBroken"));
            return;
          }
          const stabilityTier_from = actor.stabilityState;
          const stability_new = Math.max(0, stability_from - 1);
          if (stability_new === stability_from) {
            return;
          }
          actor
            .update({ system: { stability: { value: stability_new } } })
            .then(
              () => {
                // void EunosOverlay.instance.updateStabilityBG(actor);
                if (stabilityTier_from === actor.stabilityState) {
                  return;
                }
                void EunosAlerts.Alert({
                  type: AlertType.simple,
                  header: `${actor.name} Loses Stability!`,
                  body: `${actor.name} is now ${actor.stabilityState}.`,
                  target: UserTargetRef.all,
                  soundName: "alert-hit-stability-down"
                });
              },
              (error: unknown) => {
                getNotifier().warn("Unable to send alert to all users.");
              },
            );
        });

      html
        .find(".stability-plus")
        .off("click")
        .on("click", () => {
          const stability_from = actor.system.stability.value;
          if (stability_from >= (actor.system.stability.max ?? 10)) {
            getNotifier().warn(getLocalizer().localize("k4lt.PCIsComposed"));
            return;
          }
          const stabilityTier_from = actor.stabilityState;
          const stability_new = Math.min(
            actor.system.stability.max ?? 10,
            stability_from + 1,
          );
          if (stability_new === stability_from) {
            return;
          }
          actor
            .update({ system: { stability: { value: stability_new } } })
            .then(
              () => {
                // void EunosOverlay.instance.updateStabilityBG(actor);
                // void EunosOverlay.instance.render({ parts: ["pcs", "pcsGM"] });
                if (stabilityTier_from === actor.stabilityState) {
                  return;
                }
                void EunosAlerts.Alert({
                  type: AlertType.simple,
                  header: `${actor.name} Gains Stability!`,
                  body: `${actor.name} is now ${actor.stabilityState}.`,
                  target: UserTargetRef.all,
                  soundName: "alert-hit-stability-up"
                });
              },
              (error: unknown) => {
                getNotifier().warn("Unable to send alert to all users.");
              },
            );
        });

      // Add equipped toggle listener
      html
        .find(".item-toggle-equipped")
        .off("click")
        .on("click", (event) => {
          event.preventDefault();
          const element = $(event.currentTarget);
          const itemId = element.attr("data-item-id");
          if (!itemId) {
            return;
          }
          const item = this.actor.items.get(itemId);
          if (!item) {
            return;
          }
          if (!("isEquipped" in (item.system as { isEquipped: boolean }))) {
            return;
          }

          void item.update({
            system: {
              isEquipped: !(item.system as { isEquipped: boolean }).isEquipped,
            },
          });
        });

      // Add reload listener
      html
        .find(".reload-button")
        .off("click")
        .on("click", (event) => {
          const elem$ = $(event.currentTarget).closest("[data-item-id]");
          const itemId = elem$.attr("data-item-id");
          if (!itemId) {
            kLog.error("No itemId found for reload", { itemId });
            return;
          }
          const item = this.actor.items.get(itemId);
          if (!item) {
            kLog.error("No item found for itemId", { itemId });
            return;
          }
          if (!item.isWeapon()) {
            kLog.error("Item is not a weapon", { itemId });
            return;
          }
          if ((item.system.ammo.value ?? 0) >= (item.system.ammo.max ?? 0)) {
            kLog.error("Weapon is full", { itemId });
            return;
          }
          void item.update({
            system: {
              ammo: { value: item.system.ammo.max },
            },
          });
          void EunosAlerts.Alert({
            type: AlertType.simple,
            header: `${actor.name} Reloads!`,
            body: `${actor.name} reloads their ${item.name}.`,
            target: UserTargetRef.all,
            soundName: "alert-hit-stability-up"
          });
        });

      // Add counter listeners

      html
        .find(".token-add")
        .off("click")
        .on("click", (event) => {
          const elem$ = $(event.currentTarget).closest("[data-item-id]");
          const itemId = elem$.attr("data-item-id");
          const actorId = elem$.attr("data-actor-id");
          if (!itemId || !actorId) {
            kLog.error("No itemId or actorId found for addHold", {
              itemId,
              actorId,
            });
            return;
          }
          const item = fromUuidSync(
            `Actor.${actorId}.Item.${itemId}`,
          ) as EunosItem;
          if (!item) {
            kLog.error("No item found for itemId", { itemId });
            return;
          }
          const itemData = item.system as
            | ItemDataAdvantage
            | ItemDataDisadvantage;
          if (!itemData.hasCounter) {
            kLog.error("Item does not have counter", { itemId });
            return;
          }
          void item
            .update({
              system: { counterCount: (itemData.counterCount ?? 0) + 1 },
            })
            .then(() => {
              this.render();
              void EunosSockets.getInstance().call("refreshPCs", UserTargetRef.gm);
              void EunosOverlay.instance.render({ parts: ["pcs", "pcsGM"] });
            });
        });

      html
        .find(".token-spend")
        .off("click")
        .on("click", (event) => {
          const elem$ = $(event.currentTarget).closest("[data-item-id]");
          const itemId = elem$.attr("data-item-id");
          const actorId = elem$.attr("data-actor-id");
          if (!itemId || !actorId) {
            kLog.error("No itemId or actorId found for spendCounter", {
              itemId,
              actorId,
            });
            return;
          }
          const item = fromUuidSync(
            `Actor.${actorId}.Item.${itemId}`,
          ) as EunosItem;
          if (!item) {
            kLog.error("No item found for itemId", { itemId });
            return;
          }
          const itemData = item.system as
            | ItemDataAdvantage
            | ItemDataDisadvantage;
          if (!itemData.hasCounter) {
            kLog.error("Item does not have counter", { itemId });
            return;
          }
          if ((itemData.counterCount ?? 0) <= 0) {
            return;
          }
          void item
            .update({
              system: { counterCount: (itemData.counterCount ?? 0) - 1 },
            })
            .then(() => {
              this.render();
              void EunosSockets.getInstance().call("refreshPCs", UserTargetRef.gm);
            });
        });
    }
  }

  Actors.unregisterSheet("k4lt", pcSheet);
  Actors.registerSheet("k4lt", EunosPCSheet, {
    types: ["pc"],
    makeDefault: true,
  });
}
