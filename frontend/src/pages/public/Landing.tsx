import { Link } from 'react-router-dom';
import {
  Zap, Bot, FileText, Star, MapPin, BarChart2,
  CheckCircle2, ArrowRight, Code2, ShieldAlert, TrendingUp,
} from 'lucide-react';

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg">
          <Zap size={20} className="text-brand-600" />
          RankrSEO
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
          <Link to="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
            Log in
          </Link>
          <Link
            to="/signup"
            className="text-sm font-semibold bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-white font-bold">
          <Zap size={18} className="text-brand-400" />
          RankrSEO
        </div>
        <div className="flex items-center gap-5 text-sm">
          <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link to="/login" className="hover:text-white transition-colors">Log in</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
        </div>
        <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} RankrSEO. All rights reserved.</p>
      </div>
    </footer>
  );
}

const AI_STEPS = [
  {
    icon: <Bot size={18} />,
    label: 'Track',
    desc: 'Ask ChatGPT and Perplexity your target queries. RankrSEO records whether your business is mentioned.',
  },
  {
    icon: <ShieldAlert size={18} />,
    label: 'Diagnose',
    desc: 'When you\'re missing, we score the most likely causes — no schema, thin content, weak reviews, inactive GBP.',
  },
  {
    icon: <CheckCircle2 size={18} />,
    label: 'Fix',
    desc: 'One-click fixes: generate a citation-optimized FAQ article, install schema markup, request more reviews.',
  },
  {
    icon: <TrendingUp size={18} />,
    label: 'Measure',
    desc: 'Re-run the check after fixes and see your before/after citation rate on a per-query timeline.',
  },
];

const FEATURES = [
  {
    icon: <Bot size={22} className="text-brand-600" />,
    title: 'AI Visibility Tracking',
    desc: 'Know exactly which queries ChatGPT and Perplexity cite your business for — and which they don\'t.',
  },
  {
    icon: <ShieldAlert size={22} className="text-orange-500" />,
    title: 'Instant Diagnosis',
    desc: '"Why you\'re not showing up" — severity-ranked checklist of every gap holding you back from AI citations.',
  },
  {
    icon: <Code2 size={22} className="text-purple-600" />,
    title: 'Schema Markup Generator',
    desc: 'Generate and inject LocalBusiness + FAQ + Service JSON-LD from your business data. One click to WordPress.',
  },
  {
    icon: <FileText size={22} className="text-blue-600" />,
    title: 'Content Studio',
    desc: 'AI-written articles tuned for local search and AI citations. Auto-publish to WordPress on a schedule.',
  },
  {
    icon: <Star size={22} className="text-yellow-500" />,
    title: 'Review Management',
    desc: 'Send SMS review requests after every job. AI drafts your response. Track ratings over time.',
  },
  {
    icon: <MapPin size={22} className="text-green-600" />,
    title: 'GBP Posts & Calendar',
    desc: 'AI-generated Google Business Profile posts, scheduled on a drag-and-drop calendar.',
  },
  {
    icon: <BarChart2 size={22} className="text-brand-600" />,
    title: 'Keyword & Competitor Tracking',
    desc: 'Track your local keyword rankings. See how you stack up against the competition week over week.',
  },
  {
    icon: <TrendingUp size={22} className="text-green-600" />,
    title: 'Trend Timeline',
    desc: 'Before/after citation rate split at your first fix. Watch the dots turn green as your visibility improves.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Connect your business',
    desc: 'Enter your business info, connect Google Business Profile and WordPress if you have them. Takes 5 minutes.',
  },
  {
    step: '2',
    title: 'Run your first AI check',
    desc: 'Add 3–5 queries homeowners ask ("best plumber in Austin") and hit Run. RankrSEO checks ChatGPT and Perplexity in real time.',
  },
  {
    step: '3',
    title: 'Follow the fix checklist',
    desc: 'Missing from results? We show you exactly why and give you one-click actions to fix each gap. Re-run to confirm the improvement.',
  },
];

export function Landing() {
  return (
    <div className="bg-white">
      <Nav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-brand-50/60 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap size={12} />
            AI Visibility Suite — now live
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-5">
            Get found when homeowners<br className="hidden sm:block" /> ask AI for a contractor
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            RankrSEO tracks whether ChatGPT and Perplexity recommend your business, diagnoses why you're missing,
            and gives you one-click fixes — then shows you the before/after.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="flex items-center gap-2 bg-brand-600 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-brand-700 transition-colors text-base"
            >
              Start free trial <ArrowRight size={16} />
            </Link>
            <Link
              to="/pricing"
              className="flex items-center gap-2 border border-gray-200 text-gray-700 font-medium px-6 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-base"
            >
              View pricing
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">14-day free trial · No credit card required</p>
        </div>
      </section>

      {/* AI Visibility loop */}
      <section className="py-20 px-4 bg-gray-900" id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-2">The AI Visibility Loop</p>
            <h2 className="text-3xl font-bold text-white">Track → Diagnose → Fix → Measure</h2>
            <p className="text-gray-400 mt-3 max-w-xl mx-auto">
              The only platform built around the full cycle of getting cited by AI search engines.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AI_STEPS.map((s) => (
              <div key={s.label} className="bg-gray-800 rounded-xl p-5 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center">
                  {s.icon}
                </div>
                <p className="text-white font-semibold">{s.label}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 px-4" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything local contractors need</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              One platform covering AI visibility, content, reviews, GBP, keywords, and competitors.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3">{f.icon}</div>
                <p className="font-semibold text-gray-900 mb-1.5">{f.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Up and running in minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <p className="font-semibold text-gray-900 mb-2">{s.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Simple pricing</h2>
            <p className="text-gray-500 mt-2">No setup fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {[
              {
                name: 'Growth',
                price: '$97',
                desc: 'Solo contractors',
                features: ['AI Visibility Suite', '15 AI articles/month', '50 visibility checks/month', '200 review requests/month', 'WordPress & GBP integration'],
              },
              {
                name: 'Agency',
                price: '$297',
                desc: 'Multi-location & agencies',
                features: ['Everything in Growth', '50 AI articles/month', '200 visibility checks/month', '2,000 review requests/month', '10 locations + white-label'],
                highlight: true,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 ${plan.highlight ? 'bg-brand-600 text-white' : 'bg-gray-50 border border-gray-200'}`}
              >
                <p className={`text-sm font-semibold mb-1 ${plan.highlight ? 'text-brand-200' : 'text-gray-500'}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-brand-200' : 'text-gray-400'}`}>/mo</span>
                </div>
                <p className={`text-sm mb-5 ${plan.highlight ? 'text-brand-200' : 'text-gray-500'}`}>{plan.desc}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? 'text-brand-100' : 'text-gray-700'}`}>
                      <CheckCircle2 size={14} className={plan.highlight ? 'text-brand-200' : 'text-green-500'} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-white text-brand-700 hover:bg-brand-50'
                      : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center mt-6">
            <Link to="/pricing" className="text-sm text-brand-600 hover:underline">
              See full feature comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-20 px-4 bg-brand-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">
            Start showing up where your customers are looking
          </h2>
          <p className="text-brand-200 mb-8 text-lg">
            14-day free trial. No credit card required.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors text-base"
          >
            Get started free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
