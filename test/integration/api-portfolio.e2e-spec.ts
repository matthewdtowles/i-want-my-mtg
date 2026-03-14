import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, closeTestApp, loginTestUserApi, TEST_CARD_ID, TEST_CARD_ID_2 } from './setup';

describe('Portfolio API (e2e)', () => {
    let app: INestApplication;
    let bearerToken: string;

    beforeAll(async () => {
        app = await createTestApp();
        bearerToken = await loginTestUserApi(app);

        // Seed transactions and inventory for portfolio computation
        const today = new Date();
        const lots = [
            { cardId: TEST_CARD_ID, daysAgo: 14, quantity: 2, pricePerUnit: 3.0 },
            { cardId: TEST_CARD_ID_2, daysAgo: 7, quantity: 3, pricePerUnit: 1.0 },
        ];

        for (const lot of lots) {
            const date = new Date(today);
            date.setDate(date.getDate() - lot.daysAgo);
            await request(app.getHttpServer())
                .post('/api/v1/transactions')
                .set('Authorization', bearerToken)
                .send({
                    cardId: lot.cardId,
                    type: 'BUY',
                    quantity: lot.quantity,
                    pricePerUnit: lot.pricePerUnit,
                    isFoil: false,
                    date: date.toISOString().split('T')[0],
                    skipInventorySync: true,
                })
                .expect(201);
        }

        // Create inventory entries
        await request(app.getHttpServer())
            .post('/api/v1/inventory')
            .set('Authorization', bearerToken)
            .send([
                { cardId: TEST_CARD_ID, quantity: 2, isFoil: false },
                { cardId: TEST_CARD_ID_2, quantity: 3, isFoil: false },
            ])
            .expect(201);
    }, 30000);

    afterAll(async () => {
        try {
            const ds = app.get(DataSource);
            if (ds?.isInitialized) {
                await ds.query(`DELETE FROM "transaction" WHERE user_id = 1`);
                await ds.query(`DELETE FROM inventory WHERE user_id = 1`);
                await ds.query(`DELETE FROM portfolio_card_performance WHERE user_id = 1`);
                await ds.query(`DELETE FROM portfolio_summary WHERE user_id = 1`);
                await ds.query(`DELETE FROM portfolio_value_history WHERE user_id = 1`);
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    describe('Auth guard enforcement', () => {
        it('GET /api/v1/portfolio without auth returns 401', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/portfolio')
                .expect(401);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/v1/portfolio', () => {
        it('returns portfolio summary (may be null before refresh)', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/portfolio')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            // data may be null if no refresh has been done yet
        });
    });

    describe('POST /api/v1/portfolio/refresh', () => {
        it('refreshes portfolio summary', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/portfolio/refresh')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('refreshed', true);
        });

        it('GET /api/v1/portfolio returns summary data after refresh', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/portfolio')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            if (res.body.data) {
                expect(res.body.data).toHaveProperty('totalValue');
                expect(res.body.data).toHaveProperty('totalCost');
                expect(res.body.data).toHaveProperty('totalCards');
                expect(res.body.data).toHaveProperty('totalQuantity');
                expect(res.body.data).toHaveProperty('computedAt');
            }
        });
    });

    describe('GET /api/v1/portfolio/history', () => {
        it('returns portfolio history', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/portfolio/history')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('supports days parameter', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/portfolio/history?days=7')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /api/v1/portfolio/performance', () => {
        it('returns card performance data', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/portfolio/performance')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('supports type and limit parameters', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/portfolio/performance?type=worst&limit=5')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /api/v1/portfolio/cash-flow', () => {
        it('returns cash flow periods', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/portfolio/cash-flow')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /api/v1/portfolio/realized-gains', () => {
        it('returns realized gains', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/portfolio/realized-gains')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('totalRealizedGain');
            expect(typeof res.body.data.totalRealizedGain).toBe('number');
        });
    });
});
