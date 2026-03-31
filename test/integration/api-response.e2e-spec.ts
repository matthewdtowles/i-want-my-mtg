import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp, TEST_SET_CODE } from './setup';

/**
 * Validates that API success and error responses share the same
 * ApiResponseDto envelope shape - whether returned by a controller
 * or produced by HttpExceptionFilter.
 */
describe('API response envelope (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    }, 30000);

    afterAll(async () => {
        await closeTestApp(app);
    });

    it('GET /api/v1/sets/:code returns ApiResponseDto on success', async () => {
        const res = await request(app.getHttpServer())
            .get(`/api/v1/sets/${TEST_SET_CODE}`)
            .expect(200);

        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(res.body).not.toHaveProperty('error');
        expect(res.body.data).toHaveProperty('code', TEST_SET_CODE);
        expect(res.body.data).toHaveProperty('name');
    });

    it('GET /api/v1/sets/:code returns ApiResponseDto on 404', async () => {
        const res = await request(app.getHttpServer()).get('/api/v1/sets/NONEXISTENT').expect(404);

        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).not.toHaveProperty('statusCode');
        expect(res.body).not.toHaveProperty('timestamp');
    });

    it('GET /api/v1/inventory without auth returns ApiResponseDto on 401', async () => {
        const res = await request(app.getHttpServer())
            .get('/api/v1/inventory')
            .set('Accept', 'application/json')
            .expect(401);

        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
        expect(res.body).not.toHaveProperty('statusCode');
        expect(res.body).not.toHaveProperty('timestamp');
    });
});
