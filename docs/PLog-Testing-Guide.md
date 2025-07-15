# PLog Testing and Flow Analysis Guide

This guide covers how to use the PLog performance logging system for testing, debugging, and flow-of-execution analysis.

PLog uses a singleton pattern - the global `pLog` automatically creates and returns the same instance whenever accessed.

## Table of Contents

1. [Running PLog Tests](#running-plog-tests)
2. [Setting Up Flow-of-Execution Analysis](#setting-up-flow-of-execution-analysis)
3. [Running Flow Analysis](#running-flow-analysis)
4. [Advanced Features](#advanced-features)
5. [Troubleshooting](#troubleshooting)

## Running PLog Tests

### Basic Test Suite

The PLog class includes a comprehensive test suite that validates all functionality. To run the tests:

1. **Open Foundry VTT** with the eunos-kult-hacks module enabled
2. **Open the browser console** (F12)
3. **Run the test suite**:
   ```javascript
   pLog.test()
   ```

### Test Coverage

The test suite includes:

- **Basic logging methods** (log, warn, info, debug, error, display, socket methods)
- **Time formatting** (seconds vs milliseconds, significant digits)
- **Function timing** with auto-detection
- **Flow tracking** with nested flows
- **Recursive function calls** with LIFO matching
- **Nested function calls** with proper pairing verification
- **Timestamp analysis** for validating call matching
- **Basic timestamp functionality** (LIFO behavior)
- **Labeled timestamp functionality** (explicit matching)
- **Mixed timestamp functionality** (LIFO + labeled)
- **Timestamp error handling** (duplicate labels, missing labels)
- **Timestamp with flow integration**
- **kLog silencing** (single and nested flows)
- **Mixed flow silencing** (silencing and non-silencing flows)
- **Recursion protection** (depth limits)

### Interpreting Test Results

The test output shows:
- ✅ **Passed tests** in green
- ❌ **Failed tests** in red with error details
- 📊 **Summary statistics** (X/Y tests passed, percentage)
- 🎉 **Success message** if all tests pass

## Setting Up Flow-of-Execution Analysis

Flow-of-execution analysis tracks the performance and timing of complex operations. Here's how to set it up:

### 1. Identify the Entry Point

Find the main function or socket handler that triggers the operation you want to analyze.

**Example**: Phase transition from SessionStarting to SessionRunning
```typescript
// Entry point: EunosOverlay.SocketFunctions.changePhase
changePhase: (data: { prevPhase: GamePhase; newPhase: GamePhase }) => {
  // This is where we'll start our flow analysis
}
```

### 2. Add Flow Tracking

Begin the flow analysis with `pLog.startFlow` (you may optionally pass a message for display to the console), and end it with `pLog.endFlow`.  These calls do not have to be located in the same function, or any other shared scope. However, analysis is only possible if all `pLog.startFlow` calls are properly matched with enough `pLog.endFlow` calls to cover end points for all possible paths through the flow.

**IMPORTANT:** Every path through the flow must end with `pLog.endFlow`. This includes error handling and asynchronous paths. Put another way, whenever `pLot.startFlow` is called, it must always encounter a `pLog.endFlow` at some point.

```typescript
changePhase: (data: { prevPhase: GamePhase; newPhase: GamePhase }) => {
  // Start the flow with descriptive name
  pLog.startFlow(`Phase Transition: ${data.prevPhase} → ${data.newPhase}`);

  void EunosOverlay.instance
    .cleanupPhase(data.prevPhase)
    .then(() => {
      return EunosOverlay.instance.initializePhase(data.newPhase);
    })
    .then(() => {
      // Our phase transition sequence ends in success, so we end the flow.
      pLog.endFlow();
    })
    .catch((error: unknown) => {
      kLog.error("Error initializing phase:", error);
      pLog.error("Phase transition failed", error);
      // But we must also account for this possible path through the code, so we end the flow here, too.
      pLog.endFlow();
    });
},
```

### 3. Add Function-Level Tracking

Add `funcIn`/`funcOut` calls to any methods or functions you would like to track. As long as every path through the code following a `funcIn` ends with a `funcOut`, you can nest them, even recusively. They will automatically detect and display the name of the function they are tracking, and can be used without providing parameters.

```typescript
async cleanupPhase(gamePhase?: GamePhase) {
  pLog.funcIn(); // Auto-detects "cleanupPhase"
  gamePhase = gamePhase ?? getSetting("gamePhase");
  // ... cleanup logic ...
  pLog.funcOut(); // Matches with funcIn above
}

async initializePhase(gamePhase?: GamePhase) {
  pLog.funcIn(); // Auto-detects "initializePhase"
  gamePhase = gamePhase ?? getSetting("gamePhase");
  // ... initialization logic ...
  pLog.funcOut(); // Matches with funcIn above
}
```

**Note**: You can optionally provide custom messages and data (of any type) if needed:
```typescript
pLog.funcIn("Custom description", { gamePhase });
pLog.funcOut("Custom completion message");
```

### 5. Add Instant Timestamps

For quick debugging or marking specific points in time, use `stampNow()`. This immediately logs a timestamp relative to the most recent `funcIn` or `startFlow`:

```typescript
async processData() {
  pLog.funcIn(); // Auto-detects "processData"

  // Some initial work...
  pLog.stampNow("Starting validation"); // Shows time from funcIn

  await validateInput();
  pLog.stampNow("Validation complete"); // Shows time from funcIn

  await processResults();
  pLog.stampNow(); // Uses default "Timestamp" message

  pLog.funcOut();
}
```

**Output example:**
```
⏱️ STAMP: Starting validation (+45.2341ms from function "processData")
⏱️ STAMP: Validation complete (+123.7892ms from function "processData")
⏱️ STAMP: Timestamp (+234.5678ms from function "processData")
```

### 6. Add Sub-Operation Tracking

For detailed analysis of operations within functions, use `startTimestamp`/`endTimestamp`. These methods support optional labels that allow you to explicitly pair start/end calls, which is useful for operations that don't follow strict nesting or when tracking overlapping processes.

```typescript
private async initialize_SessionRunning(): Promise<void> {
  pLog.funcIn(); // Track the entire function

  pLog.startTimestamp("Killing sound & clock", undefined, "kill-sound-clock"); // Labeled for explicit pairing
  pLog.startTimestamp("Killing soundscape");
  await EunosMedia.SetSoundscape({});
  pLog.endTimestamp("Soundscape killed"); // Uses default LIFO matching

  pLog.startTimestamp("Killing countdown & portrait timeline", undefined, "kill-countdown-portrait"); // Labeled for explicit pairing
  pLog.startTimestamp("Killing countdown");
  await this.killCountdown(true, true);
  pLog.endTimestamp("Countdown killed");

  pLog.endTimestamp("Sound & clock killed.", undefined, "kill-sound-clock"); // Matches by label (without labels, would incorrectly match "Killing countdown & portrait timeline"; technically optional here since labeled starts only accept labeled ends, but improves clarity)

  pLog.startTimestamp("Building PC portrait timelines");
  await this.buildPCPortraitTimelines();
  pLog.endTimestamp("PC portrait timelines built");

  pLog.endTimestamp("Countdown & portrait timelines killed.", undefined, "kill-countdown-portrait"); // Label required since startTimestamp was labeled

  pLog.funcOut(); // Complete function tracking
}
```

## Running Flow Analysis

### 1. Trigger the Operation

After entering in the various in- and out-points for the above tracking, perform the action that triggers the first call of `pLog.startFlow` in your flow analysis:

**Example**: The flow analysis in the above example is triggered by calling the `changePhase` socket function. To trigger this, set the `"gamePhase"` setting to `GamePhase.SessionRunning`.

### 2. Monitor Console Output

The flow analysis will display:

1. **Flow Start Message**: `⏱️ FLOW START: Phase Transition: SessionStarting → SessionRunning`
2. **Function Entry/Exit**: Each `funcIn`/`funcOut` with timing information
3. **Flow End Message**: `⏱️ FLOW END: Phase Transition: SessionStarting → SessionRunning - Total time: X.XXXX s`
4. **Function Timing Summary**: A table showing all function calls with start times, end times, and durations

The information will also be written to a log file. A new log file is created automatically for each flow analysis.

### 3. Analyze Results

Look for:
- **Bottlenecks**: Functions with unusually long durations
- **Unexpected calls**: Functions being called when they shouldn't be
- **Missing calls**: Expected functions that aren't being tracked
- **Timing relationships**: How nested calls relate to their parents

### 7. Automatic Validation and File Logging

The PLog system automatically validates all timing relationships when an analysis completes and logs the results to file. You'll see validation messages in the console:

- ✅ **"Analysis validation passed"** - All timing relationships are correct
- ⚠️ **"Analysis validation failed"** - Issues detected (but still logged for debugging)

The complete analysis (including validation results) is automatically saved to a timestamped JSON file in the `plog-logs` directory.

If you need to manually check the most recent analysis, you can run:

```javascript
pLog.analyzeTimestamps(true) // Reads validation from the most recent log file
```

## Advanced Features

### Silencing kLog During Flows

To reduce console noise during performance testing:

```typescript
pLog.startFlow("Database Operations", true); // Second parameter silences kLog
// All kLog calls (except kLog.error) are now silenced
pLog.endFlow("Database Operations"); // kLog is un-silenced
```

### Labeled Timestamps for Complex Flows

For operations that don't follow strict nesting:

```typescript
pLog.startTimestamp("User registration flow", undefined, "registration");
pLog.startTimestamp("Email sending flow", undefined, "email");

// Later, in different functions...
pLog.endTimestamp("Registration completed", undefined, "registration");
pLog.endTimestamp("Email sent", undefined, "email");
```

### Method Usage Summary

**`funcIn` / `funcOut`**: Function-level tracking
- Use once per function (typically without parameters)
- Auto-detects function names from stack trace
- Tracks entire function execution time
- **Always uses LIFO (Last-In-First-Out) matching**
- Custom messages are for display only - don't affect pairing

**`startTimestamp` / `endTimestamp`**: Operation-level tracking
- Use for sub-operations within functions
- Requires explicit descriptions
- Can span across multiple functions
- Supports both LIFO and labeled matching

### Cross-Function Timing

Track operations that span multiple functions using `startTimestamp`/`endTimestamp`:

```typescript
// In function A
function startUserRegistration() {
  pLog.funcIn(); // Track this function
  pLog.startTimestamp("User registration flow"); // Track cross-function operation
  validateInput();
  pLog.funcOut(); // End function tracking
}

// In function B (called later)
function createUserAccount() {
  pLog.funcIn(); // Track this function
  someProcessing();
  pLog.funcOut(); // End function tracking
}

// In function C (called even later)
function completeRegistration() {
  pLog.funcIn(); // Track this function
  finalizeUser();
  pLog.endTimestamp("User registration flow completed"); // End cross-function operation
  pLog.funcOut(); // End function tracking
}
```

## Understanding Method Pairing

### `funcIn` / `funcOut` Pairing Behavior

**Important**: `funcIn` and `funcOut` always use LIFO (Last-In-First-Out) matching, regardless of any custom messages you provide.

```typescript
function exampleFunction() {
  pLog.funcIn("Starting data processing"); // Custom message for display

  // Some nested calls...
  pLog.funcIn("Validating input");         // Custom message for display
  pLog.funcOut("Input validation done");   // Matches with "Validating input" (LIFO)

  pLog.funcOut("Data processing complete"); // Matches with "Starting data processing" (LIFO)
}
```

**Key Points**:
- Custom messages are purely informational and displayed in the console
- The actual pairing is always based on call order (LIFO), not message content
- Function name auto-detection happens regardless of custom messages
- Name mismatch warnings are informational - pairing still works correctly

### `startTimestamp` / `endTimestamp` Pairing Behavior

These methods support both LIFO and explicit label-based matching:

```typescript
// LIFO matching (like funcIn/funcOut)
pLog.startTimestamp("Operation A");
pLog.startTimestamp("Operation B");
pLog.endTimestamp("B completed"); // Matches with "Operation B" (LIFO)
pLog.endTimestamp("A completed"); // Matches with "Operation A" (LIFO)

// Label-based matching (for complex scenarios)
pLog.startTimestamp("Operation X", undefined, "labelX");
pLog.startTimestamp("Operation Y", undefined, "labelY");
pLog.endTimestamp("X done", undefined, "labelX"); // Explicit match with labelX
pLog.endTimestamp("Y done", undefined, "labelY"); // Explicit match with labelY
```

## Troubleshooting

### Common Issues

1. **"funcOut called but no matching funcIn found"**
   - Ensure every `funcOut` has a corresponding `funcIn`
   - Check for early returns that skip `funcOut` calls

2. **Function name mismatch warnings**
   - These are informational warnings only - the pairing still works correctly
   - `funcIn`/`funcOut` always use LIFO (Last-In-First-Out) matching regardless of messages
   - Custom messages are for display purposes only and don't affect pairing logic
   - Warnings are normal for recursive functions or complex call patterns

3. **Flow timing seems wrong**
   - Check console for automatic validation warnings during flow completion
   - Run `pLog.analyzeTimestamps(true)` to check the most recent analysis validation
   - Check for missing or extra `funcIn`/`funcOut` calls

4. **Tests failing**
   - Clear history before testing: `pLog.clearHistory()`
   - Check for interfering flows: ensure all flows are properly ended

### Best Practices

1. **Always end flows**: Use try/catch to ensure `endFlow` is called
2. **Use descriptive names**: Make flow and function names meaningful
3. **Don't over-instrument**: Focus on key operations to avoid noise
4. **Test your instrumentation**: Run the test suite after adding new tracking
5. **Clean up**: Remove or comment out detailed tracking after debugging

### Performance Considerations

- PLog has minimal overhead, but avoid instrumenting high-frequency functions
- Use `silenceKLog` during performance testing to reduce console overhead
- Clear history periodically: `pLog.clearHistory()` to prevent memory buildup
