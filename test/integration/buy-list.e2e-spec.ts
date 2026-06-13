import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    closeTestApp,
    createTestApp,
    loginTestUserApi,
    TEST_CARD_ID,
    TEST_SET_CODE,
} from './setup';

describe('Buy List API (e2e)', () => {
    let app: INestApplication;
    let bearerToken: string;

    const clearBuyList = async () => {
        const ds = app.get(DataSource);
        if (ds?.isInitialized) {
            await ds.query(`DELETE FROM buy_list WHERE user_id = 1`);
        }
    };

    beforeAll(async () => {
        app = await createTestApp();
        bearerToken = await loginTestUserApi(app);
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
