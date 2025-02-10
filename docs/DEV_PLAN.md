# Coding Standards & Practices
## Commenting
- JSDoc headers must be present on all functions, methods, classes, modules, and other such code blocks
- For simple one-line headers, write the header on the top line of the comment block, so that it remains visible when collapsed.
- comprehensive inline comments should be included throughout the codebase to explain "why" behind the "what" and "how"

## Code Requirements
- "no-unsafe-member-access" similar rules (e.g. "no-unsafe-call") rules are active: if a value could be undefined, it is not assumed to be defined
- "strict" mode is enabled: no implicit 'any' types are allowed
- use double-quotes for strings, and always wrap the parameters of arrow functions in parentheses
- the error parameter of a catch block should be explicitly typed as 'unknown'

## Global Helper Functions
- several global helper functions exist that return certain system variables after confirming they have been initialized. For example, `game.settings` and other `game` properties could be undefined, so instead access these with the following global functions:
  - `getGame(): Game`
  - `getSettings(): Settings`
  - `getActors(): EunosActor[]`
  - `getItems(): EunosItem[]`
  - `getPacks(): CompendiumPacks`
  - `getAudioHelper(): AudioHelper`
  - `getLocalizer(): Localization`
  - `getNotifier(): Notifications`
  - `getUser(): User` -- returns the user object for the current user
  - `getActor(): EunosActor` -- returns the PC for the current user
- global helper functions `getSetting(setting: string, namespace?: string)` and `setSetting(setting: string, value: unknown, namespace?: string)` are available to access and set game settings.
- `addClassToDOM(classString: string)` and `removeClassFromDOM(classes: string | string[])` are available to add and remove classes from the main `<body>` element.

# Session Phase Control System Documentation

## Overview
This document outlines the implementation requirements for the Session Phase Control system, a comprehensive feature set for managing game sessions in the Kult VTT module.

<!-- This system manages the transition between four distinct game phases, handling everything from pre-session countdown and ambiance, through session start video playback, to end-of-session activities. The system is designed for a fixed group of five players meeting weekly on Fridays at 7:30 PM Toronto time. -->

## Game Phases
The system uses the existing `GamePhase` enum:
```typescript
enum GamePhase {
  SessionClosed = "SessionClosed",    // Between weekly sessions
  SessionStarting = "SessionStarting", // Transition from closed to running
  SessionRunning = "SessionRunning",   // Active gameplay
  SessionEnding = "SessionEnding"      // End-of-session activities
}
```

## Phase Change Workflow

### Overview
The phase change workflow is managed by `EunosOverlay`, which handles:
1. Phase state management
2. Cleanup of previous phase
3. Initialization of new phase
4. Client synchronization
5. UI updates

### Implementation Details

```typescript
interface PhaseChangeOptions {
  /** Optional data needed for the new phase (e.g. chapter info for SessionStarting) */
  data?: Record<string, unknown>;
  /** Whether to skip cleanup of previous phase */
  skipCleanup?: boolean;
  /** Whether to skip initialization of new phase */
  skipInit?: boolean;
}

class EunosOverlay {
  /**
   * Changes the game phase, managing cleanup and initialization
   * @param newPhase - The phase to change to
   * @param options - Optional configuration for the phase change
   */
  async changePhase(newPhase: GamePhase, options: PhaseChangeOptions = {}): Promise<void> {
    const currentPhase = game.settings.get("eunos-kult-hacks", "gamePhase");

    // 1. Run cleanup for current phase if needed
    if (!options.skipCleanup) {
      await this.cleanupPhase(currentPhase);
    }

    // 2. Update phase in settings
    await game.settings.set("eunos-kult-hacks", "gamePhase", newPhase);

    // 3. Sync UI state across all clients
    EunosSocket.executeForEveryone("syncPhase", newPhase);

    // 4. Initialize new phase if needed
    if (!options.skipInit) {
      await this.initializePhase(newPhase, options.data);
    }
  }

  /**
   * Cleans up the current phase before transitioning
   * @param phase - The phase being cleaned up
   */
  private async cleanupPhase(phase: GamePhase): Promise<void> {
    switch (phase) {
      case GamePhase.SessionClosed:
        await this.cleanup_SessionClosed();
        break;
      case GamePhase.SessionStarting:
        await this.cleanup_SessionStarting();
        break;
      case GamePhase.SessionRunning:
        await this.cleanup_SessionRunning();
        break;
      case GamePhase.SessionEnding:
        await this.cleanup_SessionEnding();
        break;
    }
  }

  /**
   * Initializes the new phase
   * @param phase - The phase being initialized
   * @param data - Optional data needed for initialization
   */
  private async initializePhase(phase: GamePhase, data?: Record<string, unknown>): Promise<void> {
    switch (phase) {
      case GamePhase.SessionClosed:
        await this.initialize_SessionClosed();
        break;
      case GamePhase.SessionStarting:
        await this.initialize_SessionStarting(data);
        break;
      case GamePhase.SessionRunning:
        await this.initialize_SessionRunning();
        break;
      case GamePhase.SessionEnding:
        await this.initialize_SessionEnding();
        break;
    }
  }
}
```

