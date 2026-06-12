import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { generateKeywordSuggestions } from '../services/ai';
import { z } from 'zod';

const router = Router();

router.get('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('keywords')
    .select('*')
    .eq('business_id', req.params.businessId)
    .order('current_rank', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/suggest', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({ businessId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: business } = await supabase
    .from('businesses')
    .select('name, category, city')
    .eq('id', parsed.data.businessId)
    .eq('user_id', req.user!.id)
    .single();

  if (!business) return res.status(404).json({ error: 'Business not found' });

  const { data: existingKeywords } = await supabase
    .from('keywords')
    .select('keyword')
    .eq('business_id', parsed.data.businessId);

  const { data: competitors } = await supabase
    .from('competitors')
    .select('name')
    .eq('business_id', parsed.data.businessId);

  try {
    const suggestions = await generateKeywordSuggestions({
      businessName: business.name,
      category: business.category,
      city: business.city,
      currentKeywords: (existingKeywords ?? []).map((k) => k.keyword),
      competitors: (competitors ?? []).map((c) => c.name),
    });
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed' });
  }
});

router.post('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({
    keyword: z.string().min(1),
    monthly_volume: z.number().int().nonnegative().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('keywords')
    .insert({ ...parsed.data, business_id: req.params.businessId })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id/rank', requireAuth, async (req: Request, res: Response) => {
  const { current_rank } = req.body;
  if (typeof current_rank !== 'number') return res.status(400).json({ error: 'current_rank must be a number' });

  const { data: existing } = await supabase.from('keywords').select('current_rank').eq('id', req.params.id).single();

  const { data, error } = await supabase
    .from('keywords')
    .update({
      previous_rank: existing?.current_rank ?? null,
      current_rank,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { error } = await supabase.from('keywords').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
