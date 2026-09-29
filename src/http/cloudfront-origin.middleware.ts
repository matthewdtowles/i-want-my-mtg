import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/** Header our CloudFront distribution adds to every request it sends to the server. */
export const CLOUDFRONT_ORIGIN_SECRET_HEADER = 'x-origin-verify';

/**
 * Drops X-Forwarded-For unless the request carries our distribution's secret header.
 *
 * `trust proxy` accepts X-Forwarded-For from any CloudFront address, but those
 * addresses serve every CloudFront customer. Anyone can point their own distribution
 * at this server and rewrite X-Forwarded-For in a Lambda@Edge origin-request function,
 * which AWS allows. Without the header, `request.ip` falls back to the connecting
 * address, so only our own distribution can report a visitor's address (#622).
 * With `secret` unset, X-Forwarded-For is always dropped.
 */
export function cloudFrontOriginCheck(secret: string | undefined) {
    const expected = secret ? Buffer.from(secret) : null;
    return (req: Request, _res: Response, next: NextFunction): void => {
        const header = req.headers[CLOUDFRONT_ORIGIN_SECRET_HEADER];
        const presented = typeof header === 'string' ? Buffer.from(header) : null;
        const valid =
            expected !== null &&
            presented !== null &&
            presented.length === expected.length &&
            timingSafeEqual(presented, expected);
        if (!valid) delete req.headers['x-forwarded-for'];
        // Keep the secret out of anything downstream that logs headers.
        delete req.headers[CLOUDFRONT_ORIGIN_SECRET_HEADER];
        next();
    };
}
