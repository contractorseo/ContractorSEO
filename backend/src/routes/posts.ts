import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { checkPostLimit } from '../middleware/planGate';
import { generateGBPPost } from '../services/ai';
import { z } from 'zod';

const router = Router();

router.get('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('business_id', req.params.businessId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

router.post('/generate', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({
    businessId: z.string().uuid(),
    postType: z.enum(['update', 'offer', 'event', 'tip']),
    jobType: z.string().optional(),
    tone: z.enum(['professional', 'friendly', 'urgent']).optional(),
  });

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
    const generated = await generateGBPPost({
      businessName: business.name,
      category: business.category,
      city: business.city,
      postType: parsed.data.postType,
      jobType: parsed.data.jobType,
      tone: parsed.data.tone,
    });
    res.json(generated);
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed' });
  }
});

const PostSchema = z.object({
  business_id: z.string().uuid(),
  type: z.enum(['update', 'offer', 'event', 'tip']),
  title: z.string().min(1).max(60),
  content: z.string().min(1).max(1500),
  photo_url: z.string().url().optional().nullable(),
  scheduled_for: z.string().datetime().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
});

router.post('/', requireAuth, checkPostLimit, async (req: Request, res: Response) => {
  const parsed = PostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('posts')
    .insert(parsed.data)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = PostSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await supabase
    .from('posts')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { error } = await supabase.from('posts').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
