import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const CompetitorSchema = z.object({
  business_id: z.string().uuid(),
  name: z.string().min(1),
  monthly_posts: z.number().int().nonnegative().default(0),
  review_count: z.number().int().nonnegative().default(0),
  rating: z.number().min(0).max(5).default(0),
  last_post_date: z.string().datetime().optional().nullable(),
  threat_level: z.enum(['low', 'medium', 'high']).default('medium'),
});

router.get('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('business_id', req.params.businessId)
    .order('threat_level', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = CompetitorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase.from('competitors').insert(parsed.data).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = CompetitorSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('competitors')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { error } = await supabase.from('competitors').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
