# PLog Testing and Flow Analysis Guide

This guide covers how to use the PLog performance logging system for testing, debugging, and flow-of-execution analysis.

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

Wrap the entire operation in a flow:

```typescript
changePhase: (data: { prevPhase: GamePhase; newPhase: GamePhase }) => {
  // Start the flow with descriptive name
  pLog.startFlow(`Phase Transition: ${data.prevPhase} → ${data.newPhase}`);
  pLog.funcIn("Socket changePhase handler", data);

  void EunosOverlay.instance
    .cleanupPhase(data.prevPhase)
    .then(() => {
      return EunosOverlay.instance.initializePhase(data.newPhase);
    })
    .then(() => {
      pLog.funcOut("Phase transition completed successfully");
      pLog.endFlow(); // End the flow on success
    })
    .catch((error: unknown) => {
      kLog.error("Error initializing phase:", error);
      pLog.error("Phase transition failed", error);
      pLog.funcOut("Phase transition failed with error");
      pLog.endFlow(); // End the flow on error too
    });
},
```

### 3. Add Function-Level Tracking

Add `funcIn`/`funcOut` calls to key methods (typically without parameters for auto-detection):

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

**Note**: You can optionally provide custom messages if needed:
```typescript
pLog.funcIn("Custom description", { gamePhase });
pLog.funcOut("Custom completion message");
```

### 4. Add Sub-Operation Tracking

For detailed analysis of operations within functions, use `startTimestamp`/`endTimestamp`:

```typescript
private async initialize_SessionRunning(): Promise<void> {
  pLog.funcIn(); // Track the entire function

  pLog.startTimestamp("Killing soundscape");
  await EunosMedia.SetSoundscape({});
  pLog.endTimestamp("Soundscape killed");

  pLog.startTimestamp("Killing countdown");
  await this.killCountdown(true, true);
  pLog.endTimestamp("Countdown killed");

  pLog.startTimestamp("Building PC portrait timelines");
  await this.buildPCPortraitTimelines();
  pLog.endTimestamp("PC portrait timelines built");

  pLog.funcOut(); // Track the entire function
}
```

## Running Flow Analysis

### 1. Trigger the Operation

Perform the action that triggers your flow analysis:

**Example**: Change game phase from SessionStarting to SessionRunning
- Use the GM interface to change the game phase
- Or manually trigger: `setSetting("gamePhase", GamePhase.SessionRunning)`

### 2. Monitor Console Output

The flow analysis will display:

1. **Flow Start Message**: `⏱️ FLOW START: Phase Transition: SessionStarting → SessionRunning`
2. **Function Entry/Exit**: Each `funcIn`/`funcOut` with timing information
3. **Flow End Message**: `⏱️ FLOW END: Phase Transition: SessionStarting → SessionRunning - Total time: X.XXXX s`
4. **Function Timing Summary**: A table showing all function calls with start times, end times, and durations

### 3. Analyze Results

Look for:
- **Bottlenecks**: Functions with unusually long durations
- **Unexpected calls**: Functions being called when they shouldn't be
- **Missing calls**: Expected functions that aren't being tracked
- **Timing relationships**: How nested calls relate to their parents

### 4. Validate with Timestamp Analysis

After the flow completes, run timestamp analysis:

```javascript
pLog.analyzeTimestamps()
```

This will validate that all `funcIn`/`funcOut` calls were properly matched and report any timing inconsistencies.

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
   - Run `pLog.analyzeTimestamps()` to validate call matching
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
