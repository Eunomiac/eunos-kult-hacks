// #region IMPORTS ~
import { Colors } from "../scripts/constants.js";
import {getTemplatePath, sleep, getLast, unique, isNumber} from "../scripts/utilities.js";
import { EunosRollResult } from "../scripts/enums.js";
// #endregion

// #region TYPES ~
export interface ResultRolledContext {
  cssClass: string;            // Class string for the outer div
  rollerName: string;          // Name of character making the roll
  isWideDropCap: boolean;      // Flag for wide drop cap styling

  attribute: string;           // Attribute being rolled (used for display and class)
  attrType: string;            // Type prefix for attribute value image ("active" or "passive")
  attrVal: number;             // Attribute value for image

  sourceName: string;          // Name of the move/ability source
  sourceImg: string;           // Image URL for the source icon

  dice: [number, number];      // Array of two values representing the d10 results
  modifiers: Array<{           // Array of roll modifiers
    value: number;               // Modifier value
    name: string;                // Modifier description
    cssClasses?: string;         // Optional CSS classes
  }>;
  outcome: EunosRollResult;    // Outcome of the roll
  total: number;               // Total roll result (used for both display and outcome logic)

  resultText: string;          // HTML content for the result description
  optionsText?: string;        // HTML content for any listed options
}

// #endregion

const MASTER_TIMELINES = {
  animateRollResult: async (message$: JQuery, msg: EunosChatMessage, stagger?: ValueOrArray<number>): Promise<{timeline: gsap.core.Timeline}> => {


    const staggers = EunosChatMessage.GetStaggers(
      stagger,
      [
        0.5,      // intro line stagger
        1,        // source line stagger
        1,        // dice stagger
        0,        // modifiers stagger
        0,        // total stagger
        1.75,      // outcome stagger
        1,        // window scroll stagger
        0,        // success/fail stagger
        0         // results stagger
      ]
    );

    async function waitForHeight(element$: JQuery): Promise<number> {
      // First, wait for the element to exist
      while (!element$.get(0)) {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }

      const element = element$.get(0);
      if (!element) {
        throw new Error("Element not found, even after waiting for it to exist!");
      }

      return new Promise((resolve) => {
        const observer = new ResizeObserver((entries) => {
          const height = entries?.[0]?.contentRect?.height ?? 0;
          if (height > 0) {
            observer.disconnect();
            resolve(height);
          }
        });
        observer.observe(element);
      });
    }

    // Determine the current and maximum height of the message for scrolling purposes
    const messageContent$ = message$.find(".message-content");
    const results$ = message$.find(".roll-dice-results ~ div, .roll-dice-results ~ label, .roll-dice-results ~ h2, .roll-dice-results ~ ul li");
    const curHeight = await waitForHeight(messageContent$);

    results$.css({
      display: "block",
      visibility: "visible",
      opacity: 0
    });

    let endHeight = message$.height() ?? 0;
    if (endHeight > 800) {
      messageContent$.css({"--chat-font-size-large": "12px", "--chat-line-height-large": "16px"})
      endHeight = message$.height() ?? 0;
    }

    kLog.log("animateRollResult", {message$, msg, stagger, results$, messageContent$, curHeight, endHeight});

    results$.css({
      display: "none",
      visibility: "hidden",
      opacity: ""
    });
    message$.css({minHeight: curHeight, maxHeight: curHeight});
    messageContent$.css({minHeight: curHeight, maxHeight: curHeight});

    kLog.log(`Current Height: ${curHeight}; End Height: ${endHeight}`);

    const tl = gsap.timeline()
      .add(CHILD_TIMELINES.animateCharName(message$))
      .add(CHILD_TIMELINES.animateIntroLine(message$), `<+=${staggers[0]}`)
      .add(CHILD_TIMELINES.animateSource(message$), `<+=${staggers[1] ?? getLast(staggers)}`)
      .add(CHILD_TIMELINES.animateDice(message$), `<+=${staggers[2] ?? getLast(staggers)}`)
      .add(CHILD_TIMELINES.animateModifiers(message$), `<+=${staggers[3] ?? getLast(staggers)}`)
      .add(CHILD_TIMELINES.animateTotal(message$), `<+=${staggers[4] ?? getLast(staggers)}`)
      .add(CHILD_TIMELINES.animateOutcome(message$), `<+=${staggers[5] ?? getLast(staggers)}`)
      .add(CHILD_TIMELINES.animateWindowSize(message$, msg, {curHeight, endHeight}), `<+=${staggers[6] ?? getLast(staggers)}`);

    if (message$.hasClass("roll-result-failure")) {
      tl.add(CHILD_TIMELINES.animateToFailure(message$), `<+=${staggers[7] ?? getLast(staggers)}`);
    } else if (message$.hasClass("roll-result-completeSuccess")) {
      tl.add(CHILD_TIMELINES.animateToSuccess(message$), `<+=${staggers[7] ?? getLast(staggers)}`);
    } else if (message$.hasClass("roll-result-partialSuccess")) {
      tl.add(CHILD_TIMELINES.animateToPartial(message$), `<+=${staggers[7] ?? getLast(staggers)}`);
    }

    tl.add(CHILD_TIMELINES.animateResults(message$, msg), `<+=${staggers[8] ?? getLast(staggers)}`);

    tl.addLabel("revealed");

    return { timeline: tl };
  },
  animateTriggerResult: (message$: JQuery, msg: EunosChatMessage, stagger?: ValueOrArray<number>) => {

    const staggers = EunosChatMessage.GetStaggers(stagger, [
      0.5,      // intro line stagger
      1,        // source line stagger
      0,        // success/fail stagger
      0         // results stagger
    ]);

    return gsap.timeline()
      .add(CHILD_TIMELINES.animateCharName(message$))
      .add(CHILD_TIMELINES.animateIntroLine(message$), `<+=${staggers[0]}`)
      .add(CHILD_TIMELINES.animateSource(message$), `<+=${staggers[1] ?? getLast(staggers)}`)
      .add(CHILD_TIMELINES.animateToSuccess(message$), `<+=${staggers[7] ?? getLast(staggers)}`)
      .add(CHILD_TIMELINES.animateResults(message$, msg), `<+=${staggers[8] ?? getLast(staggers)}`)
      .addLabel("revealed");
  },
} as const;

