import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { Zap, ArrowLeft } from 'lucide-react';
import { PublicFooter } from '@/components/layout/PublicFooter';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-brand-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset password</h1>
          <p className="text-gray-400 mt-1">We'll send you a reset link</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium mb-2">Check your email</p>
              <p className="text-sm text-gray-500">We sent a reset link to <strong>{email}</strong></p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" className="w-full" loading={loading} size="lg">Send reset link</Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        </div>
        <PublicFooter />
      </div>
    </div>
  );
}
