import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
    createTestApp,
    closeTestApp,
    TEST_SET_CODE,
    TEST_CARD_SET_CODE,
    TEST_CARD_NUMBER,
    TEST_CARD_ID,
} from './setup';

describe('Public endpoints (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    }, 30000);

    afterAll(async () => {
        await closeTestApp(app);
    });

    describe('Home', () => {
        it('GET / returns 200', () => {
            return request(app.getHttpServer()).get('/').expect(200);
        });

        it('GET /robots.txt returns plain text with disallow rules', async () => {
            const res = await request(app.getHttpServer()).get('/robots.txt').expect(200);
            expect(res.text).toContain('User-agent: *');
            expect(res.text).toContain('Disallow: /auth');
            expect(res.text).toContain('Disallow: /inventory');
        });
    });

    describe('Sets', () => {
        it('GET /sets returns 200', () => {
            return request(app.getHttpServer()).get('/sets').expect(200);
        });

        it('GET /sets/:code returns 200 for existing set', () => {
            return request(app.getHttpServer()).get(`/sets/${TEST_SET_CODE}`).expect(200);
        });

        it('GET /sets/:code/price-history returns JSON', async () => {
            const res = await request(app.getHttpServer())
                .get(`/sets/${TEST_SET_CODE}/price-history`)
                .expect(200);
            expect(res.body).toHaveProperty('setCode', TEST_SET_CODE);
            expect(res.body).toHaveProperty('prices');
            expect(res.body.prices.length).toBeGreaterThan(0);
        });

        it('GET /sets/:code/checklist returns CSV', async () => {
            const res = await request(app.getHttpServer())
                .get(`/sets/${TEST_SET_CODE}/checklist`)
                .expect(200);
            expect(res.headers['content-type']).toContain('text/csv');
        });
    });

    describe('Cards', () => {
        it('GET /card/:setCode/:setNumber returns 200 for existing card', () => {
            return request(app.getHttpServer())
                .get(`/card/${TEST_CARD_SET_CODE}/${TEST_CARD_NUMBER}`)
                .expect(200);
        });

        it('GET /card/:cardId/price-history returns JSON', async () => {
            const res = await request(app.getHttpServer())
                .get(`/card/${TEST_CARD_ID}/price-history`)
                .expect(200);
            expect(res.body).toHaveProperty('cardId', TEST_CARD_ID);
            expect(res.body).toHaveProperty('prices');
            expect(res.body.prices.length).toBeGreaterThan(0);
        });
    });

    describe('Search', () => {
        it('GET /search returns 200', () => {
            return request(app.getHttpServer()).get('/search?q=Test').expect(200);
        });

        it('GET /search/suggest returns JSON suggestions', async () => {
            const res = await request(app.getHttpServer())
                .get('/search/suggest?q=Angel')
                .expect(200);
            expect(res.body).toHaveProperty('cards');
            expect(res.body).toHaveProperty('query');
        });
    });

    describe('Spoilers', () => {
        it('GET /spoilers returns 200', () => {
            return request(app.getHttpServer()).get('/spoilers').expect(200);
        });
    });

    describe('Auth guard enforcement', () => {
        it('GET /inventory without auth returns 403', () => {
            return request(app.getHttpServer()).get('/inventory').expect(403);
        });

        it('GET /user without auth returns 403', () => {
            return request(app.getHttpServer()).get('/user').expect(403);
        });

        it('GET /portfolio without auth returns 403', () => {
            return request(app.getHttpServer()).get('/portfolio').expect(403);
        });

        it('GET /transactions without auth returns 403', () => {
            return request(app.getHttpServer()).get('/transactions').expect(403);
        });

        it('POST /inventory without auth returns 403', () => {
            return request(app.getHttpServer())
                .post('/inventory')
                .send([{ cardId: TEST_CARD_ID, quantity: 1, isFoil: false, userId: 1 }])
                .expect(403);
        });
    });
});