const CHILD_TIMELINES = {
  animateCharName(message$: JQuery): gsap.core.Timeline {
    // const messageContent$ = message$.find(".message-content");
    const dropCap$ = message$.find(".drop-cap");
    const charName$ = message$.find(".roll-char-name");

    // Split the character name into individual letters
    const splitCharName = new SplitText(charName$, { type: "chars" });
    // Set chatName$ to visibility: visible
    charName$.css("visibility", "visible");

    // Return a timeline that staggers the reveal of both the dropcap and the letters of the character name
    return gsap.timeline({
      clearProps: "all",
      onReverseComplete() {
        splitCharName.revert();
      }
    })
      .fromTo(dropCap$, {
        autoAlpha: 0,
        filter: "blur(100px)",
        scale: 5,
        x: -200,
        y: -100,
      }, {
        autoAlpha: 1,
        filter: "blur(0px)",
        scale: 1,
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "power3"
      })
      .fromTo(splitCharName.chars, {
        autoAlpha: 0,
        skewX: -65,
        x: -80,
        filter: "blur(15px)"
      }, {
        autoAlpha: 1,
        skewX: 0,
        x: 0,
        filter: "blur(0px)",
        duration: 0.5,
        stagger: 0.05,
        ease: "power2.out"
      }, 0);
  },
  animateIntroLine(message$: JQuery): gsap.core.Timeline {
    const introLine$ = message$.find(".roll-intro-line");
    const attrTerm$ = message$.find(".text-attributename").attr("style", "");
    const attrFlare$ = message$.find(".roll-term-container[class*='attribute']");

    const splitIntroLine = new SplitText(introLine$, { type: "words" });
    // Set introLine$ to visibility: visible
    introLine$.css("visibility", "visible");

    return gsap.timeline({
      onReverseComplete() {
        splitIntroLine.revert();
      }
    })
      .fromTo(splitIntroLine.words, {
        autoAlpha: 0,
        x: -100,
        filter: "blur(50px)"
      }, {
        autoAlpha: 1,
        x: 0,
        filter: "blur(0px)",
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.1
      }, 0)
      .fromTo(attrTerm$, {
          filter: "brightness(1) saturate(1)",
          display: "inline-block",
          scale: 1
      }, {
          filter: "saturate(2) brightness(1.5) ",
          scale: 1.35,
          repeat: 1,
          yoyo: true,
          duration: 0.5,
          ease: "power2.inOut"
      }, "<25%")
      .fromTo(attrFlare$, {
        y: -100,
        scale: 0.64,
        autoAlpha: 0
      }, {
        y: 0,
        scale: 0.64,
        autoAlpha: 1,
        ease: "elastic",
        duration: 2
      }, "-=45%")
      // Call a delayed slow-shrink of the attribute flare a callback so that it doesn't change the timeline's duration
      .call(() => {
        gsap.fromTo(attrFlare$,
          {
            y: 0
          }, {
            y: -10,
            ease: "back.out",
            delay: 3,
            duration: 5
          });
      });
  },
  animateSource(message$: JQuery, stagger = 0): gsap.core.Timeline {
    const sourceHeader$ = message$.find(".roll-source-header");
    const sourceName$ = message$.find(".roll-source-name");
    const sourceIcon$ = message$.find(".icon-container");

    // Extract RGB values from source header's border color, then define an rgba value with 0 alpha
    const borderRGB = sourceHeader$.css("border-top-color").match(/\d+/g)?.join(",") ?? "255,255,255";
    const borderColorStart = `rgba(${borderRGB}, 0)`;
    const borderColorEnd = `rgba(${borderRGB}, 1)`;

    const tl = gsap.timeline()
      .fromTo(sourceHeader$, {
          autoAlpha: 0,
          borderColor: borderColorStart,
      }, {
          autoAlpha: 1,
          borderColor: borderColorEnd,
          delay: 0,
          background: "#000000",
          duration: 0.25,
          ease: "power2.out"
      });

    if (stagger > 0) {
      // Split the source name into individual words
      const splitSourceNameWords = new SplitText(sourceName$, { type: "words" });
      // Set sourceName$ to visibility: visible
      sourceName$.css("visibility", "visible");

      // Add the source name animation to the timeline
      tl.add(gsap.timeline({
        onReverseComplete() {
          splitSourceNameWords.revert();
        }
      })
        .fromTo(splitSourceNameWords.words, {
          autoAlpha: 0,
          x: 0,
          scale: 2,
          filter: "blur(1px) brightness(2)"
        }, {
          autoAlpha: 1,
          x: 0,
          scale: 1,
          filter: "blur(0px) brightness(1)",
          duration: 0.5,
          ease: "power2.out",
          stagger
        }), 0.15);
    } else {
      tl
        .fromTo(sourceName$, {
          autoAlpha: 0,
          x: 0,
          scale: 2,
          filter: "blur(1px) brightness(5)"
        }, {
          autoAlpha: 1,
          x: 0,
          scale: 1,
          filter: "blur(0px) brightness(1)",
          duration: 0.5,
          ease: "power2.out",
          stagger
        }, 0.25);
    }

    return tl
      .fromTo(sourceIcon$, {
          autoAlpha: 0,
          x: -100,
          y: 0,
          scale: 1,
          filter: "blur(50px)"
        }, {
          autoAlpha: 1,
          scale: 1,
          x: 0,
          y: 0,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "power2.out"
        }, ">-25%");
  },
  animateDice(message$: JQuery): gsap.core.Timeline {
    const d10s$ = message$.find(".roll-d10");
    const d10BGs$ = d10s$.children(".d10-animation");
    const d10Videos: HTMLVideoElement[] = Array.from(d10BGs$.children("video"));
    d10Videos.forEach((video, index) => {
      video.loop = true;
      video.muted = true;
      video.playbackRate = 0.5 + (0.25 * index);
      video.style.display = "block";
    });
    const [d10VideoA, d10VideoB] = d10Videos;

    return gsap.timeline()
      .fromTo(d10s$, {
        transformOrigin: "center center",
        scale: 1.5,
        y: -20,
        filter: "brightness(2) blur(5px)"
      }, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        filter: "brightness(1) blur(0px)",
        ease: "power2.out",
        duration: 0.5,
        stagger: 0.25
      })
      // Manually stagger the play calls for each video
      .call(() => {
        if (!d10VideoA) { return; }
        d10VideoA.currentTime = 0;
        void d10VideoA.play()
      }, undefined, 0.25)
      .call(() => {
        if (!d10VideoB) { return; }
        d10VideoB.currentTime = 0;
        void d10VideoB.play()
      }, undefined, 0.75)
      // Call a delayed slow-shrink of the dice within a callback so that it doesn't change the timeline's duration
      .call(() => {
        gsap.fromTo(d10s$, {
          scale: 1
        }, {
          y: -10,
          scale: 0.8,
          ease: "back.out",
          delay: 3,
          duration: 5
        });
      });
  },
  animateModifiers(message$: JQuery): gsap.core.Timeline {
    const modifiers$ = message$.find(".roll-modifiers .roll-mod");

    return gsap.timeline()
      .fromTo(modifiers$, {
        autoAlpha: 0,
        x: -100,
        filter: "blur(50px)"
      }, {
        autoAlpha: 1,
        x: 0,
        filter: "blur(0px)",
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out"
      });
  },
  animateTotal(message$: JQuery): gsap.core.Timeline {
    const msgContainer$ = message$.find(".message-content");
    const gearContainer$ = message$.find(".roll-total-gear");
    kLog.log("Gear Containers: ", {msgContainer$, gearContainer$});
    const middleGear$ = gearContainer$.find("[class*='middle-ring']");
    const outerGear$ = gearContainer$.find("[class*='outer-ring']");
    const totalNum$ = message$.find(".roll-total-number");

    return gsap.timeline()
      // Timeline: Outer Gear Component
      .fromTo(outerGear$, {
        scale: 5,
        filter: "blur(15px)"
      }, {
        autoAlpha: 0.85,
        scale: 1,
        filter: "blur(1.5px)",
        ease: "power2.inOut",
        duration: 1,
        onStart() {
          msgContainer$.css("overflow", "visible");
          gearContainer$.css("overflow", "visible");
        },
        onComplete() {
          msgContainer$.css("overflow", "");
          gearContainer$.css("overflow", "");
          gsap.to(outerGear$, {
            rotation: "+=360",
            repeat: -1,
            duration: 30,
            ease: "none"
          });
        }
      })

      // Timeline: Middle Gear Component
      .fromTo(middleGear$, {
        scale: 2
      }, {
        rotation: "+=360",
        scale: 1,
        autoAlpha: 1,
        ease: "power3.out",
        duration: 1
      }, 0)
      .to(middleGear$, {
        scale: 1.25,
        duration: 0.5,
        repeat: 1,
        ease: "power2.in",
        yoyo: true,
        onComplete() {
          gsap.to(middleGear$, {
            rotation:      "-=20",
            duration:      0.4,
            repeatRefresh: true,
            repeatDelay:   1.6,
            ease:          "back.out(5)",
            repeat:        -1
          })
        }
      })

      // Timeline: Total Number Component
      .fromTo(totalNum$, {
        transformOrigin: "center center",
        // skewX: -25,
        scale: 1.25,
        // x: 100,
        autoAlpha: 0,
        xPercent: -50,
        yPercent: -50,
        filter: "blur(50px) brightness(5)"
    }, {
        autoAlpha: 1,
        // skewX: 0,
        // x: 0,
        scale: 1,
        filter: "blur(0px) brightness(1)",
        ease: "power2.inOut",
        duration: 1
    }, ">-=1.15");
  },
  animateOutcome(message$: JQuery): gsap.core.Timeline {
    const outcome$ = message$.find(".roll-outcome > *");
    return gsap.timeline()
      .fromTo(outcome$, {
        transformOrigin: "center center",
        skewX: -25,
        scale: 1,
        x: 100,
        autoAlpha: 0,
        filter: "blur(50px)"
      }, {
        autoAlpha: 1,
        skewX: 0,
        x: 0,
        scale: 1,
        filter: "blur(0px)",
        ease: "power2.inOut",
        duration: 1
    });
  },
  animateWindowSize(message$: JQuery, msg: EunosChatMessage, {curHeight, endHeight}: {curHeight: number, endHeight: number}): gsap.core.Timeline {
    const messageContent$ = message$.find(".message-content");
    const results$ = message$.find([
      ".roll-dice-results ~ div",
      ".roll-dice-results ~ label",
      ".roll-dice-results ~ h2",
      ".roll-dice-results ~ ul li"
    ].join(", "));

    // Timeline: Expand chat message to its full height
    return gsap.timeline()
      .set(results$, {
        display: "block",
        visibility: "visible",
        opacity: 0
      })
      .fromTo([message$, messageContent$], {
        maxHeight: curHeight
      }, {
        maxHeight: endHeight,
        duration: 1,
        onUpdate() {
          const newHeight = message$.height() ?? curHeight;
          if (newHeight !== curHeight) {
            EunosChatMessage.ChatLog.scrollTo({
              top: EunosChatMessage.ChatLog.scrollHeight + (newHeight - curHeight)
            });
            curHeight = newHeight;
          }
        }
      });
  },
  animateToSuccess(message$: JQuery): gsap.core.Timeline {
    const msgBgBase$ = message$.find(".message-bg.bg-base");
    message$.find(".message-bg.bg-success").css("visibility", "visible");

    const msgDropCap$ = message$.find(".drop-cap");
    const msgCharName$ = message$.find(".roll-char-name *");
    const msgIntroLine$ = message$.find(".roll-intro-line *");
    const msgAttrName$ = message$.find(".roll-intro-line .text-attributename *");
    const msgIcon$ = message$.find(".icon-container");

    const msgSource = message$.find(".roll-source-header");
    const msgSourceName$ = msgSource.find(".roll-source-name .roll-source-text");
    const msgGears = message$.find(".roll-total-gear > img");
    const msgTotal = message$.find(".roll-total-number");
    const msgOutcomeMain = message$.find(".roll-outcome .roll-outcome-main");
    const msgOutcomeSub = message$.find(".roll-outcome .roll-outcome-sub");
    const msgTextToBrightGold = message$.find(".roll-source-source-name .roll-source-text, .roll-dice-results ~ * *");

    return gsap.timeline({ease: "power3.in", clearProps: true})
      .to(msgBgBase$, {autoAlpha: 0, duration: 1, ease: "power2.inOut"})
      .fromTo(msgIcon$, {filter: "sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0)"}, {filter: `sepia(0) brightness(1.5) contrast(5) drop-shadow(2px 2px 2px ${Colors.GREY0})`, duration: 1}, 0)
      .to(msgCharName$, {color: Colors.GOLD8, duration: 1, ease: "power2.inOut"}, 0)
      .to(msgIntroLine$, {color: Colors.GOLD8, duration: 1, ease: "power2.inOut"}, 0)
      .to(msgAttrName$, {color: Colors.GOLD8, filter: "brightness(3) saturate(1.5)", duration: 1, ease: "power2.inOut"}, 0)
      .fromTo(msgDropCap$, {filter: "sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0)"}, {filter: `sepia(0) brightness(1.5) contrast(5) drop-shadow(2px 2px 2px ${Colors.GREY0})`, duration: 1}, 0)
        // .fromTo(msgAttrFlare, {filter: "sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1)"}, {filter: "sepia(5) brightness(0.25) saturate(5) hue-rotate(-45deg) saturate(3) brightness(1) contrast(1)", duration: 1}, 0)
        .fromTo(msgGears, {filter: "blur(1.5px) sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1)"}, {filter: "blur(1.5px) brightness(1.5) saturate(0.5)", duration: 1}, 0)
        .fromTo(msgTotal, {filter: "brightness(1) saturate(1) contrast(1)"}, {filter: "brightness(1.5) saturate(2) contrast(1)", duration: 1}, 0)

        .to(msgSource, {opacity: 0, duration: 0.5, ease: "power2.out"}, 0)
        .set(msgSource, {borderTopColor: Colors.GOLD9, borderBottomColor: Colors.GOLD9, background: "transparent url('/systems/kult4th/assets/backgrounds/texture-gold.webp') repeat repeat center center/300px"}, 0.5)
        .to(msgSource, {opacity: 1, duration: 0.5, ease: "power2.out"}, 0.5)

        .fromTo(msgSourceName$, {
          textShadow: "0 0 0 rgb(0, 0, 0), 0 0 0 rgb(0, 0, 0), 0 0 0 rgb(0, 0, 0), 0 0 0 rgb(0, 0, 0), 0 0 0 rgb(0, 0, 0), 0 0 0 rgb(0, 0, 0)"},  {
          color: Colors.GREY0,
          textShadow: `0 0 5px ${Colors.GOLD8}, 0 0 5px ${Colors.GOLD8}, 0 0 5px ${Colors.GOLD8}, 0 0 5px ${Colors.GOLD8}, 0 0 5px ${Colors.GOLD8}, 0 0 5px ${Colors.GOLD8}`
        }, 0)
        .to(msgOutcomeMain, {filter: "saturate(0.25)", color: "rgb(255, 255, 255)", textShadow: "0 0 2px rgba(255, 255, 255, 0.8), 0 0 4px rgba(255, 255, 255, 0.8), 0 0 4.5px rgba(255, 255, 255, 0.8), 0 0 8px rgba(220, 220, 65, 0.8), 0 0 12.5px rgba(220, 220, 65, 0.8), 0 0 16.5px rgba(220, 220, 65, 0.5), 0 0 21px rgba(220, 220, 65, 0.5), 0 0 29px rgba(220, 220, 65, 0.5), 0 0 41.5px rgba(220, 220, 65, 0.5)", duration: 1, onComplete() {
          msgOutcomeMain.addClass("neon-glow-animated-gold");
          msgOutcomeMain.attr("style", "color: rgb(255, 255, 255); visibility: visible; filter: saturate(0.45)");
        }}, 0)
        .to(msgOutcomeSub, {color: Colors.GOLD9, textShadow: "none", duration: 1}, 0)
        .to(msgTextToBrightGold, {color: Colors.GOLD8, duration: 1}, 0);
  },
  animateToFailure(message$: JQuery): gsap.core.Timeline {
    /*  const {duration, stagger, ease} = config as {duration: number, stagger: number, ease: string};
      duration: 1,
      stagger: 0,
      ease: "power3.in" */
    const msgBgBase$ = message$.find(".message-bg.bg-base");
    message$.find(".message-bg.bg-fail").css("visibility", "visible");


    const msgDropCap$ = message$.find(".drop-cap");
    const msgAttrFlare = message$.find(".roll-term-container[class*='attribute-']");
    const msgCharName$ = message$.find(".roll-char-name *");
    const msgIntroLine$ = message$.find(".roll-intro-line *");
    const msgAttrName$ = message$.find(".roll-intro-line .text-attributename *");
    const msgIcon$ = message$.find(".icon-container");

    const msgSource = message$.find(".roll-source-header");
    const msgSourceName$ = msgSource.find(".roll-source-name .roll-source-text");
    const msgGears = message$.find(".roll-total-gear > img");
    const msgTotal = message$.find(".roll-total-number");
    const msgOutcomeMain = message$.find(".roll-outcome .roll-outcome-main");
    const msgOutcomeSub = message$.find(".roll-outcome .roll-outcome-sub");
    const msgTextToRed = message$.find(".roll-source-source-name .roll-source-text, .roll-dice-results ~ * *");
    // const msgTextToBlack = message$.find(".roll-source-name .roll-source-text");
    return gsap.timeline({ease: "power3.in", clearProps: true})
      .to(msgBgBase$, {autoAlpha: 0, duration: 1, ease: "power2.inOut"})
      .fromTo(msgIcon$, {filter: "sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0)"}, {filter: `sepia(0) brightness(0.5) saturate(3) hue-rotate(-45deg) saturate(1) contrast(5) drop-shadow(2px 2px 2px ${Colors.GREY0})`, duration: 1}, 0)
      .to(msgCharName$, {color: Colors.RED8, duration: 1, ease: "power2.inOut"}, 0)
      .to(msgIntroLine$, {color: Colors.RED8, duration: 1, ease: "power2.inOut"}, 0)
      .to(msgAttrName$, {color: Colors.RED8, filter: "brightness(3) saturate(1.5)", duration: 1, ease: "power2.inOut"}, 0)
      .fromTo(msgDropCap$, {filter: "sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0)"}, {filter: `sepia(0) brightness(0.5) saturate(3) hue-rotate(-45deg) saturate(1) contrast(5) drop-shadow(2px 2px 2px ${Colors.GREY0})`, duration: 1}, 0)
        // .fromTo(msgAttrFlare, {filter: "sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1)"}, {filter: "sepia(5) brightness(0.25) saturate(5) hue-rotate(-45deg) saturate(3) brightness(1) contrast(1)", duration: 1}, 0)
        .fromTo(msgGears, {filter: "blur(1.5px) sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1)"}, {filter: "blur(1.5px) sepia(5) brightness(0.65) saturate(5) hue-rotate(-45deg) contrast(2)", duration: 1}, 0)
        .fromTo(msgTotal, {filter: "brightness(1) saturate(1) contrast(1)"}, {filter: "brightness(0.75) saturate(2) contrast(1)", duration: 1}, 0)

        .to(msgSource, {opacity: 0, duration: 0.5, ease: "power2.out"}, 0)
        .set(msgSource, {borderTopColor: Colors.RED9, borderBottomColor: Colors.RED9, background: "transparent url('/systems/kult4th/assets/backgrounds/texture-red.webp') repeat repeat center center/300px"}, 0.5)
        .to(msgSource, {opacity: 1, duration: 0.5, ease: "power2.out"}, 0.5)
        .fromTo(msgSourceName$, {
          textShadow: "0 0 0 rgb(0, 0, 0), 0 0 0 rgb(0, 0, 0), 0 0 0 rgb(0, 0, 0), 0 0 0 rgb(0, 0, 0), 0 0 0 rgb(0, 0, 0), 0 0 0 rgb(0, 0, 0)"},  {
          color: Colors.GREY0,
          textShadow: `0 0 5px ${Colors.RED8}, 0 0 5px ${Colors.RED8}, 0 0 5px ${Colors.RED8}, 0 0 5px ${Colors.RED8}, 0 0 5px ${Colors.RED8}, 0 0 5px ${Colors.RED8}`
        }, 0)
        .to(msgOutcomeMain, {color: "rgb(255, 255, 255)", textShadow: "0 0 2px rgba(255, 255, 255, 0.8), 0 0 4px rgba(255, 255, 255, 0.8), 0 0 4.5px rgba(255, 255, 255, 0.8), 0 0 8px rgba(220, 65, 65, 0.8), 0 0 12.5px rgba(220, 65, 65, 0.8), 0 0 16.5px rgba(220, 65, 65, 0.5), 0 0 21px rgba(220, 65, 65, 0.5), 0 0 29px rgba(220, 65, 65, 0.5), 0 0 41.5px rgba(220, 65, 65, 0.5)", duration: 1, onComplete() {
          msgOutcomeMain.addClass("neon-glow-animated-red");
          msgOutcomeMain.attr("style", "color: rgb(255, 255, 255); visibility: visible");
        }}, 0)
        .to(msgOutcomeSub, {color: Colors.RED9, textShadow: "none", duration: 1}, 0)
        .to(msgTextToRed, {color: Colors.RED8, duration: 1}, 0);
  },
  animateToPartial(message$: JQuery): gsap.core.Timeline {

  const msgBgBase$ = message$.find(".message-bg.bg-base");
  message$.find(".message-bg.bg-partial").css("visibility", "visible");


  const msgDropCap$ = message$.find(".drop-cap");
  const msgAttrFlare = message$.find(".roll-term-container[class*='attribute-']");
  const msgCharName$ = message$.find(".roll-char-name *");
  const msgIntroLine$ = message$.find(".roll-intro-line *");
  const msgAttrName$ = message$.find(".roll-intro-line .text-attributename *");
  const msgIcon$ = message$.find(".icon-container");

  const msgSource = message$.find(".roll-source-header");
  const msgSourceName$ = msgSource.find(".roll-source-name .roll-source-text");
  const msgGears = message$.find(".roll-total-gear > img");
  const msgTotal = message$.find(".roll-total-number");
  const msgOutcomeMain = message$.find(".roll-outcome .roll-outcome-main");
  const msgOutcomeSub = message$.find(".roll-outcome .roll-outcome-sub");
  const msgTextToGrey = message$.find(".roll-source-source-name .roll-source-text, .roll-dice-results ~ * *");

  return gsap.timeline({ease: "power3.in", clearProps: true})
    .to(msgBgBase$, {autoAlpha: 0, duration: 1, ease: "power2.inOut"})
    .fromTo(msgIcon$, {filter: "sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0)"}, {filter: `grayscale(1) sepia(0) brightness(1) contrast(1) drop-shadow(2px 2px 2px ${Colors.GREY0})`, duration: 1}, 0)
    .to(msgCharName$, {color: Colors.GREY10, duration: 1, ease: "power2.inOut"}, 0)
    .to(msgIntroLine$, {color: Colors.GREY10, duration: 1, ease: "power2.inOut"}, 0)
    .to(msgAttrName$, {color: Colors.GREY10, filter: "brightness(3)", duration: 1, ease: "power2.inOut"}, 0)
    .fromTo(msgDropCap$, {filter: "sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0)"}, {filter: `grayscale(1) sepia(0) brightness(1) contrast(1) drop-shadow(2px 2px 2px ${Colors.GREY0})`, duration: 1}, 0)
      .fromTo(msgAttrFlare, {filter: "sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1)"}, {filter: "grayscale(1)", duration: 1}, 0)
      .fromTo(msgGears, {filter: "blur(1.5px) sepia(0) brightness(1) hue-rotate(0deg) saturate(1) contrast(1)"}, {filter: "grayscale(1) blur(1.5px) brightness(1)", duration: 1}, 0)
      .fromTo(msgTotal, {filter: "brightness(1) saturate(1) contrast(1)"}, {filter: "brightness(1) saturate(1) contrast(1) grayscale(1)", duration: 1}, 0)
      .to(msgSource, {filter: "grayscale(1)", duration: 1}, 0)
      .to(msgSourceName$, {color: Colors.GREY9}, 0)
      .to(msgOutcomeMain, {color: Colors.GREY9, duration: 1}, 0)
      .to(msgOutcomeSub, {color: Colors.GREY9, duration: 1}, 0)
      .to(msgTextToGrey, {color: Colors.GREY9, duration: 1}, 0);
},
  animateResults(message$: JQuery, msg: EunosChatMessage): gsap.core.Timeline {

    const results$ = message$.find([
      ".roll-dice-results ~ div",
      ".roll-dice-results ~ label",
      ".roll-dice-results ~ h2",
      ".roll-dice-results ~ ul li"
    ].join(", "));

    // // Split results$ into lines
    // const splitResultLines = new SplitText(results$, { type: "lines" });
    // // Set results$ to visibility: visible
    // results$.css("visibility", "visible");

    return gsap.timeline({})
      .fromTo(results$, {
      // .fromTo(splitResultLines.lines, {
        autoAlpha: 0,
        filter: "blur(10px)"
      }, {
        autoAlpha: 1,
        filter: "blur(0px)",
        ease: "power2.out",
        duration: 1,
        stagger: 0.25
      }, 0)
  }
} as const;

