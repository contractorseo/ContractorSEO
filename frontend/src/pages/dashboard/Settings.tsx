import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { User, Business } from '@/types';
import { getDaysLeft, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { CreditCard, Building2, CheckCircle, Shield, MapPin, ExternalLink, Unlink, Globe } from 'lucide-react';
import type { CmsConnection } from '@/types';

interface Context { user: User; business: Business }

interface GBPLocation { name: string; title: string }

const PLANS = [
  {
    key: 'growth',
    name: 'Growth',
    price: 97,
    desc: 'Perfect for solo contractors',
    features: ['16 AI posts/month', '1 location', '50 keywords', '200 review requests/month', 'Competitor tracking'],
  },
  {
    key: 'agency',
    name: 'Agency',
    price: 297,
    desc: 'For multi-location or agencies',
    features: ['Unlimited AI posts', '10 locations', '200 keywords', '2,000 review requests/month', 'White-label reporting'],
    highlight: true,
  },
];

export function Settings() {
  const { user, business } = useOutletContext<Context>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bizForm, setBizForm] = useState({ ...business });
  const [savingBiz, setSavingBiz] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // WordPress state
  const [wpConnection, setWpConnection] = useState<CmsConnection | null>(null);
  const [wpLoading, setWpLoading] = useState(true);
  const [wpForm, setWpForm] = useState({ siteUrl: '', username: '', appPassword: '' });
  const [wpConnecting, setWpConnecting] = useState(false);
  const [wpDisconnecting, setWpDisconnecting] = useState(false);

  // GBP state
  const [gbpConnected, setGbpConnected] = useState(business.gbp_connected);
  const [gbpConnecting, setGbpConnecting] = useState(false);
  const [gbpDisconnecting, setGbpDisconnecting] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [pendingLocations, setPendingLocations] = useState<GBPLocation[]>([]);
  const [savingLocation, setSavingLocation] = useState<string | null>(null);

  // Load WordPress connection
  useEffect(() => {
    api.get(`/cms/${business.id}`)
      .then(({ data }) => setWpConnection(Array.isArray(data) && data.length > 0 ? data[0] : null))
      .catch(() => {})
      .finally(() => setWpLoading(false));
  }, [business.id]);

  async function handleConnectWordPress() {
    if (!wpForm.siteUrl.trim() || !wpForm.username.trim() || !wpForm.appPassword.trim()) {
      toast.error('All fields are required');
      return;
    }
    setWpConnecting(true);
    try {
      const { data } = await api.post('/cms/connect', {
        businessId: business.id,
        siteUrl: wpForm.siteUrl.trim(),
        username: wpForm.username.trim(),
        appPassword: wpForm.appPassword.trim(),
      });
      setWpConnection(data);
      setWpForm({ siteUrl: '', username: '', appPassword: '' });
      toast.success('WordPress connected!');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to connect WordPress');
    } finally {
      setWpConnecting(false);
    }
  }

  async function handleDisconnectWordPress() {
    if (!wpConnection) return;
    setWpDisconnecting(true);
    try {
      await api.delete(`/cms/${wpConnection.id}`);
      setWpConnection(null);
      toast.success('WordPress disconnected');
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setWpDisconnecting(false);
    }
  }

  // Handle OAuth callback redirect params
  useEffect(() => {
    const gbpParam = searchParams.get('gbp');
    if (!gbpParam) return;

    if (gbpParam === 'select') {
      try {
        const locations: GBPLocation[] = JSON.parse(decodeURIComponent(searchParams.get('locations') ?? '[]'));
        setPendingLocations(locations);
        setLocationModal(true);
      } catch {
        toast.error('Failed to parse GBP locations');
      }
    } else if (gbpParam === 'connected') {
      setGbpConnected(true);
      toast.success('Google Business Profile connected!');
    } else if (gbpParam === 'error') {
      toast.error(`GBP error: ${searchParams.get('msg') ?? 'unknown'}`);
    }

    // Clear the query params
    setSearchParams({}, { replace: true });
  }, []);

  async function handleConnectGBP() {
    setGbpConnecting(true);
    try {
      const { data } = await api.get(`/gbp/auth-url?businessId=${business.id}`);
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to start GBP connection');
      setGbpConnecting(false);
    }
  }

  async function handleSelectLocation(location: GBPLocation) {
    setSavingLocation(location.name);
    try {
      await api.post(`/gbp/connect/${business.id}`, {
        locationName: location.name,
        locationTitle: location.title,
      });
      setGbpConnected(true);
      setLocationModal(false);
      toast.success(`Connected to "${location.title}"`);
    } catch {
      toast.error('Failed to save location');
    } finally {
      setSavingLocation(null);
    }
  }

  async function handleDisconnectGBP() {
    setGbpDisconnecting(true);
    try {
      await api.delete(`/gbp/disconnect/${business.id}`);
      setGbpConnected(false);
      toast.success('GBP disconnected');
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setGbpDisconnecting(false);
    }
  }

  async function handleSaveBusiness() {
    setSavingBiz(true);
    try {
      await api.put(`/businesses/${business.id}`, bizForm);
      toast.success('Business updated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setSavingBiz(false);
    }
  }

  async function handleCheckout(plan: string) {
    setCheckoutLoading(plan);
    try {
      const { data } = await api.post('/stripe/checkout', { plan });
      window.location.href = data.url;
    } catch {
      toast.error('Failed to start checkout');
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const { data } = await api.post('/stripe/portal');
      window.location.href = data.url;
    } catch {
      toast.error('No billing account found');
      setPortalLoading(false);
    }
  }

  const daysLeft = getDaysLeft(user.trial_ends_at);
  const isActive = user.plan !== 'trial';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard size={18} /> Subscription</CardTitle>
          <Badge variant={isActive ? 'success' : daysLeft > 0 ? 'warning' : 'danger'}>
            {isActive
              ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1)
              : daysLeft > 0 ? `Trial · ${daysLeft}d left` : 'Trial expired'}
          </Badge>
        </CardHeader>

        {isActive ? (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">{user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan</p>
              <p className="text-sm text-gray-500">Manage billing, update payment method, or cancel</p>
            </div>
            <Button variant="outline" onClick={handlePortal} loading={portalLoading}>Manage billing</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-xl border-2 p-5 transition-all ${plan.highlight ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-4 bg-brand-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    Most popular
                  </span>
                )}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500 text-sm">/mo</span>
                </div>
                <p className="font-semibold text-gray-900 mb-0.5">{plan.name}</p>
                <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle size={14} className="text-green-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlight ? 'primary' : 'outline'}
                  onClick={() => handleCheckout(plan.key)}
                  loading={checkoutLoading === plan.key}
                >
                  Start {plan.name}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Google Business Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin size={18} /> Google Business Profile
          </CardTitle>
          <Badge variant={gbpConnected ? 'success' : 'gray'}>
            {gbpConnected ? 'Connected' : 'Not connected'}
          </Badge>
        </CardHeader>

        {gbpConnected ? (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">GBP connected</p>
              <p className="text-sm text-gray-500">Posts can be published directly to your Google listing</p>
            </div>
            <Button variant="outline" onClick={handleDisconnectGBP} loading={gbpDisconnecting}>
              <Unlink size={14} /> Disconnect
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
            <p className="text-sm text-gray-600">
              Connect your Google Business Profile to publish AI-generated posts directly to your listing and track your GBP performance.
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={handleConnectGBP} loading={gbpConnecting}>
                <ExternalLink size={14} /> Connect Google Business Profile
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              You'll be redirected to Google to authorize access. Requires a verified Google Business Profile listing.
            </p>
          </div>
        )}
      </Card>

      {/* WordPress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={18} /> WordPress
          </CardTitle>
          <Badge variant={wpConnection ? (wpConnection.status === 'error' ? 'danger' : 'success') : 'gray'}>
            {wpLoading ? 'Loading…' : wpConnection ? (wpConnection.status === 'error' ? 'Auth error' : 'Connected') : 'Not connected'}
          </Badge>
        </CardHeader>

        {wpConnection ? (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 text-sm">{wpConnection.site_url}</p>
              <p className="text-xs text-gray-500 mt-0.5">Logged in as <span className="font-medium">{wpConnection.username}</span></p>
              {wpConnection.status === 'error' && (
                <p className="text-xs text-red-600 mt-1">Authentication failed — please reconnect.</p>
              )}
            </div>
            <Button variant="outline" onClick={handleDisconnectWordPress} loading={wpDisconnecting} size="sm">
              <Unlink size={14} /> Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your WordPress site to publish AI articles directly. You'll need an{' '}
              <a
                href="https://wordpress.org/documentation/article/application-passwords/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                Application Password
              </a>{' '}
              (WordPress → Users → Profile → Application Passwords).
            </p>
            <div className="grid gap-3">
              <Input
                label="WordPress site URL"
                placeholder="https://yoursite.com"
                value={wpForm.siteUrl}
                onChange={(e) => setWpForm((f) => ({ ...f, siteUrl: e.target.value }))}
              />
              <Input
                label="Username"
                placeholder="Your WordPress username"
                value={wpForm.username}
                onChange={(e) => setWpForm((f) => ({ ...f, username: e.target.value }))}
              />
              <Input
                label="Application Password"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                type="password"
                value={wpForm.appPassword}
                onChange={(e) => setWpForm((f) => ({ ...f, appPassword: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleConnectWordPress} loading={wpConnecting}>
                Connect WordPress
              </Button>
              <p className="text-xs text-gray-400">We test the connection before saving.</p>
            </div>
          </div>
        )}
      </Card>

      {/* Business info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 size={18} /> Business info</CardTitle>
        </CardHeader>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Business name" value={bizForm.name} onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Phone" value={bizForm.phone} onChange={(e) => setBizForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input label="Website" value={bizForm.website ?? ''} onChange={(e) => setBizForm((f) => ({ ...f, website: e.target.value }))} />
          <Input label="License number" value={bizForm.license_number ?? ''} onChange={(e) => setBizForm((f) => ({ ...f, license_number: e.target.value }))} />
          <Input label="Address" value={bizForm.address} onChange={(e) => setBizForm((f) => ({ ...f, address: e.target.value }))} className="md:col-span-2" />
          <Input label="City" value={bizForm.city} onChange={(e) => setBizForm((f) => ({ ...f, city: e.target.value }))} />
          <Input label="ZIP" value={bizForm.zip} onChange={(e) => setBizForm((f) => ({ ...f, zip: e.target.value }))} />
          <div className="md:col-span-2">
            <Input
              label="Google Place ID"
              value={bizForm.google_place_id ?? ''}
              onChange={(e) => setBizForm((f) => ({ ...f, google_place_id: e.target.value }))}
              placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
            />
            <p className="text-xs text-gray-400 mt-1">
              Used to generate your review request link.{' '}
              <a
                href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                Find your Place ID
              </a>
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSaveBusiness} loading={savingBiz}>Save changes</Button>
        </div>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield size={18} /> Account</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Email address</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Member since</p>
              <p className="text-sm text-gray-500">{formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Location picker modal (shown after OAuth callback) */}
      <Modal open={locationModal} onClose={() => setLocationModal(false)} title="Select Your Business Location" size="md">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Choose which Google Business Profile location to connect:</p>
          {pendingLocations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No locations found on this account.</p>
          ) : (
            pendingLocations.map((loc) => (
              <button
                key={loc.name}
                onClick={() => handleSelectLocation(loc)}
                disabled={!!savingLocation}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-brand-600 shrink-0" />
                  <span className="font-medium text-gray-900 text-sm">{loc.title}</span>
                </div>
                {savingLocation === loc.name && (
                  <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
