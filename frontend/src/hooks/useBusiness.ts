import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Business } from '@/types';

const STORAGE_KEY = 'cseo_active_business';

export function useBusiness(userId: string | undefined) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBizId, setActiveBizId] = useState<string | undefined>(
    () => localStorage.getItem(STORAGE_KEY) ?? undefined
  );
  const [fetchedForId, setFetchedForId] = useState<string | undefined>(undefined);

  // Derive loading synchronously to avoid the flash that caused the onboarding
  // redirect loop (DashboardLayout would see loading=false+business=null between
  // the auth-resolved render and the async business fetch completing).
  const loading = userId !== undefined ? fetchedForId !== userId : false;

  useEffect(() => {
    if (!userId) {
      setFetchedForId(undefined);
      setBusinesses([]);
      return;
    }
    let cancelled = false;
    supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setBusinesses(data ?? []);
          setFetchedForId(userId);
        }
      });
    return () => { cancelled = true; };
  }, [userId]);

  const business =
    businesses.find((b) => b.id === activeBizId) ?? businesses[0] ?? null;

  function switchBusiness(bizId: string) {
    localStorage.setItem(STORAGE_KEY, bizId);
    setActiveBizId(bizId);
  }

  function addBusiness(biz: Business) {
    setBusinesses((prev) => [...prev, biz]);
    switchBusiness(biz.id);
  }

  return { business, businesses, loading, switchBusiness, addBusiness };
}
