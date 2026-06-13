import axios from 'axios';
import toast from 'react-hot-toast';
import { supabase } from './supabase';

const raw = import.meta.env.VITE_API_URL ?? '/api';
const baseURL = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;

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
