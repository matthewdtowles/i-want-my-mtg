import { LoggerService, LogLevel } from '@nestjs/common';
import { getRequestContext } from './request-context';

export class AppLogger implements LoggerService {
    private debugMode: boolean;
    private useJson: boolean;

    constructor(debugMode: boolean = false, useJson: boolean = false) {
        this.debugMode = debugMode;
        this.useJson = useJson;
    }

    log(message: string, context?: string) {
        this.print('INFO', message, context);
    }

    warn(message: string, context?: string) {
        this.print('WARN', message, context);
    }

    error(message: string, trace?: string, context?: string) {
        this.print('ERROR', message, context, trace);
    }

    debug(message: string, context?: string) {
        if (this.debugMode) {
            this.print('DEBUG', message, context);
        }
    }

    private print(level: LogLevel | string, message: string, context?: string, trace?: string) {
        const requestId = getRequestContext()?.correlationId ?? '-';
        const userId = getRequestContext()?.userId ?? '-';
        const timestamp = new Date().toISOString();

        const colors: Record<string, string> = {
            INFO: '\x1b[32m', // Green
            WARN: '\x1b[38;5;208m', // Orange
            ERROR: '\x1b[31m', // Red
            DEBUG: '\x1b[36m', // Cyan
            CONTEXT: '\x1b[33m', // Yellow
            RESET: '\x1b[0m', // Reset
        };

        const levelColor = colors[level] || colors.RESET;
        const contextColor = colors.CONTEXT;

        const coloredLine =
            `${timestamp} ${levelColor} | ` +
            `${level} | ` +
            `${contextColor}${context ?? '-'}${levelColor} | ${colors.RESET}` +
            `${requestId} ${levelColor} | ` +
            `${levelColor}${userId} | ${colors.RESET}` +
            `${message}` +
            (trace ? ` | ${levelColor}${trace}` : '');

        if (this.useJson) {
            const logObj: Record<string, any> = {
                timestamp,
                level,
                context: context ?? '-',
                requestId,
                userId,
                message,
            };
            if (trace) logObj.trace = trace;
            console.log(JSON.stringify(logObj));
        } else {
            console.log(coloredLine);
        }
    }
}
