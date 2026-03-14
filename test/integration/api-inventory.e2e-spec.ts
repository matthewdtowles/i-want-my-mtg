import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, closeTestApp, loginTestUserApi, TEST_CARD_ID, TEST_CARD_ID_2 } from './setup';

describe('Inventory API (e2e)', () => {
    let app: INestApplication;
    let bearerToken: string;

    beforeAll(async () => {
        app = await createTestApp();
        bearerToken = await loginTestUserApi(app);
    }, 30000);

    afterAll(async () => {
        try {
            const ds = app.get(DataSource);
            if (ds?.isInitialized) {
                await ds.query(`DELETE FROM inventory WHERE user_id = 1`);
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    describe('Auth guard enforcement', () => {
        it('GET /api/v1/inventory without auth returns 401', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/inventory')
                .expect(401);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });

        it('POST /api/v1/inventory without auth returns 401', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .send([{ cardId: TEST_CARD_ID, quantity: 1, isFoil: false }])
                .expect(401);

            expect(res.body.success).toBe(false);
        });
    });

    describe('CRUD operations', () => {
        it('POST /api/v1/inventory creates inventory items', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', bearerToken)
                .send([{ cardId: TEST_CARD_ID, quantity: 3, isFoil: false }])
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].cardId).toBe(TEST_CARD_ID);
            expect(res.body.data[0].quantity).toBe(3);
            expect(res.body.data[0].isFoil).toBe(false);
        });

        it('GET /api/v1/inventory returns paginated inventory', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/inventory')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.meta).toBeDefined();
            expect(res.body.meta).toHaveProperty('page');
            expect(res.body.meta).toHaveProperty('total');

            const item = res.body.data.find((i: any) => i.cardId === TEST_CARD_ID);
            expect(item).toBeDefined();
            expect(item).toHaveProperty('cardName');
            expect(item).toHaveProperty('setCode');
            expect(item).toHaveProperty('cardNumber');
        });

        it('PATCH /api/v1/inventory updates inventory items', async () => {
            const res = await request(app.getHttpServer())
                .patch('/api/v1/inventory')
                .set('Authorization', bearerToken)
                .send([{ cardId: TEST_CARD_ID, quantity: 5, isFoil: false }])
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data[0].quantity).toBe(5);
        });

        it('DELETE /api/v1/inventory deletes inventory item', async () => {
            const res = await request(app.getHttpServer())
                .delete('/api/v1/inventory')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil: false })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('deleted', true);
        });
    });

    describe('Pagination', () => {
        beforeAll(async () => {
            // Add two items for pagination testing
            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', bearerToken)
                .send([
                    { cardId: TEST_CARD_ID, quantity: 1, isFoil: false },
                    { cardId: TEST_CARD_ID_2, quantity: 2, isFoil: false },
                ])
                .expect(201);
        });

        it('supports page and limit parameters', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/inventory?page=1&limit=1')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.data.length).toBeLessThanOrEqual(1);
            expect(res.body.meta.page).toBe(1);
            expect(res.body.meta.limit).toBe(1);
        });
    });
});
