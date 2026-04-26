import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp, loginTestUser, TEST_USER, TEST_CARD_ID } from './setup';

describe('Auth and Inventory (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    }, 30000);

    afterAll(async () => {
        await closeTestApp(app);
    });

    describe('Auth flow', () => {
        it('GET /auth/login returns 200 with login form', async () => {
            const res = await request(app.getHttpServer()).get('/auth/login').expect(200);
            expect(res.text).toContain('login');
        });

        it('GET /user/create returns 200 with registration form', async () => {
            const res = await request(app.getHttpServer()).get('/user/create').expect(200);
            expect(res.text).toContain('create');
        });

        it('POST /auth/login with invalid credentials does not set auth cookie', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'wrong@test.com', password: 'WrongPass1!' })
                .expect(401);
            const cookies = res.headers['set-cookie'] || [];
            const authCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
                c?.startsWith('authorization=')
            );
            expect(authCookie).toBeUndefined();
        });

        it('POST /auth/login with valid credentials sets auth cookie and redirects', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: TEST_USER.email, password: TEST_USER.password })
                .expect(302);
            expect(res.headers.location).toBe('/user');
            const cookies = res.headers['set-cookie'];
            const authCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
                c?.startsWith('authorization=')
            );
            expect(authCookie).toBeDefined();
        });

        it('POST /auth/logout clears the auth cookie', async () => {
            const res = await request(app.getHttpServer()).post('/auth/logout').expect(302);
            const cookies = res.headers['set-cookie'] || [];
            const clearCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
                (c: string) =>
                    c?.startsWith('authorization=') &&
                    (c.includes('Expires=') ||
                        c.includes('Max-Age=0') ||
                        c.includes('authorization=;'))
            );
            expect(clearCookie).toBeDefined();
        });
    });

    describe('Authenticated access', () => {
        let authCookie: string;

        beforeAll(async () => {
            authCookie = await loginTestUser(app);
        });

        it('GET /user returns 200 with profile', async () => {
            const res = await request(app.getHttpServer())
                .get('/user')
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.text).toContain(TEST_USER.email);
        });

        it('GET /inventory returns 200', () => {
            return request(app.getHttpServer())
                .get('/inventory')
                .set('Cookie', authCookie)
                .expect(200);
        });

        it('GET /portfolio returns 200', () => {
            return request(app.getHttpServer())
                .get('/portfolio')
                .set('Cookie', authCookie)
                .expect(200);
        });
    });

    describe('Inventory CRUD', () => {
        let authCookie: string;

        beforeAll(async () => {
            authCookie = await loginTestUser(app);
        });

        it('POST /inventory creates inventory item', async () => {
            const res = await request(app.getHttpServer())
                .post('/inventory')
                .set('Cookie', authCookie)
                .set('Content-Type', 'application/json')
                .send([{ cardId: TEST_CARD_ID, quantity: 2, isFoil: false, userId: 1 }])
                .expect(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].cardId).toBe(TEST_CARD_ID);
        });

        it('PATCH /inventory updates inventory item', async () => {
            const res = await request(app.getHttpServer())
                .patch('/inventory')
                .set('Cookie', authCookie)
                .set('Content-Type', 'application/json')
                .send([{ cardId: TEST_CARD_ID, quantity: 4, isFoil: false, userId: 1 }])
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data[0].quantity).toBe(4);
        });

        it('DELETE /inventory deletes inventory item', async () => {
            const res = await request(app.getHttpServer())
                .delete('/inventory')
                .set('Cookie', authCookie)
                .set('Content-Type', 'application/json')
                .send({ cardId: TEST_CARD_ID, isFoil: false })
                .expect(200);
            expect(res.body.success).toBe(true);
        });
    });
});
