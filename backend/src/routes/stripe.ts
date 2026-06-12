import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import {
  stripe,
  PLANS,
  createCheckoutSession,
  createCustomerPortalSession,
  createStripeCustomer,
} from '../services/stripe';
import { z } from 'zod';

const router = Router();

router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({ plan: z.enum(['growth', 'agency']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id, email, name')
    .eq('id', req.user!.id)
    .single();

  if (!user) return res.status(404).json({ error: 'User not found' });

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    customerId = await createStripeCustomer(user.email, user.name);
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', req.user!.id);
  }

  const frontendUrl = process.env.FRONTEND_URL!;
  const url = await createCheckoutSession({
    customerId,
    priceId: PLANS[parsed.data.plan].priceId,
    successUrl: `${frontendUrl}/dashboard/settings?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${frontendUrl}/dashboard/settings`,
  });

  res.json({ url });
});

router.post('/portal', requireAuth, async (req: Request, res: Response) => {
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', req.user!.id)
    .single();

  if (!user?.stripe_customer_id) return res.status(400).json({ error: 'No billing account found' });

  const url = await createCustomerPortalSession(
    user.stripe_customer_id,
    `${process.env.FRONTEND_URL}/dashboard/settings`
  );

  res.json({ url });
});

router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('Missing signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return res.status(400).send('Invalid webhook signature');
  }

  const session = event.data.object as any;

  switch (event.type) {
    case 'checkout.session.completed': {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const priceId = subscription.items.data[0].price.id;
      const plan = Object.entries(PLANS).find(([, p]) => p.priceId === priceId)?.[0] ?? 'growth';

      await supabase
        .from('users')
        .update({ plan, stripe_customer_id: session.customer })
        .eq('stripe_customer_id', session.customer);
      break;
    }
    case 'customer.subscription.deleted': {
      await supabase
        .from('users')
        .update({ plan: 'trial' })
        .eq('stripe_customer_id', session.customer);
      break;
    }
  }

  res.json({ received: true });
});

export default router;
