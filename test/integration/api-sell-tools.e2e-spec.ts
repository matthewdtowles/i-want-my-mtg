import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    closeTestApp,
    createTestApp,
    getTestUserId,
    loginTestUserApi,
    TEST_CARD_ID,
    TEST_CARD_ID_4,
} from './setup';

/**
 * JSON API for the Phase 6 sell tools (#530): buylist pricing, market sell
 * value, and the cash-vs-credit optimizer. Same backends as the HBS pages.
 *
 * Seeded buylist (global): card 1 CK $3.50 / cardsphere $3.25 normal, CK $7.00
 * foil. Per-user setup: own card 1 normal x4 + foil x1 (CK cash C = $21.00);
 * buy-list card 4 x2 at retail $20.00 (R = $40.00).
 */
describe('Sell-tools API (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;
    let bearerToken: string;
    let userId: number;

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        bearerToken = await loginTestUserApi(app);
        userId = await getTestUserId(app);

        await ds.query(`DELETE FROM inventory WHERE user_id = $1`, [userId]);
        await ds.query(`DELETE FROM buy_list WHERE user_id = $1`, [userId]);
        await ds.query(
            `INSERT INTO inventory (user_id, card_id, foil, quantity)
             VALUES ($1, $2, false, 4), ($1, $2, true, 1)`,
            [userId, TEST_CARD_ID]
        );
        await ds.query(
            `INSERT INTO buy_list (user_id, card_id, foil, quantity) VALUES ($1, $2, false, 2)`,
            [userId, TEST_CARD_ID_4]
        );
    }, 30000);

    afterAll(async () => {
        await ds.query(`DELETE FROM inventory WHERE user_id = $1`, [userId]);
        await ds.query(`DELETE FROM buy_list WHERE user_id = $1`, [userId]);
        await closeTestApp(app);
    });

    describe('GET /api/v1/cards/:setCode/:number/buylist', () => {
        it('returns offers grouped by finish, best first, with raw numbers', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/cards/tst/1/buylist')
                .expect(200);

            expect(res.body.success).toBe(true);
            const data = res.body.data;
            expect(data.hasAny).toBe(true);
            expect(data.finishes.map((f: any) => f.finish)).toEqual(['normal', 'foil']);

            const normal = data.finishes[0];
            expect(normal.best).toEqual({
                provider: 'cardkingdom',
                vendor: 'Card Kingdom',
                price: 3.5,
                isBest: true,
            });
            // The seeded retail row for card 1 must not leak into buylist offers.
            expect(normal.offers).toHaveLength(2);
            expect(normal.offers[1]).toEqual({
                provider: 'cardsphere',
                vendor: 'Cardsphere',
                price: 3.25,
                isBest: false,
            });
            expect(data.finishes[1].best.price).toBe(7);
        });

        it('returns the same data by card id', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/cards/${TEST_CARD_ID}/buylist`)
                .expect(200);
            expect(res.body.data.finishes[0].best.price).toBe(3.5);
        });

        it('returns hasAny=false for a card with no buylist offers', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/cards/tst/4/buylist')
                .expect(200);
            expect(res.body.data.hasAny).toBe(false);
            expect(res.body.data.finishes).toEqual([]);
        });

        it('404s for an unknown card', async () => {
            await request(app.getHttpServer()).get('/api/v1/cards/tst/9999/buylist').expect(404);
        });
    });

    describe('GET /api/v1/inventory/sell', () => {
        it('requires authentication', async () => {
            await request(app.getHttpServer()).get('/api/v1/inventory/sell').expect(401);
        });

        it('returns the market sell value plan grouped by vendor', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/inventory/sell')
                .set('Authorization', bearerToken)
                .expect(200);

            const data = res.body.data;
            expect(data.totalPayout).toBe(21); // 4*3.50 + 1*7.00
            expect(data.itemsWithOffers).toBe(2);
            expect(data.itemsWithoutOffers).toBe(0);
            expect(data.groups).toHaveLength(1);
            expect(data.groups[0].provider).toBe('cardkingdom');
            expect(data.groups[0].vendor).toBe('Card Kingdom');
            expect(data.groups[0].payout).toBe(21);

            const normalItem = data.groups[0].items.find((i: any) => i.finish === 'normal');
            expect(normalItem.offer).toBe(3.5);
            expect(normalItem.ownedQuantity).toBe(4);
            expect(normalItem.sellableQuantity).toBe(4);
            expect(normalItem.payout).toBe(14);
        });
    });

    describe('GET /api/v1/optimizer', () => {
        it('requires authentication', async () => {
            await request(app.getHttpServer()).get('/api/v1/optimizer').expect(401);
        });

        it('returns the cash-vs-credit recommendation at the default bonus', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/optimizer')
                .set('Authorization', bearerToken)
                .expect(200);

            const data = res.body.data;
            expect(data.vendor).toBe('Card Kingdom');
            expect(data.bonusPct).toBe(0.3);
            expect(data.cashValue).toBe(21);
            expect(data.buyListRetail).toBe(40);
            expect(data.storeCredit).toBe(27.3); // 21 * 1.3
            expect(data.recommendCredit).toBe(true);
            expect(data.buyLines).toHaveLength(1);
            expect(data.buyLines[0]).toEqual({
                name: 'Test Dragon',
                setCode: 'TST',
                number: '4',
                finish: 'normal',
                quantity: 2,
                unitPrice: 20,
                lineTotal: 40,
            });
        });

        it('honors a bonus override and clamps to the UI cap of 2.0', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/optimizer?bonus=0.5')
                .set('Authorization', bearerToken)
                .expect(200);
            expect(res.body.data.storeCredit).toBe(31.5); // 21 * 1.5

            const clamped = await request(app.getHttpServer())
                .get('/api/v1/optimizer?bonus=99')
                .set('Authorization', bearerToken)
                .expect(200);
            expect(clamped.body.data.bonusPct).toBe(2);
        });
    });
});
