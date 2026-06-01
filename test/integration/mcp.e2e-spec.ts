import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    closeTestApp,
    createTestApp,
    getTestUserId,
    loginTestUserApi,
    TEST_CARD_ID,
    TEST_CARD_SET_CODE,
    TEST_CARD_NUMBER,
} from './setup';

const MCP_ACCEPT = 'application/json, text/event-stream';

interface JsonRpcResult {
    result?: { tools?: unknown[]; content?: { type: string; text: string }[]; isError?: boolean };
    error?: { code: number; message: string };
}

/** The payload a tool returns is JSON-stringified into the first text content block. */
function toolPayload(body: JsonRpcResult): any {
    const text = body.result?.content?.[0]?.text;
    return text ? JSON.parse(text) : undefined;
}

describe('MCP endpoint (e2e)', () => {
    let app: INestApplication;
    let bearerToken: string;
    let ds: DataSource;
    let userId: number;
    let apiKey: string;

    function mcp(payload: object, authKey?: string): request.Test {
        const req = request(app.getHttpServer())
            .post('/mcp')
            .set('Accept', MCP_ACCEPT)
            .set('Content-Type', 'application/json');
        if (authKey) req.set('Authorization', `Bearer ${authKey}`);
        return req.send(payload);
    }

    function callTool(name: string, args: object, authKey?: string): request.Test {
        return mcp(
            { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
            authKey
        );
    }

    beforeAll(async () => {
        app = await createTestApp();
        bearerToken = await loginTestUserApi(app);
        ds = app.get(DataSource);
        userId = await getTestUserId(app);

        await ds.query('DELETE FROM api_key WHERE user_id = $1', [userId]);
        await ds.query('DELETE FROM subscription WHERE user_id = $1', [userId]);
        await ds.query('DELETE FROM inventory WHERE user_id = $1', [userId]);

        const keyRes = await request(app.getHttpServer())
            .post('/api/v1/api-keys')
            .set('Authorization', bearerToken)
            .send({ name: 'mcp-e2e' })
            .expect(201);
        apiKey = keyRes.body.data.rawKey;
    }, 30000);

    afterAll(async () => {
        try {
            if (ds?.isInitialized) {
                await ds.query('DELETE FROM api_key WHERE user_id = $1', [userId]);
                await ds.query('DELETE FROM inventory WHERE user_id = $1', [userId]);
                await ds.query('DELETE FROM subscription WHERE user_id = $1', [userId]);
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    describe('tools/list', () => {
        it('returns the full 33-tool surface with snake_case names and descriptions', async () => {
            const res = await mcp({
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/list',
                params: {},
            }).expect(200);
            const tools = res.body.result.tools as {
                name: string;
                description: string;
                inputSchema: { type: string };
            }[];

            expect(tools).toHaveLength(33);
            for (const tool of tools) {
                expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
                expect(typeof tool.description).toBe('string');
                expect(tool.description.length).toBeGreaterThan(10);
                expect(tool.inputSchema.type).toBe('object');
            }
            expect(tools.map((t) => t.name)).toEqual(
                expect.arrayContaining(['search_cards', 'list_inventory'])
            );
        });

        it('works without authentication (Smithery scans anonymously)', async () => {
            await mcp({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }).expect(200);
        });
    });

    describe('read-only tools (no auth)', () => {
        it('get_card resolves a seeded printing anonymously', async () => {
            const res = await callTool('get_card', {
                setCode: TEST_CARD_SET_CODE,
                setNumber: TEST_CARD_NUMBER,
            }).expect(200);

            expect(res.body.result.isError).toBeFalsy();
            const payload = toolPayload(res.body);
            expect(payload.success).toBe(true);
            expect(payload.data.name).toBe('Test Angel');
        });

        it('list_set_cards returns the seeded set anonymously', async () => {
            const res = await callTool('list_set_cards', { code: TEST_CARD_SET_CODE }).expect(200);
            const payload = toolPayload(res.body);
            expect(payload.success).toBe(true);
            expect(Array.isArray(payload.data)).toBe(true);
            expect(payload.data.length).toBeGreaterThan(0);
        });
    });

    describe('authenticated tools', () => {
        it('list_inventory without a key returns a clean MCP auth error (not a crash)', async () => {
            const res = await callTool('list_inventory', {}).expect(200);
            expect(res.body.result.isError).toBe(true);
            expect(res.body.result.content[0].text).toMatch(/api[- ]?key/i);
        });

        it('write + read round-trips against the key owner only', async () => {
            const add = await callTool(
                'add_inventory',
                { items: [{ cardId: TEST_CARD_ID, quantity: 2, isFoil: false }] },
                apiKey
            ).expect(200);
            expect(add.body.result.isError).toBeFalsy();

            const quantities = await callTool(
                'get_inventory_quantities',
                { cardIds: [TEST_CARD_ID] },
                apiKey
            ).expect(200);
            const payload = toolPayload(quantities.body);
            expect(payload.success).toBe(true);
            const row = payload.data.find((r: { cardId: string }) => r.cardId === TEST_CARD_ID);
            expect(row).toBeDefined();

            // Verify it actually wrote against this key's user in the database.
            const rows = await ds.query(
                'SELECT quantity FROM inventory WHERE user_id = $1 AND card_id = $2 AND foil = false',
                [userId, TEST_CARD_ID]
            );
            expect(rows[0]?.quantity).toBe(2);
        });
    });

    describe('premium gating', () => {
        it('get_portfolio_history is blocked for a free key, mirroring the REST 403', async () => {
            const res = await callTool('get_portfolio_history', {}, apiKey).expect(200);
            expect(res.body.result.isError).toBe(true);
            expect(res.body.result.content[0].text).toMatch(/Premium/);
        });
    });

    describe('protocol', () => {
        it('GET /mcp is 405 in stateless mode', async () => {
            await request(app.getHttpServer()).get('/mcp').expect(405);
        });

        it('unknown tool returns an MCP error result', async () => {
            const res = await callTool('does_not_exist', {}).expect(200);
            expect(res.body.result.isError).toBe(true);
            expect(res.body.result.content[0].text).toMatch(/Unknown tool/);
        });
    });
});
