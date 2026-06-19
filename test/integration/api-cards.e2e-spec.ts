import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
    createTestApp,
    closeTestApp,
    TEST_CARD_ID,
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
                expect(withFormat.body.data.every((c: { legal: boolean }) => c.legal === true)).toBe(
                    true
                );

                const noFormat = await request(app.getHttpServer())
                    .get('/api/v1/cards?q=Test&groupBy=name')
                    .expect(200);
                expect(
                    noFormat.body.data.every((c: { legal?: boolean }) => c.legal === undefined)
                ).toBe(true);
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
});
