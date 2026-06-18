import { useState, useEffect } from 'react';
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
  Globe, ExternalLink,
} from 'lucide-react';

interface Context { user: User; business: Business }

type View = 'list' | 'topics' | 'editor';

const TOPIC_TYPE_LABELS: Record<string, string> = {
  cost_guide:  'Cost Guide',
  how_to:      'How-To',
  local_guide: 'Local Guide',
  faq:         'FAQ',
};
const TOPIC_TYPE_VARIANTS: Record<string, 'success' | 'info' | 'warning' | 'gray'> = {
  cost_guide:  'success',
  how_to:      'info',
  local_guide: 'warning',
  faq:         'gray',
};
const STATUS_VARIANTS: Record<string, 'success' | 'info' | 'gray'> = {
  published: 'success', scheduled: 'info', draft: 'gray',
};

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

export function ContentStudio() {
  const { business } = useOutletContext<Context>();

  const [view, setView] = useState<View>('list');
  const [articles, setArticles] = useState<Article[]>([]);
  const [usage, setUsage] = useState<ArticleUsage | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [cmsConnection, setCmsConnection] = useState<CmsConnection | null>(null);

  // Topics state
  const [topics, setTopics] = useState<ArticleTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Editor state
  const [editingArticle, setEditingArticle] = useState<Partial<Article> & { _topic?: string }>({});
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');

  // Publish modal state
  const [publishModal, setPublishModal] = useState(false);
  const [wpStatus, setWpStatus] = useState<'publish' | 'draft'>('publish');
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

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
    }).catch(() => {
      toast.error('Failed to load articles');
    }).finally(() => setLoadingList(false));
  }, [business.id]);

  // ── Topics ────────────────────────────────────────────────────────────────
  async function handleGetTopics() {
    setLoadingTopics(true);
    setTopics([]);
    setView('topics');
    try {
      const { data } = await api.post('/articles/topics', { businessId: business.id });
      setTopics(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to generate topics');
      setView('list');
    } finally {
      setLoadingTopics(false);
    }
  }

  // ── Generate article for a topic ─────────────────────────────────────────
  async function handleSelectTopic(topic: string) {
    setEditingArticle({ _topic: topic });
    setEditorTab('edit');
    setView('editor');
    setGenerating(true);
    setPublishedUrl(null);
    try {
      const { data } = await api.post('/articles/generate', {
        businessId: business.id,
        topic,
      });
      setEditingArticle({
        _topic: topic,
        title: data.title,
        slug: data.slug,
        meta_description: data.meta_description,
        body_html: data.body_html,
        faq_json: data.faq_json,
        schema_jsonld: data.schema_jsonld,
        status: 'draft',
      });
    } catch {
      toast.error('Article generation failed');
    } finally {
      setGenerating(false);
    }
  }

  // ── Open existing article in editor ──────────────────────────────────────
  function handleEditArticle(article: Article) {
    setEditingArticle(article);
    setEditorTab('edit');
    setPublishedUrl(article.published_url ?? null);
    setView('editor');
  }

  // ── Save / update article in DB ───────────────────────────────────────────
  async function handleSave(status: 'draft' | 'published' = 'draft'): Promise<Article | null> {
    if (!editingArticle.title?.trim() || !editingArticle.body_html?.trim()) {
      toast.error('Title and body are required');
      return null;
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
        const { data } = await api.put(`/articles/${editingArticle.id}`, { ...payload });
        setArticles((prev) => prev.map((a) => (a.id === data.id ? data : a)));
        setEditingArticle((ea) => ({ ...ea, ...data }));
        toast.success('Article updated');
        return data;
      } else {
        const { data } = await api.post('/articles', payload);
        setArticles((prev) => [data, ...prev]);
        setUsage((u) => u ? { ...u, used: u.used + 1 } : u);
        setEditingArticle((ea) => ({ ...ea, ...data }));
        toast.success(status === 'published' ? 'Article saved!' : 'Saved as draft');
        return data;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to save article');
      return null;
    } finally {
      setSaving(false);
    }
  }

  // ── Open publish modal (save first if needed) ─────────────────────────────
  async function handleOpenPublish() {
    let article = editingArticle as Article;
    if (!editingArticle.id) {
      const saved = await handleSave('draft');
      if (!saved) return;
      article = saved;
    }
    setPublishModal(true);
  }

  // ── Publish to WordPress ──────────────────────────────────────────────────
  async function handlePublishToWordPress() {
    if (!editingArticle.id) return;
    setPublishing(true);
    try {
      const { data } = await api.post(`/articles/${editingArticle.id}/publish`, { wpStatus });
      const url: string = data.published_url;
      setPublishedUrl(url);
      setEditingArticle((ea) => ({ ...ea, status: wpStatus === 'publish' ? 'published' : 'draft', published_url: url }));
      setArticles((prev) => prev.map((a) => (a.id === data.article?.id ? data.article : a)));
      toast.success(wpStatus === 'publish' ? 'Published to WordPress!' : 'Saved to WordPress as draft');
      setPublishModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this article?')) return;
    try {
      await api.delete(`/articles/${id}`);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      setUsage((u) => u ? { ...u, used: Math.max(0, u.used - 1) } : u);
      toast.success('Article deleted');
    } catch {
      toast.error('Failed to delete article');
    }
  }

  function handleCopyHtml() {
    navigator.clipboard.writeText(editingArticle.body_html ?? '').then(
      () => toast.success('HTML copied to clipboard'),
      () => toast.error('Copy failed — try selecting and copying manually'),
    );
  }

  const atLimit = usage ? usage.used >= usage.limit : false;

  // ══════════════════════════════════════════════════════════════════════════
  // EDITOR VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'editor') {
    const isNew = !editingArticle.id;
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} /> Back to articles
          </button>
          <div className="flex flex-wrap gap-2">
            {/* Export shortcuts — always available once there's content */}
            {!generating && editingArticle.body_html && (
              <>
                <button
                  onClick={handleCopyHtml}
                  title="Copy HTML"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy size={13} /> Copy HTML
                </button>
                <button
                  onClick={() => downloadHtml(editingArticle.title ?? 'article', editingArticle.body_html ?? '')}
                  title="Download HTML"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download size={13} /> Download
                </button>
              </>
            )}
            <Button variant="outline" onClick={() => handleSave('draft')} loading={saving} disabled={generating}>
              Save draft
            </Button>
            <Button onClick={handleOpenPublish} loading={saving} disabled={generating || (isNew && atLimit)}>
              {cmsConnection ? <><Globe size={14} /> Publish</> : 'Publish / Export'}
            </Button>
          </div>
        </div>

        {/* Published URL banner */}
        {publishedUrl && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <Globe size={14} className="text-green-600 shrink-0" />
            <span className="text-green-800 font-medium">Published:</span>
            <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline truncate flex items-center gap-1">
              {publishedUrl} <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Topic label */}
        {editingArticle._topic && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Lightbulb size={13} className="text-brand-500" />
            <span className="italic">{editingArticle._topic}</span>
          </div>
        )}

        {/* Generating spinner */}
        {generating && (
          <Card className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Writing your article with AI…</p>
            <p className="text-gray-400 text-xs mt-1">This takes about 20–30 seconds</p>
          </Card>
        )}

        {!generating && (
          <>
            {/* Title */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <input
                value={editingArticle.title ?? ''}
                onChange={(e) => setEditingArticle((a) => ({ ...a, title: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Article title"
              />
              <p className="text-xs text-gray-400 text-right">{(editingArticle.title ?? '').length} chars</p>
            </div>

            {/* Meta description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Meta description</label>
              <textarea
                value={editingArticle.meta_description ?? ''}
                onChange={(e) => setEditingArticle((a) => ({ ...a, meta_description: e.target.value }))}
                rows={2}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="155-character meta description for search engines"
              />
              <p className="text-xs text-gray-400 text-right">{(editingArticle.meta_description ?? '').length} / 160 chars</p>
            </div>

            {/* Body editor tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Article body</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                  <button
                    onClick={() => setEditorTab('edit')}
                    className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${editorTab === 'edit' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Pencil size={11} /> Edit HTML
                  </button>
                  <button
                    onClick={() => setEditorTab('preview')}
                    className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${editorTab === 'preview' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Eye size={11} /> Preview
                  </button>
                </div>
              </div>

              {editorTab === 'edit' ? (
                <>
                  <textarea
                    value={editingArticle.body_html ?? ''}
                    onChange={(e) => setEditingArticle((a) => ({ ...a, body_html: e.target.value }))}
                    rows={22}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                    placeholder="Article HTML will appear here after generation…"
                  />
                  <p className="text-xs text-gray-400 text-right">
                    ~{wordCount(editingArticle.body_html ?? '')} words
                  </p>
                </>
              ) : (
                <div
                  className="min-h-64 p-6 border border-gray-200 rounded-lg prose prose-sm max-w-none overflow-auto"
                  dangerouslySetInnerHTML={{ __html: editingArticle.body_html ?? '<p class="text-gray-400">Nothing to preview yet.</p>' }}
                />
              )}
            </div>

            {/* FAQ */}
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

        {/* Publish modal */}
        <Modal
          open={publishModal}
          onClose={() => setPublishModal(false)}
          title={cmsConnection ? 'Publish Article' : 'Export Article'}
          size="md"
        >
          {cmsConnection ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                <Globe size={14} className="text-green-600 shrink-0" />
                <span className="text-green-800">Connected to <span className="font-medium">{cmsConnection.site_url}</span></span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Publish status</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['publish', 'draft'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setWpStatus(s)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${wpStatus === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
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
                  <button
                    onClick={handleCopyHtml}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Copy size={14} /> Copy HTML
                  </button>
                  <button
                    onClick={() => downloadHtml(editingArticle.title ?? 'article', editingArticle.body_html ?? '')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download size={14} /> Download HTML
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                No WordPress site connected. You can connect one in{' '}
                <a href="/dashboard/settings" className="text-brand-600 hover:underline">Settings</a>, or export the article HTML to paste into any CMS.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCopyHtml}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy size={15} /> Copy HTML
                </button>
                <button
                  onClick={() => downloadHtml(editingArticle.title ?? 'article', editingArticle.body_html ?? '')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
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
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
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
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
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
                  <Badge variant={TOPIC_TYPE_VARIANTS[t.type] ?? 'gray'}>
                    {TOPIC_TYPE_LABELS[t.type] ?? t.type}
                  </Badge>
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
  // LIST VIEW (default)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
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
          <Button variant="secondary" onClick={handleGetTopics} disabled={atLimit}>
            <Lightbulb size={15} /> Topic ideas
          </Button>
          <Button onClick={() => { setEditingArticle({ status: 'draft' }); setEditorTab('edit'); setPublishedUrl(null); setView('editor'); }} disabled={atLimit}>
            <Plus size={15} /> New article
          </Button>
        </div>
      </div>

      {/* Usage bar */}
      {usage && (
        <div className="space-y-1.5">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : 'bg-brand-500'}`}
              style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Article list */}
      {loadingList ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : articles.length === 0 ? (
        <Card className="text-center py-14">
          <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-semibold mb-1">No articles yet</p>
          <p className="text-sm text-gray-400 mb-5">Generate SEO articles that rank in your local market</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={handleGetTopics}>
              <Lightbulb size={15} /> Get topic ideas
            </Button>
            <Button onClick={() => { setEditingArticle({ status: 'draft' }); setPublishedUrl(null); setView('editor'); }}>
              <Pencil size={15} /> Write from scratch
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id} padding="sm">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={STATUS_VARIANTS[article.status]}>{article.status}</Badge>
                    {article.cms_target === 'wordpress' && (
                      <Badge variant="info"><Globe size={10} /> WordPress</Badge>
                    )}
                    <span className="text-xs text-gray-400">~{wordCount(article.body_html)} words</span>
                    <span className="text-xs text-gray-400">{formatDate(article.created_at)}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-0.5 line-clamp-1">
                    {article.title}
                  </h3>
                  {article.published_url ? (
                    <a
                      href={article.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                    >
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
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
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
              ? 'You\'ve used all 2 trial articles. Upgrade to Growth for 15/month.'
              : `You've used all ${usage?.limit} articles this month.`}
          </p>
        </Card>
      )}
    </div>
  );
}
