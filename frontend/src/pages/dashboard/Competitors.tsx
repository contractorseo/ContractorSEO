import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { User, Business, Competitor } from '@/types';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Users, Star, Trash2, AlertTriangle } from 'lucide-react';

interface Context { user: User; business: Business }

const THREAT_VARIANTS: Record<string, 'danger' | 'warning' | 'success'> = {
  high: 'danger', medium: 'warning', low: 'success',
};

export function Competitors() {
  const { business } = useOutletContext<Context>();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', monthly_posts: 0, review_count: 0, rating: 4.5, threat_level: 'medium' as Competitor['threat_level'],
  });

  useEffect(() => {
    api.get(`/competitors/${business.id}`).then((r) => { setCompetitors(r.data); setLoading(false); });
  }, [business.id]);

  async function handleAdd() {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/competitors', { ...form, business_id: business.id });
      setCompetitors((c) => [...c, data]);
      setShowAdd(false);
      setForm({ name: '', monthly_posts: 0, review_count: 0, rating: 4.5, threat_level: 'medium' });
      toast.success('Competitor added');
    } catch {
      toast.error('Failed to add competitor');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/competitors/${id}`);
    setCompetitors((c) => c.filter((comp) => comp.id !== id));
  }

  const highThreat = competitors.filter((c) => c.threat_level === 'high').length;
  const avgCompRating = competitors.length
    ? (competitors.reduce((a, c) => a + c.rating, 0) / competitors.length).toFixed(1)
    : '—';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitors</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monitor who you're competing against in local search</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={15} /> Add competitor</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500 mb-1">Tracking</p><p className="text-3xl font-bold text-gray-900">{competitors.length}</p></Card>
        <Card><p className="text-sm text-gray-500 mb-1">High threat</p><p className="text-3xl font-bold text-red-600">{highThreat}</p></Card>
        <Card><p className="text-sm text-gray-500 mb-1">Avg comp rating</p><p className="text-3xl font-bold text-amber-600">{avgCompRating}</p></Card>
      </div>

      {highThreat > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            <strong>{highThreat} high-threat competitor{highThreat > 1 ? 's' : ''}</strong> detected. Post more frequently to compete.
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          [1,2,3].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)
        ) : competitors.length === 0 ? (
          <Card className="text-center py-12">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No competitors tracked</p>
            <p className="text-sm text-gray-400 mb-4">Add competitors to see how you stack up</p>
            <Button onClick={() => setShowAdd(true)}><Plus size={15} /> Add competitor</Button>
          </Card>
        ) : (
          competitors.map((comp) => (
            <Card key={comp.id} padding="sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                    <Badge variant={THREAT_VARIANTS[comp.threat_level]}>
                      {comp.threat_level} threat
                    </Badge>
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
                <button onClick={() => handleDelete(comp.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors ml-3">
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Competitor">
        <div className="space-y-4">
          <Input label="Business name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. ABC Electric LLC" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monthly posts" type="number" value={form.monthly_posts} onChange={(e) => setForm((f) => ({ ...f, monthly_posts: parseInt(e.target.value) || 0 }))} />
            <Input label="Review count" type="number" value={form.review_count} onChange={(e) => setForm((f) => ({ ...f, review_count: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Rating (0–5)" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: parseFloat(e.target.value) || 0 }))} />
            <Select
              label="Threat level"
              value={form.threat_level}
              onChange={(e) => setForm((f) => ({ ...f, threat_level: e.target.value as Competitor['threat_level'] }))}
              options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} loading={saving}>Add competitor</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
