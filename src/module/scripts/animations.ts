import { assertIs } from "./utilities";

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
  gsap.registerEffect({
    name: "dramaticHookChargeUp",
    effect: (target: gsap.TweenTarget, config = {}) => {
      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          // Flash effect when complete
          gsap.to(target, {
            scale: 1.5,
            duration: 0.2,
            ease: "back.out",
            onComplete: () => { gsap.set(target, { scale: 1 }) }
          });
        }
      });

      // Simple charge-up animation
      tl.to(target, {
        scale: 1.2,
        backgroundColor: "rgba(255, 200, 0, 0.3)",
        duration: 1,
        ease: "power1.in"
      });

      return tl;
    }
  });
  gsap.registerEffect({
    name: "rotateSplitPopText",
    extendTimeline: true,
    defaults: {
      duration: 2.5,
      ease: "none",
      delay: 0
    },
    effect: (targets: HTMLElement[]|JQuery, config = {}) => {
      const targets$ = $(targets);
      const {duration, ease, delay} = config as {duration: number, ease: string, delay: number};
      // gsap.set(targets$, {filter: "blur(0px) drop-shadow(20px 20px 10px black)"});
      const textContainer$ = targets$.parents(".question-text");
      const questionContainer$ = textContainer$.parents(".question-container");
      const timeToStaggerTargets = duration / targets$.length;
      return gsap.timeline({delay})
        .fromTo(textContainer$, {
          autoAlpha: 0,
        }, {
          autoAlpha: 1,
          duration: 0.1,
          ease: "none"
        }, 0)
        // .fromTo(targetContainer$, {
        //   x: "-=500"
        // }, {
        //   x: "+=500",
        //   // scale: 1.5,
        //   duration: duration,
        //   ease: "slow(0.1, 2, false)"
        // }, 0)
        .fromTo(questionContainer$, {
          xPercent: -50,
          yPercent: -50,
          rotate: -30,
          scale: 1,
        }, {
          xPercent: -50,
          yPercent: -50,
          rotate: -30,
          scale: 1,
          duration: 2 * duration,
          ease: "none"
        })
        .fromTo(targets$,
          {
            autoAlpha: 0,
            filter: "brightness(0)",
            scale: 1,
            textShadow: "0 0 0 rgb(150, 140, 106), 0 0 0 rgb(150, 140, 106), 0 0 0 rgb(150, 140, 106), 0 0 0 rgb(150, 140, 106), 0 0 0 rgb(150, 140, 106), 0 0 0 rgb(150, 140, 106), 0 0 0 rgb(150, 140, 106), 0 0 0 rgb(150, 140, 106)"
          },
          {
            autoAlpha: 1,
            filter: "brightness(1)",
            scale: 1,
            textShadow: "0 0 2px rgb(150, 140, 106), 0 0 4px rgb(150, 140, 106), 0 0 6px rgb(150, 140, 106), 0 0 8px rgb(150, 140, 106), 0 0 10px rgb(150, 140, 106), 0 0 12px rgb(150, 140, 106), 0 0 14px rgb(150, 140, 106), 0 0 16px rgb(150, 140, 106)",
            duration,
            ease,
            stagger: {
              // amount: duration,
              each: timeToStaggerTargets,
              ease: "power2.inOut",
              from: "start"
            }
          },
          0.1)
    }
  });
  gsap.registerEffect({
    name: "fadeInPopText",
    extendTimeline: true,
    defaults: {
      duration: 6,
      ease: "power2.inOut",
      delay: 0
    },
    effect: (targets: HTMLElement[]|JQuery, config = {}) => {
      const questionContainer$ = $(targets);
      const bgWrapper$ = questionContainer$.siblings(".background-wrapper");
      const bgLayerBase$ = bgWrapper$.find(".bg-layer-base");
      const bgLayerZ1$ = bgWrapper$.find(".bg-layer-z1");
      const bgLayerZ2$ = bgWrapper$.find(".bg-layer-z2");
      const bgLayerZ3$ = bgWrapper$.find(".bg-layer-z3");
      const bgLayerZ4$ = bgWrapper$.find(".bg-layer-z4");
      const groundFog$ = bgWrapper$.find(".ground-fog");

      const {duration, ease, delay} = config as {duration: number, ease: string, delay: number};

      const treeTimeline = gsap.timeline({clearProps: "all"})
        .to([bgLayerBase$[0], groundFog$[0]], {scale: 1.1, ease, duration}, 0)
        .to(bgLayerZ4$, {scale: 2, ease, duration}, 0)
        .to(bgLayerZ3$, {scale: 1.25, ease, duration}, 0)
        .to(bgLayerZ2$, {scale: 1.05, ease, duration}, 0)
        .to(bgLayerZ1$, {scale: 1.025, ease, duration}, 0);

      const textTimeline = gsap.timeline({clearProps: "all"})
        // Start with text far back, blurred and invisible
        .fromTo(questionContainer$,
            {y: -350, z: 0, filter: "blur(25px)", autoAlpha: 0},
            {y: 0, z: 0, filter: "blur(0px)", autoAlpha: 1, duration: 10, ease: "power3.out"}, 0)
        .fromTo(questionContainer$, {scale: 0.75}, {scale: 2, duration: 10, ease: "power2.inOut"}, 0)
        // Start with lowest z-index
        .set(questionContainer$, {zIndex: 0}, 0)
        // Staggered z-index transitions with easing
        .to(bgLayerZ1$, {opacity: 0.5, duration: 0.8, ease: "power2.inOut"}, 0.5)
        .to(questionContainer$, {zIndex: 1, duration: 0.1}, 1.2)
        .to(bgLayerZ1$, {opacity: 1, duration: 0.4, ease: "power2.in"}, 1.3)

        .to(bgLayerZ2$, {opacity: 0.5, duration: 0.8, ease: "power2.inOut"}, 1.8)
        .to(questionContainer$, {zIndex: 2, duration: 0.1}, 2.5)
        .to(bgLayerZ2$, {opacity: 1, duration: 0.4, ease: "power2.in"}, 2.6)

        .to(bgLayerZ3$, {opacity: 0.5, duration: 0.8, ease: "power2.inOut"}, 3.0)
        .to(questionContainer$, {zIndex: 3, duration: 0.1}, 3.7)
        .to(bgLayerZ3$, {opacity: 1, duration: 0.4, ease: "power2.in"}, 3.8)

        .to(bgLayerZ4$, {opacity: 1, duration: 0.8, ease: "power2.inOut"}, 4.0)
        .to(questionContainer$, {zIndex: 5, duration: 0.1}, 4.7) // Final z-index higher than all layers
        .to(bgLayerZ4$, {opacity: 1, duration: 0.4, ease: "power2.in"}, 4.8);

      return gsap.timeline({delay})
        .add(treeTimeline, 0)
        .add(textTimeline, 0);
    }
  })
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
            // left:"0%",
            x: "+=100",
            scale: 1.5,
            height: "100vh"
            // height: "600vh"
          }, {
            filter: "brightness(1) blur(0px)",
            x: 0,
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
  gsap.registerEffect({
    name: "itemCardChargeUp",
    effect: (targets: gsap.TweenTarget, config = {}) => {
      const target$ = $(targets as HTMLElement);
      const indicator$ = target$.find('.item-charge-indicator');

      // Set initial state
      gsap.set(indicator$, {
        width: '0%',
        opacity: 0.7
      });

      // Create the charge-up timeline
      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          // Flash effect when complete
          gsap.to(target$, {
            backgroundColor: 'rgba(255, 200, 0, 0.2)',
            duration: 0.2,
            ease: "back.out",
            onComplete: () => {
              gsap.set(target$, { backgroundColor: '' });
              gsap.set(indicator$, { width: '0%', opacity: 0 });
            }
          });
        }
      });

      // Animate the indicator
      tl.to(indicator$, {
        width: '100%',
        duration: 1,
        ease: "power1.in"
      });

      return tl;
    },
    defaults: {}
  });
}
