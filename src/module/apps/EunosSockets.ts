import { SYSTEM_ID } from "../scripts/constants";
import { GamePhase } from "../scripts/enums";
import * as U from "../scripts/utilities";
import EunosAlerts from "./EunosAlerts";
import { socketLogger } from "../scripts/socket-logger";
import { VideoLoadStatus } from "./EunosOverlay";

/** Enum for user targeting in socket operations */
export enum UserTargetRef {
  gm = "gm", // The alert is shown to the GM.
  self = "self", // The alert is shown to the current user.
  all = "all", // The alert is shown to all connected users.
  players = "players", // The alert is shown to all users except the GM.
  other = "other", // The alert is shown to all users except the current user.
  otherPlayers = "otherPlayers", // The alert is shown to all users except the current user and the GM.
}

export type UserTarget = UserTargetRef | IDString | UUIDString;

/** Type-safe socket event definitions */
export interface SocketEvents {
  /** GM changes the current game phase */
  changePhase: {
    data: {
      prevPhase: GamePhase;
      newPhase: GamePhase;
    };
  };
  /** GM triggers video preloading for all clients */
  preloadIntroVideo: {
    data?: never;
  };
  /** Client notifies GM of their video preload status */
  reportPreloadStatus: {
    data: {
      userId: string;
      status: VideoLoadStatus;
    };
  };
  /** GM manually triggers video playback for all clients */
  startVideoPlayback: {
    data?: never;
  };
  /** Request current video timestamp from GM */
  requestVideoSync: {
    data?: never;
    return: number; // Add return type for Promise resolution
  };
  Alert: {
    data: Partial<EunosAlerts.Data>;
  };
  setLocation: {
    data: {
      location: string;
    };
  };
}

export type SocketEventName = keyof SocketEvents;

/** Connection state of the socket system */
export enum SocketState {
  Disconnected = "Disconnected",
  Connecting = "Connecting",
  Connected = "Connected",
  Error = "Error",
}

/** Manages socket operations for the module */
export default class EunosSockets {
  private static instance: EunosSockets;
  private socket: Socket;
  private socketFunctions: Record<string, SocketFunction> = {};
  private static isInitialized = false;
  private static registeredSocket: Socket;
  private readonly debugMode = true; // Set to false in production

  private constructor() {
    this.logDebug("[EunosSockets] Constructor called");
    this.socket = EunosSockets.registeredSocket ?? this.getSocket();
    this.logDebug("[EunosSockets] Socket obtained:", this.socket);
  }

  /** Initialize the socket system */
  public static initializeSocketSystem(): void {
    if (this.isInitialized) {
      this.getInstance().logDebug(
        "[EunosSockets] Already initialized, skipping",
      );
      return;
    }
    this.getInstance().logDebug("[EunosSockets] Initializing socket system");

    try {
      // Register the module with socketlib
      this.registeredSocket = socketlib.registerModule(SYSTEM_ID);
      this.getInstance().logDebug(
        "[EunosSockets] Registered with socketlib:",
        this.registeredSocket,
      );

      const instance = this.getInstance();
      instance.logDebug("[EunosSockets] Initialize called");

      // Register socket functions from initializable classes
      this.RegisterSockets(InitializableClasses);

      // Setup basic connection monitoring
      // instance.setupConnectionMonitoring();

      this.isInitialized = true;
    } catch (error) {
      this.getInstance().logError("Failed to initialize socket system:", error);
      ui.notifications?.error("Failed to initialize socket system. Please refresh the page.");
    }
  }

  /** Debug logging */
  private logDebug(...args: unknown[]): void {
    if ("kLog" in globalThis && this.debugMode) {
      kLog.log("[EunosSockets]", ...args);
    } else {
      console.log("[EunosSockets]", ...args);
    }
  }

  /** Error logging */
  private logError(...args: unknown[]): void {
    if ("kLog" in globalThis) {
      kLog.error("[EunosSockets]", ...args);
    } else {
      console.error("[EunosSockets]", ...args);
    }
  }

