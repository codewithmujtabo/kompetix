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
- Role-based: `student`, `parent`, `teacher`, `school_admin`, `admin`, `organizer` (organizer role not yet in DB — Sprint 1 Task 7).
- `GET /api/auth/me` is the user hydration endpoint on app startup.

### Database
- Schema is in `backend/src/db/schema.sql`.
- Tables: `users`, `students`, `parents`, `teachers`, `competitions`, `competition_rounds`, `registrations`, `payments`, `documents`, `notifications`, `otp_codes`, `invitations`, `parent_student_links`, `bulk_registration_jobs`, `favorites`, `schools`.
- Migrations live in `backend/migrations/` as timestamped `.sql` files. Run with `npm run db:migrate`.
- `DATABASE_URL` format: `postgresql://user:password@localhost:5432/beyond_classroom` (DB name still `beyond_classroom` — rename to `kompetix` eventually).

### Payments
- Midtrans Snap: `POST /api/payments/snap` creates a transaction and returns a `snap_token`.
- Webhook at `POST /api/payments/webhook` — verifies Midtrans signature before processing.
- Payment proof upload (manual, for bank transfer) via `POST /api/payments/:id/proof`.
- Sandbox keys are in `.env`. Switch to production keys before launch.
- **Known gap:** When VA expires, registration is left in limbo — needs fix (Sprint 3 Task 10).

### File Storage (Current — Needs Migration)
- Files stored locally in `backend/uploads/<uuid>/`.
- Served at `/api/uploads/<uuid>/<filename>`.
- **This will be lost on server restart/redeployment.** Sprint 6 migrates this to MinIO.
- `backend/src/services/storage.service.ts` is the abstraction layer — only this file needs updating for MinIO.

### Bulk Registration
- CSV upload → `POST /api/bulk-registration/upload` → creates a job in `bulk_registration_jobs`.
- Background cron (every 1 min) in `backend/src/services/bulk-processor.service.ts` processes pending jobs.
- **Known gaps (Sprint 0 Task 3):** bulk processor doesn't check competition fee, doesn't email temp password to new users, doesn't insert school_name for new students.

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
- `web/app/(dashboard)/dashboard/page.tsx` — Dashboard home (NOT at `/`, avoids route conflict)
- `web/app/page.tsx` — Root `/` redirects to `/dashboard`
- `web/app/login/page.tsx` — Admin login
- `web/lib/api/index.ts` — All API call functions
- `web/lib/auth/context.tsx` — Auth context with localStorage JWT
- `web/components/Sidebar.tsx` — Nav (uses `next/link` + `usePathname`, not React Router)
- `web/next.config.mjs` — API proxy config (`.ts` version not supported in Next.js 14 — keep `.mjs`)

### Historical Data (Not Yet Imported)
- 63,365 real participant records from past competitions (Excel file — NOT committed to repo).
- No NISN in the data. Identity matching: email (88.6% coverage) + WhatsApp (96.9%) + name+school.
- Sprint 4 handles the full import + claim system.

---

## Current Task Status (as of May 3, 2026)

**No implementation tasks started yet.** The plan below was created this session. Next session starts with Sprint 0.

### NEXT STEP TO START:
**Sprint 0, Task 1** — Rename app from "Beyond Classroom" to "Kompetix":
- `app/app.json`: change `name`, `slug` → `kompetix`, `scheme` → `kompetix`
- Search all screen files for string "Beyond Classroom" and replace
- `app/app/(auth)/register.tsx` line ~515: hardcoded `beyondclassroom.id/privacy` URL — update

**Run in parallel:** Sprint 1 Task 7 — Add `organizer` role (unblocks teammate fastest).

---

## Sprint Plan (Full Roadmap)

### SPRINT 0 — Quick Wins (2–3 days)
| Task | What | Files |
|---|---|---|
| T1 | Rename app "Beyond Classroom" → "Kompetix" | `app/app.json`, all screen files with hardcoded name |
| T2 | Remove admin screens from mobile — redirect admin users to web portal | `app/app/(tabs)/_layout.tsx`, admin-*.tsx screens |
| T3 | Fix bulk processor: check fee, email temp pwd, insert school_name | `backend/src/services/bulk-processor.service.ts` |
| T4 | Fix quota race condition in bulk processor | Same file — use `UPDATE ... RETURNING quota` |

### SPRINT 1 — Critical Backend Foundations (3–5 days)
| Task | What | Files |
|---|---|---|
| T5 | Add `registration_number` column (`KMP-2026-XXXXX`) | New migration + `registrations.routes.ts` |
| T6 | Add `profile_snapshot` JSONB column to registrations | New migration + `registrations.routes.ts` |
| T7 | Add `organizer` role + `organizers` table + `organizerOnly` middleware | New migration + `auth.routes.ts` + new middleware file |

### SPRINT 2 — Organizer Backend Routes (3–5 days) — UNBLOCKS TEAMMATE
| Task | What | Files |
|---|---|---|
| T8 | Build all 12 organizer endpoints | New file `backend/src/routes/organizer.routes.ts` |
| | GET /api/organizers/me | |
| | PUT /api/organizers/me | |
| | GET/POST /api/organizers/competitions | |
| | PUT /api/organizers/competitions/:id | |
| | POST /api/organizers/competitions/:id/publish | |
| | POST /api/organizers/competitions/:id/close | |
| | GET /api/organizers/competitions/:id/registrations | |
| | POST /api/organizers/registrations/:id/approve | |
| | POST /api/organizers/registrations/:id/reject | |
| | GET /api/organizers/competitions/:id/export | |
| | GET /api/organizers/revenue | |
| | Also: add `created_by UUID FK→users` column to competitions table | |

