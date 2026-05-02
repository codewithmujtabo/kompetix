# Kompetix — Claude Project Brief

Indonesia's unified K-12 academic competition platform. Students, parents, teachers, and organizers all in one place. Replaces fragmented per-competition websites (EMC, ISPO, OSEBI, Komodo, Owlypia, etc.).

**GitHub:** https://github.com/codewithmujtabo/kompetix  
**Phase 1 deadline:** July 10, 2026  
**Owner split:** Mujtabo → mobile app (`app/`) + backend (`backend/`). Teammate → web portals (`web/`).

---

## Monorepo Structure

```
kompetix/
├── app/          React Native (Expo) — student, parent, teacher (light)
├── web/          Next.js 14 App Router — admin, organizer, school, rep, referral portals
├── backend/      Express.js 5 + PostgreSQL — shared API for both app and web (port 3000)
├── docs/         PROJECT_PLAN.md (task board) + PROJECT_PLAN.docx
└── package.json  Root convenience scripts
```

**There is no separate backend for the web. Both app and web call the same Express backend on port 3000.**

---

## How to Run

```bash
# From each subdirectory:
cd backend && npm run dev        # Express backend — port 3000
cd web     && npm run dev        # Next.js web — port 3001
cd app     && npm start          # Expo mobile — opens Expo dev tools

# Or from the monorepo root:
npm run backend
npm run web
npm run app

# Install all deps at once:
npm run install:all
```

**Web `.env.local`** (`web/.env.local`):
```
BACKEND_URL=http://localhost:3000
```

**App `.env.local`** (`app/.env.local`):
```
EXPO_PUBLIC_API_URL=http://<MAC_LAN_IP>:3000/api
```
> The Mac's LAN IP changes when reconnecting to WiFi. Run `ipconfig getifaddr en0` to get the current IP and update this file. For iOS Simulator only, `http://localhost:3000/api` works.

**Backend `.env`** (`backend/.env`) — not committed. Copy from `backend/.env.example`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo SDK 52 + TypeScript + Expo Router (file-based) |
| Web | Next.js 14 App Router + TypeScript |
| Backend | Express.js 5 + TypeScript + node-pg (raw SQL, no ORM) |
| Database | PostgreSQL — self-hosted on VPS |
| Auth | JWT (7-day) + Email OTP + Phone OTP via Twilio |
| Payments | Midtrans Snap (GoPay, OVO, Dana, Bank VA, QRIS) |
| File storage | Currently local disk `/backend/uploads/` → needs MinIO migration |
| Push notifications | Expo Push Service |
| Email | Nodemailer (SMTP / Gmail) |
| Regions data | Static JSON from emsifa.com (called directly from app, not proxied) |
| School search | api.co.id (requires `API_CO_ID_KEY`) — falls back to DB when key not set |

---

## Rules — Always Follow

1. **Never propose Supabase, Neon, RDS, PlanetScale, or any managed DBaaS.** Self-hosted PostgreSQL on VPS only.
2. **Never use an ORM.** Raw SQL with `node-pg` (`pool.query()`). Migrations are plain `.sql` files in `backend/migrations/`.
3. **All web pages must have `'use client'`** if they use React state, hooks, or browser APIs. Next.js App Router defaults to Server Components.
4. **Web calls backend via Next.js rewrite** (`/api/*` → `http://localhost:3000/api/*`). Never hardcode backend URLs in web code — always use relative `/api/...` paths.
5. **Backend routes follow REST conventions.** Admin routes are under `/api/admin/`. Organizer routes under `/api/organizers/`. Never expose admin endpoints without `adminOnly` middleware.
6. **No TypeScript `any` in new code** unless there is truly no alternative (e.g. third-party payloads).
7. **Phone numbers are always normalized to E.164 (`+62...`)** before storing. Use `toE164()` in `twilio.service.ts`.
8. **Dev OTP bypass:** When `TWILIO_VERIFY_SID` is not set, phone OTP is bypassed and the code `000000` always works. Email OTP uses a real SMTP server even in dev.

---

## Important Codebase Context

