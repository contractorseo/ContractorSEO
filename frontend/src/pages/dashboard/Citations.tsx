import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { User, Business, NapListing } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { MapPin, CheckCircle, XCircle, AlertCircle, HelpCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface Context { user: User; business: Business }

const STATUS_CONFIG = {
  consistent:   { label: 'Consistent',   variant: 'success' as const, icon: CheckCircle, color: 'text-green-600' },
  inconsistent: { label: 'Inconsistent', variant: 'warning' as const, icon: AlertCircle,  color: 'text-amber-600' },
  missing:      { label: 'Missing',      variant: 'danger'  as const, icon: XCircle,      color: 'text-red-600'   },
  unchecked:    { label: 'Unchecked',    variant: 'gray'    as const, icon: HelpCircle,   color: 'text-gray-400'  },
};

const DIRECTORY_URLS: Record<string, string> = {
  'Google Business Profile': 'https://business.google.com',
  'Yelp':          'https://biz.yelp.com',
  'Angi':          'https://www.angi.com',
  'HomeAdvisor':   'https://www.homeadvisor.com',
  'Thumbtack':     'https://www.thumbtack.com',
  'BBB':           'https://www.bbb.org',
  'Houzz':         'https://www.houzz.com',
  'Porch':         'https://porch.com',
  'Yellow Pages':  'https://www.yellowpages.com',
  'Bing Places':   'https://www.bingplaces.com',
  'Apple Maps':    'https://mapsconnect.apple.com',
  'Facebook':      'https://business.facebook.com',
  'Nextdoor':      'https://nextdoor.com/business',
  'Foursquare':    'https://foursquare.com/business',
  'MapQuest':      'https://www.mapquest.com',
};

export function Citations() {
  const { business } = useOutletContext<Context>();
  const [listings, setListings] = useState<NapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [issueModal, setIssueModal] = useState<NapListing | null>(null);
  const [issueText, setIssueText] = useState('');

  useEffect(() => {
    api.get(`/citations/${business.id}`).then(async (r) => {
      const rows = Array.isArray(r.data) ? r.data : [];
      if (rows.length === 0) {
        const { data: seeded } = await api.post(`/citations/seed/${business.id}`);
        setListings(Array.isArray(seeded) ? seeded : []);
      } else {
        setListings(rows);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
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

  async function handleSaveIssue() {
    if (!issueModal) return;
    await updateStatus(issueModal.id, 'inconsistent', issueText || 'NAP mismatch');
    setIssueModal(null);
    setIssueText('');
  }

  const consistent   = listings.filter((l) => l.status === 'consistent').length;
  const inconsistent = listings.filter((l) => l.status === 'inconsistent').length;
  const missing      = listings.filter((l) => l.status === 'missing').length;
  const unchecked    = listings.filter((l) => l.status === 'unchecked').length;
  const napScore     = listings.length ? Math.round((consistent / listings.length) * 100) : 0;

  const scoreColor = napScore >= 80 ? 'text-green-600' : napScore >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreLabel = napScore >= 80 ? 'Healthy' : napScore >= 50 ? 'Needs work' : 'Critical';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Citations</h1>
        <p className="text-gray-500 text-sm mt-0.5">Track NAP consistency across local directories. Open each directory, verify your Name, Address &amp; Phone match exactly, then mark the status.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500 mb-1">NAP Score</p>
          <p className={`text-3xl font-bold ${scoreColor}`}>{napScore}%</p>
          <p className={`text-xs mt-1 font-medium ${scoreColor}`}>{scoreLabel}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 mb-1">Consistent</p>
          <p className="text-3xl font-bold text-green-600">{consistent}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 mb-1">Inconsistent</p>
          <p className="text-3xl font-bold text-amber-600">{inconsistent}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 mb-1">Missing</p>
          <p className="text-3xl font-bold text-red-600">{missing}</p>
        </Card>
      </div>

      {unchecked > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-sm text-brand-800">
          <strong>{unchecked} directories unchecked.</strong> Open each link, verify your business info matches exactly, then update the status.
        </div>
      )}

      <Card padding="none">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="grid grid-cols-12 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <div className="col-span-4">Directory</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-5">Issue / Actions</div>
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
              const url = DIRECTORY_URLS[listing.directory_name];
              return (
                <div key={listing.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="col-span-4 flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{listing.directory_name}</span>
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  <div className="col-span-3">
                    <div className="flex items-center gap-1.5">
                      <Icon size={14} className={config.color} />
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                  </div>

                  <div className="col-span-5 flex items-center gap-2">
                    {listing.issue && listing.status !== 'consistent' && (
                      <span className="text-xs text-gray-500 truncate max-w-[120px]">{listing.issue}</span>
                    )}
                    <div className="flex gap-1 ml-auto">
                      {updating === listing.id ? (
                        <RefreshCw size={14} className="animate-spin text-gray-400" />
                      ) : (
                        <>
                          {listing.status !== 'consistent' && (
                            <button
                              onClick={() => updateStatus(listing.id, 'consistent')}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                            >
                              ✓ Consistent
                            </button>
                          )}
                          {listing.status !== 'missing' && (
                            <button
                              onClick={() => updateStatus(listing.id, 'missing')}
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                            >
                              Missing
                            </button>
                          )}
                          <button
                            onClick={() => { setIssueModal(listing); setIssueText(listing.issue ?? ''); }}
                            className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition-colors"
                          >
                            Issue
                          </button>
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

      <Modal open={!!issueModal} onClose={() => { setIssueModal(null); setIssueText(''); }} title="Describe the Issue">
        {issueModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              What's wrong with <strong>{issueModal.directory_name}</strong>? Describe the NAP mismatch so you can fix it later.
            </p>
            <Input
              label="Issue description"
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder="e.g. Wrong phone number, old address listed"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setIssueModal(null); setIssueText(''); }}>Cancel</Button>
              <Button onClick={handleSaveIssue}>Save issue</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
