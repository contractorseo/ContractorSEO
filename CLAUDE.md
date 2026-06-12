# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (Vite dev server on :5173, proxies /api → :4000)
cd frontend && npm run dev
cd frontend && npm run typecheck
cd frontend && npm run build

# Backend (Express on :4000, nodemon hot reload)
cd backend && npm run dev
cd backend && npm run typecheck
cd backend && npm run build

# From root
npm run dev:frontend
npm run dev:backend
npm run typecheck
```

## Architecture

Monorepo with two packages: `frontend/` and `backend/`.

**frontend/** — Vite + React 18 + TypeScript + Tailwind CSS + React Router  
- `src/lib/supabase.ts` — Supabase browser client  
- `src/lib/api.ts` — Axios instance that auto-injects Supabase JWT as Bearer token  
- `src/hooks/useAuth.ts` — Session + profile state; reads `users` table  
- `src/hooks/useBusiness.ts` — Fetches first business for current user  
- `src/components/layout/DashboardLayout.tsx` — Outlet wrapper; redirects unauthenticated → `/login`, no-business → `/onboarding`  
- All dashboard pages use `useOutletContext<{ user: User; business: Business }>()` for context

**backend/** — Express + TypeScript, compiled to `dist/`  
- Auth: `src/middleware/auth.ts` — validates Supabase JWT via `getUser(token)`, attaches `req.user`  
- All routes except `/api/stripe/webhook` require `requireAuth` middleware  
- Stripe webhook uses raw body (`express.raw`) — must stay before `express.json()`  
- `src/services/ai.ts` — Claude `claude-sonnet-4-20250514` for post generation, review responses, keyword suggestions  
- `src/services/twilio.ts` — SMS review requests  
- `src/services/stripe.ts` — checkout sessions, customer portal, webhook handling

**Database** — Supabase Postgres  
- Schema in `supabase/migrations/001_initial_schema.sql`  
- All tables have RLS enabled; policies enforce `user_id = auth.uid()` via business ownership chain  
- Auth trigger `on_auth_user_created` auto-inserts into `public.users` on signup (14-day trial)

## Environment variables

`frontend/.env.local` — copy from `frontend/.env.example`  
`backend/.env` — copy from `backend/.env.example`

## Key patterns

- Path alias `@/` maps to `frontend/src/`  
- Tailwind brand colors: `brand-{50..950}` (blue scale)  
- UI primitives in `frontend/src/components/ui/` — Button, Input, Card, Badge, Modal, Select  
- Toast notifications via `react-hot-toast` (`import toast from 'react-hot-toast'`)  
- All API calls go through `src/lib/api.ts` (not direct fetch); Vite proxies `/api/*` to backend in dev
