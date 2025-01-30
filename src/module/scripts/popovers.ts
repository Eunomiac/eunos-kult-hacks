// Define custom effect types
interface PopoverEffectConfig {
  duration: number;
}

// Define custom effects
gsap.registerEffect({
  name: "popoverFadeIn",
  effect: (targets: gsap.TweenTarget, config: PopoverEffectConfig) =>
    gsap.fromTo(targets, {
      autoAlpha: 0,
      scale: 1.25
    }, {
      onStart(this: gsap.core.Tween) {
        this.targets<HTMLElement>()[0]?.showPopover();
      },
      autoAlpha: 1,
      scale: 1,
      duration: config.duration,
      ease: "power2.out"
    }
  ),
  defaults: { duration: 0.3 },
  extendTimeline: true,
});

/**
 * Initializes popover listeners at the top of the DOM.
 * @param html$ - The jQuery object representing the HTML container.
 */
const InitializePopovers = (html$: JQuery): void => {

  // Attach event listeners using event delegation
  html$.on("mouseenter", "[popovertarget]", showPopover);
  html$.on("mouseleave", "[popovertarget]", hidePopover);

};

/**
 * Handles the mouseenter event for popover triggers.
 * @param event - The mouseenter event.
 */
function showPopover(event: JQuery.MouseEnterEvent) {
  const popoverTrigger$ = $(event.currentTarget as HTMLElement);
  const popover = popoverTrigger$.nextAll("[popover]").first()[0] as Maybe<HTMLElement>;
  if (!popover) {
    console.error(`Popover element not found for: ${popoverTrigger$.attr('class')}`);
    return undefined;
  }
  popover.showPopover();
}

/**
 * Handles the mouseleave event for popover triggers.
 * @param event - The mouseenter event.
 */
function hidePopover(event: JQuery.MouseLeaveEvent) {
  const popoverTrigger$ = $(event.currentTarget as HTMLElement);
  const popover = popoverTrigger$.nextAll("[popover]").first()[0] as Maybe<HTMLElement>;
  if (!popover) {
    console.error(`Popover element not found for: ${popoverTrigger$.attr('class')}`);
    return undefined;
  }
  popover.hidePopover();
}

export default InitializePopovers;
