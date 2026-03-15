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

describe('Transactions API (e2e)', () => {
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
                await ds.query(`DELETE FROM "transaction" WHERE user_id = 1`);
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    describe('Auth guard enforcement', () => {
        it('GET /api/v1/transactions without auth returns 401', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/transactions').expect(401);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('CRUD operations', () => {
        let transactionId: number;

        it('POST /api/v1/transactions creates a BUY transaction', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/transactions')
                .set('Authorization', bearerToken)
                .send({
                    cardId: TEST_CARD_ID,
                    type: 'BUY',
                    quantity: 3,
                    pricePerUnit: 2.5,
                    isFoil: false,
                    date: new Date().toISOString().split('T')[0],
                    source: 'API Test',
                    skipInventorySync: true,
                })
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data).toHaveProperty('cardId', TEST_CARD_ID);
            expect(res.body.data).toHaveProperty('type', 'BUY');
            expect(res.body.data).toHaveProperty('quantity', 3);
            expect(res.body.data).toHaveProperty('pricePerUnit', 2.5);
            expect(res.body.data).toHaveProperty('isFoil', false);
            expect(res.body.data).toHaveProperty('date');
            expect(res.body.data).toHaveProperty('editable');
            transactionId = res.body.data.id;
        });

        it('GET /api/v1/transactions lists transactions with card info', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/transactions')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);

            const txn = res.body.data.find((t: any) => t.id === transactionId);
            expect(txn).toBeDefined();
            expect(txn).toHaveProperty('cardName');
            expect(txn).toHaveProperty('setCode');
        });

        it('PUT /api/v1/transactions/:id updates the transaction', async () => {
            const res = await request(app.getHttpServer())
                .put(`/api/v1/transactions/${transactionId}`)
                .set('Authorization', bearerToken)
                .send({ quantity: 5, notes: 'Updated via API' })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.quantity).toBe(5);
            expect(res.body.data.notes).toBe('Updated via API');
        });

        it('DELETE /api/v1/transactions/:id deletes the transaction', async () => {
            const res = await request(app.getHttpServer())
                .delete(`/api/v1/transactions/${transactionId}`)
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('deleted', true);
        });
    });

    describe('Cost basis', () => {
        beforeAll(async () => {
            // Create a BUY transaction for cost basis testing
            await request(app.getHttpServer())
                .post('/api/v1/transactions')
                .set('Authorization', bearerToken)
                .send({
                    cardId: TEST_CARD_ID_2,
                    type: 'BUY',
                    quantity: 4,
                    pricePerUnit: 1.5,
                    isFoil: false,
                    date: new Date().toISOString().split('T')[0],
                    skipInventorySync: true,
                })
                .expect(201);
        });

        it('GET /api/v1/transactions/cost-basis/:cardId returns cost basis', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/transactions/cost-basis/${TEST_CARD_ID_2}`)
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('totalCost');
            expect(res.body.data).toHaveProperty('totalQuantity');
            expect(res.body.data).toHaveProperty('averageCost');
            expect(res.body.data).toHaveProperty('unrealizedGain');
            expect(res.body.data).toHaveProperty('realizedGain');
        });

        it('supports isFoil query parameter', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/transactions/cost-basis/${TEST_CARD_ID_2}?isFoil=false`)
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.totalQuantity).toBe(4);
        });
    });

    describe('Validation', () => {
        it('rejects invalid transaction type', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/transactions')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, type: 'INVALID' })
                .expect(400);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });
    });
});
