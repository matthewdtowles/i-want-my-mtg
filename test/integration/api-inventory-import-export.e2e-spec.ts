import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    closeTestApp,
    loginTestUserApi,
    getTestUserId,
    TEST_CARD_ID,
    TEST_CARD_ID_2,
    TEST_SET_CODE,
} from './setup';

function buildCsv(headers: string, ...rows: string[]): Buffer {
    return Buffer.from([headers, ...rows].join('\n'));
}

const NATIVE_HEADER = 'id,name,set_code,number,quantity,foil';
const MOXFIELD_HEADER =
    '"Count","Tradelist Count","Name","Edition","Condition","Language","Foil","Tags","Last Modified","Collector Number","Alter","Proxy","Purchase Price"';

describe('Inventory Import/Export API (e2e)', () => {
    let app: INestApplication;
    let bearerToken: string;
    let ds: DataSource;
    let userId: number;

    beforeAll(async () => {
        app = await createTestApp();
        bearerToken = await loginTestUserApi(app);
        ds = app.get(DataSource);
        userId = await getTestUserId(app);
    }, 30000);

    beforeEach(async () => {
        await ds.query(`DELETE FROM inventory WHERE user_id = $1`, [userId]);
    });

    afterAll(async () => {
        try {
            if (ds?.isInitialized) {
                await ds.query(`DELETE FROM inventory WHERE user_id = $1`, [userId]);
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    describe('Auth guard enforcement', () => {
        it('POST /api/v1/inventory/import/cards without auth returns 401', async () => {
            const csv = buildCsv(NATIVE_HEADER, `,Test Angel,${TEST_SET_CODE},1,3,false`);
            const res = await request(app.getHttpServer())
                .post('/api/v1/inventory/import/cards')
                .attach('file', csv, 'inventory.csv')
                .expect(401);
            expect(res.body.success).toBe(false);
        });

        it('GET /api/v1/inventory/export without auth returns 401', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/inventory/export')
                .expect(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/inventory/import/cards', () => {
        it('imports a native IWMM CSV and returns JSON result', async () => {
            const csv = buildCsv(
                NATIVE_HEADER,
                `,Test Angel,${TEST_SET_CODE},1,3,false`,
                `,Test Sphinx,${TEST_SET_CODE},2,1,true`
            );
            const res = await request(app.getHttpServer())
                .post('/api/v1/inventory/import/cards')
                .set('Authorization', bearerToken)
                .attach('file', csv, 'inventory.csv')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                saved: 2,
                deleted: 0,
                skipped: 0,
                errorCount: 0,
                detectedFormat: 'native',
            });
            expect(res.body.data.errors).toEqual([]);

            const rows = await ds.query(
                `SELECT card_id, quantity, foil FROM inventory WHERE user_id = $1 ORDER BY card_id`,
                [userId]
            );
            expect(rows).toHaveLength(2);
            expect(rows).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ card_id: TEST_CARD_ID, quantity: 3, foil: false }),
                    expect.objectContaining({ card_id: TEST_CARD_ID_2, quantity: 1, foil: true }),
                ])
            );
        });

        it('auto-detects Moxfield format', async () => {
            const csv = buildCsv(
                MOXFIELD_HEADER,
                `"4","0","Test Angel","${TEST_SET_CODE}","NM","en","","","2026-01-01","1","False","False","0"`
            );
            const res = await request(app.getHttpServer())
                .post('/api/v1/inventory/import/cards')
                .set('Authorization', bearerToken)
                .attach('file', csv, 'moxfield.csv')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.detectedFormat).toBe('moxfield');
            expect(res.body.data.saved).toBe(1);
        });

        it('returns 400 when no file is attached', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/inventory/import/cards')
                .set('Authorization', bearerToken)
                .expect(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when CSV has an unknown column', async () => {
            const csv = buildCsv(
                'id,name,set_code,number,quantity,foil,bogus',
                `,Test Angel,${TEST_SET_CODE},1,3,false,oops`
            );
            const res = await request(app.getHttpServer())
                .post('/api/v1/inventory/import/cards')
                .set('Authorization', bearerToken)
                .attach('file', csv, 'inventory.csv')
                .expect(400);
            expect(res.body.success).toBe(false);
        });

        it('surfaces per-row errors for unresolved cards', async () => {
            const csv = buildCsv(NATIVE_HEADER, `,Bogus Card,zzz,99,1,false`);
            const res = await request(app.getHttpServer())
                .post('/api/v1/inventory/import/cards')
                .set('Authorization', bearerToken)
                .attach('file', csv, 'inventory.csv')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.saved).toBe(0);
            expect(res.body.data.errorCount).toBe(1);
            expect(res.body.data.errors[0]).toMatchObject({ row: 2 });
        });
    });

    describe('GET /api/v1/inventory/export', () => {
        it('returns CSV with the expected columns and rows', async () => {
            await ds.query(
                `INSERT INTO inventory (user_id, card_id, foil, quantity) VALUES ($1, $2, false, 4), ($1, $3, true, 1)`,
                [userId, TEST_CARD_ID, TEST_CARD_ID_2]
            );

            const res = await request(app.getHttpServer())
                .get('/api/v1/inventory/export')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.headers['content-type']).toMatch(/text\/csv/);
            expect(res.headers['content-disposition']).toMatch(/attachment; filename="inventory\.csv"/);

            const lines = res.text.trim().split('\n');
            expect(lines[0]).toBe('id,name,set_code,number,quantity,foil');
            expect(lines).toHaveLength(3);
            expect(res.text).toContain(`${TEST_CARD_ID},`);
            expect(res.text).toContain(`${TEST_CARD_ID_2},`);
            expect(res.text).toContain(',4,false');
            expect(res.text).toContain(',1,true');
        });

        it('returns only headers when inventory is empty', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/inventory/export')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.text.trim()).toBe('id,name,set_code,number,quantity,foil');
        });
    });

    describe('Round-trip', () => {
        it('export output can be re-imported losslessly', async () => {
            await ds.query(
                `INSERT INTO inventory (user_id, card_id, foil, quantity) VALUES ($1, $2, false, 2), ($1, $3, true, 5)`,
                [userId, TEST_CARD_ID, TEST_CARD_ID_2]
            );

            const exportRes = await request(app.getHttpServer())
                .get('/api/v1/inventory/export')
                .set('Authorization', bearerToken)
                .expect(200);

            await ds.query(`DELETE FROM inventory WHERE user_id = $1`, [userId]);

            const importRes = await request(app.getHttpServer())
                .post('/api/v1/inventory/import/cards')
                .set('Authorization', bearerToken)
                .attach('file', Buffer.from(exportRes.text), 'inventory.csv')
                .expect(200);

            expect(importRes.body.data.saved).toBe(2);
            expect(importRes.body.data.errorCount).toBe(0);

            const rows = await ds.query(
                `SELECT card_id, quantity, foil FROM inventory WHERE user_id = $1 ORDER BY card_id`,
                [userId]
            );
            expect(rows).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ card_id: TEST_CARD_ID, quantity: 2, foil: false }),
                    expect.objectContaining({ card_id: TEST_CARD_ID_2, quantity: 5, foil: true }),
                ])
            );
        });
    });
});
