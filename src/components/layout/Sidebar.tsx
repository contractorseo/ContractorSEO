import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Star, Search, Users, MapPin,
  Settings, LogOut, Zap, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';
import { cn, getDaysLeft } from '@/lib/utils';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/dashboard/posts', icon: FileText, label: 'Content' },
  { to: '/dashboard/reviews', icon: Star, label: 'Reviews' },
  { to: '/dashboard/keywords', icon: Search, label: 'Keywords' },
  { to: '/dashboard/competitors', icon: Users, label: 'Competitors' },
  { to: '/dashboard/citations', icon: MapPin, label: 'Citations' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  user: User;
  businessName?: string;
}

export function Sidebar({ user, businessName }: SidebarProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Signed out');
    navigate('/login');
  }

  const daysLeft = getDaysLeft(user.trial_ends_at);
  const isTrial = user.plan === 'trial';

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-950 text-white">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">ContractorSEO</p>
            {businessName && <p className="text-xs text-gray-400 truncate max-w-[160px]">{businessName}</p>}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon size={17} />
            {label}
            <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800 space-y-3">
        {isTrial && (
          <div className="bg-brand-900 rounded-lg p-3">
            <p className="text-xs font-semibold text-brand-300 mb-1">
              {daysLeft > 0 ? `${daysLeft} days left in trial` : 'Trial ended'}
            </p>
            <NavLink
              to="/dashboard/settings"
              className="text-xs text-white font-medium hover:text-brand-200 transition-colors"
            >
              Upgrade to Growth →
            </NavLink>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
