import { LoggerService } from '@nestjs/common';
import { AsyncResource } from 'async_hooks';
import type { NextFunction, Request, Response } from 'express';

/**
 * One line per request: who asked for what, and how it went.
 *
 * On 2026-10-05 a crawl doubled traffic for nine hours and helped push the
 * database into an AWS restart, but nothing recorded who was crawling, so it
 * could be neither identified nor rate-limited. `request.ip` is the visitor's
 * address only behind our CloudFront distribution (see configureApp).
 *
 * The query string is dropped: verification and reset links carry tokens there.
 */
export function requestLog(logger: Pick<LoggerService, 'log'>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const start = process.hrtime.bigint();
        // 'finish' fires from the socket, outside this request's async context;
        // bind it so the line keeps the request id the error lines carry.
        res.on(
            'finish',
            AsyncResource.bind(() => {
                const ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
                const path = req.originalUrl.split('?')[0];
                const ua = req.headers['user-agent'];
                logger.log(
                    `${req.method} ${path} ${res.statusCode} ${ms}ms ip=${req.ip} ` +
                        `ua=${ua ? JSON.stringify(ua) : '-'}`
                );
            })
        );
        next();
    };
}
