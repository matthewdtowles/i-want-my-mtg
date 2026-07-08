import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { closeTestApp, createTestApp } from './setup';

// Covers migration 046 (W9 / #577): the card FKs on price_history and
// inventory must be ON DELETE CASCADE so scry's card-prune paths (scry S2)
// can delete from `card` alone. The schema checks match constraints by
// referencing/referenced table — not by name — mirroring how the migration
// finds them, so they hold whether the rule came from the init schema (fresh
// DB) or from the migration normalizing an older database.
const CARD_ID = '00000000-0000-4000-b000-000000000046';

describe('Card FK delete cascade: price_history + inventory (046) (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;
    let userId: number;

    const deleteTestCard = () => ds.query('DELETE FROM card WHERE id = $1', [CARD_ID]);

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        await deleteTestCard();
        const users = await ds.query('SELECT id FROM users WHERE email = $1', ['integ@test.com']);
        userId = users[0].id;
    }, 30000);

    afterAll(async () => {
        try {
            if (ds?.isInitialized) {
                await deleteTestCard();
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    describe('schema', () => {
        it.each(['price_history', 'inventory'])(
            '%s -> card FK is ON DELETE CASCADE and validated',
            async (table) => {
                const rows = await ds.query(
                    `SELECT con.confdeltype, con.convalidated
                     FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                     WHERE nsp.nspname = 'public'
                       AND rel.relname = $1
                       AND con.contype = 'f'
                       AND con.confrelid = 'public.card'::regclass`,
                    [table]
                );
                expect(rows).toHaveLength(1);
                expect(rows[0].confdeltype).toBe('c');
                expect(rows[0].convalidated).toBe(true);
            }
        );
    });

    describe('behavior', () => {
        beforeEach(async () => {
            await deleteTestCard();
            await ds.query(
                `INSERT INTO card (id, has_foil, has_non_foil, is_reserved, name, number, rarity, set_code, type, layout, is_alternative, sort_number, in_main)
                 VALUES ($1, true, true, false, 'Cascade Test Card', '946', 'common', 'tst', 'Creature', 'normal', false, '946', true)`,
                [CARD_ID]
            );
            await ds.query(
                `INSERT INTO price_history (card_id, normal, foil, date) VALUES ($1, 1.23, 2.34, CURRENT_DATE)`,
                [CARD_ID]
            );
            await ds.query(
                `INSERT INTO inventory (card_id, user_id, foil, quantity) VALUES ($1, $2, false, 3)`,
                [CARD_ID, userId]
            );
        });

        it('deleting a card removes its price_history and inventory rows', async () => {
            await deleteTestCard();

            const history = await ds.query('SELECT 1 FROM price_history WHERE card_id = $1', [
                CARD_ID,
            ]);
            const inventory = await ds.query('SELECT 1 FROM inventory WHERE card_id = $1', [
                CARD_ID,
            ]);
            expect(history).toHaveLength(0);
            expect(inventory).toHaveLength(0);
        });

        it('deleting a card leaves other cards untouched', async () => {
            const before = await ds.query(
                'SELECT count(*) AS n FROM price_history WHERE card_id <> $1',
                [CARD_ID]
            );

            await deleteTestCard();

            const after = await ds.query(
                'SELECT count(*) AS n FROM price_history WHERE card_id <> $1',
                [CARD_ID]
            );
            expect(after[0].n).toBe(before[0].n);
        });
    });
});
