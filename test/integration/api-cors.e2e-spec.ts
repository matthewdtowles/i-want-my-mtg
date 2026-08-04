import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { closeTestApp, createTestApp, loginTestUser, TEST_SET_CODE } from './setup';

/**
 * CORS is scoped to the public API and is deliberately uncredentialed: `/api/v1`
 * also accepts the session cookie the HBS frontend uses, so granting credentialed
 * cross-origin requests would expose every authenticated route to CSRF.
 */
describe('API CORS (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    }, 30000);

    afterAll(async () => {
        await closeTestApp(app);
    });

    it('answers a preflight with 204 and the expected headers', async () => {
        const res = await request(app.getHttpServer())
            .options('/api/v1/sets')
            .set('Origin', 'https://example.com')
            .set('Access-Control-Request-Method', 'GET')
            .expect(204);

        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-methods']).toContain('GET');
        expect(res.headers['access-control-allow-methods']).toContain('OPTIONS');
        expect(res.headers['access-control-allow-headers']).toContain('Authorization');
        expect(res.headers['access-control-allow-headers']).toContain('X-API-Key');
        expect(res.headers['access-control-expose-headers']).toContain('X-RateLimit-Remaining');
    });

    it('allows a plain cross-origin GET', async () => {
        const res = await request(app.getHttpServer())
            .get(`/api/v1/sets/${TEST_SET_CODE}`)
            .set('Origin', 'https://example.com')
            .expect(200);

        expect(res.headers['access-control-allow-origin']).toBe('*');
    });

    it('does not grant credentials to a cross-origin request carrying a cookie', async () => {
        const cookie = await loginTestUser(app);
        const res = await request(app.getHttpServer())
            .get('/api/v1/user')
            .set('Origin', 'https://example.com')
            .set('Cookie', cookie);

        expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    });

    it('leaves the HBS routes without CORS headers', async () => {
        const res = await request(app.getHttpServer())
            .get('/')
            .set('Origin', 'https://example.com')
            .expect(200);

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});
