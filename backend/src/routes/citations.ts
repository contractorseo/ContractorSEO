import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const NAP_DIRECTORIES = [
  'Google Business Profile', 'Yelp', 'Angi', 'HomeAdvisor', 'Thumbtack',
  'BBB', 'Houzz', 'Porch', 'Yellow Pages', 'Bing Places',
  'Apple Maps', 'Facebook', 'Nextdoor', 'Foursquare', 'MapQuest',
];

router.get('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('nap_listings')
    .select('*')
    .eq('business_id', req.params.businessId)
    .order('directory_name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

router.post('/seed/:businessId', requireAuth, async (req: Request, res: Response) => {
  const listings = NAP_DIRECTORIES.map((dir) => ({
    business_id: req.params.businessId,
    directory_name: dir,
    status: 'unchecked' as const,
    issue: null,
  }));

  const { data, error } = await supabase
    .from('nap_listings')
    .upsert(listings, { onConflict: 'business_id,directory_name' })
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({
    status: z.enum(['consistent', 'inconsistent', 'missing', 'unchecked']),
    issue: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('nap_listings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
