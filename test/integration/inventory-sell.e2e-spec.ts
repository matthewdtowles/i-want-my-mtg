import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    closeTestApp,
    createTestApp,
    getTestUserId,
    loginTestUser,
    TEST_CARD_ID,
    TEST_CARD_ID_2,
    TEST_CARD_ID_3,
} from './setup';

/**
 * Market sell value (6.4): /inventory/sell page + CSV export against the
 * seeded granular buylist offers (card 1: CK $3.50 normal / $7.00 foil,
 * cardsphere $3.25 normal). A qty-capped CK offer for card 2 is inserted here.
 */
describe('Inventory market sell value (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;
    let authCookie: string;
    let userId: number;

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        authCookie = await loginTestUser(app);
        userId = await getTestUserId(app);

        // CK is only buying 2 copies of card 2 -> exercises the qty cap.
        await ds.query(
            `INSERT INTO granular_price (card_id, provider, price_type, finish, condition, date, price, qty)
             VALUES ($1, 'cardkingdom', 'buylist', 'normal', 'NM', CURRENT_DATE, 1.00, 2)
             ON CONFLICT (card_id, provider, price_type, finish, condition)
             DO UPDATE SET price = EXCLUDED.price, qty = EXCLUDED.qty, date = EXCLUDED.date`,
            [TEST_CARD_ID_2]
        );

        // Known inventory: card 1 normal x4 + foil x1 (offers), card 2 normal x3
        // (qty-capped offer), card 3 normal x2 (no buylist offer).
        await ds.query(`DELETE FROM inventory WHERE user_id = $1`, [userId]);
        await ds.query(
            `INSERT INTO inventory (user_id, card_id, foil, quantity)
             VALUES ($1, $2, false, 4), ($1, $2, true, 1), ($1, $3, false, 3), ($1, $4, false, 2)`,
            [userId, TEST_CARD_ID, TEST_CARD_ID_2, TEST_CARD_ID_3]
        );
    }, 30000);

    afterAll(async () => {
        await ds.query(`DELETE FROM inventory WHERE user_id = $1`, [userId]);
        await ds.query(`DELETE FROM granular_price WHERE card_id = $1 AND price_type = 'buylist'`, [
            TEST_CARD_ID_2,
        ]);
        await closeTestApp(app);
    });

    describe('GET /inventory/sell', () => {
        it('requires authentication', async () => {
            const res = await request(app.getHttpServer()).get('/inventory/sell');
            expect(res.status).toBeGreaterThanOrEqual(300);
        });

        it('renders the market sell value page with best offers and totals', async () => {
            const res = await request(app.getHttpServer())
                .get('/inventory/sell')
                .set('Cookie', authCookie)
                .expect(200);

            expect(res.text).toContain('Market Sell Value');
            // Best normal offer for card 1 is CK $3.50 (not cardsphere $3.25): 4 x 3.50
            expect(res.text).toContain('$14.00');
            // Foil offer: 1 x $7.00
            expect(res.text).toContain('$7.00');
            // Card 2 capped at qty 2: 2 x $1.00
            expect(res.text).toContain('$2.00');
            // Grand total: 14 + 7 + 2
            expect(res.text).toContain('$23.00');
            expect(res.text).toContain('Card Kingdom');
            expect(res.text).toContain('Test Angel');
            expect(res.text).toContain('Test Sphinx');
            // Card 3 has no buylist offer -> not listed
            expect(res.text).not.toContain('Test Zombie');
            // Checkbox keys for the export form
            expect(res.text).toContain(`${TEST_CARD_ID}:n`);
            expect(res.text).toContain(`${TEST_CARD_ID}:f`);
            // Plain vendor buylist link, no partner attribution
            expect(res.text).toContain('cardkingdom.com/purchasing/mtg_singles');
            expect(res.text).not.toContain('partner=');
        });
    });

    describe('POST /inventory/sell/export', () => {
        it('requires authentication', async () => {
            const res = await request(app.getHttpServer()).post('/inventory/sell/export');
            expect(res.status).toBeGreaterThanOrEqual(300);
        });

        it('exports the selected items as CSV (form-encoded keys)', async () => {
            const res = await request(app.getHttpServer())
                .post('/inventory/sell/export')
                .set('Cookie', authCookie)
                .type('form')
                .send(`keys=${TEST_CARD_ID}:n&keys=${TEST_CARD_ID_2}:n`)
                .expect(200);

            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.headers['content-disposition']).toContain('market-sell-value.csv');

            const lines = res.text.trim().split('\n');
            expect(lines[0]).toBe(
                'name,set_code,number,finish,owned_qty,vendor,offer,sellable_qty,payout'
            );
            expect(lines).toHaveLength(3);
            const angel = lines.find((l) => l.startsWith('Test Angel'));
            expect(angel).toBe('Test Angel,tst,1,normal,4,Card Kingdom,3.50,4,14.00');
            const sphinx = lines.find((l) => l.startsWith('Test Sphinx'));
            expect(sphinx).toBe('Test Sphinx,tst,2,normal,3,Card Kingdom,1.00,2,2.00');
        });

        it('returns a header-only CSV when nothing is selected', async () => {
            const res = await request(app.getHttpServer())
                .post('/inventory/sell/export')
                .set('Cookie', authCookie)
                .type('form')
                .send('')
                .expect(200);

            expect(res.text.trim().split('\n')).toHaveLength(1);
        });

        it('ignores selection keys for cards the user does not own', async () => {
            const res = await request(app.getHttpServer())
                .post('/inventory/sell/export')
                .set('Cookie', authCookie)
                .type('form')
                .send('keys=99999999-9999-4999-a999-999999999999:n')
                .expect(200);

            expect(res.text.trim().split('\n')).toHaveLength(1);
        });
    });
});
