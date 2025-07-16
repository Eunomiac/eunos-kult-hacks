// #region IMPORTS ~
import * as C from "./constants.js";
// #endregion

// #region CONFIG ~
/**
 * Simple path joining function for browser environment
 */
function joinPath(...parts: string[]): string {
  return parts
    .map(part => part.replace(/[/\\]+$/, "")) // Remove trailing slashes
    .join("/")
    .replace(/\\/g, "/"); // Normalize to forward slashes
}

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
    "color": "rgb(0, 255, 0)",
    "background": "rgb(0, 70, 0)"
  },
  socketResponse: {
    "color": "rgb(0, 255, 255)",
    "background": "rgb(0, 70, 70)"
  },
  socketReceived: {
    "color": "rgb(255, 255, 0)",
    "background": "rgb(70, 70, 0)"
  },
  breakIf: {
    "background": C.Colors.RED5,
    "color": C.Colors.WHITE,
    "font-weight": "bold"
  },
  funcIn: {
    "background": CustomColors.PURPLE7,
    "color": C.Colors.BLACK
  },
  funcOut: {
    "background": CustomColors.PURPLE3,
    "color": C.Colors.BLACK
  },
  startTimestamp: {
    "background": CustomColors.CYAN7,
    "color": C.Colors.BLACK
  },
  endTimestamp: {
    "background": CustomColors.CYAN3,
    "color": C.Colors.BLACK
  },
  startFlow: {
    "background": "rgb(255, 140, 0)",
    "color": C.Colors.BLACK,
    "font-weight": "bold",
    "font-size": "14px",
    "text-transform": "uppercase",
    "letter-spacing": "1px",
    "border": "2px solid rgb(255, 200, 0)",
    "box-shadow": "0 0 8px rgba(255, 140, 0, 0.6)"
  },
  endFlow: {
    "background": "rgb(255, 69, 0)",
    "color": C.Colors.WHITE,
    "font-weight": "bold",
    "font-size": "14px",
    "text-transform": "uppercase",
    "letter-spacing": "1px",
    "border": "2px solid rgb(255, 100, 0)",
    "box-shadow": "0 0 8px rgba(255, 69, 0, 0.6)"
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

// Nesting visual markers - rotated through to make pairing easier to see
const NESTING_MARKERS = ["🟢", "🔵", "🟣", "🟡", "🟠", "🔴"];
// #endregion

// #region TYPES ~
type LogLevel = "log" | "warn" | "info" | "debug" | "error" | "display" | "socketCall" | "socketResponse" | "socketReceived" | "breakIf" | "funcIn" | "funcOut" | "startTimestamp" | "endTimestamp" | "startFlow" | "endFlow";

interface FunctionCall {
  name: string;
  startTime: number;
  flowStartTime?: number;
  nestingMarker?: string; // Emoji marker claimed for this function/timestamp pair
}

interface TimestampCall extends FunctionCall {
  label?: string; // Optional label for explicit matching
}

interface FlowData {
  name: string;
  startTime: number;
  silenceKLog: boolean;
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
  private static _instance: Maybe<PLog> = undefined;

  // Queue-based file writing to prevent race conditions
  private static writeQueue: Array<{
    filename: string;
    data: unknown;
    timestamp: number;
  }> = [];
  private static isProcessingQueue = false;

  /**
   * Get the singleton instance of PLog, creating it if necessary
   */
  static get instance(): PLog {
    if (!PLog._instance) {
      PLog._instance = new PLog();
    }
    return PLog._instance;
  }

  /**
   * Process the file write queue sequentially to prevent race conditions
   */
  private static async processQueue(): Promise<void> {
    if (PLog.isProcessingQueue || PLog.writeQueue.length === 0) {
      return; // Already processing or nothing to process
    }

    PLog.isProcessingQueue = true;

    try {
      const task = PLog.writeQueue.shift()!; // Get oldest task
      await PLog.writeToFile(task.filename, task.data);

      // Recursively process next task if queue has more items
      if (PLog.writeQueue.length > 0) {
        void PLog.processQueue(); // Don't await - let it run async
      }
    } catch (error) {
      console.error("PLog: Error processing write queue:", error);
    } finally {
      PLog.isProcessingQueue = false;
    }
  }

  /**
   * Write data to file using Foundry's FilePicker API
   */
  private static async writeToFile(filename: string, data: unknown): Promise<void> {
    try {
      const logDir = joinPath("logs", C.SYSTEM_ID, "plog-analysis");

      // Create file object
      const file = new File([JSON.stringify(data, null, 2)], filename, {
        type: "application/json"
      });

      // Upload using Foundry's FilePicker API
      await FilePicker.upload("data", logDir, file, {});


    } catch (error) {
      console.error(`PLog: Failed to write file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Queue a file write operation
   */
  private queueFileWrite(filename: string, data: unknown): void {
    PLog.writeQueue.push({
      filename,
      data,
      timestamp: performance.now()
    });
    void PLog.processQueue(); // Trigger processing
  }

  private functionStack: FunctionCall[] = [];
  private flowStack: FlowData[] = [];
  private labeledTimestamps: Map<string, TimestampCall> = new Map();
  private completedCalls: Array<{
    name: string;
    startTime: number;
    endTime: number;
    duration: number;
    depth: number;
  }> = [];
  private kLogSilencingFlowCount: number = 0;

  // Temporary storage for the marker of the call currently being ended
  private currentEndingCallMarker?: string;

  // Rotating deck of nesting markers for visual pairing
  private static nestingDeck = [...NESTING_MARKERS];

  /**
   * Claim the next nesting marker from the deck and rotate it to the bottom
   * @returns The claimed marker emoji
   */
  private static claimNestingMarker(): string {
    const marker = PLog.nestingDeck.shift()!;
    PLog.nestingDeck.push(marker);
    console.log(`🔧 DEBUG: Claimed marker ${marker}, deck now: [${PLog.nestingDeck.join(", ")}]`);
    return marker;
  }

  /**
   * Static method to initialize PLog and assign it to global scope
   */
  static Initialize(): void {
    Object.defineProperty(globalThis, "pLog", {
      get: () => PLog.instance,
      configurable: false,
      enumerable: true
    });
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
      // Format: "at functionName (file:line:col)" or "at Object.functionName (file:line:col)" or "at ClassName.methodName (file:line:col)"
      // Improved regex to only capture valid JavaScript identifier patterns
      const match = line.match(/at (?:Object\.)?([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/);
      if (match && match[1]) {
        const funcName = match[1];
        // Filter out generic names and overly long names (likely URLs)
        if (!["<anonymous>", "eval", "Function"].includes(funcName) && funcName.length < 100) {
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
   * Safely get a PLog setting with fallback if settings aren't registered yet
   * @param key - The setting key to retrieve
   * @returns The setting value, or empty string if settings aren't registered yet
   *
   * Fallback behavior: Returns empty string, which means:
   * - Empty whitelist = no whitelist filtering (all messages pass)
   * - Empty blacklist = no blacklist filtering (no messages blocked)
   * This ensures PLog works before settings are initialized
   */
  private getSafePLogSetting(key: "pLogWhitelist" | "pLogBlacklist"): string {
    try {
      const value = getSetting(key, "eunos-kult-hacks");
      return typeof value === "string" ? value : "";
    } catch {
      // Settings not yet registered, return empty string (no filtering)
      return "";
    }
  }

  /**
   * Check if message should be logged based on whitelist/blacklist settings
   */
  private shouldLog(message: string): boolean {
    const whitelist = this.getSafePLogSetting("pLogWhitelist");
    const blacklist = this.getSafePLogSetting("pLogBlacklist");

    const whitelistTerms = whitelist ? whitelist.split(",").map((term: string) => term.trim()).filter((term: string) => term) : [];
    const blacklistTerms = blacklist ? blacklist.split(",").map((term: string) => term.trim()).filter((term: string) => term) : [];

    // Convert terms to RegExp patterns
    const whitelistRegexes = whitelistTerms.map((term: string) => new RegExp(term, "i"));
    const blacklistRegexes = blacklistTerms.map((term: string) => new RegExp(term, "i"));

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
   * Format time for display - always in seconds for easy comparison
   */
  private formatTime(milliseconds: number): string {
    const seconds = milliseconds / 1000;

    if (seconds >= 1) {
      // For durations >= 1 second, show with 4 decimal places
      return `${seconds.toFixed(4)} s`;
    } else if (seconds >= 0.001) {
      // For durations >= 1ms (0.001s), show with 4 decimal places
      return `${seconds.toFixed(4)} s`;
    } else {
      // For very small values (< 1ms), use more decimal places to maintain precision
      return `${seconds.toFixed(6)} s`;
    }
  }

  /**
   * Core logging method
   */
  private logMessage(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(message)) {
      return;
    }

    // Add visual nesting indicators and flow time for non-flow messages when in a flow
    let displayMessage = message;
    if (level !== "startFlow" && level !== "endFlow" && this.flowStack.length > 0) {
      const currentFlow = this.flowStack[this.flowStack.length - 1]!;
      const flowTime = this.formatTime(performance.now() - currentFlow.startTime);
      const paddedFlowTime = `[${flowTime.padStart(10, " ")}] `;

      const isStartMethod = level === "funcIn" || level === "startTimestamp";
      const isEndMethod = level === "funcOut" || level === "endTimestamp";

      if (isStartMethod || isEndMethod) {
        // For start/end methods, build nesting prefix with emoji markers
        let nestingPrefix = "";

        if (isStartMethod) {
          // Start methods: use the marker from the most recent call (just added to stack)
          const recentCall = this.functionStack[this.functionStack.length - 1];
          if (recentCall?.nestingMarker) {
            // Repeat the marker for the current nesting depth
            nestingPrefix = "🔆" + recentCall.nestingMarker.repeat(this.functionStack.length);
          }

        } else {
          // End methods: use the marker from the specific call being ended
          // Both funcOut and endTimestamp store their marker in currentEndingCallMarker
          if (this.currentEndingCallMarker) {
            // For end methods, use current stack length (matches how funcOut works)
            // Since both funcOut and endTimestamp pop before logging, this gives the right depth
            nestingPrefix = "⭕" + this.currentEndingCallMarker.repeat(this.functionStack.length);
          }
        }

        displayMessage = paddedFlowTime + nestingPrefix + " " + message;

      } else {
        // Other messages: show current nesting depth with simple markers
        const nestingDepth = this.functionStack.length;
        if (nestingDepth > 0) {
          let nestingPrefix = "";
          for (const call of this.functionStack) {
            if (call.nestingMarker) {
              nestingPrefix += call.nestingMarker;
            }
          }
          displayMessage = paddedFlowTime + nestingPrefix + " " + message;
        } else {
          displayMessage = paddedFlowTime + message;
        }
      }
    }

    const stackTrace = this.getStackTrace();
    const styleLine = Object.entries({
      ...STYLES.base,
      ...STYLES[level]
    }).map(([prop, val]) => `${prop}: ${val};`).join(" ");

    const consoleCalls: Array<[(...args: unknown[]) => void, unknown[]]> = [];

    // Main message
    if (stackTrace || data !== undefined) {
      consoleCalls.push([console.groupCollapsed, [`%c${displayMessage}`, styleLine]]);
    } else {
      consoleCalls.push([console.log, [`%c${displayMessage}`, styleLine]]);
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

  /**
   * Immediately log a timestamped message relative to the most recent funcIn or startFlow
   * @param message - Optional message to display
   * @param data - Optional data to include
   */
  stampNow(message?: string, data?: unknown): void {
    const now = performance.now();
    const displayMessage = message || "Timestamp";

    // Find the most recent reference point (funcIn or startFlow)
    const mostRecentFunction = this.functionStack.length > 0 ? this.functionStack[this.functionStack.length - 1] : null;
    const mostRecentFlow = this.flowStack.length > 0 ? this.flowStack[this.flowStack.length - 1] : null;

    let referenceTime: number;
    let referenceType: string;
    let referenceName: string;

    // Determine which is more recent
    if (!mostRecentFunction && !mostRecentFlow) {
      // No reference points, use absolute time
      referenceTime = 0;
      referenceType = "absolute";
      referenceName = "start";
    } else if (!mostRecentFunction) {
      // Only flow available
      referenceTime = mostRecentFlow!.startTime;
      referenceType = "flow";
      referenceName = mostRecentFlow!.name;
    } else if (!mostRecentFlow) {
      // Only function available
      referenceTime = mostRecentFunction.startTime;
      referenceType = "function";
      referenceName = mostRecentFunction.name;
    } else {
      // Both available, use the more recent one
      if (mostRecentFunction.startTime >= mostRecentFlow.startTime) {
        referenceTime = mostRecentFunction.startTime;
        referenceType = "function";
        referenceName = mostRecentFunction.name;
      } else {
        referenceTime = mostRecentFlow.startTime;
        referenceType = "flow";
        referenceName = mostRecentFlow.name;
      }
    }

    const relativeTime = referenceTime > 0 ? now - referenceTime : now;
    const timeDisplay = referenceTime > 0
      ? `+${relativeTime.toFixed(4)}ms from ${referenceType} "${referenceName}"`
      : `${now.toFixed(4)}ms`;

    if (!this.shouldLog(displayMessage)) return;

    this.logMessage("info", `⏱️ STAMP: ${displayMessage} (${timeDisplay})`, data);
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
   * Record function entry and start timing
   * @param message - Optional message to display (first parameter following standard pattern)
   * @param data - Optional data to display (second parameter following standard pattern)
   */
  funcIn(message?: string, data?: unknown): void {
    // Check for potential infinite recursion
    if (this.functionStack.length > MAX_RECURSION_DEPTH) {
      this.error(`Maximum recursion depth exceeded (${MAX_RECURSION_DEPTH})`, this.functionStack);
      return;
    }

    const functionName = this.getFunctionNameFromStack();
    const now = performance.now();
    const functionCall: FunctionCall = {
      name: functionName,
      startTime: now,
      nestingMarker: this.flowStack.length > 0 ? PLog.claimNestingMarker() : undefined
    };

    // Use provided message or default to function name
    const displayMessage = message || functionName;

    // If we're in a flow, record the flow start time
    if (this.flowStack.length > 0) {
      const currentFlow = this.flowStack[this.flowStack.length - 1]!;
      functionCall.flowStartTime = currentFlow.startTime;
    }

    // Always log function entry (subject to whitelist/blacklist filtering)
    this.logMessage("funcIn", displayMessage, data);

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

    // Store the marker for this specific call so logMessage can use it
    this.currentEndingCallMarker = functionCall.nestingMarker;

    // For recursive functions, we use LIFO matching instead of name matching
    // This allows the same function name to appear multiple times in the stack
    // We only warn about name mismatches if they seem suspicious (different names entirely)
    const namesDiffer = functionCall.name !== currentFunctionName;
    const seemsSuspicious = namesDiffer &&
      !functionCall.name.includes("anonymous") &&
      !currentFunctionName.includes("anonymous") &&
      functionCall.name !== "unknown" &&
      currentFunctionName !== "unknown";

    // Store mismatch info to include in the main message instead of separate warning

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
      // Clear the temporary marker even if we're not logging
      this.currentEndingCallMarker = undefined;
      return;
    }

    // Use provided message or default to function completion message
    // For recursive calls, include the original function name from funcIn
    let displayMessage = message || `${functionCall.name} [⏱️ ${formattedDuration}]`;

    // If there was a suspicious name mismatch, append the warning to the main message
    if (seemsSuspicious) {
      displayMessage += ` (LIFO matching used: expected ${functionCall.name}, got ${currentFunctionName})`;
    }

    // If we're in a flow, add to flow data and include flow time
    if (this.flowStack.length > 0) {
      const currentFlow = this.flowStack[this.flowStack.length - 1]!;
      currentFlow.functions.push({
        name: functionCall.name,
        startTime: functionCall.startTime,
        endTime: now,
        duration
      });

      if (message) {
        // If custom message provided, show it with timing info
        this.logMessage("funcOut", `${displayMessage} [⏱️ ${formattedDuration}]`, data);
      } else {
        // Default message already includes duration
        this.logMessage("funcOut", displayMessage, data);
      }
    } else {
      // Outside a flow, just log the function duration
      this.logMessage("funcOut", displayMessage, data);
    }

    // Clear the temporary marker
    this.currentEndingCallMarker = undefined;

    // Check if analysis is complete and should be logged to file
    this.checkAndLogAnalysis("funcOut");
  }

  /**
   * Start a performance flow
   * @param flowName - Name of the flow
   * @param silenceKLog - If true, silences all kLog calls (except kLog.error) for the duration of this flow
   */
  startFlow(flowName: string, silenceKLog = false): void {
    const now = performance.now();

    if (silenceKLog) {
      this.kLogSilencingFlowCount++;
    }

    this.logMessage("startFlow", `⏱️ FLOW START: ${flowName}${silenceKLog ? " (kLog silenced)" : ""}`);

    this.flowStack.push({
      name: flowName,
      startTime: now,
      silenceKLog,
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

    // Handle kLog silencing counter
    if (flow.silenceKLog) {
      this.kLogSilencingFlowCount--;
      if (this.kLogSilencingFlowCount < 0) {
        this.kLogSilencingFlowCount = 0; // Safety check
      }
    }

    const duration = now - flow.startTime;
    const formattedDuration = this.formatTime(duration);

    this.logMessage("endFlow", `⏱️ FLOW END: ${flow.name} - Total time: ${formattedDuration}${flow.silenceKLog ? " (kLog un-silenced)" : ""}`);

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

    // Check if analysis is complete and should be logged to file
    this.checkAndLogAnalysis("endFlow");
  }

  /**
   * Simple test to verify emoji rotation behavior
   * Run this from the browser console: pLog.testEmojiRotation()
   */
  testEmojiRotation(): void {
    console.clear();
    this.clearHistory();

    this.startFlow("Emoji Rotation Test");

    // Test the emoji rotation - each new funcIn/startTimestamp should claim next emoji
    this.funcIn("First function");
    this.startTimestamp("First timestamp");
    this.startTimestamp("Second timestamp");
    this.startTimestamp("Third timestamp");
    this.endTimestamp("Third timestamp completed");
    this.endTimestamp("Second timestamp completed");
    this.endTimestamp("First timestamp completed");
    this.funcOut("First function completed");

    this.endFlow();
  }

  /**
   * Comprehensive test method to validate all PLog functionality
   * Run this from the Foundry console: pLog.test()
   */
  test(clearConsole = true): void {
    if (clearConsole) {
      console.clear();
    }
    console.group("%c🧪 PLog Test Suite", "color: white; background: purple; font-weight: bold; padding: 5px 10px; font-size: 14px;");

    let testsPassed = 0;
    let testsTotal = 0;
    const testResults: Array<{
      name: string;
      status: "PASS" | "FAIL" | "ERROR";
      details: string;
      error?: string;
    }> = [];

    const runTest = (testName: string, testFn: () => boolean | { result: boolean; details: string }): void => {
      testsTotal++;
      try {
        const testResult = testFn();

        // Handle both boolean and detailed result formats
        const result = typeof testResult === "boolean" ? testResult : testResult.result;
        const details = typeof testResult === "object" && testResult.details ? testResult.details : undefined;

        if (result) {
          testsPassed++;
          testResults.push({
            name: testName,
            status: "PASS",
            details: details || "Test completed successfully"
          });
        } else {
          testResults.push({
            name: testName,
            status: "FAIL",
            details: details || "Test returned false - check implementation"
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        testResults.push({
          name: testName,
          status: "ERROR",
          details: "Test threw an exception",
          error: errorMessage
        });
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
      this.stampNow("Test timestamp");
      this.stampNow(); // Test with no message
      return true; // Visual inspection required
    });

    // Test 2: Time formatting
    runTest("Time Formatting", () => {
      const tests = [
        { input: 50, expected: /50 ms/ },         // "50 ms" (rounded)
        { input: 150, expected: /150 ms/ },       // "150 ms" (rounded)
        { input: 1500, expected: /1\.5000 s/ },   // "1.5000 s" (seconds)
        { input: 0.5, expected: /0\.50 ms/ }      // "0.50 ms" (2 decimal places)
      ];

      return tests.every(test => {
        const result = this.formatTime(test.input);
        const matches = test.expected.test(result);
        if (!matches && __DEV__) {
          console.log(`Time format test failed: ${test.input}ms -> "${result}" (expected: ${test.expected})`);
        }
        return matches;
      });
    });

    // Test 3: Function timing with auto-detection (standard usage)
    runTest("Function Timing with Auto-Detection", () => {
      // Define a test function to be detected
      const testAutoDetection = () => {
        this.funcIn(); // Auto-detect function name (standard usage)

        // Simulate some work
        const start = performance.now();
        while (performance.now() - start < 10) { /* wait */ }

        this.funcOut(); // Auto-match with funcIn (standard usage)
        return true;
      };

      // Call the test function
      testAutoDetection();

      return this.functionStack.length === 0; // Should be empty after funcOut
    });

    // Test 3b: Function timing with custom messages
    runTest("Function Timing with Custom Messages", () => {
      // Test custom message functionality
      const testCustomMessages = () => {
        this.funcIn("Custom start message", { param: "value" });

        // Simulate some work
        const start = performance.now();
        while (performance.now() - start < 10) { /* wait */ }

        this.funcOut("Custom completion message");
        return true;
      };

      // Call the test function
      testCustomMessages();

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

        // Restore original error method before cleanup
        this.error = originalError;

        // Clean up the remaining flow since the mismatch test leaves it hanging
        if (this.flowStack.length > 0) {
          this.endFlow("testFlow"); // Clean up properly
        }

        // Reset for final verification
        errorMessages = [];
        testPassed = true;

        // Verify stack is properly managed
        const stackEmpty = this.flowStack.length === 0;
        const finalResult = stackEmpty && hadExpectedErrors && testPassed;

        return {
          result: finalResult,
          details: `stackEmpty: ${stackEmpty}, hadExpectedErrors: ${hadExpectedErrors}, testPassed: ${testPassed}, flowStack.length: ${this.flowStack.length}`
        };
      } finally {
        // Restore original error method
        this.error = originalError;
      }
    });

    // Test 5: Nested function calls with proper matching verification
    runTest("Nested Function Calls with Proper Matching", () => {
      let testPassed = true;
      const originalError = this.error.bind(this);
      const originalWarn = this.warn.bind(this);
      let errorMessages: string[] = [];

      // Temporarily override error and warn methods to capture messages
      this.error = (message: string) => {
        errorMessages.push(message);
        testPassed = false;
        originalError(message);
      };

      this.warn = (message: string) => {
        errorMessages.push(message);
        originalWarn(message);
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

        // Restore original methods before cleanup
        this.error = originalError;
        this.warn = originalWarn;

        // Clean up any remaining functions in the stack from the mismatch test
        while (this.functionStack.length > 0) {
          this.functionStack.pop();
        }

        // Reset for final verification
        errorMessages = [];
        testPassed = true;

        // Test 3: Verify stack is properly managed
        const stackEmpty = this.functionStack.length === 0;
        const finalResult = stackEmpty && hadExpectedErrors && testPassed;

        return {
          result: finalResult,
          details: `stackEmpty: ${stackEmpty}, hadExpectedErrors: ${hadExpectedErrors}, testPassed: ${testPassed}, functionStack.length: ${this.functionStack.length}`
        };
      } finally {
        // Restore original methods
        this.error = originalError;
        this.warn = originalWarn;
      }
    });

    // Test 6: Conditional breakpoint (without triggering)
    runTest("Conditional Breakpoint (false)", () => {
      this.breakIf("Should not break", { condition: false }, false);
      return true; // If we reach here, breakpoint didn't trigger
    });

    // Test 7: Settings filtering (basic test)
    runTest("Settings Integration", () => {
      // Test that settings are accessible (should always work with fallbacks)
      const whitelist = this.getSafePLogSetting("pLogWhitelist");
      const blacklist = this.getSafePLogSetting("pLogBlacklist");
      return typeof whitelist === "string" && typeof blacklist === "string";
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
          callOrder.every((call, index) => {
            const expected = expectedPattern[index]!;
            const matches = call === expected;
            if (!matches && __DEV__) {
              console.log(`Call order mismatch at index ${index}: expected "${expected}", got "${call}"`);
            }
            return matches;
          });

        const stackEmpty = this.functionStack.length === 0;
        const finalResult = orderCorrect && stackEmpty;

        return {
          result: finalResult,
          details: `orderCorrect: ${orderCorrect}, stackEmpty: ${stackEmpty}, callOrder.length: ${callOrder.length}, expected: ${expectedPattern.length}, first_mismatch: expected="${expectedPattern[0]}" vs actual="${callOrder[0]}"`
        };
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
      // Test that settings are accessible (should always work with fallbacks)
      const whitelist = this.getSafePLogSetting("pLogWhitelist");
      const blacklist = this.getSafePLogSetting("pLogBlacklist");
      return typeof whitelist === "string" && typeof blacklist === "string";
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

    // Test 13: Basic timestamp functionality (LIFO)
    runTest("Basic Timestamp Functionality", () => {
      this.clearHistory();

      this.startTimestamp("Operation A", { test: "data" });

      // Add delay for measurable timing
      const start = performance.now();
      while (performance.now() - start < 2) { /* wait */ }

      this.endTimestamp("Operation A completed");

      const analysis = this.analyzeTimestamps();
      return analysis.isValid && this.functionStack.length === 0;
    });

    // Test 14: Labeled timestamp functionality
    runTest("Labeled Timestamp Functionality", () => {
      this.clearHistory();

      // Test basic labeled timestamps
      this.startTimestamp("Operation X", undefined, "labelX");
      this.startTimestamp("Operation Y", undefined, "labelY");

      // Add delays
      const start1 = performance.now();
      while (performance.now() - start1 < 2) { /* wait */ }

      // End in reverse order (would fail with LIFO, but works with labels)
      this.endTimestamp("Operation X done", undefined, "labelX");

      const start2 = performance.now();
      while (performance.now() - start2 < 2) { /* wait */ }

      this.endTimestamp("Operation Y done", undefined, "labelY");

      const analysis = this.analyzeTimestamps();

      // Capture the size immediately after analyzeTimestamps
      const labeledTimestampsSize = this.labeledTimestamps.size;
      const finalResult = analysis.isValid && labeledTimestampsSize === 0;

      const detailsString = `analysis.isValid: ${analysis.isValid}, labeledTimestamps.size: ${labeledTimestampsSize}, issues: [${analysis.issues.join(" | ")}]`;

      return {
        result: finalResult,
        details: detailsString
      };
    });

    // Test 15: Mixed timestamp functionality (LIFO + labeled)
    runTest("Mixed Timestamp Functionality", () => {
      this.clearHistory();

      this.startTimestamp("Outer operation"); // LIFO
      this.startTimestamp("Labeled operation", undefined, "special"); // Labeled
      this.startTimestamp("Inner operation"); // LIFO

      // Add delays
      const start = performance.now();
      while (performance.now() - start < 2) { /* wait */ }

      this.endTimestamp("Inner done"); // LIFO - matches "Inner operation"
      this.endTimestamp("Special done", undefined, "special"); // Labeled - matches "Labeled operation"
      this.endTimestamp("Outer done"); // LIFO - matches "Outer operation"

      const analysis = this.analyzeTimestamps();

      // Capture values for result reporting
      const functionStackLength = this.functionStack.length;
      const labeledTimestampsSize = this.labeledTimestamps.size;
      const finalResult = analysis.isValid && functionStackLength === 0 && labeledTimestampsSize === 0;

      return {
        result: finalResult,
        details: `analysis.isValid: ${analysis.isValid}, functionStack.length: ${functionStackLength}, labeledTimestamps.size: ${labeledTimestampsSize}, issues: [${analysis.issues.join(" | ")}]`
      };
    });

    // Test 16: Timestamp error handling
    runTest("Timestamp Error Handling", () => {
      this.clearHistory();
      let errorCaught = false;

      try {
        // Test duplicate label error
        this.startTimestamp("Op 1", undefined, "duplicate");
        this.startTimestamp("Op 2", undefined, "duplicate"); // Should throw
      } catch (error) {
        errorCaught = true;
      }

      this.clearHistory(); // Clean up

      if (!errorCaught) return false;

      errorCaught = false;
      try {
        // Test missing label error
        this.endTimestamp("Missing", undefined, "nonexistent"); // Should throw
      } catch (error) {
        errorCaught = true;
      }

      return errorCaught;
    });

    // Test 17: Proper method usage patterns
    runTest("Proper Method Usage Patterns", () => {
      this.clearHistory();

      // Test the correct usage pattern: funcIn/funcOut for functions, startTimestamp/endTimestamp for sub-operations
      const testFunction = () => {
        this.funcIn(); // Function-level tracking (auto-detect)

        // Sub-operations within the function
        this.startTimestamp("Sub-operation 1");
        const start1 = performance.now();
        while (performance.now() - start1 < 2) { /* wait */ }
        this.endTimestamp("Sub-operation 1 completed");

        this.startTimestamp("Sub-operation 2");
        const start2 = performance.now();
        while (performance.now() - start2 < 2) { /* wait */ }
        this.endTimestamp("Sub-operation 2 completed");

        this.funcOut(); // Function-level tracking (auto-match)
      };

      testFunction();

      const analysis = this.analyzeTimestamps();
      const finalResult = analysis.isValid && this.functionStack.length === 0;

      return {
        result: finalResult,
        details: `analysis.isValid: ${analysis.isValid}, functionStack.length: ${this.functionStack.length}, completedCalls: ${this.completedCalls.length}, issues: [${analysis.issues.join(" | ")}]`
      };
    });

    // Test 18: Timestamp with flow integration
    runTest("Timestamp with Flow Integration", () => {
      this.clearHistory();

      this.startFlow("Test Flow");
      this.startTimestamp("Flow operation A");
      this.startTimestamp("Flow operation B", undefined, "flowB");

      // Add delays
      const start = performance.now();
      while (performance.now() - start < 2) { /* wait */ }

      this.endTimestamp("Flow A done");
      this.endTimestamp("Flow B done", undefined, "flowB");
      this.endFlow("Test Flow");

      const analysis = this.analyzeTimestamps();
      const finalResult = analysis.isValid && this.flowStack.length === 0 && this.functionStack.length === 0;

      // Capture values for result reporting
      const flowStackLength = this.flowStack.length;
      const functionStackLength = this.functionStack.length;
      const labeledTimestampsSize = this.labeledTimestamps.size;

      return {
        result: finalResult,
        details: `analysis.isValid: ${analysis.isValid}, flowStack.length: ${flowStackLength}, functionStack.length: ${functionStackLength}, labeledTimestamps.size: ${labeledTimestampsSize}, issues: [${analysis.issues.join(" | ")}]`
      };
    });

    // Test 19: kLog silencing functionality
    runTest("kLog Silencing", () => {
      // Test that kLog silencing state is properly managed
      const initialSilenced = this.isKLogSilenced();

      // Start a silencing flow
      this.startFlow("Silencing Test", true);
      const silencedDuringFlow = this.isKLogSilenced();

      // End the silencing flow
      this.endFlow("Silencing Test");
      const silencedAfterFlow = this.isKLogSilenced();

      // Test nested silencing flows
      this.startFlow("Outer Flow", true);
      this.startFlow("Inner Flow", true);
      const nestedSilenced = this.isKLogSilenced();

      this.endFlow("Inner Flow");
      const afterInnerEnd = this.isKLogSilenced();

      this.endFlow("Outer Flow");
      const afterOuterEnd = this.isKLogSilenced();

      return (
        !initialSilenced &&
        silencedDuringFlow &&
        !silencedAfterFlow &&
        nestedSilenced &&
        afterInnerEnd && // Should still be silenced after inner ends
        !afterOuterEnd   // Should not be silenced after outer ends
      );
    });

    // Test 20: Mixed silencing and non-silencing flows
    runTest("Mixed Flow Silencing", () => {
      this.clearHistory();

      // Start non-silencing flow
      this.startFlow("Normal Flow", false);
      const normalFlowSilenced = this.isKLogSilenced();

      // Start silencing flow within normal flow
      this.startFlow("Silent Flow", true);
      const silentFlowSilenced = this.isKLogSilenced();

      // End silent flow
      this.endFlow("Silent Flow");
      const afterSilentEnd = this.isKLogSilenced();

      // End normal flow
      this.endFlow("Normal Flow");
      const afterNormalEnd = this.isKLogSilenced();

      return (
        !normalFlowSilenced &&
        silentFlowSilenced &&
        !afterSilentEnd &&
        !afterNormalEnd
      );
    });

    // Test 21: Recursion depth protection
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

    // Log test results to file for detailed analysis
    void this.logTestResultsToFile(testResults, testsPassed, testsTotal, passRate);

    if (testsPassed === testsTotal) {
      console.log("%c🎉 All tests passed! PLog is working correctly.", "color: green; font-weight: bold; font-size: 16px;");
    } else {
      console.log("%c⚠️ Some tests failed. Check the results above for details.", "color: red; font-weight: bold; font-size: 16px;");
    }

    console.groupEnd();
  }

  /**
   * Start a timestamp for any operation (not tied to specific functions)
   * @param message - Description of what's being timed (first parameter following standard pattern)
   * @param data - Optional data to display (second parameter following standard pattern)
   * @param label - Optional label for explicit matching (third parameter for specific behavior)
   */
  startTimestamp(message: string, data?: unknown, label?: string): void {
    const now = performance.now();
    const timestampCall: TimestampCall = {
      name: message,
      startTime: now,
      label,
      nestingMarker: this.flowStack.length > 0 ? PLog.claimNestingMarker() : undefined
    };

    // Add flow start time if we're in a flow
    if (this.flowStack.length > 0) {
      const currentFlow = this.flowStack[this.flowStack.length - 1]!;
      timestampCall.flowStartTime = currentFlow.startTime;
    }

    // Log the start message BEFORE adding to stack (like funcIn)
    this.logMessage("startTimestamp", message, data);

    if (label) {
      // Labeled timestamp - store for explicit matching
      if (this.labeledTimestamps.has(label)) {
        throw new Error(`Timestamp label "${label}" already in use. Each label must be unique until its matching endTimestamp is called.`);
      }
      this.labeledTimestamps.set(label, timestampCall);
    } else {
      // Unlabeled timestamp - use LIFO stack
      this.functionStack.push(timestampCall);
    }
  }

  /**
   * End a timestamp (LIFO matching for unlabeled, explicit matching for labeled)
   * @param message - Optional message to display (first parameter following standard pattern)
   * @param data - Optional data to display (second parameter following standard pattern)
   * @param label - Optional label for explicit matching (third parameter for specific behavior)
   */
  endTimestamp(message?: string, data?: unknown, label?: string): void {
    const now = performance.now();
    let timestampCall: TimestampCall;

    if (label) {
      // Labeled timestamp - find explicit match
      const labeledCall = this.labeledTimestamps.get(label);
      if (!labeledCall) {
        throw new Error(`No matching startTimestamp found for label "${label}". Make sure you called startTimestamp with the same label.`);
      }
      timestampCall = labeledCall;
      this.labeledTimestamps.delete(label);
    } else {
      // Unlabeled timestamp - use LIFO (exactly like funcOut)
      if (this.functionStack.length === 0) {
        this.error("endTimestamp called but no matching startTimestamp found");
        return;
      }
      // Pop immediately like funcOut does
      timestampCall = this.functionStack.pop()!;
    }

    const duration = now - timestampCall.startTime;
    const formattedDuration = this.formatTime(duration);
    const displayMessage = message || `${timestampCall.name} [⏱️ ${formattedDuration}]`;

    // Store the marker for this specific call so logMessage can use it
    this.currentEndingCallMarker = timestampCall.nestingMarker;

    // Check if we should log based on message (if provided)
    if (message && !this.shouldLog(message)) {
      // Clear the temporary marker even if we're not logging
      this.currentEndingCallMarker = undefined;
      return;
    }

    // Record completed call for timestamp analysis
    this.completedCalls.push({
      name: timestampCall.name,
      startTime: timestampCall.startTime,
      endTime: now,
      duration,
      depth: this.functionStack.length
    });

    // Show collapsed message with matched start message for verification

    if (this.flowStack.length > 0) {
      const currentFlow = this.flowStack[this.flowStack.length - 1]!;
      currentFlow.functions.push({
        name: timestampCall.name,
        startTime: timestampCall.startTime,
        endTime: now,
        duration
      });

      if (message) {
        this.logMessage("endTimestamp", `${displayMessage} [⏱️ ${formattedDuration}]`);
      } else {
        this.logMessage("endTimestamp", displayMessage);
      }
    } else {
      this.logMessage("endTimestamp", displayMessage);
    }


    if (data !== undefined) {
      console.log(data);
    }
    console.groupEnd();

    // Clear the temporary marker
    this.currentEndingCallMarker = undefined;

    // Check if analysis is complete and should be logged to file
    this.checkAndLogAnalysis("endTimestamp");
  }

  /**
   * Get the most recent analysis log file
   * Note: This is a simplified version that doesn't read from files since
   * Foundry VTT modules don't have direct file system access in the browser
   */
  private getLatestAnalysisFile(): Maybe<{ validation: { isValid: boolean; issues: string[]; summary: string } }> {
    // For now, return undefined since we can't easily read files from browser environment
    // This functionality would need to be implemented using Foundry's file APIs
    // which are more complex and async
    console.warn("PLog: getLatestAnalysisFile not implemented for browser environment");
    return undefined;
  }



  /**
   * Analyze timestamps of completed function calls to validate proper pairing
   * This helps detect if funcIn/funcOut calls are being matched correctly
   * @param useLatestFile - If true, analyzes the most recent log file instead of current history
   */
  analyzeTimestamps(useLatestFile = false): { isValid: boolean; issues: string[]; summary: string } {
    if (useLatestFile) {
      const latestFile = this.getLatestAnalysisFile();
      if (latestFile?.validation) {
        return latestFile.validation;
      }
      // Fall back to current history if no file found
    }
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
   * Clear completed calls history and labeled timestamps (useful for testing)
   */
  clearHistory(): void {
    this.completedCalls = [];
    this.labeledTimestamps.clear();
  }

  /**
   * Check if kLog calls should be silenced (used by kLog internally)
   */
  isKLogSilenced(): boolean {
    return this.kLogSilencingFlowCount > 0;
  }



  /**
   * Log test results to a file for detailed analysis
   */
  private async logTestResultsToFile(
    testResults: Array<{
      name: string;
      status: "PASS" | "FAIL" | "ERROR";
      details: string;
      error?: string;
    }>,
    testsPassed: number,
    testsTotal: number,
    passRate: string
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `plog-test-results-${timestamp}.json`;

      const testLogDir = joinPath("logs", C.SYSTEM_ID, "test-results");
      const filePath = joinPath(testLogDir, filename);

      const testData = {
        timestamp: new Date().toISOString(),
        systemId: C.SYSTEM_ID,
        summary: {
          testsPassed,
          testsTotal,
          passRate: `${passRate}%`,
          success: testsPassed === testsTotal
        },
        results: testResults, // Already structured data
        failedTests: testResults.filter(result => result.status !== "PASS"),
        passedTests: testResults.filter(result => result.status === "PASS"),
        metadata: {
          foundryVersion: getGame().version || "unknown",
          systemVersion: getGame().system?.version || "unknown",
          moduleVersion: "dev"
        }
      };

      // Use Foundry's file system API to write the file
      const file = new File([JSON.stringify(testData, null, 2)], filename, {
        type: "application/json"
      });

      // Upload to the test results directory using Foundry's FilePicker
      await FilePicker.upload("data", testLogDir, file, {});

      if (__DEV__) {
        console.log(`PLog: Test results logged to ${filePath}`);
      }

    } catch (error) {
      console.error("PLog: Failed to log test results to file:", error);
    }
  }

  /**
   * Log the current analysis history using the queue system
   */
  private logHistoryToFile(trigger: string): void {
    try {
      // Automatically validate the analysis before logging
      const validation = this.analyzeTimestamps();

      if (!validation.isValid) {
        console.warn(`PLog: Analysis validation failed (${trigger}):`, validation.issues);
        console.warn("PLog: Logging anyway for debugging purposes");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `plog-analysis-${timestamp}-${trigger}.json`;

      // logDir and filePath no longer needed since we're using the queue

      const analysisData = {
        trigger,
        timestamp: new Date().toISOString(),
        systemId: C.SYSTEM_ID,
        completedCalls: [...this.completedCalls],
        validation, // Include validation results automatically
        metadata: {
          totalCalls: this.completedCalls.length,
          duration: this.completedCalls.length > 0 ?
            Math.max(...this.completedCalls.map(c => c.endTime)) -
            Math.min(...this.completedCalls.map(c => c.startTime)) : 0,
          foundryDataPath: "relative to Foundry data directory"
        }
      };

      // Queue the file write operation instead of writing directly
      this.queueFileWrite(filename, analysisData);



      // Clear history after queuing (data is already copied to analysisData)
      this.clearHistory();

    } catch (error) {
      console.error("PLog: Failed to log analysis to file:", error);
      // Don't clear history if logging failed
    }
  }



  /**
   * Check if analysis is complete and should be logged to file
   */
  private checkAndLogAnalysis(trigger: string): void {
    let shouldLog = false;

    switch (trigger) {
      case "funcOut":
        // funcOut: stack empty AND not in flow AND no pending timestamps
        shouldLog = this.functionStack.length === 0 &&
                   this.flowStack.length === 0 &&
                   this.labeledTimestamps.size === 0;
        break;

      case "endTimestamp":
        // endTimestamp: no pending timestamps AND no pending functions AND not in flow
        shouldLog = this.labeledTimestamps.size === 0 &&
                   this.functionStack.length === 0 &&
                   this.flowStack.length === 0;
        break;

      case "endFlow":
        // endFlow: no remaining flows (not nested)
        shouldLog = this.flowStack.length === 0;
        break;
    }

    if (shouldLog && this.completedCalls.length > 0) {
      // Use the queue-based logging system
      this.logHistoryToFile(trigger);
    }
  }
}

export default PLog;
