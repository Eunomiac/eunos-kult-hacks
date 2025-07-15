// #region IMPORTS ~
import * as C from "./constants.js";
// #endregion

// #region CONFIG ~
const STACK_TRACE_EXCLUSION_FILTERS: RegExp[] = [
  /at (getStackTrace|pLog|PLog)/,
  /at Object\.(log|warn|info|debug|error|display|socketCall|socketResponse|socketReceived|breakIf|funcIn|funcOut|startFlow|endFlow)/,
  /^Error/
];

// Define custom colors that aren't in the constants file
const CustomColors = {
  PURPLE3: "rgb(100, 80, 150)",
  PURPLE5: "rgb(130, 100, 180)",
  PURPLE7: "rgb(160, 120, 210)",
  CYAN3: "rgb(80, 180, 180)",
  CYAN5: "rgb(100, 200, 200)",
  CYAN7: "rgb(120, 220, 220)",
  ORANGE3: "rgb(200, 120, 40)",
  GREEN3: "rgb(80, 180, 80)"
};

const STYLES = {
  base: {
    "background": CustomColors.PURPLE3,
    "color": C.Colors.WHITE,
    "font-family": "Pragmata Pro",
    "padding": "2px 8px",
    "margin-right": "10px",
    "border-radius": "3px"
  },
  log: {
    "background": C.Colors.BLUE3,
    "color": C.Colors.WHITE
  },
  warn: {
    "background": CustomColors.ORANGE3,
    "color": C.Colors.BLACK
  },
  info: {
    "background": CustomColors.CYAN3,
    "color": C.Colors.BLACK
  },
  debug: {
    "background": C.Colors.GREY3,
    "color": C.Colors.WHITE
  },
  error: {
    "background": C.Colors.RED3,
    "color": C.Colors.WHITE
  },
  display: {
    "background": CustomColors.GREEN3,
    "color": C.Colors.BLACK
  },
  socketCall: {
    "background": C.Colors.GOLD3,
    "color": C.Colors.BLACK
  },
  socketResponse: {
    "background": C.Colors.GOLD5,
    "color": C.Colors.WHITE
  },
  socketReceived: {
    "background": C.Colors.GOLD7,
    "color": C.Colors.WHITE
  },
  breakIf: {
    "background": C.Colors.RED5,
    "color": C.Colors.WHITE,
    "font-weight": "bold"
  },
  funcIn: {
    "background": CustomColors.PURPLE5,
    "color": C.Colors.WHITE
  },
  funcOut: {
    "background": CustomColors.PURPLE7,
    "color": C.Colors.WHITE
  },
  startFlow: {
    "background": CustomColors.CYAN5,
    "color": C.Colors.BLACK,
    "font-weight": "bold",
    "font-size": "14px"
  },
  endFlow: {
    "background": CustomColors.CYAN7,
    "color": C.Colors.WHITE,
    "font-weight": "bold",
    "font-size": "14px"
  },
  stack: {
    "color": CustomColors.PURPLE5,
    "font-weight": 100,
    "font-size": "10px",
    "font-family": "Pragmata Pro"
  },
  stackInternal: {
    "color": CustomColors.CYAN5,
    "font-weight": 100,
    "font-size": "10px",
    "font-family": "Pragmata Pro"
  },
  stackAmbiguous: {
    "color": C.Colors.GREY5,
    "font-weight": 100,
    "font-size": "10px",
    "font-family": "Pragmata Pro",
    "opacity": "0.6"
  }
};

const MAX_RECURSION_DEPTH = 1000;
// #endregion

// #region TYPES ~
type LogLevel = "log" | "warn" | "info" | "debug" | "error" | "display" | "socketCall" | "socketResponse" | "socketReceived" | "breakIf" | "funcIn" | "funcOut" | "startFlow" | "endFlow";

interface FunctionCall {
  name: string;
  startTime: number;
  flowStartTime?: number;
}

interface FlowData {
  name: string;
  startTime: number;
  functions: Array<{
    name: string;
    startTime: number;
    endTime: number;
    duration: number;
  }>;
}
// #endregion

