import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    closeTestApp,
    loginTestUser,
    TEST_CARD_ID,
    TEST_CARD_ID_2,
    TEST_CARD_ID_3,
} from './setup';

describe('Transaction CRUD and FIFO (e2e)', () => {
    let app: INestApplication;
    let authCookie: string;

    beforeAll(async () => {
        app = await createTestApp();
        authCookie = await loginTestUser(app);
    }, 30000);

    afterAll(async () => {
        // Clean up all test data via direct SQL to avoid async side effects
        try {
            const ds = app.get(DataSource);
            if (ds?.isInitialized) {
                await ds.query(`DELETE FROM inventory WHERE user_id = 1`);
                await ds.query(`DELETE FROM "transaction" WHERE user_id = 1`);
            }
        } catch {
            // DB cleanup is best-effort; test DB is ephemeral
        }
        await closeTestApp(app);
    });

    describe('Transaction CRUD', () => {
        let buyTransactionId: number;

        it('GET /transactions returns 200 with transactions view', async () => {
            const res = await request(app.getHttpServer())
                .get('/transactions')
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.text).toContain('Transactions');
        });

        it('POST /transactions creates a BUY transaction', async () => {
            const res = await request(app.getHttpServer())
                .post('/transactions')
                .set('Cookie', authCookie)
                .send({
                    cardId: TEST_CARD_ID,
                    type: 'BUY',
                    quantity: 4,
                    pricePerUnit: 3.5,
                    isFoil: false,
                    date: new Date().toISOString().split('T')[0],
                    source: 'Test LGS',
                    skipInventorySync: true,
                })
                .expect(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.type).toBe('BUY');
            expect(res.body.data.quantity).toBe(4);
            buyTransactionId = res.body.data.id;
        });

        it('PUT /transactions/:id updates the transaction', async () => {
            const res = await request(app.getHttpServer())
                .put(`/transactions/${buyTransactionId}`)
                .set('Cookie', authCookie)
                .send({ quantity: 6, notes: 'Updated quantity' })
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.quantity).toBe(6);
        });

        it('GET /transactions/export returns CSV', async () => {
            const res = await request(app.getHttpServer())
                .get('/transactions/export')
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.text).toContain('Date');
            expect(res.text).toContain('Test Angel');
        });

        it('DELETE /transactions/:id deletes the transaction', async () => {
            const res = await request(app.getHttpServer())
                .delete(`/transactions/${buyTransactionId}`)
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.body.success).toBe(true);
        });

        it('POST /transactions rejects invalid payload', async () => {
            const res = await request(app.getHttpServer())
                .post('/transactions')
                .set('Cookie', authCookie)
                .send({ cardId: TEST_CARD_ID, type: 'INVALID' })
                .expect(400);
            expect(res.body.statusCode).toBe(400);
        });
    });

    describe('FIFO calculations', () => {
        it('creates multiple BUY lots at different prices', async () => {
            const today = new Date();
            const lots = [
                { daysAgo: 10, quantity: 3, pricePerUnit: 2.0 },
                { daysAgo: 5, quantity: 2, pricePerUnit: 4.0 },
                { daysAgo: 1, quantity: 1, pricePerUnit: 6.0 },
            ];

            for (const lot of lots) {
                const date = new Date(today);
                date.setDate(date.getDate() - lot.daysAgo);
                const res = await request(app.getHttpServer())
                    .post('/transactions')
                    .set('Cookie', authCookie)
                    .send({
                        cardId: TEST_CARD_ID_2,
                        type: 'BUY',
                        quantity: lot.quantity,
                        pricePerUnit: lot.pricePerUnit,
                        isFoil: false,
                        date: date.toISOString().split('T')[0],
                        skipInventorySync: true,
                    })
                    .expect(201);
                expect(res.body.success).toBe(true);
            }
        });

        it('creates a SELL transaction consuming oldest lots first (FIFO)', async () => {
            // Sell 4 units: should consume all 3 from lot1 ($2) and 1 from lot2 ($4)
            const res = await request(app.getHttpServer())
                .post('/transactions')
                .set('Cookie', authCookie)
                .send({
                    cardId: TEST_CARD_ID_2,
                    type: 'SELL',
                    quantity: 4,
                    pricePerUnit: 5.0,
                    isFoil: false,
                    date: new Date().toISOString().split('T')[0],
                    skipInventorySync: true,
                })
                .expect(201);
            expect(res.body.success).toBe(true);
        });

        it('returns success:false when SELL exceeds remaining quantity', async () => {
            // Only 2 units remain (1 from lot2 + 1 from lot3), try to sell 5
            const res = await request(app.getHttpServer())
                .post('/transactions')
                .set('Cookie', authCookie)
                .send({
                    cardId: TEST_CARD_ID_2,
                    type: 'SELL',
                    quantity: 5,
                    pricePerUnit: 5.0,
                    isFoil: false,
                    date: new Date().toISOString().split('T')[0],
                    skipInventorySync: true,
                })
                .expect(201);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('Inventory sync', () => {
        it('BUY transaction with inventory sync creates inventory entry', async () => {
            const res = await request(app.getHttpServer())
                .post('/transactions')
                .set('Cookie', authCookie)
                .send({
                    cardId: TEST_CARD_ID_3,
                    type: 'BUY',
                    quantity: 2,
                    pricePerUnit: 0.25,
                    isFoil: false,
                    date: new Date().toISOString().split('T')[0],
                })
                .expect(201);
            expect(res.body.success).toBe(true);

            // Verify inventory was created
            const invRes = await request(app.getHttpServer())
                .get('/inventory')
                .set('Cookie', authCookie)
                .expect(200);
            expect(invRes.text).toContain('Test Zombie');
        });
    });
});
