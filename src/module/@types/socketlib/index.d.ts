export {};
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  type SyncSocketFunction<T = unknown, P = unknown> = (data: P) => T;
  type AsyncSocketFunction<T = unknown, P = unknown> = (data: P) => Promise<T>;
  type SocketFunction<T = unknown, P = unknown> = SyncSocketFunction<T, P> | AsyncSocketFunction<T, P>;

  interface Socket {
    register(name: string, func: SocketFunction): void;
    executeForUsers(name: string, userIds: string[], data?: unknown): Promise<void>;
    executeForEveryone(name: string, data?: unknown): Promise<void>;
    executeForGM(name: string, data?: unknown): Promise<void>;
    on(event: "connect" | "disconnect", handler: () => void): void;
    connected: boolean;

    /**
     * Chooses One Connected GM Client (at random, if multiple).
     * Executes 'handler' on that Client, passing it 'parameters'.
     * Can 'await' return value of passed handler function.
     */
    executeAsGM(name: string, data?: unknown, expectResponse?: boolean): Promise<unknown>;

    /**
     * Chooses Specified User Client, if Connected.
     * Executes 'handler' on that Client, passing it 'parameters'.
     * Can 'await' return value of passed handler function.
     */
    executeAsUser(name: string, userId: string, data?: unknown, expectResponse?: boolean): Promise<unknown>;

    /**
     * Chooses GM Clients.
     * Executes 'handler' on ALL, passing it 'parameters'.
     * CANNOT 'await' return value.
     */
    executeForAllGMs<S extends SyncSocketFunction>(handler: string | S, ...parameters: Parameters<S>): Promise<void>

    /**
      * Chooses GM Clients EXCEPT Caller.
      * Executes 'handler' on ALL, passing it 'parameters'.
      * CANNOT 'await' return value.
      */
    executeForOtherGMs<S extends SyncSocketFunction>(handler: string | S, ...parameters: Parameters<S>): Promise<void>

    /**
      * Chooses ALL Clients EXCEPT Caller.
      * Executes 'handler' on ALL, passing it 'parameters'.
      * CANNOT 'await' return value.
      */
    executeForOthers<S extends SyncSocketFunction>(handler: string | S, ...parameters: Parameters<S>): Promise<void>
    /**
      * Chooses ALL Specified User Clients, if Connected.
      * Executes 'handler' on ALL, passing it 'parameters'.
      * CANNOT 'await' return value.
      */
    executeForUsers<S extends SyncSocketFunction>(handler: string | S, userIDs: string[], ...parameters: Parameters<S>): Promise<void>

  }
  export interface SocketLib {
    registerModule(modName: string): Socket;
    registerSystem(sysName: string): Socket;

    system: Socket;
    modules: Map<string, Socket>;
  }

}