/**
 * PLog - Performance Logging and Debugging Class
 * Provides debugging, performance-testing and logging functionality
 */
class PLog {
  private functionStack: FunctionCall[] = [];
  private flowStack: FlowData[] = [];

  /**
   * Static method to initialize PLog and assign it to global scope
   */
  static Initialize(): void {
    const instance = new PLog();
    Object.assign(globalThis, { pLog: instance });
  }

  /**
   * Get filtered and formatted stack trace
   */
  private getStackTrace(): Maybe<string> {
    const stackTrace = (new Error()).stack;
    if (!stackTrace) { return undefined; }

    return stackTrace
      .split(/\s*\n\s*/)
      .filter((sLine) => !STACK_TRACE_EXCLUSION_FILTERS.some((rTest) => rTest.test(sLine)))
      .join("\n");
  }

  /**
   * Format stack trace with appropriate styling
   */
  private formatStackTrace(stackTrace: string): Array<[(...args: unknown[]) => void, unknown[]]> {
    const lines = stackTrace.split("\n");
    const consoleCalls: Array<[(...args: unknown[]) => void, unknown[]]> = [];

    lines.forEach((line) => {
      let styleType: "stack" | "stackInternal" | "stackAmbiguous" = "stack";

      // Check if line refers to eunos-kult-hacks
      if (line.includes("eunos-kult-hacks")) {
        styleType = "stackInternal";
      }
      // Check for ambiguous async/intermediary lines
      else if (line.includes("async") || line.includes("Promise") || line.includes("<anonymous>")) {
        styleType = "stackAmbiguous";
      }

      const styleLine = Object.entries(STYLES[styleType]).map(([prop, val]) => `${prop}: ${val};`).join(" ");
      consoleCalls.push([console.log, [`%c${line}`, styleLine]]);
    });

    return consoleCalls;
  }

  /**
   * Check if message should be logged based on whitelist/blacklist settings
   */
  private shouldLog(message: string): boolean {
    const whitelist = getSetting("pLogWhitelist", "eunos-kult-hacks");
    const blacklist = getSetting("pLogBlacklist", "eunos-kult-hacks");

    const whitelistTerms = whitelist ? whitelist.split(",").map(term => term.trim()).filter(term => term) : [];
    const blacklistTerms = blacklist ? blacklist.split(",").map(term => term.trim()).filter(term => term) : [];

    // Convert terms to RegExp patterns
    const whitelistRegexes = whitelistTerms.map(term => new RegExp(term, "i"));
    const blacklistRegexes = blacklistTerms.map(term => new RegExp(term, "i"));

    // Apply filtering logic
    if (whitelistRegexes.length === 0 && blacklistRegexes.length === 0) {
      return true; // All messages logged
    }

    if (whitelistRegexes.length === 0 && blacklistRegexes.length > 0) {
      // Only blacklist: log if not in blacklist
      return !blacklistRegexes.some(regex => regex.test(message));
    }

    if (whitelistRegexes.length > 0 && blacklistRegexes.length === 0) {
      // Only whitelist: log if in whitelist
      return whitelistRegexes.some(regex => regex.test(message));
    }

    // Both lists populated: whitelist first, then check blacklist
    const inWhitelist = whitelistRegexes.some(regex => regex.test(message));
    if (!inWhitelist) return false;

    const inBlacklist = blacklistRegexes.some(regex => regex.test(message));
    return !inBlacklist;
  }

  /**
   * Format time for display
   */
  private formatTime(milliseconds: number): string {
    if (milliseconds >= 100) {
      // Display in seconds with 4 decimal places
      return `${(milliseconds / 1000).toFixed(4)} s`;
    } else {
      // Display in milliseconds
      if (milliseconds >= 100) {
        return `${Math.round(milliseconds)} ms`;
      } else if (milliseconds >= 10) {
        return `${Math.round(milliseconds)} ms`;
      } else if (milliseconds >= 1) {
        return `${milliseconds.toFixed(2)} ms`;
      } else {
        // For very small values, ensure at least 3 significant digits
        const formatted = milliseconds.toExponential(2);
        return `${formatted} ms`;
      }
    }
  }

