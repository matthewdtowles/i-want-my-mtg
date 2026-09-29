import * as express from 'express';
import {
    CLOUDFRONT_ORIGIN_SECRET_HEADER,
    cloudFrontOriginCheck,
} from 'src/http/cloudfront-origin.middleware';
import { CLOUDFRONT_ORIGIN_FACING_RANGES } from 'src/http/cloudfront-origin-ranges';

describe('cloudFrontOriginCheck', () => {
    const app = express();
    app.set('trust proxy', CLOUDFRONT_ORIGIN_FACING_RANGES);

    // Seen on the production server as a peer of the app (2026-09-29).
    const cloudFrontPeer = '::ffff:15.158.27.206';

    // Runs the middleware, then resolves request.ip through Express's own getter.
    function ipFor(secret: string | undefined, headers: Record<string, string>): string {
        const req = Object.create(express.request);
        req.app = app;
        req.headers = { ...headers };
        req.connection = req.socket = { remoteAddress: cloudFrontPeer };
        const next = jest.fn();
        cloudFrontOriginCheck(secret)(req, {} as express.Response, next);
        expect(next).toHaveBeenCalled();
        expect(req.headers[CLOUDFRONT_ORIGIN_SECRET_HEADER]).toBeUndefined();
        return req.ip;
    }

    it('keeps the visitor address from our distribution', () => {
        const ip = ipFor('s3cret', {
            'x-forwarded-for': '198.51.100.7',
            [CLOUDFRONT_ORIGIN_SECRET_HEADER]: 's3cret',
        });
        expect(ip).toBe('198.51.100.7');
    });

    it('ignores X-Forwarded-For from another distribution without the secret', () => {
        expect(ipFor('s3cret', { 'x-forwarded-for': '10.0.0.1' })).toBe(cloudFrontPeer);
    });

    it('ignores X-Forwarded-For when the secret is wrong', () => {
        const ip = ipFor('s3cret', {
            'x-forwarded-for': '10.0.0.1',
            [CLOUDFRONT_ORIGIN_SECRET_HEADER]: 'guess1',
        });
        expect(ip).toBe(cloudFrontPeer);
    });

    it('ignores X-Forwarded-For when no secret is configured', () => {
        const ip = ipFor(undefined, {
            'x-forwarded-for': '10.0.0.1',
            [CLOUDFRONT_ORIGIN_SECRET_HEADER]: '',
        });
        expect(ip).toBe(cloudFrontPeer);
    });
});
