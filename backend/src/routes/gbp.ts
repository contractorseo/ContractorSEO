import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import {
  getAuthUrl,
  exchangeCode,
  getAccounts,
  getLocations,
  publishLocalPost,
} from '../services/gbp';

const router = Router();

// Return the Google OAuth URL for the given business
router.get('/auth-url', requireAuth, (req: Request, res: Response) => {
  const { businessId } = req.query;
  if (!businessId || typeof businessId !== 'string') {
    return res.status(400).json({ error: 'businessId required' });
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(503).json({ error: 'Google credentials not configured' });
  }
  const url = getAuthUrl(businessId);
  res.json({ url });
});

// Google redirects here after user approves
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state: businessId, error } = req.query;
  const frontendBase = `${process.env.FRONTEND_URL}/dashboard/settings`;

  if (error || !code || !businessId) {
    return res.redirect(`${frontendBase}?gbp=error&msg=${error ?? 'missing_params'}`);
  }

  try {
    const { access_token, refresh_token } = await exchangeCode(code as string);
    const accounts = await getAccounts(access_token);

    if (!accounts.length) {
      return res.redirect(`${frontendBase}?gbp=error&msg=no_accounts`);
    }

    // Store the refresh token on the business row; let user pick location next
    await supabase
      .from('businesses')
      .update({ gbp_refresh_token: refresh_token, gbp_account_name: accounts[0].name })
      .eq('id', businessId as string);

    // Fetch locations for the first account so the frontend can show a picker
    const locations = await getLocations(access_token, accounts[0].name);
    const locationsParam = encodeURIComponent(JSON.stringify(
      locations.map((l) => ({ name: l.name, title: l.title }))
    ));

    res.redirect(`${frontendBase}?gbp=select&locations=${locationsParam}`);
  } catch (err: any) {
    console.error('[GBP callback]', err);
    res.redirect(`${frontendBase}?gbp=error&msg=callback_failed`);
  }
});

// Save the chosen location for a business
router.post('/connect/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { locationName, locationTitle } = req.body;
  if (!locationName) return res.status(400).json({ error: 'locationName required' });

  const { error } = await supabase
    .from('businesses')
    .update({
      gbp_location_name: locationName,
      gbp_connected: true,
    })
    .eq('id', req.params.businessId)
    .eq('user_id', req.user!.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ connected: true, locationTitle });
});

// Disconnect GBP from a business
router.delete('/disconnect/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('businesses')
    .update({
      gbp_connected: false,
      gbp_account_name: null,
      gbp_location_name: null,
      gbp_refresh_token: null,
    })
    .eq('id', req.params.businessId)
    .eq('user_id', req.user!.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ disconnected: true });
});

// Publish a draft/scheduled post to GBP
router.post('/publish/:businessId/:postId', requireAuth, async (req: Request, res: Response) => {
  const { businessId, postId } = req.params;

  const { data: business } = await supabase
    .from('businesses')
    .select('gbp_refresh_token, gbp_account_name, gbp_location_name, gbp_connected')
    .eq('id', businessId)
    .eq('user_id', req.user!.id)
    .single();

  if (!business?.gbp_connected || !business.gbp_refresh_token) {
    return res.status(400).json({ error: 'GBP not connected' });
  }

  const { data: post } = await supabase
    .from('posts')
    .select('title, content')
    .eq('id', postId)
    .single();

  if (!post) return res.status(404).json({ error: 'Post not found' });

  try {
    const gbpPostName = await publishLocalPost({
      refreshToken:  business.gbp_refresh_token,
      accountName:   business.gbp_account_name!,
      locationName:  business.gbp_location_name!,
      title:         post.title,
      content:       post.content,
    });

    await supabase
      .from('posts')
      .update({ gbp_post_name: gbpPostName, status: 'published', published_at: new Date().toISOString() })
      .eq('id', postId);

    res.json({ published: true, gbpPostName });
  } catch (err: any) {
    console.error('[GBP publish]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