  public static getInstance(): EunosSockets {
    if (!EunosSockets.instance) {
      console.log("[EunosSockets] Creating new instance");
      EunosSockets.instance = new EunosSockets();
    }
    return EunosSockets.instance;
  }

  /** Gets the appropriate socket for the module */
  private getSocket(): Socket {
    this.logDebug("Getting socket");
    this.logDebug("socketlib.system:", socketlib.system);
    this.logDebug("socketlib.modules:", socketlib.modules);

    let socket: Maybe<Socket> = socketlib.system;
    if (!socket) {
      this.logDebug("No system socket, trying module socket");
      socket = socketlib.modules.get(SYSTEM_ID);
      if (!socket) {
        socket = socketlib.registerModule(SYSTEM_ID);
      }
    }
    if (!socket) {
      const error = new Error(
        `[EunosSockets.getSocket] No Socket Found for ${SYSTEM_ID}`,
      );
      this.logError(error);
      throw error;
    }
    this.logDebug("Returning socket:", socket);
    return socket;
  }

  /** Register socket functions from initializable classes */
  public static RegisterSockets(
    initializableClasses: Record<string, unknown>,
  ): void {
    console.log(
      "[EunosSockets] RegisterSockets called with:",
      initializableClasses,
    );
    const instance = EunosSockets.getInstance();

    const classesWithSockets = Object.values(initializableClasses).filter(
      (
        doc: unknown,
      ): doc is (new () => unknown) & {
        SocketFunctions: Record<string, SocketFunction>;
      } => typeof doc === "function" && "SocketFunctions" in doc,
    );

    console.log(
      "[EunosSockets] Classes with socket functions:",
      classesWithSockets,
    );

    classesWithSockets.forEach((Class) => {
      console.log("[EunosSockets] Registering functions from:", Class.name);
      instance.registerSocketFunctions(Class.SocketFunctions);
    });
  }

  /** Register socket functions */
  public registerSocketFunctions(funcs: Record<string, SocketFunction>): void {
    console.log("[EunosSockets] Registering functions:", Object.keys(funcs));
    for (const [fName, func] of Object.entries(funcs)) {
      console.log(`[EunosSockets] Registering function: ${fName}`);
      this.socket.register(fName, async (data: unknown) => {
        await this.executeSocketFunction(fName as SocketEventName, data as SocketEvents[SocketEventName]["data"]);
      });
      this.socketFunctions[fName] = func;
    }
  }

  /** Get users based on target specification */
  public getUsersFromTarget(target: Maybe<UserTarget>): User[] {
    const selfUser = getUser();
    if (!target) {
      return [selfUser];
    }
    if (U.isDocID(target)) {
      return [(getUser(target) ?? undefined)].filter(
        (user: Maybe<User>) => user?.active,
      );
    } else if (U.isDocUUID(target)) {
      return [(fromUuidSync(target) ?? undefined) as Maybe<User>].filter(
        (user: Maybe<User>): user is User => Boolean(user?.active),
      );
    }
    const allUsers = getUsers().filter(
      (user) => user?.active,
    );
    const [gmUsers, playerUsers] = U.partition<User>(
      allUsers,
      (user: User) => user.isGM,
    );

    switch (target) {
      case UserTargetRef.all:
        return allUsers;
      case UserTargetRef.gm:
        return gmUsers;
      case UserTargetRef.other:
        return allUsers.filter((user) => user.id !== selfUser.id);
      case UserTargetRef.otherPlayers:
        return playerUsers.filter((user) => user.id !== selfUser.id);
      case UserTargetRef.players:
        return playerUsers;
      case UserTargetRef.self:
        return [selfUser];
      default:
        throw new Error(`Invalid target: ${String(target)}`);
    }
  }