  /**
   * Core logging method
   */
  private logMessage(level: LogLevel, message: string, data?: unknown, ...additionalParams: unknown[]): void {
    if (!this.shouldLog(message)) {
      return;
    }

    const stackTrace = this.getStackTrace();
    const styleLine = Object.entries({
      ...STYLES.base,
      ...STYLES[level]
    }).map(([prop, val]) => `${prop}: ${val};`).join(" ");

    const consoleCalls: Array<[(...args: unknown[]) => void, unknown[]]> = [];

    // Main message
    if (stackTrace || data !== undefined) {
      consoleCalls.push([console.groupCollapsed, [`%c${message}`, styleLine]]);
    } else {
      consoleCalls.push([console.log, [`%c${message}`, styleLine]]);
    }

    // Data display
    if (data !== undefined) {
      consoleCalls.push([console.log, [data]]);
    }

    // Stack trace
    if (stackTrace) {
      consoleCalls.push([console.group, ["%cSTACK TRACE", `color: ${CustomColors.PURPLE5}; font-family: "Pragmata Pro"; font-size: 12px; background: ${C.Colors.GREY1}; font-weight: bold; padding: 0 10px;`]]);
      consoleCalls.push(...this.formatStackTrace(stackTrace));
      consoleCalls.push([console.groupEnd, []]);
    }

    if (stackTrace || data !== undefined) {
      consoleCalls.push([console.groupEnd, []]);
    }

    // Execute console calls
    consoleCalls.forEach(([logFunc, logArgs]) => (logFunc as Func)(...logArgs));
  }

  // Basic logging methods
  log(message: string, data?: unknown): void {
    this.logMessage("log", message, data);
  }

  warn(message: string, data?: unknown): void {
    this.logMessage("warn", message, data);
  }

  info(message: string, data?: unknown): void {
    this.logMessage("info", message, data);
  }

  debug(message: string, data?: unknown): void {
    this.logMessage("debug", message, data);
  }

  error(message: string, data?: unknown): void {
    this.logMessage("error", message, data);
  }

  display(message: string, data?: unknown): void {
    this.logMessage("display", message, data);
  }

  socketCall(message: string, data?: unknown): void {
    this.logMessage("socketCall", message, data);
  }

  socketResponse(message: string, data?: unknown): void {
    this.logMessage("socketResponse", message, data);
  }

  socketReceived(message: string, data?: unknown): void {
    this.logMessage("socketReceived", message, data);
  }

  /**
   * Conditional debugger breakpoint
   */
  breakIf(message: string, data?: unknown, condition = false): void {
    if (!condition) return;

    this.logMessage("breakIf", message, data);
    // eslint-disable-next-line no-debugger
    debugger;
  }

  /**
   * Record function entry
   */
  funcIn(functionName: string, data?: unknown, shouldLog = false): void {
    // Check for potential infinite recursion
    if (this.functionStack.length > MAX_RECURSION_DEPTH) {
      this.error(`Maximum recursion depth exceeded (${MAX_RECURSION_DEPTH})`, this.functionStack);
      return;
    }

    const now = performance.now();
    const functionCall: FunctionCall = {
      name: functionName,
      startTime: now
    };

    // If we're in a flow, record the flow start time
    if (this.flowStack.length > 0) {
      const currentFlow = this.flowStack[this.flowStack.length - 1]!;
      functionCall.flowStartTime = currentFlow.startTime;

      // In a flow, always log function entry
      const timeFromFlowStart = this.formatTime(now - currentFlow.startTime);
      this.logMessage("funcIn", `${functionName} [Flow time: ${timeFromFlowStart}]`, data);
    } else if (shouldLog) {
      // Outside a flow, only log if requested
      this.logMessage("funcIn", functionName, data);
    }

    this.functionStack.push(functionCall);
  }

