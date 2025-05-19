# Eunos Kult Hacks Project Structure Guide

## Overview

This project is a Foundry VTT module for the KULT system, built with TypeScript, SCSS, and Handlebars templates.

## Directory Structure

### Source Code (`src/`)

- `src/module/` - Main TypeScript code
  - `src/module/@types/` - TypeScript types
  - `src/module/apps/` - Application classes with `Eunos` prefix (e.g., `EunosOverlay.ts`, `EunosCarousel.ts`)
  - `src/module/data-model/` - Data model definitions for the various Foundry VTT document types, where the contents of the `system` property for each document type is defined.
  - `src/module/documents/` - Subclasses of the primary Foundry VTT document types (e.g. `EunosActor` and `EunosItem`) that are used to extend the functionality of the primary document types.
    - `src/module/documents/sheets/` - Subclasses of the primary Foundry VTT sheet types (e.g. `EunosActorSheet` and `EunosItemSheet`) that are used to extend the functionality of the primary sheet types.
  - `src/module/scripts/` - Utility scripts and libraries
  - `src/module/eunos-kult-hacks.ts` - Main entry point

- `src/styles/` - SCSS stylesheets
  - `src/styles/apps/` - Styles relating to application classes, including the `EunosOverlay` class.
  - `src/styles/globals/` - Global styles, variables, and mixins
  - `src/styles/interface/` - Styles that modify the Foundry VTT interface, including the main interface, sidebar, and chat windows
  - `src/styles/sheets/` - Styles that modify the Foundry VTT sheet UI, including the actor and item sheets
  - `src/styles/styles.scss` - Main stylesheet that imports all other stylesheets

### Static Assets (`static/`)

- `static/assets/` - All asset files, including images, fonts, audio, and video files.
- `static/packs/` - Foundry packages built into the module, containing pre-defined `EunosItem`s made available to the players.
- `static/scripts/` - Third-party libraries and scripts written in JavaScript, including several GSAP plugins.
- `static/templates/` - Handlebars templates used by the above application classes, sheets, and other HTML content used by the module

## File Naming Conventions

- Application classes: Prefix with `Eunos` (e.g., `EunosOverlay`, `EunosCarousel`)
  - ✅ Correct: `EunosOverlay.ts`, `EunosCarousel.ts`, `EunosChatMessage.ts`
  - ❌ Incorrect: `StoneCircleCarousel.ts`, `Overlay.ts`, `ChatMessage.ts`

- Template paths: Use module-relative paths (e.g., `modules/eunos-kult-hacks/templates/...`)
  - ✅ Correct: `modules/eunos-kult-hacks/templates/apps/eunos-overlay/stage.hbs`
  - ❌ Incorrect: `static/templates/apps/eunos-overlay/stage.hbs` or `/templates/apps/eunos-overlay/stage.hbs`

- SCSS files: Use kebab-case, prefixed with an underscore (e.g., `_stone-circle.scss`)
  - ✅ Correct: `_eunos-overlay.scss`, `_countdown.scss`
  - ❌ Incorrect: `eunosOverlay.scss`, `countdown.scss` (missing underscore)

- Template files: Use kebab-case with `.hbs` extension (e.g., `stone-circle-carousel.hbs`)
  - ✅ Correct: `stage-locations.hbs`, `loading-screen-item.hbs`
  - ❌ Incorrect: `stageLocations.hbs`, `LoadingScreenItem.hbs`

## Technology Stack

- **TypeScript**: For all application code
- **SCSS**: For styling
- **Handlebars**: For HTML templates
- **GSAP**: For animations (note: the `gsap` variable is in the global scope, so it can be used without importing it)
- **Vite**: For building and bundling

## Build System

The project uses Vite for building, with the output files going to the appropriate directories as specified in the `vite.config.ts` file.

### Path Resolution and Build Process

The build process merges and reorganizes the project structure:

1. **Development Structure vs. Built Structure**:
   - During development, files are organized in `src/` and `static/` directories
   - After the build process, these directories are merged and flattened to the root of the module

2. **Path Transformation**:
   - `src/module/*` → `/module/*`
   - `static/templates/*` → `/templates/*`
   - `static/assets/*` → `/assets/*`

3. **Path References in Code**:
   - All paths in code must reference where files will be AFTER the build process
   - Example: A file at `static/assets/backgrounds/gold-background.webp` must be referenced as `modules/eunos-kult-hacks/assets/backgrounds/gold-background.webp`

4. **Foundry VTT Path Resolution**:
   - Foundry resolves paths from the root of the user's data folder, not the module folder
   - All asset paths must be prefixed with `modules/eunos-kult-hacks/`
   - Example: `modules/eunos-kult-hacks/templates/apps/eunos-overlay.hbs`

## Code Style Guidelines

### Coding Conventions

- Never use the `any` type, explicitly or implicitly.
  - ✅ Correct: `function checkVal(val: unknown): boolean { ... }`
  - ❌ Incorrect: `function checkVal(val: any): boolean { ... }`

- Never cast to `unknown` to force a type
  - ❌ Incorrect: `const num: number = val as unknown as number`

- Avoid the null assertion operator (`!`) unless it is absolutely certain that the value is not null.
  - ✅ Correct: `const num: number = val ?? 0;`
  - ❌ Incorrect: `const num: number = val!;`

- Prefix async function calls with `void` when they do not need to be awaited.
  - ✅ Correct: `void this.doSomethingAsync();`
  - ❌ Incorrect: `this.doSomethingAsync();`