### Required Socket Events
```typescript
interface SocketEvents {
  /** Triggers video playback synchronization */
  receiveSyncIntroVideo: (timestamp: number) => void;
  /** Client notifies GM that video is preloaded and ready */
  reportPreloadStatus: () => void;
  /** GM notifies all clients to begin video playback */
  startVideoPlayback: () => void;
}
```

### Data Flow & Synchronization

The system uses Foundry's settings system as the primary mechanism for state synchronization, with socket events reserved for specific real-time coordination needs:

1. **Settings-Based Synchronization (Primary Method)**
   - All session state data is stored in Foundry's settings system
   - Settings are automatically synchronized to all clients by Foundry
   - Settings serve as the single source of truth
   - Clients listen for settings changes via Hooks
   - Used for:
     - Game phase state
     - Session configuration
     - Player assignments
     - UI state

2. **Socket-Based Synchronization (Secondary Method)**
   - Only used for real-time coordination that requires immediate communication
   - Used for:
     - Video playback synchronization
     - Real-time animations
     - Immediate notifications
     - "Call to action" events

This hybrid approach provides several benefits:
- Reliable state management through Foundry's built-in systems
- Automatic state recovery for disconnected/reconnected clients
- Minimal network traffic
- Clear separation between state and real-time events

Example of settings-based sync:
```typescript
// GM updates phase
await getSettings().set("eunos-kult-hacks", "gamePhase", newPhase);

// All clients automatically receive update via hook
Hooks.on("updateSetting", (setting: Setting) => {
    if (setting.key === "gamePhase") {
        EunosOverlay.instance.updateState(setting.value as GamePhase);
    }
});
```

Example of socket-based sync:
```typescript
// For real-time video playback coordination
socket.on("reportPreloadStatus", (userId: string) => {
    const readyClients = new Set(getSetting("videoReadyClients"));
    readyClients.add(userId);
    if (readyClients.size === getGame().users.filter(u => u.active).length) {
        void this.emit("startVideoPlayback", "all");
    }
});
```

### Video Playback Synchronization

The system ensures synchronized video playback across all clients:

1. **Preload Phase**
   - When entering `SessionStarting`, all clients begin preloading the intro video
   - Each client sends `reportPreloadStatus` to GM when ready
   - GM tracks which clients are ready in settings
   - Late-joining clients automatically begin preloading when they connect

2. **Playback Phase**
   - Once all clients report ready, GM sends `startVideoPlayback`
   - All clients begin playback simultaneously

Example flow:
```typescript
// On client, after preloading video:
await EunosSocket.call("reportPreloadStatus", "gm");

// On GM, tracking ready state:
socket.on("reportPreloadStatus", (userId: string) => {
    const readyClients = new Set(getSetting("videoReadyClients"));
    readyClients.add(userId);
    await getSettings().set("eunos-kult-hacks", "videoReadyClients", Array.from(readyClients));

    // If all connected clients are ready
    if (readyClients.size === game.users.filter(u => u.active).length) {
        await EunosSocket.call("startVideoPlayback", "all");
    }
});

// On client, receiving start command:
socket.on("startVideoPlayback", () => {
    EunosOverlay.instance.playIntroVideo();
});
```