class EunosChatMessage extends ChatMessage {

  // #region INITIALIZATION ~

  /**
  * Pre-Initialization of the EunosChatMessage class. This method should be run during the "init" hook.
  *
  * - Registers the EunosChatMessage class as the system's ChatMessage document class.
  * - Sets the sidebar icon for the Chat tab to a microphone icon.
  * - Sets the default template for system chat messages to the "sidebar/chat-message" template.
  * - Registers a "renderChatLog" hook to add a control panel to the chat input panel for players to select the message type.
  * - Registers a "renderChatMessage" hook to apply custom CSS classes to chat messages based on their flags.
  */
  static PreInitialize() {

    // Register the EunosChatMessage class as the document type for ChatMessage
    CONFIG.ChatMessage.documentClass = EunosChatMessage;

    // Customize the sidebar icon for the Chat tab
    CONFIG.ChatMessage.sidebarIcon = "fa-regular fa-microphone-lines";

    // Set the default template for system chat messages
    CONFIG.ChatMessage.template = getTemplatePath("sidebar", "chat-message");


    // Assign object to the global scope for development purposes
    Object.assign(globalThis, {EunosChatMessage, MASTER_TIMELINES, CHILD_TIMELINES});

    // Register a hook to run when a chat message is rendered
    Hooks.on("renderChatMessage", async (message: EunosChatMessage, html) => {

      kLog.log("renderChatMessage", {message, html});

      // Apply custom CSS classes to the chat message based on its flags
      message.applyFlagCSSClasses(html);

      // Introduce a brief pause to let the DOM settle
      await sleep(500);


      // If this is the last chat message, animate it and freeze any animations of currently-animating messages
      if (message.isLastMessage) {
        await message.animate();
        getMessages()
          .filter((msg) => msg.isAnimated && msg.id !== message.id)
          .forEach((msg) => { msg.freeze(); });
      } else {
        // Otherwise, kill all tweens and hide video elements
        message.freeze();
      }
    });
  }
  // #endregion INITIALIZATION

