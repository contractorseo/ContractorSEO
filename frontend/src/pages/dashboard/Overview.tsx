import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { User, Business, Keyword, Review, Post } from '@/types';
import { getDaysLeft, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { TrendingUp, Star, FileText, MapPin, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Context { user: User; business: Business }

interface SEOScore {
  total: number;
  breakdown: { label: string; score: number; max: number; status: 'good' | 'warn' | 'bad' }[];
}

function computeSEOScore(posts: Post[], reviews: Review[], keywords: Keyword[]): SEOScore {
  const recentPosts = posts.filter((p) => {
    const age = Date.now() - new Date(p.created_at).getTime();
    return age < 30 * 24 * 60 * 60 * 1000;
  }).length;

  const avgRating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const responded = reviews.length ? reviews.filter((r) => r.responded).length / reviews.length : 0;
  const topKeywords = keywords.filter((k) => k.current_rank !== null && k.current_rank <= 10).length;

  const breakdown = [
    {
      label: 'Content activity',
      score: Math.min(recentPosts * 5, 25),
      max: 25,
      status: recentPosts >= 4 ? 'good' : recentPosts >= 2 ? 'warn' : 'bad',
    },
    {
      label: 'Review rating',
      score: Math.round((avgRating / 5) * 25),
      max: 25,
      status: avgRating >= 4.5 ? 'good' : avgRating >= 4 ? 'warn' : 'bad',
    },
    {
      label: 'Review responses',
      score: Math.round(responded * 25),
      max: 25,
      status: responded >= 0.8 ? 'good' : responded >= 0.5 ? 'warn' : 'bad',
    },
    {
      label: 'Keyword rankings',
      score: Math.min(topKeywords * 5, 25),
      max: 25,
      status: topKeywords >= 5 ? 'good' : topKeywords >= 2 ? 'warn' : 'bad',
    },
  ] as SEOScore['breakdown'];

  return { total: breakdown.reduce((a, b) => a + b.score, 0), breakdown };
}

export function Overview() {
  const { user, business } = useOutletContext<Context>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;
    Promise.all([
      api.get(`/api/posts/${business.id}`),
      api.get(`/api/reviews/${business.id}`),
      api.get(`/api/keywords/${business.id}`),
    ]).then(([p, r, k]) => {
      setPosts(Array.isArray(p.data) ? p.data : []);
      setReviews(Array.isArray(r.data) ? r.data : []);
      setKeywords(Array.isArray(k.data) ? k.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [business]);

  const seo = computeSEOScore(posts, reviews, keywords);
  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : '—';
  const daysLeft = getDaysLeft(user.trial_ends_at);
  const unresponded = reviews.filter((r) => !r.responded).length;

  const scoreColor = seo.total >= 80 ? 'text-green-600' : seo.total >= 55 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = seo.total >= 80 ? 'bg-green-500' : seo.total >= 55 ? 'bg-amber-500' : 'bg-red-500';

  const statusVariant = (s: string) => s === 'good' ? 'success' : s === 'warn' ? 'warning' : 'danger';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good morning 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">{business?.name} · {business?.city}, {business?.state}</p>
        </div>
        {user.plan === 'trial' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-amber-700 font-medium">
              {daysLeft > 0 ? `${daysLeft} days left in trial` : 'Trial ended'}
            </span>
            <Link to="/dashboard/settings">
              <Button size="sm">Upgrade now</Button>
            </Link>
          </div>
        )}
      </div>

      {unresponded > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{unresponded} review{unresponded > 1 ? 's' : ''}</strong> waiting for a response.{' '}
            <Link to="/dashboard/reviews" className="underline hover:no-underline">Respond now →</Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'SEO Score', value: `${seo.total}/100`, icon: TrendingUp, color: scoreColor },
          { label: 'Avg Rating', value: avgRating, icon: Star, color: 'text-amber-600' },
          { label: 'Posts this month', value: posts.filter((p) => { const d = Date.now() - new Date(p.created_at).getTime(); return d < 30*24*60*60*1000; }).length, icon: FileText, color: 'text-brand-600' },
          { label: 'Keywords tracked', value: keywords.length, icon: MapPin, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{label}</p>
              <Icon size={18} className={color} />
            </div>
            <p className={`text-3xl font-bold ${color}`}>{loading ? '—' : value}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>SEO Health Score</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={seo.total >= 80 ? '#22c55e' : seo.total >= 55 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  strokeDasharray={`${(seo.total / 100) * 314} 314`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${scoreColor}`}>{seo.total}</span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {seo.breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{item.label}</p>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${scoreBg} rounded-full`} style={{ width: `${(item.score / item.max) * 100}%` }} />
                  </div>
                  <Badge variant={statusVariant(item.status)} className="text-xs">{item.score}/{item.max}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent reviews</CardTitle>
            <Link to="/dashboard/reviews" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </CardHeader>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Star size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reviews yet</p>
              <Link to="/dashboard/reviews">
                <Button variant="secondary" size="sm" className="mt-3">Request your first review</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                    {r.reviewer_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900">{r.reviewer_name}</p>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={12} className={i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                      </div>
                      {!r.responded && <Badge variant="warning" className="text-xs">Needs reply</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{r.text}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{formatDate(r.date)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
