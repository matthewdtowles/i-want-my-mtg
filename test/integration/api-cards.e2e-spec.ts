import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    closeTestApp,
    TEST_CARD_ID,
    TEST_CARD_ID_2,
    TEST_CARD_ID_4,
    TEST_CARD_SET_CODE,
    TEST_CARD_NUMBER,
} from './setup';

describe('Cards API (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    }, 30000);

    afterAll(async () => {
        await closeTestApp(app);
    });

    describe('GET /api/v1/cards', () => {
        it('returns search results with pagination', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/cards?q=Angel').expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.meta).toBeDefined();
            expect(res.body.meta).toHaveProperty('total');
        });

        it('returns keyruneCode in card search results', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/cards?q=Angel').expect(200);

            expect(res.body.data.length).toBeGreaterThan(0);
            const card = res.body.data[0];
            expect(card).toHaveProperty('keyruneCode');
            expect(typeof card.keyruneCode).toBe('string');
        });

        it('returns empty array when no search term provided', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/cards').expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
            expect(res.body.meta.total).toBe(0);
        });

        it('returns empty array for unmatched search', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/cards?q=ZZZZNONEXISTENT')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });

        describe('catalog filters', () => {
            it('filters by rarity', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&rarity=mythic')
                    .expect(200);

                expect(res.body.data.every((c: { rarity: string }) => c.rarity === 'mythic')).toBe(
                    true
                );
                expect(res.body.data.length).toBeGreaterThan(0);
            });

            it('filters by setCode (case-insensitive input, lowercase storage)', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&setCode=TST')
                    .expect(200);

                expect(res.body.data.every((c: { setCode: string }) => c.setCode === 'tst')).toBe(
                    true
                );
                expect(res.body.data.length).toBeGreaterThan(0);
            });

            it('rejects unknown setCode (returns empty)', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&setCode=NOPE')
                    .expect(200);

                expect(res.body.data).toEqual([]);
            });

            it('filters by type substring', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&type=angel')
                    .expect(200);

                expect(res.body.data.length).toBeGreaterThan(0);
                expect(
                    res.body.data.every((c: { type: string }) =>
                        c.type.toLowerCase().includes('angel')
                    )
                ).toBe(true);
            });

            it('filters by format=standard (defaults legality=legal)', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&format=standard')
                    .expect(200);

                expect(res.body.data.length).toBeGreaterThan(0);
            });

            it('returns no results for format=modern (no seeded modern legalities)', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&format=modern')
                    .expect(200);

                expect(res.body.data).toEqual([]);
            });

            it('combines rarity and type filters with AND', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&rarity=common&type=zombie')
                    .expect(200);

                expect(res.body.data.length).toBeGreaterThan(0);
                expect(
                    res.body.data.every(
                        (c: { rarity: string; type: string }) =>
                            c.rarity === 'common' && c.type.toLowerCase().includes('zombie')
                    )
                ).toBe(true);
            });

            it('paginates total reflects the filtered count, not the unfiltered count', async () => {
                const unfiltered = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test')
                    .expect(200);
                const filtered = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&rarity=mythic')
                    .expect(200);

                expect(filtered.body.meta.total).toBeLessThan(unfiltered.body.meta.total);
            });
        });

        describe('groupBy=name (in-page deck search)', () => {
            it('returns one row per distinct card name with prices', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&groupBy=name')
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data.length).toBeGreaterThan(0);

                const names = res.body.data.map((c: { name: string }) => c.name);
                expect(new Set(names).size).toBe(names.length); // no duplicate names
                expect(res.body.meta.total).toBe(names.length);
                // A representative printing carries the latest price for valuation.
                expect(res.body.data[0]).toHaveProperty('prices');
            });

            it('narrows to a single name when the query matches one card', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test%20Angel&groupBy=name')
                    .expect(200);

                expect(res.body.data).toHaveLength(1);
                expect(res.body.data[0].name).toBe('Test Angel');
            });

            it('flags legality for the requested format without omitting the flag otherwise', async () => {
                const withFormat = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&groupBy=name&format=standard')
                    .expect(200);
                expect(
                    withFormat.body.data.every((c: { legal: boolean }) => c.legal === true)
                ).toBe(true);

                const noFormat = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&groupBy=name')
                    .expect(200);
                expect(
                    noFormat.body.data.every((c: { legal?: boolean }) => c.legal === undefined)
                ).toBe(true);
            });

            it('returns 400 for an invalid groupBy rather than silently falling back', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&groupBy=foo')
                    .expect(400);

                expect(res.body.success).toBe(false);
                expect(res.body.param).toBe('groupBy');
                expect(res.body.allowedValues).toEqual(['name']);
            });

            it('annotates (does not filter out) cards illegal in the format', async () => {
                // Non-grouped search filters format=modern to legal-only (none seeded).
                const filtered = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&format=modern')
                    .expect(200);
                expect(filtered.body.data).toEqual([]);

                // Grouped (deck) search keeps the cards and flags them not legal.
                const annotated = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&groupBy=name&format=modern')
                    .expect(200);
                expect(annotated.body.data.length).toBeGreaterThan(0);
                expect(
                    annotated.body.data.every((c: { legal: boolean }) => c.legal === false)
                ).toBe(true);
            });
        });

        describe('strict filter validation', () => {
            it('returns 400 with param + allowedValues for an unknown rarity', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&rarity=foobar')
                    .expect(400);

                expect(res.body.success).toBe(false);
                expect(res.body.param).toBe('rarity');
                expect(res.body.allowedValues).toEqual(['common', 'uncommon', 'rare', 'mythic']);
                expect(res.body.error).toContain("Invalid value 'foobar'");
            });

            it('returns 400 for an unknown format', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&format=pioneerish')
                    .expect(400);

                expect(res.body.param).toBe('format');
            });

            it('returns 400 for legality without format', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&legality=banned')
                    .expect(400);

                expect(res.body.param).toBe('legality');
            });

            it('ignores sort (card search is name-ordered) rather than 400ing', async () => {
                await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&sort=card.bogus')
                    .expect(200);
            });

            it('returns 400 for a malformed setCode (no allowedValues list)', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&setCode=mh-3')
                    .expect(400);

                expect(res.body.param).toBe('setCode');
                expect(res.body.allowedValues).toBeUndefined();
            });

            it('returns 400 (not 500) for a repeated param parsed as an array', async () => {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&setCode=mh3&setCode=lea')
                    .expect(400);

                expect(res.body.param).toBe('setCode');
                expect(res.body.error).toContain('single value');
            });

            it('does not 500 when a non-validated param is repeated', async () => {
                await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&filter=a&filter=b')
                    .expect(200);
            });

            it('400s on invalid filter even without a search term', async () => {
                await request(app.getHttpServer()).get('/api/v1/cards?rarity=foobar').expect(400);
            });
        });
    });

    describe('GET /api/v1/cards/:setCode/:setNumber', () => {
        it('returns card detail by set code and number', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/cards/${TEST_CARD_SET_CODE}/${TEST_CARD_NUMBER}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id', TEST_CARD_ID);
            expect(res.body.data).toHaveProperty('name');
            expect(res.body.data).toHaveProperty('setCode', TEST_CARD_SET_CODE);
            expect(res.body.data).toHaveProperty('number', TEST_CARD_NUMBER);
            expect(res.body.data).toHaveProperty('type');
            expect(res.body.data).toHaveProperty('rarity');
            expect(res.body.data).toHaveProperty('keyruneCode');
        });

        it('includes prices when available', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/cards/${TEST_CARD_SET_CODE}/${TEST_CARD_NUMBER}`)
                .expect(200);

            expect(res.body.data).toHaveProperty('prices');
            if (res.body.data.prices) {
                expect(res.body.data.prices).toHaveProperty('normal');
                expect(res.body.data.prices).toHaveProperty('foil');
            }
        });

        it('returns 404 for nonexistent card', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/cards/FAKE/999')
                .expect(404);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/v1/cards/:cardId/prices', () => {
        it('returns current prices for a card', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/cards/${TEST_CARD_ID}/prices`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id', TEST_CARD_ID);
            expect(res.body.data).toHaveProperty('name');
        });

        it('returns 404 for nonexistent card', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/cards/00000000-0000-4000-a000-999999999999/prices')
                .expect(404);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/v1/cards/:cardId/price-history', () => {
        it('returns price history for a card', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/cards/${TEST_CARD_ID}/price-history`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);

            const point = res.body.data[0];
            expect(point).toHaveProperty('date');
            expect(point).toHaveProperty('normal');
            expect(point).toHaveProperty('foil');
        });

        it('supports days parameter', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/cards/${TEST_CARD_ID}/price-history?days=7`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /api/v1/cards/movers', () => {
        // Seeded prices: card 1 $5 normal, card 2 $1.50, card 4 $20 / $40 foil and
        // card 305 $50 / $90 foil. The weekly changes below make:
        //   card 4 normal  $12 -> $20  +66.7%, rising steadily
        //   card 4 foil    $36 -> $40  +11.1%
        //   card 1 normal  $4.50 -> $5 +11.1% (its seeded history rises steadily)
        //   card 2 normal  $1 -> $1.50 +50%, under the default $5 floor
        //   card 305 normal $30 -> $50 +66.7%, but its daily price flips 30/50/30/50
        //   card 305 foil  $100 -> $90 -10%, falling steadily
        const CARD_305 = '00000000-0000-4000-a000-000000000305';
        const HISTORY_DAYS = [6, 5, 4, 2];
        let ds: DataSource;

        beforeAll(async () => {
            ds = app.get(DataSource);
            const changes: [string, number | null, number | null][] = [
                [TEST_CARD_ID, 0.5, null],
                [TEST_CARD_ID_2, 0.5, null],
                [TEST_CARD_ID_4, 8, 4],
                [CARD_305, 20, -10],
            ];
            for (const [cardId, normal, foil] of changes) {
                await ds.query(
                    `UPDATE price SET normal_change_weekly = $2, foil_change_weekly = $3 WHERE card_id = $1`,
                    [cardId, normal, foil]
                );
            }
            const history: [string, number, number][] = [
                [TEST_CARD_ID_4, 12, 36],
                [TEST_CARD_ID_4, 12, 36],
                [TEST_CARD_ID_4, 16, 38],
                [TEST_CARD_ID_4, 20, 40],
                [CARD_305, 30, 100],
                [CARD_305, 50, 100],
                [CARD_305, 30, 100],
                [CARD_305, 50, 90],
            ];
            for (let i = 0; i < history.length; i++) {
                const [cardId, normal, foil] = history[i];
                await ds.query(
                    `INSERT INTO price_history (card_id, normal, foil, date)
                     VALUES ($1, $2, $3, CURRENT_DATE - $4::int)`,
                    [cardId, normal, foil, HISTORY_DAYS[i % HISTORY_DAYS.length]]
                );
            }
        });

        afterAll(async () => {
            await ds.query(
                `UPDATE price SET normal_change_weekly = NULL, foil_change_weekly = NULL
                 WHERE card_id = ANY($1)`,
                [[TEST_CARD_ID, TEST_CARD_ID_2, TEST_CARD_ID_4, CARD_305]]
            );
            await ds.query(
                `DELETE FROM price_history
                 WHERE card_id = ANY($1) AND date = ANY(SELECT CURRENT_DATE - d FROM unnest($2::int[]) d)`,
                [[TEST_CARD_ID_4, CARD_305], HISTORY_DAYS]
            );
        });

        function moves(body: {
            data: { card: { id: string }; finish: string; changePercent: number }[];
        }): string[] {
            return body.data.map((m) => `${m.card.id.slice(-3)} ${m.finish}`);
        }

        it('ranks the biggest percent increases and drops the flipping price', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/cards/movers').expect(200);

            expect(res.body.success).toBe(true);
            expect(moves(res.body)).toEqual(['004 normal', '001 normal', '004 foil']);
            expect(res.body.meta).toMatchObject({ page: 1, total: 3 });
            expect(res.body.data[0]).toMatchObject({
                finish: 'normal',
                price: 20,
                previousPrice: 12,
                change: 8,
                changePercent: 66.7,
            });
            expect(res.body.data[0].card).toMatchObject({
                name: 'Test Dragon',
                setName: 'Test Set',
            });
        });

        it('ranks by dollar amount', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/cards/movers?by=amount')
                .expect(200);

            expect(moves(res.body)).toEqual(['004 normal', '004 foil', '001 normal']);
        });

        it('lists the biggest decreases with direction=down', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/cards/movers?direction=down')
                .expect(200);

            expect(moves(res.body)).toEqual(['305 foil']);
            expect(res.body.data[0]).toMatchObject({
                previousPrice: 100,
                change: -10,
                changePercent: -10,
            });
        });

        it('includes cheaper cards when minPrice is lowered', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/cards/movers?minPrice=0')
                .expect(200);

            expect(moves(res.body)).toEqual(['004 normal', '002 normal', '001 normal', '004 foil']);
        });

        it('filters by finish, rarity, set and format', async () => {
            const foil = await request(app.getHttpServer())
                .get('/api/v1/cards/movers?finish=foil')
                .expect(200);
            expect(moves(foil.body)).toEqual(['004 foil']);

            const rare = await request(app.getHttpServer())
                .get('/api/v1/cards/movers?rarity=rare')
                .expect(200);
            expect(moves(rare.body)).toEqual(['001 normal']);

            const otherSet = await request(app.getHttpServer())
                .get('/api/v1/cards/movers?setCode=NOPE')
                .expect(200);
            expect(otherSet.body.data).toEqual([]);
            expect(otherSet.body.meta.total).toBe(0);

            const modern = await request(app.getHttpServer())
                .get('/api/v1/cards/movers?format=modern')
                .expect(200);
            expect(modern.body.data).toEqual([]);
        });

        it('leaves out cards from a set released in the last two weeks', async () => {
            await ds.query(`UPDATE "set" SET release_date = CURRENT_DATE - 13 WHERE code = 'tst'`);
            try {
                const res = await request(app.getHttpServer())
                    .get('/api/v1/cards/movers')
                    .expect(200);
                expect(res.body.data).toEqual([]);

                await ds.query(
                    `UPDATE "set" SET release_date = CURRENT_DATE - 14 WHERE code = 'tst'`
                );
                const old = await request(app.getHttpServer())
                    .get('/api/v1/cards/movers')
                    .expect(200);
                expect(old.body.meta.total).toBe(3);
            } finally {
                await ds.query(`UPDATE "set" SET release_date = '2024-01-01' WHERE code = 'tst'`);
            }
        });

        it('pages with the total of every match', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/cards/movers?limit=1&page=2')
                .expect(200);

            expect(moves(res.body)).toEqual(['001 normal']);
            expect(res.body.meta).toMatchObject({ page: 2, limit: 1, total: 3, totalPages: 3 });
        });

        it.each([['direction=sideways'], ['by=volume'], ['minPrice=-1'], ['finish=etched']])(
            'returns 400 for %s',
            async (query) => {
                const res = await request(app.getHttpServer())
                    .get(`/api/v1/cards/movers?${query}`)
                    .expect(400);

                expect(res.body.success).toBe(false);
            }
        );
    });

    describe('GET /api/v1/cards/:setCode/:setNumber/printings', () => {
        // The seed has one printing per name, so these assert the contract and
        // the routing - that the three-segment path resolves here and not to
        // `:setCode/:setNumber`, which would 404 on a `printings` collector
        // number.
        it('returns the addressed printing with paging meta', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/cards/${TEST_CARD_SET_CODE}/${TEST_CARD_NUMBER}/printings`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0]).toHaveProperty('id', TEST_CARD_ID);
            // The set join is what lets a printings row name its set.
            expect(res.body.data[0]).toHaveProperty('setName', 'Test Set');
            expect(res.body.meta).toMatchObject({ page: 1, total: 1, totalPages: 1 });
        });

        it('honours page and limit', async () => {
            const res = await request(app.getHttpServer())
                .get(
                    `/api/v1/cards/${TEST_CARD_SET_CODE}/${TEST_CARD_NUMBER}/printings?page=2&limit=1`
                )
                .expect(200);

            expect(res.body.data).toEqual([]);
            expect(res.body.meta).toMatchObject({ page: 2, limit: 1, total: 1 });
        });

        it('returns 404 for nonexistent card', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/cards/FAKE/999/printings')
                .expect(404);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });
    });
});
