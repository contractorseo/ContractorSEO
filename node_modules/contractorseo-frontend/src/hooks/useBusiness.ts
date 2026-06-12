import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types';

export function useBusiness(userId: string | undefined) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
      .then(({ data }) => {
        setBusiness(data);
        setLoading(false);
      });
  }, [userId]);

  return { business, setBusiness, loading };
}