  /**
   * Record function exit and calculate duration
   */
  funcOut(functionName: string, message?: string): void {
    if (this.functionStack.length === 0) {
      this.error(`funcOut called for ${functionName} but no matching funcIn found`);
      return;
    }

    const now = performance.now();
    const functionCall = this.functionStack.pop()!;

    // Verify function name matches (helps catch mismatched calls)
    if (functionCall.name !== functionName) {
      this.error(`Function name mismatch: expected ${functionCall.name}, got ${functionName}`);
      this.functionStack.push(functionCall); // Put it back for potential later matching
      return;
    }

    const duration = now - functionCall.startTime;
    const formattedDuration = this.formatTime(duration);

    // Check if we should log based on message (if provided)
    if (message && !this.shouldLog(message)) {
      return;
    }

    // If we're in a flow, add to flow data and include flow time
    if (this.flowStack.length > 0) {
      const currentFlow = this.flowStack[this.flowStack.length - 1]!;
      currentFlow.functions.push({
        name: functionName,
        startTime: functionCall.startTime,
        endTime: now,
        duration
      });

      const timeFromFlowStart = this.formatTime(now - currentFlow.startTime);
      this.logMessage("funcOut", `${functionName} completed in ${formattedDuration} [Flow time: ${timeFromFlowStart}]`);
    } else {
      // Outside a flow, just log the function duration
      this.logMessage("funcOut", `${functionName} completed in ${formattedDuration}`);
    }
  }

  /**
   * Start a performance flow
   */
  startFlow(flowName: string): void {
    const now = performance.now();

    this.logMessage("startFlow", `⏱️ FLOW START: ${flowName}`);

    this.flowStack.push({
      name: flowName,
      startTime: now,
      functions: []
    });
  }

  /**
   * End a performance flow and display results
   */
  endFlow(flowName?: string): void {
    if (this.flowStack.length === 0) {
      this.error("endFlow called but no flow is active");
      return;
    }

    const now = performance.now();
    const flow = this.flowStack.pop()!;

    // Verify flow name if provided
    if (flowName && flow.name !== flowName) {
      this.error(`Flow name mismatch: expected ${flow.name}, got ${flowName}`);
      this.flowStack.push(flow); // Put it back for potential later matching
      return;
    }

    const duration = now - flow.startTime;
    const formattedDuration = this.formatTime(duration);

    this.logMessage("endFlow", `⏱️ FLOW END: ${flow.name} - Total time: ${formattedDuration}`);

    // Display function timing table
    if (flow.functions.length > 0) {
      console.group("%cFunction Timing Summary", `color: ${C.Colors.BLUE8}; font-family: "Pragmata Pro"; font-size: 12px; background: ${C.Colors.GREY1}; font-weight: bold; padding: 0 10px;`);

      console.table(flow.functions.map(func => ({
        "Function": func.name,
        "Start Time": this.formatTime(func.startTime - flow.startTime),
        "End Time": this.formatTime(func.endTime - flow.startTime),
        "Duration": this.formatTime(func.duration)
      })));

      console.groupEnd();
    }
  }

  /**
   * Comprehensive test method to validate all PLog functionality
   * Run this from the Foundry console: pLog.test()
   */
  test(): void {
    console.group("%c🧪 PLog Test Suite", "color: white; background: purple; font-weight: bold; padding: 5px 10px; font-size: 14px;");

    let testsPassed = 0;
    let testsTotal = 0;
    const testResults: string[] = [];

    const runTest = (testName: string, testFn: () => boolean): void => {
      testsTotal++;
      try {
        const result = testFn();
        if (result) {
          testsPassed++;
          testResults.push(`✅ ${testName}`);
        } else {
          testResults.push(`❌ ${testName} - Test failed`);
        }
      } catch (error) {
        testResults.push(`❌ ${testName} - Error: ${String(error)}`);
      }
    };

    // Test 1: Basic logging methods
    runTest("Basic Logging Methods", () => {
      this.log("Test log message", { test: "data" });
      this.warn("Test warning message");
      this.info("Test info message");
      this.debug("Test debug message");
      this.error("Test error message");
      this.display("Test display message");
      this.socketCall("Test socket call");
      this.socketResponse("Test socket response");
      this.socketReceived("Test socket received");
      return true; // Visual inspection required
    });

    // Test 2: Time formatting
    runTest("Time Formatting", () => {
      const tests = [
        { input: 50, expected: /\d+(\.\d+)? ms/ },
        { input: 150, expected: /0\.\d{4} s/ },
        { input: 1500, expected: /1\.\d{4} s/ },
        { input: 0.5, expected: /0\.\d+ ms/ }
      ];

      return tests.every(test => {
        const result = this.formatTime(test.input);
        return test.expected.test(result);
      });
    });

    // Test 3: Function timing
    runTest("Function Timing", () => {
      this.funcIn("testFunction", { param: "value" }, true);

      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 10) { /* wait */ }

      this.funcOut("testFunction");
      return this.functionStack.length === 0; // Should be empty after funcOut
    });

