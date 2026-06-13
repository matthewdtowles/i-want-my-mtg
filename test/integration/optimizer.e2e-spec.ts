import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    closeTestApp,
    createTestApp,
    getTestUserId,
    loginTestUser,
    TEST_CARD_ID,
    TEST_CARD_ID_4,
} from './setup';

/**
 * Cash-vs-store-credit optimizer (6.5). Uses the seeded granular CK buylist
 * offer (card 1 normal $3.50) and card 4's retail price ($20.00 normal).
 * Setup: own 4x card 1 -> CK cash C = $14.00; buy-list 2x card 4 -> R = $40.00.
 * Default bonus 30% -> store credit $18.20 < R, so credit is recommended and
 * the credit advantage is C*b = $4.20.
 */
describe('Cash vs credit optimizer (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;
    let authCookie: string;
    let userId: number;

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        authCookie = await loginTestUser(app);
        userId = await getTestUserId(app);

        await ds.query(`DELETE FROM inventory WHERE user_id = $1`, [userId]);
        await ds.query(`DELETE FROM buy_list WHERE user_id = $1`, [userId]);
        await ds.query(
            `INSERT INTO inventory (user_id, card_id, foil, quantity) VALUES ($1, $2, false, 4)`,
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

    it('requires authentication', async () => {
        const res = await request(app.getHttpServer()).get('/optimizer');
        expect(res.status).toBeGreaterThanOrEqual(300);
    });

    it('renders the optimizer with cash value, buy-list cost, and a credit recommendation', async () => {
        const res = await request(app.getHttpServer())
            .get('/optimizer')
            .set('Cookie', authCookie)
            .expect(200);

        expect(res.text).toContain('Cash vs. Store Credit');
        expect(res.text).toContain('$14.00'); // cash payout C
        expect(res.text).toContain('$40.00'); // buy-list retail R
        expect(res.text).toContain('$18.20'); // store credit at default 30%
        expect(res.text).toContain('Take store credit');
        expect(res.text).toContain('$4.20'); // credit advantage = C*b
    });

    it('honors a bonus override on CSV export', async () => {
        const res = await request(app.getHttpServer())
            .get('/optimizer/export.csv?bonus=0.5')
            .set('Cookie', authCookie)
            .expect(200);

        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.text).toContain('summary,sell_cash_value,14');
        expect(res.text).toContain('summary,store_credit_bonus_pct,50');
        expect(res.text).toContain('summary,store_credit,21'); // 14 * 1.5 = 21
        expect(res.text).toContain('summary,recommendation,store_credit');
        // Buy-list line for card 4 (Test Dragon).
        expect(res.text).toContain('buy_list,Test Dragon');
    });
});
