// #region IMPORTS ~
import {getSetting, formatDateAsISO} from "./utilities.ts";
import {GamePhase, PCTargetRef} from "./enums.ts";
import EunosOverlay from "../apps/EunosOverlay";
import fields = foundry.data.fields;
import {LOCATIONS} from "./constants.ts";
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

  // Next game session date/time (in Toronto timezone)
  getSettings().register("eunos-kult-hacks", "nextGameSession", {
    name: "Next Game Session",
    hint: "Date and time of the next game session (Toronto time). Format: YYYY-MM-DD HH:mm",
    scope: "world",
    config: true,
    type: String,
    default: (() => {
      // Default to next Friday at 7:30 PM Toronto time
      const date = new Date();
      date.setUTCHours(23, 30, 0, 0); // 7:30 PM Toronto (UTC-4/5)

      // Find next Friday
      while (date.getDay() !== 5) { // 5 = Friday
        date.setDate(date.getDate() + 1);
      }

      return formatDateAsISO(new Date(date.toLocaleString("en-US", { timeZone: "America/Toronto" })));
    })(),
    onChange: (value) => {
      // Validate the date format
      const date = new Date(formatDateAsISO(value));
      if (isNaN(date.getTime())) {
        ui.notifications?.error("Invalid date format. Please use YYYY-MM-DD HH:mm");
        return false;
      }
      return true;
    }
  });

  getSettings().register("eunos-kult-hacks", "chapterTitle", {
    name: "Chapter Title",
    hint: "The title of the current chapter.",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });
  getSettings().register("eunos-kult-hacks", "chapterNumber", {
    name: "Chapter Number",
    hint: "The number of the current chapter.",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
  });
  getSettings().register("eunos-kult-hacks", "isEntryVisible", {
    name: "Entry Visible",
    hint: "Whether the entry is visible.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
    onChange: (value) => {
      if (value) {
        $(".background-layer").removeClass("entry-hidden");
      } else {
        $(".background-layer").addClass("entry-hidden");
      }
    }
  });
  getSettings().register("eunos-kult-hacks", "isPlottingLocations", {
    name: "Plotting Locations",
    hint: "Whether the GM is plotting locations.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
  getSettings().register("eunos-kult-hacks", "currentLocation", {
    name: "Current Location",
    hint: "The name of the current location.",
    scope: "world",
    choices: Object.fromEntries(
      Object.keys(LOCATIONS).map(key => [key, key])
    ) as { [K in keyof typeof LOCATIONS]?: string },
    config: true,
    type: String,
    default: "Willow's Wending" as keyof typeof LOCATIONS,
  });
  getSettings().register("eunos-kult-hacks", "locationData", {
    name: "Location Data",
    hint: "Data for all configured locations.",
    scope: "world",
    config: false,
    type: Object,
    default: {
      "Willow's Wending Entry": {
        name: "Willow's Wending",
        mapTransforms: [],
        pcData: {},
        npcData: {},
        playlists: []
      }
    }
  })
  getSettings().register("eunos-kult-hacks", "sessionScribeDeck", {
    name: "Session Scribe",
    hint: "The deck of remaining userIDs to be assigned session scribe this round.",
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });
  getSettings().register("eunos-kult-hacks", "sessionScribe", {
    name: "Session Scribe",
    hint: "The userID of the current session scribe.",
    scope: "world",
    config: false,
    type: String,
    default: "",
  });
  getSettings().register("eunos-kult-hacks", "dramaticHookAssignments", {
    name: "Dramatic Hook Assignments",
    hint: "The assignments of dramatic hooks to players.",
    scope: "world",
    config: false,
    type: Object,
    default: {},
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
