import { SYSTEM_ID } from "../scripts/constants";
import { GamePhase, UserTargetRef, MediaLoadStatus } from "../scripts/enums";
import * as U from "../scripts/utilities";
import EunosAlerts from "./EunosAlerts";

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
  /** GM triggers audio preloading for all clients */
  preloadPreSessionSong: {
    data?: never;
  };
  /** GM triggers audio playback for all clients */
  playPreSessionSong: {
    data?: never;
  };
  /** GM triggers video preloading for all clients */
  preloadIntroVideo: {
    data?: never;
  };
  /** Client notifies GM of their video preload status */
  reportPreloadStatus: {
    data: {
      userId: string;
      status: MediaLoadStatus;
    };
  };
  /** GM manually triggers video playback for all clients */
  startVideoPlayback: {
    data?: never;
  };
  /** Request current video timestamp from GM */
  requestMediaSync: {
    data: {
      userId: string;
      mediaName: string;
    },
    return: number; // Add return type for Promise resolution
  };
  /** Sends notice to GM to refresh PCs overlay */
  refreshPCs: {
    data?: never;
  };
  /** GM syncs media timestamp to requesting client */
  syncMedia: {
    data: {
      mediaName: string;
      timestamp: number;
    };
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
    this.socket = EunosSockets.registeredSocket ?? this.getSocket();
  }

  /** Initialize the socket system */
  public static initializeSocketSystem(): void {
    if (this.isInitialized) {
      return;
    }
    kLog.log("[EunosSockets] Initializing socket system");

    try {
      // Register the module with socketlib
      this.registeredSocket = socketlib.registerModule(SYSTEM_ID);

      // Register socket functions from initializable classes
      this.RegisterSockets(InitializableClasses);

      this.isInitialized = true;
    } catch (error) {
      kLog.error("[EunosSockets] Failed to initialize socket system:", error);
      getNotifier().error("Failed to initialize socket system. Please refresh the page.");
    }
  }

  public static getInstance(): EunosSockets {
    if (!EunosSockets.instance) {
      EunosSockets.instance = new EunosSockets();
    }
    return EunosSockets.instance;
  }

  /** Gets the appropriate socket for the module */
  private getSocket(): Socket {

    let socket: Maybe<Socket> = socketlib.system;
    if (!socket) {
      socket = socketlib.modules.get(SYSTEM_ID);
      if (!socket) {
        socket = socketlib.registerModule(SYSTEM_ID);
      }
    }
    if (!socket) {
      const error = new Error(
        `[EunosSockets.getSocket] No Socket Found for ${SYSTEM_ID}`,
      );
      kLog.error("[EunosSockets] Failed to get socket:", error);
      throw error;
    }
    return socket;
  }

  /** Register socket functions from initializable classes */
  public static RegisterSockets(
    initializableClasses: Record<string, unknown>,
  ): void {
    const instance = EunosSockets.getInstance();

    const classesWithSockets = Object.values(initializableClasses).filter(
      (
        doc: unknown,
      ): doc is (new () => unknown) & {
        SocketFunctions: Record<string, SocketFunction>;
      } => typeof doc === "function" && "SocketFunctions" in doc,
    );

    classesWithSockets.forEach((Class) => {
      instance.registerSocketFunctions(Class.SocketFunctions);
    });
  }

  /** Register socket functions */
  public registerSocketFunctions(funcs: Record<string, SocketFunction>): void {
    for (const [fName, func] of Object.entries(funcs)) {
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
      case "preloadPreSessionSong": {
        if (data !== undefined) {
          throw new Error("preloadPreSessionSong event does not accept any data");
        }
        break;
      }
      case "playPreSessionSong": {
        if (data !== undefined) {
          throw new Error("playPreSessionSong event does not accept any data");
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
        if (!("status" in data) || typeof data.status !== "string" || !(data.status in MediaLoadStatus)) {
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
      case "requestMediaSync": {
        if (typeof data !== "object" || data === null) {
          throw new Error(`requestMediaSync event requires an object with userId string and mediaName string, got ${typeof data}`);
        }
        if (!("mediaName" in data) || typeof data.mediaName !== "string") {
          throw new Error(`requestMediaSync event requires a mediaName string, got ${typeof data}`);
        }
        if (!("userId" in data) || typeof data.userId !== "string") {
          throw new Error(`requestMediaSync event requires a userId string, got ${typeof data}`);
        }
        break;
      }
      case "refreshPCs": {
        if (data !== undefined) {
          throw new Error("refreshPCs event does not accept any data");
        }
        break;
      }
      case "syncMedia": {
        if (typeof data !== "object" || data === null) {
          throw new Error(`syncMedia event requires an object with mediaName string and timestamp number, got ${typeof data}`);
        }
        if (!("mediaName" in data) || typeof data.mediaName !== "string") {
          throw new Error(`syncMedia event requires a mediaName string, got ${typeof data}`);
        }
        if (!("timestamp" in data) || typeof data.timestamp !== "number") {
          throw new Error(`syncMedia event requires a timestamp number, got ${typeof data}`);
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
    expectResponse = false
  ): Promise<R> {
    const socket = this.getSocket();
    const users: User[] = this.getUsersFromTarget(target);

    try {
      // Validate the data before sending
      this.validateEventData(event, data);

      kLog.socketCall(`[I CALLED] ${U.uCase(target)}: "${event}"`, data);

      // Use executeAsGM for GM-targeted calls that expect returns
      if (target === UserTargetRef.gm as string && expectResponse) {
        const result = await socket.executeAsGM(event, data);
        kLog.socketCall(`[THEY ANSWERED] "${event}" with "${String(result)}"`, data);
        return result as R;
      }

      // Use executeForUsers for broadcast-style calls
      const userIds = users.map((user: User) => user.id!);
      await socket.executeForUsers(event, userIds, data);
      return undefined as R;
    } catch (error: unknown) {
      kLog.error(`[... CALL FAILED] ${U.uCase(target)}: "${event}"`, {...data, error});
      throw error;
    }
  }

  /** Handles socket function execution with timing and error logging */
  private async executeSocketFunction<E extends SocketEventName>(
    event: E,
    data: SocketEvents[E]["data"],
  ): Promise<void> {
    const func = this.socketFunctions[event];

    if (!func || typeof func !== "function") {
      const error = new Error(`Socket function not found or invalid: ${event}`);
      kLog.error(`[I HEARD] "${event}" BUT FAILED TO EXECUTE`, {...data, error});
      throw error;
    }

    try {
      kLog.socketResponse(`[I HEARD] "${event}": Executing "${func.name}"`, data);
      await Promise.resolve(func(data));
    } catch (error: unknown) {
      kLog.error(`[I HEARD] "${event}" BUT "${func.name}" EXECUTION FAILED`, {...data, error});
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
  EunosSockets.initializeSocketSystem();
}

// Register hook as fallback
Hooks.once("socketlib.ready", () => {
  EunosSockets.initializeSocketSystem();
});
