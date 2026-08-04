import type { NextFunction, Request, Response } from 'express';

/** Path the CORS handler is mounted on. Nothing outside `/api/v1` gets CORS. */
export const API_CORS_PATH = '/api/v1';

const ALLOWED_METHODS = 'GET,POST,PATCH,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Authorization,Content-Type,X-API-Key';
const EXPOSED_HEADERS = 'X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset';
const MAX_AGE_SECONDS = '86400';

/**
 * CORS for the public API only.
 *
 * `/api/v1` accepts three auth modes: bearer JWT, API key, and the session
 * cookie the server-rendered frontend uses. Third-party browser clients only
 * ever use the first two, both of which are headers — so this deliberately
 * sends no `Access-Control-Allow-Credentials`. Without it a browser will not
 * attach the `authorization` cookie to a cross-origin request, which is what
 * keeps `Access-Control-Allow-Origin: *` from becoming a CSRF hole across every
 * authenticated route.
 *
 * Mounted on the Express instance at `API_CORS_PATH` rather than through
 * `app.enableCors()`, which is app-wide and would stamp the HBS routes too.
 *
 * Because the origin is a constant `*`, `Origin` never enters the response and
 * does not need to be part of CloudFront's cache key.
 */
export function apiCors(req: Request, res: Response, next: NextFunction): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS);

    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
        res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
        res.setHeader('Access-Control-Max-Age', MAX_AGE_SECONDS);
        res.status(204).end();
        return;
    }

    next();
}
