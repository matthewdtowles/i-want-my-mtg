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

describe('Transaction CSV Import (e2e)', () => {
    let app: INestApplication;
    let authCookie: string;

    beforeAll(async () => {
        app = await createTestApp();
        authCookie = await loginTestUser(app);
    }, 30000);

    afterAll(async () => {
        try {
            const ds = app.get(DataSource);
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

    it('imports valid BUY transactions and renders result page', async () => {
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

        expect(res.text).toContain('added');
        expect(res.text).toContain('Import Complete');
    });

    it('resolves cards by set_code + number', async () => {
        const csv = buildCsv(
            HEADERS,
            `,Test Angel,${TEST_SET_CODE},1,BUY,1,5.00,,2025-03-01,,,`
        );

        const res = await request(app.getHttpServer())
            .post('/transactions/import')
            .set('Cookie', authCookie)
            .attach('file', csv, 'transactions.csv')
            .expect(201);

        expect(res.text).toContain('added');
    });

    it('reports errors for invalid rows without failing valid ones', async () => {
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

        expect(res.text).toContain('added');
        expect(res.text).toContain('had errors');
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
        expect(res.text).not.toContain('added');
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
        expect(res.text).not.toContain('added');
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
        expect(res.text).not.toContain('added');
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
        expect(res.text).not.toContain('added');
    });
});
