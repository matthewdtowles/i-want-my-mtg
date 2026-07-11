import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    closeTestApp,
    createTestApp,
    getTestUserId,
    loginTestUserApi,
    TEST_CARD_ID,
    TEST_SET_CODE,
} from './setup';

describe('Buy List API (e2e)', () => {
    let app: INestApplication;
    let bearerToken: string;
    let userId: number;

    const clearBuyList = async () => {
        const ds = app.get(DataSource);
        if (ds?.isInitialized) {
            await ds.query(`DELETE FROM buy_list WHERE user_id = $1`, [userId]);
        }
    };

    beforeAll(async () => {
        app = await createTestApp();
        bearerToken = await loginTestUserApi(app);
        userId = await getTestUserId(app);
    }, 30000);

    afterEach(async () => {
        await clearBuyList();
    });

    afterAll(async () => {
        try {
            await clearBuyList();
        } catch {
            // best-effort
        }
        await closeTestApp(app);
    });

    describe('Auth guard', () => {
        it('GET without auth returns 401', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/buy-list').expect(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Delta-quantity adjust endpoint', () => {
        const adjust = (delta: number, isFoil = false) =>
            request(app.getHttpServer())
                .patch('/api/v1/buy-list/adjust')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil, delta });

        it('creates the item on a positive delta and accumulates', async () => {
            const first = await adjust(2).expect(200);
            expect(first.body.data).toMatchObject({
                cardId: TEST_CARD_ID,
                isFoil: false,
                quantity: 2,
            });

            const second = await adjust(1).expect(200);
            expect(second.body.data.quantity).toBe(3);
        });

        it('removes the item when the result reaches 0 and clamps below 0', async () => {
            await adjust(2).expect(200);

            const removed = await adjust(-5).expect(200);
            expect(removed.body.data.quantity).toBe(0);

            const list = await request(app.getHttpServer())
                .get('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .expect(200);
            expect(list.body.data).toHaveLength(0);

            // Decrementing a missing item stays at 0 and does not create a row.
            const again = await adjust(-1).expect(200);
            expect(again.body.data.quantity).toBe(0);
        });

        it('serializes concurrent decrements (no lost updates)', async () => {
            await adjust(10).expect(200);

            await Promise.all([adjust(-1), adjust(-1), adjust(-1), adjust(-1)]);

            const res = await request(app.getHttpServer())
                .get('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .expect(200);
            expect(res.body.data[0].quantity).toBe(6);
        });
    });

    describe('CRUD', () => {
        it('POST adds a card (increments on repeat) and GET lists it', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil: false, quantity: 2 })
                .expect(200);

            // Second add of the same (card, finish) increments rather than duplicating.
            await request(app.getHttpServer())
                .post('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil: false, quantity: 3 })
                .expect(200);

            const res = await request(app.getHttpServer())
                .get('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0]).toMatchObject({
                cardId: TEST_CARD_ID,
                isFoil: false,
                quantity: 5,
            });
            expect(res.body.data[0].cardName).toBeDefined();
            // findByUser joins the latest price, so the list carries prices.
            expect(res.body.data[0].priceNormal).toBe(5);
        });

        it('PATCH sets an absolute quantity; quantity 0 removes the item', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil: true, quantity: 1 })
                .expect(200);

            await request(app.getHttpServer())
                .patch('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil: true, quantity: 4 })
                .expect(200);

            let res = await request(app.getHttpServer())
                .get('/api/v1/buy-list')
                .set('Authorization', bearerToken);
            expect(res.body.data[0].quantity).toBe(4);

            await request(app.getHttpServer())
                .patch('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil: true, quantity: 0 })
                .expect(200);

            res = await request(app.getHttpServer())
                .get('/api/v1/buy-list')
                .set('Authorization', bearerToken);
            expect(res.body.data).toHaveLength(0);
        });

        it('DELETE removes a card', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil: false })
                .expect(200);

            await request(app.getHttpServer())
                .delete('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil: false })
                .expect(200);

            const res = await request(app.getHttpServer())
                .get('/api/v1/buy-list')
                .set('Authorization', bearerToken);
            expect(res.body.data).toHaveLength(0);
        });

        it('normal and foil of the same card are distinct rows', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil: false, quantity: 1 })
                .expect(200);
            await request(app.getHttpServer())
                .post('/api/v1/buy-list')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, isFoil: true, quantity: 1 })
                .expect(200);

            const res = await request(app.getHttpServer())
                .get('/api/v1/buy-list')
                .set('Authorization', bearerToken);
            expect(res.body.data).toHaveLength(2);
        });
    });

    describe('Bulk import', () => {
        it('adds resolvable CSV rows and reports unmatched ones', async () => {
            // Native CSV: header + a resolvable seed card (set+number) + a bogus row.
            const csv = [
                'name,set_code,number,quantity',
                `Test Angel,${TEST_SET_CODE},1,2`,
                'Definitely Not A Real Card,zzz,999,1',
            ].join('\n');

            const res = await request(app.getHttpServer())
                .post('/api/v1/buy-list/import')
                .set('Authorization', bearerToken)
                .send({ text: csv })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.saved).toBe(1);
            expect(res.body.data.errors).toHaveLength(1);

            const list = await request(app.getHttpServer())
                .get('/api/v1/buy-list')
                .set('Authorization', bearerToken);
            expect(list.body.data).toHaveLength(1);
            expect(list.body.data[0].quantity).toBe(2);
        });

        it('rejects CSV with unknown columns as 400', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/buy-list/import')
                .set('Authorization', bearerToken)
                .send({ text: 'name,bogus_column\nFoo,1' })
                .expect(400);
        });
    });
});