### Phase-Specific Methods

Each phase requires specific cleanup and initialization methods:

#### SessionClosed
- **Cleanup**: Stop ambient audio, clear loading screen
- **Initialize**: Start ambient audio, initialize loading screen, start countdown

#### SessionStarting
- **Cleanup**: Hide UI elements, prepare for video
- **Initialize**: Start video playback, sync across clients

#### SessionRunning
- **Cleanup**: End video playback, clear overlays
- **Initialize**: Select scribe, assign hooks, show stage

#### SessionEnding
- **Cleanup**: Clear stage elements
- **Initialize**: Start question sequence

### Resource Management

To ensure efficient memory usage and proper cleanup:

```typescript
interface ResourceTracker {
  /** Active GSAP timelines */
  timelines: Set<gsap.core.Timeline>;
  /** Active video elements */
  videos: Set<HTMLVideoElement>;
  /** Active audio elements/playlists */
  audio: Set<Sound>;
  /** Loading screen cache */
  loadingScreenCache: Map<string, LoadingScreenCache>;
  /** Preloaded assets */
  preloadedAssets: Set<string>;
}

class EunosOverlay {
  /** Tracks active resources for cleanup */
  private resourceTracker: ResourceTracker = {
    timelines: new Set(),
    videos: new Set(),
    audio: new Set(),
    loadingScreenCache: new Map(),
    preloadedAssets: new Set()
  };

  /**
   * Creates and tracks a new GSAP timeline for a specific phase
   * @param phase - The game phase this timeline is for
   * @returns The new timeline
   */
  private createPhaseTimeline(phase: GamePhase): gsap.core.Timeline {
    const timeline = gsap.timeline({
      onComplete: () => {
        this.resourceTracker.timelines.delete(timeline);
      }
    });
    this.resourceTracker.timelines.add(timeline);
    return timeline;
  }

  /**
   * Cleans up all resources of a specific type
   * @param type - The type of resources to clean
   */
  private async cleanupResources(type: keyof ResourceTracker): Promise<void> {
    const resources = this.resourceTracker[type];
    if (resources instanceof Set) {
      for (const resource of resources) {
        if (resource instanceof HTMLVideoElement) {
          resource.pause();
          resource.removeAttribute("src");
          resource.load(); // Triggers garbage collection
        } else if (resource instanceof Sound) {
          await resource.stop();
        } else if (resource instanceof gsap.core.Timeline) {
          // GSAP timelines
          resource.kill(); // This automatically cleans up all child tweens
        }
      }
      resources.clear();
    } else if (resources instanceof Map) {
      resources.clear();
    }
  }

  /**
   * Registers a resource for tracking and later cleanup
   * @param type - The type of resource
   * @param resource - The resource to track
   */
  private trackResource<T extends keyof ResourceTracker>(
    type: T,
    resource: ResourceTracker[T] extends Set<infer U> ? U : never
  ): void {
    if (resource instanceof Set) {
      (this.resourceTracker[type] as Set<unknown>).add(resource);
    }
  }

  /**
   * Cleans up phase-specific resources during phase changes
   */
  private async cleanupPhaseResources(phase: GamePhase): Promise<void> {
    switch (phase) {
      case GamePhase.SessionClosed:
        // Clean up loading screen animations and ambient audio
        await this.cleanupResources("timelines");
        await this.cleanupResources("audio");
        await this.cleanupResources("loadingScreenCache");
        break;
      case GamePhase.SessionStarting:
        // Clean up video elements and related animations
        await this.cleanupResources("videos");
        await this.cleanupResources("timelines");
        break;
      case GamePhase.SessionRunning:
        // Clean up any remaining video/audio from intro
        await this.cleanupResources("videos");
        await this.cleanupResources("audio");
        break;
      case GamePhase.SessionEnding:
        // Clean up stage animations
        await this.cleanupResources("timelines");
        break;
    }
  }

  /**
   * Override of cleanupPhase to include resource cleanup
   */
  private async cleanupPhase(phase: GamePhase): Promise<void> {
    await this.cleanupPhaseResources(phase);
    // ... rest of cleanup logic
  }

  // Example usage in a phase initialization
  private async initialize_SessionStarting(data?: Record<string, unknown>): Promise<void> {
    // Create a timeline for this phase
    const timeline = this.createPhaseTimeline(GamePhase.SessionStarting);

    // Create video element
    const video = document.createElement("video");
    this.trackResource("videos", video);

    // Add animations to timeline
    timeline
      .to(video, { opacity: 0, duration: 0 }) // Set initial state
      .to(video, { opacity: 1, duration: 1 })
      .to(".app", {
        autoAlpha: 0,
        pointerEvents: "none",
        duration: 0.5
      }, "-=0.5"); // Overlap with previous animation

    // Timeline will auto-cleanup when complete
  }
}
```

