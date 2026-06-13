import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types';

export function useBusiness(userId: string | undefined) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [fetchedForId, setFetchedForId] = useState<string | undefined>(undefined);

  // Derive loading synchronously — true whenever userId is set but we haven't
  // completed a fetch for it yet. This prevents a render where authLoading just
  // turned false but the useBusiness effect hasn't fired yet (effects run after
  // render), which would cause DashboardLayout to see loading=false+business=null
  // and redirect to /onboarding before the fetch even starts.
  const loading = userId !== undefined ? fetchedForId !== userId : false;

  useEffect(() => {
    if (!userId) {
      setFetchedForId(undefined);
      setBusiness(null);
      return;
    }

    let cancelled = false;
    supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setBusiness(data);
          setFetchedForId(userId);
        }
      });

    return () => { cancelled = true; };
  }, [userId]);

  return { business, setBusiness, loading };
}
