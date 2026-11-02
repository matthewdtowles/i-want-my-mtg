import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { closeTestApp, createTestApp, TEST_CARD_ID, TEST_CARD_ID_2 } from './setup';

const MUTATION_USER = { email: 'mutation@test.com', password: 'TestPass1!' };
// Seeded today at $5.00 (card 1) and $3.00 foil (card 2); 305 is a variant outside the
// base set at $50.00.
const VARIANT_CARD_ID = '00000000-0000-4000-a000-000000000305';

// The inventory page's value and counts: the value must use each card's newest price,
// and the counts must count each owned row once, base-only and all.
describe('Inventory page totals (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;
    let userId: number;
    let cookie: string;
    let saved: { card_id: string; foil: boolean; quantity: number }[];

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        [{ id: userId }] = await ds.query('SELECT id FROM users WHERE email = $1', [
            MUTATION_USER.email,
        ]);
        saved = await ds.query('SELECT card_id, foil, quantity FROM inventory WHERE user_id = $1', [
            userId,
        ]);
        await ds.query('DELETE FROM inventory WHERE user_id = $1', [userId]);
        await ds.query(
            `INSERT INTO inventory (card_id, user_id, foil, quantity) VALUES
             ($1, $4, false, 1), ($2, $4, true, 2), ($3, $4, false, 1)`,
            [TEST_CARD_ID, TEST_CARD_ID_2, VARIANT_CARD_ID, userId]
        );
        // An older, higher price that must not be used.
        await ds.query(
            `INSERT INTO price (card_id, normal, foil, date) VALUES ($1, 999.00, 999.00, CURRENT_DATE - 7)
             ON CONFLICT (card_id, date) DO NOTHING`,
            [TEST_CARD_ID]
        );

        const login = await request(app.getHttpServer())
            .post('/auth/login')
            .send(MUTATION_USER)
            .expect(302);
        const cookies = login.headers['set-cookie'];
        cookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
            c?.startsWith('authorization=')
        )!;
    }, 30000);

    afterAll(async () => {
        try {
            await ds.query('DELETE FROM price WHERE card_id = $1 AND date = CURRENT_DATE - 7', [
                TEST_CARD_ID,
            ]);
            await ds.query('DELETE FROM inventory WHERE user_id = $1', [userId]);
            for (const row of saved) {
                await ds.query(
                    'INSERT INTO inventory (card_id, user_id, foil, quantity) VALUES ($1, $2, $3, $4)',
                    [row.card_id, userId, row.foil, row.quantity]
                );
            }
        } finally {
            await closeTestApp(app);
        }
    });

    it('values the collection at each card’s newest price', async () => {
        const res = await request(app.getHttpServer())
            .get('/inventory?baseOnly=false')
            .set('Cookie', cookie)
            .expect(200);
        // $5.00 + 2 × $3.00 foil + $50.00 variant
        expect(res.text).toContain('app-stat-tile-value">$61.00<');
    });

    it('counts every owned row once with Show All', async () => {
        const res = await request(app.getHttpServer())
            .get('/inventory?baseOnly=false')
            .set('Cookie', cookie)
            .expect(200);
        expect(res.text).toMatch(/app-stat-tile-value">3</);
    });

    it('lists each owned row on exactly one page when the sort has ties', async () => {
        // Cards 1 and 305 both have quantity 1.
        const ids: string[] = [];
        for (let page = 1; page <= 3; page++) {
            const res = await request(app.getHttpServer())
                .get(
                    `/api/v1/inventory?baseOnly=false&sort=inventory.quantity&limit=1&page=${page}`
                )
                .set('Cookie', cookie)
                .expect(200);
            ids.push(...res.body.data.map((item: { cardId: string }) => item.cardId));
        }
        expect(ids.sort()).toEqual([TEST_CARD_ID, TEST_CARD_ID_2, VARIANT_CARD_ID].sort());
    });

    it('counts only base-set rows by default', async () => {
        const res = await request(app.getHttpServer())
            .get('/inventory')
            .set('Cookie', cookie)
            .expect(200);
        expect(res.text).toMatch(/app-stat-tile-value">2</);
    });
});
