import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

async function buildReport(businessId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [bizRes, napRes, keyRes, postRes, reviewRes] = await Promise.all([
    supabase.from('businesses').select('name, city, state, category').eq('id', businessId).single(),
    supabase.from('nap_listings').select('status').eq('business_id', businessId),
    supabase.from('keywords').select('keyword, current_rank, monthly_volume').eq('business_id', businessId),
    supabase.from('posts').select('status, published_at').eq('business_id', businessId).gte('created_at', thirtyDaysAgo),
    supabase.from('reviews').select('rating').eq('business_id', businessId),
  ]);

  const listings = napRes.data ?? [];
  const consistent = listings.filter((l) => l.status === 'consistent').length;
  const napScore = listings.length ? Math.round((consistent / listings.length) * 100) : 0;

  const reviews = reviewRes.data ?? [];
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const keywords = keyRes.data ?? [];
  const top10 = keywords
    .filter((k) => k.current_rank !== null && k.current_rank <= 10)
    .sort((a, b) => (a.current_rank ?? 99) - (b.current_rank ?? 99))
    .slice(0, 5);

  return {
    business: bizRes.data,
    napScore,
    napListings: listings.length,
    napConsistent: consistent,
    keywordCount: keywords.length,
    top10Keywords: top10,
    postsLast30Days: (postRes.data ?? []).filter((p) => p.status === 'published').length,
    reviewCount: reviews.length,
    avgRating,
    generatedAt: new Date().toISOString(),
  };
}

// Public report (no auth) — must be registered before /:businessId to avoid capture
router.get('/public/:token', async (req: Request, res: Response) => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const { data: row } = await supabase
    .from('report_tokens')
    .select('business_id, expires_at')
    .eq('token', token)
    .single();

  if (!row) return res.status(404).json({ error: 'Report not found' });
  if (new Date(row.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Report link has expired' });
  }

  const report = await buildReport(row.business_id);
  res.json(report);
});

// Dashboard report (authenticated)
router.get('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const businessId = req.params.businessId as string;
  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', req.user!.id)
    .single();

  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const report = await buildReport(businessId);
  res.json(report);
});

// Create / refresh share token
router.post('/share/:businessId', requireAuth, async (req: Request, res: Response) => {
  const businessId = req.params.businessId as string;
  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', req.user!.id)
    .single();

  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from('report_tokens')
    .select('token')
    .eq('business_id', businessId)
    .single();

  if (existing) {
    await supabase.from('report_tokens').update({ expires_at: expiresAt }).eq('business_id', businessId);
    return res.json({ token: existing.token, expiresAt });
  }

  const token = crypto.randomUUID();
  const { data, error } = await supabase
    .from('report_tokens')
    .insert({ business_id: businessId, token, expires_at: expiresAt })
    .select('token')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ token: data.token, expiresAt });
});

export default router;
