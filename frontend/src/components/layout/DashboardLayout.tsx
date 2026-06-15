import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Menu, Zap } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';

export function DashboardLayout() {
  const { supabaseUser, profile, loading: authLoading } = useAuth();
  const { business, businesses, loading: bizLoading, switchBusiness, addBusiness, refresh } = useBusiness(supabaseUser?.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Tracks whether we've already attempted one re-fetch after finding no
  // business. Prevents the redirect that happens on slow mobile connections
  // when useBusiness hasn't yet observed the row created by handleFinish().
  const [hasRefreshed, setHasRefreshed] = useState(false);

  useEffect(() => {
    // When auth and business loading finish and there's still no business,
    // do one automatic re-fetch before redirecting. This covers the race
    // where navigate('/dashboard') fires before the Supabase write is visible
    // to the subsequent read (common on slow mobile connections).
    if (authLoading || bizLoading || business || hasRefreshed) return;
    setHasRefreshed(true);
    refresh();
  }, [authLoading, bizLoading, business, hasRefreshed, refresh]);

  useEffect(() => {
    // Reset so the retry fires again if this user later has no businesses
    // (e.g. after deleting their only business).
    if (business) setHasRefreshed(false);
  }, [business]);

  const spinner = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>
  );

  if (authLoading || bizLoading) return spinner;
  if (!supabaseUser || !profile) return <Navigate to="/login" replace />;

  if (!business) {
    // Still waiting for the retry fetch to complete — keep showing spinner.
    if (!hasRefreshed) return spinner;
    // Retry done, still no business → user genuinely needs to onboard.
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        user={profile}
        business={business}
        businesses={businesses}
        onSwitchBusiness={switchBusiness}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {/* Content pushes right of the fixed sidebar on desktop */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-bold text-sm text-gray-900">ContractorSEO</span>
          </div>
        </header>
        <main className="flex-1">
          <Outlet context={{ user: profile, business, businesses, switchBusiness, addBusiness }} />
        </main>
      </div>
    </div>
  );
}
