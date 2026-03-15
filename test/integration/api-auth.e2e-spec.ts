import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp, TEST_USER } from './setup';

describe('Auth API (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    }, 30000);

    afterAll(async () => {
        await closeTestApp(app);
    });

    describe('POST /api/v1/auth/login', () => {
        it('returns access token with valid credentials', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({ email: TEST_USER.email, password: TEST_USER.password })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('accessToken');
            expect(typeof res.body.data.accessToken).toBe('string');
            expect(res.body.data.accessToken.length).toBeGreaterThan(0);
        });

        it('returns 401 with invalid credentials', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({ email: 'wrong@test.com', password: 'WrongPass1!' })
                .expect(401);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });

        it('returns 401 with wrong password', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({ email: TEST_USER.email, password: 'WrongPass1!' })
                .expect(401);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });

        it('returned token can be used for authenticated endpoints', async () => {
            const loginRes = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({ email: TEST_USER.email, password: TEST_USER.password })
                .expect(200);

            const token = loginRes.body.data.accessToken;

            const userRes = await request(app.getHttpServer())
                .get('/api/v1/user')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(userRes.body.success).toBe(true);
            expect(userRes.body.data).toHaveProperty('email', TEST_USER.email);
        });
    });
});
