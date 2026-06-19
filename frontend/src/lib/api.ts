import axios from 'axios';
import toast from 'react-hot-toast';
import { supabase } from './supabase';

// Strip BOM, then strip any trailing /api so route paths (/api/...) never double up
// regardless of whether VITE_API_URL was set with or without the /api suffix.
const raw = (import.meta.env.VITE_API_URL ?? '') as string;
const baseURL = raw.charCodeAt(0) === 0xFEFF
  ? raw.slice(1).replace(/\/api\/?$/, '')
  : raw.replace(/\/api\/?$/, '');

const api = axios.create({ baseURL });

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.error;

    if (status === 402 && message) {
      toast.error(message, { duration: 5000, icon: '⚡' });
    }

    return Promise.reject(err);
  }
);

export default api;
