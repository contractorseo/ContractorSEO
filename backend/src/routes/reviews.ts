import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { checkReviewRequestLimit } from '../middleware/planGate';
import { generateReviewResponse } from '../services/ai';
import { sendReviewRequestSMS } from '../services/twilio';
import { z } from 'zod';

const router = Router();

router.get('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('business_id', req.params.businessId)
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

router.post('/request', requireAuth, checkReviewRequestLimit, async (req: Request, res: Response) => {
  const schema = z.object({
    businessId: z.string().uuid(),
    customerName: z.string().min(1),
    phone: z.string().min(10),
    jobType: z.string().min(1),
    reviewLink: z.string().url(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', parsed.data.businessId)
    .eq('user_id', req.user!.id)
    .single();

  if (!business) return res.status(404).json({ error: 'Business not found' });

  try {
    await sendReviewRequestSMS({
      to: parsed.data.phone,
      customerName: parsed.data.customerName,
      businessName: business.name,
      reviewLink: parsed.data.reviewLink,
    });

    await supabase.from('review_requests').insert({
      business_id: parsed.data.businessId,
      customer_name: parsed.data.customerName,
      phone: parsed.data.phone,
      job_type: parsed.data.jobType,
      sent_at: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

router.post('/respond', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({
    reviewId: z.string().uuid(),
    businessId: z.string().uuid(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: review } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', parsed.data.reviewId)
    .single();

  const { data: business } = await supabase
    .from('businesses')
    .select('name, category')
    .eq('id', parsed.data.businessId)
    .eq('user_id', req.user!.id)
    .single();

  if (!review || !business) return res.status(404).json({ error: 'Not found' });

  try {
    const response = await generateReviewResponse({
      businessName: business.name,
      reviewerName: review.reviewer_name,
      rating: review.rating,
      reviewText: review.text,
      category: business.category,
    });
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed' });
  }
});

router.put('/:id/response', requireAuth, async (req: Request, res: Response) => {
  const { response_text } = req.body;
  if (!response_text) return res.status(400).json({ error: 'response_text required' });

  const { data, error } = await supabase
    .from('reviews')
    .update({ responded: true, response_text })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
