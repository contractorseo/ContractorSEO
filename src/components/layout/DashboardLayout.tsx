import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';

export function DashboardLayout() {
  const { supabaseUser, profile, loading } = useAuth();
  const { business } = useBusiness(supabaseUser?.id);

  if (loading) {
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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={profile} businessName={business?.name} />
      <main className="flex-1 overflow-auto">
        <Outlet context={{ user: profile, business }} />
      </main>
    </div>
  );
}
