import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { User, Business, Post } from '@/types';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Sparkles, FileText, Trash2, Calendar, MapPin, CheckCircle } from 'lucide-react';

interface Context { user: User; business: Business }

const POST_TYPES = [
  { value: 'update', label: 'Business Update' },
  { value: 'offer',  label: 'Offer / Promotion' },
  { value: 'event',  label: 'Event' },
  { value: 'tip',    label: 'Pro Tip' },
];

const STATUS_VARIANTS: Record<string, 'success' | 'info' | 'gray'> = {
  published: 'success', scheduled: 'info', draft: 'gray',
};

export function Posts() {
  const { business } = useOutletContext<Context>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingGbp, setPublishingGbp] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: 'update' as Post['type'],
    title: '',
    content: '',
    scheduled_for: '',
    jobType: '',
  });

  useEffect(() => {
    api.get(`/posts/${business.id}`).then((r) => { setPosts(r.data); setLoading(false); });
  }, [business.id]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { data } = await api.post('/posts/generate', {
        businessId: business.id,
        postType: form.type,
        jobType: form.jobType || undefined,
        tone: 'professional',
      });
      setForm((f) => ({ ...f, title: data.title, content: data.content }));
      toast.success('Content generated!');
    } catch {
      toast.error('Generation failed. Check your API key.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(status: 'draft' | 'scheduled') {
    if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/posts', {
        business_id: business.id,
        type: form.type,
        title: form.title,
        content: form.content,
        scheduled_for: form.scheduled_for || null,
        status,
      });
      setPosts((p) => [data, ...p]);
      setShowCreate(false);
      setForm({ type: 'update', title: '', content: '', scheduled_for: '', jobType: '' });
      toast.success(status === 'scheduled' ? 'Post scheduled!' : 'Saved as draft');
    } catch {
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishGBP(post: Post) {
    if (!business.gbp_connected) {
      toast.error('Connect your Google Business Profile in Settings first');
      return;
    }
    setPublishingGbp(post.id);
    try {
      await api.post(`/gbp/publish/${business.id}/${post.id}`);
      setPosts((p) => p.map((x) =>
        x.id === post.id ? { ...x, status: 'published', published_at: new Date().toISOString() } : x
      ));
      toast.success('Published to Google Business Profile!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to publish to GBP');
    } finally {
      setPublishingGbp(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
      setPosts((p) => p.filter((post) => post.id !== id));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content</h1>
          <p className="text-gray-500 text-sm mt-0.5">AI-generated Google Business Profile posts</p>
        </div>
        <div className="flex items-center gap-2">
          {!business.gbp_connected && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin size={12} /> GBP not connected
            </span>
          )}
          <Button onClick={() => setShowCreate(true)}><Plus size={16} /> New post</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <Card className="text-center py-12">
          <FileText size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium mb-1">No posts yet</p>
          <p className="text-sm text-gray-400 mb-4">Create your first AI-generated GBP post</p>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Create post</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} padding="sm">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={STATUS_VARIANTS[post.status]}>{post.status}</Badge>
                    <Badge variant="gray">{post.type}</Badge>
                    {post.gbp_post_name && (
                      <Badge variant="success">
                        <CheckCircle size={11} className="mr-0.5" /> On GBP
                      </Badge>
                    )}
                    {post.scheduled_for && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={12} /> {formatDate(post.scheduled_for)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{post.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{post.content}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {!post.gbp_post_name && business.gbp_connected && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handlePublishGBP(post)}
                      loading={publishingGbp === post.id}
                    >
                      <MapPin size={13} /> Post to GBP
                    </Button>
                  )}
                  <button
                    onClick={() => handleDelete(post.id)}
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create GBP Post" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Post type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Post['type'] }))}
              options={POST_TYPES}
            />
            <Input
              label="Job type (optional)"
              value={form.jobType}
              onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))}
              placeholder="e.g. panel upgrade"
            />
          </div>

          <Button variant="secondary" onClick={handleGenerate} loading={generating} className="w-full">
            <Sparkles size={16} /> Generate with AI
          </Button>

          <Input
            label="Post title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="60 characters max"
            maxLength={60}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={6}
              placeholder="Post content (150–300 words recommended)"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{form.content.length} chars</p>
          </div>

          <Input
            label="Schedule for (optional)"
            type="datetime-local"
            value={form.scheduled_for}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_for: e.target.value }))}
          />

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => handleSave('draft')} loading={saving}>Save draft</Button>
            <Button onClick={() => handleSave('scheduled')} loading={saving}>
              {form.scheduled_for ? 'Schedule' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
