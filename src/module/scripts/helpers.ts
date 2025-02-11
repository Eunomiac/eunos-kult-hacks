// #region IMPORTS ~
import * as C from "./constants.js";
import * as U from "./utilities_old.js";
import EunosItem from "../documents/EunosItem.js";
// import SVGDATA, {SVGKEYMAP} from "./svgdata.js";
// import K4Actor from "../documents/K4Actor.js";
// import K4Item from "../documents/K4Item.js";
// import K4ChatMessage from "../documents/K4ChatMessage.js";
// #endregion

// type ContextType = K4Item | {
//   data: {
//     root: {
//       document?: K4Item|K4Actor;
//       item?: K4Item;
//     }
//   }
// } | {
//   data: {
//     root: K4Item.System;
//   };
// };

// export function formatForKult(str: string, iData: /* foundry.abstract.Document.Any|{system: K4Item.SystemSchema.Any|K4Actor.SystemSchema.Any} */ unknown) {

//   // // Step One: Replace any data object references.
//   // str = str.replace(
//   //   /%([^%.]+)\.([^%]+)%/g,
//   //   (_, sourceRef: string, dataKey: string): string => {
//   //   // kLog.log(`[formatForKult: '${sourceRef}']`, {str, iData, sourceRef, dataKey}, 3);
//   //   switch (sourceRef) {
//   //     case "list": {
//   //       const  listItems = U.getProp<string[]>(iData, `system.lists.${dataKey}.items`);
//   //       if (!listItems) {
//   //         return `<span style='color: red;'>No Such List: ${dataKey}</span>`;
//   //       }
//   //       return [
//   //         `<ul class='inline-list list-${dataKey}'>`,
//   //         ...listItems.map((item) => `<li>${item}</li>`),
//   //         "</ul>"
//   //       ].join("");
//   //     }
//   //     case "insert": {
//   //       switch (dataKey) {
//   //         case "break": {
//   //           return "<br /><br />";
//   //         }
//   //         case "rollPrompt": {
//   //           const attribute = U.getProp<string>(iData, "system.attribute");
//   //           if (!attribute) {
//   //             return `<span style='color: red;'>No Such Attribute: ${dataKey}</span>`;
//   //           }
//   //           return [
//   //             "#>text-attributename>",
//   //             "roll ",
//   //             `+${attribute ? U.tCase(attribute) : "Attribute"}`,
//   //             "<#"
//   //           ].join("");
//   //         }
//   //         default: {
//   //           let actor: Maybe<K4Actor> = undefined;
//   //           if (iData instanceof K4Item && iData.isOwned && iData.parent instanceof K4Actor) {
//   //             actor = iData.parent;
//   //           } else if (iData instanceof K4Actor) {
//   //             actor = iData as K4Actor;
//   //           } else if (iData instanceof K4ChatMessage) {
//   //             actor = iData.actor;
//   //           }
//   //           if (dataKey.startsWith("actor")) {
//   //             if (!actor) {
//   //               return `<span style='color: red;'>Could Not Resolve Actor for ${dataKey}</span>`;
//   //             }
//   //             const dotKey = dataKey.slice(6);
//   //             kLog.log(`[formatForKult] With dataKey '${dataKey}', actor '${actor.name}' and dotKey '${dotKey}', returning: '${U.getProp<string>(actor, dotKey) ?? ""}'`)
//   //             return U.getProp(actor, dotKey) ?? "";
//   //           }
//   //           if (/^(doc|roll)Link/.test(dataKey)) {
//   //             let [docName, docDisplay] = dataKey.split(".").slice(1) as Array<Maybe<string>>;
//   //             let doc: Maybe<K4Item> = undefined;
//   //             if (actor) {
//   //               doc = actor.items.getName(docName ?? "");
//   //             } else {
//   //               doc = getGame().items.getName(docName ?? "");
//   //             }
//   //             if (!doc) {
//   //               return `<span class="text-docLink" data-doc-name="${docName}" data-action="open">${docName}</span>`;
//   //             }
//   //             docDisplay ??= doc.name;
//   //             if (dataKey.startsWith("docLink")) {
//   //               return `<span class="text-docLink" data-doc-id="${doc.id}" data-doc-name="${doc.name}" data-action="open">${docDisplay}</span>`;
//   //             }
//   //             return `<span class="text-rollLink" data-doc-id="${doc.id}" data-doc-name="${doc.name}" data-action="roll">${docDisplay}</span>`;
//   //           }
//   //           if (dataKey.startsWith("FLAGS")) {
//   //             const [_, effectID, ...flagKeyParts] = dataKey.split(".");
//   //             const flagKey = flagKeyParts.join(".");
//   //             if (!actor) {
//   //               throw new Error("Cannot access flags from a non-actor item");
//   //             }
//   //             const effect = actor.effects.get(effectID as IDString);
//   //             if (!effect) {
//   //               throw new Error(`No such effect: ${effectID}`);
//   //             }

