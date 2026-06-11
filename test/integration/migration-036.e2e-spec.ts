import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { closeTestApp, createTestApp } from './setup';

const MIGRATION_PATH = join(
    process.cwd(),
    'migrations',
    '036_card_scryfall_id_and_granular_qty.sql'
);

// Realistic img_src shape ('{a}/{b}/{scryfall_id}.jpg', as scry builds it) vs
// the non-conforming shape the seed data uses — the backfill must fill the
// former and leave the latter NULL.
const MIGRATION_CARD_ID = '00000000-0000-4000-b000-000000000001';
const MIGRATION_CARD_SCRYFALL_ID = 'ab12cd34-5678-4abc-9def-1234567890ab';
const MIGRATION_CARD_IMG_SRC = `a/b/${MIGRATION_CARD_SCRYFALL_ID}.jpg`;
const JUNK_CARD_ID = '00000000-0000-4000-b000-000000000002';
const JUNK_CARD_IMG_SRC = 'https://example.com/not-a-scryfall-path.jpg';

describe('Migration 036: card.scryfall_id + granular qty (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;

    const insertCard = (id: string, imgSrc: string, number: string) =>
        ds.query(
            `INSERT INTO card (id, has_foil, has_non_foil, img_src, is_reserved, name, number, rarity, set_code, type, layout, is_alternative, sort_number, in_main)
             VALUES ($1, true, true, $2, false, 'Migration Test Card', $3, 'common', 'tst', 'Creature', 'normal', false, $4, true)
             ON CONFLICT (id) DO NOTHING`,
            [id, imgSrc, number, number]
        );

    const deleteTestCards = () =>
        ds.query('DELETE FROM card WHERE id IN ($1, $2)', [MIGRATION_CARD_ID, JUNK_CARD_ID]);

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

    describe('schema (init parity + migration already applied by the harness)', () => {
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

        it.each(['granular_price', 'granular_price_history'])(
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

    describe('backfill (re-running the migration file against fresh rows)', () => {
        const migrationSql = readFileSync(MIGRATION_PATH, 'utf8');

        beforeEach(async () => {
            await deleteTestCards();
            await insertCard(MIGRATION_CARD_ID, MIGRATION_CARD_IMG_SRC, '901');
            await insertCard(JUNK_CARD_ID, JUNK_CARD_IMG_SRC, '902');
        });

        it('fills scryfall_id from a conforming img_src and leaves non-conforming NULL', async () => {
            await ds.query(migrationSql);

            const rows = await ds.query(
                'SELECT id, scryfall_id FROM card WHERE id IN ($1, $2) ORDER BY id',
                [MIGRATION_CARD_ID, JUNK_CARD_ID]
            );
            expect(rows).toHaveLength(2);
            expect(rows[0].scryfall_id).toBe(MIGRATION_CARD_SCRYFALL_ID);
            expect(rows[1].scryfall_id).toBeNull();
        });

        it('is idempotent: running twice does not error or change values', async () => {
            await ds.query(migrationSql);
            await ds.query(migrationSql);

            const rows = await ds.query('SELECT scryfall_id FROM card WHERE id = $1', [
                MIGRATION_CARD_ID,
            ]);
            expect(rows[0].scryfall_id).toBe(MIGRATION_CARD_SCRYFALL_ID);
        });

        it('does not overwrite an already-set scryfall_id', async () => {
            await ds.query(
                `UPDATE card SET scryfall_id = 'preset-value-not-derived' WHERE id = $1`,
                [MIGRATION_CARD_ID]
            );

            await ds.query(migrationSql);

            const rows = await ds.query('SELECT scryfall_id FROM card WHERE id = $1', [
                MIGRATION_CARD_ID,
            ]);
            expect(rows[0].scryfall_id).toBe('preset-value-not-derived');
        });
    });

    describe('unique index semantics', () => {
        beforeEach(async () => {
            await deleteTestCards();
            await insertCard(MIGRATION_CARD_ID, MIGRATION_CARD_IMG_SRC, '901');
            await insertCard(JUNK_CARD_ID, JUNK_CARD_IMG_SRC, '902');
        });

        it('allows multiple NULL scryfall_ids (seed/junk cards coexist)', async () => {
            const rows = await ds.query('SELECT count(*) AS n FROM card WHERE scryfall_id IS NULL');
            expect(Number(rows[0].n)).toBeGreaterThanOrEqual(1);
        });

        it('rejects a duplicate scryfall_id', async () => {
            await ds.query('UPDATE card SET scryfall_id = $1 WHERE id = $2', [
                MIGRATION_CARD_SCRYFALL_ID,
                MIGRATION_CARD_ID,
            ]);

            await expect(
                ds.query('UPDATE card SET scryfall_id = $1 WHERE id = $2', [
                    MIGRATION_CARD_SCRYFALL_ID,
                    JUNK_CARD_ID,
                ])
            ).rejects.toThrow(/duplicate key|unique/i);
        });
    });
});