### Authentication
- JWT stored in `SecureStore` on mobile (via `token.service.ts`), `localStorage` on web.
- Web uses keys `admin_token` / `admin_user` in localStorage.
- Role-based: `student`, `parent`, `teacher`, `school_admin`, `admin`, `organizer` (organizer role not yet created — task #6).
- `GET /api/auth/me` is the user hydration endpoint on app startup.

### Database
- Schema is in `backend/src/db/schema.sql`.
- Tables: `users`, `students`, `parents`, `teachers`, `competitions`, `competition_rounds`, `registrations`, `payments`, `documents`, `notifications`, `otp_codes`, `invitations`, `parent_student_links`, `bulk_registration_jobs`, `favorites`, `schools`.
- Migrations live in `backend/migrations/` as timestamped `.sql` files. Run with `npm run db:migrate`.
- `DATABASE_URL` format: `postgresql://user:password@localhost:5432/beyond_classroom` (note: DB name is still `beyond_classroom` from the original project — rename to `kompetix` eventually).

### Payments
- Midtrans Snap: `POST /api/payments/snap` creates a transaction and returns a `snap_token`.
- Webhook at `POST /api/payments/webhook` — verifies Midtrans signature before processing.
- Payment proof upload (manual, for bank transfer) via `POST /api/payments/:id/proof`.
- Sandbox keys are in `.env`. Switch to production keys before launch.

### File Storage (Current — Needs Migration)
- Files stored locally in `backend/uploads/<uuid>/`.
- Served at `/api/uploads/<uuid>/<filename>`.
- **This will be lost on server restart/redeployment.** Task #1 is to migrate to MinIO.
- `backend/src/services/storage.service.ts` is the abstraction layer — only this file needs updating for MinIO.

### Bulk Registration
- CSV upload → `POST /api/bulk-registration/upload` → creates a job in `bulk_registration_jobs`.
- Background cron (every 1 min) in `backend/src/services/bulk-processor.service.ts` processes pending jobs.
- Uses `SELECT ... FOR UPDATE SKIP LOCKED` to prevent concurrent conflicts (task #17 to implement).
- Auto-creates student accounts with a random temp password (crypto.randomBytes, not "password123").

### Parent-Student Linking
- Teacher/parent sends invite → `POST /api/parents/invite` → generates 6-digit PIN → emails student.
- Student accepts → `POST /api/parents/accept-invitation` with PIN.
- Links stored in `parent_student_links` table.
- Debug PIN endpoint (`GET /api/parents/debug-pin/:userId`) blocked in production.

### Regions (Province/City)
- App calls emsifa.com **directly** (not through backend) with in-memory cache.
- `app/services/regions.service.ts` — provinces and regencies cached for the session.
- Backend still has `GET /api/regions/provinces` and `GET /api/regions/regencies/:code` but the app no longer uses them.

### School Search on Signup
- Calls `GET /api/schools/search?name=...&regencyCode=...`
- Uses api.co.id when `API_CO_ID_KEY` is set.
- Falls back to querying the local `schools` DB table when key is not set (returns up to 20 matches by name).

### Web Portal Structure
- `web/app/(dashboard)/` — Admin portal (auth-guarded by `(dashboard)/layout.tsx`)
- `web/app/(dashboard)/dashboard/page.tsx` — Dashboard home (NOT at `/`, to avoid conflict with root `page.tsx`)
- `web/app/page.tsx` — Root `/` redirects to `/dashboard`
- `web/app/login/page.tsx` — Admin login
- `web/lib/api/index.ts` — All API call functions
- `web/lib/auth/context.tsx` — Auth context with localStorage JWT
- `web/components/Sidebar.tsx` — Nav (uses `next/link` + `usePathname`, not React Router)
- `web/next.config.mjs` — API proxy config (`.ts` version causes error in Next.js 14 — use `.mjs`)

### Historical Data (Not Yet Imported)
- 63,365 real participant records from past competitions (Excel file — NOT committed to repo).
- No NISN in the data. Identity matching: email (88.6% coverage) + WhatsApp (96.9%) + name+school.
- Import tasks #11–#14 in PROJECT_PLAN.md.

---

## Current Task Status (as of May 3, 2026)

All tasks are **☐ To Do** — no Phase 1 tasks completed yet. Priority order to start:

**Backend (Mujtabo):**
1. Task #8 — Rename "Beyond Classroom" → "Kompetix" in app (quick win)
2. Task #9 — Remove admin screens from mobile app
3. Task #6 — Add `organizer` role to backend auth
4. Task #5 — Build organizer backend routes (12 endpoints, see API contract in PROJECT_PLAN.md)
5. Task #1 — Migrate file storage to MinIO
6. Task #2 — Add `registration_number` (`KMP-2026-XXXXX`)
7. Task #3 — Add `profile_snapshot` to registrations

**Web (Teammate):**
1. Task #1 — Verify all existing admin pages work
2. Task #4 — Stats dashboard (replace link grid)
3. Task #2 + #3 — Registration approvals page + detail
4. Task #6 + #7 — Organizer portal auth + dashboard skeleton

---

## Known Issues / Quirks

- `next.config.ts` is **not supported** in Next.js 14 — use `next.config.mjs`. Both files currently exist in `web/` — the `.ts` one is inert but should be deleted.
- `web/tsconfig.tsbuildinfo` is committed — it's a build cache file. Add to `.gitignore` eventually.
- `app/constants/api.ts` and `app/config/api.ts` both exist — the app uses `config/api.ts`. The constants one is legacy.
- Competition `id` column is `TEXT` (not UUID or integer) — it was changed in migration `1744070500000`. IDs look like `comp_emc_2026_main`.
- The `students` and `parents` tables have `parent_school_id` columns that are orphaned (task #29 to drop).

---

## Session Workflow

- Tasks tracked in `docs/PROJECT_PLAN.md` — update status there as work completes.
- Commit after each logical unit of work with a descriptive message.
- Before context runs out: ask Claude to summarize session and update this CLAUDE.md.
- When starting fresh: read this file + `git log --oneline -10` + `git status` to orient.
