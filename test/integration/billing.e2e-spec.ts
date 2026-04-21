import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { join } from 'path';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.config';
import { StripeGatewayPort } from 'src/core/billing/ports/stripe-gateway.port';
import { SubscriptionPlan } from 'src/core/billing/subscription-plan.enum';
import type { Stripe } from 'src/core/billing/stripe.types';
import { loginTestUser, TEST_USER } from './setup';

const VIEWS_DIR = join(process.cwd(), 'src', 'http', 'views');

const MONTHLY_PRICE_ID = 'price_monthly';
const ANNUAL_PRICE_ID = 'price_annual';

class FakeStripeGateway {
    events: Stripe.Event[] = [];
    createCustomerCalls: Array<{ email: string; name?: string; userId: number }> = [];
    checkoutCalls: Array<{ customerId: string; plan: SubscriptionPlan }> = [];
    portalCalls: Array<{ customerId: string }> = [];

    async createCustomer(params: {
        email: string;
        name?: string;
        userId: number;
    }): Promise<string> {
        this.createCustomerCalls.push(params);
        return `cus_fake_${params.userId}`;
    }

    async createCheckoutSession(params: {
        customerId: string;
        plan: SubscriptionPlan;
    }): Promise<{ url: string }> {
        this.checkoutCalls.push({ customerId: params.customerId, plan: params.plan });
        return { url: `https://checkout.stripe.test/${params.plan}` };
    }

    async createBillingPortalSession(params: { customerId: string }): Promise<{ url: string }> {
        this.portalCalls.push({ customerId: params.customerId });
        return { url: 'https://billing.stripe.test/portal' };
    }

    async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        return {
            id: subscriptionId,
            customer: 'cus_fake_from_retrieve',
            status: 'active',
            cancel_at_period_end: false,
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
            items: { data: [{ price: { id: MONTHLY_PRICE_ID } }] },
        } as unknown as Stripe.Subscription;
    }

    constructEvent(rawBody: Buffer | string): Stripe.Event {
        const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
        return JSON.parse(body) as Stripe.Event;
    }

    priceIdForPlan(plan: SubscriptionPlan): string {
        return plan === SubscriptionPlan.Annual ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;
    }

    planForPriceId(priceId: string): SubscriptionPlan | null {
        if (priceId === MONTHLY_PRICE_ID) return SubscriptionPlan.Monthly;
        if (priceId === ANNUAL_PRICE_ID) return SubscriptionPlan.Annual;
        return null;
    }
}

