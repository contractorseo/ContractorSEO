import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { User, Business, NapListing } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { MapPin, CheckCircle, XCircle, AlertCircle, HelpCircle, RefreshCw } from 'lucide-react';

interface Context { user: User; business: Business }

const STATUS_CONFIG = {
  consistent: { label: 'Consistent', variant: 'success' as const, icon: CheckCircle, color: 'text-green-600' },
  inconsistent: { label: 'Inconsistent', variant: 'warning' as const, icon: AlertCircle, color: 'text-amber-600' },
  missing: { label: 'Missing', variant: 'danger' as const, icon: XCircle, color: 'text-red-600' },
  unchecked: { label: 'Unchecked', variant: 'gray' as const, icon: HelpCircle, color: 'text-gray-400' },
};

export function Citations() {
  const { business } = useOutletContext<Context>();
  const [listings, setListings] = useState<NapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/citations/${business.id}`).then(async (r) => {
      if (r.data.length === 0) {
        const { data: seeded } = await api.post(`/citations/seed/${business.id}`);
        setListings(seeded);
      } else {
        setListings(r.data);
      }
      setLoading(false);
    });
  }, [business.id]);

  async function updateStatus(id: string, status: NapListing['status'], issue?: string) {
    setUpdating(id);
    try {
      const { data } = await api.put(`/citations/${id}`, { status, issue: issue ?? null });
      setListings((l) => l.map((listing) => listing.id === id ? data : listing));
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdating(null);
    }
  }

  const consistent = listings.filter((l) => l.status === 'consistent').length;
  const inconsistent = listings.filter((l) => l.status === 'inconsistent').length;
  const missing = listings.filter((l) => l.status === 'missing').length;
  const napScore = listings.length ? Math.round((consistent / listings.length) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citations</h1>
          <p className="text-gray-500 text-sm mt-0.5">NAP consistency across local directories</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500 mb-1">NAP Score</p>
          <p className={`text-3xl font-bold ${napScore >= 80 ? 'text-green-600' : napScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {napScore}%
          </p>
        </Card>
        <Card><p className="text-sm text-gray-500 mb-1">Consistent</p><p className="text-3xl font-bold text-green-600">{consistent}</p></Card>
        <Card><p className="text-sm text-gray-500 mb-1">Inconsistent</p><p className="text-3xl font-bold text-amber-600">{inconsistent}</p></Card>
        <Card><p className="text-sm text-gray-500 mb-1">Missing</p><p className="text-3xl font-bold text-red-600">{missing}</p></Card>
      </div>

      <Card padding="none">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="grid grid-cols-12 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <div className="col-span-5">Directory</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-4">Issue / Action</div>
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {listings.map((listing) => {
              const config = STATUS_CONFIG[listing.status];
              const Icon = config.icon;
              return (
                <div key={listing.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="col-span-5 flex items-center gap-2">
                    <MapPin size={15} className="text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{listing.directory_name}</span>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-1.5">
                      <Icon size={14} className={config.color} />
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    {listing.issue && <span className="text-xs text-gray-500 truncate">{listing.issue}</span>}
                    <div className="flex gap-1 ml-auto">
                      {listing.status !== 'consistent' && (
                        <button
                          onClick={() => updateStatus(listing.id, 'consistent')}
                          disabled={updating === listing.id}
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          {updating === listing.id ? <RefreshCw size={12} className="animate-spin" /> : '✓ Fix'}
                        </button>
                      )}
                      {listing.status === 'unchecked' && (
                        <>
                          <button onClick={() => updateStatus(listing.id, 'missing')} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">Missing</button>
                          <button onClick={() => updateStatus(listing.id, 'inconsistent', 'NAP mismatch')} className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded hover:bg-amber-100">Issue</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
