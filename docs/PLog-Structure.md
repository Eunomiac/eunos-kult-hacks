`PLog` is a new debugging, performance-testing and logging class that must have the following features:

## File Structure

- is defined in and exported from a new file at `src/module/scripts/PLog.ts`

## Initialization & Global Scope

- a static Initialize method that, when called, assigns an instance of the class to the global scope as `pLog` (i.e. the class is named `PLog`, but this global single instance of the class should be defined as `pLog`)
- appropriate type definitions in `src/module/@types/general-types.d.ts`.

## Console Logging Features
_(See `src/module/scripts/logger.ts` for examples of many of these features as they were implemented in the current `kLog` global.)_

- a distinct visual style for the console messages, to distinguish them from other `console.log/warn/error` calls, as well as from `kLog` messages
- each message should be accompanied by a filtered and formatted stack trace, displayed as an unfoldable part of the message via use of `console.groupCollapsed` and `console.groupEnd`
  - this stacktrace should filter out any lines that are not relevant to the location of the message in the codebase, such as references to the `pLog` methods themselves
  - stacktrace lines that explicitly refer to classes contained in `eunos-kult-hacks` should be displayed in a different color from those that refer to external libraries (like Foundry or GSAP)
  - ambiguous stacktrace messages representing intermediary steps within asynchronous operations or other potentially relevant but non-specific lines should be dimmed in color
- the first parameter of each logging method should be the primary display message
- the second parameter should accept any type of data, and display it in the standard way (e.g. simply posting the object and allowing the browser to format it as it normally would)
- further parameters can be used to define specific behavior for any methods that require it

## White & Blacklists Contained in Settings
_(See `src/module/scripts/settings.ts` and `src/module/@types/fvtt-types-config.d.ts` for examples of how to register new settings and how to configure the FVTT type definitions for them.)_

- a GM-only setting for a comma-delimited whitelist of text strings that will be matched to messages via RegExp analysis of the primary message string
- another GM-only setting for a comma-delimited blacklist of text strings that will be matched to messages via RegExp analysis of the primary message string
- the whitelist and blacklist should interact as follows:
  - whitelist empty, blacklist empty: all messages are logged
  - whitelist empty, blacklist populated: all messages not on the blacklist are logged
  - whitelist populated, blacklist empty: only messages on the whitelist are logged
  - whitelist populated, blacklist populated: the whitelist is checked first; only if the message matches a term in the whitelist is it displayed, UNLESS it also matches a term in the blacklist, in which case it is not displayed

## Specific Methods of `PLog`
_(Unless explicitly stated otherwise, the first parameter of the following methods is the primary display message, and the second parameter is (optional) data to be displayed, as described above.)_

- `log`, `warn`, `info`, `debug`, `error`, `display`, `socketCall`, `socketResponse`, `socketReceived` --- these should post messages to the console as described above, but each should have a unique visual style to distinguish them
- `breakIf` --- requires a boolean value for its third parameter. If this boolean is `false`, the method should do nothing. If it is `true`, the method should display its message and data as other functions do, but then break execution (via `debugger`) (you will need to exclude ESLint from complaining about the use of `debugger` in this method)
- `funcIn`, `funcOut` --- these methods will be called at the start and end of a function, respectively.
  - `funcIn` should record the name of the function and the time at which it was called. If its third parameter is `true`, then it should also display a message to the console indicating that the function has been called.
  - `funcOut` requires no additional parameters, but may accept a message string as normal. Unlike with other logging methods, this message string is never displayed: It exists solely to be checked against the whitelist and/or blacklist (if no message is provided, assume these checks should pass)
      - rather than display the message (if provided), this method should print the name of the function and the elapsed time since `funcIn` was called (see note on how these times should be displayed, below)
  - importantly, these methods must be able to support nested calls: there must be a way to ensure that each call of `funcOut` is associated with the correct call of `funcIn`, even if there have been other `funcIn`/`funcOut` pairs in between.
- `startFlow`, `endFlow` --- these methods mark the beginning and end of a flow of execution, and change the way `funcIn` and `funcOut` display time values.
  - both methods should display the message provided in the first parameter, styled clearly to be easily highlighted and to make the display of the full flow of execution clearly bookended in the console
  - inside a "flow" (i.e. after `startFlow` has been called, but before `endFlow` has been called), `funcIn` and `funcOut` should change their behavior as follows:
    - in addition to displaying the time elapsed since its related `funcIn` was called (i.e. the duration of the function), `funcOut` should also display the time that has elapsed since `startFlow` was called
    - `funcIn` should _always_ log a message to the console (irrespective of the value of its third parameter), displaying the time that has elapsed since `startFlow` was called
    - if there are nested flows (i.e. `startFlow` has been called multiple times without an `endFlow` having been called), then `funcIn` and `funcOut` should only display the time elapsed since the most recent `startFlow` was called
  - `endFlow` should display the total time elapsed since `startFlow` was called, as well as a table displaying the following information for each `funcIn`/`funcOut` pair called within the flow:
    - the name of the function
    - the time at which `funcIn` was called
    - the time at which `funcOut` was called
    - the duration of the function (i.e. the time elapsed between `funcIn` and `funcOut`)


  ### Displaying Time

  - times should be displayed in either seconds or milliseconds, depending on the time value itself
    - if the elapsed time is equal to or greater than 1/10 of a second, it should be displayed in seconds, rounded to 4 decimal places
    - if the elapsed time is less than 1/10 of a second, then it should be displayed in milliseconds
      - millisecond displays should generally be rounded to the nearest integer, _unless_ this would result in two or fewer significant digits. (E.g. "123.12 ms" should be displayed as "123 ms", "123456.78 ms" should be displayed as "123457 ms",both following the general rule to round to the nearest integer. However, a value of "1.23456 ms" should be displayed as "1.23 ms", and "0.000012345 ms" should be displayed as "0.0000123 ms" -- following the "at least three significant digits" rule.)

### Testing Strategy

Because this project is a module for Foundry VTT, it is not possible to write unit tests for it in the traditional sense. Instead, you should create a single method named `test` (or `Test`, if it is `static`) that
  - I will run from the console from within an instance of Foundry
  - includes whatever tests you require to ensure the class is working correctly, and reports the results to the console in a way that I can report back to you.
