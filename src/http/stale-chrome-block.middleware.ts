import type { NextFunction, Request, Response } from 'express';

/**
 * Oldest Windows Chrome a signed-out visitor may browse with. Chrome 134 shipped in
 * March 2025 and Chrome updates itself, so a real visitor this far behind is rare.
 */
export const MIN_WINDOWS_CHROME_MAJOR = 134;

const WINDOWS_CHROME =
    /^Mozilla\/5\.0 \(Windows NT [^)]*\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) Chrome\/(\d+)\./;
// Real Chrome ends "Safari/537.36"; the scraper's list includes one cut short.
const TRUNCATED_SAFARI = /Safari\/537\.3$/;

/**
 * Turns away a scraper that disguises itself as old Windows Chrome.
 *
 * On 2026-11-01 a crawl of every card page rotated through Windows Chrome user agents
 * from 103 to 133, a few thousand requests each, from addresses that each sent too few
 * to rate-limit. Card pages are unique URLs, so CloudFront could not absorb it, and the
 * crawl exhausted the database's I/O until every page returned 500.
 *
 * Signed-in visitors and API clients are never turned away, and /auth stays open so a
 * visitor on an old browser can still sign in. The 403 is marked no-store because
 * CloudFront's cache key has no user agent: a cached 403 would reach everyone.
 */
export function staleChromeBlock() {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (
            isStaleChrome(req.headers['user-agent']) &&
            !hasCredentials(req) &&
            !req.path.startsWith('/auth')
        ) {
            res.status(403)
                .set('Cache-Control', 'no-store')
                .type('text/plain')
                .send('Please update your browser, or sign in, to use I Want My MTG.');
            return;
        }
        next();
    };
}

function isStaleChrome(ua: string | undefined): boolean {
    if (!ua) return false;
    if (/bot|crawl|spider|compatible/i.test(ua)) return false;
    const match = WINDOWS_CHROME.exec(ua);
    if (!match) return false;
    return Number(match[1]) < MIN_WINDOWS_CHROME_MAJOR || TRUNCATED_SAFARI.test(ua);
}

function hasCredentials(req: Request): boolean {
    return !!(req.cookies?.authorization || req.headers.authorization || req.headers['x-api-key']);
}
