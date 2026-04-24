# Stripe env vars for production

All four come from https://dashboard.stripe.com. Toggle to **Live mode** (top-right) before grabbing prod values — Test mode keys (`sk_test_...`) are for local dev only.

Add them under the GitHub repo's Settings → Secrets and variables → Actions.

## STRIPE_SECRET_KEY

Your Stripe API key.

- Dashboard → Developers → API keys → "Secret key" → Reveal.
- Format: `sk_live_...` (live) or `sk_test_...` (test).
- Shown once on creation. If lost, click "Roll key" to generate a new one (invalidates the old).

## STRIPE_PRICE_MONTHLY and STRIPE_PRICE_ANNUAL

The recurring price IDs for your subscription product.

- Dashboard → Product catalog → click the subscription product.
- Under "Pricing", each listed price has an ID like `price_1QabcXYZ...`.
- Copy the monthly price ID into `STRIPE_PRICE_MONTHLY`, the annual one into `STRIPE_PRICE_ANNUAL`.
- If only one price exists, add a second price to the same product (Stripe allows multiple prices per product).

## STRIPE_WEBHOOK_SECRET

Signing secret for your webhook endpoint. Different per environment.

### Production (live webhook endpoint)

1. Dashboard (Live mode) → Developers → Webhooks → Add endpoint.
2. Endpoint URL: `https://iwantmymtg.net/api/v1/billing/webhooks/stripe`
3. Subscribe to exactly these 5 events (matches `stripe-webhook.controller.ts`):
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. After creating, click the endpoint → Signing secret → Reveal. Format: `whsec_...`
5. Deleting and recreating the endpoint changes the secret — update the GitHub secret if you do.

### Local dev (Stripe CLI)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/v1/billing/webhooks/stripe
```

The CLI prints a `whsec_...` on startup — use that in your local `.env`. It's different from the production one and only valid while `stripe listen` is running.

Create two endpoints if you're also using test mode locally (one in Test, one in Live) — each has its own signing secret.

---

# Stripe dashboard settings

## Turn ON

- **Branding** (Settings → Branding) — upload logo + icon, set brand color. Styles Checkout, Customer Portal, and emails.
- **Customer emails** (Settings → Customer emails) — enable "Successful payments" and "Refunds". Free receipts, fewer support asks.
- **Customer Portal** (Settings → Billing → Customer portal) — code already uses it (`subscription.service.ts:59` `startBillingPortal`). Enable: update payment method, cancel subscription, view invoice history, switch monthly/annual.
- **Smart retries / failed payment recovery** (Settings → Subscriptions and emails) — auto-retry declined cards. Default settings are fine.
- **Dunning emails** — "Send emails when card payments fail" + "Send emails before a subscription renews" (for annual). Prevents surprise-renewal chargebacks.

## Leave OFF / skip

- **Create customer manually** — code creates customers on the fly via `getOrCreateCustomer` (`subscription.service.ts:22`). Manual customers would drift from the DB.
- **Create invoice manually** — subscriptions auto-invoice. Manual invoices are for one-off B2B billing.
- **Invoice reminders** (for unpaid manual invoices) — irrelevant; no manual invoices.
- **Tax (Stripe Tax)** — skip for now. Added complexity and cost; not needed until meaningful international revenue.
- **Shipping, physical address collection** — not a physical product.
- **Promotion codes** — checkout already has `allow_promotion_codes: true` (`stripe.gateway.ts:61`), so codes can be created later without setup.

## Notes on behavior

- `invoice.payment_failed` currently just logs (`stripe-webhook.controller.ts:90`). Stripe's built-in dunning emails (if enabled) handle customer-facing retry notifications, so log-only is fine.
