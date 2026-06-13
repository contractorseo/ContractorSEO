import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

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

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
