import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Zap } from 'lucide-react';
import { PublicFooter } from '@/components/layout/PublicFooter';

const FEATURES: Array<{
  label: string;
  trial: boolean | string;
  growth: boolean | string;
  agency: boolean | string;
  highlight?: boolean;
}> = [
  // AI Visibility Suite
  { label: 'AI Visibility Suite', trial: false, growth: true, agency: true, highlight: true },
  { label: 'Schema markup generator (JSON-LD)', trial: false, growth: true, agency: true },
  { label: '"Why you\'re not showing up" diagnosis', trial: false, growth: true, agency: true },
  { label: 'One-click FAQ content for failing queries', trial: false, growth: true, agency: true },
  { label: 'Trend timeline — before vs. after fixes', trial: false, growth: true, agency: true },
  { label: 'AI visibility checks / month', trial: false, growth: '50', agency: '200' },
  { label: 'Tracked queries', trial: false, growth: '5', agency: '20' },
  // Content
  { label: 'Content Studio', trial: false, growth: true, agency: true, highlight: true },
  { label: 'AI articles / month', trial: '2 total', growth: '15', agency: '50' },
  { label: 'FAQ & schema auto-generated per article', trial: false, growth: true, agency: true },
  { label: 'Publish directly to WordPress', trial: false, growth: true, agency: true },
  { label: 'Auto-schedule articles', trial: false, growth: false, agency: true },
  // GBP & Posts
  { label: 'GBP Posts & Calendar', trial: false, growth: true, agency: true, highlight: true },
  { label: 'AI-generated GBP posts', trial: false, growth: true, agency: true },
  { label: 'Post scheduling calendar', trial: false, growth: true, agency: true },
  // Reviews
  { label: 'Review Management', trial: false, growth: true, agency: true, highlight: true },
  { label: 'SMS review requests / month', trial: false, growth: '200', agency: '2,000' },
  { label: 'AI-generated review responses', trial: false, growth: true, agency: true },
  // SEO
  { label: 'Local SEO', trial: false, growth: true, agency: true, highlight: true },
  { label: 'Keyword tracking', trial: false, growth: '50', agency: '200' },
  { label: 'Competitor monitoring', trial: false, growth: true, agency: true },
  { label: 'Citation tracking (NAP)', trial: false, growth: true, agency: true },
  // Locations & reporting
  { label: 'Locations', trial: '1', growth: '1', agency: '10' },
  { label: 'White-label reporting', trial: false, growth: false, agency: true },
  { label: 'Google Business Profile integration', trial: false, growth: true, agency: true },
  { label: 'WordPress integration', trial: false, growth: true, agency: true },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === false) return <XCircle size={16} className="text-gray-300 mx-auto" />;
  if (value === true) return <CheckCircle2 size={16} className="text-green-500 mx-auto" />;
  return <span className="text-sm font-medium text-gray-700">{value}</span>;
}

export function Pricing() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg">
            <Zap size={20} className="text-brand-600" />
            RankrSEO
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
            <Link
              to="/signup"
              className="text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Everything a local contractor needs to show up when homeowners ask AI where to hire.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Trial */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Trial</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-400 text-sm">/ 14 days</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Explore the platform — no credit card required.</p>
            </div>
            <Link
              to="/signup"
              className="block text-center py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all mt-auto"
            >
              Start free trial
            </Link>
          </div>

          {/* Growth */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
            <div className="mb-6">
              <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-1">Growth</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">$97</span>
                <span className="text-gray-400 text-sm">/ mo</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Perfect for solo contractors wanting AI-powered local SEO.</p>
            </div>
            <Link
              to="/signup"
              className="block text-center py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors mt-auto"
            >
              Start free trial
            </Link>
          </div>

          {/* Agency */}
          <div className="bg-white rounded-2xl border-2 border-brand-500 p-6 flex flex-col relative">
            <span className="absolute -top-3 left-5 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              Most popular
            </span>
            <div className="mb-6">
              <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-1">Agency</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">$297</span>
                <span className="text-gray-400 text-sm">/ mo</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">For multi-location businesses or agencies managing multiple clients.</p>
            </div>
            <Link
              to="/signup"
              className="block text-center py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors mt-auto"
            >
              Start free trial
            </Link>
          </div>
        </div>

        {/* Feature table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 w-1/2">Feature</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-gray-500">Trial</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-brand-600">Growth</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-brand-700">Agency</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  f.highlight ? (
                    <tr key={i} className="bg-gray-50 border-t border-b border-gray-100">
                      <td colSpan={4} className="px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {f.label}
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 text-sm text-gray-700">{f.label}</td>
                      <td className="px-4 py-3.5 text-center"><Cell value={f.trial} /></td>
                      <td className="px-4 py-3.5 text-center"><Cell value={f.growth} /></td>
                      <td className="px-4 py-3.5 text-center"><Cell value={f.agency} /></td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Common questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'What is the AI Visibility Suite?',
                a: 'It\'s a set of tools that helps your business get cited when homeowners ask AI assistants (ChatGPT, Perplexity, Google AI) questions like "who\'s the best plumber near me?" It includes schema markup generation, automated diagnosis of why you\'re not showing up, one-click content fixes, and a before/after trend timeline.',
              },
              {
                q: 'Do I need a WordPress site?',
                a: 'No. WordPress integration lets you publish AI articles and schema markup automatically, but every feature works without it. You can copy-paste the schema snippet into any website platform.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. Cancel from your billing portal at any time — no lock-in, no cancellation fees.',
              },
              {
                q: 'Does the free trial require a credit card?',
                a: 'No credit card required to start your 14-day trial. You\'ll only be asked for payment when you choose to upgrade.',
              },
            ].map((item, i) => (
              <div key={i} className="border-b border-gray-100 pb-6">
                <p className="font-semibold text-gray-900 mb-1">{item.q}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-brand-600 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-white mb-2">Start showing up where customers are looking</h2>
          <p className="text-brand-100 mb-6">14-day free trial. No credit card required.</p>
          <Link
            to="/signup"
            className="inline-block bg-white text-brand-700 font-semibold px-8 py-3 rounded-xl hover:bg-brand-50 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </div>

      <div className="pb-10">
        <PublicFooter />
      </div>
    </div>
  );
}