### SPRINT 3 — Payment Fixes (2–3 days)
| Task | What | Files |
|---|---|---|
| T9 | Post-payment JWT redirect endpoint | `payments.routes.ts`, add `redirect_token` to registrations, add `post_payment_redirect_url` to competitions |
| T10 | VA expiry: reset registration to `registered` so student can pay again | `payments.routes.ts` webhook handler |

### SPRINT 4 — Historical Data (5–7 days)
| Task | What | Files |
|---|---|---|
| T11 | Create `historical_participants` table migration | New migration file |
| T12 | Write Excel import script (normalize, deduplicate, bulk insert 63K rows) | `backend/src/db/import-historical.ts` (new) |
| T13 | Auto-link historical records at login (email match + phone match) | `auth.routes.ts` — in /me and /phone/verify-otp |
| T14 | Build claim system API (4 endpoints) | `backend/src/routes/historical.routes.ts` (new) |

### SPRINT 5 — Mobile Polish (3–5 days)
| Task | What | Files |
|---|---|---|
| T15 | Add "Recommended for you" section to competitions screen | `app/app/(tabs)/competitions.tsx` |
| T16 | Show registration_number badge on My Competitions cards | `app/app/(tabs)/my-competitions.tsx` |
| T17 | Show profile_snapshot + redirect button on registration detail | `app/app/(tabs)/my-registration-details.tsx` |
| T18 | New screen: Historical records in student profile | `app/app/(tabs)/profile/history.tsx` (new) |
| T19 | Teacher mobile cleanup — remove bulk CSV, add web banner | `app/app/(tabs)/teacher-actions.tsx` |
| T20 | Parent pay-for-child: add ownership validation in backend | `backend/src/routes/payments.routes.ts` |

### SPRINT 6 — File Storage Migration (2–3 days, before launch)
| Task | What | Files |
|---|---|---|
| T21 | Set up MinIO on VPS (Docker) | VPS setup |
| T22 | Migrate storage.service.ts to S3 SDK — switch multer to memoryStorage | `backend/src/services/storage.service.ts`, `payments.routes.ts`, `documents.routes.ts`, `users.routes.ts` |

### SPRINT 7 — Phase 2 (after Phase 1 launch)
| Task | What | Files |
|---|---|---|
| T23 | school_payment_batches table + bulk pay endpoint | New migration + `payments.routes.ts` |
| T24 | Add referral_code column to registrations | New migration + `registrations.routes.ts` |
| T25 | Admin refund endpoint | `admin.routes.ts` |

### Dependency Map
```
T5 (reg_number) ──────────► T16 (mobile shows it)
T6 (profile_snapshot) ────► T17 (mobile shows it)
T7 (organizer role) ──────► T8 (organizer routes) ──► teammate can build portal
T9 (JWT redirect) ────────► T17 (mobile redirect button)
T11 (DB table) ──► T12 (import) ──► T13 (auto-link) ──► T14 (claim API) ──► T18 (mobile history)
T21 (MinIO) ──────────────► T22 (storage migration)
```

### Week-by-Week Schedule
| Week | Dates | Sprint | Key Deliverable |
|---|---|---|---|
| 1 | May 5–11 | 0 + 1 | App renamed, admin removed from mobile, reg_number, profile_snapshot, organizer role |
| 2 | May 12–18 | 2 | All 12 organizer endpoints → teammate unblocked |
| 3 | May 19–25 | 3 + 4 setup | Payment fixes, historical table + import script |
| 4 | May 26–Jun 1 | 4 complete | Auto-link, claim API, historical mobile screen |
| 5 | Jun 2–8 | 5 | Mobile polish — recommendations, reg numbers, history, teacher cleanup |
| 6 | Jun 9–15 | 6 | MinIO migration |
| 7–8 | Jun 16–30 | Integration + QA | End-to-end testing with teammate's web portals |
| Buffer | Jul 1–10 | Launch prep | App Store submission, production keys |

---

## Known Issues / Quirks

- `next.config.ts` exists in `web/` alongside `next.config.mjs` — the `.ts` one is inert (ignored by Next.js 14) but should be deleted eventually.
- `web/tsconfig.tsbuildinfo` is committed — it's a build cache file. Add to `.gitignore` eventually.
- `app/constants/api.ts` and `app/config/api.ts` both exist — app uses `config/api.ts`. The constants one is legacy.
- Competition `id` column is `TEXT` (not UUID) — changed in migration `1744070500000`. IDs look like `comp_emc_2026_main`.
- The `students` and `parents` tables have orphaned `parent_school_id` columns (Sprint 7 to drop).
- DB name is still `beyond_classroom` — should be renamed to `kompetix` before production.

---

## Session Workflow

- Tasks tracked in `docs/PROJECT_PLAN.md` — update status there as work completes.
- Commit after each logical unit of work with a descriptive message.
- Before context runs out: ask Claude to summarize session and update this CLAUDE.md.
- When starting fresh: read this file + `git log --oneline -10` + `git status` to orient.
