# EunosOverlay Structure

The `EunosOverlay` is an `ApplicationV2` subclass that manages multiple sub-overlays, each handling different visual components with their own state transitions and rendering logic. This document outlines the structure of these components and their relationships.

## Overview

The main overlay (`$("#EUNOS_OVERLAY")`) contains several distinct sub-overlays, each responsible for rendering and managing different aspects of the game interface. These components work together to create dynamic visual effects, state transitions, and interactive elements.

## Sub-Overlay Components

### 1. Stage (`$("#STAGE")`, `$("#STAGE-3D")`)

The stage provides the primary background and environment for the game.

**Renderable Components:**
- Background scenes and environments
- Video playback area for intro videos
- Black bars for cinematic effects
- Session title animations

### 2. PCs (`$("#PCS")`, `$("#PCS-GM")`)

Manages player character portraits and related visual elements.

**Renderable Components:**
- PC portrait containers with multiple states (hidden, dimmed, base, spotlit)
- Dramatic hook displays (candles with text)
- Stability background indicators
- Swaying/movement animations
- GM-specific controls for PC management (in the PCS-GM view)

### 3. NPCs (`$("#NPCS")`, `$("#NPCS-GM")`)

Handles non-player character visuals and interactions.

**Renderable Components:**
- NPC portrait elements with state transitions
- NPC name displays with visibility states (hidden, shrouded, base)
- Goggles effects overlay for NPCs
- Drag and drop positioning (GM view)

### 4. Location (`$("#LOCATION")`)

Displays and manages location information and visuals.

**Renderable Components:**
- Location name display
- Location image/background
- Location description text
- Indoor/outdoor state transitions with visual effects

### 5. Countdown/Effects (`$("#COUNTDOWN-CONTAINER")`)

Provides time-based and special visual effects.

**Renderable Components:**
- Countdown timer display
- Aurora effects (glitch animations)
- Red lightning visual effects
- Loading screen item rotation

### 6. UI Controls

Various interface controls for game management.

**Renderable Components:**
- Safety buttons (`$("#SAFETY-BUTTONS")`)
- Location plotting controls (`$("#LOCATION-PLOTTING-PANEL")`)
- Video status indicators (`$("#VIDEO-STATUS-PANEL")`)
- Changes log for tracking modifications (`$("#CHANGES-LOG")`)
- Alert messages (`$("#ALERTS")`)

### 7. Masks and Overlay Layers

Layers that control visibility and special effects across other components.

**Renderable Components:**
- Canvas mask (`$("#CANVAS-MASK")`)
- Canvas bars (`$("#CANVAS-BARS")`)
- Mid-z-index mask (`$("#MID-Z-INDEX-MASK")`)
- Top-z-index mask (`$("#TOP-Z-INDEX-MASK")`)
- Max-z-index bars (`$("#MAX-Z-INDEX-BARS")`)
- Overall overlay container (`$("#OVERLAY")`)

## Animation Considerations

When animating elements within these sub-overlays:

1. All properties that will be animated should be managed through GSAP, not CSS
2. Avoid setting initial values in CSS for properties that will be animated
3. Use `visibility: hidden` in CSS for initially hidden elements, then reveal with GSAP's `autoAlpha`
4. Keep static structural properties (non-animated) in CSS
5. Use `gsap.set()` for initial states of animated properties

## Interaction Between Components

The sub-overlays communicate and coordinate through:
- GSAP timelines for synchronized animations
- Socket communications for multiplayer synchronization
- State tracking through internal data structures
- Event listeners for user interactions

This architecture allows for complex visual storytelling while maintaining clean separation between different UI components.
