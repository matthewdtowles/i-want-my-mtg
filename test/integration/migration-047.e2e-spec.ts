import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { closeTestApp, createTestApp } from './setup';

// Covers migration 047 (cross-repo S1 / scry#43): card.language must exist so
// scry can persist each card's language on upsert and prune foreign unpriced
// cards standalone. The column shape (varchar(32), NOT NULL, DEFAULT
// 'English') must match scry's test fixture exactly — X5 keeps that fixture
// synced to this schema.
const CARD_ID = '00000000-0000-4000-b000-000000000047';

describe('card.language for scry foreign-card tracking (047) (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;

    const deleteTestCard = () => ds.query('DELETE FROM card WHERE id = $1', [CARD_ID]);

    beforeAll(async () => {
        app = await createTestApp();
        ds = app.get(DataSource);
        await deleteTestCard();
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

    it('card.language is varchar(32), NOT NULL, default English', async () => {
        const rows = await ds.query(
            `SELECT data_type, character_maximum_length, is_nullable, column_default
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'card' AND column_name = 'language'`
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].data_type).toBe('character varying');
        expect(Number(rows[0].character_maximum_length)).toBe(32);
        expect(rows[0].is_nullable).toBe('NO');
        expect(rows[0].column_default).toContain('English');
    });

    it('an insert without language gets the English default', async () => {
        await ds.query(
            `INSERT INTO card (id, has_foil, has_non_foil, is_reserved, name, number, rarity, set_code, type, layout, is_alternative, sort_number, in_main)
             VALUES ($1, true, true, false, 'Language Test Card', '947', 'common', 'tst', 'Creature', 'normal', false, '947', true)`,
            [CARD_ID]
        );
        const rows = await ds.query('SELECT language FROM card WHERE id = $1', [CARD_ID]);
        expect(rows).toHaveLength(1);
        expect(rows[0].language).toBe('English');
    });
});
