import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

type Plan = 'trial' | 'growth' | 'agency';

const PLAN_LIMITS: Record<Plan, { postsPerMonth: number; reviewRequests: number; keywords: number }> = {
  trial:  { postsPerMonth: 4,   reviewRequests: 20,   keywords: 10  },
  growth: { postsPerMonth: 16,  reviewRequests: 200,  keywords: 50  },
  agency: { postsPerMonth: 9999, reviewRequests: 2000, keywords: 200 },
};

async function getUserPlan(userId: string): Promise<{ plan: Plan; trialEndsAt: string | null }> {
  const { data } = await supabase
    .from('users')
    .select('plan, trial_ends_at')
    .eq('id', userId)
    .single();
  return { plan: (data?.plan ?? 'trial') as Plan, trialEndsAt: data?.trial_ends_at ?? null };
}

function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) < new Date();
}

export function requirePlan(...allowedPlans: Plan[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { plan, trialEndsAt } = await getUserPlan(req.user!.id);

    if (plan === 'trial' && isTrialExpired(trialEndsAt)) {
      return res.status(402).json({ error: 'Trial expired. Please upgrade to continue.', code: 'TRIAL_EXPIRED' });
    }

    if (!allowedPlans.includes(plan)) {
      return res.status(402).json({ error: `This feature requires a ${allowedPlans.join(' or ')} plan.`, code: 'UPGRADE_REQUIRED' });
    }

    next();
  };
}

export async function checkPostLimit(req: Request, res: Response, next: NextFunction) {
  const { plan, trialEndsAt } = await getUserPlan(req.user!.id);

  if (plan === 'trial' && isTrialExpired(trialEndsAt)) {
    return res.status(402).json({ error: 'Trial expired. Please upgrade to continue.', code: 'TRIAL_EXPIRED' });
  }

  const limit = PLAN_LIMITS[plan].postsPerMonth;

  const { data: bizRows } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', req.user!.id);

  const bizIds = (bizRows ?? []).map((b) => b.id);
  if (bizIds.length === 0) return next();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())
    .in('business_id', bizIds);

  if ((count ?? 0) >= limit) {
    return res.status(402).json({
      error: `Post limit reached (${limit}/month on ${plan} plan). Upgrade to publish more.`,
      code: 'POST_LIMIT_REACHED',
      limit,
      used: count,
    });
  }

  next();
}

export async function checkReviewRequestLimit(req: Request, res: Response, next: NextFunction) {
  const { plan, trialEndsAt } = await getUserPlan(req.user!.id);

  if (plan === 'trial' && isTrialExpired(trialEndsAt)) {
    return res.status(402).json({ error: 'Trial expired. Please upgrade to continue.', code: 'TRIAL_EXPIRED' });
  }

  const limit = PLAN_LIMITS[plan].reviewRequests;

  const { data: bizRows } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', req.user!.id);

  const bizIds = (bizRows ?? []).map((b) => b.id);
  if (bizIds.length === 0) return next();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('review_requests')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', startOfMonth.toISOString())
    .in('business_id', bizIds);

  if ((count ?? 0) >= limit) {
    return res.status(402).json({
      error: `Review request limit reached (${limit}/month on ${plan} plan). Upgrade to send more.`,
      code: 'REVIEW_LIMIT_REACHED',
      limit,
      used: count,
    });
  }

  next();
}
