import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, closeTestApp } from './setup';

const MUTATION_USER = {
    email: 'mutation@test.com',
    password: 'TestPass1!',
};

const SEALED_UUID = '99999999-9999-4999-a999-999999999901';
const TEST_CARD_ID = '00000000-0000-4000-a000-000000000001';
const TEST_CARD_ID_2 = '00000000-0000-4000-a000-000000000002';
const TEST_SET_CODE = 'TST';
// One extra card seeded for the 5-alert-cap test (seed.sql only has 4 cards).
const EXTRA_CARD_ID = '00000000-0000-4000-a000-000000000005';
const ALERT_CARD_IDS = [
    '00000000-0000-4000-a000-000000000001',
    '00000000-0000-4000-a000-000000000002',
    '00000000-0000-4000-a000-000000000003',
    '00000000-0000-4000-a000-000000000004',
    EXTRA_CARD_ID,
];

/**
 * Integration coverage for freemium gating introduced in roadmap 3.4.
 * Toggles subscription state directly in Postgres for the mutation user
 * (no Stripe round-trip needed) and asserts the API surface enforces it.
 */
describe('Freemium gates (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;
    let userId: number;
    let bearer: string;

    async function loginApi(): Promise<string> {
        const res = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send(MUTATION_USER)
            .expect(200);
        return `Bearer ${res.body.data.accessToken}`;
    }

    async function setSubscribed(active: boolean): Promise<void> {
        await ds.query('DELETE FROM subscription WHERE user_id = $1', [userId]);
        if (active) {
            await ds.query(
                `INSERT INTO subscription (user_id, stripe_customer_id, stripe_subscription_id,
                    stripe_price_id, status, plan, current_period_end, cancel_at_period_end)
                 VALUES ($1, $2, $3, $4, 'active', 'monthly', NOW() + INTERVAL '30 days', false)`,
                [
                    userId,
                    `cus_test_${userId}`,
                    `sub_test_${userId}`,
                    `price_test_monthly_${userId}`,
                ]
            );
        }
    }

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        const rows = await ds.query(`SELECT id FROM users WHERE email = $1`, [MUTATION_USER.email]);
        userId = rows[0].id;
        bearer = await loginApi();

        // Seed a sealed product the mutation user can attempt to add to inventory
        await ds.query(
            `INSERT INTO sealed_product (uuid, name, set_code, category, subtype)
             VALUES ($1, 'Test Booster Box', $2, 'booster_box', 'collector')
             ON CONFLICT (uuid) DO NOTHING`,
            [SEALED_UUID, TEST_SET_CODE]
        );

        // Seed a 5th card so we can build up to the 5-alert free-tier cap
        await ds.query(
            `INSERT INTO card (id, artist, has_foil, has_non_foil, img_src, is_reserved, mana_cost,
                name, number, oracle_text, rarity, set_code, type, layout, is_alternative, sort_number, in_main)
             VALUES ($1, 'Test Artist', true, true, 'https://example.com/card5.jpg', false, '{G}',
                'Test Hydra', '5', 'Trample', 'rare', $2, 'Creature - Hydra', 'normal', false, '005', true)
             ON CONFLICT (id) DO NOTHING`,
            [EXTRA_CARD_ID, TEST_SET_CODE]
        );

        // Seed an old transaction (>30 days ago) and a recent one for the cap test
        await ds.query('DELETE FROM transaction WHERE user_id = $1', [userId]);
        await ds.query(
            `INSERT INTO transaction (user_id, card_id, type, quantity, price_per_unit, is_foil, date)
             VALUES ($1, $2, 'BUY', 1, 1.00, false, NOW() - INTERVAL '90 days'),
                    ($1, $3, 'BUY', 1, 2.00, false, NOW() - INTERVAL '5 days')`,
            [userId, TEST_CARD_ID, TEST_CARD_ID_2]
        );

        // Seed price history rows older than 30 days for the clamp test
        await ds.query(
            `INSERT INTO price_history (card_id, normal, foil, date)
             VALUES ($1, 1.00, NULL, CURRENT_DATE - INTERVAL '60 days'),
                    ($1, 1.10, NULL, CURRENT_DATE - INTERVAL '45 days')
             ON CONFLICT (card_id, date) DO NOTHING`,
            [TEST_CARD_ID]
        );
    }, 30000);

    afterAll(async () => {
        if (ds?.isInitialized) {
            try {
                await ds.query('DELETE FROM subscription WHERE user_id = $1', [userId]);
                await ds.query('DELETE FROM transaction WHERE user_id = $1', [userId]);
                await ds.query('DELETE FROM price_alert WHERE user_id = $1', [userId]);
                await ds.query(
                    'DELETE FROM sealed_product_inventory WHERE user_id = $1',
                    [userId]
                );
                await ds.query('DELETE FROM sealed_product WHERE uuid = $1', [SEALED_UUID]);
                await ds.query('DELETE FROM card WHERE id = $1', [EXTRA_CARD_ID]);
            } catch {
                // best-effort
            }
        }
        await closeTestApp(app);
    });

    beforeEach(async () => {
        // Default to free; subscription tests opt in
        await setSubscribed(false);
        await ds.query('DELETE FROM price_alert WHERE user_id = $1', [userId]);
        await ds.query('DELETE FROM sealed_product_inventory WHERE user_id = $1', [userId]);
    });

    describe('Sealed product inventory (Premium gate)', () => {
        it('POST /api/v1/inventory/sealed returns 403 for free users', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/inventory/sealed')
                .set('Authorization', bearer)
                .send({ sealedProductUuid: SEALED_UUID, quantity: 1 })
                .expect(403);
        });

        it('POST /api/v1/inventory/sealed succeeds for subscribed users', async () => {
            await setSubscribed(true);
            await request(app.getHttpServer())
                .post('/api/v1/inventory/sealed')
                .set('Authorization', bearer)
                .send({ sealedProductUuid: SEALED_UUID, quantity: 2 })
                .expect(201);
        });

        it('PATCH /api/v1/inventory/sealed returns 403 for free users', async () => {
            await request(app.getHttpServer())
                .patch('/api/v1/inventory/sealed')
                .set('Authorization', bearer)
                .send({ sealedProductUuid: SEALED_UUID, quantity: 5 })
                .expect(403);
        });

        it('DELETE /api/v1/inventory/sealed returns 403 for free users', async () => {
            await request(app.getHttpServer())
                .delete('/api/v1/inventory/sealed')
                .set('Authorization', bearer)
                .send({ sealedProductUuid: SEALED_UUID })
                .expect(403);
        });
    });

    describe('Portfolio API gates', () => {
        it('GET /api/v1/portfolio/history returns 403 for free users', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/portfolio/history')
                .set('Authorization', bearer)
                .expect(403);
        });

        it('GET /api/v1/portfolio/cash-flow returns 403 for free users', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/portfolio/cash-flow')
                .set('Authorization', bearer)
                .expect(403);
        });

        it('GET /api/v1/portfolio/breakdown returns 403 for free users', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/portfolio/breakdown?by=set')
                .set('Authorization', bearer)
                .expect(403);
        });

        it('GET /api/v1/portfolio/history returns 200 for subscribed users', async () => {
            await setSubscribed(true);
            await request(app.getHttpServer())
                .get('/api/v1/portfolio/history')
                .set('Authorization', bearer)
                .expect(200);
        });

        it('GET /api/v1/portfolio/breakdown returns 200 for subscribed users', async () => {
            await setSubscribed(true);
            const res = await request(app.getHttpServer())
                .get('/api/v1/portfolio/breakdown?by=set')
                .set('Authorization', bearer)
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('slices');
        });
    });

    describe('Transaction list 30-day cap', () => {
        it('hides transactions older than 30 days for free users', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/transactions')
                .set('Authorization', bearer)
                .expect(200);

            // Seeded one tx at -90 days, one at -5 days → free users see only the recent one
            expect(res.body.data.length).toBe(1);
            expect(new Date(res.body.data[0].date).getTime()).toBeGreaterThan(
                Date.now() - 31 * 24 * 3600 * 1000
            );
        });

        it('shows full history for subscribed users', async () => {
            await setSubscribed(true);
            const res = await request(app.getHttpServer())
                .get('/api/v1/transactions')
                .set('Authorization', bearer)
                .expect(200);

            expect(res.body.data.length).toBe(2);
        });
    });

    describe('Price alert limits', () => {
        it('rejects multi-threshold alerts for free users', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/price-alerts')
                .set('Authorization', bearer)
                .send({ cardId: TEST_CARD_ID, increasePct: 10, decreasePct: 10 });

            expect(res.status).toBe(400);
            expect(String(res.body.error || '')).toMatch(/Premium/);
        });

        it('rejects the 6th alert for free users', async () => {
            // Seed 5 alerts (one per distinct card_id — alerts are unique by (user_id, card_id)).
            for (const cardId of ALERT_CARD_IDS) {
                await ds.query(
                    `INSERT INTO price_alert (user_id, card_id, increase_pct, decrease_pct, is_active)
                     VALUES ($1, $2, 10, NULL, true)`,
                    [userId, cardId]
                );
            }

            // Need a 6th distinct card id; reuse the EXTRA_CARD_ID is already alerted, so insert another.
            const sixthCardId = '00000000-0000-4000-a000-000000000006';
            await ds.query(
                `INSERT INTO card (id, artist, has_foil, has_non_foil, img_src, is_reserved, mana_cost,
                    name, number, oracle_text, rarity, set_code, type, layout, is_alternative, sort_number, in_main)
                 VALUES ($1, 'Test Artist', true, true, 'https://example.com/card6.jpg', false, '{U}',
                    'Test Drake', '6', 'Flying', 'common', $2, 'Creature - Drake', 'normal', false, '006', true)
                 ON CONFLICT (id) DO NOTHING`,
                [sixthCardId, TEST_SET_CODE]
            );

            try {
                const res = await request(app.getHttpServer())
                    .post('/api/v1/price-alerts')
                    .set('Authorization', bearer)
                    .send({ cardId: sixthCardId, increasePct: 15 });

                expect(res.status).toBe(400);
                expect(String(res.body.error || '')).toMatch(/Free plan is limited|5/);
            } finally {
                await ds.query('DELETE FROM price_alert WHERE user_id = $1 AND card_id = $2', [
                    userId,
                    sixthCardId,
                ]);
                await ds.query('DELETE FROM card WHERE id = $1', [sixthCardId]);
            }
        });

        it('allows multi-threshold alerts for subscribed users', async () => {
            await setSubscribed(true);
            await request(app.getHttpServer())
                .post('/api/v1/price-alerts')
                .set('Authorization', bearer)
                .send({ cardId: TEST_CARD_ID, increasePct: 10, decreasePct: 10 })
                .expect(201);
        });
    });
});
