import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Bot, Plus, Trash2, PlayCircle, CheckCircle2, XCircle,
  AlertCircle, Loader2, Info, ChevronDown, ChevronUp,
  ShieldAlert, TriangleAlert, TrendingUp, TrendingDown,
  FileText, MapPin, Code2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { User, Business, AIVisibilityPrompt, AIVisibilityCheck } from '@/types';

interface EngineStatus { openai: boolean; perplexity: boolean }
interface Usage { used: number; limit: number; plan: string }

interface DiagnosisItem {
  factor: string;
  severity: 'high' | 'medium';
  title: string;
  detail: string;
  actionKey: string;
  actionLabel: string;
}

interface Milestone {
  date: string;
  label: string;
  type: 'schema' | 'content' | 'gbp_post';
}

interface PromptTimeline {
  template: string;
  resolved: string;
  checks: Array<{ engine: string; mentioned: boolean; checked_at: string }>;
}

interface TimelineData {
  prompts: PromptTimeline[];
  milestones: Milestone[];
  summary: {
    totalChecks: number;
    mentionedTotal: number;
    mentionedBeforeActions: number | null;
    mentionedAfterActions: number | null;
    firstActionDate: string | null;
  };
}

// Per-prompt per-engine history, most recent first
interface PromptGroup {
  prompt_template: string;
  engines: Record<string, AIVisibilityCheck[]>;
}

function buildGroups(
  prompts: AIVisibilityPrompt[],
  checks: AIVisibilityCheck[],
  city: string,
): PromptGroup[] {
  return prompts.map((p) => {
    const resolved = p.prompt_template.replace(/\{city\}/gi, city);
    const matching = checks.filter((c) => c.prompt === resolved);
    const engines: Record<string, AIVisibilityCheck[]> = {};
    for (const c of matching) {
      if (!engines[c.engine]) engines[c.engine] = [];
      engines[c.engine].push(c);
    }
    // keep most-recent first (already sorted by checked_at desc from API)
    return { prompt_template: p.prompt_template, engines };
  });
}

function TrendDots({ checks }: { checks: AIVisibilityCheck[] }) {
  const recent = checks.slice(0, 8).reverse();
  if (recent.length === 0) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex items-center gap-1">
      {recent.map((c, i) => (
        <span
          key={i}
          title={new Date(c.checked_at).toLocaleDateString()}
          className={`w-2.5 h-2.5 rounded-full inline-block ${c.mentioned ? 'bg-green-500' : 'bg-red-400'}`}
        />
      ))}
    </div>
  );
}

function EngineCell({ checks }: { checks: AIVisibilityCheck[] | undefined }) {
  const [expanded, setExpanded] = useState(false);
  if (!checks || checks.length === 0) {
    return <span className="text-xs text-gray-400">No data</span>;
  }
  const latest = checks[0];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {latest.mentioned ? (
          <CheckCircle2 size={15} className="text-green-500 shrink-0" />
        ) : (
          <XCircle size={15} className="text-red-400 shrink-0" />
        )}
        <span className={`text-xs font-medium ${latest.mentioned ? 'text-green-700' : 'text-red-600'}`}>
          {latest.mentioned ? 'Mentioned' : 'Not found'}
        </span>
      </div>
      <TrendDots checks={checks} />
      <p className="text-xs text-gray-400">{new Date(latest.checked_at).toLocaleDateString()}</p>
      {latest.snippet && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-brand-600 hover:underline"
        >
          {expanded ? 'Hide snippet' : 'View snippet'}
        </button>
      )}
      {expanded && latest.snippet && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 italic max-w-xs">
          "{latest.snippet}"
        </p>
      )}
    </div>
  );
}

const SUGGESTED = [
  'best {city} contractor',
  'top rated electrician in {city}',
  'who should I hire for roof repair in {city}',
  'best plumber near {city}',
  'recommended HVAC company in {city}',
];

