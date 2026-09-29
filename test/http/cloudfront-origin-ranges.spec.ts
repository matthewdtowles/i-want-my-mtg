import * as express from 'express';
import { CLOUDFRONT_ORIGIN_FACING_RANGES } from 'src/http/cloudfront-origin-ranges';

describe('trust proxy with CloudFront origin-facing ranges', () => {
    const app = express();
    app.set('trust proxy', CLOUDFRONT_ORIGIN_FACING_RANGES);

    // Resolves request.ip through Express's own getter for a connection from `peer`.
    function ipFor(peer: string, forwardedFor?: string): string {
        const req = Object.create(express.request);
        req.app = app;
        req.headers = forwardedFor ? { 'x-forwarded-for': forwardedFor } : {};
        req.connection = req.socket = { remoteAddress: peer };
        return req.ip;
    }

    // Seen on the production server as a peer of the app (2026-09-29).
    const cloudFrontPeer = '::ffff:15.158.27.206';

    it('uses the visitor address CloudFront appends', () => {
        expect(ipFor(cloudFrontPeer, '198.51.100.7')).toBe('198.51.100.7');
    });

    it('ignores addresses a visitor forged before CloudFront appended the real one', () => {
        expect(ipFor(cloudFrontPeer, '1.2.3.4, 198.51.100.7')).toBe('198.51.100.7');
    });

    it('ignores X-Forwarded-For from a caller that bypasses CloudFront', () => {
        expect(ipFor('203.0.113.9', '1.2.3.4')).toBe('203.0.113.9');
    });

    it('covers both IPv4 and IPv6 ranges', () => {
        expect(CLOUDFRONT_ORIGIN_FACING_RANGES.some((r) => r.includes('.'))).toBe(true);
        expect(CLOUDFRONT_ORIGIN_FACING_RANGES.some((r) => r.includes(':'))).toBe(true);
    });
});