Key Resource Management Principles:
1. **Explicit Tracking**: All resources (animations, videos, audio) must be registered with the tracker
2. **Proper Disposal**: Resources are properly disposed of during cleanup
3. **Memory Management**: Video elements are explicitly cleared to help garbage collection
4. **Cache Control**: Loading screen cache is cleared when not needed
5. **Asset Preloading**: Preloaded assets are tracked and cleared when no longer needed

Example Usage:
```typescript
class EunosOverlay {
  private async initialize_SessionStarting(data?: Record<string, unknown>): Promise<void> {
    // Create a timeline for this phase
    const timeline = this.createPhaseTimeline(GamePhase.SessionStarting);

    // Create video element
    const video = document.createElement("video");
    this.trackResource("videos", video);

    // Add animations to timeline
    timeline
      .to(video, { opacity: 0, duration: 0 }) // Set initial state
      .to(video, { opacity: 1, duration: 1 })
      .to(".app", {
        autoAlpha: 0,
        pointerEvents: "none",
        duration: 0.5
      }, "-=0.5"); // Overlap with previous animation

    // Timeline will auto-cleanup when complete
  }
}
```

## Required New Components

### 1. Phase Control Interface
- **GM Macro Requirements**
  - Dialog box with buttons for each `GamePhase`
  - Each button triggers phase change workflow
  - Handles cleanup of previous phase <!-- This should not be handled by the macro code, but rather as part of the phase change workflow managed by `EunosOverlay` -->
  - Initializes new phase <!-- Only in the simplest sense of triggering the phase change workflow -->
  - Synchronizes across all clients via socket <!-- This should not be handled by the macro code, but rather as part of the phase change workflow managed by `EunosOverlay` -->

### 2. Session Countdown System
- **Components**
  - Persistent countdown timer to next session <!-- Already fully implemented, with the exception of the countdown (a) growing in size and moving to the center during the playthrough of the pre-session theme song, (b) vanishing five seconds before it reaches zero, and (c) the song being timed to end precisely when the session begins -->
  - Background ambient audio system <!-- Largely fully implemented. Uses Silent Hill ambient audio for an empty town atmosphere during SessionClosed phase -->
  - Loading screen graphics system <!-- Already fully implemented. Displays rotating tidbits of lore with fade in/out transitions -->
  - Pre-session music playlist integration <!-- A specific song must be played that ends exactly when the session begins -->

### 3. The Stage System
- **Background Layer**
  - 3D-perspective map of Emma's Rise <!-- The map should be rotated in 3D space to give a perspective view (not top-down, more like looking at a map on a tabletop). Behind it should be pure black. -->
  - Spotlight system following GM-controlled token <!-- A spotlight webp graphic follows an otherwise player-invisible token that the GM can move to indicate travel to new locations -->

