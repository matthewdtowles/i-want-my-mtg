import { LoggerService } from "@nestjs/common";
import { AppLogger } from "./app-logger";

export const GlobalAppLogger = new AppLogger(
    process.env.NODE_ENV === "production" && !process.env.DEBUG_MODE
        ? ["error", "warn", "log"]
        : ["error", "warn", "log", "debug"],
    process.env.LOG_FORMAT === "json" || process.env.NODE_ENV === "production"
);

export function getLogger(context: string): LoggerService {
    return {
        log: (msg: string) => GlobalAppLogger.log(msg, context),
        debug: (msg: string) => GlobalAppLogger.debug(msg, context),
        error: (msg: string, trace?: string) => GlobalAppLogger.error(msg, trace, context),
        warn: (msg: string) => GlobalAppLogger.warn(msg, context),
    };
}