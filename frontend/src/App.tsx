import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Login } from '@/pages/auth/Login';
import { Signup } from '@/pages/auth/Signup';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { Onboarding } from '@/pages/onboarding/Onboarding';
import { Overview } from '@/pages/dashboard/Overview';
import { Posts } from '@/pages/dashboard/Posts';
import { Reviews } from '@/pages/dashboard/Reviews';
import { Keywords } from '@/pages/dashboard/Keywords';
import { Competitors } from '@/pages/dashboard/Competitors';
import { Citations } from '@/pages/dashboard/Citations';
import { Settings } from '@/pages/dashboard/Settings';
import { Report } from '@/pages/dashboard/Report';
import { ContentStudio } from '@/pages/dashboard/ContentStudio';
import { AIVisibility } from '@/pages/dashboard/AIVisibility';
import { PublicReport } from '@/pages/public/PublicReport';
import { Pricing } from '@/pages/public/Pricing';
import { Landing } from '@/pages/public/Landing';
import { PrivacyPolicy } from '@/pages/legal/PrivacyPolicy';
import { TermsOfService } from '@/pages/legal/TermsOfService';
import { NotFound } from '@/pages/NotFound';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="posts" element={<Posts />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="keywords" element={<Keywords />} />
            <Route path="competitors" element={<Competitors />} />
            <Route path="citations" element={<Citations />} />
            <Route path="content-studio" element={<ContentStudio />} />
            <Route path="ai-visibility" element={<AIVisibility />} />
            <Route path="settings" element={<Settings />} />
            <Route path="report" element={<Report />} />
          </Route>

          <Route path="/report/:token" element={<PublicReport />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
