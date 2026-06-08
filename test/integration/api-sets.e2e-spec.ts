import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp, TEST_SET_CODE } from './setup';

describe('Sets API (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    }, 30000);

    afterAll(async () => {
        await closeTestApp(app);
    });

    describe('GET /api/v1/sets', () => {
        it('returns paginated list of sets', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/sets').expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.meta).toBeDefined();
            expect(res.body.meta).toHaveProperty('page');
            expect(res.body.meta).toHaveProperty('limit');
            expect(res.body.meta).toHaveProperty('total');
            expect(res.body.meta).toHaveProperty('totalPages');
        });

        it('supports pagination parameters', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/sets?page=1&limit=1')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeLessThanOrEqual(1);
            expect(res.body.meta.page).toBe(1);
            expect(res.body.meta.limit).toBe(1);
        });

        it('supports search via q parameter', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/sets?q=Test').expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /api/v1/sets/:code', () => {
        it('returns set detail for existing set', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/sets/${TEST_SET_CODE}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('code', TEST_SET_CODE);
            expect(res.body.data).toHaveProperty('name');
            expect(res.body.data).toHaveProperty('type');
            expect(res.body.data).toHaveProperty('baseSize');
            expect(res.body.data).toHaveProperty('totalSize');
        });

        it('returns set prices when available', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/sets/${TEST_SET_CODE}`)
                .expect(200);

            expect(res.body.data).toHaveProperty('prices');
            if (res.body.data.prices) {
                expect(res.body.data.prices).toHaveProperty('basePrice');
                expect(res.body.data.prices).toHaveProperty('totalPrice');
            }
        });

        it('returns 404 for nonexistent set', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/sets/NONEXISTENT')
                .expect(404);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/v1/sets/:code/cards', () => {
        it('returns paginated cards in set', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/sets/${TEST_SET_CODE}/cards`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.meta).toBeDefined();

            const card = res.body.data[0];
            expect(card).toHaveProperty('id');
            expect(card).toHaveProperty('name');
            expect(card).toHaveProperty('setCode', TEST_SET_CODE);
            expect(card).toHaveProperty('number');
        });

        it('supports pagination for cards', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/sets/${TEST_SET_CODE}/cards?page=1&limit=1`)
                .expect(200);

            expect(res.body.data.length).toBeLessThanOrEqual(1);
            expect(res.body.meta.limit).toBe(1);
        });

        it('returns keyruneCode in card responses', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/sets/${TEST_SET_CODE}/cards`)
                .expect(200);

            expect(res.body.data.length).toBeGreaterThan(0);
            const card = res.body.data[0];
            expect(card).toHaveProperty('keyruneCode');
            expect(typeof card.keyruneCode).toBe('string');
        });

        it('returns the best NM buylist offer per card (6.3)', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/sets/${TEST_SET_CODE}/cards`)
                .expect(200);

            // Seed card 1 has CK normal 3.50 / Cardsphere normal 3.25 / CK foil 7.00,
            // so the best offer is the foil one and the finish is called out.
            const card = res.body.data.find((c) => c.number === '1');
            expect(card.bestBuylist).toBe(7);
            expect(card.bestBuylistFinish).toBe('foil');
        });

        it('supports filter parameter', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/sets/${TEST_SET_CODE}/cards?filter=Angel`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            for (const card of res.body.data) {
                expect(card.name.toLowerCase()).toContain('angel');
            }
        });

        it('supports baseOnly parameter', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/sets/${TEST_SET_CODE}/cards?baseOnly=true`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        describe('catalog filters', () => {
            it('filters by rarity', async () => {
                const res = await request(app.getHttpServer())
                    .get(`/api/v1/sets/${TEST_SET_CODE}/cards?rarity=mythic`)
                    .expect(200);

                expect(res.body.data.length).toBeGreaterThan(0);
                expect(
                    res.body.data.every((c: { rarity: string }) => c.rarity === 'mythic')
                ).toBe(true);
            });

            it('filters by type substring', async () => {
                const res = await request(app.getHttpServer())
                    .get(`/api/v1/sets/${TEST_SET_CODE}/cards?type=dragon`)
                    .expect(200);

                expect(res.body.data.length).toBeGreaterThan(0);
                expect(
                    res.body.data.every((c: { type: string }) =>
                        c.type.toLowerCase().includes('dragon')
                    )
                ).toBe(true);
            });

            it('filters by format=standard', async () => {
                const res = await request(app.getHttpServer())
                    .get(`/api/v1/sets/${TEST_SET_CODE}/cards?format=standard`)
                    .expect(200);

                expect(res.body.data.length).toBeGreaterThan(0);
            });

            it('returns no results for an unseeded format', async () => {
                const res = await request(app.getHttpServer())
                    .get(`/api/v1/sets/${TEST_SET_CODE}/cards?format=modern`)
                    .expect(200);

                expect(res.body.data).toEqual([]);
            });

            it('returns 400 for an unknown rarity', async () => {
                const res = await request(app.getHttpServer())
                    .get(`/api/v1/sets/${TEST_SET_CODE}/cards?rarity=foobar`)
                    .expect(400);

                expect(res.body.success).toBe(false);
                expect(res.body.param).toBe('rarity');
            });
        });
    });

    describe('GET /api/v1/sets/:code/price-history', () => {
        it('returns set price history', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/sets/${TEST_SET_CODE}/price-history`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('supports days parameter', async () => {
            const res = await request(app.getHttpServer())
                .get(`/api/v1/sets/${TEST_SET_CODE}/price-history?days=7`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('Auth guard enforcement', () => {
        it('does not require authentication for public set endpoints', async () => {
            await request(app.getHttpServer()).get('/api/v1/sets').expect(200);

            await request(app.getHttpServer()).get(`/api/v1/sets/${TEST_SET_CODE}`).expect(200);
        });
    });
});
