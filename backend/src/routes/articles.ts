import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { checkArticleLimit } from '../middleware/planGate';
import { generateArticleTopics, generateArticle } from '../services/ai';
import { decrypt } from '../services/encryption';
import { z } from 'zod';

function basicAuthHeader(username: string, password: string) {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

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

// ── Publish article to WordPress ──────────────────────────────────────────────
router.post('/:id/publish', requireAuth, async (req: Request, res: Response) => {
  const PublishSchema = z.object({
    wpStatus: z.enum(['publish', 'draft']).default('publish'),
  });
  const parsed = PublishSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: article } = await supabase
    .from('articles')
    .select('id, business_id, title, body_html')
    .eq('id', req.params.id)
    .single();

  if (!article) return res.status(404).json({ error: 'Article not found' });

  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', article.business_id)
    .eq('user_id', req.user!.id)
    .single();

  if (!biz) return res.status(403).json({ error: 'Forbidden' });

  const { data: conn } = await supabase
    .from('cms_connections')
    .select('id, site_url, username, encrypted_credential')
    .eq('business_id', article.business_id)
    .eq('status', 'active')
    .single();

  if (!conn) {
    return res.status(400).json({ error: 'No WordPress site connected. Add one in Settings → WordPress.' });
  }

  let appPassword: string;
  try {
    appPassword = decrypt(conn.encrypted_credential);
  } catch {
    return res.status(500).json({ error: 'Failed to decrypt credentials' });
  }

  try {
    const wpRes = await fetch(`${conn.site_url}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuthHeader(conn.username, appPassword),
      },
      body: JSON.stringify({
        title: article.title,
        content: article.body_html,
        status: parsed.data.wpStatus,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (wpRes.status === 401 || wpRes.status === 403) {
      await supabase.from('cms_connections').update({ status: 'error' }).eq('id', conn.id);
      return res.status(400).json({ error: 'WordPress authentication failed. Reconnect your site in Settings.' });
    }
    if (!wpRes.ok) {
      const body: any = await wpRes.json().catch(() => ({}));
      return res.status(400).json({ error: body?.message ?? `WordPress returned ${wpRes.status}` });
    }

    const wpData: any = await wpRes.json();
    const publishedUrl: string = wpData.link;
    const now = new Date().toISOString();

    const { data: updated } = await supabase
      .from('articles')
      .update({
        published_url: publishedUrl,
        status: parsed.data.wpStatus === 'publish' ? 'published' : 'draft',
        published_at: parsed.data.wpStatus === 'publish' ? now : null,
        cms_target: 'wordpress',
        updated_at: now,
      })
      .eq('id', req.params.id)
      .select()
      .single();

    res.json({ published_url: publishedUrl, article: updated });
  } catch (err: any) {
    const msg: string = err?.message ?? '';
    if (msg.includes('timeout') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      return res.status(400).json({ error: 'Cannot reach your WordPress site. Check the connection in Settings.' });
    }
    return res.status(500).json({ error: msg || 'Failed to publish to WordPress' });
  }
});

export default router;
