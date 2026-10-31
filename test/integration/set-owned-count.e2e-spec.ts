import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { closeTestApp, createTestApp } from './setup';

const MUTATION_USER = {
    email: 'mutation@test.com',
    password: 'TestPass1!',
};

// Set 'tst' is a main set with base_size 4: cards 1-4 are in_main, and 305 is an
// extended-art variant outside the base set (seed.sql).
const BASE_CARD_IDS = [
    '00000000-0000-4000-a000-000000000001',
    '00000000-0000-4000-a000-000000000002',
    '00000000-0000-4000-a000-000000000003',
    '00000000-0000-4000-a000-000000000004',
];
const VARIANT_CARD_ID = '00000000-0000-4000-a000-000000000305';
const TST_CARD_IDS = [...BASE_CARD_IDS, VARIANT_CARD_ID];

// The owned count is shown against the set's size, which for a main set counts
// only base cards. Owning variants on top of a complete set used to read
// "292 / 291" on March of the Machine.
describe('Set owned count (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;
    let userId: number;
    let cookie: string;
    let bearer: string;
    let savedInventory: { card_id: string; foil: boolean; quantity: number }[];

    async function own(cardIds: string[]): Promise<void> {
        await ds.query('DELETE FROM inventory WHERE user_id = $1 AND card_id = ANY($2)', [
            userId,
            TST_CARD_IDS,
        ]);
        for (const cardId of cardIds) {
            await ds.query(
                'INSERT INTO inventory (card_id, user_id, foil, quantity) VALUES ($1, $2, false, 1)',
                [cardId, userId]
            );
        }
    }

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        const rows = await ds.query('SELECT id FROM users WHERE email = $1', [MUTATION_USER.email]);
        userId = rows[0].id;
        savedInventory = await ds.query(
            'SELECT card_id, foil, quantity FROM inventory WHERE user_id = $1 AND card_id = ANY($2)',
            [userId, TST_CARD_IDS]
        );

        await ds.query('DELETE FROM subscription WHERE user_id = $1', [userId]);
        await ds.query(
            `INSERT INTO subscription (user_id, stripe_customer_id, stripe_subscription_id,
                stripe_price_id, status, plan, current_period_end, cancel_at_period_end)
             VALUES ($1, $2, $3, $4, 'active', 'monthly', NOW() + INTERVAL '30 days', false)`,
            [userId, `cus_test_${userId}`, `sub_test_${userId}`, `price_test_monthly_${userId}`]
        );

        const login = await request(app.getHttpServer())
            .post('/auth/login')
            .send(MUTATION_USER)
            .expect(302);
        const cookies = login.headers['set-cookie'];
        cookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
            c?.startsWith('authorization=')
        )!;

        const apiLogin = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send(MUTATION_USER)
            .expect(200);
        bearer = `Bearer ${apiLogin.body.data.accessToken}`;
    }, 30000);

    afterAll(async () => {
        try {
            if (ds?.isInitialized) {
                await own([]);
                for (const row of savedInventory) {
                    await ds.query(
                        'INSERT INTO inventory (card_id, user_id, foil, quantity) VALUES ($1, $2, $3, $4)',
                        [row.card_id, userId, row.foil, row.quantity]
                    );
                }
                await ds.query('DELETE FROM subscription WHERE user_id = $1', [userId]);
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    describe('with every base card and the variant owned', () => {
        beforeAll(() => own(TST_CARD_IDS));

        it('the binder counts base cards only', async () => {
            const res = await request(app.getHttpServer())
                .get('/inventory/sets/tst')
                .set('Cookie', cookie)
                .expect(200);
            expect(res.text).toMatch(/id="owned-count">4 \/ 4</);
        });

        it('the set page counts base cards only', async () => {
            const res = await request(app.getHttpServer())
                .get('/sets/tst')
                .set('Cookie', cookie)
                .expect(200);
            expect(res.text).toMatch(/stat-value">4<span[^>]*>\/4</);
        });

        it('the set list API counts base cards only', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/sets?filter=Test%20Set')
                .set('Authorization', bearer)
                .expect(200);
            const tst = res.body.data.find((s: { code: string }) => s.code === 'tst');
            expect(tst.ownedTotal).toBe(4);
            expect(tst.completionRate).toBe(100);
        });
    });

    describe('with only the variant owned', () => {
        beforeAll(() => own([VARIANT_CARD_ID]));

        it('the binder shows none of the base set owned', async () => {
            const res = await request(app.getHttpServer())
                .get('/inventory/sets/tst')
                .set('Cookie', cookie)
                .expect(200);
            expect(res.text).toMatch(/id="owned-count">0 \/ 4</);
        });

        it('the set tile still shows the value owned', async () => {
            const res = await request(app.getHttpServer())
                .get('/sets')
                .set('Cookie', cookie)
                .expect(200);
            expect(res.text).toContain('$50.00 owned');
        });
    });
});
