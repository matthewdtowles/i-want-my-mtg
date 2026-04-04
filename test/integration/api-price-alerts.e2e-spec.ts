import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    closeTestApp,
    loginTestUserApi,
    TEST_CARD_ID,
    TEST_CARD_ID_2,
    TEST_CARD_ID_3,
    TEST_CARD_ID_4,
} from './setup';

describe('Price Alerts API (e2e)', () => {
    let app: INestApplication;
    let bearerToken: string;
    let ds: DataSource;

    beforeAll(async () => {
        app = await createTestApp();
        bearerToken = await loginTestUserApi(app);
        ds = app.get(DataSource);
    }, 30000);

    afterAll(async () => {
        try {
            if (ds?.isInitialized) {
                await ds.query('DELETE FROM price_notification');
                await ds.query('DELETE FROM price_alert');
            }
        } catch {
            // best-effort cleanup
        }
        await closeTestApp(app);
    });

    describe('Auth guard enforcement', () => {
        it('GET /api/v1/price-alerts without auth returns 401', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/price-alerts')
                .expect(401);
            expect(res.body.success).toBe(false);
        });

        it('POST /api/v1/price-alerts without auth returns 401', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/price-alerts')
                .send({ cardId: TEST_CARD_ID, increasePct: 10 })
                .expect(401);
            expect(res.body.success).toBe(false);
        });

        it('GET /api/v1/notifications without auth returns 401', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/notifications')
                .expect(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('CRUD operations', () => {
        let alertId: number;

        afterAll(async () => {
            try {
                if (ds?.isInitialized) {
                    await ds.query('DELETE FROM price_alert');
                }
            } catch {
                // best-effort cleanup
            }
        });

        it('POST /api/v1/price-alerts creates an alert', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/price-alerts')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, increasePct: 10, decreasePct: 15 })
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data.cardId).toBe(TEST_CARD_ID);
            expect(Number(res.body.data.increasePct)).toBe(10);
            expect(Number(res.body.data.decreasePct)).toBe(15);
            expect(res.body.data.isActive).toBe(true);
            alertId = res.body.data.id;
        });

        it('POST /api/v1/price-alerts rejects duplicate', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/price-alerts')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID, increasePct: 5 })
                .expect(400);
        });

        it('POST /api/v1/price-alerts rejects missing thresholds', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/price-alerts')
                .set('Authorization', bearerToken)
                .send({ cardId: TEST_CARD_ID_2 })
                .expect(400);
        });

        it('GET /api/v1/price-alerts returns paginated alerts', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/price-alerts')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.meta).toBeDefined();
            expect(res.body.meta.total).toBeGreaterThan(0);
        });

        it('PATCH /api/v1/price-alerts/:id updates thresholds', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/api/v1/price-alerts/${alertId}`)
                .set('Authorization', bearerToken)
                .send({ increasePct: 20, isActive: false })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Number(res.body.data.increasePct)).toBe(20);
            expect(res.body.data.isActive).toBe(false);
        });

        it('DELETE /api/v1/price-alerts/:id deletes an alert', async () => {
            const res = await request(app.getHttpServer())
                .delete(`/api/v1/price-alerts/${alertId}`)
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.deleted).toBe(true);
        });

        it('DELETE /api/v1/price-alerts/:id returns 404 for non-existent', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/price-alerts/99999`)
                .set('Authorization', bearerToken)
                .expect(404);
        });
    });

    describe('Price change detection (4-card scenario)', () => {
        beforeAll(async () => {
            // Clean slate
            await ds.query('DELETE FROM price_notification');
            await ds.query('DELETE FROM price_alert');

            // Create 4 alerts:
            // Card 1: increase alert @ 10% — will trigger (+20%)
            // Card 2: increase alert @ 10% — will NOT trigger (+6.7%)
            // Card 3: decrease alert @ 10% — will trigger (-20%)
            // Card 4: decrease alert @ 10% — will NOT trigger (-5%)
            const userRows = await ds.query(
                `SELECT id FROM users WHERE email = 'integ@test.com'`
            );
            const userId = userRows[0].id;

            await ds.query(
                `INSERT INTO price_alert (user_id, card_id, increase_pct, decrease_pct, is_active)
                 VALUES
                    ($1, $2, 10, NULL, true),
                    ($1, $3, 10, NULL, true),
                    ($1, $4, NULL, 10, true),
                    ($1, $5, NULL, 10, true)`,
                [userId, TEST_CARD_ID, TEST_CARD_ID_2, TEST_CARD_ID_3, TEST_CARD_ID_4]
            );

            // Insert "yesterday" price history entries
            await ds.query(
                `INSERT INTO price_history (card_id, normal, foil, date)
                 VALUES
                    ($1, 5.00, 10.00, CURRENT_DATE - INTERVAL '1 day'),
                    ($2, 1.50, 3.00, CURRENT_DATE - INTERVAL '1 day'),
                    ($3, 0.25, NULL, CURRENT_DATE - INTERVAL '1 day'),
                    ($4, 20.00, 40.00, CURRENT_DATE - INTERVAL '1 day')
                 ON CONFLICT (card_id, date) DO NOTHING`,
                [TEST_CARD_ID, TEST_CARD_ID_2, TEST_CARD_ID_3, TEST_CARD_ID_4]
            );

            // Update current prices to trigger/not-trigger thresholds
            await ds.query(
                `UPDATE price SET normal = 6.00 WHERE card_id = $1`,
                [TEST_CARD_ID]
            );
            await ds.query(
                `UPDATE price SET normal = 1.60 WHERE card_id = $1`,
                [TEST_CARD_ID_2]
            );
            await ds.query(
                `UPDATE price SET normal = 0.20 WHERE card_id = $1`,
                [TEST_CARD_ID_3]
            );
            await ds.query(
                `UPDATE price SET normal = 19.00 WHERE card_id = $1`,
                [TEST_CARD_ID_4]
            );
        });

        afterAll(async () => {
            // Restore original prices
            await ds.query(`UPDATE price SET normal = 5.00 WHERE card_id = $1`, [TEST_CARD_ID]);
            await ds.query(`UPDATE price SET normal = 1.50 WHERE card_id = $1`, [TEST_CARD_ID_2]);
            await ds.query(`UPDATE price SET normal = 0.25 WHERE card_id = $1`, [TEST_CARD_ID_3]);
            await ds.query(`UPDATE price SET normal = 20.00 WHERE card_id = $1`, [TEST_CARD_ID_4]);

            // Clean up test data
            await ds.query('DELETE FROM price_notification');
            await ds.query('DELETE FROM price_alert');
            await ds.query(
                `DELETE FROM price_history WHERE date = CURRENT_DATE - INTERVAL '1 day'`
            );
        });

        it('POST /api/v1/price-alerts/process requires API key', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/price-alerts/process')
                .expect(401);
        });

        it('POST /api/v1/price-alerts/process rejects wrong API key', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/price-alerts/process')
                .set('x-api-key', 'wrong-key')
                .expect(401);
        });

        it('POST /api/v1/price-alerts/process triggers correct alerts', async () => {
            // Set the API key env var for this test
            process.env.PRICE_ALERT_API_KEY = 'test-api-key-12345';

            const res = await request(app.getHttpServer())
                .post('/api/v1/price-alerts/process')
                .set('x-api-key', 'test-api-key-12345')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.notificationsSent).toBe(2);
            expect(res.body.data.usersNotified).toBe(1);
        });

        it('created correct notification records', async () => {
            const notifications = await ds.query(
                `SELECT card_id, direction, old_price, new_price, change_pct
                 FROM price_notification
                 ORDER BY direction, card_id`
            );

            expect(notifications.length).toBe(2);

            // Find the decrease notification (Card 3)
            const decreaseNotif = notifications.find(
                (n: any) => n.direction === 'decrease'
            );
            expect(decreaseNotif).toBeDefined();
            expect(decreaseNotif.card_id).toBe(TEST_CARD_ID_3);
            expect(Number(decreaseNotif.old_price)).toBe(0.25);
            expect(Number(decreaseNotif.new_price)).toBe(0.20);
            expect(Number(decreaseNotif.change_pct)).toBe(-20.0);

            // Find the increase notification (Card 1)
            const increaseNotif = notifications.find(
                (n: any) => n.direction === 'increase'
            );
            expect(increaseNotif).toBeDefined();
            expect(increaseNotif.card_id).toBe(TEST_CARD_ID);
            expect(Number(increaseNotif.old_price)).toBe(5.0);
            expect(Number(increaseNotif.new_price)).toBe(6.0);
            expect(Number(increaseNotif.change_pct)).toBe(20.0);
        });

        it('did NOT create notifications for below-threshold cards', async () => {
            const card2Notifs = await ds.query(
                `SELECT * FROM price_notification WHERE card_id = $1`,
                [TEST_CARD_ID_2]
            );
            expect(card2Notifs.length).toBe(0);

            const card4Notifs = await ds.query(
                `SELECT * FROM price_notification WHERE card_id = $1`,
                [TEST_CARD_ID_4]
            );
            expect(card4Notifs.length).toBe(0);
        });

        it('updated last_notified_at on triggered alerts only', async () => {
            const alerts = await ds.query(
                `SELECT card_id, last_notified_at FROM price_alert ORDER BY card_id`
            );

            const card1Alert = alerts.find((a: any) => a.card_id === TEST_CARD_ID);
            const card2Alert = alerts.find((a: any) => a.card_id === TEST_CARD_ID_2);
            const card3Alert = alerts.find((a: any) => a.card_id === TEST_CARD_ID_3);
            const card4Alert = alerts.find((a: any) => a.card_id === TEST_CARD_ID_4);

            expect(card1Alert.last_notified_at).not.toBeNull();
            expect(card2Alert.last_notified_at).toBeNull();
            expect(card3Alert.last_notified_at).not.toBeNull();
            expect(card4Alert.last_notified_at).toBeNull();
        });
    });

    describe('Notification history', () => {
        let notificationId: number;

        beforeAll(async () => {
            // Ensure we have notifications from the previous test suite
            // If not, create them manually
            const existing = await ds.query(
                `SELECT id FROM price_notification LIMIT 1`
            );
            if (existing.length === 0) {
                const userRows = await ds.query(
                    `SELECT id FROM users WHERE email = 'integ@test.com'`
                );
                const userId = userRows[0].id;
                await ds.query(
                    `INSERT INTO price_notification (user_id, card_id, direction, old_price, new_price, change_pct, is_read)
                     VALUES ($1, $2, 'increase', 5.00, 6.00, 20.00, false)`,
                    [userId, TEST_CARD_ID]
                );
            }
            const rows = await ds.query(
                `SELECT id FROM price_notification ORDER BY id LIMIT 1`
            );
            notificationId = rows[0].id;
        });

        afterAll(async () => {
            await ds.query('DELETE FROM price_notification');
        });

        it('GET /api/v1/notifications returns paginated notifications', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/notifications')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.meta).toBeDefined();
        });

        it('GET /api/v1/notifications/unread-count returns count', async () => {
            const res = await request(app.getHttpServer())
                .get('/api/v1/notifications/unread-count')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.count).toBeGreaterThanOrEqual(0);
        });

        it('PATCH /api/v1/notifications/:id/read marks as read', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/api/v1/notifications/${notificationId}/read`)
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);

            const row = await ds.query(
                `SELECT is_read FROM price_notification WHERE id = $1`,
                [notificationId]
            );
            expect(row[0].is_read).toBe(true);
        });

        it('PATCH /api/v1/notifications/read-all marks all as read', async () => {
            // Reset to unread first
            await ds.query(`UPDATE price_notification SET is_read = false`);

            const res = await request(app.getHttpServer())
                .patch('/api/v1/notifications/read-all')
                .set('Authorization', bearerToken)
                .expect(200);

            expect(res.body.success).toBe(true);

            const unread = await ds.query(
                `SELECT count(*) as cnt FROM price_notification WHERE is_read = false`
            );
            expect(Number(unread[0].cnt)).toBe(0);
        });
    });

    describe('Process endpoint auth', () => {
        it('POST /api/v1/price-alerts/process rejects when no PRICE_ALERT_API_KEY configured', async () => {
            delete process.env.PRICE_ALERT_API_KEY;

            await request(app.getHttpServer())
                .post('/api/v1/price-alerts/process')
                .set('x-api-key', 'any-key')
                .expect(401);
        });
    });
});
