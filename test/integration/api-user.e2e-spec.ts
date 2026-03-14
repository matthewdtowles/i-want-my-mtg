import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp, loginTestUserApi, TEST_USER } from './setup';

describe('User API (e2e)', () => {
    let app: INestApplication;
    let bearerToken: string;

    beforeAll(async () => {
        app = await createTestApp();
        bearerToken = await loginTestUserApi(app);
    }, 30000);

    afterAll(async () => {
        await closeTestApp(app);
    });

    describe('Auth guard enforcement', () => {
        it('GET /api/v1/user without auth returns 401', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/user')
                .expect(401);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/v1/user', () => {
        it('returns current user profile', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/user')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data).toHaveProperty('email', TEST_USER.email);
            expect(res.body.data).toHaveProperty('name');
            expect(res.body.data).toHaveProperty('role');
            // Should not expose password hash
            expect(res.body.data).not.toHaveProperty('password');
            expect(res.body.data).not.toHaveProperty('passwordHash');
        });
    });

    describe('PATCH /api/v1/user', () => {
        const originalName = 'IntegTestUser';

        it('updates user name', async () => {
            const res = await request(app.getHttpServer())
                .patch('/api/v1/user')
                .set('Authorization', bearerToken)
                .send({ name: 'Updated Name', email: TEST_USER.email })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('name', 'Updated Name');
            expect(res.body.data).toHaveProperty('email', TEST_USER.email);
        });

        afterAll(async () => {
            // Restore original name
            await request(app.getHttpServer())
                .patch('/api/v1/user')
                .set('Authorization', bearerToken)
                .send({ name: originalName, email: TEST_USER.email })
                .expect(200);
        });
    });

    describe('PATCH /api/v1/user/password', () => {
        it('updates password', async () => {
            const res = await request(app.getHttpServer())
                .patch('/api/v1/user/password')
                .set('Authorization', bearerToken)
                .send({ password: 'NewTestPass1!' })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('updated', true);
        });

        afterAll(async () => {
            // Restore original password so other tests can still login
            await request(app.getHttpServer())
                .patch('/api/v1/user/password')
                .set('Authorization', bearerToken)
                .send({ password: TEST_USER.password })
                .expect(200);
        });
    });

    // Note: DELETE /api/v1/user is not tested because it would
    // delete the test user and break subsequent test suites.
    // It could be tested in isolation with a dedicated test user.
});