describe('Billing (e2e)', () => {
    let app: INestApplication;
    let ds: DataSource;
    let fakeStripe: FakeStripeGateway;
    let userId: number;
    let authCookie: string;

    const envSnapshot: Record<string, string | undefined> = {};
    const ENV_KEYS = [
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'STRIPE_PRICE_MONTHLY',
        'STRIPE_PRICE_ANNUAL',
        'APP_URL',
    ];

    beforeAll(async () => {
        for (const k of ENV_KEYS) envSnapshot[k] = process.env[k];
        process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';
        process.env.STRIPE_PRICE_MONTHLY = MONTHLY_PRICE_ID;
        process.env.STRIPE_PRICE_ANNUAL = ANNUAL_PRICE_ID;
        process.env.APP_URL = 'http://localhost:3000';

        fakeStripe = new FakeStripeGateway();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(StripeGatewayPort)
            .useValue(fakeStripe)
            .compile();

        app = moduleFixture.createNestApplication({ rawBody: true });
        configureApp(app, VIEWS_DIR);
        await app.init();

        ds = app.get(DataSource);
        const rows = await ds.query(`SELECT id FROM users WHERE email = $1`, [TEST_USER.email]);
        userId = rows[0].id;

        await ds.query('DELETE FROM subscription WHERE user_id = $1', [userId]);

        authCookie = await loginTestUser(app);
    }, 30000);

    afterAll(async () => {
        try {
            if (ds?.isInitialized) {
                await ds.query('DELETE FROM subscription WHERE user_id = $1', [userId]);
            }
        } catch {
            // best-effort
        }
        for (const k of ENV_KEYS) {
            if (envSnapshot[k] === undefined) delete process.env[k];
            else process.env[k] = envSnapshot[k];
        }
        if (ds?.isInitialized) await ds.destroy();
        await app?.close().catch(() => {});
    });

    describe('Auth enforcement', () => {
        it('GET /billing without auth redirects to login', async () => {
            const res = await request(app.getHttpServer()).get('/billing');
            expect([302, 401]).toContain(res.status);
        });

        it('POST /billing/checkout without auth is rejected', async () => {
            const res = await request(app.getHttpServer())
                .post('/billing/checkout')
                .send('plan=monthly');
            expect([302, 401]).toContain(res.status);
        });
    });

    describe('Checkout flow', () => {
        it('POST /billing/checkout redirects to Stripe and creates a subscription row', async () => {
            const res = await request(app.getHttpServer())
                .post('/billing/checkout')
                .set('Cookie', authCookie)
                .type('form')
                .send({ plan: 'monthly' })
                .expect(303);

            expect(res.headers.location).toBe('https://checkout.stripe.test/monthly');
            expect(fakeStripe.createCustomerCalls.length).toBeGreaterThan(0);
            expect(fakeStripe.checkoutCalls[0].plan).toBe(SubscriptionPlan.Monthly);

            const rows = await ds.query(
                `SELECT user_id, stripe_customer_id, status FROM subscription WHERE user_id = $1`,
                [userId]
            );
            expect(rows.length).toBe(1);
            expect(rows[0].stripe_customer_id).toBe(`cus_fake_${userId}`);
            expect(rows[0].status).toBe('incomplete');
        });

        it('POST /billing/checkout rejects an invalid plan with error redirect', async () => {
            const res = await request(app.getHttpServer())
                .post('/billing/checkout')
                .set('Cookie', authCookie)
                .type('form')
                .send({ plan: 'lifetime' })
                .expect(302);
            expect(res.headers.location).toBe('/billing?error=invalid_plan');
        });
    });

    describe('Webhook: customer.subscription.updated', () => {
        it('upserts the subscription row from the synthetic payload', async () => {
            const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
            const payload = {
                id: 'evt_test_update',
                type: 'customer.subscription.updated',
                data: {
                    object: {
                        id: 'sub_fake_1',
                        customer: `cus_fake_${userId}`,
                        status: 'active',
                        cancel_at_period_end: false,
                        current_period_end: periodEnd,
                        items: { data: [{ price: { id: MONTHLY_PRICE_ID } }] },
                    },
                },
            };

            await request(app.getHttpServer())
                .post('/api/v1/billing/webhooks/stripe')
                .set('stripe-signature', 'test-sig')
                .set('content-type', 'application/json')
                .send(payload)
                .expect(200);

            const rows = await ds.query(
                `SELECT status, plan, stripe_subscription_id, stripe_price_id, cancel_at_period_end
                 FROM subscription WHERE user_id = $1`,
                [userId]
            );
            expect(rows.length).toBe(1);
            expect(rows[0].status).toBe('active');
            expect(rows[0].plan).toBe('monthly');
            expect(rows[0].stripe_subscription_id).toBe('sub_fake_1');
            expect(rows[0].stripe_price_id).toBe(MONTHLY_PRICE_ID);
            expect(rows[0].cancel_at_period_end).toBe(false);
        });
    });

    describe('Billing view when active', () => {
        it('GET /billing renders page containing Manage Billing affordance', async () => {
            const res = await request(app.getHttpServer())
                .get('/billing')
                .set('Cookie', authCookie)
                .expect(200);
            expect(res.text).toMatch(/billing/i);
        });

        it('POST /billing/portal redirects to Stripe portal URL', async () => {
            const res = await request(app.getHttpServer())
                .post('/billing/portal')
                .set('Cookie', authCookie)
                .expect(303);
            expect(res.headers.location).toBe('https://billing.stripe.test/portal');
            expect(fakeStripe.portalCalls[0].customerId).toBe(`cus_fake_${userId}`);
        });
    });

    describe('Webhook: customer.subscription.deleted', () => {
        it('marks the subscription canceled', async () => {
            const payload = {
                id: 'evt_test_delete',
                type: 'customer.subscription.deleted',
                data: { object: { id: 'sub_fake_1' } },
            };

            await request(app.getHttpServer())
                .post('/api/v1/billing/webhooks/stripe')
                .set('stripe-signature', 'test-sig')
                .set('content-type', 'application/json')
                .send(payload)
                .expect(200);

            const rows = await ds.query(
                `SELECT status FROM subscription WHERE user_id = $1`,
                [userId]
            );
            expect(rows[0].status).toBe('canceled');
        });
    });

    describe('Webhook signature / body validation', () => {
        it('rejects missing stripe-signature header with 400', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/billing/webhooks/stripe')
                .set('content-type', 'application/json')
                .send({ id: 'evt_nope', type: 'customer.subscription.updated', data: { object: {} } })
                .expect(400);
        });

        it('returns 200 for unhandled event types', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/billing/webhooks/stripe')
                .set('stripe-signature', 'test-sig')
                .set('content-type', 'application/json')
                .send({ id: 'evt_unhandled', type: 'customer.created', data: { object: {} } })
                .expect(200);
        });
    });
});