- Use the `override` modifier when overriding a method from a base class.
  - ✅ Correct: `override async initialize(): Promise<void> { ... }`
  - ❌ Incorrect: `async initialize(): Promise<void> { ... }`

- Omit explicitly including default type parameters.
  - ✅ Correct: `get element$(): JQuery { ... }`
  - ❌ Incorrect: `get element$(): JQuery<HTMLElement> { ... }`

### Naming Conventions

- Distinguish JQuery elements from other DOM elements by suffixing the variable name with `$`.
  - ✅ Correct: `const element = event.currentTarget; const element$ = $(element);`
  - ❌ Incorrect: `const elem = $(event.currentTarget); const element = $(elem);`

### DOM Manipulation

- In general, use JQuery for DOM manipulation, unless another method would be more performant or otherwise preferable.
- To facilitate JQuery usage, define an `element$` accessor property that returns `$(this.element)`.
  - ✅ Ideal: `this.element$.find(".stone-carousel")`
  - ⚠️ Generally Avoid: `this.element.querySelector(".stone-carousel")`

### Commenting & Organization

- Include JSDoc headers for all functions, classes, and properties.
  - Use the `@param` tag to describe the parameters of a function.
  - Use the `@returns` tag to describe the return value of a function.
  - Use the `@throws` tag to describe the errors that a function can throw.
  - Use the `@example` tag to provide an example of how to use a function.
  - Use the `@see` tag to provide a link to another function.
  - Use the `@link` tag to provide a link to another function.
- Make extensive use of inline comments to explain code, especially complex or non-obvious code.
- Use `// #region <NAME> ~` and `// #endregion <NAME>` to group related code. _(The tilde suffix is used by one of my extensions to indicate that the region should be folded by default when the file is opened.)_
  - When nesting regions within each other, topmost regions should be in ALL CAPS to distinguish them from sub-regions.

## Common Code Patterns

### GSAP Animation Patterns

```typescript
// Timeline creation pattern
const tl = gsap.timeline({ paused: true });
tl.addLabel("start")
  .to(element, {
    opacity: 0,
    duration: 0.5,
    ease: "power3.out"
  })
  .addLabel("middle")
  .to(element, {
    opacity: 1,
    duration: 0.5,
    ease: "power3.in"
  })
  .addLabel("end");

// Play timeline
tl.play();

// Building and storing timelines on DOM elements
const myTimeline = this.buildSomeTimeline();
$(element).data("my-timeline", myTimeline);

// Retrieving stored timelines
const storedTimeline = $(element).data("my-timeline") as gsap.core.Timeline;
if (storedTimeline) {
  storedTimeline.play();
}
```

### Template Rendering Pattern

```typescript
// In an ApplicationV2 subclass
static override PARTS = {
  myPart: {
    template: "modules/eunos-kult-hacks/templates/apps/my-template.hbs",
    classes: ["optional-class"], // Optional CSS classes
    position: {                  // Optional positioning
      top: 10,
      right: 10,
      width: "auto",
      height: "auto",
    },
  }
};

// Rendering a specific part
void this.render({ parts: ["myPart"] });
```

### Event Handling Pattern

```typescript
// In an ApplicationV2 subclass
static override EVENTS = {
  ...super.EVENTS,
  click: {
    ".my-button": (event: PointerEvent, target: HTMLElement) => {
      // Handle click on .my-button elements
    }
  }
};
```

## Error Handling and Logging

### Logging Pattern

Use the global `kLog` object for logging:

```typescript
// Simple logging
kLog.log("Some message", { data: value });

// Error logging
kLog.error("Error occurred", error);

// Opening a report (for grouped logs)
kLog.openReport("reportName", "Report Title");
kLog.report("reportName", "Log message in report");
kLog.closeReport("reportName");
```

### Error Handling Pattern

```typescript
try {
  // Attempt some operation
} catch (error) {
  kLog.error("Failed to perform operation:", error);
  // Optionally notify the user
  getNotifier().error("Operation failed. See console for details.");
  // Rethrow if needed
  throw error;
}
```

## Global Variables

- Refer to `src/module/@types/general-types.d.ts` for a list of variables, functions, types, and classes that are available in the global scope.

### Commonly Used Global Functions

- **Game State Access**:
  - `getGame()`: Returns the current Game instance
  - `getUser(userId?: string)`: Returns the current User instance or, if a userId is provided, the User instance for that userId
  - `getActor()`: Returns the PC actor owned by the current user
  - `getActors()`: Returns all actors in the game
  - `getItems()`: Returns all items in the game

- **Settings Access**:
  - `getSetting(setting: string)`: Returns the value of the specified setting
  - `setSetting(setting: string, value: any)`: Sets the value of the specified setting

- **DOM Manipulation**:
  - `addClassToDOM(className)`: Adds a class to the body element
  - `removeClassFromDOM(className)`: Removes a class from the body element

- **Logging and Notifications**:
  - `kLog.display()`, `kLog.log()`, `kLog.error()`: Logging functions
  - `getNotifier()`: Returns the Notifications instance

### GSAP Animation

- GSAP has been loaded globally via this module's `module.json` file, so the `gsap` variable is available in the global scope.
  - Several GSAP plugins have also been loaded globally: `CustomEase`, `EasePack`, and `SplitText`.
  - Use GSAP for all animations rather than CSS transitions/animations for better performance and control.

## Important Notes

- When creating new application classes, place them in `src/module/apps/` with the `Eunos` prefix
- When adding new features, register them in the main `src/module/eunos-kult-hacks.ts` file
- Template paths in application classes should use the format `modules/eunos-kult-hacks/templates/...`