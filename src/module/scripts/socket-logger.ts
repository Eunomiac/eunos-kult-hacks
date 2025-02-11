import type { SocketEventName, SocketEvents } from "../apps/EunosSockets";

/** Configuration for socket logging */
interface SocketLoggerConfig {
    /** Whether to log socket events */
    enabled: boolean;
    /** Whether to log socket event data */
    logData: boolean;
    /** Whether to log socket event results */
    logResults: boolean;
    /** Whether to log socket event timing */
    logTiming: boolean;
    /** Whether to log socket event errors */
    logErrors: boolean;
}

/** Default configuration for socket logging */
const DEFAULT_CONFIG: SocketLoggerConfig = {
    enabled: true,
    logData: true,
    logResults: true,
    logTiming: true,
    logErrors: true
};

/** Logs socket events for debugging */
export class SocketLogger {
    private static instance: SocketLogger;
    private config: SocketLoggerConfig;
    private eventCounts: Map<SocketEventName, number>;
    private eventTiming: Map<SocketEventName, number[]>;

    private constructor(config: Partial<SocketLoggerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.eventCounts = new Map();
        this.eventTiming = new Map();
    }

    public static getInstance(config?: Partial<SocketLoggerConfig>): SocketLogger {
        if (!SocketLogger.instance) {
            SocketLogger.instance = new SocketLogger(config);
        }
        return SocketLogger.instance;
    }

    /** Logs a socket event */
    public logEvent<E extends SocketEventName>(
        title: string,
        event: E,
        data?: SocketEvents[E]["data"],
        target?: string|string[]
    ): void {
        if (!this.config.enabled) return;
        if (Array.isArray(target)) {
          target = target.join(", ");
        }

        // Update event count
        const count = (this.eventCounts.get(event) ?? 0) + 1;
        this.eventCounts.set(event, count);

        // Log event details
        const details: Record<string, unknown> = {
            event,
            count,
            target
        };

        if (this.config.logData && data !== undefined) {
            details["data"] = data;
        }

        kLog.log(`[Socket Event] ${title}`, details);
    }

    /** Logs a socket event result */
    public logResult(
        title: string,
        event: SocketEventName,
        duration: number,
        data?: SocketEvents[SocketEventName]["data"],
        result?: unknown
    ): void {
        if (!this.config.enabled || !this.config.logResults) return;

        // Update timing stats
        const timings = this.eventTiming.get(event) ?? [];
        timings.push(duration);
        this.eventTiming.set(event, timings);

        // Calculate average timing
        const avgDuration = timings.reduce((a, b) => a + b, 0) / timings.length;

        // Log result details
        const details: Record<string, unknown> = {
            event,
            data,
            result,
            duration: `${duration.toFixed(2)}ms`,
            avgDuration: `${avgDuration.toFixed(2)}ms`
        };

        kLog.log(`[Socket Result] ${title}`, details);
    }

    /** Logs a socket event error */
    public logError(event: SocketEventName, error: unknown, data?: SocketEvents[SocketEventName]["data"]): void {
        if (!this.config.enabled || !this.config.logErrors) return;

        kLog.error("[Socket Error]", {
            event,
            data,
            error
        });
    }

    /** Gets statistics for all socket events */
    public getStats(): Record<string, unknown> {
        const stats: Record<string, unknown> = {
            totalEvents: Array.from(this.eventCounts.values()).reduce((a, b) => a + b, 0),
            eventCounts: Object.fromEntries(this.eventCounts),
            averageTimings: Object.fromEntries(
                Array.from(this.eventTiming.entries()).map(([event, timings]) => [
                    event,
                    `${(timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(2)}ms`
                ])
            )
        };

        return stats;
    }

    /** Resets all statistics */
    public reset(): void {
        this.eventCounts.clear();
        this.eventTiming.clear();
    }
}

/** Singleton instance for easy access */
export const socketLogger = SocketLogger.getInstance();
