import { LoggerService } from '@nestjs/common';
import { AppLogger } from './app-logger';

export const GlobalAppLogger = new AppLogger(
    process.env.DEBUG_MODE ? true : false,
    process.env.LOG_FORMAT === 'json'
);

export function getLogger(context: string): LoggerService {
    return {
        log: (msg: string) => GlobalAppLogger.log(msg, context),
        debug: (msg: string) => GlobalAppLogger.debug(msg, context),
        error: (msg: string, trace?: string) => GlobalAppLogger.error(msg, trace, context),
        warn: (msg: string) => GlobalAppLogger.warn(msg, context),
    };
}
