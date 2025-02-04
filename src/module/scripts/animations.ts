/** Defines which side the overlay item should appear from */
export enum OverlayItemSide {
  Left = "left",
  Right = "right"
}

/** Type definition for GSAP custom effects */
export type GSAPEffect = (
  target: gsap.TweenTarget,
  vars?: {
    side?: OverlayItemSide;
    displayDuration?: number;
  }
) => gsap.core.Timeline;

// Add type declarations for our custom effects
declare module "gsap" {
  interface effects {
    displayOverlayItem: GSAPEffect;
  }
}

/**
 * Configures GSAP and registers custom effects
 */
export function initializeGSAP(): void {
  // Configure GSAP globally
  gsap.config({
    force3D: true,
    nullTargetWarn: false
  });

  // Register custom effects
  gsap.registerEffect({
    name: "displayOverlayItem",
    effect: (
      target: gsap.TweenTarget,
      config: {
        side: OverlayItemSide;
        displayDuration: number;
        entryDuration: number;
        exitDuration: number;
      }
    ) => {
      const {
        side,
        displayDuration,
        entryDuration,
        exitDuration
      } = config;

      const $target = $(target as HTMLElement);
      const $image = $target.find(".loading-screen-item-image");
      const $title = $target.find(".loading-screen-item-title");
      const $subtitle = $target.find(".loading-screen-item-subtitle");
      const $home = $target.find(".loading-screen-item-home");
      const $body = $target.find(".loading-screen-item-body");

      let tl = $target.data(`gsap-timeline-${side.toLowerCase()}`) as Maybe<gsap.core.Timeline>;

      if (!tl) {
        tl = gsap.timeline({
          paused: true,
          onComplete: function onComplete(this: gsap.core.Timeline){
            // Set timeline position to "start", using label designator "start"
            this.seek("start");
            this.pause();
          }
        });
        tl.addLabel("start");

        // Initial state and entrance animation
        tl
          .set($target, {
            left: "0%",
            zIndex: 100,
            autoAlpha: 1
          })
          .fromTo($image, {
            filter: "brightness(0) blur(10px)",
            left:"0%",
            scale: 1.5,
            height: "100vh"
            // height: "600vh"
          }, {
            filter: "brightness(1) blur(0px)",
            // height: "100vh",
            scale: 1,
            duration: entryDuration + displayDuration + exitDuration,
            ease: "back.out(2)"
          })
          .fromTo($image, {
            autoAlpha: 0
          }, {
            autoAlpha: 1,
            duration: (0.25 * entryDuration) + displayDuration + exitDuration,
            ease: "power3.out"
          }, 0.25 * entryDuration)
          .fromTo($title, {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100"
          }, {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out"
          }, 2*entryDuration / 5)
          .fromTo($subtitle, {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100"
          }, {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out"
          }, 3 * entryDuration / 5)
          .fromTo($home, {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100"
          }, {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out"
          }, 3.5 * entryDuration / 5)
          .fromTo($body, {
            autoAlpha: 0,
            skewX: 10,
            x: "-=100"
          }, {
            autoAlpha: 1,
            x: 0,
            skewX: 0,
            duration: entryDuration / 5,
            ease: "power2.out"
          }, 4 * entryDuration / 5)
          .addLabel("display", entryDuration)
          .to($target, {
            autoAlpha: 0,
            filter: "blur(10px)",
            duration: exitDuration,
            ease: "power2.in"
          }, `display+=${displayDuration}`);

        // Store timeline reference
        $target.data(`gsap-timeline-${side.toLowerCase()}`, tl);

        // Store the total duration as data on the timeline
        const totalDuration = tl.duration();
        tl.data = { totalDuration };
      }

      // Start the timeline
      tl.play("start");

      return tl;
    },
    defaults: {
      side: OverlayItemSide.Left,
      entryDuration: 15,
      exitDuration: 5,
      displayDuration: 20
    }
  });
}
