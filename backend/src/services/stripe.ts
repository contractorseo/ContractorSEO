import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export const PLANS = {
  growth: { priceId: process.env.STRIPE_GROWTH_PRICE_ID!, name: 'Growth', price: 97 },
  agency: { priceId: process.env.STRIPE_AGENCY_PRICE_ID!, name: 'Agency', price: 297 },
} as const;

export type PlanKey = keyof typeof PLANS;

export async function createCheckoutSession(opts: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: opts.customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: opts.priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    subscription_data: opts.trialDays ? { trial_period_days: opts.trialDays } : undefined,
  });

  return session.url!;
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function createStripeCustomer(email: string, name: string): Promise<string> {
  const customer = await stripe.customers.create({ email, name });
  return customer.id;
}
