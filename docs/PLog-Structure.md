# PLog
`PLog` is a new debugging, performance-testing and logging class, the features and functionality of which is described in this document.

## Preliminary Notes

### Definitions of Terms

- "flow", "flow-of-execution" --- a flow is defined by a call to `startFlow` and is ended by a call to `endFlow`. These are almost always "top-leveL" concepts, and are not generally nested within other flows (in cases where this happens, special behavior has been defined in the "## Version 2 Enhancements" section below)
- "block" --- code bounded by either `funcIn` and `funcOut` OR `startTimestamp` and `endTimestamp`, as well as the method calls themselves.

### Displaying Time

- times should be displayed in SECONDS (not milliseconds)
- times should be rounded to the nearest integer OR to at least three total significant digits, whichever results in a greater number of significant digits
  - e.g. "1.23456 s" should be displayed as "1.23 s", "0.12345 ms" should be displayed as "0.000123 s", and "123.12345 s" should be displayed as "123 s"

### Testing Strategy

Because this project is a module for Foundry VTT, it is not possible to write unit tests for it in the traditional sense. Instead, you should create a single method named `test` (or `Test`, if it is `static`) that
  - I will run from the console from within an instance of Foundry
  - includes whatever tests you require to ensure the class is working correctly, and reports the results to the console in a way that I can report back to you.

### File Structure

- the `PLog` class is defined in and exported from `src/module/scripts/PLog.ts`
- logs of flow analyses should be written to a file in the `logs/plog-analysis` folder via the relative pathing of the Foundry `FilePicker` API
- logs of testing suite results should be written to a file in the `logs/test-results` folder via the relative pathing of the Foundry `FilePicker` API

## PLog: Version 1 Implementation

### Initialization & Global Scope Single-Instance Pattern

- a static getter for the `PLog` class that returns the singleton instance of the class, creating it if necessary, should be assigned to the global scope as `pLog`
- `pLog`'s type definitions should be maintained in `src/module/@types/general-types.d.ts`.

### Console Logging Features
_(See `src/module/scripts/logger.ts` for examples of many of these features as they were implemented in the current `kLog` global.)_

- a distinct visual style for the console messages, to distinguish them from other `console.log/warn/error` calls, as well as from `kLog` messages
- each message should be accompanied by a filtered and formatted stack trace, displayed as an unfoldable part of the message via use of `console.groupCollapsed` and `console.groupEnd`
  - this stacktrace should filter out any lines that are not relevant to the location of the message in the codebase, such as references to the `pLog` methods themselves
  - stacktrace lines that explicitly refer to classes contained in `eunos-kult-hacks` should be displayed in a different color from those that refer to external libraries (like Foundry or GSAP)
  - ambiguous stacktrace messages representing intermediary steps within asynchronous operations or other potentially relevant but non-specific lines should be dimmed in color
- the first parameter of each logging method should be the primary display message
- the second parameter should accept any type of data, and display it in the standard way (e.g. simply posting the object and allowing the browser to format it as it normally would)
- further parameters can be used to define specific behavior for any methods that require it

### White & Blacklists Contained in Settings
_(See `src/module/scripts/settings.ts` and `src/module/@types/fvtt-types-config.d.ts` for examples of how to register new settings and how to configure the FVTT type definitions for them.)_

- a GM-only setting for a comma-delimited whitelist of text strings that will be matched to messages via RegExp analysis of the primary message string
- another GM-only setting for a comma-delimited blacklist of text strings that will be matched to messages via RegExp analysis of the primary message string
- the whitelist and blacklist should interact as follows:
  - whitelist empty, blacklist empty: all messages are logged
  - whitelist empty, blacklist populated: all messages not on the blacklist are logged
  - whitelist populated, blacklist empty: only messages on the whitelist are logged
  - whitelist populated, blacklist populated: the whitelist is checked first; only if the message matches a term in the whitelist is it displayed, UNLESS it also matches a term in the blacklist, in which case it is not displayed

### Visual Nesting and Emoji Markers

- within flows, function calls and timestamp operations use rotating emoji markers (🟢🔵🟣🟡🟠🔴) to visually pair start/end operations
- each new `funcIn` or `startTimestamp` claims the next emoji from a rotating deck
- the corresponding `funcOut` or `endTimestamp` uses the same emoji marker with different prefixes:
  - start methods use 🔆 prefix (bright sun)
  - end methods use ⭕ prefix (red circle)
- emoji markers repeat based on nesting depth to show hierarchical structure
- flow time is displayed at the beginning of each message with fixed-width padding for alignment

### Specific Methods of `PLog`
_(Unless explicitly stated otherwise, the first parameter of the following methods is the primary display message, and the second parameter is (optional) data to be displayed, as described above.)_

