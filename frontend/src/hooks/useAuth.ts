import { useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
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
        fetchProfile(session.user.id).then((profile) => {
          setState({ supabaseUser: session.user, profile, session, loading: false });
        });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ supabaseUser: session.user, profile, session, loading: false });
      } else {
        setState({ supabaseUser: null, profile: null, session: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}

async function fetchProfile(userId: string): Promise<User | null> {
  const [{ data }, ctxRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    api.get<{ betaMode: boolean }>('/api/auth/context').then((r) => r.data).catch(() => ({ betaMode: false })),
  ]);
  if (!data) return null;
  return ctxRes.betaMode ? { ...data, plan: 'agency' as const } : data;
}
