import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { User, Business, Article, ArticleTopic, ArticleUsage, CmsConnection } from '@/types';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Sparkles, FileText, Trash2, ArrowLeft, Eye, Pencil,
  Plus, ChevronRight, Lightbulb, BookOpen, Copy, Download,
  Globe, ExternalLink, Calendar, ChevronLeft, Clock, Zap,
} from 'lucide-react';

interface Context { user: User; business: Business }

type View = 'list' | 'topics' | 'editor' | 'calendar';

const TOPIC_TYPE_LABELS: Record<string, string> = {
  cost_guide: 'Cost Guide', how_to: 'How-To', local_guide: 'Local Guide', faq: 'FAQ',
};
const TOPIC_TYPE_VARIANTS: Record<string, 'success' | 'info' | 'warning' | 'gray'> = {
  cost_guide: 'success', how_to: 'info', local_guide: 'warning', faq: 'gray',
};
const STATUS_VARIANTS: Record<string, 'success' | 'info' | 'gray' | 'warning'> = {
  published: 'success', scheduled: 'warning', draft: 'gray',
};

const CADENCE_LABELS = { weekly: '1 per week', biweekly: '2 per week', monthly: '1 per month' };
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function wordCount(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

function downloadHtml(title: string, html: string) {
  const blob = new Blob([`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title></head><body>${html}</body></html>`], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCalendarGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const grid: (Date | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= last.getDate(); d++) grid.push(new Date(year, month, d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function articleCalendarDate(a: Article): string | null {
  if (a.status === 'scheduled' && a.scheduled_for) return a.scheduled_for.slice(0, 10);
  if (a.status === 'published' && a.published_at) return a.published_at.slice(0, 10);
  return null;
}

export function ContentStudio() {
  const { user, business } = useOutletContext<Context>();

  const [view, setView] = useState<View>('list');
  const [articles, setArticles] = useState<Article[]>([]);
  const [usage, setUsage] = useState<ArticleUsage | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [cmsConnection, setCmsConnection] = useState<CmsConnection | null>(null);
  const processDueFired = useRef(false);

  // Topics
  const [topics, setTopics] = useState<ArticleTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Editor
  const [editingArticle, setEditingArticle] = useState<Partial<Article> & { _topic?: string }>({});
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  // Publish modal
  const [publishModal, setPublishModal] = useState(false);
  const [wpStatus, setWpStatus] = useState<'publish' | 'draft'>('publish');
  const [publishing, setPublishing] = useState(false);

  // Schedule modal (from editor)
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduling, setScheduling] = useState(false);

  // Calendar
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [calScheduleModal, setCalScheduleModal] = useState<{ date: string } | null>(null);
  const [calScheduleArticleId, setCalScheduleArticleId] = useState('');

  // Auto-generate (Agency)
  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly'>(
    (business.auto_schedule_cadence as any) ?? 'weekly'
  );
  const [autoGenLoading, setAutoGenLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/articles/${business.id}`),
      api.get('/articles/usage'),
      api.get(`/cms/${business.id}`),
    ]).then(([articlesRes, usageRes, cmsRes]) => {
      setArticles(Array.isArray(articlesRes.data) ? articlesRes.data : []);
      setUsage(usageRes.data);
      const conns = Array.isArray(cmsRes.data) ? cmsRes.data : [];
      setCmsConnection(conns.find((c: CmsConnection) => c.status === 'active') ?? null);
    }).catch(() => toast.error('Failed to load articles'))
      .finally(() => setLoadingList(false));

    // Fire-and-forget: publish any due scheduled articles
    if (!processDueFired.current) {
      processDueFired.current = true;
      api.post('/articles/process-due').then(({ data }) => {
        if (data.published > 0) {
          toast.success(`${data.published} scheduled article${data.published > 1 ? 's' : ''} auto-published`);
          // Refresh list
          api.get(`/articles/${business.id}`).then(r => setArticles(Array.isArray(r.data) ? r.data : [])).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [business.id]);

  // ── Topics ────────────────────────────────────────────────────────────────
  async function handleGetTopics() {
    setLoadingTopics(true); setTopics([]); setView('topics');
    try {
      const { data } = await api.post('/articles/topics', { businessId: business.id });
      setTopics(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to generate topics'); setView('list');
    } finally { setLoadingTopics(false); }
  }

  // ── Generate article ──────────────────────────────────────────────────────
  async function handleSelectTopic(topic: string) {
    setEditingArticle({ _topic: topic }); setEditorTab('edit');
    setPublishedUrl(null); setView('editor'); setGenerating(true);
    try {
      const { data } = await api.post('/articles/generate', { businessId: business.id, topic });
      setEditingArticle({ _topic: topic, title: data.title, slug: data.slug, meta_description: data.meta_description, body_html: data.body_html, faq_json: data.faq_json, schema_jsonld: data.schema_jsonld, status: 'draft' });
    } catch { toast.error('Article generation failed'); }
    finally { setGenerating(false); }
  }

  function handleEditArticle(article: Article) {
    setEditingArticle(article); setEditorTab('edit');
    setPublishedUrl(article.published_url ?? null); setView('editor');
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(status: 'draft' | 'published' = 'draft'): Promise<Article | null> {
    if (!editingArticle.title?.trim() || !editingArticle.body_html?.trim()) {
      toast.error('Title and body are required'); return null;
    }
    setSaving(true);
    try {
      const payload = {
        business_id: business.id,
        title: editingArticle.title,
        slug: editingArticle.slug ?? editingArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100),
        meta_description: editingArticle.meta_description ?? null,
        body_html: editingArticle.body_html,
        faq_json: editingArticle.faq_json ?? null,
        schema_jsonld: editingArticle.schema_jsonld ?? null,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
      };
      if (editingArticle.id) {
        const { data } = await api.put(`/articles/${editingArticle.id}`, payload);
        setArticles(prev => prev.map(a => a.id === data.id ? data : a));
        setEditingArticle(ea => ({ ...ea, ...data }));
        toast.success('Article updated');
        return data;
      } else {
        const { data } = await api.post('/articles', payload);
        setArticles(prev => [data, ...prev]);
        setUsage(u => u ? { ...u, used: u.used + 1 } : u);
        setEditingArticle(ea => ({ ...ea, ...data }));
        toast.success('Saved as draft');
        return data;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to save article'); return null;
    } finally { setSaving(false); }
  }

  // ── Schedule from editor ──────────────────────────────────────────────────
  async function handleOpenSchedule() {
    if (!editingArticle.id) {
      const saved = await handleSave('draft');
      if (!saved) return;
    }
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().slice(0, 10));
    setScheduleModal(true);
  }

  async function handleScheduleSubmit() {
    if (!editingArticle.id || !scheduleDate) return;
    const isoDate = `${scheduleDate}T${scheduleTime}:00.000Z`;
    if (new Date(isoDate) <= new Date()) { toast.error('Date must be in the future'); return; }
    setScheduling(true);
    try {
      const { data } = await api.post(`/articles/${editingArticle.id}/schedule`, { scheduled_for: isoDate });
      setEditingArticle(ea => ({ ...ea, ...data }));
      setArticles(prev => prev.map(a => a.id === data.id ? data : a));
      toast.success(`Scheduled for ${new Date(isoDate).toLocaleDateString()}`);
      setScheduleModal(false);
      setView('calendar');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to schedule');
    } finally { setScheduling(false); }
  }

  // ── Publish modal ─────────────────────────────────────────────────────────
  async function handleOpenPublish() {
    if (!editingArticle.id) { const saved = await handleSave('draft'); if (!saved) return; }
    setPublishModal(true);
  }

  async function handlePublishToWordPress() {
    if (!editingArticle.id) return;
    setPublishing(true);
    try {
      const { data } = await api.post(`/articles/${editingArticle.id}/publish`, { wpStatus });
      setPublishedUrl(data.published_url);
      setEditingArticle(ea => ({ ...ea, status: wpStatus === 'publish' ? 'published' : 'draft', published_url: data.published_url }));
      setArticles(prev => prev.map(a => a.id === data.article?.id ? data.article : a));
      toast.success(wpStatus === 'publish' ? 'Published to WordPress!' : 'Saved to WordPress as draft');
      setPublishModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to publish');
    } finally { setPublishing(false); }
  }

  // ── Calendar: schedule existing draft for a date ──────────────────────────
  async function handleCalendarSchedule() {
    if (!calScheduleArticleId || !calScheduleModal) return;
    const isoDate = `${calScheduleModal.date}T09:00:00.000Z`;
    if (new Date(isoDate) <= new Date()) { toast.error('Cannot schedule a past date'); return; }
    setScheduling(true);
    try {
      const { data } = await api.post(`/articles/${calScheduleArticleId}/schedule`, { scheduled_for: isoDate });
      setArticles(prev => prev.map(a => a.id === data.id ? data : a));
      toast.success(`Scheduled for ${new Date(isoDate).toLocaleDateString()}`);
      setCalScheduleModal(null); setCalScheduleArticleId('');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to schedule');
    } finally { setScheduling(false); }
  }

  // ── Auto-generate (Agency) ────────────────────────────────────────────────
  async function handleAutoGenerate() {
    setAutoGenLoading(true);
    try {
      const { data } = await api.post('/articles/auto-generate', { businessId: business.id, cadence });
      if (data.articles?.length > 0) {
        setArticles(prev => [...data.articles, ...prev]);
        setUsage(u => u ? { ...u, used: u.used + data.articles.length } : u);
        toast.success(`${data.articles.length} article${data.articles.length > 1 ? 's' : ''} generated and scheduled!`);
        setView('calendar');
      } else {
        toast(data.message ?? 'No new slots found — schedule already covered');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Auto-generate failed');
    } finally { setAutoGenLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this article?')) return;
    try {
      await api.delete(`/articles/${id}`);
      setArticles(prev => prev.filter(a => a.id !== id));
      setUsage(u => u ? { ...u, used: Math.max(0, u.used - 1) } : u);
      toast.success('Article deleted');
    } catch { toast.error('Failed to delete article'); }
  }

  function handleCopyHtml() {
    navigator.clipboard.writeText(editingArticle.body_html ?? '').then(
      () => toast.success('HTML copied to clipboard'),
      () => toast.error('Copy failed — try selecting and copying manually'),
    );
  }

  const atLimit = usage ? usage.used >= usage.limit : false;
  const drafts = articles.filter(a => a.status === 'draft');

  // ── Article map by date (for calendar) ───────────────────────────────────
  const articlesByDate = articles.reduce<Record<string, Article[]>>((acc, a) => {
    const key = articleCalendarDate(a);
    if (key) { if (!acc[key]) acc[key] = []; acc[key].push(a); }
    return acc;
  }, {});

  // ══════════════════════════════════════════════════════════════════════════
  // CALENDAR VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'calendar') {
    const { year, month } = calMonth;
    const grid = getCalendarGrid(year, month);
    const today = dateKey(new Date());
    const prevMonth = () => setCalMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 });
    const nextMonth = () => setCalMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 });

    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Articles
            </button>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft size={16} /></button>
              <span className="text-lg font-bold text-gray-900 min-w-[160px] text-center">{MONTH_NAMES[month]} {year}</span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleGetTopics} disabled={atLimit}>
              <Lightbulb size={15} /> Topic ideas
            </Button>
            <Button onClick={() => { setEditingArticle({ status: 'draft' }); setEditorTab('edit'); setPublishedUrl(null); setView('editor'); }} disabled={atLimit}>
              <Plus size={15} /> New article
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <Card padding="sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {grid.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="min-h-[90px] border-r border-b border-gray-50 last:border-r-0" />;
              const key = dateKey(day);
              const dayArticles = articlesByDate[key] ?? [];
              const isToday = key === today;
              const isPast = key < today;

              return (
                <div
                  key={key}
                  onClick={() => !isPast && !atLimit && setCalScheduleModal({ date: key })}
                  className={`min-h-[90px] p-1.5 border-r border-b border-gray-100 last:border-r-0 transition-colors ${!isPast && !atLimit ? 'cursor-pointer hover:bg-brand-50' : ''} ${isToday ? 'bg-brand-50' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-600 text-white' : isPast ? 'text-gray-300' : 'text-gray-600'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayArticles.map(a => (
                      <div
                        key={a.id}
                        onClick={e => { e.stopPropagation(); handleEditArticle(a); }}
                        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer font-medium ${a.status === 'published' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-brand-100 text-brand-800 hover:bg-brand-200'}`}
                        title={a.title}
                      >
                        {a.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-200" /> Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200" /> Published</span>
          <span className="text-gray-400">Click an empty future day to schedule a draft</span>
        </div>

        {/* Calendar schedule modal */}
        <Modal
          open={!!calScheduleModal}
          onClose={() => { setCalScheduleModal(null); setCalScheduleArticleId(''); }}
          title={`Schedule for ${calScheduleModal ? new Date(calScheduleModal.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}`}
          size="sm"
        >
          <div className="space-y-4">
            {drafts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">No draft articles to schedule.</p>
                <Button size="sm" onClick={() => { setCalScheduleModal(null); setEditingArticle({ status: 'draft' }); setView('editor'); }}>
                  <Plus size={13} /> Write an article
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Pick a draft</label>
                  <select
                    value={calScheduleArticleId}
                    onChange={e => setCalScheduleArticleId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">— select article —</option>
                    {drafts.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-400">Will publish at 9:00 AM UTC on the selected day.</p>
                <Button
                  className="w-full"
                  onClick={handleCalendarSchedule}
                  loading={scheduling}
                  disabled={!calScheduleArticleId}
                >
                  <Clock size={14} /> Schedule article
                </Button>
              </>
            )}
          </div>
        </Modal>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EDITOR VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'editor') {
    const isNew = !editingArticle.id;
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to articles
          </button>
          <div className="flex flex-wrap gap-2">
            {!generating && editingArticle.body_html && (
              <>
                <button onClick={handleCopyHtml} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Copy size={13} /> Copy HTML
                </button>
                <button onClick={() => downloadHtml(editingArticle.title ?? 'article', editingArticle.body_html ?? '')} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download size={13} /> Download
                </button>
              </>
            )}
            <Button variant="outline" onClick={() => handleSave('draft')} loading={saving} disabled={generating}>
              Save draft
            </Button>
            {!generating && (
              <Button variant="secondary" onClick={handleOpenSchedule} disabled={generating || (isNew && atLimit)}>
                <Clock size={14} /> Schedule
              </Button>
            )}
            <Button onClick={handleOpenPublish} loading={saving} disabled={generating || (isNew && atLimit)}>
              {cmsConnection ? <><Globe size={14} /> Publish</> : 'Publish / Export'}
            </Button>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {editingArticle.status === 'scheduled' && editingArticle.scheduled_for && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <Clock size={12} /> Scheduled for {new Date(editingArticle.scheduled_for).toLocaleString()}
            </div>
          )}
          {publishedUrl && (
            <div className="flex items-center gap-2 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <Globe size={12} /> Published:
              <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline flex items-center gap-1">
                {publishedUrl} <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>

        {editingArticle._topic && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Lightbulb size={13} className="text-brand-500" />
            <span className="italic">{editingArticle._topic}</span>
          </div>
        )}

        {generating && (
          <Card className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Writing your article with AI…</p>
            <p className="text-gray-400 text-xs mt-1">This takes about 20–30 seconds</p>
          </Card>
        )}

        {!generating && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <input
                value={editingArticle.title ?? ''}
                onChange={e => setEditingArticle(a => ({ ...a, title: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Article title"
              />
              <p className="text-xs text-gray-400 text-right">{(editingArticle.title ?? '').length} chars</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Meta description</label>
              <textarea
                value={editingArticle.meta_description ?? ''}
                onChange={e => setEditingArticle(a => ({ ...a, meta_description: e.target.value }))}
                rows={2}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="155-character meta description for search engines"
              />
              <p className="text-xs text-gray-400 text-right">{(editingArticle.meta_description ?? '').length} / 160 chars</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Article body</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                  <button onClick={() => setEditorTab('edit')} className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${editorTab === 'edit' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Pencil size={11} /> Edit HTML
                  </button>
                  <button onClick={() => setEditorTab('preview')} className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${editorTab === 'preview' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Eye size={11} /> Preview
                  </button>
                </div>
              </div>
              {editorTab === 'edit' ? (
                <>
                  <textarea
                    value={editingArticle.body_html ?? ''}
                    onChange={e => setEditingArticle(a => ({ ...a, body_html: e.target.value }))}
                    rows={22}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                    placeholder="Article HTML will appear here after generation…"
                  />
                  <p className="text-xs text-gray-400 text-right">~{wordCount(editingArticle.body_html ?? '')} words</p>
                </>
              ) : (
                <div
                  className="min-h-64 p-6 border border-gray-200 rounded-lg prose prose-sm max-w-none overflow-auto"
                  dangerouslySetInnerHTML={{ __html: editingArticle.body_html ?? '<p class="text-gray-400">Nothing to preview yet.</p>' }}
                />
              )}
            </div>

            {editingArticle.faq_json && editingArticle.faq_json.length > 0 && (
              <Card>
                <p className="text-sm font-semibold text-gray-800 mb-3">FAQ Section</p>
                <div className="space-y-3">
                  {editingArticle.faq_json.map((item, i) => (
                    <div key={i} className="border-l-2 border-brand-200 pl-3">
                      <p className="text-sm font-medium text-gray-800">{item.question}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Schedule modal */}
        <Modal open={scheduleModal} onClose={() => setScheduleModal(false)} title="Schedule Article" size="sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Time (UTC)</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            {cmsConnection && (
              <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                Will auto-publish to <span className="font-medium">{cmsConnection.site_url}</span> when due.
              </p>
            )}
            {!cmsConnection && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                No WordPress connected — article will be marked published in ContractorSEO when due. Connect a site in Settings to auto-publish.
              </p>
            )}
            <Button className="w-full" onClick={handleScheduleSubmit} loading={scheduling} disabled={!scheduleDate}>
              <Clock size={14} /> Confirm schedule
            </Button>
          </div>
        </Modal>

        {/* Publish modal */}
        <Modal open={publishModal} onClose={() => setPublishModal(false)} title={cmsConnection ? 'Publish Article' : 'Export Article'} size="md">
          {cmsConnection ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                <Globe size={14} className="text-green-600 shrink-0" />
                <span className="text-green-800">Connected to <span className="font-medium">{cmsConnection.site_url}</span></span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Publish status</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['publish', 'draft'] as const).map(s => (
                    <button key={s} onClick={() => setWpStatus(s)} className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${wpStatus === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {s === 'publish' ? 'Publish live' : 'Save as draft'}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handlePublishToWordPress} loading={publishing}>
                <Globe size={14} /> {wpStatus === 'publish' ? 'Publish to WordPress' : 'Save draft to WordPress'}
              </Button>
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Or export</p>
                <div className="flex gap-2">
                  <button onClick={handleCopyHtml} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Copy size={14} /> Copy HTML
                  </button>
                  <button onClick={() => downloadHtml(editingArticle.title ?? 'article', editingArticle.body_html ?? '')} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Download size={14} /> Download HTML
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                No WordPress site connected. Connect one in <a href="/dashboard/settings" className="text-brand-600 hover:underline">Settings</a>, or export the HTML to paste into any CMS.
              </p>
              <div className="flex gap-3">
                <button onClick={handleCopyHtml} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Copy size={15} /> Copy HTML
                </button>
                <button onClick={() => downloadHtml(editingArticle.title ?? 'article', editingArticle.body_html ?? '')} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download size={15} /> Download HTML
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TOPICS VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'topics') {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Topic Ideas</h1>
              <p className="text-gray-500 text-sm mt-0.5">AI-generated topics for {business.name}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleGetTopics} loading={loadingTopics}>
            <Sparkles size={15} /> Regenerate
          </Button>
        </div>

        {loadingTopics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topics.map((t, i) => (
              <button
                key={i}
                onClick={() => !atLimit && handleSelectTopic(t.topic)}
                disabled={atLimit}
                className="text-left p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 leading-snug flex-1">{t.topic}</p>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-500 transition-colors shrink-0 mt-0.5" />
                </div>
                <div className="mt-2">
                  <Badge variant={TOPIC_TYPE_VARIANTS[t.type] ?? 'gray'}>{TOPIC_TYPE_LABELS[t.type] ?? t.type}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}

        {atLimit && (
          <p className="text-center text-sm text-amber-600 bg-amber-50 rounded-lg py-3 px-4">
            You've reached your article limit. Upgrade your plan to write more.
          </p>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
          <p className="text-gray-500 text-sm mt-0.5">AI-written SEO articles for your local market</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {usage && (
            <span className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">
              {usage.used} / {usage.limit} articles {usage.period === 'total' ? 'total' : 'this month'}
            </span>
          )}
          <Button variant="outline" onClick={() => setView('calendar')}>
            <Calendar size={15} /> Calendar
          </Button>
          <Button variant="secondary" onClick={handleGetTopics} disabled={atLimit}>
            <Lightbulb size={15} /> Topic ideas
          </Button>
          <Button onClick={() => { setEditingArticle({ status: 'draft' }); setEditorTab('edit'); setPublishedUrl(null); setView('editor'); }} disabled={atLimit}>
            <Plus size={15} /> New article
          </Button>
        </div>
      </div>

      {usage && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }} />
        </div>
      )}

      {/* Agency auto-generate panel */}
      {user.plan === 'agency' && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                <Zap size={16} className="text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Auto-Schedule</p>
                <p className="text-xs text-gray-500">Generate + schedule articles automatically</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={cadence}
                onChange={e => setCadence(e.target.value as any)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                disabled={autoGenLoading}
              >
                {Object.entries(CADENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Button onClick={handleAutoGenerate} loading={autoGenLoading} disabled={atLimit}>
                <Sparkles size={14} /> Generate schedule
              </Button>
            </div>
          </div>
          {autoGenLoading && (
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
              Generating articles… this takes about 1–2 minutes. You can leave this page open.
            </p>
          )}
          {business.auto_schedule && !autoGenLoading && (
            <p className="text-xs text-green-700 mt-3 pt-3 border-t border-gray-100">
              Auto-schedule active · {CADENCE_LABELS[business.auto_schedule_cadence ?? 'weekly']}
            </p>
          )}
        </Card>
      )}

      {/* Article list */}
      {loadingList ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : articles.length === 0 ? (
        <Card className="text-center py-14">
          <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-semibold mb-1">No articles yet</p>
          <p className="text-sm text-gray-400 mb-5">Generate SEO articles that rank in your local market</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={handleGetTopics}><Lightbulb size={15} /> Get topic ideas</Button>
            <Button onClick={() => { setEditingArticle({ status: 'draft' }); setPublishedUrl(null); setView('editor'); }}>
              <Pencil size={15} /> Write from scratch
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map(article => (
            <Card key={article.id} padding="sm">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={STATUS_VARIANTS[article.status]}>{article.status}</Badge>
                    {article.cms_target === 'wordpress' && <Badge variant="info"><Globe size={10} /> WordPress</Badge>}
                    <span className="text-xs text-gray-400">~{wordCount(article.body_html)} words</span>
                    {article.scheduled_for && article.status === 'scheduled' && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <Clock size={10} /> {new Date(article.scheduled_for).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{formatDate(article.created_at)}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-0.5 line-clamp-1">{article.title}</h3>
                  {article.published_url ? (
                    <a href={article.published_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                      {article.published_url} <ExternalLink size={10} />
                    </a>
                  ) : article.meta_description ? (
                    <p className="text-xs text-gray-500 line-clamp-1">{article.meta_description}</p>
                  ) : null}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => handleEditArticle(article)}>
                    <Pencil size={13} /> Edit
                  </Button>
                  <button onClick={() => handleDelete(article.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {atLimit && (
        <Card className="text-center py-6 border-amber-200 bg-amber-50">
          <FileText size={24} className="mx-auto mb-2 text-amber-400" />
          <p className="text-sm font-medium text-amber-800">Article limit reached</p>
          <p className="text-xs text-amber-600 mt-0.5">
            {usage?.plan === 'trial'
              ? "You've used all 2 trial articles. Upgrade to Growth for 15/month."
              : `You've used all ${usage?.limit} articles this month.`}
          </p>
        </Card>
      )}

      {/* Process-due note */}
      <p className="text-xs text-center text-gray-400">
        Scheduled articles auto-publish when you visit this page.{' '}
        For 24/7 auto-publishing, set up an external cron to hit <code>GET /api/articles/process-due?secret=CRON_SECRET</code>.
      </p>
    </div>
  );
}
