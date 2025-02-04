import type {GSAPEffect} from "./animations";

// Define custom effect types
interface PopoverEffectConfig {
  duration: number;
}

// Define custom effects
gsap.registerEffect({
  name: "popoverFadeIn",
  effect: (targets: gsap.TweenTarget, config: PopoverEffectConfig) => {
    // Create timeline for better control
    const tl = gsap.timeline();

    return tl
      .call(() => {
        // Show popover first but keep it invisible
        (targets as HTMLElement[])[0]?.showPopover();
      })
      // Short delay to allow layout calculations
      .to(targets, {
        duration: 0.1,
        visibility: "visible",
        immediate: true
      })
      // Then animate in
      .fromTo(targets,
        {
          opacity: 0,
          scale: 1.25
        },
        {
          opacity: 1,
          scale: 1,
          duration: config.duration,
          ease: "power2.out"
        }
      );
  },
  defaults: { duration: 0.25 },
  extendTimeline: true,
});

// Add a hide effect as well for consistency
gsap.registerEffect({
  name: "popoverFadeOut",
  effect: (targets: gsap.TweenTarget, config: PopoverEffectConfig) =>
    gsap.to(targets, {
      opacity: 0,
      scale: 1.25,
      duration: config.duration,
      ease: "power2.in",
      onComplete: function() {
        (targets as HTMLElement[])[0]?.hidePopover();
      }
    }),
  defaults: { duration: 0.25 },
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

  // Hide all other popovers first
  $("[popover]").not(popover).each((_, element) => {
    element.hidePopover();
  });

  // Show the target popover
  popover.showPopover();
}

/**
 * Handles the mouseleave event for popover triggers.
 * @param event - The mouseleave event.
 */
function hidePopover(event: JQuery.MouseLeaveEvent) {
  const popoverTrigger$ = $(event.currentTarget as HTMLElement);
  const popover = popoverTrigger$.nextAll("[popover]").first()[0] as Maybe<HTMLElement>;
  if (!popover) {
    console.error(`Popover element not found for: ${popoverTrigger$.attr('class')}`);
    return undefined;
  }

  // Only hide if we're not entering another trigger
  const relatedTarget = event.relatedTarget as HTMLElement;
  if (relatedTarget?.hasAttribute("popovertarget")) {
    return undefined;
  }

  // First, set opacity to 0 and scale using CSS transitions
  popover.style.opacity = "0";
  popover.style.scale = "1.25";

  // Wait for the transition to complete before actually hiding the popover
  setTimeout(() => {
    popover.hidePopover();
    // Reset the inline styles
    popover.style.removeProperty("opacity");
    popover.style.removeProperty("scale");
  }, 250); // Match this to your CSS transition duration
}

export default InitializePopovers;
