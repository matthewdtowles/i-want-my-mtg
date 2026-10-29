import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    closeTestApp,
    createTestApp,
    getTestUserId,
    loginTestUser,
    loginTestUserApi,
    TEST_CARD_NUMBER,
    TEST_CARD_SET_CODE,
} from './setup';

// CloudFront's default behavior caches whatever the origin marks public, keyed on the
// query string, the Authorization and X-API-Key headers and the `authorization` cookie
// (infra/cloudfront/README.md). These are the origin guarantees that make that safe: a
// signed-in response is never public, and a public response never sets a cookie.
describe('Edge cache headers (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;
    let userId: number;
    let authCookie: string;
    let bearerToken: string;
    let apiKey: string;

    const cardPage = `/card/${TEST_CARD_SET_CODE}/${TEST_CARD_NUMBER}`;

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        userId = await getTestUserId(app);
        authCookie = await loginTestUser(app);
        bearerToken = await loginTestUserApi(app);
        await ds.query('DELETE FROM api_key WHERE user_id = $1', [userId]);
        const res = await request(app.getHttpServer())
            .post('/api/v1/api-keys')
            .set('Authorization', bearerToken)
            .send({ name: 'edge cache test' })
            .expect(201);
        apiKey = res.body.data.rawKey;
    }, 30000);

    afterAll(async () => {
        try {
            if (ds?.isInitialized) {
                await ds.query('DELETE FROM api_key WHERE user_id = $1', [userId]);
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    describe('signed-out pages are public and set no cookie', () => {
        it.each(['/', '/sets', cardPage, '/auth/login'])('GET %s', async (path) => {
            const res = await request(app.getHttpServer()).get(path).expect(200);
            expect(res.headers['cache-control']).toMatch(/^public, max-age=\d+/);
            expect(res.headers['set-cookie']).toBeUndefined();
        });
    });

    describe('signed-in responses are never public', () => {
        it('card page with the web login cookie', async () => {
            const res = await request(app.getHttpServer())
                .get(cardPage)
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.headers['cache-control']).toBe('private, no-store');
        });

        it('API inventory with a mobile bearer token', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/inventory')
                .set('Authorization', bearerToken)
                .expect(200);
            expect(res.headers['cache-control']).toBe('private, no-store');
        });

        it('API inventory with an MCP API key', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/inventory')
                .set('Authorization', `Bearer ${apiKey}`)
                .expect(200);
            expect(res.headers['cache-control']).toBe('private, no-store');
        });
    });

    it('a missing card returns no cache header, so the edge default TTL of 0 applies', async () => {
        const res = await request(app.getHttpServer()).get(`/card/${TEST_CARD_SET_CODE}/99999`);
        expect(res.status).toBe(404);
        expect(res.headers['cache-control']).toBeUndefined();
    });
});