- `log`, `warn`, `info`, `debug`, `error`, `display`, `socketCall`, `socketResponse`, `socketReceived` --- these post messages to the console as described above, each with a unique visual style to distinguish them
- `breakIf` --- requires a boolean value for its third parameter. If this boolean is `false`, the method does nothing. If it is `true`, the method displays its message and data as other functions do, but then breaks execution (via `debugger`)
- `funcIn`, `funcOut` --- these methods are called at the start and end of a function, respectively.
  - `funcIn(message?: string, data?: unknown)` records the function name (auto-detected from stack trace) and start time. It **always** displays a message to the console (subject only to whitelist/blacklist filtering). Uses provided message or defaults to detected function name.
  - `funcOut(message?: string, data?: unknown)` calculates duration since matching `funcIn` and displays the function name with elapsed time. Default message format is `${functionName} [⏱️ ${duration}]` (note: "completed" was removed as redundant). Uses LIFO (Last In, First Out) matching to support recursive function calls.
  - both methods support nested calls through a function stack that ensures each `funcOut` matches the correct `funcIn`
  - if function name mismatch is detected (e.g., due to complex call patterns), a warning is appended to the `funcOut` message rather than logged separately
- `startTimestamp`, `endTimestamp` --- these methods provide timing for arbitrary operations (not tied to specific functions).
  - `startTimestamp(message: string, data?: unknown, label?: string)` starts timing an operation. The message parameter is required. Optional label enables explicit matching instead of LIFO.
  - `endTimestamp(message?: string, data?: unknown, label?: string)` ends timing. Uses LIFO matching for unlabeled timestamps, explicit matching for labeled ones.
  - labeled timestamps allow non-nested timing patterns (e.g., starting A, starting B, ending A, ending B)
- `stampNow(message?: string, data?: unknown)` --- immediately logs a timestamp relative to the most recent `funcIn` or `startFlow`, useful for marking specific points during execution
- `startFlow`, `endFlow` --- these methods mark the beginning and end of a flow of execution, changing how other methods display time values.
  - `startFlow(flowName: string, silenceKLog = false)` begins a flow. Optional second parameter silences kLog calls (except errors) for the duration.
  - inside a flow, all `funcIn`, `funcOut`, `startTimestamp`, and `endTimestamp` calls display flow time (elapsed since `startFlow`) in addition to their individual durations
  - flows support nesting, with timing relative to the most recent `startFlow`
  - `endFlow(flowName?: string)` ends the flow, displays total duration, and shows a summary table of all timed operations within the flow
  - flow analysis data is automatically saved to timestamped JSON files in the logs directory

### Additional Methods and Features

- `clearHistory()` --- clears all internal tracking data (function stack, completed calls, etc.) for clean testing
- `analyzeTimestamps(readFromFile?: boolean)` --- validates timing data integrity and returns analysis results. Can read from most recent log file if parameter is true.
- `test(clearConsole = true)` --- comprehensive test suite that validates all PLog functionality. Runs multiple test scenarios and reports results to console.
- `testEmojiRotation()` --- simple test to verify emoji marker rotation and nesting behavior
- automatic file logging of flow analysis results to `logs/plog-analysis/` directory with timestamped filenames
- queue-based file writing system to prevent race conditions during concurrent operations
- integration with kLog silencing system to reduce console noise during performance testing
- automatic history clearing when analysis completes (all tracking methods have no unresolved calls)
- function name auto-detection from stack traces with improved regex patterns to handle complex call scenarios
- support for recursive function calls through LIFO matching without name conflicts

## PLog: Version 2 Enhancements

1. **Black-/Whitelists Should Cascade To Nested Blocks** --- If a higher-level flow is not logged because of a whitelist/blacklist check, then all nested blocks within it (whether `funcIn`/`funcOut` pairs, `startTimestamp`/`endTimestamp` pairs, or even other flows) should not be logged either, even if they would otherwise pass the whitelist/blacklist checks.
2. **Collapse Nested Flows** --- If a flow (i.e. a `startFlow`/`endFlow` pair) is nested within another flow, only the start and ending messages of the nested flow (including the total duration of the nested flow) should be displayed: all blocks nested within it, including even more deeply-nested flows, should not be displayed

## Speculative Future Enhancements

- **Pseudo-Graphical Display of Flow Time** --- Displaying the total flow time as a visual bar (e.g. "[█████     ]") that represents 0 s when empty, and the total duration of the flow when full
- **Tracking of Parallel Asynchronous Flow Components** --- When functions or methods tagged for analysis within a flow are called while asynchronous operations within the flow are still running, this should be detected and incorporated into the reported data.
