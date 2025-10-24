import { LoggerService, LogLevel } from "@nestjs/common";
import * as os from "os";
import { getRequestContext } from "./request-context";

export class AppLogger implements LoggerService {
    private activeLevels: Set<string>;
    private useJson: boolean;

    constructor(levels: string[] = ["error", "warn", "log", "debug"], useJson: boolean = false) {
        this.activeLevels = new Set(levels.map(l => l.toLowerCase()));
        this.useJson = useJson;
    }

    log(message: string, context?: string) {
        if (this.activeLevels.has("log") || this.activeLevels.has("info")) {
            this.print("INFO", message, context);
        }
    }

    debug(message: string, context?: string) {
        if (this.activeLevels.has("debug")) {
            this.print("DEBUG", message, context);
        }
    }

    error(message: string, trace?: string, context?: string) {
        if (this.activeLevels.has("error")) {
            this.print("ERROR", message, context, trace);
        }
    }

    warn(message: string, context?: string) {
        if (this.activeLevels.has("warn")) {
            this.print("WARN", message, context);
        }
    }

    private print(level: LogLevel | string, message: string, context?: string, trace?: string) {
        const host = process.env.HOSTNAME ?? os.hostname();
        const requestId = getRequestContext()?.correlationId ?? "-";
        const timestamp = new Date().toISOString();

        const logObj: Record<string, any> = {
            timestamp,
            level,
            host,
            context: context ?? "-",
            requestId,
            message,
        };
        if (trace) logObj.trace = trace;

        if (this.useJson) {
            console.log(JSON.stringify(logObj));
        } else {
            // Specify the order you want
            const keys = ["timestamp", "level", "host", "context", "requestId", "message", "trace"];
            const logLine = keys
                .filter(key => key in logObj)
                .map(key => key === "message" ? `"${logObj[key]}"` : logObj[key])
                .join(" | ");
            console.log(logLine);
        }
    }
}