  // #region STATIC METHODS ~
  /**
   * Gets the jQuery object for the chat log container.
   * @returns {JQuery} The jQuery object representing the chat log container.
   */
  static get ChatLog$(): JQuery {
    return $("#chat-log");
  }

  /**
   * Gets the HTML element for the chat log container.
   * @returns {HTMLElement} The HTML element for the chat log container.
   */
  static get ChatLog(): HTMLElement {
    const chatLogElem = this.ChatLog$[0];
    if (!chatLogElem) {
      throw new Error("Chat log element not found");
    }
    return chatLogElem;
  }

  /**
   * Retrieves a chat message instance based on a reference.
   * @param {string|JQuery|HTMLElement} ref - The reference to find the message. Can be:
   *   - A string representing the message ID
   *   - A jQuery object containing the message element
   *   - An HTMLElement containing the message
   * @returns {Maybe<EunosChatMessage>} The chat message instance if found, undefined otherwise.
   */
  static GetMessage(ref: string|JQuery|HTMLElement): Maybe<EunosChatMessage> {
    if (typeof ref === "string") {
      return getGame().messages.get(ref) as Maybe<EunosChatMessage>;
    } else if (ref instanceof HTMLElement) {
      const message$ = $(ref).closest(".chat-message");
      const messageId = String(message$.data("messageId"));
      return getGame().messages.get(messageId) as Maybe<EunosChatMessage>;
    } else {
      const messageId = String($(ref).data("messageId"));
      return getGame().messages.get(messageId) as Maybe<EunosChatMessage>;
    }
  }

