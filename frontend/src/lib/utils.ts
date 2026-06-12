import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  return phone;
}

export function getDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getRankChange(current: number | null, previous: number | null): 'up' | 'down' | 'same' | 'new' {
  if (current === null) return 'new';
  if (previous === null) return 'new';
  if (current < previous) return 'up';
  if (current > previous) return 'down';
  return 'same';
}

export const CONTRACTOR_CATEGORIES = [
  'Electrician', 'Plumber', 'HVAC Contractor', 'Roofer', 'Landscaper',
  'General Contractor', 'Painter', 'Carpenter', 'Flooring Installer',
  'Pool Builder', 'Foundation Repair', 'Siding Contractor', 'Window Installer',
  'Fence Contractor', 'Deck Builder', 'Masonry', 'Demolition', 'Irrigation',
];
