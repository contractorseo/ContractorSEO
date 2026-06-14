import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Menu, Zap } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';

export function DashboardLayout() {
  const { supabaseUser, profile, loading: authLoading } = useAuth();
  const { business, businesses, loading: bizLoading, switchBusiness, addBusiness } = useBusiness(supabaseUser?.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!supabaseUser || !profile) return <Navigate to="/login" replace />;

  if (!business && window.location.pathname !== '/onboarding') {
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
