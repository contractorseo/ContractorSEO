import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Star, Search, Users, MapPin,
  Settings, LogOut, Zap, ChevronRight, ChevronDown, Plus,
  BarChart3, Building2, X, BookOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User, Business } from '@/types';
import { cn, getDaysLeft } from '@/lib/utils';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard',             icon: LayoutDashboard, label: 'Overview',     end: true },
  { to: '/dashboard/posts',       icon: FileText,        label: 'Content' },
  { to: '/dashboard/content-studio', icon: BookOpen,    label: 'Content Studio' },
  { to: '/dashboard/reviews',     icon: Star,            label: 'Reviews' },
  { to: '/dashboard/keywords',    icon: Search,          label: 'Keywords' },
  { to: '/dashboard/competitors', icon: Users,           label: 'Competitors' },
  { to: '/dashboard/citations',   icon: MapPin,          label: 'Citations' },
  { to: '/dashboard/report',      icon: BarChart3,       label: 'Report' },
  { to: '/dashboard/settings',    icon: Settings,        label: 'Settings' },
];

interface SidebarProps {
  user: User;
  business: Business | null;
  businesses: Business[];
  onSwitchBusiness: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ user, business, businesses, onSwitchBusiness, isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);

  const isAgency = user.plan === 'agency';
  const canAddLocation = isAgency && businesses.length < 10;
  const daysLeft = getDaysLeft(user.trial_ends_at);
  const isTrial = user.plan === 'trial';

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Signed out');
    navigate('/login');
  }

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-gray-950 text-white',
      'transition-transform duration-200 ease-in-out',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    )}>
      {/* Logo */}
      <div className="p-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <p className="text-sm font-bold tracking-tight">ContractorSEO</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Business picker */}
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
        >
          <div className="w-7 h-7 rounded-md bg-gray-700 flex items-center justify-center shrink-0">
            <Building2 size={13} className="text-gray-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{business?.name ?? 'No business'}</p>
            <p className="text-xs text-gray-500 truncate">{business?.city}, {business?.state}</p>
          </div>
          <ChevronDown size={13} className={cn('text-gray-500 shrink-0 transition-transform', pickerOpen && 'rotate-180')} />
        </button>

        {pickerOpen && (
          <div className="mt-1 space-y-0.5">
            {businesses.map((biz) => (
              <button
                key={biz.id}
                onClick={() => { onSwitchBusiness(biz.id); setPickerOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors',
                  biz.id === business?.id
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{biz.name}</span>
              </button>
            ))}

            {canAddLocation ? (
              <button
                onClick={() => { setPickerOpen(false); navigate('/onboarding'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-brand-400 hover:bg-gray-800 transition-colors"
              >
                <Plus size={11} className="shrink-0" />
                Add location
              </button>
            ) : isAgency && businesses.length >= 10 ? (
              <p className="px-3 py-1 text-xs text-gray-600">10-location limit reached</p>
            ) : !isAgency && businesses.length >= 1 ? (
              <NavLink
                to="/dashboard/settings"
                onClick={() => setPickerOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-brand-400 hover:bg-gray-800 transition-colors"
              >
                <Plus size={11} className="shrink-0" />
                Upgrade for multi-location
              </NavLink>
            ) : null}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
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

      {/* Bottom */}
      <div className="p-3 border-t border-gray-800 space-y-3">
        {isTrial && (
          <div className="bg-brand-900 rounded-lg p-3">
            <p className="text-xs font-semibold text-brand-300 mb-1">
              {daysLeft > 0 ? `${daysLeft} days left in trial` : 'Trial ended'}
            </p>
            <NavLink to="/dashboard/settings" className="text-xs text-white font-medium hover:text-brand-200 transition-colors">
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
