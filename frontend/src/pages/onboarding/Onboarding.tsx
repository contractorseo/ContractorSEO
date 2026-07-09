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
import {
  Zap, Building2, MapPin, Phone, BadgeCheck,
  ChevronRight, ChevronLeft, Bot,
  CheckCircle2, ArrowRight, FileText, Code2,
} from 'lucide-react';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const STEPS = [
  { id: 1, icon: Building2, title: 'Business name',      desc: 'What is your company called?' },
  { id: 2, icon: BadgeCheck, title: 'Category',           desc: 'What type of contractor are you?' },
  { id: 3, icon: MapPin,     title: 'Location',           desc: 'Where is your business located?' },
  { id: 4, icon: Phone,      title: 'Contact',            desc: 'How do customers reach you?' },
  { id: 5, icon: BadgeCheck, title: 'License',            desc: 'Your contractor license (optional)' },
  { id: 6, icon: Bot,        title: 'First AI query',     desc: 'What do homeowners search for when hiring someone like you?' },
];

const QUERY_TEMPLATES: Record<string, [string, string, string]> = {
  'Electrician':          ['best electrician in {city}',          'licensed electrician near me {city}',    'electrician {city}'],
  'General Contractor':   ['best general contractor in {city}',   'home renovation contractor {city}',      'licensed general contractor {city}'],
  'Plumber':              ['best plumber in {city}',              'emergency plumber near me {city}',       'licensed plumber {city}'],
  'HVAC / AC':            ['best HVAC company in {city}',         'AC repair near me {city}',               'HVAC contractor {city}'],
  'Roofer':               ['best roofing contractor in {city}',   'roof repair {city}',                     'licensed roofer near me {city}'],
  'Painter':              ['best house painter in {city}',        'interior painter near me {city}',        'exterior painting {city}'],
  'Landscaper':           ['best landscaping company in {city}',  'lawn care service {city}',               'landscaper near me {city}'],
  'Concrete':             ['concrete contractor in {city}',       'driveway installation {city}',           'concrete company near me {city}'],
  'Flooring':             ['flooring contractor in {city}',       'hardwood floor installation {city}',     'best flooring company {city}'],
  'Fencing':              ['fence contractor in {city}',          'fence installation near me {city}',      'fencing company {city}'],
  'Remodeling':           ['home remodeler in {city}',            'kitchen remodel contractor {city}',      'bathroom renovation {city}'],
  'Windows & Doors':      ['window replacement contractor {city}','door installation near me {city}',       'window company {city}'],
  'Solar':                ['solar panel installer in {city}',     'best solar company near me {city}',      'solar contractor {city}'],
  'Insulation':           ['insulation contractor near me {city}','spray foam insulation {city}',           'best insulation company {city}'],
};

function getSuggestions(category: string, city: string): string[] {
  const c = city.trim() || 'my city';
  const templates: [string, string, string] = QUERY_TEMPLATES[category] ?? [
    `best ${category.toLowerCase()} in {city}`,
    `licensed ${category.toLowerCase()} near me {city}`,
    `affordable ${category.toLowerCase()} {city}`,
  ];
  return templates.map((t) => t.replace('{city}', c));
}

const NEXT_ACTIONS = [
  {
    icon: <Bot size={20} className="text-brand-600" />,
    title: 'Run your first AI check',
    desc: 'See if ChatGPT and Perplexity mention you for your tracked query.',
    href: '/dashboard/ai-visibility',
  },
  {
    icon: <Code2 size={20} className="text-purple-600" />,
    title: 'Install schema markup',
    desc: 'One click to add JSON-LD to your site and signal your business to AI engines.',
    href: '/dashboard/settings',
  },
  {
    icon: <FileText size={20} className="text-blue-600" />,
    title: 'Write your first article',
    desc: 'AI-written, citation-optimized content that ranks in search and AI.',
    href: '/dashboard/content-studio',
  },
];

function SuccessScreen({ onGo }: { onGo: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 size={32} className="text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">You're all set!</h2>
      <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
        RankrSEO is ready to track and grow your AI visibility. Here's where to start:
      </p>

      <div className="text-left space-y-3 mb-8">
        {NEXT_ACTIONS.map((a) => (
          <div
            key={a.title}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100"
          >
            <div className="mt-0.5 flex-shrink-0">{a.icon}</div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{a.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onGo} className="w-full">
        Go to dashboard <ArrowRight size={16} />
      </Button>
    </div>
  );
}

export function Onboarding() {
  const navigate = useNavigate();
  const { supabaseUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    name: '', category: '', address: '', city: '', state: 'TX', zip: '',
    phone: '', website: '', license_number: '',
  });

  const [selectedQuery, setSelectedQuery] = useState('');
  const [customQuery, setCustomQuery] = useState('');

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const suggestions = getSuggestions(form.category, form.city);
  const firstQuery = selectedQuery || customQuery.trim();

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  async function handleFinish() {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? supabaseUser?.id;
    if (!userId) {
      toast.error('Session expired — please sign in again.');
      navigate('/login');
      return;
    }

    setSaving(true);
    try {
      const { data: biz } = await api.post('/api/businesses', form);

      if (firstQuery) {
        await api.post(`/api/ai-visibility/${biz.id}/prompts`, { prompt_template: firstQuery }).catch(() => {});
      }

      api.post(`/api/citations/seed/${biz.id}`).catch(() => {});

      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 400));
        const { data } = await supabase.from('businesses').select('id').eq('user_id', userId).limit(1);
        if (data && data.length > 0) break;
      }

      setDone(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ??
        (Array.isArray(err.response?.data?.details) ? err.response.data.details[0]?.message : null) ??
        'Something went wrong. Please try again.';
      toast.error(msg);
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

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-brand-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-white mb-6">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Zap size={14} />
            </div>
            <span className="font-bold">RankrSEO</span>
          </div>
          {!done && (
            <>
              <p className="text-gray-400 text-sm">Step {step} of {STEPS.length}</p>
              <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>
        {children}
      </div>
    </div>
  );

  if (done) {
    return shell(<SuccessScreen onGo={() => navigate('/dashboard')} />);
  }

  return shell(
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

          {id === 6 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Suggested queries</p>
                <div className="space-y-2">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => { setSelectedQuery(q); setCustomQuery(''); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-sm transition-all ${
                        selectedQuery === q
                          ? 'border-brand-500 bg-brand-50 text-brand-800 font-medium'
                          : 'border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50/50'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Or type your own</p>
                <Input
                  label=""
                  value={customQuery}
                  onChange={(e) => { setCustomQuery(e.target.value); setSelectedQuery(''); }}
                  placeholder='e.g. "best plumber in Austin TX"'
                />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                We'll check ChatGPT and Perplexity for this exact query. You can add more after setup.
              </p>
            </div>
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
          <Button onClick={handleFinish} loading={saving} disabled={saving}>
            {saving ? 'Setting up…' : <><span>Launch RankrSEO</span> <ArrowRight size={16} /></>}
          </Button>
        )}
      </div>

      {step === STEPS.length && !saving && (
        <p className="text-center text-xs text-gray-400 mt-3">
          No query yet?{' '}
          <button type="button" onClick={handleFinish} className="text-brand-600 hover:underline">
            Skip and launch
          </button>
        </p>
      )}
    </div>
  );
}