export function AIVisibility() {
  const { user, business } = useOutletContext<{ user: User; business: Business }>();
  const navigate = useNavigate();

  const [engines, setEngines] = useState<EngineStatus>({ openai: false, perplexity: false });
  const [prompts, setPrompts] = useState<AIVisibilityPrompt[]>([]);
  const [checks, setChecks] = useState<AIVisibilityCheck[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [newPrompt, setNewPrompt] = useState('');
  const [adding, setAdding] = useState(false);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const [diagnosis, setDiagnosis] = useState<DiagnosisItem[]>([]);
  const [diagnosisExpanded, setDiagnosisExpanded] = useState(true);
  const [generatingFaq, setGeneratingFaq] = useState(false);

  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [timelineExpanded, setTimelineExpanded] = useState(true);

  const isTrial = user.plan === 'trial';
  const engineCount = (engines.openai ? 1 : 0) + (engines.perplexity ? 1 : 0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests: Promise<any>[] = [
        api.get('/api/ai-visibility/engines'),
        api.get(`/api/ai-visibility/${business.id}/prompts`),
        api.get(`/api/ai-visibility/${business.id}/results`),
        api.get(`/api/ai-visibility/${business.id}/usage`),
      ];
      if (user.plan !== 'trial') {
        requests.push(api.get(`/api/ai-visibility/${business.id}/diagnose`));
        requests.push(api.get(`/api/ai-visibility/${business.id}/timeline`));
      }
      const [engRes, promptRes, checkRes, usageRes, diagRes, timelineRes] = await Promise.all(requests);
      setEngines(engRes.data);
      setPrompts(promptRes.data);
      setChecks(checkRes.data);
      setUsage(usageRes.data);
      if (diagRes) setDiagnosis(diagRes.data.items ?? []);
      if (timelineRes) setTimeline(timelineRes.data);
    } catch (err: any) {
      console.error('[AIVisibility] load failed — status:', err?.response?.status, 'url:', err?.config?.url, 'msg:', err?.message, err);
      toast.error('Failed to load AI Visibility data');
    } finally {
      setLoading(false);
    }
  }, [business.id, user.plan]);

  useEffect(() => { load(); }, [load]);

  async function handleAddPrompt(template: string) {
    const trimmed = template.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const { data } = await api.post(`/api/ai-visibility/${business.id}/prompts`, {
        prompt_template: trimmed,
      });
      setPrompts((prev) => [...prev, data]);
      setNewPrompt('');
      toast.success('Prompt added');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to add prompt');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeletePrompt(id: string) {
    try {
      await api.delete(`/api/ai-visibility/prompts/${id}`);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Prompt removed');
    } catch {
      toast.error('Failed to remove prompt');
    }
  }

  async function handleRun() {
    if (prompts.length === 0) {
      toast.error('Add at least one prompt first');
      return;
    }
    setRunning(true);
    try {
      const { data } = await api.post(`/api/ai-visibility/${business.id}/run`, {});
      toast.success(`${data.count} check${data.count !== 1 ? 's' : ''} completed`);
      const [checkRes, usageRes, diagRes, timelineRes] = await Promise.all([
        api.get(`/api/ai-visibility/${business.id}/results`),
        api.get(`/api/ai-visibility/${business.id}/usage`),
        api.get(`/api/ai-visibility/${business.id}/diagnose`),
        api.get(`/api/ai-visibility/${business.id}/timeline`),
      ]);
      setChecks(checkRes.data);
      setUsage(usageRes.data);
      setDiagnosis(diagRes.data.items ?? []);
      setTimeline(timelineRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Check failed');
    } finally {
      setRunning(false);
    }
  }

  async function handleDiagnosisAction(item: DiagnosisItem) {
    switch (item.actionKey) {
      case 'install_schema':
      case 'connect_gbp':
        navigate('/dashboard/settings');
        break;
      case 'citations':
        navigate('/dashboard/citations');
        break;
      case 'schedule_post':
        navigate('/dashboard/posts');
        break;
      case 'request_reviews':
        navigate('/dashboard/reviews');
        break;
      case 'generate_content': {
        const failingQueries = [...new Set(checks.filter((c) => !c.mentioned).map((c) => c.prompt))].slice(0, 5);
        if (failingQueries.length === 0) {
          toast.error('Run a check first to identify failing queries');
          return;
        }
        setGeneratingFaq(true);
        try {
          await api.post('/api/articles/generate-faq', {
            businessId: business.id,
            queries: failingQueries,
          });
          toast.success('FAQ draft created — opening Content Studio');
          navigate('/dashboard/content-studio');
        } catch (err: any) {
          toast.error(err.response?.data?.error ?? 'Failed to generate content');
        } finally {
          setGeneratingFaq(false);
        }
        break;
      }
    }
  }

  const groups = buildGroups(prompts, checks, business.city);
  const activeEngines = Object.entries(engines)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const hasFailingChecks = checks.some((c) => !c.mentioned);

  if (loading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[50vh]">
        <Loader2 size={24} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot size={22} className="text-brand-600" />
            AI Visibility
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track whether AI engines recommend {business.name} for local queries.
          </p>
        </div>
        {!isTrial && (
          <button
            onClick={handleRun}
            disabled={running || prompts.length === 0 || engineCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <><Loader2 size={15} className="animate-spin" /> Checking…</>
            ) : (
              <><PlayCircle size={15} /> Run check</>
            )}
          </button>
        )}
      </div>

      {/* Trial gate */}
      {isTrial && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Growth plan required</p>
            <p className="text-sm text-amber-700 mt-0.5">
              AI Visibility tracking is available on Growth and Agency plans.
            </p>
          </div>
        </div>
      )}

      {/* Engine status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Engine status</h2>
        <div className="flex flex-wrap gap-3">
          {(['openai', 'perplexity'] as const).map((engine) => (
            <div
              key={engine}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                engines[engine]
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${engines[engine] ? 'bg-green-500' : 'bg-gray-400'}`} />
              {engine === 'openai' ? 'ChatGPT / OpenAI' : 'Perplexity'}
              <span className="font-normal opacity-70">{engines[engine] ? 'Active' : 'Not configured'}</span>
            </div>
          ))}
        </div>
        {engineCount === 0 && (
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Info size={13} />
            Add <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code> or{' '}
            <code className="bg-gray-100 px-1 rounded">PERPLEXITY_API_KEY</code> to the backend environment to enable checks.
          </p>
        )}
        {usage && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {usage.used} / {usage.limit} checks this month
            </span>
          </div>
        )}
      </div>

      {/* Diagnosis card */}
      {!isTrial && hasFailingChecks && diagnosis.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
          <button
            onClick={() => setDiagnosisExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-orange-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={17} className="text-orange-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Why you're not showing up</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {diagnosis.filter((i) => i.severity === 'high').length} high-priority issue{diagnosis.filter((i) => i.severity === 'high').length !== 1 ? 's' : ''},{' '}
                  {diagnosis.filter((i) => i.severity === 'medium').length} medium
                </p>
              </div>
            </div>
            {diagnosisExpanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </button>

          {diagnosisExpanded && (
            <div className="divide-y divide-gray-100 border-t border-orange-100">
              {diagnosis.map((item) => (
                <div
                  key={item.factor}
                  className={`px-5 py-4 flex gap-4 items-start ${item.severity === 'high' ? 'bg-red-50' : 'bg-amber-50'}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.severity === 'high' ? (
                      <XCircle size={16} className="text-red-500" />
                    ) : (
                      <TriangleAlert size={16} className="text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold uppercase tracking-wide ${item.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`}>
                        {item.severity}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.detail}</p>
                    <button
                      onClick={() => handleDiagnosisAction(item)}
                      disabled={item.actionKey === 'generate_content' && generatingFaq}
                      className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        item.severity === 'high'
                          ? 'bg-red-100 hover:bg-red-200 text-red-700'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                      }`}
                    >
                      {item.actionKey === 'generate_content' && generatingFaq ? (
                        <><Loader2 size={11} className="animate-spin" /> Generating…</>
                      ) : (
                        item.actionLabel
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prompts */}
      {!isTrial && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Tracking prompts
              <span className="ml-2 text-xs font-normal text-gray-400">
                Use <code className="bg-gray-100 px-1 rounded">{'{city}'}</code> for {business.city}
              </span>
            </h2>
          </div>

          {/* Add form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleAddPrompt(newPrompt); }}
            className="flex gap-2"
          >
            <input
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder={`e.g. best ${business.category.toLowerCase()} in {city}`}
              maxLength={300}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={adding || !newPrompt.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
          </form>

          {/* Suggestions */}
          {prompts.length === 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-400">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleAddPrompt(s)}
                    className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt list */}
          {prompts.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {prompts.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                  <span className="text-sm text-gray-700 break-all">
                    {p.prompt_template.replace(/\{city\}/gi, business.city)}
                  </span>
                  <button
                    onClick={() => handleDeletePrompt(p.id)}
                    className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Delete prompt"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Results table */}
      {!isTrial && checks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Results</h2>
            <p className="text-xs text-gray-400 mt-0.5">Dots = last 8 checks, oldest → newest</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 w-1/2">Prompt</th>
                  {activeEngines.map((e) => (
                    <th key={e} className="text-left px-4 py-3 text-xs font-medium text-gray-500 capitalize">
                      {e === 'openai' ? 'ChatGPT' : 'Perplexity'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {groups.filter((g) => Object.keys(g.engines).length > 0).map((g, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-gray-700 text-xs leading-relaxed">
                      {g.prompt_template.replace(/\{city\}/gi, business.city)}
                    </td>
                    {activeEngines.map((e) => (
                      <td key={e} className="px-4 py-4">
                        <EngineCell checks={g.engines[e]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trend & Timeline */}
      {!isTrial && timeline && timeline.summary.totalChecks > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setTimelineExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp size={17} className="text-brand-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Trend &amp; Timeline</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {timeline.summary.mentionedTotal} of {timeline.summary.totalChecks} checks cited across all engines
                </p>
              </div>
            </div>
            {timelineExpanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </button>

          {timelineExpanded && (
            <div className="border-t border-gray-100 divide-y divide-gray-100">

              {/* Before / after hero stat */}
              {timeline.summary.firstActionDate &&
                timeline.summary.mentionedBeforeActions !== null &&
                timeline.summary.mentionedAfterActions !== null && (
                <div className="px-5 py-5">
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-gray-300">{timeline.summary.mentionedBeforeActions}%</p>
                      <p className="text-xs text-gray-400 mt-1">cited before fixes</p>
                    </div>
                    <div className="text-gray-300 text-xl font-light">→</div>
                    <div className="text-center">
                      <p className={`text-4xl font-bold ${timeline.summary.mentionedAfterActions > (timeline.summary.mentionedBeforeActions ?? 0) ? 'text-green-600' : 'text-gray-600'}`}>
                        {timeline.summary.mentionedAfterActions}%
                      </p>
                      <p className="text-xs text-gray-400 mt-1">cited after fixes</p>
                    </div>
                    {timeline.summary.mentionedAfterActions > (timeline.summary.mentionedBeforeActions ?? 0) ? (
                      <div className="ml-auto flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full text-sm font-semibold">
                        <TrendingUp size={14} />
                        +{timeline.summary.mentionedAfterActions - (timeline.summary.mentionedBeforeActions ?? 0)}pp
                      </div>
                    ) : (
                      <p className="ml-auto text-xs text-gray-400">Keep applying fixes — improvement takes a few check cycles</p>
                    )}
                  </div>
                </div>
              )}

              {/* Milestone list */}
              {timeline.milestones.length > 0 && (
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">What changed</p>
                  <div className="space-y-2.5">
                    {timeline.milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          m.type === 'schema' ? 'bg-purple-100 text-purple-600'
                          : m.type === 'content' ? 'bg-blue-100 text-blue-600'
                          : 'bg-green-100 text-green-600'
                        }`}>
                          {m.type === 'schema' ? <Code2 size={11} /> : m.type === 'content' ? <FileText size={11} /> : <MapPin size={11} />}
                        </div>
                        <div>
                          <p className="text-xs text-gray-700 leading-snug">{m.label}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-prompt dot timelines */}
              {timeline.prompts.length > 0 && (
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Per-query history</p>
                  <div className="space-y-5">
                    {timeline.prompts.map((p, i) => {
                      // Deduplicate by checked_at: green wins if any engine mentioned
                      const runMap = new Map<string, boolean>();
                      for (const c of p.checks) {
                        if (!runMap.has(c.checked_at)) runMap.set(c.checked_at, c.mentioned);
                        else if (c.mentioned) runMap.set(c.checked_at, true);
                      }
                      const runs = [...runMap.entries()].map(([date, mentioned]) => ({ date, mentioned }));
                      const splitIdx = timeline.summary.firstActionDate
                        ? runs.findIndex((r) => r.date >= timeline.summary.firstActionDate!)
                        : -1;
                      const beforeRuns = splitIdx > 0 ? runs.slice(0, splitIdx) : (splitIdx === 0 ? [] : runs);
                      const afterRuns = splitIdx >= 0 ? runs.slice(splitIdx) : [];
                      const showSplit = splitIdx > 0 && afterRuns.length > 0;

                      return (
                        <div key={i}>
                          <p className="text-xs text-gray-600 font-medium mb-1.5">{p.resolved}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {showSplit ? (
                              <>
                                <div className="flex items-center gap-0.5">
                                  {beforeRuns.map((r, j) => (
                                    <span
                                      key={j}
                                      title={`${new Date(r.date).toLocaleDateString()} — ${r.mentioned ? 'cited' : 'not cited'} (before fixes)`}
                                      className={`w-3 h-3 rounded-full inline-block opacity-40 ${r.mentioned ? 'bg-green-500' : 'bg-red-400'}`}
                                    />
                                  ))}
                                  <span className="text-xs text-gray-400 ml-1">
                                    {beforeRuns.filter((r) => r.mentioned).length}/{beforeRuns.length}
                                  </span>
                                </div>
                                <span className="text-brand-400 text-sm font-light">→</span>
                                <div className="flex items-center gap-0.5">
                                  {afterRuns.map((r, j) => (
                                    <span
                                      key={j}
                                      title={`${new Date(r.date).toLocaleDateString()} — ${r.mentioned ? 'cited' : 'not cited'} (after fixes)`}
                                      className={`w-3 h-3 rounded-full inline-block ${r.mentioned ? 'bg-green-500' : 'bg-red-400'}`}
                                    />
                                  ))}
                                  <span className={`text-xs ml-1 font-medium ${afterRuns.filter((r) => r.mentioned).length > beforeRuns.filter((r) => r.mentioned).length / Math.max(beforeRuns.length, 1) * afterRuns.length ? 'text-green-600' : 'text-gray-500'}`}>
                                    {afterRuns.filter((r) => r.mentioned).length}/{afterRuns.length}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center gap-0.5 flex-wrap">
                                {runs.map((r, j) => (
                                  <span
                                    key={j}
                                    title={`${new Date(r.date).toLocaleDateString()} — ${r.mentioned ? 'cited' : 'not cited'}`}
                                    className={`w-3 h-3 rounded-full inline-block ${r.mentioned ? 'bg-green-500' : 'bg-red-400'}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 mt-5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> cited</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> not cited</span>
                    {timeline.summary.firstActionDate && (
                      <span className="flex items-center gap-1">
                        <span className="text-brand-400">→</span> first fix applied ({new Date(timeline.summary.firstActionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isTrial && checks.length === 0 && prompts.length > 0 && engineCount > 0 && (
        <div className="text-center py-14 text-gray-400">
          <Bot size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No checks yet. Hit <strong>Run check</strong> to start tracking.</p>
        </div>
      )}
    </div>
  );
}