  /** Validates event data against the SocketEvents interface */
  private validateEventData<E extends SocketEventName>(
    event: E,
    data: unknown
  ): asserts data is SocketEvents[E]["data"] {
    switch (event) {
      case "changePhase": {
        if (typeof data !== "object" || data === null) {
          throw new Error("changePhase event requires an object with prevPhase and newPhase properties");
        }
        break;
      }
      case "setLocation": {
        if (typeof data !== "object" || data === null) {
          throw new Error("setLocation event requires an object with location string");
        }
        break;
      }
      case "preloadIntroVideo": {
        break;
      }
      case "reportPreloadStatus": {
        if (typeof data !== "object" || data === null) {
          throw new Error(`reportPreloadStatus event requires an object with userId string and status enum, got ${typeof data}`);
        }
        if (!("userId" in data) || typeof data.userId !== "string") {
          throw new Error(`reportPreloadStatus event requires a userId string, got ${typeof data}`);
        }
        if (!("status" in data) || typeof data.status !== "string" || !(data.status in VideoLoadStatus)) {
          throw new Error(`reportPreloadStatus event requires a status enum, got ${typeof data}`);
        }
        break;
      }
      case "startVideoPlayback": {
        if (data !== undefined) {
          throw new Error("startVideoPlayback event does not accept any data");
        }
        break;
      }
      case "requestVideoSync": {
        if (data !== undefined) {
          throw new Error("requestVideoSync event does not accept any data");
        }
        break;
      }
      case "Alert": {
        if (typeof data !== "object" || data === null) {
          throw new Error("Alert event requires an object with alert data");
        }
        break;
      }
      default: {
        const _exhaustiveCheck: never = event;
        throw new Error("Unknown socket event: " + String(event));
      }
    }
  }

  public async call<R = void, E extends SocketEventName = SocketEventName>(
    event: E,
    target: UserTarget = UserTargetRef.all,
    data?: SocketEvents[E]["data"],
  ): Promise<R> {
    const socket = this.getSocket();
    const users: User[] = this.getUsersFromTarget(target);
    const startTime = performance.now();

    try {
      // Validate the data before sending
      this.validateEventData(event, data);

      socketLogger.logEvent(
        target === (UserTargetRef.gm as string) ? "GM-Targeted Call" : "Broadcast Call",
        event,
        data,
        users.map((user: User) => user.name ?? user.id!),
      );

      // Use executeAsGM for GM-targeted calls that expect returns
      if (target === UserTargetRef.gm as string) {
        const result = await socket.executeAsGM(event, data);
        const duration = performance.now() - startTime;
        socketLogger.logResult("GM-Targeted Call", event, duration, data, result);
        return result as R;
      }

      // Use executeForUsers for broadcast-style calls
      const userIds = users.map((user: User) => user.id!);
      await socket.executeForUsers(event, userIds, data);
      const duration = performance.now() - startTime;
      socketLogger.logResult("Broadcast Call", event, duration, data, undefined);
      return undefined as R;
    } catch (error: unknown) {
      socketLogger.logError(event, error);
      throw error;
    }
  }

  /** Handles socket function execution with timing and error logging */
  private async executeSocketFunction<E extends SocketEventName>(
    event: E,
    data: SocketEvents[E]["data"],
  ): Promise<void> {
    const startTime = performance.now();
    const func = this.socketFunctions[event];

    if (!func || typeof func !== "function") {
      const error = new Error(`Socket function not found or invalid: ${event}`);
      socketLogger.logError(event, error, data);
      throw error;
    }

    try {
      await Promise.resolve(func(data));
      const duration = performance.now() - startTime;
      socketLogger.logResult("Socket Function Call", event, duration, data);
    } catch (error: unknown) {
      socketLogger.logError(event, error, data);
      throw error;
    }
  }
}

declare global {
  interface Window {
    socketlib: {
      ready: boolean;
      registerModule: (moduleId: string) => Socket;
      system: Socket;
      modules: Map<string, Socket>;
    };
  }
}

// Try to initialize immediately if socketlib is ready
if (
  typeof window.socketlib === "object" &&
  window.socketlib !== null &&
  "ready" in window.socketlib &&
  window.socketlib.ready
) {
  console.log("Socketlib already ready, initializing immediately");
  EunosSockets.initializeSocketSystem();
}

// Register hook as fallback
Hooks.once("socketlib.ready", () => {
  console.log("Socketlib ready hook fired");
  EunosSockets.initializeSocketSystem();
});
