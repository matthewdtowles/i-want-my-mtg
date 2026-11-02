import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    closeTestApp,
    createTestApp,
    TEST_CARD_ID,
    TEST_CARD_NUMBER,
    TEST_CARD_SET_CODE,
} from './setup';

// The seeded card is priced $5.00 / $10.00 today. An older row with a much higher
// price must never be the one shown: latestPriceCondition picks the newest per card.
describe('Latest price (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        await ds.query(
            `INSERT INTO price (card_id, normal, foil, date)
             VALUES ($1, 999.00, 999.00, CURRENT_DATE - 7)
             ON CONFLICT (card_id, date) DO NOTHING`,
            [TEST_CARD_ID]
        );
    }, 30000);

    afterAll(async () => {
        await ds?.query(`DELETE FROM price WHERE card_id = $1 AND date = CURRENT_DATE - 7`, [
            TEST_CARD_ID,
        ]);
        await closeTestApp(app);
    });

    it('the card API shows the newest price', async () => {
        const res = await request(app.getHttpServer())
            .get(`/api/v1/cards/${TEST_CARD_SET_CODE}/${TEST_CARD_NUMBER}`)
            .expect(200);
        expect(Number(res.body.data.prices.normal)).toBe(5);
        expect(Number(res.body.data.prices.foil)).toBe(10);
    });

    // The sets list values a collection through latestPriceConditionForManySets.
    it('the sets API values owned cards at the newest price', async () => {
        const user = { email: 'mutation@test.com', password: 'TestPass1!' };
        const [{ id: userId }] = await ds.query('SELECT id FROM users WHERE email = $1', [
            user.email,
        ]);
        const saved = await ds.query(
            'SELECT card_id, foil, quantity FROM inventory WHERE user_id = $1 AND card_id IN (SELECT id FROM card WHERE set_code = $2)',
            [userId, TEST_CARD_SET_CODE]
        );
        await ds.query(
            'DELETE FROM inventory WHERE user_id = $1 AND card_id IN (SELECT id FROM card WHERE set_code = $2)',
            [userId, TEST_CARD_SET_CODE]
        );
        await ds.query(
            'INSERT INTO inventory (card_id, user_id, foil, quantity) VALUES ($1, $2, false, 1)',
            [TEST_CARD_ID, userId]
        );
        try {
            const login = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send(user)
                .expect(200);
            const res = await request(app.getHttpServer())
                .get('/api/v1/sets?filter=Test%20Set')
                .set('Authorization', `Bearer ${login.body.data.accessToken}`)
                .expect(200);
            const tst = res.body.data.find((s: { code: string }) => s.code === TEST_CARD_SET_CODE);
            expect(Number(tst.ownedValue)).toBe(5);
        } finally {
            await ds.query('DELETE FROM inventory WHERE user_id = $1 AND card_id = $2', [
                userId,
                TEST_CARD_ID,
            ]);
            for (const row of saved) {
                await ds.query(
                    'INSERT INTO inventory (card_id, user_id, foil, quantity) VALUES ($1, $2, $3, $4)',
                    [row.card_id, userId, row.foil, row.quantity]
                );
            }
        }
    });

    it('the card page shows the newest price', async () => {
        const res = await request(app.getHttpServer())
            .get(`/card/${TEST_CARD_SET_CODE}/${TEST_CARD_NUMBER}`)
            .expect(200);
        expect(res.text).toContain('$5.00');
        expect(res.text).not.toContain('$999.00');
    });
});