  /**
   * Creates a list of stagger values for animation timing.
   * If a stagger value is provided, it will be used; otherwise, the corresponding default value will be used.
   * @param {ValueOrArray<number>} [stagger] - Optional stagger value or array of values to use instead of defaults
   * @param {number[]} defaults - Array of default stagger values to use when no custom value is provided
   * @returns {number[]} Array of stagger values for animation timing
   */
  static GetStaggers(stagger?: ValueOrArray<number>, defaults: number[] = []): number[] {
    const staggers = [stagger].flat();
    return defaults.map((defaultValue, index) => staggers[index] ?? defaultValue);
  }

  /**
   * Given a string, will return the URL to the drop cap image for the first character of that string.
   * @param {string} content - The string to extract the first character from.
   * @returns {string} The URL to the drop cap image for the first character of the string.
   */
  static GetDropCap(content: string): string {
    if (!content.length) {
      return ""
    };
    return `modules/eunos-kult-hacks/assets/chat/dropcaps/${content.slice(0, 1).toUpperCase()}.png`;
  }
  // #endregion STATIC METHODS

  // #region GETTERS & SETTERS ~
  animationTimeline?: gsap.core.Timeline;

  /**
   * Gets the jQuery object for the message element in the chat log.
   * @returns {JQuery} The jQuery object representing the message element.
   */
  get elem$(): JQuery {
    return EunosChatMessage.ChatLog$.find(`[data-message-id="${this.id}"]`);
  }

