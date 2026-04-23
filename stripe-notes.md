Turn ON

  - Branding (Settings → Branding) — upload logo + icon, set brand color. This styles the Checkout page, Customer Portal, and emails. Worth 5 minutes; makes the whole flow feel like your app instead of
  generic Stripe.
  - Customer emails (Settings → Customer emails) — enable "Successful payments" and "Refunds". Free receipts, reduces support asks.
  - Customer Portal (Settings → Billing → Customer portal) — your code already uses it (subscription.service.ts:59 startBillingPortal). Enable: update payment method, cancel subscription, view invoice
  history, switch between monthly/annual. This is how users self-serve without emailing you.
  - Smart retries / failed payment recovery (Settings → Subscriptions and emails) — auto-retry declined cards on a schedule. Default settings are fine.
  - Dunning emails — "Send emails when card payments fail" + "Send emails before a subscription renews" (for annual). Prevents surprise-renewal chargebacks.

  Leave OFF / skip

  - Create customer manually — don't. Your code creates customers on the fly via getOrCreateCustomer (subscription.service.ts:22). Manual customers would drift from your DB.
  - Create invoice manually — don't. Subscriptions auto-invoice. Manual invoices are for one-off B2B billing.
  - Invoice reminders (for unpaid manual invoices) — irrelevant; you're not sending manual invoices.
  - Tax (Stripe Tax) — skip for now. Adds complexity and cost; not needed until you have meaningful international revenue.
  - Shipping, physical address collection — not a physical product.
  - Promotion codes — your checkout already has allow_promotion_codes: true (stripe.gateway.ts:61), so you can create codes later if you want. No setup needed now.

  One thing to verify before going live

  Webhook endpoint (Developers → Webhooks). Subscribe only to the events your controller handles — sending extras just means your logs fill with "unhandled event type" noise. Want me to check
  stripe-webhook.controller.ts and list the exact events?

❯ /usage
  ⎿  Status dialog dismissed

❯ yes

  Read 1 file (ctrl+o to expand)

⏺ Subscribe your webhook endpoint to exactly these 5 events:

  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_failed

  Endpoint URL: https://<your-domain>/api/v1/billing/webhooks/stripe

  After creating the endpoint, copy the Signing secret (starts with whsec_) into STRIPE_WEBHOOK_SECRET.

  Two small notes:
  - Create two endpoints if you're also using test mode locally (one in Test, one in Live) — each has its own signing secret. For local dev, stripe listen --forward-to
  localhost:3000/api/v1/billing/webhooks/stripe gives you a temporary Test secret.
  - invoice.payment_failed currently just logs (stripe-webhook.controller.ts:90). Stripe's built-in dunning emails (if you enable them) will handle customer-facing retry notifications, so logging-only is
  fine for now.