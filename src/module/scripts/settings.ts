// #region IMPORTS ~
import {getSetting} from "./utilities.ts";
import {GamePhase} from "./enums.ts";
// #endregion

export default function registerSettings() {
  getSettings().register("eunos-kult-hacks", "debug", {
    "name": "Debug Level",
    "hint": "Debug messages logged to the console each have a priority, a value between 0 and 5. Set the minimum priority for displaying debug messages: Debug messages with priorities lower than this number will not be shown.",
    "scope": "client",
    "config": true,
    "default": 3,
    "type": Number,
    "range": {
      min: 0,
      max: 5,
      step: 1
    },
    "onChange": () => { kLog.log(`Logging level set to ${String(getSetting("debug"))}`, 0); }
  });
  getSettings().register("eunos-kult-hacks", "useStabilityVariant", {
    "name": "Variant Rule: Stability",
    "hint": "Use a variant for Stability that uses an additional level (for a total of ten), and allows for more flexibility defining the character's mental state at each level. Recommended.",
    "scope": "world",
    "config": true,
    "default": false,
    "type": Boolean
  });
  getSettings().register("eunos-kult-hacks", "gamePhase", {
    name: "Game Phase",
    scope: "world",
    config: false,
    type: String,
    default: GamePhase.SessionClosed,
  });
}

export function initTinyMCEStyles() {
  return;
  // CONFIG.TinyMCE.plugins += " searchreplace preview template";
  // CONFIG.TinyMCE.toolbar += " | searchreplace template";
  // CONFIG.TinyMCE.style_formats = [
  //   {
  //     title: U.tCase(U.loc("kult4th.system.tinymce.headings")),
  //     items: [
  //       {title: U.tCase(U.loc("kult4th.system.tinymce.headingNum", {headingNum: String(1)})), block: "h1", wrapper: false},
  //       {title: U.tCase(U.loc("kult4th.system.tinymce.headingNum", {headingNum: String(2)})), block: "h2", wrapper: false},
  //       {title: U.tCase(U.loc("kult4th.system.tinymce.headingNum", {headingNum: String(3)})), block: "h3", wrapper: false},
  //       {title: U.tCase(U.loc("kult4th.system.tinymce.headingNum", {headingNum: String(4)})), block: "h4", wrapper: false}
  //     ]
  //   },
  //   {
  //     title: U.tCase(U.loc("kult4th.system.tinymce.block")),
  //     items: [
  //       {title: U.tCase(U.loc("kult4th.system.tinymce.paragraph")), block: "p", wrapper: true}
  //     ]
  //   },
  //   {
  //     title: U.tCase(U.loc("kult4th.system.tinymce.inline")),
  //     items: [
  //       {title: U.tCase(U.loc("kult4th.system.tinymce.bold")), inline: "strong", wrapper: false},
  //       {title: U.tCase(U.loc("kult4th.system.tinymce.extraBold")), inline: "strong", classes: "text-extra-bold", wrapper: false},
  //       {title: U.tCase(U.loc("kult4th.system.tinymce.italics")), inline: "em", wrapper: false}
  //     ]
  //   },
  //   {
  //     title: "Rules",
  //     items: [
  //       {title: U.tCase(U.loc("kult4th.system.trigger")), inline: "em", classes: "text-trigger", wrapper: false},
  //       {title: U.tCase(U.loc("kult4th.system.keyword")), inline: "strong", classes: "text-keyword", wrapper: false},
  //       {title: U.tCase(U.loc("kult4th.item.type.move")), inline: "em", classes: "text-keyword text-docLink", wrapper: false}
  //     ]
  //   }
  // ];
  // CONFIG.TinyMCE.skin = "Kult4th";
  // CONFIG.TinyMCE.skin_url = "systems/kult4th/tinymce/ui/Kult4th";
  // CONFIG.TinyMCE.style_formats_merge = false;
  // if (typeof CONFIG.TinyMCE.content_css === "string") {
  //   CONFIG.TinyMCE.content_css = [CONFIG.TinyMCE.content_css];
  // } else if (!Array.isArray(CONFIG.TinyMCE.content_css)) {
  //   CONFIG.TinyMCE.content_css = [];
  // }
  // CONFIG.TinyMCE.content_css.push("systems/kult4th/tmce-editor.css");

}

// export function initCanvasStyles() {
//   CONFIG.canvasTextStyle = new PIXI.TextStyle({
//     align: "center",
//     dropShadow: true,
//     dropShadowAngle: U.degToRad(45),
//     dropShadowBlur: 8,
//     dropShadowColor: C.Colors.GREY1,
//     dropShadowDistance: 4,
//     fill: [
//       C.Colors.GOLD8,
//       C.Colors.GOLD5
//     ],
//     fillGradientType: 1,
//     fillGradientStops: [
//       0,
//       0.3
//     ],
//     fontFamily: "Ktrata",
//     fontSize: 32,
//     letterSpacing: 2,
//     lineHeight: 32,
//     lineJoin: "round",
//     padding: 4,
//     stroke: C.Colors.GOLD1,
//     strokeThickness: 3,
//     trim: true,
//     whiteSpace: "normal",
//     wordWrap: true,
//     wordWrapWidth: 0.1
//   });
//   CONFIG.defaultFontFamily = "Ktrata";
// }
