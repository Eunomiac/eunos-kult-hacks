// #region IMPORTS ~

import * as U from "./utilities.js";
import * as C from "./constants.js";
// #endregion

// #region CONFIG ~
const DEFAULT_DB_LEVEL: DebugLevel = 3;
const DEFAULT_MAX_DB_LEVEL: DebugLevel = 3;
const STACK_TRACE_EXCLUSION_FILTERS: Record<"all", RegExp[]> & Partial<Record<DebugMode, RegExp[]>> = {
  all: [
    /at (getStackTrace|k4Logger|kLog|openReport|report|postReport)/,
    /at Object\.(log|display|hbsLog|error|openReport|report|postReport)/,
    /^Error/
  ],
  base: [],
  error: [],
  handlebars: [
    /scripts\/handlebars/
  ]
};
const STYLES = {
  base: {
    "background": C.Colors.GREY1,
    "color": C.Colors.GOLD8,
    "font-family": "Pragmata Pro",
    "padding": "0 25px",
    "margin-right": "25px"
  },
  display: {
    "color": C.Colors.GOLD9,
    "font-family": "Kultrata SC",
    "text-transform": "lowercase",
    "font-size": "16px",
    "margin-left": "-100px",
    "padding": "0 100px"
  },
  error: {
    "color": C.Colors.RED9,
    "background": C.Colors.RED1,
    "font-weight": 500
  },
  handlebars: {
    "background": C.Colors.GREY5,
    "color": C.Colors.BLUE5,
    "font-family": "Pragmata Pro",
    "padding": "0",
    "margin-right": "25px"
  },
  report: {
    "background": C.Colors.GREY0,
    "color": C.Colors.GOLD9,
    "font-family": "Pragmata Pro",
    "padding": "0 25px",
    "margin-right": "25px"
  },
  stack: {
    "color": C.Colors.GOLD5,
    "font-weight": 100,
    "font-size": "10px",
    "font-family": "Pragmata Pro"
  }
};
// #endregion
// #region TYPES ~
type DebugLevel = 0|1|2|3|4|5;
type DebugMode = "base"|"display"|"error"|"handlebars"|"report";

interface DebugReport {
  debugLevel: DebugLevel,
  consoleCalls: Array<Array<Tuple<ValOf<typeof console>, unknown[]>>>
}
// #endregion

const getStackTrace: {
  (mode: DebugMode, exclude?: RegExp[]): Maybe<string>;
  (regExpFilters?: RegExp[]): Maybe<string>;
} = (...args: Array<DebugMode|RegExp[]|undefined>): Maybe<string> => {

  /**
   * If a mode is supplied, and it is not a key in STACK_TRACE_EXCLUSION_FILTERS, that
   * mode does not incorporate a stack trace into its console message: Return early.
   */
  const maybeMode: Maybe<DebugMode> = typeof args[0] === "string" ? args[0] : undefined;
  if (maybeMode && !(maybeMode in STACK_TRACE_EXCLUSION_FILTERS)) { return undefined; }

  /**
   * Construct the initial stack trace, returning early if none exists.
   */
  const stackTrace = (new Error()).stack;
  if (!stackTrace) { return undefined; }

  /**
   * Construct regular expression filters to exclude irrelevant or unwanted lines from the stack trace.
   **/
  // Start with default "all" filters
  const regExpFilters: RegExp[] = [...STACK_TRACE_EXCLUSION_FILTERS.all];
  // Add any custom filters supplied in the function parameters.
  args.filter((arg): arg is RegExp[] => Array.isArray(arg))
    .forEach((arg: RegExp[]) => regExpFilters.push(...arg));
  // Add any default filters for the DebugMode, if one is supplied
  if (maybeMode) {
    regExpFilters.push(...STACK_TRACE_EXCLUSION_FILTERS[maybeMode]!);
  }

  /**
   * Filter, format, and return the stack trace.
   */
  return stackTrace
    .split(/\s*\n\s*/)
    .filter((sLine) => !regExpFilters.some((rTest) => rTest.test(sLine)))
    .join("\n");
};
const checkDebugLevel = (loggerArgs: unknown[]) => {
  const maxDBLevel = U.getSetting<DebugLevel>("debug") ?? DEFAULT_MAX_DB_LEVEL;
  const dbLevel: DebugLevel = (loggerArgs.length > 0 && [0,1,2,3,4,5].includes(U.getLast(loggerArgs) as number))
    ? loggerArgs.pop() as DebugLevel
    : DEFAULT_DB_LEVEL;
  return true; // dbLevel <= maxDBLevel;
}
const getConsoleCalls = (type: KeyOf<typeof STYLES> = "base", ...content: [string, ...unknown[]]): Array<Tuple<(...args: unknown[]) => void, unknown[]>> => {
  const [message, ...data] = content;
  const stackTrace = getStackTrace(type as DebugMode);
  const styleLine = Object.entries({
    ...STYLES.base,
    ...STYLES[type]
  }).map(([prop, val]) => `${prop}: ${val};`).join(" ");

  const consoleCalls: Array<Tuple<(...args: unknown[]) => void, unknown[]>> = [];

  let isClosingGroup = false;
  let firstFunc: (...args: unknown[]) => void;
  if (typeof stackTrace === "string") {
    firstFunc = console.groupCollapsed;
    isClosingGroup = true;
  } else if (data.length <= 1) {
    firstFunc = console.log;
  } else {
    firstFunc = console.group;
    isClosingGroup = true;
  }

  const firstArgs: unknown[] = [];
  if (data.length === 0) {
    if (typeof message === "string") {
      firstArgs.push(`%c${message}`, styleLine);
    } else {
      firstArgs.push("%o", message);
    }
    consoleCalls.push([firstFunc, firstArgs]);
  } else {
    firstArgs.push(`%c${message}${typeof data[0] === "string" ? "" : " %o"}`, styleLine, data.shift());
    consoleCalls.push([firstFunc, firstArgs]);
    // logFunc(`%c${message}${typeof data[0] === "string" ? "" : " %o"}`, styleLine, data.shift());
    data.forEach((line) => {
      if (typeof line === "string") {
        consoleCalls.push([console.log, [line]]);
      } else {
        consoleCalls.push([console.log, ["%o", line]])
      }
    });
  }

  if (stackTrace) {
    consoleCalls.push(
      [console.group, ["%cSTACK TRACE", `color: ${C.Colors.GOLD8}; font-family: "Pragmata Pro"; font-size: 12px; background: ${C.Colors.GREY1}; font-weight: bold; padding: 0 10px;`]],
      [console.log, [`%c${stackTrace}`, Object.entries(STYLES.stack).map(([prop, val]) => `${prop}: ${val};`).join(" ")]],
      [console.groupEnd, []]
    )
  }
  if (isClosingGroup) {
    consoleCalls.push([console.groupEnd, []]);
  }
  return consoleCalls;
}
const k4Logger = (type: KeyOf<typeof STYLES> = "base", ...content: [string, ...unknown[]]) => {
  if (!checkDebugLevel(content)) { return; }
  getConsoleCalls(type, ...content)
    .forEach(([logFunc, logArgs]) => (logFunc as Func)(...logArgs));
};

const kLog = {
  display: (...content: [string, ...unknown[]]) => { k4Logger("display", ...content); },
  log: (...content: [string, ...unknown[]]) => { k4Logger("base", ...content); },
  error: (...content: [string, ...unknown[]]) => { k4Logger("error", ...content); },
  hbsLog: (...content: [string, ...unknown[]]) => { k4Logger("handlebars", ...content); }
};

export default kLog;
export type {DebugReport};