- **Location Display**
  - Central landscape frame <!-- A large frame floating above the 3D map, central focus of the scene -->
  - Location card system <!-- Displays name and image of current scene location -->
  - GM macro for location management <!-- Allows setting both location name and image in one operation -->

- **NPC Management**
  - 6 NPC slots in ring formation <!-- Arranged in a rough ring around the location card -->
  - Click/double-click interactions <!-- Single click by GM: if empty, show NPC selection dialog; if populated, pulse spotlight. Double click: toggle persistent spotlight (low vs med) -->
  - NPC selection dialog <!-- Shows clickable list of all type="npc" EunosActor instances. Selected NPC's picture goes in frame. Includes "X" to remove and return to empty -->
  - Spotlight effects <!-- Two types: temporary pulse on single-click, persistent low/medium lighting on double-click toggle -->

- **PC Display System**
  - 5 PC portrait frames <!-- Located across bottom quarter of screen -->
  - Click-to-open-sheet functionality <!-- Available to all users -->
  - Session Scribe indicator <!-- Quill and scroll icon added to Session Scribe's portrait -->
  - Dramatic Hook candle indicator <!-- Candle burns beneath portrait of player you're writing a hook for -->
  - GM-only information panels: <!-- Define requirements of each panel -->
    1. Dramatic Hooks panel <!-- Simple display of both hooks -->
    2. Stability panel <!-- Shows number, stability tier ("Critical", "Severe", etc), and active Stability Conditions. Conditions show description fields in popover -->
    3. Wounds panel <!-- Compact display of wound data: bright red/dark red for serious/critical, strike-through for stabilized serious. Clicking sends global EunosAlert.Alert() -->
    4. Triggers & Hold panel <!-- Wide panel beneath portrait. Shows system.type === "active" or "triggered" Advantages/Disadvantages as <hold> <image icon> <trigger>. Hold +/- controls visible to GM if canHold true -->

#### Using Data-Action
```javascript
// for proper class definition you'd need to use HandlebarsApplicationMixin
// but it's not used here because these are properties of the base ApplicationV2 class
class MyApplication extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    actions: {
      myAction: MyApplication.myAction
    }
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
   */
  static myAction(event, target) {
    console.log(this) // logs the specific application class instance
  }
}
```
Pair with HTML:
```html
<div data-action="myAction">Using a div for inline text</div>
```

- **Safety System**
  - "STOP SCENE" button <!-- Looks like a stop sign, visible to all players, bottom left. Sends private whisper to GM -->
  - "FADE TO BLACK" button <!-- Looks like lowering black curtain, visible to all players, bottom left. Sends private whisper to GM -->
  - GM notification system <!-- Already implemented, either via `EunosAlerts` or by sending a whisper using native Foundry functionality -->

## Phase-Specific Requirements

### `SessionClosed` Phase
- **Initial State** <!-- Already fully implemented -->
  - Countdown display
  - Rotating loading screen content
  - Ambient audio playback
  - Character sheet access enabled

- **Pre-Session Sequence** <!-- Define each of these in sufficient detail to allow for implementation -->
  - Music playlist integration <!-- Theme song must be preloaded and timed to end exactly at session start -->
  - Countdown animation <!-- Animates from top of screen to center, growing in size and brightness during theme song -->
  - Video preloading system <!-- The intro video is over 100MB. We need to either stream it or guarantee preloading during the pre-session window. New players connecting during this window must also trigger the preload -->
  - Client connection handling <!-- Must handle late-joining players during pre-session sequence -->
  - UI element management <!-- At T-minus 5 seconds: set all `.app` elements to `pointer-events: none` and fade them out via GSAP. Don't remove them to preserve data -->

### `SessionStarting` Phase  <!-- Define each of these in sufficient detail to allow for implementation -->
- **Video Playback**
  - Full-screen video handling <!-- Must play /assets/video/intro-video.mp4 at full screen to all clients -->
  - Synchronized playback <!-- All clients must see the video simultaneously -->
  - Chapter title animation <!-- Fades in at a specific hardcoded timestamp near video end -->
  - Transition to game view <!-- When video ends, swiftly fade overlay elements to visibility: hidden via GSAP autoAlpha -->

