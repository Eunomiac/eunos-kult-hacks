# Euno's Kult Hacks Code Analysis Tools

This directory contains a set of tools to help analyze and understand the relationships between different parts of the codebase. These tools are designed to help you quickly locate related code across TypeScript files, Handlebars templates, and SCSS styles.

## Available Tools

### 1. Function Finder (`function-finder.js`)

Locates all references to a specific function across the codebase.

**Usage:**
```
node function-finder.js functionName
```

**Example:**
```
node function-finder.js initializeCountdown
```

### 2. Component Analyzer (`component-analyzer.js`)

Analyzes relationships between components, finding TypeScript implementations, templates, and styles related to a specific component.

**Usage:**
```
node component-analyzer.js ComponentName
```

**Example:**
```
node component-analyzer.js EunosOverlay
```

### 3. Template Mapper (`template-mapper.js`)

Maps Handlebars templates to their usage in code.

**Usage:**
```
node template-mapper.js [templatePath]
```

If no template path is provided, it will map all templates.

**Example:**
```
node template-mapper.js ./static/templates/apps/eunos-overlay/countdown.hbs
```

### 4. Style Mapper (`style-mapper.js`)

Maps SCSS styles to their DOM elements in templates and JavaScript/TypeScript code.

**Usage:**
```
node style-mapper.js stylePath
```

**Example:**
```
node style-mapper.js ./src/styles/apps/overlay/_countdown.scss
```

## How These Tools Help

These tools help you:

1. **Trace Function Implementations**: Quickly find where functions are defined and used
2. **Understand Component Relationships**: See how TypeScript classes, templates, and styles work together
3. **Map Templates to Code**: Understand how templates are used in the application
4. **Connect Styles to DOM**: See which DOM elements are affected by specific styles

## Integration with Your Workflow

You can use these tools to:

1. **Explore New Features**: When working on a new feature, use the Component Analyzer to understand all the parts involved
2. **Debug Issues**: When fixing a bug, use the Function Finder to locate all related code
3. **Refactor Safely**: Before refactoring, use these tools to identify all affected areas
4. **Understand the Codebase**: Use these tools to build a mental map of how different parts of the codebase connect

## Requirements

These tools require Node.js to run. They use the built-in `fs` and `path` modules and don't have any external dependencies.
