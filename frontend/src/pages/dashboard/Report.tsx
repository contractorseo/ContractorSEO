import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { User, Business } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  BarChart3, MapPin, Search, FileText, Star, Share2,
  CheckCircle, Copy, Lock,
} from 'lucide-react';

interface Context { user: User; business: Business }

interface ReportData {
  business: { name: string; city: string; state: string; category: string } | null;
  napScore: number;
  napListings: number;
  napConsistent: number;
  keywordCount: number;
  top10Keywords: { keyword: string; current_rank: number | null; monthly_volume: number | null }[];
  postsLast30Days: number;
  reviewCount: number;
  avgRating: number;
  generatedAt: string;
}

function ScoreRing({ value }: { value: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 48 48)"
      />
      <text x="48" y="53" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{value}</text>
    </svg>
  );
}

export function Report() {
  const { user, business } = useOutletContext<Context>();
  const isAgency = user.plan === 'agency';

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAgency) { setLoading(false); return; }
    api.get(`/api/reports/${business.id}`)
      .then((r) => setReport(r.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [business.id, isAgency]);

  async function handleShare() {
    setSharing(true);
    try {
      const { data } = await api.post(`/api/reports/share/${business.id}`);
      setShareToken(data.token);
    } catch {
      toast.error('Failed to create share link');
    } finally {
      setSharing(false);
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/report/${shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied!');
    });
  }

  if (!isAgency) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-20">
          <Lock size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">White-label reports are an Agency feature</h2>
          <p className="text-gray-500 mb-6">Upgrade to Agency to generate and share branded SEO reports with your clients.</p>
          <Button onClick={() => window.location.href = '/dashboard/settings'}>Upgrade to Agency</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {[1,2,3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!report) return null;

  const shareUrl = shareToken ? `${window.location.origin}/report/${shareToken}` : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Report</h1>
          <p className="text-gray-500 text-sm mt-0.5">{business.name} — {business.city}, {business.state}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shareUrl ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                readOnly
                value={shareUrl}
                className="text-xs border border-gray-200 rounded-lg px-3 py-2 flex-1 sm:w-64 text-gray-600 bg-gray-50 min-w-0"
              />
              <Button size="sm" variant="secondary" onClick={copyLink}>
                <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={handleShare} loading={sharing}>
              <Share2 size={15} /> Share report
            </Button>
          )}
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm" className="flex flex-col items-center py-4">
          <MapPin size={16} className="text-brand-500 mb-2" />
          <p className="text-xs text-gray-500 mb-2">NAP Score</p>
          <ScoreRing value={report.napScore} />
          <p className="text-xs text-gray-400 mt-2">{report.napConsistent}/{report.napListings} consistent</p>
        </Card>

        <Card padding="sm" className="flex flex-col items-center py-4">
          <Search size={16} className="text-brand-500 mb-2" />
          <p className="text-xs text-gray-500 mb-2">Keywords tracked</p>
          <p className="text-4xl font-bold text-gray-900">{report.keywordCount}</p>
          <p className="text-xs text-gray-400 mt-2">{report.top10Keywords.length} in top 10</p>
        </Card>

        <Card padding="sm" className="flex flex-col items-center py-4">
          <FileText size={16} className="text-brand-500 mb-2" />
          <p className="text-xs text-gray-500 mb-2">Posts (30 days)</p>
          <p className="text-4xl font-bold text-gray-900">{report.postsLast30Days}</p>
          <p className="text-xs text-gray-400 mt-2">published to GBP</p>
        </Card>

        <Card padding="sm" className="flex flex-col items-center py-4">
          <Star size={16} className="text-brand-500 mb-2" />
          <p className="text-xs text-gray-500 mb-2">Reviews</p>
          <p className="text-4xl font-bold text-gray-900">{report.avgRating > 0 ? report.avgRating.toFixed(1) : '—'}</p>
          <p className="text-xs text-gray-400 mt-2">{report.reviewCount} total</p>
        </Card>
      </div>

      {/* Top keywords */}
      {report.top10Keywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search size={16} /> Top 10 Keywords</CardTitle>
            <Badge variant="success">{report.top10Keywords.length} ranking</Badge>
          </CardHeader>
          <div className="divide-y divide-gray-50">
            {report.top10Keywords.map((kw, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-1">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                    {kw.current_rank}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{kw.keyword}</span>
                </div>
                {kw.monthly_volume && (
                  <span className="text-xs text-gray-400">{kw.monthly_volume.toLocaleString()} searches/mo</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* NAP breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin size={16} /> Citation Health</CardTitle>
          <Badge variant={report.napScore >= 80 ? 'success' : report.napScore >= 50 ? 'warning' : 'danger'}>
            {report.napScore}% consistent
          </Badge>
        </CardHeader>
        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${report.napScore >= 80 ? 'bg-green-500' : report.napScore >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
            style={{ width: `${report.napScore}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-3">
          {report.napConsistent} of {report.napListings} directories have consistent NAP data.
          {report.napScore < 80 && ' Fix inconsistent listings to improve local search rankings.'}
        </p>
      </Card>

      <p className="text-xs text-gray-400 text-center">
        Report generated {new Date(report.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
