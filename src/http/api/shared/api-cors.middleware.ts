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
 * ever use the first two, both of which are headers, so this deliberately sends
 * no `Access-Control-Allow-Credentials`.
 *
 * What that actually buys, precisely, because it is easy to overstate:
 *
 * - For a **preflighted** request (`PATCH`, `DELETE`, a JSON `POST` - most of the
 *   write surface here), the browser sees no `Allow-Credentials` on the preflight
 *   response and never sends the real request. Nothing reaches the origin.
 * - For a **simple** request (a plain cross-origin `GET`), there is no preflight.
 *   The request still reaches the origin; the missing header only stops the
 *   response from being handed to the calling script.
 *
 * So this header does not decide whether a cookie is *attached*. What keeps the
 * `authorization` cookie off cross-site requests is its own `sameSite: 'lax'`
 * (`src/http/hbs/auth/auth.cookie.util.ts`). The two work together: SameSite keeps
 * the credential from riding along, and the absence of `Allow-Credentials` keeps
 * `Access-Control-Allow-Origin: *` from granting any origin a readable,
 * authenticated session. Loosening either one alone reopens CSRF across every
 * authenticated route - do not set `sameSite: 'none'` on that cookie on the
 * assumption that this middleware is covering it.
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
