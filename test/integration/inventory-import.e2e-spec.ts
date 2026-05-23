import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    closeTestApp,
    loginTestUser,
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
const DECKBOX_HEADER =
    '"Count","Tradelist Count","Name","Edition","Card Number","Condition","Language","Foil","Signed","Artist Proof","Altered Art","Misprint","Promo","Textless","My Price"';
const ARCHIDEKT_HEADER =
    'Quantity,Name,Finish,Condition,Date Added,Language,Purchase Price,Tags,Edition Name,Edition Code,Multiverse Id,Scryfall ID,MTGO ID,Collector Number';
const TCG_APP_HEADER =
    'Quantity,Name,Simple Name,Set,Card Number,Set Code,Printing,Condition,Language,Rarity,Product ID,SKU,Price Each';
const TCG_SELLER_HEADER =
    'TCGplayer Id,Product Line,Set Name,Product Name,Title,Number,Rarity,Condition,TCG Market Price,Total Quantity,TCG Marketplace Price,Photo URL';

describe('Inventory CSV Import (e2e)', () => {
    let app: INestApplication;
    let authCookie: string;
    let ds: DataSource;
    let userId: number;

    beforeAll(async () => {
        app = await createTestApp();
        authCookie = await loginTestUser(app);
        ds = app.get(DataSource);
        userId = await getTestUserId(app);
    }, 30000);

    beforeEach(async () => {
        // Reset inventory between tests so foil/non-foil assertions are independent.
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

    async function invRows(): Promise<Array<{ card_id: string; quantity: number; foil: boolean }>> {
        return ds.query(
            `SELECT card_id, quantity, foil FROM inventory WHERE user_id = $1 ORDER BY card_id, foil`,
            [userId]
        );
    }

    it('imports a native IWMM CSV', async () => {
        const csv = buildCsv(NATIVE_HEADER, `,Test Angel,${TEST_SET_CODE},1,3,false`);
        const res = await request(app.getHttpServer())
            .post('/inventory/import/cards')
            .set('Cookie', authCookie)
            .attach('file', csv, 'inventory.csv')
            .expect(201);
        expect(res.text).toContain('Import Complete');
        const rows = await invRows();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ card_id: TEST_CARD_ID, quantity: 3, foil: false });
    });

    it('imports a Moxfield CSV (set_code + collector number)', async () => {
        const csv = buildCsv(
            MOXFIELD_HEADER,
            `"4","0","Test Angel","${TEST_SET_CODE}","NM","en","","","2026-01-01","1","False","False","0"`,
            `"2","0","Test Sphinx","${TEST_SET_CODE}","NM","en","foil","","2026-01-01","2","False","False","0"`
        );
        const res = await request(app.getHttpServer())
            .post('/inventory/import/cards')
            .set('Cookie', authCookie)
            .attach('file', csv, 'moxfield.csv')
            .expect(201);
        expect(res.text).toContain('Import Complete');
        const rows = await invRows();
        expect(rows).toHaveLength(2);
        expect(rows).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ card_id: TEST_CARD_ID, quantity: 4, foil: false }),
                expect.objectContaining({ card_id: TEST_CARD_ID_2, quantity: 2, foil: true }),
            ])
        );
    });

    it('imports a Deckbox CSV (set name lookup)', async () => {
        // Deckbox CSVs identify the set by its full name; resolver must look it up.
        const csv = buildCsv(
            DECKBOX_HEADER,
            `"1","0","Test Angel","Test Set","1","NM","English","","","","","","","","0"`,
            `"3","0","Test Sphinx","Test Set","2","NM","English","foil","","","","","","","0"`
        );
        const res = await request(app.getHttpServer())
            .post('/inventory/import/cards')
            .set('Cookie', authCookie)
            .attach('file', csv, 'deckbox.csv')
            .expect(201);
        expect(res.text).toContain('Import Complete');
        const rows = await invRows();
        expect(rows).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ card_id: TEST_CARD_ID, quantity: 1, foil: false }),
                expect.objectContaining({ card_id: TEST_CARD_ID_2, quantity: 3, foil: true }),
            ])
        );
    });

    it('reports an error when Deckbox set name does not resolve', async () => {
        const csv = buildCsv(
            DECKBOX_HEADER,
            `"1","0","Test Angel","Unknown Set","1","NM","English","","","","","","","","0"`
        );
        const res = await request(app.getHttpServer())
            .post('/inventory/import/cards')
            .set('Cookie', authCookie)
            .attach('file', csv, 'deckbox.csv')
            .expect(201);
        expect(res.text).toContain('had errors');
        expect(await invRows()).toHaveLength(0);
    });

    it('imports an Archidekt CSV', async () => {
        const csv = buildCsv(
            ARCHIDEKT_HEADER,
            `2,Test Angel,Foil,NM,,,,,Test Set,${TEST_SET_CODE},,${TEST_CARD_ID},,1`
        );
        const res = await request(app.getHttpServer())
            .post('/inventory/import/cards')
            .set('Cookie', authCookie)
            .attach('file', csv, 'archidekt.csv')
            .expect(201);
        expect(res.text).toContain('Import Complete');
        const rows = await invRows();
        expect(rows[0]).toMatchObject({ card_id: TEST_CARD_ID, quantity: 2, foil: true });
    });

    it('imports a TCGPlayer app CSV', async () => {
        const csv = buildCsv(
            TCG_APP_HEADER,
            `5,Test Angel,Test Angel,Test Set,1,${TEST_SET_CODE},Normal,NM,en,Rare,1,SKU1,0`,
            `1,Test Sphinx,Test Sphinx,Test Set,2,${TEST_SET_CODE},Foil,NM,en,Uncommon,2,SKU2,0`
        );
        const res = await request(app.getHttpServer())
            .post('/inventory/import/cards')
            .set('Cookie', authCookie)
            .attach('file', csv, 'tcg-app.csv')
            .expect(201);
        expect(res.text).toContain('Import Complete');
        const rows = await invRows();
        expect(rows).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ card_id: TEST_CARD_ID, quantity: 5, foil: false }),
                expect.objectContaining({ card_id: TEST_CARD_ID_2, quantity: 1, foil: true }),
            ])
        );
    });

    it('imports a TCGPlayer seller CSV and skips non-Magic rows', async () => {
        const csv = buildCsv(
            TCG_SELLER_HEADER,
            '1,Pokemon,Base Set,Charizard,,4,Rare,NM,200,3,300,',
            `1,Magic,Test Set,Test Angel,,1,Rare,NM,1,2,1.5,`
        );
        const res = await request(app.getHttpServer())
            .post('/inventory/import/cards')
            .set('Cookie', authCookie)
            .attach('file', csv, 'tcg-seller.csv')
            .expect(201);
        expect(res.text).toContain('Import Complete');
        const rows = await invRows();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ card_id: TEST_CARD_ID, quantity: 2, foil: false });
    });
});
