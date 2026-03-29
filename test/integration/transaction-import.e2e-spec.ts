import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    closeTestApp,
    loginTestUser,
    TEST_CARD_ID,
    TEST_CARD_ID_2,
    TEST_SET_CODE,
} from './setup';

function buildCsv(headers: string, ...rows: string[]): Buffer {
    return Buffer.from([headers, ...rows].join('\n'));
}

const HEADERS = 'id,name,set_code,number,type,quantity,price_per_unit,foil,date,source,fees,notes';

async function txCount(ds: DataSource): Promise<number> {
    const [{ cnt }] = await ds.query(`SELECT COUNT(*) as cnt FROM "transaction" WHERE user_id = 1`);
    return Number(cnt);
}

describe('Transaction CSV Import (e2e)', () => {
    let app: INestApplication;
    let authCookie: string;
    let ds: DataSource;

    beforeAll(async () => {
        app = await createTestApp();
        authCookie = await loginTestUser(app);
        ds = app.get(DataSource);
    }, 30000);

    afterAll(async () => {
        try {
            if (ds?.isInitialized) {
                await ds.query(`DELETE FROM inventory WHERE user_id = 1`);
                await ds.query(`DELETE FROM "transaction" WHERE user_id = 1`);
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    it('returns 401 when unauthenticated', async () => {
        const csv = buildCsv(HEADERS, `${TEST_CARD_ID},,,,BUY,1,2.50,,2025-01-15,,,`);
        await request(app.getHttpServer())
            .post('/transactions/import')
            .attach('file', csv, 'transactions.csv')
            .expect(401);
    });

    it('returns 400 when no file is provided', async () => {
        await request(app.getHttpServer())
            .post('/transactions/import')
            .set('Cookie', authCookie)
            .expect(400);
    });

    it('imports valid BUY transactions and persists them to the database', async () => {
        const before = await txCount(ds);

        const csv = buildCsv(
            HEADERS,
            `${TEST_CARD_ID},,,,BUY,2,3.50,false,2025-01-15,Test LGS,0.25,First buy`,
            `${TEST_CARD_ID_2},,,,BUY,1,1.00,,2025-02-01,,,`
        );

        const res = await request(app.getHttpServer())
            .post('/transactions/import')
            .set('Cookie', authCookie)
            .attach('file', csv, 'transactions.csv')
            .expect(201);

        expect(res.text).toContain('saved');
        expect(res.text).toContain('Import Complete');

        expect(await txCount(ds)).toBe(before + 2);

        const newRows = await ds.query(
            `SELECT * FROM "transaction" WHERE user_id = 1 ORDER BY id DESC LIMIT 2`
        );

        const row1 = newRows.find((r: any) => r.card_id === TEST_CARD_ID);
        expect(row1).toBeDefined();
        expect(Number(row1.quantity)).toBe(2);
        expect(Number(row1.price_per_unit)).toBe(3.5);
        expect(row1.source).toBe('Test LGS');
        expect(Number(row1.fees)).toBe(0.25);
        expect(row1.notes).toBe('First buy');
        expect(row1.is_foil).toBe(false);
        expect(row1.type).toBe('BUY');

        const row2 = newRows.find((r: any) => r.card_id === TEST_CARD_ID_2);
        expect(row2).toBeDefined();
        expect(Number(row2.quantity)).toBe(1);
        expect(Number(row2.price_per_unit)).toBe(1.0);
        expect(row2.source).toBeNull();
        expect(row2.fees).toBeNull();
    });

    it('resolves card by set_code + number and saves with correct card_id', async () => {
        const before = await txCount(ds);

        const csv = buildCsv(
            HEADERS,
            `,Test Angel,${TEST_SET_CODE},1,BUY,1,5.00,,2025-03-01,,,`
        );

        const res = await request(app.getHttpServer())
            .post('/transactions/import')
            .set('Cookie', authCookie)
            .attach('file', csv, 'transactions.csv')
            .expect(201);

        expect(res.text).toContain('saved');

        expect(await txCount(ds)).toBe(before + 1);

        const [newRow] = await ds.query(
            `SELECT * FROM "transaction" WHERE user_id = 1 ORDER BY id DESC LIMIT 1`
        );
        expect(newRow.card_id).toBe(TEST_CARD_ID);
        expect(Number(newRow.quantity)).toBe(1);
        expect(Number(newRow.price_per_unit)).toBe(5.0);
    });

    it('saves valid rows and skips invalid rows in the same file', async () => {
        const before = await txCount(ds);

        const csv = buildCsv(
            HEADERS,
            `${TEST_CARD_ID},,,,BUY,1,2.00,,2025-04-01,,,`,
            `bad-id,,,,BUY,1,2.00,,2025-04-01,,,`,
        );

        const res = await request(app.getHttpServer())
            .post('/transactions/import')
            .set('Cookie', authCookie)
            .attach('file', csv, 'transactions.csv')
            .expect(201);

        expect(res.text).toContain('saved');
        expect(res.text).toContain('had errors');

        expect(await txCount(ds)).toBe(before + 1);
    });

    it('rejects rows with non-integer quantity like "4abc"', async () => {
        const csv = buildCsv(
            HEADERS,
            `${TEST_CARD_ID},,,,BUY,4abc,2.00,,2025-04-01,,,`
        );

        const res = await request(app.getHttpServer())
            .post('/transactions/import')
            .set('Cookie', authCookie)
            .attach('file', csv, 'transactions.csv')
            .expect(201);

        expect(res.text).toContain('had errors');
        expect(res.text).not.toContain('saved');
    });

    it('rejects rows with decimal quantity like "4.5"', async () => {
        const csv = buildCsv(
            HEADERS,
            `${TEST_CARD_ID},,,,BUY,4.5,2.00,,2025-04-01,,,`
        );

        const res = await request(app.getHttpServer())
            .post('/transactions/import')
            .set('Cookie', authCookie)
            .attach('file', csv, 'transactions.csv')
            .expect(201);

        expect(res.text).toContain('had errors');
        expect(res.text).not.toContain('saved');
    });

    it('rejects rows with malformed price like "2.50xyz"', async () => {
        const csv = buildCsv(
            HEADERS,
            `${TEST_CARD_ID},,,,BUY,1,2.50xyz,,2025-04-01,,,`
        );

        const res = await request(app.getHttpServer())
            .post('/transactions/import')
            .set('Cookie', authCookie)
            .attach('file', csv, 'transactions.csv')
            .expect(201);

        expect(res.text).toContain('had errors');
        expect(res.text).not.toContain('saved');
    });

    it('rejects rows with malformed fees like "1.00abc"', async () => {
        const csv = buildCsv(
            HEADERS,
            `${TEST_CARD_ID},,,,BUY,1,2.00,,2025-04-01,,1.00abc,`
        );

        const res = await request(app.getHttpServer())
            .post('/transactions/import')
            .set('Cookie', authCookie)
            .attach('file', csv, 'transactions.csv')
            .expect(201);

        expect(res.text).toContain('had errors');
        expect(res.text).not.toContain('saved');
    });
});
