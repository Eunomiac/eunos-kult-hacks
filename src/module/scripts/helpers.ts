// #region IMPORTS ~
import * as C from "./constants.js";
// import * as U from "./utilities.js";
import {isNumber, isList, uCase, lCase, sCase, tCase, signNum, getID, toKey, randNumWeighted, roundNum} from "./utilities.js";
import EunosItem from "../documents/EunosItem.js";
import EunosOverlay from "../apps/EunosOverlay.js";
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
        return isNumber(param1) && isNumber(param2) && param1 > param2;
      case "<":
        return isNumber(param1) && isNumber(param2) && param1 < param2;
      case ">=":
        return isNumber(param1) && isNumber(param2) && param1 >= param2;
      case "<=":
        return isNumber(param1) && isNumber(param2) && param1 <= param2;
      case "includes":
        param1 = isList(param1) ? Object.values(param1) : param1;
        return Array.isArray(param1) && param1.includes(param2);
      case "in":
        if (Array.isArray(param2)) { return param2.includes(param1); }
        if (isList(param2) && isStringOrNumber(param1)) { return param1 in param2; }
        if (typeof param2 === "string") { return new RegExp(String(param1), "gu").test(String(param2)); }
        return false;
      default:
        return false;
    }
  },
  "case"(mode: StringCase, str: string) {
    // return U[`${mode.charAt(0)}Case`](str);
    switch (mode) {
      case "upper": return uCase(str);
      case "lower": return lCase(str);
      case "sentence": return sCase(str);
      case "title": return tCase(str);
      default: return str;
    }
  },
  "count"(param: unknown): number {
    if (Array.isArray(param) || isList(param)) {
      return Object.values(param).length;
    }
    return param ? 1 : 0;
  },
  "signNum"(num: number) {
    return signNum(num);
  },
  "areEmpty"(...args) {
    args.pop();
    return !Object.values(args).flat().join("");
  },
  "getUniqueID"(base: string) {
    return `${base}-${getID()}`.replace(/\s+/g, "_");
  },
  "getDropCap"(content: Maybe<string>): string {
    if (!content?.length) {
      return "";
    }
    return `modules/eunos-kult-hacks/assets/chat/dropcaps/${content.slice(0, 1).toUpperCase()}.png`;
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
  "getFirstName": (actor: EunosActor): string => {
    return actor.name.split(" ")[0]!;
  },
  "getImgName": toKey,
  "stringify": (ref: Record<string, unknown>): string => JSON.stringify(ref, null, 2),
  "getTooltip": (actorID: string, itemID: string): string|false => {
    const actor = getGame().actors.get(actorID);
    const item = actor?.items.get(itemID);
    kLog.log(`Getting tooltip for Actor: ${actorID} and Item: ${itemID}`);
    if (!item) { return false; }
    kLog.log("Item", item);
    const tooltipLines: string[] = [];
    if (item.isMechanicalItem() && ["active", "triggered"].includes(item.system.type)) {
      tooltipLines.push(item.system.trigger!);
    }
    if (item.hasOptions()) {
      tooltipLines.push("<hr>");
      let optionsString = item.system.options;
      let headerString = "Options";
      // Extract the contents of any starting header element
      const headerMatch = optionsString.match(/<h\d>(.*?):?<\/h\d>/);
      if (headerMatch?.[1]) {
        headerString = headerMatch[1];
        optionsString = optionsString.replace(headerMatch[0], "").trim();
      }
      tooltipLines.push(`<h3>${headerString}:</h3>${optionsString}`);
    }
    const tooltipString = tooltipLines.join("");
    const tooltipElem$ = $(tooltipString);
    // kLog.log("Tooltip", {tooltipLines, tooltipString, tooltipElem: tooltipElem$});
    if (item.hasOptions()) {
      const triggerLabelElem$ = $(`<span class='tooltip-trigger-label'>Trigger:</span>`);
      const triggerWordsElem$ = tooltipElem$.find(".trigger-words");
      triggerWordsElem$.prepend(triggerLabelElem$);
    }
    if (tooltipLines.length > 0) {
      return $("<div>").append(tooltipElem$).html();
    }
    return false;
  },
  "getPortraitImage": (actor: EunosActor, type: "bg"|"fg"): string => {
    // kLog.log(`getPortraitImage ${actor.name} ${type}`, actor.getPortraitImage(type));
    return actor.getPortraitImage(type.trim() as "bg"|"fg");
  },
  "getSpotlightImages": (slot: string|number): string => {
    const slotNum = Number(`${slot}`) - 1;
    if (slotNum < 0 || slotNum > 4) { return ""; }
    const htmlStrings: string[] = [];
    // const numLights = randNumWeighted(1, 3, "power3.in", 1)();
    const spotlightSlots = [
      ["mid", "right", "far-right"],
      ["left", "mid", "right"],
      ["left", "mid", "right"],
      ["left", "mid", "right"],
      ["far-left", "left", "mid"],
    ][slotNum]!;
    spotlightSlots.forEach((slot) => {
      htmlStrings.push(`<img class="pc-spotlight pc-spolight-${slot} pc-spotlight-on" src="modules/eunos-kult-hacks/assets/images/stage/spotlights/spotlight-${slot}-on.webp" />`);
      htmlStrings.push(`<img class="pc-spotlight pc-spolight-${slot} pc-spotlight-off" src="modules/eunos-kult-hacks/assets/images/stage/spotlights/spotlight-${slot}-off.webp" />`);
    })
    return htmlStrings.join("");
  },
  "getNameplateImage": (actor: EunosActor): string => {
    // Retrieve first word of actor's name, and convert any accented or special characters to their ASCII equivalents, and convert to lowercase
    const name = actor.name.split(" ")[0]!;
    const asciiName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").toLowerCase();
    return `modules/eunos-kult-hacks/assets/images/stage/pc-frame/frame-nameplate-${asciiName}.webp`;
  },
  "getDotline": (current: number, max: number): string => {
    // Create array of styled bullet spans
    const bullets = Array(max).fill(`<span class="dot empty"></span>`);
    for (let i = 0; i < current; i++) {
      bullets[i] = `<span class="dot filled"></span>`;
    }
    return `<div class="dotline">${bullets.join("")}</div>`;
  },
  "actorHasGogglesImg": (actor: EunosActor): boolean => {
    return Boolean(actor.getGogglesImageSrc());
  },
  "getGogglesImg": (actor: EunosActor): string => {
    return actor.getGogglesImageSrc() ?? (actor.img as string);
  },
  "isLocationBright": (): boolean => {
    return EunosOverlay.instance.isLocationBright;
  },
  "isOutdoors": (): boolean => {
    return EunosOverlay.instance.isOutdoors;
  },
  /**
   * Constructs a complete CSS filter string from individual filter values
   * @param filters - Object containing filter properties and their values
   * @returns Complete CSS filter string
   * @example
   * {{constructFilterString filters}}
   * // => "hue-rotate(45deg) saturate(1.2)"
   */
  "constructFilterString": (filters: Record<string, number>): string => {
    return Object.entries(filters)
      .map(([property, value]) => {
        switch (property) {
          case "hue-rotate":
            return `${property}(${value}deg)`;
          case "saturate":
            return `${property}(${value})`;
          default:
            return `${property}(${value})`;
        }
      })
      .join(" ");
  },
  /**
   * Constructs a complete radial gradient background string
   * @param x - Circle position X percentage
   * @param y - Circle position Y percentage
   * @param stop - Gradient stop percentage
   * @returns Complete CSS radial-gradient string
   * @example
   * {{constructGradientString circlePositionX circlePositionY gradientStopPercentage}}
   * // => "radial-gradient(circle at 25% 0%, transparent, rgba(0, 0, 0, 0.9) 50%)"
   */
  "constructGradientString": (x: number, y: number, stop: number): string => {
    return `radial-gradient(circle at ${Math.round(x)}% ${Math.round(y)}%, transparent, rgba(0, 0, 0, 0.9) ${Math.round(stop)}%)`;
  },
  /**
   * Formats a value with appropriate units for display
   * @param type - The type of value ("filter" or "background")
   * @param property - The specific property name
   * @param value - The numeric value
   * @returns Formatted string with appropriate units
   * @example
   * {{formatValue "filter" "hue-rotate" 45}}
   * // => "45°"
   */
  "formatValue": (type: "filter"|"background", property: string, value: number): string => {
    if (type === "filter") {
      switch (property) {
        case "hue-rotate":
          return `${Math.round(value)}°`;
        case "saturate":
          return value.toFixed(2);
        default:
          return String(value);
      }
    } else {
      // All gradient values are percentages
      return `${Math.round(value)}%`;
    }
  },
  /**
   * Rounds a number to specified decimal places
   * @param num - The number to round
   * @param decimals - Number of decimal places (default: 0)
   * @returns Rounded number
   */
  "round": (num: number, decimals: number = 0): number => {
    return roundNum(num, decimals);
  },
};

export function registerHandlebarHelpers() {
  Object.entries(handlebarHelpers).forEach(([name, func]) => { Handlebars.registerHelper(name, func); });
}