  get videos$(): JQuery {
    return this.elem$.find("video");
  }

  /**
   * Returns a promise that resolves when the animation timeline is defined.
   * Checks every 250ms for the timeline and times out after 10 seconds.
   * @returns {Promise<void>} A promise that resolves when the animation timeline is available.
   */
  get timelinePromise(): Promise<void> {
    if (this.animationTimeline) { return Promise.resolve(); }

    // Return a promise that checks every 250ms for _animationTimeline and resolves when it is defined.
    return new Promise((resolve, reject) => {

      const intervalId = setInterval(() => {
        if (this.animationTimeline) {
          clearInterval(intervalId); // Stop checking
          clearTimeout(timeoutId); // Clear the timeout
          resolve(); // Resolve the promise
        }
      }, 250);

      // Set a timeout to reject the promise after 10 seconds
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId); // Stop checking
        reject(new Error("Timed out waiting for _animationTimeline to be defined"));
      }, 10000); // 10 seconds
    });
  }

  /**
   * Returns a promise that resolves when all animations for this message are complete.
   * If the message is not animated, resolves immediately.
   * @returns {Promise<void>} A promise that resolves when all animations are complete.
   */
  get animationsPromise(): Promise<void> {
    if (!this.isAnimated) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      void this.timelinePromise.then(() => {
        const timeline = this.animationTimeline;
        if (!timeline) { return undefined; }
        const labelTime = timeline.labels['revealed'];
        const watchLabel = () => {
          if (timeline.time() >= (labelTime ?? 0)) {
            resolve();
            return undefined;
          }
          setTimeout(watchLabel, 250);
        };
        watchLabel();
      });
    });
  }

  /**
   * Gets the CSS classes associated with this message from its flags.
   * @returns {string[]} An array of CSS class names.
   */
  get cssClasses(): string[] {
    return this.getFlag("eunos-kult-hacks", "cssClasses") ?? [];
  }

  /**
   * Gets whether this message is currently animated.
   * A message is considered animated if it doesn't have the 'not-animating' class.
   * @returns {boolean} True if the message is animated, false otherwise.
   */
  get isAnimated(): boolean {
    return !this.cssClasses.includes("not-animating");
  }

  /**
   * Sets whether this message should be animated.
   * @param {boolean} value - True to enable animation, false to disable it.
   */
  set isAnimated(value: boolean) {
    if (value) {
      this.remClass("not-animating");
      if (!this.animationTimeline) {
        void this.animate();
      }
    } else {
      this.addClass("not-animating");
    }
  }

  isChatRoll(): this is typeof this & {outcome: EunosRollResult} {
    return this.getFlag("eunos-kult-hacks", "isRoll");
  }
  isChatTrigger(): boolean {
    return this.getFlag("eunos-kult-hacks", "isTrigger");
  }

  /**
   * Gets whether this message is the most recent message in the chat log.
   * @returns {boolean} True if this is the last message, false otherwise.
   */
  get isLastMessage(): boolean {
    return this.id === getLast(Array.from(getMessages())).id;
  }
  // #endregion GETTERS & SETTERS

  // #region DOM Manipulation ~
  /**
   * Adds one or more CSS classes to the message and updates the flags to make them permanent.
   * @param {ValueOrArray<string>} cls - The class or classes to add.
   * @param {JQuery} [html] - Optional jQuery element to apply classes to. If not provided, uses the message's element.
   */
  addClass(this: EunosChatMessage, cls: ValueOrArray<string>, html?: JQuery) {
    const classes = [cls].flat();
    const curClasses = this.cssClasses;
    if (classes.some((newCls) => !curClasses.includes(newCls))) {
      void this.setFlag("eunos-kult-hacks", "cssClasses", unique([...this.cssClasses, ...classes]))
          .then(() => { this.applyFlagCSSClasses(html); });
    }
  }

  /**
   * Removes one or more CSS classes from the message and updates the flags to make them permanent.
   * @param {ValueOrArray<string>} cls - The class or classes to remove.
   * @param {JQuery} [html] - Optional jQuery element to remove classes from. If not provided, uses the message's element.
   */
  remClass(this: EunosChatMessage, cls: ValueOrArray<string>, html?: JQuery) {
    const remClasses = [cls].flat();
    const curClasses = this.cssClasses;
    if (remClasses.some((remCls) => curClasses.includes(remCls))) {
      void this.setFlag("eunos-kult-hacks", "cssClasses", this.cssClasses.filter((c) => !remClasses.includes(c)))
          .then(() => { this.applyFlagCSSClasses(html); });
    }
  }

  /**
   * Applies the CSS classes stored in flags to the specified element.
   * @param {JQuery} [html] - Optional jQuery element to apply classes to. If not provided, uses the message's element.
   */
  applyFlagCSSClasses(html?: JQuery) {
    (html ?? this.elem$).addClass(this.cssClasses.join(" "));
  }

  // #endregion DOM Manipulation

  // #region ANIMATION ~
  /**
   * Initiates the animation sequence for a chat message.
   * If the message is not set to animate, this method does nothing.
   * For roll messages, it uses the roll result animation timeline.
   * For trigger messages, it uses the trigger result animation timeline.
   * The animation timeline is stored in the message's animationTimeline property.
   */
  async animate() {
    if (!this.isAnimated) { return; }
    this.freeze(false);
    if (this.isChatRoll()) {
      const { timeline } = await MASTER_TIMELINES.animateRollResult(this.elem$, this);
      this.animationTimeline = timeline;
    } else if (this.isChatTrigger()) {
      this.animationTimeline = MASTER_TIMELINES.animateTriggerResult(this.elem$, this);
    }
  }

  /**
   * Stops the current animation and optionally marks the message as permanently frozen.
   * @param {boolean} [isPermanent=true] - If true, the message will be marked as not animating and cannot be animated again.
   */
  freeze(isPermanent = true) {
    this.videos$.css("display", "none");
    if (isPermanent) {
      this.addClass("not-animating");
    }
    if (!this.isAnimated) { return; }
    if (!this.animationTimeline) {
      if (isPermanent) {
        this.isAnimated = false;
      }
      return;
    }
    this.animationTimeline.seek("end");
    this.animationTimeline.kill();
    if (isPermanent) {
      this.isAnimated = false;
    }
  }
  // #endregion ANIMATION
}

export default EunosChatMessage;
