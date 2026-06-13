import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { User, Business, Keyword } from '@/types';
import { getRankChange } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Sparkles, TrendingUp, TrendingDown, Minus, Search, Trash2, Pencil, Check, X } from 'lucide-react';

interface Context { user: User; business: Business }

function RankBadge({ current, previous }: { current: number | null; previous: number | null }) {
  const change = getRankChange(current, previous);
  if (current === null) return <Badge variant="gray">Unranked</Badge>;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-bold text-lg ${current <= 3 ? 'text-green-600' : current <= 10 ? 'text-brand-600' : 'text-gray-500'}`}>
        #{current}
      </span>
      {change === 'up'   && <TrendingUp   size={14} className="text-green-500" />}
      {change === 'down' && <TrendingDown size={14} className="text-red-500"   />}
      {change === 'same' && <Minus        size={14} className="text-gray-400"  />}
    </div>
  );
}

function RankEditor({ keyword, onSave }: { keyword: Keyword; onSave: (id: string, rank: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(keyword.current_rank?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setValue(keyword.current_rank?.toString() ?? '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function save() {
    const rank = value.trim() === '' ? null : parseInt(value, 10);
    if (value.trim() !== '' && (isNaN(rank!) || rank! < 1 || rank! > 200)) {
      toast.error('Rank must be 1–200'); return;
    }
    setSaving(true);
    try {
      await api.put(`/keywords/${keyword.id}/rank`, { current_rank: rank });
      onSave(keyword.id, rank);
      setEditing(false);
    } catch {
      toast.error('Failed to update rank');
    } finally {
      setSaving(false);
    }
  }

  function cancel() { setEditing(false); setValue(keyword.current_rank?.toString() ?? ''); }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 group">
        <RankBadge current={keyword.current_rank} previous={keyword.previous_rank} />
        <button onClick={startEdit} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-brand-600">
          <Pencil size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
        placeholder="1–200"
        className="w-16 px-2 py-1 text-sm border border-brand-400 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button onClick={save} disabled={saving} className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50">
        <Check size={14} />
      </button>
      <button onClick={cancel} className="p-1 text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
    </div>
  );
}

export function Keywords() {
  const { business } = useOutletContext<Context>();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get(`/keywords/${business.id}`)
      .then((r) => { setKeywords(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [business.id]);

  function handleRankSave(id: string, rank: number | null) {
    setKeywords((kws) =>
      kws.map((kw) =>
        kw.id === id
          ? { ...kw, previous_rank: kw.current_rank, current_rank: rank }
          : kw
      )
    );
    toast.success('Rank updated');
  }

  async function handleAdd() {
    if (!newKeyword.trim()) return;
    setAdding(true);
    try {
      const { data } = await api.post(`/keywords/${business.id}`, { keyword: newKeyword.trim() });
      setKeywords((k) => [...k, data]);
      setNewKeyword('');
      setShowAdd(false);
      toast.success('Keyword added');
    } catch {
      toast.error('Failed to add keyword');
    } finally {
      setAdding(false);
    }
  }

  async function handleGetSuggestions() {
    setSuggesting(true);
    try {
      const { data } = await api.post('/keywords/suggest', { businessId: business.id });
      setSuggestions(data.suggestions ?? []);
    } catch {
      toast.error('Failed to get suggestions');
    } finally {
      setSuggesting(false);
    }
  }

  async function addSuggestion(kw: string) {
    try {
      const { data } = await api.post(`/keywords/${business.id}`, { keyword: kw });
      setKeywords((k) => [...k, data]);
      setSuggestions((s) => s.filter((x) => x !== kw));
      toast.success(`Added: ${kw}`);
    } catch {
      toast.error('Failed to add keyword');
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/keywords/${id}`);
      setKeywords((k) => k.filter((kw) => kw.id !== id));
      toast.success('Removed');
    } catch {
      toast.error('Failed to remove keyword');
    }
  }

  const top10  = keywords.filter((k) => k.current_rank !== null && k.current_rank <= 10).length;
  const ranked = keywords.filter((k) => k.current_rank !== null);
  const avgRank = ranked.length
    ? Math.round(ranked.reduce((a, k) => a + k.current_rank!, 0) / ranked.length)
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keywords</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your local search rankings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setShowSuggest(true); handleGetSuggestions(); }}>
            <Sparkles size={15} /> AI suggestions
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add keyword
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500 mb-1">Tracked</p><p className="text-3xl font-bold text-gray-900">{keywords.length}</p></Card>
        <Card><p className="text-sm text-gray-500 mb-1">Top 10</p><p className="text-3xl font-bold text-green-600">{top10}</p></Card>
        <Card><p className="text-sm text-gray-500 mb-1">Avg rank</p><p className="text-3xl font-bold text-brand-600">{avgRank ? `#${avgRank}` : '—'}</p></Card>
      </div>

      <Card padding="none">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="grid grid-cols-12 flex-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <div className="col-span-5">Keyword</div>
            <div className="col-span-3">Current rank</div>
            <div className="col-span-2 text-center">Previous</div>
            <div className="col-span-2" />
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : keywords.length === 0 ? (
          <div className="text-center py-12">
            <Search size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium mb-1">No keywords tracked</p>
            <p className="text-sm text-gray-400 mb-4">Add keywords to monitor your local rankings</p>
            <Button onClick={() => setShowAdd(true)}><Plus size={15} /> Add your first keyword</Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {keywords.map((kw) => (
              <div key={kw.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="col-span-5">
                  <p className="text-sm font-medium text-gray-900">{kw.keyword}</p>
                </div>
                <div className="col-span-3">
                  <RankEditor keyword={kw} onSave={handleRankSave} />
                </div>
                <div className="col-span-2 text-center text-sm text-gray-400">
                  {kw.previous_rank ? `#${kw.previous_rank}` : '—'}
                </div>
                <div className="col-span-2 flex justify-end">
                  <button onClick={() => handleDelete(kw.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {keywords.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Hover a keyword row and click the pencil icon to update its rank. Enter 1–200 or leave blank for unranked.
        </p>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Keyword">
        <div className="space-y-4">
          <Input
            label="Keyword"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="e.g. electrician Dallas TX"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} loading={adding} disabled={!newKeyword.trim()}>Add keyword</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSuggest} onClose={() => setShowSuggest(false)} title="AI Keyword Suggestions" size="lg">
        {suggesting ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-gray-500">Analyzing your market...</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {suggestions.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">No suggestions available</p>
            ) : suggestions.map((kw) => {
              const alreadyTracked = keywords.some((k) => k.keyword.toLowerCase() === kw.toLowerCase());
              return (
                <div key={kw} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors">
                  <span className="text-sm text-gray-800">{kw}</span>
                  {alreadyTracked
                    ? <Badge variant="gray">Tracked</Badge>
                    : <Button size="sm" variant="secondary" onClick={() => addSuggestion(kw)}><Plus size={13} /> Add</Button>
                  }
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