### `SessionRunning` Phase  <!-- Define each of these in sufficient detail to allow for implementation -->
- **Initialization**
  - Session Scribe selection <!-- Randomly select from all players (identified by Trusted Player permission or control of one pc-type EunosActor). Store in settings -->
  - Dramatic Hook assignment <!-- Randomly assign each player another player's character (never their own) to write a hook for. Store in settings -->
  - Stage system activation <!-- Reveal the game stage after brief pause to let players see it -->
  - UI element restoration <!-- Fade back in `.app` documents and remove pointer-events: none -->

### `SessionEnding` Phase  <!-- Define each of these in sufficient detail to allow for implementation -->
- **Question System**
  - Three-question sequence <!-- Show animated questions to all players -->
  - GM confirmation dialog <!-- Yes/No dialog for GM per question -->
  - XP award system <!-- Award 1 XP per "yes" answer, plus XP for crossed-off Dramatic Hooks -->
- **Dramatic Hook System**
  - Hook entry dialog <!-- Each player must enter hook for their assigned character -->
  - Word inspiration system <!-- Array of appropriate words randomly flickering as inspiration -->
  - Phase transition handling <!-- Can transition to SessionClosed during hook entry -->

## Technical Requirements

### Data Storage
<!-- nextSessionDate should default to "the closest Friday at 7:30 PM (Toronto time)", but can be pushed to later weeks if a session is known to be skipped -->
```typescript
interface SessionData {
  nextSessionDate: Date;
  sessionScribe: string | null;
  dramaticHookAssignments: Record<string, string>;
  phase: GamePhase;
}
```

