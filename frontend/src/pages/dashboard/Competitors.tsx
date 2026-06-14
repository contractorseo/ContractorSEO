import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { User, Business, Competitor } from '@/types';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Users, Star, Trash2, AlertTriangle, Sparkles, Pencil, TrendingUp, Shield, Zap, Search, Check } from 'lucide-react';

interface Context { user: User; business: Business }

interface Insight {
  headline: string;
  detail: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

const THREAT_VARIANTS: Record<string, 'danger' | 'warning' | 'success'> = {
  high: 'danger', medium: 'warning', low: 'success',
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   'border-l-red-500 bg-red-50',
  medium: 'border-l-amber-500 bg-amber-50',
  low:    'border-l-green-500 bg-green-50',
};

const PRIORITY_ICONS: Record<string, typeof Zap> = {
  high: Zap, medium: TrendingUp, low: Shield,
};

const EMPTY_FORM = {
  name: '', monthly_posts: 0, review_count: 0, rating: 4.5,
  threat_level: 'medium' as Competitor['threat_level'],
};

interface DiscoverResult {
  name: string;
  rating: number;
  review_count: number;
  vicinity: string;
  place_id: string;
  threat_level: Competitor['threat_level'];
}

export function Competitors() {
  const { business } = useOutletContext<Context>();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Competitor | null>(null);
  const [saving, setSaving] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showDiscover, setShowDiscover] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoverResult[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get(`/competitors/${business.id}`)
      .then((r) => { setCompetitors(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [business.id]);

  function openAdd() { setForm(EMPTY_FORM); setEditTarget(null); setShowAdd(true); }
  function openEdit(comp: Competitor) {
    setForm({
      name: comp.name,
      monthly_posts: comp.monthly_posts,
      review_count: comp.review_count,
      rating: comp.rating,
      threat_level: comp.threat_level,
    });
    setEditTarget(comp);
    setShowAdd(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        const { data } = await api.put(`/competitors/${editTarget.id}`, form);
        setCompetitors((c) => c.map((x) => x.id === editTarget.id ? data : x));
        toast.success('Competitor updated');
      } else {
        const { data } = await api.post('/competitors', { ...form, business_id: business.id });
        setCompetitors((c) => [...c, data]);
        toast.success('Competitor added');
      }
      setShowAdd(false);
    } catch {
      toast.error(editTarget ? 'Failed to update' : 'Failed to add competitor');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/competitors/${id}`);
      setCompetitors((c) => c.filter((comp) => comp.id !== id));
      setInsights([]);
    } catch {
      toast.error('Failed to delete');
    }
  }

  async function handleDiscover() {
    setDiscovering(true);
    setShowDiscover(true);
    setDiscovered([]);
    setAddedIds(new Set());
    try {
      const { data } = await api.get(`/competitors/discover/${business.id}`);
      setDiscovered(Array.isArray(data) ? data : []);
      if (!data.length) toast('No competitors found nearby', { icon: '🔍' });
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Discovery failed');
      setShowDiscover(false);
    } finally {
      setDiscovering(false);
    }
  }

  async function handleAddDiscovered(place: DiscoverResult) {
    setAdding(place.place_id);
    try {
      const { data } = await api.post('/competitors', {
        business_id: business.id,
        name: place.name,
        rating: place.rating,
        review_count: place.review_count,
        monthly_posts: 0,
        threat_level: place.threat_level,
      });
      setCompetitors((c) => [...c, data]);
      setAddedIds((s) => new Set(s).add(place.place_id));
      toast.success(`${place.name} added`);
    } catch {
      toast.error('Failed to add');
    } finally {
      setAdding(null);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const { data } = await api.post(`/competitors/analyze/${business.id}`);
      setInsights(Array.isArray(data.insights) ? data.insights : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  const highThreat = competitors.filter((c) => c.threat_level === 'high').length;
  const avgCompRating = competitors.length
    ? (competitors.reduce((a, c) => a + Number(c.rating), 0) / competitors.length).toFixed(1)
    : '—';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitors</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monitor who you're competing against in local search</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {competitors.length > 0 && (
            <Button variant="secondary" onClick={handleAnalyze} loading={analyzing}>
              <Sparkles size={15} /> AI analysis
            </Button>
          )}
          <Button variant="secondary" onClick={handleDiscover} loading={discovering}>
            <Search size={15} /> Discover
          </Button>
          <Button onClick={openAdd}><Plus size={15} /> Add competitor</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500 mb-1">Tracking</p><p className="text-3xl font-bold text-gray-900">{competitors.length}</p></Card>
        <Card><p className="text-sm text-gray-500 mb-1">High threat</p><p className="text-3xl font-bold text-red-600">{highThreat}</p></Card>
        <Card><p className="text-sm text-gray-500 mb-1">Avg rating</p><p className="text-3xl font-bold text-amber-600">{avgCompRating}</p></Card>
      </div>

      {highThreat > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            <strong>{highThreat} high-threat competitor{highThreat > 1 ? 's' : ''}</strong> detected. Post more frequently to compete.
          </p>
        </div>
      )}

      {insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles size={15} className="text-brand-600" /> AI Competitive Insights
          </h2>
          {insights.map((insight, i) => {
            const Icon = PRIORITY_ICONS[insight.priority];
            return (
              <div key={i} className={`border-l-4 rounded-r-xl p-4 ${PRIORITY_COLORS[insight.priority]}`}>
                <div className="flex items-start gap-3">
                  <Icon size={16} className="mt-0.5 shrink-0 text-gray-600" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{insight.headline}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{insight.detail}</p>
                    <p className="text-sm font-medium text-gray-800 mt-2">→ {insight.action}</p>
                  </div>
                  <Badge variant={insight.priority === 'high' ? 'danger' : insight.priority === 'medium' ? 'warning' : 'success'} className="ml-auto shrink-0">
                    {insight.priority}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          [1,2,3].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)
        ) : competitors.length === 0 ? (
          <Card className="text-center py-12">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No competitors tracked</p>
            <p className="text-sm text-gray-400 mb-4">Add competitors to see how you stack up and get AI strategy</p>
            <Button onClick={openAdd}><Plus size={15} /> Add competitor</Button>
          </Card>
        ) : (
          competitors.map((comp) => (
            <Card key={comp.id} padding="sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                    <Badge variant={THREAT_VARIANTS[comp.threat_level]}>{comp.threat_level} threat</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Monthly posts</p>
                      <p className="text-lg font-bold text-gray-800">{comp.monthly_posts}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reviews</p>
                      <p className="text-lg font-bold text-gray-800">{comp.review_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Rating</p>
                      <div className="flex items-center gap-1">
                        <p className="text-lg font-bold text-amber-600">{comp.rating}</p>
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                      </div>
                    </div>
                  </div>
                  {comp.last_post_date && (
                    <p className="text-xs text-gray-400 mt-2">Last post: {formatDate(comp.last_post_date)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button onClick={() => openEdit(comp)} className="p-1.5 text-gray-300 hover:text-brand-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(comp.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={showDiscover} onClose={() => setShowDiscover(false)} title="Discover Nearby Competitors" size="lg">
        {discovering ? (
          <div className="py-12 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Searching Google Places for {business.category}s in {business.city}…
          </div>
        ) : discovered.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No competitors found.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">
              Found {discovered.length} {business.category}s near {business.city}. Add the ones you want to track.
            </p>
            {discovered.map((place) => {
              const alreadyTracked = competitors.some(
                (c) => c.name.toLowerCase() === place.name.toLowerCase()
              );
              const justAdded = addedIds.has(place.place_id);
              const done = alreadyTracked || justAdded;
              return (
                <div key={place.place_id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{place.name}</p>
                      <Badge variant={THREAT_VARIANTS[place.threat_level]}>{place.threat_level}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500 flex items-center gap-0.5">
                        <Star size={11} className="text-amber-400 fill-amber-400" /> {place.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-500">{place.review_count.toLocaleString()} reviews</span>
                      {place.vicinity && <span className="text-xs text-gray-400 truncate">{place.vicinity}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={done ? 'secondary' : 'primary'}
                    disabled={done}
                    loading={adding === place.place_id}
                    onClick={() => handleAddDiscovered(place)}
                    className="ml-3 shrink-0"
                  >
                    {done ? <><Check size={13} /> Added</> : <><Plus size={13} /> Add</>}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editTarget ? 'Edit Competitor' : 'Add Competitor'}>
        <div className="space-y-4">
          <Input
            label="Business name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. ABC Electric LLC"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monthly posts"
              type="number"
              value={form.monthly_posts}
              onChange={(e) => setForm((f) => ({ ...f, monthly_posts: parseInt(e.target.value) || 0 }))}
            />
            <Input
              label="Review count"
              type="number"
              value={form.review_count}
              onChange={(e) => setForm((f) => ({ ...f, review_count: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rating (0–5)"
              type="number"
              min="0" max="5" step="0.1"
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Threat level"
              value={form.threat_level}
              onChange={(e) => setForm((f) => ({ ...f, threat_level: e.target.value as Competitor['threat_level'] }))}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editTarget ? 'Save changes' : 'Add competitor'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
