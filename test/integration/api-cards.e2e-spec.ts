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
