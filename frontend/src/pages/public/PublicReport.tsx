import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Search, FileText, Star, CheckCircle, AlertCircle } from 'lucide-react';

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
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width="112" height="112" viewBox="0 0 112 112">
      <circle cx="56" cy="56" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      <circle
        cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 56 56)"
      />
      <text x="56" y="62" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>{value}</text>
    </svg>
  );
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export function PublicReport() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/reports/public/${token}`)
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e.error));
        return r.json();
      })
      .then(setReport)
      .catch((e) => setError(typeof e === 'string' ? e : 'Failed to load report'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !report?.business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Report not found</h1>
          <p className="text-gray-500">{error ?? 'This report link may have expired.'}</p>
        </div>
      </div>
    );
  }

  const { business } = report;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 mt-0.5">
            {business.city}, {business.state} · {business.category} · Local SEO Report
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Score cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: MapPin, label: 'Citation Score', value: null, ring: report.napScore, sub: `${report.napConsistent}/${report.napListings} consistent` },
            { icon: Search, label: 'Keywords', value: report.keywordCount, ring: null, sub: `${report.top10Keywords.length} in top 10` },
            { icon: FileText, label: 'GBP Posts (30d)', value: report.postsLast30Days, ring: null, sub: 'published' },
            { icon: Star, label: 'Avg Rating', value: report.avgRating > 0 ? report.avgRating.toFixed(1) : '—', ring: null, sub: `${report.reviewCount} reviews` },
          ].map(({ icon: Icon, label, value, ring, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center text-center">
              <Icon size={16} className="text-blue-500 mb-2" />
              <p className="text-xs text-gray-500 mb-2">{label}</p>
              {ring !== null ? (
                <ScoreRing value={ring} />
              ) : (
                <p className="text-4xl font-bold text-gray-900 my-2">{value}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Top keywords */}
        {report.top10Keywords.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Search size={16} className="text-blue-500" /> Top 10 Keyword Rankings
            </h2>
            <div className="space-y-2">
              {report.top10Keywords.map((kw, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {kw.current_rank}
                    </span>
                    <span className="text-sm text-gray-800">{kw.keyword}</span>
                  </div>
                  {kw.monthly_volume && (
                    <span className="text-xs text-gray-400">{kw.monthly_volume.toLocaleString()}/mo</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NAP health bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" /> Citation Consistency
          </h2>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${report.napScore >= 80 ? 'bg-green-500' : report.napScore >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                style={{ width: `${report.napScore}%` }}
              />
            </div>
            <span className="text-sm font-bold text-gray-900">{report.napScore}%</span>
          </div>
          <p className="text-sm text-gray-500">
            {report.napConsistent} of {report.napListings} business listings have consistent Name, Address &amp; Phone data.
            {report.napScore >= 80 ? (
              <span className="text-green-600 ml-1">Excellent NAP consistency — great for local rankings.</span>
            ) : (
              <span className="text-amber-600 ml-1">Fixing inconsistencies can improve local search visibility.</span>
            )}
          </p>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Report generated {new Date(report.generatedAt).toLocaleString()} · Powered by ContractorSEO
        </p>
      </div>
    </div>
  );
}
