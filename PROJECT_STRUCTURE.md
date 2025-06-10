# / (Project Root)

The project root contains configuration, documentation, and entry-point files for the module, as well as links and workspace settings.

- `module.json` — Foundry VTT module manifest.
- `tsconfig.json` — TypeScript configuration.
- `vite.config.ts` — Vite build tool configuration.

# /src/macros/

Macros for automating Foundry VTT gameplay, such as custom roll dialogs, quick actions, or scene management. These are typically JavaScript files that can be imported or run directly in Foundry's macro bar.

# /src/module/

The main TypeScript source code for the module. Contains all logic, data models, hooks, UI overrides, and application classes. This is the heart of the module's custom functionality.

# /src/module/@types

TypeScript type definitions for the module, including custom types and augmentations for Foundry VTT and third-party libraries.

# /src/module/@types/k4lt

Type definitions and module augmentation for the official Kult system (`k4lt`), allowing for type-safe interaction and extension of the base system's data structures and APIs.

# /src/module/@types/socketlib

Type definitions and augmentations for the SocketLib library, supporting advanced socket communication in Foundry VTT.

# /src/module/@types/k4lt/sheets

TypeScript definitions for the Kult system's custom sheet classes, enabling type-safe extension and override of PC, NPC, and item sheets.

# /src/module/@types/k4lt/system

TypeScript definitions for the Kult system's core data structures and system-level APIs.

# /src/module/apps

Custom application classes for UI overlays, dialogs, alerts, carousels, and other interactive elements. These extend Foundry's Application framework and provide enhanced user experiences.

# /src/module/data-model

TypeScript classes and interfaces representing the data structure for actors, items, and other entities. These models define how data is stored, validated, and manipulated within the module.

# /src/module/data-model/fields

TypeScript field definitions and utility functions for actor and item data models, supporting custom data validation and structure.

# /src/module/documents

Overrides and extensions for Foundry VTT's core Document classes (such as Actor and Item), enabling custom behaviors, hooks, and data management.

# /src/module/documents/sheets

Overrides and extensions for Foundry VTT's sheet classes, providing custom UI and logic for PC, NPC, and item sheets.

# /src/module/scripts

Utility functions, constants, enums, helpers, and other supporting scripts used throughout the module. This includes animation helpers, logger utilities, and popover/tooltip logic.

# /src/styles/

SCSS stylesheets for custom UI theming, layout, and visual enhancements. These styles are compiled and injected into Foundry's UI to provide a unique look and feel.

# /static/assets/

Images, icons, and other media assets used in the UI, such as backgrounds, overlays, and tokens.

# /static/assets/backgrounds

Background images and overlays for scenes, UI, and visual effects.

# /static/assets/chat

All chat-related visual assets, including dice, attribute flares, roll values, dropcaps, and chat-specific icons.

# /static/assets/chat/attribute_flares

Images representing attribute-specific visual flares for chat cards and UI highlights.

# /static/assets/chat/attribute_vals

Images for displaying attribute values in chat, including active, passive, and reactive states.

# /static/assets/chat/dice

Dice face images and dice animation assets for chat-based rolls.

# /static/assets/chat/dropcaps

Dropcap images for stylized chat messages and narrative text.

# /static/assets/chat/gears

Gear and cog SVGs for chat UI embellishments.

# /static/assets/chat/rollvals

Images for displaying roll values in chat cards.

# /static/assets/fonts

Custom and third-party font files used for UI theming and in-game text.

# /static/assets/icons

Icon sets for UI controls, bullets, and other interface elements.

# /static/assets/icons/bullets

SVG bullet icons for lists and UI highlights.

# /static/assets/images

All image assets for backgrounds, NPCs, PCs, stage overlays, and more.

# /static/assets/images/loading-screen

Images for the Foundry loading screen and related overlays.

# /static/assets/images/locations

Location art and scene backgrounds for in-game use.

# /static/assets/images/locations/east-tunnel

Scene images for the 'East Tunnel' location, used in narrative or map overlays.

# /static/assets/images/npcs

Portraits and images for NPCs, including variants and subfolders for special groups.

# /static/assets/images/npcs/romans-animals

Portraits of animal NPCs belonging to the 'Romans' group.

# /static/assets/images/pcs

Portraits and images for player characters, including stress-state variants.

# /static/assets/images/stage

Stage overlays, props, and UI elements for the main stage display.

# /static/assets/images/stage/end-phase

Images for the 'end phase' of the stage, including overlays and props.

# /static/assets/images/stage/npc-frame

Frame overlays and props for displaying NPCs on the stage.

# /static/assets/images/stage/pc-frame

Frame overlays and props for displaying PCs on the stage.

# /static/assets/images/stage/safety-buttons

Icons for safety tools and session control buttons.

# /static/assets/images/stage/spotlights

Spotlight overlays for stage lighting effects.

# /static/assets/sounds

All sound assets, including alerts, ambient, effects, music, and weather.

# /static/assets/sounds/alerts

Sound effects for alerts and notifications.

# /static/assets/sounds/ambient

Ambient soundscapes for scenes and locations.

# /static/assets/sounds/effects

Sound effects for dramatic moments, actions, and events.

# /static/assets/sounds/effects/c01

Session-specific sound effects for campaign session 1.

# /static/assets/sounds/effects/c02

Session-specific sound effects for campaign session 2.

# /static/assets/sounds/effects/c04

Session-specific sound effects for campaign session 4.

# /static/assets/sounds/effects/c05

Session-specific sound effects for campaign session 5.

# /static/assets/sounds/effects/c06

Session-specific sound effects for campaign session 6.

# /static/assets/sounds/music

Music tracks for pre-session and in-game use.

# /static/assets/sounds/weather

Weather sound effects for environmental immersion.

# /static/assets/video

Video assets for overlays, cutscenes, and animated effects.

# /static/packs/advantages

Compendium data for advantages.

# /static/packs/custom-items

Compendium data for custom items.

# /static/packs/dark-secrets

Compendium data for dark secrets.

# /static/packs/disadvantages

Compendium data for disadvantages.

# /static/packs/generic-npcs

Compendium data for generic NPCs.

# /static/packs/moves

Compendium data for moves.

# /static/scripts/utils

Utility JavaScript files for use by other scripts or libraries.

# /static/templates/alerts

Handlebars templates for alert popups and notifications.

# /static/templates/apps

Templates for custom application UIs, such as overlays and carousels.

# /static/templates/apps/chat

Templates for chat card UIs and roll results.

# /static/templates/apps/eunos-carousel

Templates for the Eunos Carousel application.

# /static/templates/apps/eunos-overlay

Templates for the Eunos Overlay application, including overlays, masks, and stage elements.

# /static/templates/apps/eunos-overlay/partials

Partial templates for reusable overlay UI components.

# /static/templates/dialog

Templates for custom dialog windows and modals.

# /static/templates/sheets

Templates for actor and item sheets.

# /static/templates/sheets/partials

Partial templates for reusable sheet UI components.

# /static/templates/sidebar

Templates for custom sidebar UI elements, such as chat messages and roll results.