//   //             return effect.flagGet(flagKey)!;
//   //           }
//   //           return `<span style='color: red;'>No Such Prompt: ${dataKey}</span>`;
//   //         }
//   //       }
//   //     }
//   //     default: return `<span style='color: red;'>No Such Source: ${sourceRef}.${dataKey}</span>`;
//   //   }
//   // })
//   //   // Apply spans around all hash-tag indicators
//   //   // .replace(/#>([^>]+)>([^<>#]+)<#/g, "<span class='text-tag $1'>$2</span>");

//   // // Step Two: Apply span styling.
//   // // str = str.replace(/Check: /g, "CHECK"); // Remove the colon from 'Check:' moves, to avoid confusing the replacer
//   // let prevStr;
//   // while (str !== prevStr) {
//   //   prevStr = str;
//   //   str = str.replace(/#>([^>&]+)(&[^>]+)?>([^#]+)<#/g, (_, classRefs: Maybe<string>, attrRefs: Maybe<string>, contents: Maybe<string>) => {
//   //     classRefs = ["text-tag", classRefs ?? ""].join(" ").trim();
//   //     const htmlParts = [
//   //       "<span class='",
//   //       classRefs,
//   //       "'"
//   //     ];
//   //     if (attrRefs) {
//   //       htmlParts.push(attrRefs.replace(/&/g, " "));
//   //     }
//   //     htmlParts.push(">");
//   //     // if (classRefs.includes("chat-select")) {
//   //     //   htmlParts.push("<span class='selection-key'></span>");
//   //     // }
//   //     htmlParts.push(...[
//   //       contents ?? "",
//   //       "</span>"
//   //     ]);
//   //     return htmlParts.join("");
//   //   });
//   // }
//   // // str = str.replace(/CHECK/g, "Check: ");

//   // // Step Three: Apply final specific fixes to formatting

//   // // If the string does not begin and end with an html tag, wrap it in a <p> tag.
//   // // if (!str.startsWith("<") && !str.endsWith(">")) {
//   // //   str = `<p class='text-wrapper'>${str}</p>`;
//   // // }
//   // str = str
//   //   // Remove empty <p> elements
//   //   .replace(/<p[^>]*>[\s\t\n]*<\/p>/g, "");

//   return str;
// }

