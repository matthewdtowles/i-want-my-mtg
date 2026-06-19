import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { closeTestApp, createTestApp } from './setup';

// Covers the card-image schema produced by the 6.7/6.8 migration sequence:
// 036 added card.scryfall_id (+ granular qty), 037/038 made img_src nullable
// then dropped it. The img_src -> scryfall_id backfill (036) is intentionally
// not exercised here: 038 drops img_src on the harness DB, so there is no
// column to backfill from. The backfill ran once in prod and is now a guarded
// no-op (see migrations 036/037).
const CARD_ID = '00000000-0000-4000-b000-000000000001';
const CARD_SCRYFALL_ID = 'ab12cd34-5678-4abc-9def-1234567890ab';
const JUNK_CARD_ID = '00000000-0000-4000-b000-000000000002';

describe('Card image schema: scryfall_id + img_src drop (6.7/6.8) (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;

    const insertCard = (id: string, number: string) =>
        ds.query(
            `INSERT INTO card (id, has_foil, has_non_foil, is_reserved, name, number, rarity, set_code, type, layout, is_alternative, sort_number, in_main)
             VALUES ($1, true, true, false, 'Schema Test Card', $2, 'common', 'tst', 'Creature', 'normal', false, $3, true)
             ON CONFLICT (id) DO NOTHING`,
            [id, number, number]
        );

    const deleteTestCards = () =>
        ds.query('DELETE FROM card WHERE id IN ($1, $2)', [CARD_ID, JUNK_CARD_ID]);

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        await deleteTestCards();
    }, 30000);

    afterAll(async () => {
        try {
            if (ds?.isInitialized) {
                await deleteTestCards();
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    describe('schema', () => {
        it('card.scryfall_id exists as a nullable varchar column', async () => {
            const rows = await ds.query(
                `SELECT data_type, is_nullable FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'card' AND column_name = 'scryfall_id'`
            );
            expect(rows).toHaveLength(1);
            expect(rows[0].data_type).toBe('character varying');
            expect(rows[0].is_nullable).toBe('YES');
        });

        it('card.scryfall_id has a unique index', async () => {
            const rows = await ds.query(
                `SELECT indexdef FROM pg_indexes
                 WHERE schemaname = 'public' AND tablename = 'card' AND indexname = 'idx_card_scryfall_id'`
            );
            expect(rows).toHaveLength(1);
            expect(rows[0].indexdef).toContain('UNIQUE');
            expect(rows[0].indexdef).toContain('scryfall_id');
        });

        it('card.img_src has been dropped (6.8b)', async () => {
            const rows = await ds.query(
                `SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'card' AND column_name = 'img_src'`
            );
            expect(rows).toHaveLength(0);
        });

        it.each(['granular_price'])(
            '%s.qty exists as a nullable integer column',
            async (table) => {
                const rows = await ds.query(
                    `SELECT data_type, is_nullable FROM information_schema.columns
                     WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'qty'`,
                    [table]
                );
                expect(rows).toHaveLength(1);
                expect(rows[0].data_type).toBe('integer');
                expect(rows[0].is_nullable).toBe('YES');
            }
        );
    });

    describe('unique index semantics', () => {
        beforeEach(async () => {
            await deleteTestCards();
            await insertCard(CARD_ID, '901');
            await insertCard(JUNK_CARD_ID, '902');
        });

        it('allows multiple NULL scryfall_ids (seed/junk cards coexist)', async () => {
            const rows = await ds.query('SELECT count(*) AS n FROM card WHERE scryfall_id IS NULL');
            expect(Number(rows[0].n)).toBeGreaterThanOrEqual(1);
        });

        it('rejects a duplicate scryfall_id', async () => {
            await ds.query('UPDATE card SET scryfall_id = $1 WHERE id = $2', [
                CARD_SCRYFALL_ID,
                CARD_ID,
            ]);

            await expect(
                ds.query('UPDATE card SET scryfall_id = $1 WHERE id = $2', [
                    CARD_SCRYFALL_ID,
                    JUNK_CARD_ID,
                ])
            ).rejects.toThrow(/duplicate key|unique/i);
        });
    });
});
