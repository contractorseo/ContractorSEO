import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { requirePlan, getEffectivePlan } from '../middleware/planGate';
import { getConfiguredEngines, runEngineChecks } from '../services/aiVisibility';
import { z } from 'zod';

const router = Router();

const PLAN_CAPS = {
  growth: { prompts: 5,  checksPerMonth: 50  },
  agency: { prompts: 20, checksPerMonth: 200 },
} as const;

async function ownsBusiness(userId: string, businessId: string | string[]) {
  const id = Array.isArray(businessId) ? businessId[0] : businessId;
  const { data } = await supabase
    .from('businesses')
    .select('id, name, city, state')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  return data;
}


// ── Which engines are configured ─────────────────────────────────────────────
router.get('/engines', (_req: Request, res: Response) => {
  res.json(getConfiguredEngines());
});

// ── Delete a prompt ───────────────────────────────────────────────────────────
router.delete('/prompts/:promptId', requireAuth, async (req: Request, res: Response) => {
  const { data: prompt } = await supabase
    .from('ai_visibility_prompts')
    .select('id, business_id')
    .eq('id', req.params.promptId)
    .single();
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const biz = await ownsBusiness(req.user!.id, prompt.business_id);
  if (!biz) return res.status(403).json({ error: 'Forbidden' });

  const { error } = await supabase.from('ai_visibility_prompts').delete().eq('id', req.params.promptId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ── List prompts for a business ───────────────────────────────────────────────
router.get('/:businessId/prompts', requireAuth, async (req: Request, res: Response) => {
  const biz = await ownsBusiness(req.user!.id, req.params.businessId);
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const { data, error } = await supabase
    .from('ai_visibility_prompts')
    .select('*')
    .eq('business_id', req.params.businessId)
    .order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// ── Add a prompt ──────────────────────────────────────────────────────────────
router.post(
  '/:businessId/prompts',
  requireAuth,
  requirePlan('growth', 'agency'),
  async (req: Request, res: Response) => {
    const parsed = z.object({ prompt_template: z.string().min(5).max(300) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const biz = await ownsBusiness(req.user!.id, req.params.businessId);
    if (!biz) return res.status(404).json({ error: 'Business not found' });

    const plan = await getEffectivePlan(req.user!.id);
    const cap = PLAN_CAPS[plan as 'growth' | 'agency'];

    const { count } = await supabase
      .from('ai_visibility_prompts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', req.params.businessId);

    if ((count ?? 0) >= cap.prompts) {
      return res.status(402).json({
        error: `Prompt limit reached (${cap.prompts} on ${plan} plan).`,
        code: 'PROMPT_LIMIT_REACHED',
      });
    }

    const { data, error } = await supabase
      .from('ai_visibility_prompts')
      .insert({ business_id: req.params.businessId, prompt_template: parsed.data.prompt_template })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  },
);

// ── Run all prompts against all configured engines ────────────────────────────
router.post(
  '/:businessId/run',
  requireAuth,
  requirePlan('growth', 'agency'),
  async (req: Request, res: Response) => {
    const biz = await ownsBusiness(req.user!.id, req.params.businessId);
    if (!biz) return res.status(404).json({ error: 'Business not found' });

    const engines = getConfiguredEngines();
    if (!engines.openai && !engines.perplexity) {
      return res.status(400).json({ error: 'No AI engines configured. Add OPENAI_API_KEY or PERPLEXITY_API_KEY to the backend environment.' });
    }

    const plan = await getEffectivePlan(req.user!.id);
    const cap = PLAN_CAPS[plan as 'growth' | 'agency'];

    // Monthly cap check
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: usedThisMonth } = await supabase
      .from('ai_visibility_checks')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', req.params.businessId)
      .gte('checked_at', startOfMonth.toISOString());

    if ((usedThisMonth ?? 0) >= cap.checksPerMonth) {
      return res.status(402).json({
        error: `Monthly check limit reached (${cap.checksPerMonth} on ${plan} plan).`,
        code: 'CHECK_LIMIT_REACHED',
        used: usedThisMonth,
        limit: cap.checksPerMonth,
      });
    }

    const { data: prompts } = await supabase
      .from('ai_visibility_prompts')
      .select('id, prompt_template')
      .eq('business_id', req.params.businessId)
      .order('created_at');

    if (!prompts || prompts.length === 0) {
      return res.status(400).json({ error: 'Add at least one prompt before running a check.' });
    }

    const businessName = biz.name;
    const city = biz.city;

    const checkedAt = new Date().toISOString();
    const inserted: any[] = [];

    // Run all prompts in parallel
    await Promise.all(
      (prompts as any[]).map(async (p: any) => {
        const resolvedPrompt = p.prompt_template.replace(/\{city\}/gi, city);
        const results = await runEngineChecks(resolvedPrompt, businessName);
        for (const r of results) {
          if (r.error === 'not_configured') continue;
          const { data } = await supabase
            .from('ai_visibility_checks')
            .insert({
              business_id: req.params.businessId,
              prompt: resolvedPrompt,
              engine: r.engine,
              mentioned: r.mentioned,
              snippet: r.snippet ?? null,
              checked_at: checkedAt,
            })
            .select()
            .single();
          if (data) inserted.push(data);
        }
      }),
    );

    res.json({ checks: inserted, count: inserted.length });
  },
);

// ── List recent results ───────────────────────────────────────────────────────
router.get('/:businessId/results', requireAuth, async (req: Request, res: Response) => {
  const biz = await ownsBusiness(req.user!.id, req.params.businessId);
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const { data, error } = await supabase
    .from('ai_visibility_checks')
    .select('*')
    .eq('business_id', req.params.businessId)
    .order('checked_at', { ascending: false })
    .limit(200);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// ── Usage for current month ───────────────────────────────────────────────────
router.get('/:businessId/usage', requireAuth, async (req: Request, res: Response) => {
  const biz = await ownsBusiness(req.user!.id, req.params.businessId);
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const plan = await getEffectivePlan(req.user!.id);
  const cap = plan === 'trial' ? { prompts: 0, checksPerMonth: 0 } : PLAN_CAPS[plan as 'growth' | 'agency'];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('ai_visibility_checks')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', req.params.businessId)
    .gte('checked_at', startOfMonth.toISOString());

  res.json({ used: count ?? 0, limit: cap.checksPerMonth, plan });
});

export default router;
