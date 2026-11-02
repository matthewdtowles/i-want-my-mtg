import { BlockList, isIP } from 'net';
import type { NextFunction, Request, Response } from 'express';

/**
 * Cloud-hosting ranges a crawl of every card page came from on 2026-11-01: about
 * 10,000 addresses, so no single one sent enough to rate-limit. Real visitors don't
 * browse from cloud servers. Owners per RDAP.
 */
export const SCRAPER_RANGES: ReadonlyArray<[string, number]> = [
    ['43.160.0.0', 12], // Aceville Pte Ltd (Tencent Cloud), 43.172-43.173 seen
    ['161.120.176.0', 20], // Tencent
    ['47.74.0.0', 15], // Alibaba Cloud, 47.74.0.0-47.87.255.255; 47.79 seen
    ['47.76.0.0', 14],
    ['47.80.0.0', 13],
];

/**
 * Oldest Windows Chrome a signed-out visitor may browse with. The same crawl rotated
 * through Windows Chrome 103 to 133 user agents. Chrome 134 shipped in March 2025 and
 * Chrome updates itself, so a real visitor this far behind is rare.
 */
export const MIN_WINDOWS_CHROME_MAJOR = 134;

const WINDOWS_CHROME =
    /^Mozilla\/5\.0 \(Windows NT [^)]*\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) Chrome\/(\d+)\./;
// Real Chrome ends "Safari/537.36"; the scraper's list includes one cut short.
const TRUNCATED_SAFARI = /Safari\/537\.3$/;

/**
 * Turns away the scraper that crawled every card page on 2026-11-01. Card pages are
 * unique URLs, so CloudFront could not absorb it, and the crawl exhausted the
 * database's I/O until every page returned 500.
 *
 * Signed-in visitors and API clients are never turned away, and /auth stays open so a
 * visitor caught by mistake can still sign in. The 403 is marked no-store because
 * CloudFront's cache key has neither address nor user agent: a cached 403 would reach
 * everyone.
 */
export function scraperBlock() {
    const ranges = new BlockList();
    for (const [network, prefix] of SCRAPER_RANGES) ranges.addSubnet(network, prefix, 'ipv4');

    return (req: Request, res: Response, next: NextFunction): void => {
        if (
            (fromScraperRange(ranges, req.ip) || isStaleChrome(req.headers['user-agent'])) &&
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

function fromScraperRange(ranges: BlockList, ip: string | undefined): boolean {
    const version = ip ? isIP(ip) : 0;
    return version !== 0 && ranges.check(ip, version === 6 ? 'ipv6' : 'ipv4');
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
