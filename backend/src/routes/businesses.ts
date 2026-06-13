import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const BusinessSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5),
  phone: z.string().min(10),
  website: z.string().url().optional().or(z.literal('')),
  license_number: z.string().optional(),
  google_place_id: z.string().optional(),
});

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /businesses] error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = BusinessSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // Ensure public.users row exists — trigger may not have fired (OAuth / timing)
  const { error: upsertError } = await supabase.from('users').upsert(
    {
      id: req.user!.id,
      email: req.user!.email,
      name: '',
      plan: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  if (upsertError) {
    console.error('[POST /businesses] user upsert failed:', upsertError);
    return res.status(500).json({ error: `User record error: ${upsertError.message}` });
  }

  const { data, error } = await supabase
    .from('businesses')
    .insert({ ...parsed.data, user_id: req.user!.id })
    .select()
    .single();

  if (error) {
    console.error('[POST /businesses] insert failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId: req.user!.id,
      body: parsed.data,
    });
    return res.status(500).json({ error: error.message, detail: error.details });
  }

  res.status(201).json(data);
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)
    .single();

  if (error) return res.status(404).json({ error: 'Business not found' });
  res.json(data);
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = BusinessSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('businesses')
    .update(parsed.data)
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)
    .select()
    .single();

  if (error) {
    console.error('[PUT /businesses/:id] error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

export default router;
