import * as express from 'express';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { staleChromeBlock } from 'src/http/stale-chrome-block.middleware';

const chrome = (major: string, tail = 'Safari/537.36') =>
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major} ${tail}`;

describe('staleChromeBlock', () => {
    const app = express();
    app.use(cookieParser());
    app.use(staleChromeBlock());
    app.get('*', (_req, res) => res.send('ok'));

    // User agents from the 2026-11-01 crawl of every card page.
    it.each(['116.0.0.0', '131.0.0.0', '133.0.0.0', '104.0.5112.81'])(
        'turns away signed-out Windows Chrome %s',
        async (major) => {
            const res = await request(app)
                .get('/card/dmu/107')
                .set('User-Agent', chrome(major))
                .expect(403);
            expect(res.headers['cache-control']).toBe('no-store');
        }
    );

    it('turns away the truncated "Safari/537.3" agent whatever its version', async () => {
        await request(app)
            .get('/card/dmu/107')
            .set('User-Agent', chrome('151.0.0.0', 'Safari/537.3'))
            .expect(403);
    });

    it.each([
        ['current Windows Chrome', chrome('151.0.0.0')],
        [
            'Mac Chrome',
            chrome('116.0.0.0').replace(
                'Windows NT 10.0; Win64; x64',
                'Macintosh; Intel Mac OS X 10_15_7'
            ),
        ],
        [
            'Firefox',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
        ],
        ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
        ['no user agent', ''],
    ])('lets %s through', async (_name, ua) => {
        await request(app).get('/card/dmu/107').set('User-Agent', ua).expect(200);
    });

    it('lets a signed-in visitor on old Chrome through', async () => {
        await request(app)
            .get('/card/dmu/107')
            .set('User-Agent', chrome('116.0.0.0'))
            .set('Cookie', 'authorization=token')
            .expect(200);
    });

    it('lets an API client on old Chrome through', async () => {
        await request(app)
            .get('/api/v1/cards')
            .set('User-Agent', chrome('116.0.0.0'))
            .set('X-API-Key', 'key')
            .expect(200);
    });

    it('leaves sign-in open on old Chrome', async () => {
        await request(app).get('/auth/login').set('User-Agent', chrome('116.0.0.0')).expect(200);
    });
});