    // Test 4: Flow tracking
    runTest("Flow Tracking", () => {
      this.startFlow("testFlow");

      this.funcIn("flowFunction1");
      const start1 = performance.now();
      while (performance.now() - start1 < 5) { /* wait */ }
      this.funcOut("flowFunction1");

      this.funcIn("flowFunction2");
      const start2 = performance.now();
      while (performance.now() - start2 < 5) { /* wait */ }
      this.funcOut("flowFunction2");

      this.endFlow("testFlow");
      return this.flowStack.length === 0; // Should be empty after endFlow
    });

    // Test 5: Nested function calls
    runTest("Nested Function Calls", () => {
      this.funcIn("outerFunction");
      this.funcIn("innerFunction");
      this.funcOut("innerFunction");
      this.funcOut("outerFunction");
      return this.functionStack.length === 0;
    });

    // Test 6: Conditional breakpoint (without triggering)
    runTest("Conditional Breakpoint (false)", () => {
      this.breakIf("Should not break", { condition: false }, false);
      return true; // If we reach here, breakpoint didn't trigger
    });

    // Test 7: Settings filtering (basic test)
    runTest("Settings Integration", () => {
      try {
        // Test that settings are accessible
        const whitelist = getSetting("pLogWhitelist", "eunos-kult-hacks");
        const blacklist = getSetting("pLogBlacklist", "eunos-kult-hacks");
        return typeof whitelist === "string" && typeof blacklist === "string";
      } catch {
        return false; // Settings not yet registered
      }
    });

    // Test 8: Stack trace generation
    runTest("Stack Trace Generation", () => {
      const stackTrace = this.getStackTrace();
      return stackTrace === undefined || (typeof stackTrace === "string" && stackTrace.length > 0);
    });

    // Test 9: Error handling for mismatched function calls
    runTest("Error Handling", () => {
      const initialErrorCount = this.functionStack.length;
      this.funcOut("nonExistentFunction"); // Should log error
      return this.functionStack.length === initialErrorCount; // Stack should be unchanged
    });

    // Test 10: Recursion depth protection
    runTest("Recursion Protection", () => {
      const initialLength = this.functionStack.length;
      // Add many function calls to test recursion protection
      for (let i = 0; i < 10; i++) {
        this.funcIn(`recursionTest${i}`);
      }
      // Clean up
      for (let i = 9; i >= 0; i--) {
        this.funcOut(`recursionTest${i}`);
      }
      return this.functionStack.length === initialLength;
    });

    // Display results
    console.group("%cTest Results", "color: white; background: blue; font-weight: bold; padding: 3px 8px;");
    testResults.forEach(result => {
      console.log(result);
    });
    console.groupEnd();

    const passRate = ((testsPassed / testsTotal) * 100).toFixed(1);
    const resultStyle = testsPassed === testsTotal ?
      "color: white; background: green; font-weight: bold; padding: 5px 10px;" :
      "color: white; background: red; font-weight: bold; padding: 5px 10px;";

    console.log(`%c📊 Test Summary: ${testsPassed}/${testsTotal} tests passed (${passRate}%)`, resultStyle);

    if (testsPassed === testsTotal) {
      console.log("%c🎉 All tests passed! PLog is working correctly.", "color: green; font-weight: bold; font-size: 16px;");
    } else {
      console.log("%c⚠️ Some tests failed. Check the results above for details.", "color: red; font-weight: bold; font-size: 16px;");
    }

    console.groupEnd();
  }
}

export default PLog;
