import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { User, Business, Review, ReviewRequest } from '@/types';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Star, Send, MessageSquare, Phone, Sparkles, CheckCircle } from 'lucide-react';

interface Context { user: User; business: Business }

export function Reviews() {
  const { business } = useOutletContext<Context>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [showRespond, setShowRespond] = useState<Review | null>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [savingResponse, setSavingResponse] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const [requestForm, setRequestForm] = useState({ customerName: '', phone: '', jobType: '' });

  useEffect(() => {
    api.get(`/reviews/${business.id}`)
      .then((r) => { setReviews(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [business.id]);

  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : '0.0';
  const unresponded = reviews.filter((r) => !r.responded).length;
  const ratingCounts = [5,4,3,2,1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));

  async function handleSendRequest() {
    if (!requestForm.customerName || !requestForm.phone || !requestForm.jobType) {
      toast.error('All fields required'); return;
    }
    setSendingRequest(true);
    try {
      await api.post('/reviews/request', {
        businessId: business.id,
        customerName: requestForm.customerName,
        phone: requestForm.phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '+1$1$2$3'),
        jobType: requestForm.jobType,
        reviewLink: `https://g.page/r/${business.id}/review`,
      });
      toast.success(`Review request sent to ${requestForm.customerName}!`);
      setShowRequest(false);
      setRequestForm({ customerName: '', phone: '', jobType: '' });
    } catch {
      toast.error('Failed to send SMS. Check Twilio config.');
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleGenerateResponse(review: Review) {
    setGeneratingResponse(true);
    try {
      const { data } = await api.post('/reviews/respond', {
        reviewId: review.id,
        businessId: business.id,
      });
      setAiResponse(data.response);
    } catch {
      toast.error('Generation failed');
    } finally {
      setGeneratingResponse(false);
    }
  }

  async function handleSaveResponse() {
    if (!showRespond || !aiResponse) return;
    setSavingResponse(true);
    try {
      const { data } = await api.put(`/reviews/${showRespond.id}/response`, { response_text: aiResponse });
      setReviews((r) => r.map((rev) => rev.id === showRespond.id ? data : rev));
      toast.success('Response saved!');
      setShowRespond(null);
      setAiResponse('');
    } catch {
      toast.error('Failed to save response');
    } finally {
      setSavingResponse(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage and respond to customer reviews</p>
        </div>
        <Button onClick={() => setShowRequest(true)}>
          <Send size={16} /> Request review
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500 mb-2">Average rating</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-amber-500">{avgRating}</span>
            <Star size={20} className="text-amber-400 fill-amber-400 mb-1" />
          </div>
          <p className="text-xs text-gray-400 mt-1">{reviews.length} total reviews</p>
        </Card>

        <Card className="col-span-2">
          <p className="text-sm text-gray-500 mb-3">Rating breakdown</p>
          <div className="space-y-1.5">
            {ratingCounts.map(({ n, count }) => (
              <div key={n} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4">{n}</span>
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-4">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {unresponded > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <MessageSquare size={16} className="text-amber-600" />
          <p className="text-sm text-amber-800">{unresponded} review{unresponded > 1 ? 's' : ''} waiting for a response</p>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          [1,2,3].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)
        ) : reviews.length === 0 ? (
          <Card className="text-center py-12">
            <Star size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No reviews yet</p>
            <p className="text-sm text-gray-400 mb-4">Send your first review request to a recent customer</p>
            <Button onClick={() => setShowRequest(true)}><Send size={16} /> Request review</Button>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} padding="sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {review.reviewer_name[0]}
                    </div>
                    <span className="font-medium text-sm text-gray-900">{review.reviewer_name}</span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13} className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(review.date)}</span>
                    {review.responded && <Badge variant="success"><CheckCircle size={11} className="mr-0.5" /> Responded</Badge>}
                    {!review.responded && <Badge variant="warning">Needs reply</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{review.text}</p>
                  {review.responded && review.response_text && (
                    <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 text-sm text-gray-600">
                      <p className="text-xs font-medium text-brand-700 mb-1">Your response:</p>
                      {review.response_text}
                    </div>
                  )}
                </div>
                {!review.responded && (
                  <Button variant="secondary" size="sm" onClick={() => { setShowRespond(review); setAiResponse(''); }}>
                    <MessageSquare size={14} /> Respond
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={showRequest} onClose={() => setShowRequest(false)} title="Send Review Request">
        <div className="space-y-4">
          <Input label="Customer name" value={requestForm.customerName} onChange={(e) => setRequestForm((f) => ({ ...f, customerName: e.target.value }))} placeholder="John Smith" />
          <Input label="Phone number" type="tel" value={requestForm.phone} onChange={(e) => setRequestForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(214) 555-0100" />
          <Input label="Job type" value={requestForm.jobType} onChange={(e) => setRequestForm((f) => ({ ...f, jobType: e.target.value }))} placeholder="e.g. Panel upgrade, AC repair" />
          <p className="text-xs text-gray-500">A text message will be sent asking for a Google review.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRequest(false)}>Cancel</Button>
            <Button onClick={handleSendRequest} loading={sendingRequest}><Send size={14} /> Send SMS</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showRespond} onClose={() => { setShowRespond(null); setAiResponse(''); }} title="Write Response" size="lg">
        {showRespond && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{showRespond.reviewer_name}</span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < showRespond.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">{showRespond.text}</p>
            </div>

            <Button variant="secondary" onClick={() => handleGenerateResponse(showRespond)} loading={generatingResponse} className="w-full">
              <Sparkles size={15} /> Generate AI response
            </Button>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Your response</label>
              <textarea
                value={aiResponse}
                onChange={(e) => setAiResponse(e.target.value)}
                rows={5}
                placeholder="Write your response here..."
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowRespond(null); setAiResponse(''); }}>Cancel</Button>
              <Button onClick={handleSaveResponse} loading={savingResponse} disabled={!aiResponse}>Save response</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
