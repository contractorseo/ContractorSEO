import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { checkArticleLimit } from '../middleware/planGate';
import { generateArticleTopics, generateArticle } from '../services/ai';
import { z } from 'zod';

const router = Router();

// ── Usage (user-wide, plan-aware) ────────────────────────────────────────────
router.get('/usage', requireAuth, async (req: Request, res: Response) => {
  const { data: userData } = await supabase
    .from('users')
    .select('plan, trial_ends_at')
    .eq('id', req.user!.id)
    .single();

  const plan = (userData?.plan ?? 'trial') as 'trial' | 'growth' | 'agency';

  const { data: bizRows } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', req.user!.id);

  const bizIds = (bizRows ?? []).map((b: any) => b.id);

  if (bizIds.length === 0) {
    const limits = { trial: { limit: 2, period: 'total' }, growth: { limit: 15, period: 'monthly' }, agency: { limit: 50, period: 'monthly' } };
    return res.json({ used: 0, ...limits[plan], plan });
  }

  if (plan === 'trial') {
    const { count } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .in('business_id', bizIds);
    return res.json({ used: count ?? 0, limit: 2, period: 'total', plan });
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())
    .in('business_id', bizIds);

  const limit = plan === 'agency' ? 50 : 15;
  return res.json({ used: count ?? 0, limit, period: 'monthly', plan });
});

// ── Generate topics (no save, no limit) ──────────────────────────────────────
router.post('/topics', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({ businessId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('name, category, city')
    .eq('id', parsed.data.businessId)
    .eq('user_id', req.user!.id)
    .single();

  if (bizError || !business) return res.status(404).json({ error: 'Business not found' });

  try {
    const topics = await generateArticleTopics({
      businessName: business.name,
      category: business.category,
      city: business.city,
    });
    res.json(topics);
  } catch {
    res.status(500).json({ error: 'AI generation failed' });
  }
});

// ── Generate article content (no save, no limit) ──────────────────────────────
router.post('/generate', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({
    businessId: z.string().uuid(),
    topic: z.string().min(5).max(300),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('name, category, city, website')
    .eq('id', parsed.data.businessId)
    .eq('user_id', req.user!.id)
    .single();

  if (bizError || !business) return res.status(404).json({ error: 'Business not found' });

  try {
    const article = await generateArticle({
      topic: parsed.data.topic,
      businessName: business.name,
      category: business.category,
      city: business.city,
      website: business.website,
    });
    res.json(article);
  } catch {
    res.status(500).json({ error: 'AI generation failed' });
  }
});

// ── List articles for a business ─────────────────────────────────────────────
router.get('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('business_id', req.params.businessId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// ── Save article (enforces plan limit) ───────────────────────────────────────
const ArticleSchema = z.object({
  business_id:      z.string().uuid(),
  title:            z.string().min(1).max(200),
  slug:             z.string().min(1).max(200),
  meta_description: z.string().max(300).optional().nullable(),
  body_html:        z.string(),
  faq_json:         z.array(z.object({ question: z.string(), answer: z.string() })).optional().nullable(),
  schema_jsonld:    z.record(z.unknown()).optional().nullable(),
  status:           z.enum(['draft', 'scheduled', 'published']).default('draft'),
  scheduled_for:    z.string().datetime().optional().nullable(),
  published_url:    z.string().url().optional().nullable(),
  cms_target:       z.string().optional().nullable(),
});

router.post('/', requireAuth, checkArticleLimit, async (req: Request, res: Response) => {
  const parsed = ArticleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('articles')
    .insert(parsed.data)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── Update article ────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = ArticleSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('articles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Delete article ────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { error } = await supabase.from('articles').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
