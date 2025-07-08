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
      return "modules/eunos-kult-hacks/templates/sheets/pc-sheet.hbs";
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

      // Add auto-resize functionality for textareas
      const textareas = html.find("textarea");

      const autoResize = (textarea: HTMLElement) => {
        const scrollPos = textarea.scrollTop;
        textarea.style.height = "0";
        const newHeight = Math.max(
          textarea.scrollHeight, // Content height
          24 // Minimum height
        );
        textarea.style.height = `${newHeight}px`;
        textarea.scrollTop = scrollPos;
      };

      textareas.each((i, el: HTMLElement) => {
        autoResize(el);
        $(el).on("input", function () {
          autoResize(this);
        });
      });

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
          kLog.log("Delete Item => ", {
            currentTarget: event.currentTarget,
            li,
            itemId
          });
          if (itemId) {
            void actor.deleteEmbeddedDocuments("Item", [itemId]);
          }
        });

      // html
      //   .find(".item-edit")
      //   .off("click")
      //   .on("click", (event) => {
      //     const li = $(event.currentTarget).closest("[data-item-id]");
      //     const itemId = li.attr("data-item-id");
      //     if (itemId) {
      //       const item = actor.items.get(itemId);
      //       item?.render(true);
      //     }
      //   });

      html
        .find(".item-show")
        .off("click")
        .on("click", (event) => {
          const li = $(event.currentTarget).closest("[data-item-id]");
          const itemId = li.attr("data-item-id");

          if (itemId) {
            const item = actor.items.get(itemId);
            kLog.log("Show Item => ", item);
            void item?.showInChat(li);
          }
        });

      // html
      //   .find(".move-roll")
      //   .off("click")
      //   .on("click", (event) => {
      //     const li = $(event.currentTarget).closest("[data-item-id]");
      //     const itemId = li.attr("data-item-id");
      //     if (itemId) {
      //       const item = actor.items.get(itemId);
      //       if (item) {
      //         void actor.moveroll(itemId);
      //       }
      //     }
      //   });

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
              () => {
                getNotifier().warn("Unable to send alert to all users.");
              }
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
            stability_from + 1
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
              () => {
                getNotifier().warn("Unable to send alert to all users.");
              }
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
              isEquipped: !(item.system as { isEquipped: boolean }).isEquipped
            }
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
              ammo: { value: item.system.ammo.max }
            }
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
              actorId
            });
            return;
          }
          const item = fromUuidSync(
            `Actor.${actorId}.Item.${itemId}`
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
              system: { counterCount: (itemData.counterCount ?? 0) + 1 }
            })
            .then(() => {
              this.render();
              void EunosSockets.getInstance().call(
                "refreshPCs",
                UserTargetRef.gm
              );
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
              actorId
            });
            return;
          }
          const item = fromUuidSync(
            `Actor.${actorId}.Item.${itemId}`
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
              system: { counterCount: (itemData.counterCount ?? 0) - 1 }
            })
            .then(() => {
              this.render();
              void EunosSockets.getInstance().call(
                "refreshPCs",
                UserTargetRef.gm
              );
            });
        });

      // Add item card interactions for all item types
      this._setupMoveCardInteractions(html);
    }

    private _setupMoveCardInteractions(html: JQuery): void {
      // First, remove any existing handlers to prevent duplicates
      kLog.log("Setting up item card interactions - removing old handlers");
      html.find(".item-interaction-target").off("click dblclick contextmenu mousedown touchstart mouseup touchend mouseleave touchcancel");

      html.find(".item-interaction-target").each((_, element) => {
        const $target = $(element);
        const itemId = $target.data("item-id") as string;
        const itemType = $target.data("item-type") as string;
        const itemName = this.actor.items.get(itemId)?.name ?? "Unknown";

        kLog.log(`Setting up listeners for item: ${itemName} (${itemId}, type: ${itemType})`);

        // Track if we're currently in a mousedown state
        let isMouseDown = false;

        // Handle mousedown - start the charge animation
        $target.on("mousedown", (event) => {
          // kLog.log(`MOUSEDOWN on ${itemName} (button: ${event.button})`);

          // Only process left mouse button (button 0)
          if (event.button !== 0) {
            // kLog.log("Ignoring mousedown - not left button");
            return;
          }

          event.preventDefault();
          isMouseDown = true;
          // kLog.log(`Starting charge animation for ${itemName}`);

          // Create a new timeline for each interaction
          const tl = (gsap.effects["itemCardChargeUp"] as GSAPEffectFunction)($target);
          $target.data("charge-timeline", tl);
          tl.play();
        });

        // Handle touchstart separately
        $target.on("touchstart", (event) => {
          // kLog.log(`TOUCHSTART on ${itemName}`);
          event.preventDefault();
          isMouseDown = true;
          // kLog.log(`Starting charge animation for ${itemName} (touch)`);

          // Create a new timeline for each interaction
          const tl = (gsap.effects["itemCardChargeUp"] as GSAPEffectFunction)($target);
          $target.data("charge-timeline", tl);
          tl.play();
        });

        // Handle mouseup - either view or activate based on progress
        $target.on("mouseup", (event) => {
          // kLog.log(`MOUSEUP on ${itemName} (button: ${event.button}, isMouseDown: ${isMouseDown})`);

          // Only process left mouse button (button 0)
          if (event.button !== 0) {
            // kLog.log("Ignoring mouseup - not left button");
            return;
          }

          event.preventDefault();

          // Only process if we were in a mousedown state
          if (!isMouseDown) {
            // kLog.log("Ignoring mouseup - wasn't in mousedown state");
            return;
          }

          isMouseDown = false;

          const timeline = $target.data("charge-timeline") as Maybe<gsap.core.Timeline>;
          if (!timeline) {
            kLog.log(`No timeline found for ${itemName}`);
            return;
          }

          const progress = timeline.progress();
          // kLog.log(`Charge progress for ${itemName}: ${progress.toFixed(2)}`);
          timeline.pause();

          if (progress > 0.98) {
            kLog.log(`Fully charged - activating ${itemName} (${itemType})`);
            // Fully charged - activate the item
            this._activateItem(itemId);
          } else if (progress < 0.15) {
            kLog.log(`Barely charged, assume click - viewing ${itemName}`);
            // Not fully charged - view the item
            const item = this.actor.items.get(itemId);
            if (item) {
              // @ts-expect-error Don't know why the types won't recognize this syntax.
              item.sheet?.render({force: true});
            }

            // Reverse the animation
            // kLog.log(`Reversing animation for ${itemName}`);
            timeline.timeScale(3).reverse();
          } else {
            timeline.timeScale(3).reverse();
          }
        });

        // Handle touchend separately
        $target.on("touchend", (event) => {
          // kLog.log(`TOUCHEND on ${itemName} (isMouseDown: ${isMouseDown})`);
          event.preventDefault();

          // Only process if we were in a touchstart state
          if (!isMouseDown) {
            // kLog.log("Ignoring touchend - wasn't in touchstart state");
            return;
          }

          isMouseDown = false;

          const timeline = $target.data("charge-timeline") as Maybe<gsap.core.Timeline>;
          if (!timeline) {
            kLog.log(`No timeline found for ${itemName} (touch)`);
            return;
          }

          const progress = timeline.progress();
          // kLog.log(`Charge progress for ${itemName}: ${progress.toFixed(2)} (touch)`);
          timeline.pause();

          if (progress > 0.98) {
            kLog.log(`Fully charged - activating ${itemName} (${itemType}) (touch)`);
            // Fully charged - activate the item
            this._activateItem(itemId);
          } else if (progress < 0.15) {
            kLog.log(`Barely charged, assume click - viewing ${itemName}`);
            // Not fully charged - view the item
            const item = this.actor.items.get(itemId);
            if (item) {
              // @ts-expect-error Don't know why the types won't recognize this syntax.
              item.sheet?.render({ force: true });
            }

            // Reverse the animation
            // kLog.log(`Reversing animation for ${itemName} (touch)`);
            timeline.timeScale(3).reverse();
          } else {
            timeline.timeScale(3).reverse();
          }
        });

        // Handle mouseleave/touchcancel - cancel the interaction
        $target.on("mouseleave", (event) => {
          // kLog.log(`MOUSELEAVE on ${itemName} (isMouseDown: ${isMouseDown})`);
          event.preventDefault();

          // Only process if we were in a mousedown state
          if (!isMouseDown) {
            // kLog.log("Ignoring mouseleave - wasn't in mousedown state");
            return;
          }

          isMouseDown = false;

          const timeline = $target.data("charge-timeline") as Maybe<gsap.core.Timeline>;
          if (!timeline) {
            kLog.log(`No timeline found for ${itemName} on mouseleave`);
            return;
          }

          // Just cancel the animation without triggering any action
          kLog.log(`Canceling interaction for ${itemName} on mouseleave`);
          timeline.timeScale(3).reverse();
        });

        $target.on("touchcancel", (event) => {
          kLog.log(`TOUCHCANCEL on ${itemName} (isMouseDown: ${isMouseDown})`);
          event.preventDefault();

          // Only process if we were in a touchstart state
          if (!isMouseDown) {
            kLog.log("Ignoring touchcancel - wasn't in touchstart state");
            return;
          }

          isMouseDown = false;

          const timeline = $target.data("charge-timeline") as Maybe<gsap.core.Timeline>;
          if (!timeline) {
            kLog.log(`No timeline found for ${itemName} on touchcancel`);
            return;
          }

          // Just cancel the animation without triggering any action
          kLog.log(`Canceling interaction for ${itemName} on touchcancel`);
          timeline.timeScale(3).reverse();
        });
      });
    }

    private _activateItem(itemId: string): void {
      const item = this.actor.items.get(itemId);
      if (!item) {
        kLog.error(`Item not found: ${itemId}`);
        return;
      }

      kLog.log(`Activating item: ${item.name} (${item.type})`);

      // Handle different item types
      if (item.isMechanicalItem()) {
        // For moves, advantages, disadvantages, abilities, limitations
        if (item.system.type === "active") {
          void this.actor.moveroll(itemId);
        } else if (item.system.type === "triggered") {
          void item.moveTrigger();
        } else {
          void item.showInChat();
        }
      } else if (item.isGear()) {
        // For gear items
        if (item.isConsumable) {
          void item.spendUse();
          kLog.log(`Spent use on consumable item: ${item.name}`);
        } else {
          void item.moveTrigger();
        }
      } else {
        // For all other item types (weapons, dark secrets, relationships, etc.)
        void item.showInChat();
      }
    }
  }

  Actors.unregisterSheet("k4lt", pcSheet);
  Actors.registerSheet("k4lt", EunosPCSheet, {
    types: ["pc"],
    makeDefault: true
  });
}
