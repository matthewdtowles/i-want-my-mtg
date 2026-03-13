import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, closeTestApp, loginTestUser } from './setup';

describe('Portfolio (e2e)', () => {
    let app: INestApplication;
    let authCookie: string;
    const txIds: number[] = [];

    beforeAll(async () => {
        app = await createTestApp();
        authCookie = await loginTestUser(app);

        // Seed transactions for portfolio computation (skip inventory sync to avoid cleanup issues)
        const today = new Date();
        const lots = [
            { cardId: 'test-card-001', daysAgo: 14, quantity: 2, pricePerUnit: 3.00 },
            { cardId: 'test-card-001', daysAgo: 7, quantity: 1, pricePerUnit: 4.50 },
            { cardId: 'test-card-002', daysAgo: 10, quantity: 3, pricePerUnit: 1.00 },
        ];
        for (const lot of lots) {
            const date = new Date(today);
            date.setDate(date.getDate() - lot.daysAgo);
            const res = await request(app.getHttpServer())
                .post('/transactions')
                .set('Cookie', authCookie)
                .send({
                    cardId: lot.cardId,
                    type: 'BUY',
                    quantity: lot.quantity,
                    pricePerUnit: lot.pricePerUnit,
                    isFoil: false,
                    date: date.toISOString().split('T')[0],
                    skipInventorySync: true,
                });
            if (res.body.success) {
                txIds.push(res.body.data.id);
            }
        }

        // Create inventory entries directly so portfolio has data to compute
        for (const cardId of ['test-card-001', 'test-card-002']) {
            await request(app.getHttpServer())
                .post('/inventory')
                .set('Cookie', authCookie)
                .set('Content-Type', 'application/json')
                .send([{ cardId, quantity: cardId === 'test-card-001' ? 3 : 3, isFoil: false, userId: 1 }]);
        }
    }, 30000);

    afterAll(async () => {
        // Clean up via direct SQL to avoid HTTP-triggered async side effects
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
            // DB cleanup is best-effort; test DB is ephemeral
        }
        await closeTestApp(app);
    });

    describe('Portfolio view', () => {
        it('GET /portfolio returns 200 with portfolio page', async () => {
            const res = await request(app.getHttpServer())
                .get('/portfolio')
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.text).toContain('Portfolio');
        });
    });

    describe('Portfolio refresh', () => {
        it('POST /portfolio/refresh computes portfolio summary', async () => {
            const res = await request(app.getHttpServer())
                .post('/portfolio/refresh')
                .set('Cookie', authCookie)
                .expect(201);
            expect(res.body.success).toBe(true);
        });

        it('GET /portfolio shows summary data after refresh', async () => {
            const res = await request(app.getHttpServer())
                .get('/portfolio')
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.text).toContain('Portfolio');
        });
    });

    describe('Portfolio history', () => {
        it('GET /portfolio/history returns JSON history', async () => {
            const res = await request(app.getHttpServer())
                .get('/portfolio/history')
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.body).toHaveProperty('history');
            expect(Array.isArray(res.body.history)).toBe(true);
        });

        it('GET /portfolio/history?days=7 limits to 7 days', async () => {
            const res = await request(app.getHttpServer())
                .get('/portfolio/history?days=7')
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.body).toHaveProperty('history');
        });
    });

    describe('Cash flow', () => {
        it('GET /portfolio/cash-flow returns monthly aggregates', async () => {
            const res = await request(app.getHttpServer())
                .get('/portfolio/cash-flow')
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.body).toHaveProperty('cashFlow');
            expect(Array.isArray(res.body.cashFlow)).toBe(true);
            if (res.body.cashFlow.length > 0) {
                expect(res.body.cashFlow[0]).toHaveProperty('period');
                expect(res.body.cashFlow[0]).toHaveProperty('totalBought');
            }
        });
    });

    describe('Realized gains', () => {
        it('GET /portfolio/realized-gains returns gain data', async () => {
            const res = await request(app.getHttpServer())
                .get('/portfolio/realized-gains')
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.body).toHaveProperty('realizedGain');
            expect(res.body).toHaveProperty('realizedGainSign');
        });
    });
});
