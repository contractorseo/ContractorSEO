import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Auto-confirm a newly created user's email so the trial signup →
// onboarding → dashboard flow works without requiring inbox verification.
// Only accepts users created in the last 5 minutes to limit abuse.
router.post('/confirm-email', async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId required' });
  }

  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user }, error: fetchError } = await admin.auth.admin.getUserById(userId);
  if (fetchError || !user) return res.status(404).json({ error: 'User not found' });

  const ageSecs = (Date.now() - new Date(user.created_at).getTime()) / 1000;
  if (ageSecs > 300) return res.status(403).json({ error: 'Confirmation window expired' });

  const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
});

// Frontend reads this to auto-unlock plan gates when beta mode is on.
// No auth required — just reflects the server's BETA_MODE env var.
router.get('/context', (_req, res) => {
  res.json({ betaMode: process.env.BETA_MODE === 'true' });
});

export default router;
