// Re-export of Stripe's class+namespace for clean type access across the codebase.
// The package's CJS entry (export = StripeConstructor) does not expose the namespace at
// the default/require binding, so we pull the merged type directly from stripe.core.
export type { Stripe } from 'stripe/cjs/stripe.core';
