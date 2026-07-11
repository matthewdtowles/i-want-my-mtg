import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, closeTestApp, loginTestUser, getTestUserId } from './setup';

describe('Deck import transactionality (e2e, W2/B4)', () => {
    let app: INestApplication;
    let authCookie: string;
    let userId: number;

    beforeAll(async () => {
        app = await createTestApp();
        authCookie = await loginTestUser(app);
        userId = await getTestUserId(app);
    }, 30000);

    afterAll(async () => {
        try {
            const ds = app.get(DataSource);
            if (ds?.isInitialized) {
                await ds.query(
                    `DELETE FROM deck_card WHERE deck_id IN (SELECT id FROM deck WHERE user_id = $1)`,
                    [userId]
                );
                await ds.query(`DELETE FROM deck WHERE user_id = $1`, [userId]);
            }
        } catch {
            // best-effort; test DB is ephemeral
        }
        await closeTestApp(app);
    });

    it('POST /decks/import commits the deck and its cards atomically', async () => {
        await request(app.getHttpServer())
            .post('/decks/import')
            .set('Cookie', authCookie)
            .send({
                name: 'Imported Deck',
                format: 'modern',
                text: '2 Test Angel\n1 Test Sphinx',
            })
            .expect(201);

        const ds = app.get(DataSource);
        // The ownership check inside the import reads the just-created (still
        // uncommitted) deck via the same transaction — if that read didn't join
        // the transaction, addCards would have failed and no cards would exist.
        const decks = await ds.query(
            `SELECT id FROM deck WHERE user_id = $1 AND name = 'Imported Deck'`,
            [userId]
        );
        expect(decks).toHaveLength(1);

        const cards = await ds.query(
            `SELECT COALESCE(SUM(quantity), 0)::int AS total FROM deck_card WHERE deck_id = $1`,
            [decks[0].id]
        );
        expect(cards[0].total).toBe(3); // 2 Angel + 1 Sphinx
    });
});
