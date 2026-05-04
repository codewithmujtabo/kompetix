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

### Historical Data (IMPORTED ✅)
- 63,365 real participant records imported into `historical_participants` table.
- Excel file lives at `/Users/mujtabo/Desktop/All/Internship Eduversal/beyond-classroom/Eduversal_Database.xlsx` — NOT in the repo.
- Identity matching: email (88.6% coverage) + WhatsApp/phone (96.9% coverage).
- Auto-link fires at login (`/me` and `/phone/verify-otp`) — matches email OR phone, skips if already linked.
- Manual claim via `GET /api/historical/search` + `POST /api/historical/:id/claim`.
- Mobile: `app/app/(tabs)/profile/history.tsx` — "My Records" tab + "Find & Claim" tab.

### File Storage
- **Dev (default):** local disk `backend/uploads/<userId>/`, served as static by Express.
- **Production (MinIO):** set `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_URL` in `backend/.env`. The code automatically switches to S3 when these are set.
- All three upload routes (users, documents, payments) now use `multer.memoryStorage()` + `storeFile()` from `storage.service.ts`.
- T21 (MinIO Docker on VPS) is the only remaining infrastructure step before production storage works.

---

## Current Task Status (as of May 4, 2026)

**Sprints 0–7 fully complete (T1–T25). All backend tasks done.**

### NEXT STEP TO START:
**Sprint 7 complete (T23–T25 done).** All planned backend tasks finished.
Next work is integration + QA with teammate's web portals (weeks 7–8).

**Also pending (VPS, do manually):**
- **T21** — MinIO Docker on VPS: `docker run -d -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=... -e MINIO_ROOT_PASSWORD=... quay.io/minio/minio server /data --console-address :9001`, then set the 5 `MINIO_*` env vars in `backend/.env`.

---

## Sprint Plan (Full Roadmap)

### SPRINT 0 — Quick Wins ✅ COMPLETE
| Task | Status | What |
|---|---|---|
| T1 | ✅ | Rename app "Beyond Classroom" → "Kompetix" |
| T2 | ✅ | Remove admin screens from mobile — redirect admin users to web portal |
| T3 | ✅ | Fix bulk processor: check fee, email temp pwd, insert school_name |
| T4 | ✅ | Fix quota race condition in bulk processor |

### SPRINT 1 — Critical Backend Foundations ✅ COMPLETE
| Task | Status | What |
|---|---|---|
| T5 | ✅ | Add `registration_number` column (`KMP-2026-XXXXX`) |
| T6 | ✅ | Add `profile_snapshot` JSONB column to registrations |
| T7 | ✅ | Add `organizer` role + `organizers` table + `organizerOnly` middleware |

### SPRINT 2 — Organizer Backend Routes ✅ COMPLETE
| Task | Status | What |
|---|---|---|
| T8 | ✅ | All 12 organizer endpoints in `backend/src/routes/organizer.routes.ts` |

### SPRINT 3 — Payment Fixes ✅ COMPLETE
| Task | Status | What |
|---|---|---|
| T9 | ✅ | Post-payment JWT redirect endpoint (`GET /api/payments/redirect/:registrationId`) |
| T10 | ✅ | VA expiry: reset registration to `registered` on webhook expire event |

### SPRINT 4 — Historical Data ✅ COMPLETE (data imported)
| Task | Status | What |
|---|---|---|
| T11 | ✅ | `historical_participants` table migration — deployed |
| T12 | ✅ | Excel import script — 63,365 records imported into DB |
| T13 | ✅ | Auto-link at login (email + phone match, fire-and-forget) |
| T14 | ✅ | Claim system API: GET /my-records, GET /search, POST /:id/claim, POST /:id/unclaim |

### SPRINT 5 — Mobile Polish ✅ COMPLETE
| Task | Status | What |
|---|---|---|
| T15 | ✅ | "Recommended for you" horizontal scroll in competitions screen (was already implemented) |
| T16 | ✅ | `KMP-2026-XXXXX` badge on My Competitions cards |
| T17 | ✅ | Profile snapshot section + "Open Competition Platform" redirect button in competition hub |
| T18 | ✅ | New screen `profile/history.tsx` — My Records tab + Find & Claim tab |
| T19 | ✅ | Teacher actions: removed in-app bulk CSV, added web portal banner |
| T20 | ✅ | `canAccessRegistration()` in payments.routes.ts — parents can pay for linked children |

### SPRINT 6 — File Storage Migration ✅ CODE COMPLETE (T21 VPS pending)
| Task | Status | What |
|---|---|---|
| T21 | ⏳ VPS manual | MinIO Docker setup on VPS — see instructions in NEXT STEP section above |
| T22 | ✅ | `storage.service.ts` rewritten with S3/local dual-mode; multer → memoryStorage in all 3 upload routes |

### SPRINT 7 — Phase 2 (after Phase 1 launch)
| Task | Status | What | Files |
|---|---|---|---|
| T23 | ✅ | school_payment_batches table + bulk pay endpoint | `1746300000000_school-payment-batches.sql` + `payments.routes.ts` |
| T24 | ✅ | Add referral_code column to registrations | `1746400000000_add-referral-code.sql` + `registrations.routes.ts` |
| T25 | ✅ | Admin refund endpoint | `midtrans.service.ts` + `admin.routes.ts` |

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