const handlebarHelpers: Record<string,Handlebars.HelperDelegate> = {
  /**
   * Handlebars helper that allows defining local variables (like #with), but without changing the context. Can define multiple variables in one call (see example).
   * @param {Object} options - The options object provided by Handlebars.
   * @returns {string} - The rendered block with access to the defined local variables.
   * @example
   * // In your Handlebars template:
   * {{#let
   *   anchorName=(uniqueAnchorName 'occupation')
   *   title="Occupation"
   *   suggestions=occupationSuggestions
   * }}
   *   ... HTML with above variables added to scope ...
   * {{/let}}
   */
  "let"(options: Handlebars.HelperOptions): string {
    // Merge the current context with the hash arguments, then execute the block with the new context, but keep the original context as `this`
    return options.fn({ ...this, ...options.hash });
  },
  /**
   * Handlebars helper to perform various comparison operations.
   * @param {unknown} param1 - The first parameter for comparison.
   * @param {string} operator - The comparison operator.
   * @param {unknown} param2 - The second parameter for comparison.
   * @returns {boolean} - The result of the comparison.
   */
  "test"(param1: unknown, operator: string, param2: unknown): boolean {
    const isStringOrNumber = (a: unknown): a is string | number => typeof a === "number" || typeof a === "string";

    if (["!", "!!", "not"].includes(param1 as string)) {
      ([param1, operator] = [operator, param1 as string]);
    }

    switch (operator) {
      case "||":
        return Boolean(param1) || Boolean(param2);
      case "&&":
        return Boolean(param1) && Boolean(param2);
      case "!":
      case "!!":
      case "not":
        return !param1;
      case "==":
      case "===":
        return param1 === param2;
      case "!=":
      case "!==":
        return param1 !== param2;
      case ">":
        return U.isNumber(param1) && U.isNumber(param2) && param1 > param2;
      case "<":
        return U.isNumber(param1) && U.isNumber(param2) && param1 < param2;
      case ">=":
        return U.isNumber(param1) && U.isNumber(param2) && param1 >= param2;
      case "<=":
        return U.isNumber(param1) && U.isNumber(param2) && param1 <= param2;
      case "includes":
        param1 = U.isList(param1) ? Object.values(param1) : param1;
        return Array.isArray(param1) && param1.includes(param2);
      case "in":
        if (Array.isArray(param2)) { return param2.includes(param1); }
        if (U.isList(param2) && isStringOrNumber(param1)) { return param1 in param2; }
        if (typeof param2 === "string") { return new RegExp(String(param2), "gu").test(String(param1)); }
        return false;
      default:
        return false;
    }
  },
  "case"(mode: StringCase, str: string) {
    // return U[`${mode.charAt(0)}Case`](str);
    switch (mode) {
      case "upper": return U.uCase(str);
      case "lower": return U.lCase(str);
      case "sentence": return U.sCase(str);
      case "title": return U.tCase(str);
      default: return str;
    }
  },
  "count"(param: unknown): number {
    if (Array.isArray(param) || U.isList(param)) {
      return Object.values(param).length;
    }
    return param ? 1 : 0;
  },
  "signNum"(num: number) {
    return U.signNum(num);
  },
  "areEmpty"(...args) {
    args.pop();
    return !Object.values(args).flat().join("");
  },
  "getUniqueID"(base: string) {
    return `${base}-${U.getID()}`.replace(/\s+/g, "_");
  },
  "getDropCap"(content: Maybe<string>): string {
    if (!content?.length) {
      return "";
    }
    return `systems/${C.SYSTEM_ID}/assets/chat/dropcaps/${content.slice(0, 1).toUpperCase()}.png`;
  },
  "getRestCaps"(content: string): string {
    return content.slice(1);
  },
  "kLog"(...args: Tuple<string|number>) {
    args.pop();
    let dbLevel = 5;
    if ([0,1,2,3,4,5].includes(args[0] as number)) {
      dbLevel = args.shift() as number;
    }
    kLog.hbsLog(...(args.map(String) as Tuple<string>), dbLevel);
  },
  "getImgName": U.toKey,
  "stringify": (ref: Record<string, unknown>): string => JSON.stringify(ref, null, 2),
  "getTooltip": (actorID: string, itemID: string): string|false => {
    const actor = getGame().actors.get(actorID);
    const item = actor?.items.get(itemID);
    console.log(`Getting tooltip for Actor: ${actorID} and Item: ${itemID}`);
    if (!item) { return false; }
    console.log("Item", item);
    if (item.isMechanicalItem() && ["active", "triggered"].includes(item.system.type)) {
      return item.system.trigger!;
    }
    return false;
  },
  "getDotline": (current: number, max: number): string => {
    // Create array of styled bullet spans
    const bullets = Array(max).fill(`<span class="dot empty"></span>`);
    for (let i = 0; i < current; i++) {
      bullets[i] = `<span class="dot filled"></span>`;
    }
    return `<div class="dotline">${bullets.join("")}</div>`;
  }
};

export function registerHandlebarHelpers() {
  Object.entries(handlebarHelpers).forEach(([name, func]) => { Handlebars.registerHelper(name, func); });
}
