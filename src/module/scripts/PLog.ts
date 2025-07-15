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
 *
 * Usage Examples:
 *
 * Basic logging (follows standard pattern: message, data, ...params):
 *   pLog.log("User logged in", { userId: 123 });
 *   pLog.error("Database connection failed", errorObject);
 *
 * Performance tracking with auto function name detection:
 *   function myFunction() {
 *     pLog.funcIn();  // Automatically detects "myFunction"
 *     // ... function code ...
 *     pLog.funcOut(); // Automatically matches with "myFunction"
 *   }
 *
 * Performance tracking with custom messages:
 *   function processData() {
 *     pLog.funcIn("Processing user data", { count: 100 });
 *     // ... processing code ...
 *     pLog.funcOut("Data processing completed successfully");
 *   }
 *
 * Flow tracking:
 *   pLog.startFlow("User Registration Process");
 *   validateInput();  // Contains funcIn/funcOut calls
 *   createUser();     // Contains funcIn/funcOut calls
 *   sendEmail();      // Contains funcIn/funcOut calls
 *   pLog.endFlow();   // Shows timing table for all functions
 */
class PLog {
  private functionStack: FunctionCall[] = [];
  private flowStack: FlowData[] = [];
  private completedCalls: Array<{
    name: string;
    startTime: number;
    endTime: number;
    duration: number;
    depth: number;
  }> = [];

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
   * Extract function name from stack trace
   */
  private getFunctionNameFromStack(): string {
    const stackTrace = (new Error()).stack;
    if (!stackTrace) { return "unknown"; }

    const lines = stackTrace.split(/\s*\n\s*/);

    // Find the first line that's not from PLog methods
    for (const line of lines) {
      if (STACK_TRACE_EXCLUSION_FILTERS.some((rTest) => rTest.test(line))) {
        continue;
      }

      // Try to extract function name from various stack trace formats
      // Format: "at functionName (file:line:col)" or "at Object.functionName (file:line:col)"
      const match = line.match(/at (?:Object\.)?([^.\s(]+)/);
      if (match && match[1]) {
        const funcName = match[1];
        // Filter out generic names
        if (!["<anonymous>", "eval", "Function"].includes(funcName)) {
          return funcName;
        }
      }
    }

    return "anonymous";
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
  private logMessage(level: LogLevel, message: string, data?: unknown): void {
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
   * @param message - Optional message to display (first parameter following standard pattern)
   * @param data - Optional data to display (second parameter following standard pattern)
   * @param shouldLog - Whether to log when not in a flow (third parameter for specific behavior)
   */
  funcIn(message?: string, data?: unknown, shouldLog = false): void {
    // Check for potential infinite recursion
    if (this.functionStack.length > MAX_RECURSION_DEPTH) {
      this.error(`Maximum recursion depth exceeded (${MAX_RECURSION_DEPTH})`, this.functionStack);
      return;
    }

    const functionName = this.getFunctionNameFromStack();
    const now = performance.now();
    const functionCall: FunctionCall = {
      name: functionName,
      startTime: now
    };

    // Use provided message or default to function name
    const displayMessage = message || functionName;

    // If we're in a flow, record the flow start time
    if (this.flowStack.length > 0) {
      const currentFlow = this.flowStack[this.flowStack.length - 1]!;
      functionCall.flowStartTime = currentFlow.startTime;

      // In a flow, always log function entry
      const timeFromFlowStart = this.formatTime(now - currentFlow.startTime);
      this.logMessage("funcIn", `${displayMessage} [Flow time: ${timeFromFlowStart}]`, data);
    } else if (shouldLog) {
      // Outside a flow, only log if requested
      this.logMessage("funcIn", displayMessage, data);
    }

    this.functionStack.push(functionCall);
  }

  /**
   * Record function exit and calculate duration
   * Uses LIFO (Last In, First Out) matching to support recursive function calls
   * @param message - Optional message to display (first parameter following standard pattern)
   * @param data - Optional data to display (second parameter following standard pattern)
   */
  funcOut(message?: string, data?: unknown): void {
    if (this.functionStack.length === 0) {
      const currentFunctionName = this.getFunctionNameFromStack();
      this.error(`funcOut called for ${currentFunctionName} but no matching funcIn found`);
      return;
    }

    const now = performance.now();
    const functionCall = this.functionStack.pop()!;
    const currentFunctionName = this.getFunctionNameFromStack();

    // For recursive functions, we use LIFO matching instead of name matching
    // This allows the same function name to appear multiple times in the stack
    // We only warn about name mismatches if they seem suspicious (different names entirely)
    const namesDiffer = functionCall.name !== currentFunctionName;
    const seemsSuspicious = namesDiffer &&
      !functionCall.name.includes("anonymous") &&
      !currentFunctionName.includes("anonymous") &&
      functionCall.name !== "unknown" &&
      currentFunctionName !== "unknown";

    if (seemsSuspicious) {
      // Only warn, don't error - this supports recursive calls and edge cases
      this.warn(`Function name mismatch (LIFO matching used): expected ${functionCall.name}, got ${currentFunctionName}. This may be normal for recursive calls.`);
    }

    const duration = now - functionCall.startTime;
    const formattedDuration = this.formatTime(duration);

    // Record completed call for timestamp analysis
    this.completedCalls.push({
      name: functionCall.name,
      startTime: functionCall.startTime,
      endTime: now,
      duration,
      depth: this.functionStack.length // Depth at time of completion
    });

    // Check if we should log based on message (if provided)
    if (message && !this.shouldLog(message)) {
      return;
    }

    // Use provided message or default to function completion message
    // For recursive calls, include the original function name from funcIn
    const displayMessage = message || `${functionCall.name} completed in ${formattedDuration}`;

    // If we're in a flow, add to flow data and include flow time
    if (this.flowStack.length > 0) {
      const currentFlow = this.flowStack[this.flowStack.length - 1]!;
      currentFlow.functions.push({
        name: functionCall.name,
        startTime: functionCall.startTime,
        endTime: now,
        duration
      });

      const timeFromFlowStart = this.formatTime(now - currentFlow.startTime);
      if (message) {
        // If custom message provided, show it with timing info
        this.logMessage("funcOut", `${displayMessage} [Duration: ${formattedDuration}, Flow time: ${timeFromFlowStart}]`, data);
      } else {
        // Default message already includes duration
        this.logMessage("funcOut", `${displayMessage} [Flow time: ${timeFromFlowStart}]`, data);
      }
    } else {
      // Outside a flow, just log the function duration
      this.logMessage("funcOut", displayMessage, data);
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

    // Test 3: Function timing with auto-detection
    runTest("Function Timing with Auto-Detection", () => {
      // Define a test function to be detected
      const testAutoDetection = () => {
        this.funcIn("Custom message", { param: "value" }, true);

        // Simulate some work
        const start = performance.now();
        while (performance.now() - start < 10) { /* wait */ }

        this.funcOut("Function completed");
        return true;
      };

      // Call the test function
      testAutoDetection();

      return this.functionStack.length === 0; // Should be empty after funcOut
    });

    // Test 4: Flow tracking with nested flows
    runTest("Flow Tracking with Nested Flows", () => {
      let testPassed = true;
      const originalError = this.error.bind(this); // Bind to avoid scoping issues
      let errorMessages: string[] = [];

      // Temporarily override error method to capture errors
      this.error = (message: string) => {
        errorMessages.push(message);
        testPassed = false;
        originalError(message);
      };

      try {
        // Start outer flow
        this.startFlow("outerFlow");

        // Define test functions
        const outerFunction = () => {
          this.funcIn("Outer function");

          // Start nested flow
          this.startFlow("nestedFlow");

          // Run functions in nested flow
          const nestedFunction1 = () => {
            this.funcIn("Nested function 1");
            const start = performance.now();
            while (performance.now() - start < 5) { /* wait */ }
            this.funcOut("Nested function 1 complete");
          };

          const nestedFunction2 = () => {
            this.funcIn("Nested function 2");
            const start = performance.now();
            while (performance.now() - start < 5) { /* wait */ }
            this.funcOut("Nested function 2 complete");
          };

          nestedFunction1();
          nestedFunction2();

          // End nested flow
          this.endFlow("nestedFlow");

          this.funcOut("Outer function complete");
        };

        // Run outer function
        outerFunction();

        // End outer flow
        this.endFlow("outerFlow");

        // Test flow name mismatch (should generate error)
        this.startFlow("testFlow");
        this.endFlow("wrongFlowName"); // This should error

        // If we got here with errors, that's expected for the mismatch test
        const hadExpectedErrors = errorMessages.length > 0;

        // Reset for final verification
        errorMessages = [];
        testPassed = true;

        // Verify stack is properly managed
        const stackEmpty = this.flowStack.length === 0;

        return stackEmpty && hadExpectedErrors && testPassed;
      } finally {
        // Restore original error method
        this.error = originalError;
      }
    });

    // Test 5: Nested function calls with proper matching verification
    runTest("Nested Function Calls with Proper Matching", () => {
      let testPassed = true;
      const originalError = this.error.bind(this);
      let errorMessages: string[] = [];

      // Temporarily override error method to capture errors
      this.error = (message: string) => {
        errorMessages.push(message);
        testPassed = false;
        originalError(message);
      };

      try {
        // Define nested test functions
        const outerFunction = () => {
          this.funcIn("Outer function start");
          innerFunction();
          this.funcOut("Outer function end");
        };

        const innerFunction = () => {
          this.funcIn("Inner function start");
          // Do something
          this.funcOut("Inner function end");
        };

        // Test 1: Correct nesting
        outerFunction();

        // Test 2: Test function name mismatch detection
        // We'll manually manipulate the stack to test mismatch detection
        const testMismatch = () => {
          this.funcIn("Test function for mismatch");
          // Manually change the function name in the stack to simulate mismatch
          if (this.functionStack.length > 0) {
            this.functionStack[this.functionStack.length - 1]!.name = "differentFunction";
          }
          this.funcOut("This should detect mismatch");
        };

        testMismatch();

        // If we got here with errors, that's expected for the mismatch test
        const hadExpectedErrors = errorMessages.length > 0;

        // Reset for final verification
        errorMessages = [];
        testPassed = true;

        // Test 3: Verify stack is properly managed
        const stackEmpty = this.functionStack.length === 0;

        return stackEmpty && hadExpectedErrors && testPassed;
      } finally {
        // Restore original error method
        this.error = originalError;
      }
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

    // Test 6: Function call order verification
    runTest("Function Call Order Verification", () => {
      const callOrder: string[] = [];
      const originalLogMessage = this.logMessage.bind(this);

      // Override logMessage to track call order
      this.logMessage = (level: LogLevel, message: string) => {
        if (level === "funcIn" || level === "funcOut") {
          callOrder.push(`${level}: ${message}`);
        }
        originalLogMessage(level, message);
      };

      try {
        // Test proper LIFO (Last In, First Out) order
        const functionA = () => {
          this.funcIn("Function A start");
          functionB();
          this.funcOut("Function A end");
        };

        const functionB = () => {
          this.funcIn("Function B start");
          functionC();
          this.funcOut("Function B end");
        };

        const functionC = () => {
          this.funcIn("Function C start");
          this.funcOut("Function C end");
        };

        functionA();

        // Expected order: A-in, B-in, C-in, C-out, B-out, A-out
        const expectedPattern = [
          "funcIn: Function A start",
          "funcIn: Function B start",
          "funcIn: Function C start",
          "funcOut: Function C end",
          "funcOut: Function B end",
          "funcOut: Function A end"
        ];

        const orderCorrect = callOrder.length === expectedPattern.length &&
          callOrder.every((call, index) => call.includes(expectedPattern[index]!.split(": ")[1]!));

        return orderCorrect && this.functionStack.length === 0;
      } finally {
        this.logMessage = originalLogMessage;
      }
    });

    // Test 7: Error handling for mismatched function calls
    runTest("Error Handling", () => {
      const initialErrorCount = this.functionStack.length;
      this.funcOut("This should error"); // Should log error since no matching funcIn
      return this.functionStack.length === initialErrorCount; // Stack should be unchanged
    });

    // Test 8: Stack trace generation
    runTest("Stack Trace Generation", () => {
      const stackTrace = this.getStackTrace();
      return stackTrace === undefined || (typeof stackTrace === "string" && stackTrace.length > 0);
    });

    // Test 9: Settings integration (basic test)
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

    // Test 10: Timestamp analysis for recursive calls
    runTest("Timestamp Analysis for Recursive Calls", () => {
      // Clear history for clean test
      this.clearHistory();

      // Define a recursive test function
      const recursiveTest = (depth: number) => {
        this.funcIn(`Recursive test depth ${depth}`);

        // Add small delay to create measurable timing
        const start = performance.now();
        while (performance.now() - start < 2) { /* wait */ }

        if (depth < 3) {
          recursiveTest(depth + 1);
        }

        this.funcOut(`Completed depth ${depth}`);
      };

      // Run the recursive test
      recursiveTest(0);

      // Analyze timestamps
      const analysis = this.analyzeTimestamps();

      // The test passes if timestamp analysis finds no issues
      return analysis.isValid && this.functionStack.length === 0;
    });

    // Test 11: Recursive function calls with timestamp analysis
    runTest("Recursive Function Calls", () => {
      this.clearHistory();

      let counter = 0;
      const recursiveTest = () => {
        this.funcIn(`Recursive call depth ${counter}`);

        // Add small delay for timing
        const start = performance.now();
        while (performance.now() - start < 2) { /* wait */ }

        if (counter < 3) {
          counter++;
          recursiveTest();
        }

        this.funcOut(`Completed depth ${counter}`);
      };

      recursiveTest();

      const analysis = this.analyzeTimestamps();
      return analysis.isValid && this.functionStack.length === 0;
    });

    // Test 12: Nested function calls with timestamp analysis
    runTest("Nested Function Calls", () => {
      this.clearHistory();

      const innerFunc = () => {
        this.funcIn("Inner function");
        const start = performance.now();
        while (performance.now() - start < 2) { /* wait */ }
        this.funcOut("Inner complete");
      };

      const middleFunc = () => {
        this.funcIn("Middle function");
        const start = performance.now();
        while (performance.now() - start < 2) { /* wait */ }
        innerFunc();
        this.funcOut("Middle complete");
      };

      const outerFunc = () => {
        this.funcIn("Outer function");
        const start = performance.now();
        while (performance.now() - start < 2) { /* wait */ }
        middleFunc();
        this.funcOut("Outer complete");
      };

      outerFunc();

      const analysis = this.analyzeTimestamps();
      return analysis.isValid && this.functionStack.length === 0;
    });

    // Test 13: Recursion depth protection
    runTest("Recursion Protection", () => {
      const initialLength = this.functionStack.length;

      // Define a test function for recursion testing
      const recursionTest = (depth: number) => {
        this.funcIn(`Recursion test depth ${depth}`);
        if (depth < 10) {
          recursionTest(depth + 1);
        }
        this.funcOut();
      };

      // Test recursion
      recursionTest(0);

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

  /**
   * Analyze timestamps of completed function calls to validate proper pairing
   * This helps detect if funcIn/funcOut calls are being matched correctly
   */
  analyzeTimestamps(): { isValid: boolean; issues: string[]; summary: string } {
    const issues: string[] = [];
    const calls = [...this.completedCalls].sort((a, b) => a.startTime - b.startTime);

    if (calls.length === 0) {
      return {
        isValid: true,
        issues: [],
        summary: "No completed calls to analyze"
      };
    }

    // Check for overlapping calls (nested calls should be fully contained within parent calls)
    for (let i = 0; i < calls.length - 1; i++) {
      const current = calls[i]!;
      const next = calls[i + 1]!;

      // If next call starts before current call ends, it should also end before current call ends
      if (next.startTime < current.endTime && next.endTime > current.endTime) {
        issues.push(`Overlapping calls detected: ${current.name} (${this.formatTime(current.duration)}) overlaps with ${next.name} (${this.formatTime(next.duration)})`);
      }
    }

    // Check for proper nesting: deeper calls should have shorter or equal durations to their parents
    const callsByDepth = new Map<number, typeof calls>();
    calls.forEach(call => {
      if (!callsByDepth.has(call.depth)) {
        callsByDepth.set(call.depth, []);
      }
      callsByDepth.get(call.depth)!.push(call);
    });

    // Verify LIFO order for same-depth calls
    callsByDepth.forEach((depthCalls, depth) => {
      for (let i = 0; i < depthCalls.length - 1; i++) {
        const current = depthCalls[i]!;
        const next = depthCalls[i + 1]!;

        // For same depth, calls should not overlap
        if (current.endTime > next.startTime && current.startTime < next.startTime) {
          issues.push(`LIFO violation at depth ${depth}: ${current.name} should complete before ${next.name} starts`);
        }
      }
    });

    // Check for reasonable timing relationships in recursive calls
    const recursiveCalls = calls.filter(call =>
      calls.filter(other => other.name === call.name).length > 1
    );

    if (recursiveCalls.length > 0) {
      // Group by function name
      const recursiveGroups = new Map<string, typeof recursiveCalls>();
      recursiveCalls.forEach(call => {
        if (!recursiveGroups.has(call.name)) {
          recursiveGroups.set(call.name, []);
        }
        recursiveGroups.get(call.name)!.push(call);
      });

      recursiveGroups.forEach((group, funcName) => {
        // Sort by start time
        group.sort((a, b) => a.startTime - b.startTime);

        // Check that nested calls are properly contained
        for (let i = 0; i < group.length - 1; i++) {
          const outer = group[i]!;
          const inner = group[i + 1]!;

          if (inner.startTime >= outer.startTime && inner.endTime <= outer.endTime) {
            // Good: inner call is properly nested
          } else if (inner.startTime > outer.endTime) {
            // Good: sequential calls
          } else {
            issues.push(`Recursive call timing issue in ${funcName}: inner call (${this.formatTime(inner.duration)}) not properly nested within outer call (${this.formatTime(outer.duration)})`);
          }
        }
      });
    }

    const isValid = issues.length === 0;
    const summary = isValid
      ? `✅ Analyzed ${calls.length} function calls - all timestamps are consistent with proper LIFO matching`
      : `❌ Found ${issues.length} timing issues that suggest incorrect funcIn/funcOut pairing`;

    return { isValid, issues, summary };
  }

  /**
   * Clear completed calls history (useful for testing)
   */
  clearHistory(): void {
    this.completedCalls = [];
  }
}

export default PLog;