### Socket Events
<!-- any SessionData should be stored in an unlisted setting registered for this purpose (this is a conventional way to store data server-side when it isn't connected to a Document object). Because this data is stored server-side, it doesn't need to be synced via socket. Generally speaking, only "calls to action" like animations or audio/video playback should need to be synced via socket.-->
```typescript
interface SocketEvents {
  updateGamePhase: (phase: GamePhase) => void;
  receiveSyncIntroVideo: (timestamp: number) => void;
  updateSessionData: (data: Partial<SessionData>) => void;
}
```

### Required Settings
```typescript
interface ModuleSettings {
  nextSessionTime: string;
  sessionScribeHistory: string[];
  dramaticHookHistory: Record<string, string[]>;
  videoPreloadStrategy: "streaming" | "preload";
}
```

## Implementation Phases

1. **Foundation**
   - Game phase control system
   - Socket infrastructure
   - Settings management

2. **Core Systems**
   - Countdown implementation
   - Audio management
   - Video handling
   - Stage layout

3. **UI Components**
   - NPC/PC displays
   - Information panels
   - Safety buttons
   - Animation systems

4. **Game Logic**
   - Session Scribe selection
   - Dramatic Hook assignment
   - XP management
   - Question system

5. **Polish**
   - Transitions
   - Visual effects
   - Performance optimization
   - Error handling

## Dependencies
- GSAP for animations <!-- Confirmed installed: the `gsap` object is accessible globally -->
- SocketLib for client synchronization <!-- Confirmed installed: the `socketlib` object is accessible globally -->
- Foundry core APIs <!-- Confirmed installed: the `game` object is accessible globally, as is the `foundry` namespace -->
- Custom overlay system <!-- Partially implemented as `EunosOverlay`, a subclass of `ApplicationV2` -->

## Notes for Future Implementation
1. Consider implementing a recovery system for interrupted sessions <!-- This is a PRIORITY in that users should be able to reconnect to the game at any time, and be synced up to the current session state. Being able to "pause" a session, on the other hand, is not a priority. -->
2. Plan for scalability with different player counts <!-- Unnecessary: this module is being customized to a single game with a fixed number of players (five) -->
3. Consider adding configuration options for timing and transitions <!-- Unnecessary: this module is being customized to a single game with a fixed timing schedule -->
4. Implement proper error handling for network issues
5. Add debugging tools for GM troubleshooting

### Socket Management

The system uses a dedicated `EunosSockets` class to manage all socket communications:

```typescript
/** Type for socket event handlers */
type SocketEventHandler<T = void> = (data: T) => void | Promise<void>;

/** Target for socket events */
type SocketTarget = "all" | "gm" | string;

class EunosSockets {
    private static instance: EunosSockets;
    private socket: SocketlibSocket;
    private handlers: Map<string, SocketEventHandler>;

    private constructor() {
        this.socket = socketlib.registerModule("eunos-kult-hacks");
        this.handlers = new Map();
        this.registerEvents();
    }

    public static getInstance(): EunosSockets {
        if (!EunosSockets.instance) {
            EunosSockets.instance = new EunosSockets();
        }
        return EunosSockets.instance;
    }

    /** Register all socket event handlers */
    private registerEvents(): void {
        // Phase management
        this.register("syncPhase", () => {
            EunosOverlay.instance.updateState(getSetting("gamePhase"));
        });

        // Video synchronization
        this.register("reportPreloadStatus", (userId: string) => {
            if (!getUser().isGM) return;
            const readyClients = new Set(getSetting("videoReadyClients"));
            readyClients.add(userId);
            void getSettings().set("eunos-kult-hacks", "videoReadyClients", Array.from(readyClients));

            if (readyClients.size === getGame().users.filter(u => u.active).length) {
                void this.emit("startVideoPlayback", "all");
            }
        });

        this.register("startVideoPlayback", () => {
            void EunosOverlay.instance.playIntroVideo();
        });

        this.register("receiveSyncIntroVideo", (timestamp: number) => {
            void EunosOverlay.instance.syncVideoTime(timestamp);
        });
    }

    /** Register a new socket event handler */
    private register<T>(event: string, handler: SocketEventHandler<T>): void {
        this.socket.register(event, handler);
        this.handlers.set(event, handler);
    }

    /** Emit a socket event to specified target */
    public async emit<T>(event: string, target: SocketTarget, data?: T): Promise<void> {
        if (target === "all") {
            await this.socket.executeForEveryone(event, data);
        } else if (target === "gm") {
            await this.socket.executeForGM(event, data);
        } else {
            await this.socket.executeForUsers(event, [target], data);
        }
    }
}

// Usage examples:
const sockets = EunosSockets.getInstance();

// GM initiating phase change
await sockets.emit("syncPhase", "all");

// Client reporting video ready
await sockets.emit("reportPreloadStatus", "gm");

// GM starting video playback
await sockets.emit("startVideoPlayback", "all");

// Client syncing video timestamp
await sockets.emit("receiveSyncIntroVideo", "all", currentTime);
```

This implementation provides:
- Singleton pattern for socket management
- Type-safe event registration and emission
- Centralized handler registration
- Clear separation of concerns
- Easy testing and maintenance

The class automatically registers all event handlers on initialization and provides a clean API for emitting events. It uses Foundry's socketlib for the underlying socket communication.

## Implementation Progress

### Completed Items
1. **Foundation**
   - ✓ Game phase control system
   - ✓ Settings management
   - ✓ Socket infrastructure
   - ✓ State synchronization architecture

2. **Core Systems**
   - ✓ Countdown implementation
   - ✓ Ambient audio system
   - ✓ Loading screen system
   - ✓ Resource management system

3. **UI Components**
   - ✓ Safety buttons
   - ✓ Basic overlay structure
   - ✓ Phase-specific DOM classes

### In Progress
1. **Core Systems**
   - Video preloading and synchronization
   - Pre-session music integration
   - Stage layout implementation

2. **UI Components**
   - NPC/PC displays
   - Information panels
   - Animation systems

3. **Game Logic**
   - Session Scribe selection
   - Dramatic Hook assignment
   - XP management
   - Question system

### Pending
1. **Polish**
   - Visual effects
   - Performance optimization
   - Error handling
   - Debugging tools

2. **Documentation**
   - API documentation
   - User guide
   - GM tools guide
