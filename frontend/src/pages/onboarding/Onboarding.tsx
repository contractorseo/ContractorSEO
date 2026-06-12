import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CONTRACTOR_CATEGORIES } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Zap, Building2, MapPin, Phone, BadgeCheck, ChevronRight, ChevronLeft } from 'lucide-react';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const STEPS = [
  { id: 1, icon: Building2, title: 'Business name', desc: 'What is your company called?' },
  { id: 2, icon: BadgeCheck, title: 'Category', desc: 'What type of contractor are you?' },
  { id: 3, icon: MapPin, title: 'Location', desc: 'Where is your business located?' },
  { id: 4, icon: Phone, title: 'Contact', desc: 'How do customers reach you?' },
  { id: 5, icon: BadgeCheck, title: 'License', desc: 'Your contractor license (optional)' },
];

export function Onboarding() {
  const navigate = useNavigate();
  const { supabaseUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', category: '', address: '', city: '', state: 'TX', zip: '',
    phone: '', website: '', license_number: '',
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  async function handleFinish() {
    if (!supabaseUser) return;
    setSaving(true);
    try {
      const { data: biz } = await api.post('/businesses', form);
      await api.post(`/citations/seed/${biz.id}`);
      toast.success('Business set up! Welcome to ContractorSEO.');
      navigate('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function canAdvance() {
    if (step === 1) return form.name.trim().length > 0;
    if (step === 2) return form.category.length > 0;
    if (step === 3) return form.address && form.city && form.state && form.zip.length >= 5;
    if (step === 4) return form.phone.replace(/\D/g, '').length >= 10;
    return true;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-brand-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-white mb-6">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Zap size={14} />
            </div>
            <span className="font-bold">ContractorSEO</span>
          </div>
          <p className="text-gray-400 text-sm">Step {step} of {STEPS.length}</p>
          <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {STEPS.map(({ id, title, desc }) => id === step && (
            <div key={id}>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
              <p className="text-gray-500 text-sm mb-6">{desc}</p>

              {id === 1 && (
                <Input
                  label="Business name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Dallas Electric Pro LLC"
                  autoFocus
                />
              )}

              {id === 2 && (
                <Select
                  label="Contractor category"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  options={[
                    { value: '', label: 'Select a category...' },
                    ...CONTRACTOR_CATEGORIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
              )}

              {id === 3 && (
                <div className="space-y-4">
                  <Input label="Street address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="123 Main St" />
                  <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Dallas" />
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="State"
                      value={form.state}
                      onChange={(e) => set('state', e.target.value)}
                      options={US_STATES.map((s) => ({ value: s, label: s }))}
                    />
                    <Input label="ZIP code" value={form.zip} onChange={(e) => set('zip', e.target.value)} placeholder="75201" maxLength={5} />
                  </div>
                </div>
              )}

              {id === 4 && (
                <div className="space-y-4">
                  <Input label="Phone number" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(214) 555-0100" />
                  <Input label="Website" type="url" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://yoursite.com" hint="Optional but recommended" />
                </div>
              )}

              {id === 5 && (
                <Input
                  label="Contractor license number"
                  value={form.license_number}
                  onChange={(e) => set('license_number', e.target.value)}
                  placeholder="e.g. TECL-12345"
                  hint="Displayed on your profile for trust. You can add this later."
                />
              )}
            </div>
          ))}

          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
            >
              <ChevronLeft size={16} /> Back
            </Button>

            {step < STEPS.length ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
                Continue <ChevronRight size={16} />
              </Button>
            ) : (
              <Button onClick={handleFinish} loading={saving} disabled={!canAdvance()}>
                Launch dashboard <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
