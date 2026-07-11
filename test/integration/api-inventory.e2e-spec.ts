import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    closeTestApp,
    loginTestUserApi,
    TEST_CARD_ID,
    TEST_CARD_ID_2,
} from './setup';

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
            const res = await request(app.getHttpServer()).get('/api/v1/inventory').expect(401);

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
            expect(item).toHaveProperty('imgSrc');
            expect(item).toHaveProperty('rarity');
            expect(item).toHaveProperty('keyruneCode');
            expect(item).toHaveProperty('url');
            expect(item).toHaveProperty('hasNonFoil');
            expect(item).toHaveProperty('hasFoil');
            expect(item).toHaveProperty('tags');
            // priceNormal/priceFoil may be null but should be present
            expect(item).toHaveProperty('priceNormal');
            expect(item).toHaveProperty('priceFoil');
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

    describe('Delta-quantity adjust endpoint', () => {
        const clear = async () => {
            const ds = app.get(DataSource);
            await ds.query(`DELETE FROM inventory WHERE user_id = 1 AND card_id = $1`, [
                TEST_CARD_ID_2,
            ]);
        };

        beforeEach(clear);
        afterEach(clear);

        const adjust = (delta: number) =>
            request(app.getHttpServer())
                .patch('/api/v1/inventory/adjust')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID_2, isFoil: false, delta });

        it('creates the holding on a positive delta and accumulates', async () => {
            const first = await adjust(2).expect(200);
            expect(first.body.data).toMatchObject({
                cardId: TEST_CARD_ID_2,
                isFoil: false,
                quantity: 2,
            });

            const second = await adjust(3).expect(200);
            expect(second.body.data.quantity).toBe(5);
        });

        it('removes the holding when the result reaches 0 and clamps below 0', async () => {
            await adjust(2).expect(200);

            const removed = await adjust(-2).expect(200);
            expect(removed.body.data.quantity).toBe(0);

            const ds = app.get(DataSource);
            const rows = await ds.query(
                `SELECT quantity FROM inventory WHERE user_id = 1 AND card_id = $1`,
                [TEST_CARD_ID_2]
            );
            expect(rows).toHaveLength(0);

            // Decrementing a missing holding stays at 0 and does not create a row.
            const again = await adjust(-1).expect(200);
            expect(again.body.data.quantity).toBe(0);
        });

        it('serializes concurrent adjustments (no lost updates)', async () => {
            await adjust(10).expect(200);

            await Promise.all([adjust(-1), adjust(-1), adjust(-1), adjust(-1)]);

            const ds = app.get(DataSource);
            const rows = await ds.query(
                `SELECT quantity FROM inventory WHERE user_id = 1 AND card_id = $1`,
                [TEST_CARD_ID_2]
            );
            expect(rows[0].quantity).toBe(6);
        });

        it('rejects a non-integer delta', async () => {
            await request(app.getHttpServer())
                .patch('/api/v1/inventory/adjust')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID_2, isFoil: false, delta: 1.5 })
                .expect(400);
        });
    });

    describe('Batch quantities endpoint', () => {
        it('GET /api/v1/inventory/quantities without auth returns 401', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/inventory/quantities?cardIds=${TEST_CARD_ID}`)
                .expect(401);

            expect(res.body.success).toBe(false);
        });

        it('GET /api/v1/inventory/quantities returns quantities for card IDs', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/inventory/quantities?cardIds=${TEST_CARD_ID}`)
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            if (res.body.data.length > 0) {
                const item = res.body.data[0];
                expect(item).toHaveProperty('cardId');
                expect(item).toHaveProperty('foilQuantity');
                expect(item).toHaveProperty('normalQuantity');
            }
        });

        it('returns empty array for card IDs not in inventory', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/inventory/quantities?cardIds=nonexistent-card-id')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
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
