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
- Tables: `users`, `students`, `parents`, `teachers`, `competitions`, `competition_rounds`, `registrations`, `payments`, `documents`, `notifications`, `otp_codes`, `invitations`, `parent_student_links`, `teacher_student_links`, `bulk_registration_jobs`, `favorites`, `schools`, `historical_participants`, `school_payment_batches`, `school_payment_batch_items`.
- Migrations live in `backend/migrations/` as timestamped `.sql` files. Run with `npm run db:migrate`.
- `DATABASE_URL` format: `postgresql://user:password@localhost:5432/kompetix` (**renamed from `beyond_classroom` on May 6, 2026 — local DB is already renamed**).
- **Latest migration:** `1746500000000_teacher-student-links.sql` — must be run on VPS.
- **students table school column:** The column is `school_name TEXT` (not `school`). There is also a `school_id UUID` FK to the `schools` table. Always use `COALESCE(sc.name, s.school_name)` with a `LEFT JOIN schools sc ON s.school_id = sc.id` when you need the school name in queries.

### Registration Flow (updated May 2026)
1. Student registers → status = `pending_approval`
2. Admin approves on web (`/registrations` page) → status = `registered` (paid comp) or `paid` (free comp)
3. Student gets push notification to pay
4. Student pays via Midtrans Snap → webhook fires → status = `paid` automatically
5. No manual proof upload — Midtrans webhook is the only confirmation mechanism

