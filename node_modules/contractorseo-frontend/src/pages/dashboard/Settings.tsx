import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { User, Business, PLAN_FEATURES } from '@/types';
import { getDaysLeft, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { CreditCard, Building2, CheckCircle, Zap, Shield } from 'lucide-react';

interface Context { user: User; business: Business }

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
  const [bizForm, setBizForm] = useState({ ...business });
  const [savingBiz, setSavingBiz] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard size={18} /> Subscription</CardTitle>
          <Badge variant={isActive ? 'success' : daysLeft > 0 ? 'warning' : 'danger'}>
            {isActive ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : daysLeft > 0 ? `Trial · ${daysLeft}d left` : 'Trial expired'}
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
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                      {f}
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
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSaveBusiness} loading={savingBiz}>Save changes</Button>
        </div>
      </Card>

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
    </div>
  );
}
