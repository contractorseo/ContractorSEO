import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { checkArticleLimit, getEffectivePlan } from '../middleware/planGate';
import { generateArticleTopics, generateArticle } from '../services/ai';
import { decrypt } from '../services/encryption';
import { z } from 'zod';

const router = Router();

function basicAuthHeader(username: string, password: string) {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

// ── Shared: publish a single due article ─────────────────────────────────────
async function publishDueArticle(article: { id: string; business_id: string; title: string; body_html: string }) {
  const now = new Date().toISOString();

  const { data: conn } = await supabase
    .from('cms_connections')
    .select('id, site_url, username, encrypted_credential')
    .eq('business_id', article.business_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!conn) {
    // No WP connected: mark published in DB only
    await supabase.from('articles').update({ status: 'published', published_at: now, updated_at: now }).eq('id', article.id);
    return { ok: true, wp: false };
  }

  try {
    const appPassword = decrypt(conn.encrypted_credential);
    const wpRes = await fetch(`${conn.site_url}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: basicAuthHeader(conn.username, appPassword) },
      body: JSON.stringify({ title: article.title, content: article.body_html, status: 'publish' }),
      signal: AbortSignal.timeout(15000),
    });

    if (wpRes.ok) {
      const wpData: any = await wpRes.json();
      await supabase.from('articles').update({
        status: 'published', published_at: now, published_url: wpData.link,
        cms_target: 'wordpress', updated_at: now,
      }).eq('id', article.id);
      return { ok: true, wp: true, url: wpData.link };
    }

    if (wpRes.status === 401 || wpRes.status === 403) {
      await supabase.from('cms_connections').update({ status: 'error' }).eq('id', conn.id);
    }
    return { ok: false, wp: true };
  } catch {
    return { ok: false, wp: true };
  }
}

// ── Process due articles (external cron via secret) ───────────────────────────
router.get('/process-due', async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.query.secret !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data: dueArticles } = await supabase
    .from('articles')
    .select('id, business_id, title, body_html')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString());

  let published = 0;
  for (const a of dueArticles ?? []) {
    const result = await publishDueArticle(a as any);
    if (result.ok) published++;
  }
  res.json({ published, checked: (dueArticles ?? []).length });
});

// ── Process due articles (authenticated — called on dashboard load) ───────────
router.post('/process-due', requireAuth, async (req: Request, res: Response) => {
  const { data: bizRows } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', req.user!.id);

  const bizIds = (bizRows ?? []).map((b: any) => b.id);
  if (bizIds.length === 0) return res.json({ published: 0, checked: 0 });

  const { data: dueArticles } = await supabase
    .from('articles')
    .select('id, business_id, title, body_html')
    .in('business_id', bizIds)
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString());

  let published = 0;
  for (const a of dueArticles ?? []) {
    const result = await publishDueArticle(a as any);
    if (result.ok) published++;
  }
  res.json({ published, checked: (dueArticles ?? []).length });
});

// ── Auto-generate + schedule articles (Agency only) ───────────────────────────
router.post('/auto-generate', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({
    businessId: z.string().uuid(),
    cadence: z.enum(['weekly', 'biweekly', 'monthly']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const effectivePlan = await getEffectivePlan(req.user!.id);
  if (effectivePlan !== 'agency') {
    return res.status(403).json({ error: 'Auto-generate requires Agency plan' });
  }

  const { businessId, cadence } = parsed.data;

  const { data: business } = await supabase
    .from('businesses')
    .select('name, category, city, website')
    .eq('id', businessId)
    .eq('user_id', req.user!.id)
    .single();
  if (!business) return res.status(404).json({ error: 'Business not found' });

  // Save cadence preference
  await supabase.from('businesses')
    .update({ auto_schedule: true, auto_schedule_cadence: cadence })
    .eq('id', businessId);

  // Calculate slots: start tomorrow at 9 AM, spaced by cadence
  const intervalDays = cadence === 'monthly' ? 30 : cadence === 'biweekly' ? 3 : 7;
  const count = cadence === 'biweekly' ? 4 : 2;

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);

  // Find existing scheduled articles to avoid date collisions
  const { data: existing } = await supabase
    .from('articles')
    .select('scheduled_for')
    .eq('business_id', businessId)
    .eq('status', 'scheduled')
    .gte('scheduled_for', start.toISOString());

  const existingDateKeys = new Set(
    (existing ?? []).map((a: any) =>
      new Date(a.scheduled_for).toISOString().slice(0, 10)
    )
  );

  const freeDates: Date[] = [];
  for (let i = 0; freeDates.length < count; i++) {
    const d = new Date(start.getTime() + i * intervalDays * 86400000);
    if (!existingDateKeys.has(d.toISOString().slice(0, 10))) {
      freeDates.push(d);
    }
    if (i > 60) break; // safety
  }

  if (freeDates.length === 0) {
    return res.json({ articles: [], message: 'Schedule already full for this period' });
  }

  // Generate topics (one call)
  let topics: Array<{ topic: string; type: string }>;
  try {
    topics = await generateArticleTopics({ businessName: business.name, category: business.category, city: business.city });
  } catch {
    return res.status(500).json({ error: 'Failed to generate topics' });
  }

  const generated: any[] = [];

  for (let i = 0; i < Math.min(freeDates.length, topics.length); i++) {
    try {
      const content = await generateArticle({
        topic: topics[i].topic,
        businessName: business.name,
        category: business.category,
        city: business.city,
        website: business.website,
      });

      const { data: saved } = await supabase.from('articles').insert({
        business_id: businessId,
        title: content.title,
        slug: content.slug.slice(0, 200),
        meta_description: content.meta_description,
        body_html: content.body_html,
        faq_json: content.faq_json,
        schema_jsonld: content.schema_jsonld,
        status: 'scheduled',
        scheduled_for: freeDates[i].toISOString(),
      }).select().single();

      if (saved) generated.push(saved);
    } catch {
      // skip failed generation, continue with rest
    }
  }

  res.json({ articles: generated, count: generated.length });
});

// ── Usage (user-wide, plan-aware) ────────────────────────────────────────────
router.get('/usage', requireAuth, async (req: Request, res: Response) => {
  const plan = await getEffectivePlan(req.user!.id);

  const { data: bizRows } = await supabase.from('businesses').select('id').eq('user_id', req.user!.id);
  const bizIds = (bizRows ?? []).map((b: any) => b.id);

  if (bizIds.length === 0) {
    const limits = { trial: { limit: 2, period: 'total' }, growth: { limit: 15, period: 'monthly' }, agency: { limit: 50, period: 'monthly' } };
    return res.json({ used: 0, ...limits[plan], plan });
  }

  if (plan === 'trial') {
    const { count } = await supabase.from('articles').select('id', { count: 'exact', head: true }).in('business_id', bizIds);
    return res.json({ used: count ?? 0, limit: 2, period: 'total', plan });
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const { count } = await supabase.from('articles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())
    .in('business_id', bizIds);

  const limit = plan === 'agency' ? 50 : 15;
  return res.json({ used: count ?? 0, limit, period: 'monthly', plan });
});

// ── Generate topics ───────────────────────────────────────────────────────────
router.post('/topics', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({ businessId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: business, error: bizError } = await supabase
    .from('businesses').select('name, category, city')
    .eq('id', parsed.data.businessId).eq('user_id', req.user!.id).single();
  if (bizError || !business) return res.status(404).json({ error: 'Business not found' });

  try {
    res.json(await generateArticleTopics({ businessName: business.name, category: business.category, city: business.city }));
  } catch {
    res.status(500).json({ error: 'AI generation failed' });
  }
});

// ── Generate article content ──────────────────────────────────────────────────
router.post('/generate', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({ businessId: z.string().uuid(), topic: z.string().min(5).max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: business, error: bizError } = await supabase
    .from('businesses').select('name, category, city, website')
    .eq('id', parsed.data.businessId).eq('user_id', req.user!.id).single();
  if (bizError || !business) return res.status(404).json({ error: 'Business not found' });

  try {
    res.json(await generateArticle({ topic: parsed.data.topic, businessName: business.name, category: business.category, city: business.city, website: business.website }));
  } catch {
    res.status(500).json({ error: 'AI generation failed' });
  }
});

// ── List articles for a business ─────────────────────────────────────────────
router.get('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('articles').select('*')
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

  const { data, error } = await supabase.from('articles').insert(parsed.data).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── Update article ────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = ArticleSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase.from('articles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Delete article ────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { error } = await supabase.from('articles').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ── Schedule article for a future date ───────────────────────────────────────
router.post('/:id/schedule', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({ scheduled_for: z.string().datetime() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (new Date(parsed.data.scheduled_for) <= new Date()) {
    return res.status(400).json({ error: 'Scheduled date must be in the future' });
  }

  const { data: article } = await supabase.from('articles').select('id, business_id').eq('id', req.params.id).single();
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const { data: biz } = await supabase.from('businesses').select('id')
    .eq('id', article.business_id).eq('user_id', req.user!.id).single();
  if (!biz) return res.status(403).json({ error: 'Forbidden' });

  const { data: updated, error } = await supabase.from('articles')
    .update({ status: 'scheduled', scheduled_for: parsed.data.scheduled_for, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(updated);
});

// ── Publish article to WordPress ──────────────────────────────────────────────
router.post('/:id/publish', requireAuth, async (req: Request, res: Response) => {
  const PublishSchema = z.object({ wpStatus: z.enum(['publish', 'draft']).default('publish') });
  const parsed = PublishSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: article } = await supabase.from('articles')
    .select('id, business_id, title, body_html').eq('id', req.params.id).single();
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const { data: biz } = await supabase.from('businesses').select('id')
    .eq('id', article.business_id).eq('user_id', req.user!.id).single();
  if (!biz) return res.status(403).json({ error: 'Forbidden' });

  const { data: conn } = await supabase.from('cms_connections')
    .select('id, site_url, username, encrypted_credential')
    .eq('business_id', article.business_id).eq('status', 'active').single();
  if (!conn) return res.status(400).json({ error: 'No WordPress site connected. Add one in Settings → WordPress.' });

  let appPassword: string;
  try { appPassword = decrypt(conn.encrypted_credential); }
  catch { return res.status(500).json({ error: 'Failed to decrypt credentials' }); }

  try {
    const wpRes = await fetch(`${conn.site_url}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: basicAuthHeader(conn.username, appPassword) },
      body: JSON.stringify({ title: article.title, content: article.body_html, status: parsed.data.wpStatus }),
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
    const now = new Date().toISOString();
    const { data: updated } = await supabase.from('articles').update({
      published_url: wpData.link,
      status: parsed.data.wpStatus === 'publish' ? 'published' : 'draft',
      published_at: parsed.data.wpStatus === 'publish' ? now : null,
      cms_target: 'wordpress', updated_at: now,
    }).eq('id', req.params.id).select().single();

    res.json({ published_url: wpData.link, article: updated });
  } catch (err: any) {
    const msg: string = err?.message ?? '';
    if (msg.includes('timeout') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      return res.status(400).json({ error: 'Cannot reach your WordPress site. Check the connection in Settings.' });
    }
    return res.status(500).json({ error: msg || 'Failed to publish to WordPress' });
  }
});

export default router;