### Payments
- Midtrans Snap: `POST /api/payments/snap` creates a transaction and returns a `snap_token`.
- Snap is blocked with 400 if registration is still `pending_approval` (not yet admin-approved).
- Webhook at `POST /api/payments/webhook` — verifies Midtrans signature, marks `registrations.status = 'paid'` on settlement.
- **Payment proof upload has been removed** — Midtrans auto-confirms.
- VA expiry: webhook `expire` event resets registration back to `registered` (T10 fix).
- **Verify endpoint:** `GET /api/payments/verify/:registrationId` — calls Midtrans Status API directly and force-updates DB to `paid` when settled. Used by the app after browser close to sync status without relying on the webhook (which can't reach localhost in sandbox). In production the webhook still handles it; verify is a belt-and-suspenders backup.
- `pay.tsx` always calls verify after the payment browser closes (both "Return to merchant" and user-dismiss paths). Only shows "Payment Completed!" when DB confirms `paid`. Polls up to 6× with 3s gaps (~18s total).
- Sandbox keys are in `.env`. Switch to production keys before launch.

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
- Student sends invite to parent email → `POST /api/parents/invite-parent` → generates 6-digit PIN → emails parent.
- Parent accepts → `POST /api/parents/accept-invitation` with PIN.
- Links stored in `parent_student_links` table.
- Debug PIN endpoint (`GET /api/parents/debug-pin/:userId`) blocked in production.

### Teacher-Student Roster (added May 2026)
- Teacher explicitly links students they supervise — no automatic school-based scoping.
- `POST /api/teachers/link-student` — teacher adds student by email (direct link, no PIN).
- `DELETE /api/teachers/link-student/:studentId` — remove from roster.
- Links stored in `teacher_student_links` table (migration `1746500000000_teacher-student-links.sql` — **already applied locally and on VPS**).
- **All teacher dashboard data is scoped to linked students only** — `GET /api/teachers/my-students`, `GET /api/teachers/my-competitions`, `GET /api/teachers/dashboard-summary`.
- App: `teacher-students.tsx` → manage roster; `teacher-analytics.tsx` → competitions my students joined.
- Teacher portal is **monitoring-only** — no bulk registration or bulk payment actions from the app. All write operations go through the web portal or admin.

### Profile Edit (role-aware, updated May 2026)
- `app/app/(tabs)/profile/edit.tsx` renders different fields per role — do NOT add student-specific fields for teacher/parent.
- **Student**: Personal Details (name, DOB, phone, email, city, interests, referral) + Student Card upload + School Details + Supervisor/Teacher + Parent/Guardian sections.
- **Teacher**: Personal Details (name, phone, email, city) + Professional Info (school, subject, department).
- **Parent**: Personal Details only (name, phone, email, city).
- Backend `PUT /api/users/me` saves `school` + `department` for teachers (not just `subject`).

### Regions (Province/City)
- App calls emsifa.com **directly** (not through backend) with in-memory cache.
- `app/services/regions.service.ts` — provinces and regencies cached for the session.
- Backend still has `GET /api/regions/provinces` and `GET /api/regions/regencies/:code` but the app no longer uses them.

### School Search on Signup
- Calls `GET /api/schools/search?name=...&regencyCode=...`
- Uses api.co.id when `API_CO_ID_KEY` is set.
- Falls back to querying the local `schools` DB table when key is not set (returns up to 20 matches by name).

### Web Portal Structure
- `web/app/page.tsx` — **Role selector landing page** (Admin → `/login`, Organizer → `/organizer-login`, Teacher disabled/coming soon)
- `web/app/(dashboard)/` — Admin portal (auth-guarded by `(dashboard)/layout.tsx`)
- `web/app/(dashboard)/dashboard/page.tsx` — Dashboard home
- `web/app/(dashboard)/registrations/page.tsx` — **All registrations** with status filter tabs (All/Pending/Registered/Paid/Rejected); approve/reject only for `pending_approval`
- `web/app/(dashboard)/competitions/page.tsx` — Competition management (create/edit/delete)
- `web/app/(dashboard)/users/page.tsx` — User management
- `web/app/(dashboard)/schools/page.tsx` — Schools management
- `web/app/(dashboard)/notifications/page.tsx` — Broadcast notifications
- `web/app/login/page.tsx` — Admin login (has ← Back button to role selector)
- `web/app/(organizer)/` — Organizer portal (auth-guarded by `(organizer)/layout.tsx`)
- `web/app/(organizer)/organizer-login/page.tsx` — Organizer login (has ← Back button to role selector)
- `web/app/(organizer)/organizer-dashboard/page.tsx` — Organizer dashboard
- `web/app/(organizer)/organizer-competitions/page.tsx` — Competitions list (publish/close actions)
- `web/app/(organizer)/participants/page.tsx` — Participants view per competition (approve/reject)
- `web/app/(organizer)/revenue/page.tsx` — Revenue overview (stat cards + per-competition table)
- `web/lib/api/index.ts` — All admin API call functions
- `web/lib/auth/context.tsx` — Admin auth context (localStorage: `admin_token` / `admin_user`)
- `web/lib/auth/organizer-context.tsx` — Organizer auth context (localStorage: `organizer_token` / `organizer_user`)
- `web/components/Sidebar.tsx` — Admin nav
- `web/next.config.mjs` — API proxy config (`.ts` version not supported in Next.js 14 — keep `.mjs`)

**Organizer portal missing pages (not yet built — teammate's task):**
- `web/app/(organizer)/organizer-competitions/new/page.tsx` — Create competition form
- `web/app/(organizer)/organizer-competitions/[id]/page.tsx` — Competition detail view
- `web/app/(organizer)/organizer-competitions/[id]/edit/page.tsx` — Edit competition form

**Test accounts (local dev):**
- Admin: `admin@eduversal.com` / (password set via `npm run db:create-admin` in backend)
- Organizer: `organizer@eduversal.com` / (password set via `npm run db:create-organizer` in backend)

### Historical Data (IMPORTED ✅)
- 63,365 real participant records imported into `historical_participants` table.
- Excel file lives at `/Users/mujtabo/Desktop/All/Internship Eduversal/beyond-classroom/Eduversal_Database.xlsx` — NOT in the repo.
- Identity matching: email (88.6% coverage) + WhatsApp/phone (96.9% coverage).
- Auto-link fires at login (`/me` and `/phone/verify-otp`) — matches email OR phone, skips if already linked.
- Manual claim via `GET /api/historical/search` + `POST /api/historical/:id/claim`.
- Mobile: `app/app/(tabs)/profile/history.tsx` — "My Records" tab + "Find & Claim" tab.
- **Smart phone login (added May 2026):** If phone OTP succeeds but no `users` account, backend checks `historical_participants.phone`. If matched, returns `{ historicalMatch: true, fullName, email, phone }`. App routes to `app/(auth)/claim-account.tsx` which pre-fills name/email from historical data — user only needs to set a password. Account is created and historical records are auto-linked on signup.

### File Storage
- **Dev (default):** local disk `backend/uploads/<userId>/`, served as static by Express.
- **Production (MinIO):** set `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_URL` in `backend/.env`. The code automatically switches to S3 when these are set.
- All three upload routes (users, documents, payments) now use `multer.memoryStorage()` + `storeFile()` from `storage.service.ts`.
- T21 (MinIO Docker on VPS) is the only remaining infrastructure step before production storage works.

---

## Current Task Status (as of May 6, 2026 — Session 3)

**Sprints 0–11 fully complete. All backend tasks done.**
**Bug fixes: teacher DB migration, role-aware profile edit, payment verify endpoint (May 6, 2026 session 3).**

### NEXT STEP TO START:
Build the missing organizer competition CRUD pages (teammate's task):
- `web/app/(organizer)/organizer-competitions/new/page.tsx`
- `web/app/(organizer)/organizer-competitions/[id]/page.tsx`
- `web/app/(organizer)/organizer-competitions/[id]/edit/page.tsx`

Backend organizer routes for create (`POST /api/organizers/competitions`) and update (`PUT /api/organizers/competitions/:id`) already exist in `organizer.routes.ts`.

**Also pending (VPS, do manually):**
- **T21** — MinIO Docker on VPS: `docker run -d -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=... -e MINIO_ROOT_PASSWORD=... quay.io/minio/minio server /data --console-address :9001`, then set the 5 `MINIO_*` env vars in `backend/.env`.
- **Run migrations on VPS:** `npm run db:migrate` to apply `1746500000000_teacher-student-links.sql` (already applied locally).
- **Rename DB on VPS:** `ALTER DATABASE beyond_classroom RENAME TO kompetix;` then update `DATABASE_URL` in VPS `backend/.env`.
- **api.co.id key:** Register at api.co.id to get `API_CO_ID_KEY` for real school search in signup.
- **Expo project ID:** Run `npx eas init` inside `app/` for production push notifications.

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

### SPRINT 9 — Web Portal QA Pass (May 6, 2026) ✅ COMPLETE
| Fix | What | Key files |
|---|---|---|
| DB rename | PostgreSQL `beyond_classroom` → `kompetix` locally; `.env` + `.env.example` updated | `backend/.env`, `backend/.env.example` |
| Role selector | `/` is now a role-selector landing page (Admin / Organizer / Teacher-soon) instead of redirect | `web/app/page.tsx` |
| Back buttons | `← Back` on both login pages to return to role selector | `web/app/login/page.tsx`, `web/app/(organizer)/organizer-login/page.tsx` |
| School column fix | `s.school` → `s.school_name` in all 6 queries across admin & organizer routes | `backend/src/routes/admin.routes.ts`, `backend/src/routes/organizer.routes.ts` |
| Organizer competitions | Assigned all 21 NULL-owned competitions to organizer account; `POST /admin/competitions` now sets `created_by` | `backend/src/routes/admin.routes.ts` |
| Admin registrations | Page now shows all statuses with filter tabs (All/Pending/Registered/Paid/Rejected) | `web/app/(dashboard)/registrations/page.tsx`, `backend/src/routes/admin.routes.ts` |
| Organizer login redirect | Fixed wrong redirect `/organizer/organizer-dashboard` → `/organizer-dashboard` | `web/app/(organizer)/organizer-login/page.tsx` |
| Participants status | Fixed STATUS_CLS map and approve/reject button condition (was using wrong statuses) | `web/app/(organizer)/participants/page.tsx` |
| Missing API methods | Added `competitionsApi.create/update/delete` to web API client | `web/lib/api/index.ts` |
| Null guards | Defensive `?? []` / `?? 0` on users/schools pagination state setters | `web/app/(dashboard)/users/page.tsx`, `web/app/(dashboard)/schools/page.tsx` |
| Revenue page | New organizer revenue page with stat cards + per-competition table | `web/app/(organizer)/revenue/page.tsx` |
| Dead code | Removed unused OrganizerSidebar component from organizer layout | `web/app/(organizer)/layout.tsx` |
| Types | PendingRegistration student sub-fields marked optional | `web/types/index.ts` |

### SPRINT 10 — Mobile Bug Fixes (May 6, 2026 Session 2) ✅ COMPLETE
| Fix | What | Key files |
|---|---|---|
| Payment: "Kembali" → "Back" | Indonesian string hardcoded in pay.tsx | `app/app/(payment)/pay.tsx` |
| Payment: webhook race condition | After paying and closing browser, `refreshRegistrations()` was called before the Midtrans webhook updated the DB. Fix: poll `GET /registrations/:id` up to 4× (every 2s, max ~6s) before giving up. Screen shows "Verifying payment status..." during poll. | `app/app/(payment)/pay.tsx` |
| Payment: "Another web browser is already open" | iOS keeps previous `openAuthSessionAsync` session "alive" briefly. Fix: call `WebBrowser.dismissAuthSession()` before every `openAuthSessionAsync` call. | `app/app/(payment)/pay.tsx` |
| Teacher sees Discover screen on login | `_layout.tsx` defaulted `userRole` to `"student"` before context loaded → competitions tab became visible → tab navigator landed there. Fix: default to `""` (empty string) so all role-specific tabs stay hidden during load. | `app/app/(tabs)/_layout.tsx` |
| Teacher redirect safety net | `competitions.tsx` also defaulted to "student" and had no redirect for teachers. Fix: added `useEffect` that redirects teachers to `/(tabs)/teacher-dashboard` and admins to `/(tabs)/web-portal-redirect` when `userRole` resolves. | `app/app/(tabs)/competitions.tsx` |
| Teacher "monitoring mode" | Removed Bulk Registration and Export Student Data from teacher quick actions. Replaced with monitoring-only tiles: Competitions, View Reports, Deadlines, My Students. Updated web portal banner text to remove bulk registration mention. | `app/app/(tabs)/teacher-actions.tsx` |

### SPRINT 11 — Bug Fixes (May 6, 2026 Session 3) ✅ COMPLETE
| Fix | What | Key files |
|---|---|---|
| Teacher DB migration | `teacher_student_links` table was missing locally → "relation does not exist" when adding student by email. Fix: `npm run db:migrate`. | `backend/migrations/1746500000000_teacher-student-links.sql` |
| Role-aware profile edit | `edit.tsx` was showing "Student Details" + all student fields for every role. Rewritten to render role-specific sections: student (full), teacher (personal + professional), parent (personal only). | `app/app/(tabs)/profile/edit.tsx` |
| Teacher profile update | Backend `PUT /api/users/me` only saved `subject` for teachers. Now also saves `school` and `department`. | `backend/src/routes/users.routes.ts` |
| Payment verify endpoint | After paying, app showed "Payment Completed!" based on redirect URL params, but DB still showed `registered` (webhook never fires to localhost in sandbox). Added `GET /api/payments/verify/:registrationId` that calls Midtrans Status API, force-updates DB if settled. | `backend/src/routes/payments.routes.ts`, `backend/src/services/midtrans.service.ts` |
| pay.tsx verify flow | App now always calls verify endpoint after browser close instead of trusting URL params. Polls up to 6× with 3s gaps. Only shows "Payment Completed!" when DB confirms `paid`. | `app/app/(payment)/pay.tsx`, `app/services/payments.service.ts` |

### SPRINT 8 — UX Fixes & Data Scoping (May 5, 2026) ✅ COMPLETE
| Task | What | Key files |
|---|---|---|
| T26 | **Historical phone login** — phone OTP matched to `historical_participants` returns `{ historicalMatch }` instead of NO_ACCOUNT; app routes to new `claim-account.tsx` screen pre-filled with name/email | `auth.routes.ts`, `app/(auth)/claim-account.tsx`, `app/(auth)/login.tsx`, `auth.service.ts` |
| T27 | **Remove payment proof upload** — Midtrans webhook auto-confirms; webhook now marks `registrations.status = 'paid'` on settlement; removed upload-proof + manual-intent + GET-proof endpoints | `payments.routes.ts`, `app/(payment)/pay.tsx`, `my-competitions.tsx` |
| T28 | **Admin registration approval flow** — all new registrations start as `pending_approval`; admin approves on web → `registered` (paid comp) or `paid` (free); student notified | `registrations.routes.ts`, `admin.routes.ts`, `web/app/(dashboard)/registrations/page.tsx`, `web/components/Sidebar.tsx`, `web/lib/api/index.ts`, `web/types/index.ts`, `my-competitions.tsx`, `AuthContext.tsx` |
| T29 | **Teacher roster scoping** — new `teacher_student_links` table; teacher adds students by email; all teacher queries (students, analytics, dashboard) now scoped to linked students only; `teacher-analytics.tsx` repurposed as "My Competitions" showing which students are registered for each competition | `1746500000000_teacher-student-links.sql`, `teachers.routes.ts`, `teachers.service.ts`, `teacher-dashboard.tsx`, `teacher-students.tsx`, `teacher-analytics.tsx`, `teacher-actions.tsx` |

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
- DB name renamed to `kompetix` locally (May 6, 2026). VPS still needs: `ALTER DATABASE beyond_classroom RENAME TO kompetix;` + update `backend/.env`.
- There are 3 registrations with status `approved` in the DB (legacy status, pre-T28). These are displayed correctly with a green badge but cannot be acted on via the approval UI. Not a bug — they predate the `pending_approval` flow.
- `competitions.tsx` defaults `userRole` to `""` (not "student") when user context hasn't loaded. Guard: `useEffect` redirects teachers/admins away. Same change in `_layout.tsx`.
- `pay.tsx` polling: after browser close (any path), calls `GET /api/payments/verify/:registrationId` up to 6× with 3s gaps. The verify endpoint calls Midtrans Status API and force-updates DB — this is what makes sandbox work without a live webhook. In production the webhook arrives first and verify is a no-op.

---

## Session Workflow

- Tasks tracked in `docs/PROJECT_PLAN.md` — update status there as work completes.
- Commit after each logical unit of work with a descriptive message.
- Before context runs out: ask Claude to summarize session and update this CLAUDE.md.
- When starting fresh: read this file + `git log --oneline -10` + `git status` to orient.
