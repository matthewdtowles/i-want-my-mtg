import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp, TEST_USER } from './setup';

const MUTATION_USER = {
    email: 'mutation@test.com',
    password: 'TestPass1!',
};

describe('User API (e2e)', () => {
    let app: INestApplication;
    let bearerToken: string;
    let mutationBearerToken: string;

    async function loginApi(
        testApp: INestApplication,
        credentials: { email: string; password: string }
    ): Promise<string> {
        const res = await request(testApp.getHttpServer())
            .post('/api/v1/auth/login')
            .send(credentials)
            .expect(200);

        const token = res.body?.data?.accessToken;
        if (!token) {
            throw new Error('API login did not return access token');
        }
        return `Bearer ${token}`;
    }

    beforeAll(async () => {
        app = await createTestApp();
        bearerToken = await loginApi(app, TEST_USER);
        mutationBearerToken = await loginApi(app, MUTATION_USER);
    }, 30000);

    afterAll(async () => {
        await closeTestApp(app);
    });

    describe('Auth guard enforcement', () => {
        it('GET /api/v1/user without auth returns 401', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/user').expect(401);

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
        it('updates user name', async () => {
            const res = await request(app.getHttpServer())
                .patch('/api/v1/user')
                .set('Authorization', mutationBearerToken)
                .send({ name: 'Updated Name', email: MUTATION_USER.email })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('name', 'Updated Name');
            expect(res.body.data).toHaveProperty('email', MUTATION_USER.email);
        });
    });

    describe('PATCH /api/v1/user/password', () => {
        it('updates password', async () => {
            const res = await request(app.getHttpServer())
                .patch('/api/v1/user/password')
                .set('Authorization', mutationBearerToken)
                .send({ password: 'NewTestPass1!' })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('updated', true);
        });
    });

    // Note: DELETE /api/v1/user is not tested because it would
    // delete the test user and break subsequent test suites.
    // It could be tested in isolation with a dedicated test user.
});
