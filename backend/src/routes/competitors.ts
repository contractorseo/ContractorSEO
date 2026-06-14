import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { analyzeCompetitors } from '../services/ai';
import { searchNearbyCompetitors } from '../services/places';
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

router.get('/discover/:businessId', requireAuth, async (req: Request, res: Response) => {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return res.status(503).json({ error: 'Places API not configured' });
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name, category, city, state')
    .eq('id', req.params.businessId)
    .eq('user_id', req.user!.id)
    .single();

  if (!business) return res.status(404).json({ error: 'Business not found' });

  try {
    const results = await searchNearbyCompetitors(
      business.category, business.city, business.state, business.name,
    );
    res.json(results);
  } catch (err: any) {
    console.error('[competitors/discover]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('business_id', req.params.businessId)
    .order('threat_level', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
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

router.post('/analyze/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { data: business } = await supabase
    .from('businesses')
    .select('name, category, city')
    .eq('id', req.params.businessId)
    .eq('user_id', req.user!.id)
    .single();

  if (!business) return res.status(404).json({ error: 'Business not found' });

  const { data: competitors } = await supabase
    .from('competitors')
    .select('name, monthly_posts, review_count, rating, threat_level')
    .eq('business_id', req.params.businessId);

  if (!competitors?.length) return res.status(400).json({ error: 'Add at least one competitor first' });

  try {
    const insights = await analyzeCompetitors({
      businessName: business.name,
      category: business.category,
      city: business.city,
      competitors,
    });
    res.json({ insights });
  } catch {
    res.status(500).json({ error: 'AI analysis failed' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { error } = await supabase.from('competitors').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
