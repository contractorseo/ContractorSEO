import { useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

interface AuthState {
  supabaseUser: SupabaseUser | null;
  profile: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    supabaseUser: null,
    profile: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.access_token).then((profile) => {
          setState({ supabaseUser: session.user, profile, session, loading: false });
        });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.access_token);
        setState({ supabaseUser: session.user, profile, session, loading: false });
      } else {
        setState({ supabaseUser: null, profile: null, session: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}

async function fetchBetaMode(token: string): Promise<boolean> {
  // Use raw fetch with explicit token — avoids the async interceptor timing hazard
  // and removes the axios dependency from this early bootstrap path.
  const raw = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  const stripped = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const base = stripped.replace(/\/api\/?$/, ''); // strip BOM + trailing /api
  const url = `${base}/api/auth/context`;
  console.log('[useAuth] fetching betaMode from', url);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json() as { betaMode: boolean };
    console.log('[useAuth] betaMode result:', data);
    return !!data.betaMode;
  } catch (err) {
    console.error('[useAuth] betaMode fetch failed:', err);
    return false;
  }
}

async function fetchProfile(userId: string, token: string): Promise<User | null> {
  const [{ data }, betaMode] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    fetchBetaMode(token),
  ]);
  if (!data) return null;
  return betaMode ? { ...data, plan: 'agency' as const } : data;
}
