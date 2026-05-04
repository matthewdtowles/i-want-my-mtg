import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { closeTestApp, createTestApp, getTestUserId, loginTestUserApi } from './setup';

describe('API Keys API (e2e)', () => {
    let app: INestApplication;
    let bearerToken: string;
    let ds: DataSource;
    let userId: number;

    beforeAll(async () => {
        app = await createTestApp();
        bearerToken = await loginTestUserApi(app);
        ds = app.get(DataSource);
        userId = await getTestUserId(app);
        await ds.query('DELETE FROM api_key WHERE user_id = $1', [userId]);
    }, 30000);

    afterAll(async () => {
        try {
            if (ds?.isInitialized) {
                await ds.query('DELETE FROM api_key WHERE user_id = $1', [userId]);
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    beforeEach(async () => {
        if (ds?.isInitialized) {
            await ds.query('DELETE FROM api_key WHERE user_id = $1', [userId]);
        }
    });

    describe('Auth guard enforcement', () => {
        it('GET /api/v1/api-keys without auth returns 401', async () => {
            await request(app.getHttpServer()).get('/api/v1/api-keys').expect(401);
        });

        it('POST /api/v1/api-keys without auth returns 401', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/api-keys')
                .send({ name: 'test' })
                .expect(401);
        });
    });

    describe('POST /api/v1/api-keys', () => {
        it('creates a key, returns the raw value once, and stores only the hash', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/api-keys')
                .set('Authorization', bearerToken)
                .send({ name: 'integration test' })
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data.rawKey).toMatch(/^iwm_live_[A-Za-z0-9_-]+$/);
            expect(res.body.data.keyPrefix).toBe(res.body.data.rawKey.slice(0, 13));
            expect(res.body.data.name).toBe('integration test');
            expect(res.body.message).toMatch(/not be shown/i);

            const rows = await ds.query(
                'SELECT key_hash, key_prefix FROM api_key WHERE user_id = $1',
                [userId]
            );
            expect(rows).toHaveLength(1);
            expect(rows[0].key_hash).not.toContain(res.body.data.rawKey);
            expect(rows[0].key_prefix).toBe(res.body.data.keyPrefix);
        });

        it('rejects empty name with 400', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/api-keys')
                .set('Authorization', bearerToken)
                .send({ name: '   ' })
                .expect(400);
        });

        it('rejects creating a second active key', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/api-keys')
                .set('Authorization', bearerToken)
                .send({ name: 'first' })
                .expect(201);
            const res = await request(app.getHttpServer())
                .post('/api/v1/api-keys')
                .set('Authorization', bearerToken)
                .send({ name: 'second' })
                .expect(400);
            expect(res.body.error).toMatch(/already have an active/i);
        });
    });

    describe('GET /api/v1/api-keys', () => {
        it('lists user keys without exposing key_hash', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/api-keys')
                .set('Authorization', bearerToken)
                .send({ name: 'listed' })
                .expect(201);

            const res = await request(app.getHttpServer())
                .get('/api/v1/api-keys')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].name).toBe('listed');
            expect(res.body.data[0]).not.toHaveProperty('keyHash');
            expect(res.body.data[0]).not.toHaveProperty('rawKey');
        });
    });

    describe('DELETE /api/v1/api-keys/:id', () => {
        it('revokes the user\'s key (soft delete) and frees the active slot', async () => {
            const created = await request(app.getHttpServer())
                .post('/api/v1/api-keys')
                .set('Authorization', bearerToken)
                .send({ name: 'to revoke' })
                .expect(201);
            const keyId = created.body.data.id;

            await request(app.getHttpServer())
                .delete(`/api/v1/api-keys/${keyId}`)
                .set('Authorization', bearerToken)
                .expect(204);

            const rows = await ds.query(
                'SELECT revoked_at FROM api_key WHERE id = $1',
                [keyId]
            );
            expect(rows[0].revoked_at).not.toBeNull();

            // Slot freed: can create a new active key.
            await request(app.getHttpServer())
                .post('/api/v1/api-keys')
                .set('Authorization', bearerToken)
                .send({ name: 'replacement' })
                .expect(201);
        });

        it('returns 404 for unknown id', async () => {
            await request(app.getHttpServer())
                .delete('/api/v1/api-keys/999999')
                .set('Authorization', bearerToken)
                .expect(404);
        });
    });
});
