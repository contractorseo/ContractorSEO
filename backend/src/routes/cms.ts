import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { encrypt, decrypt } from '../services/encryption';
import { z } from 'zod';

const router = Router();

// Temporary diagnostic
router.get('/diag', (_req, res) => {
  try {
    const enc = encrypt('probe');
    const dec = decrypt(enc);
    res.json({ ok: dec === 'probe' });
  } catch (err: any) {
    res.json({ ok: false, error: err.message });
  }
});

function basicAuthHeader(username: string, password: string) {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

// GET /:businessId — list connections (credential excluded)
router.get('/:businessId', requireAuth, async (req: Request, res: Response) => {
  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', req.params.businessId)
    .eq('user_id', req.user!.id)
    .single();
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const { data, error } = await supabase
    .from('cms_connections')
    .select('id, business_id, type, site_url, username, status, created_at')
    .eq('business_id', req.params.businessId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

const ConnectSchema = z.object({
  businessId:  z.string().uuid(),
  siteUrl:     z.string().url().max(500),
  username:    z.string().min(1).max(200),
  appPassword: z.string().min(1).max(500),
});

// POST /connect — test credentials then save
router.post('/connect', requireAuth, async (req: Request, res: Response) => {
  const parsed = ConnectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { businessId, siteUrl, username, appPassword } = parsed.data;

  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', req.user!.id)
    .single();
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const normalizedUrl = siteUrl.replace(/\/+$/, '');

  // Test connection against WP REST API
  try {
    const testRes = await fetch(`${normalizedUrl}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: basicAuthHeader(username, appPassword) },
      signal: AbortSignal.timeout(10000),
    });

    if (testRes.status === 401 || testRes.status === 403) {
      return res.status(400).json({ error: 'Invalid username or application password. Make sure you generated an Application Password in WordPress → Users → Profile.' });
    }
    if (testRes.status === 404) {
      return res.status(400).json({ error: 'WordPress REST API not found at that URL. Verify the site URL is correct and the REST API is not disabled.' });
    }
    if (!testRes.ok) {
      return res.status(400).json({ error: `WordPress returned status ${testRes.status}. Check the site URL.` });
    }
  } catch (err: any) {
    const msg: string = err?.message ?? '';
    if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
      return res.status(400).json({ error: 'Cannot reach the WordPress site. Check the URL and ensure the site is live.' });
    }
    return res.status(400).json({ error: 'Connection test failed: ' + msg });
  }

  const encryptedCredential = encrypt(appPassword);

  // Replace any existing connection for this business
  await supabase.from('cms_connections').delete().eq('business_id', businessId);

  const { data, error } = await supabase
    .from('cms_connections')
    .insert({
      business_id: businessId,
      type: 'wordpress',
      site_url: normalizedUrl,
      username,
      encrypted_credential: encryptedCredential,
      status: 'active',
    })
    .select('id, business_id, type, site_url, username, status, created_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /:id — disconnect
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { data: conn } = await supabase
    .from('cms_connections')
    .select('id, business_id')
    .eq('id', req.params.id)
    .single();

  if (!conn) return res.status(404).json({ error: 'Connection not found' });

  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', conn.business_id)
    .eq('user_id', req.user!.id)
    .single();

  if (!biz) return res.status(403).json({ error: 'Forbidden' });

  const { error } = await supabase.from('cms_connections').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export { decrypt };
export default router;
