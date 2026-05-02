# Sprint 1 — Delivery Summary

**Goal:** Real backend data, persisted registrations, dual auth (email+password & phone OTP), 4-tab navigation, payment foundation, compliance baseline, and full observability — before any beta users.

**Duration:** ~3 weeks
**Branch:** `feat/sprint-1`
**Tasks completed:** 19 / 19

---

## What Was Built

### T1 — Database Migration System
- Added `node-pg-migrate` to the backend
- Ported the entire `schema.sql` into the first migration (`1744070400000_initial-schema.sql`)
- Added `npm run db:migrate`, `db:migrate:down`, `db:migrate:redo` scripts
- All future schema changes now go through versioned migration files — no more hand-editing production

### T2 — Auth Context Consolidation
- Merged `AuthContext` and `UserContext` into a single `context/AuthContext.tsx`
- Deleted unused files: `UserContext-new.tsx`, `AuthContext-MultiRole.tsx`, `AuthScreens.tsx`, `RegistrationForm.tsx`
- Stubbed broken legacy register screens (`register-old.tsx`, `register-otp-backup.tsx`) to redirect to the real register screen
- Exports both `useAuth()` and `useUser()` for backwards compatibility

### T3 — Observability: Sentry + Analytics
- Wired `@sentry/react-native` on the frontend and `@sentry/node` on the backend
- Both init from `EXPO_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` env vars — no-ops if unset
- Created `services/analytics.ts` — a lightweight wrapper around PostHog (disabled unless `EXPO_PUBLIC_POSTHOG_KEY` is set)
- Tracks: `competition_viewed`, `registration_started`, `registration_paid`, `signup_completed`

### T3.5 — 4-Tab Navigation
- Restructured from 5 tabs (Home, Explore, My Comps, News, Profile) to **4 tabs**: Discover / My Registrations / Notifications / Profile
- `app/(tabs)/index.tsx` now redirects to Discover
- `app/(tabs)/news.tsx` deleted — replaced by `app/(tabs)/notifications.tsx` (placeholder inbox for Sprint 3)
- Aligns with the locked decision D3 and PRD §5

### T4 — Competition Seed Data
- Created `backend/src/db/seed.ts` with 15 realistic Indonesian K-12 competitions
- Covers: Math, Science, Debate, Arts, Language, Technology, Sports
- Mix of free (fee=0) and paid, mix of SD / SMP / SMA grade levels
- Idempotent (`INSERT ... ON CONFLICT DO NOTHING`)
- Required a schema migration to change `competitions.id` from `UUID` to `TEXT` for readable slugs like `"comp-001"`

### T5 — Competitions Service (Frontend)
- Created `services/competitions.service.ts` with `list()` and `get(id)`
- Maps snake_case API responses to camelCase TypeScript interfaces
- Guards against null `gradeLevel` (returns `""` instead of crashing `.replace()`)

### T6 — Discover Screen — Real API Data
- Replaced hardcoded `COMPETITIONS` constant with `useQuery` from React Query
- 24-hour `staleTime` — competition list readable offline (PRD §6)
- Categories derived from API data (no hardcoded list)
- Client-side filtering for search / category / grade — no extra API calls per keystroke
- Skeleton loaders while fetching, error state with Retry button
- Analytics tracking on competition card press

### T7 — Competition Detail — Real API Data
- `app/(tabs)/competitions/[id].tsx` fetches via `competitionsService.get(id)`
- Loading spinner, error/not-found state, back navigation
- "Pendaftaran Ditutup" badge if `regCloseDate < now()`
- Three tabs: Tentang / Daftar (required docs from API) / Pembayaran
- CTA states: Closed / Already Registered / Register Now
- Analytics tracking on mount

### T8 — Delete Mock Competitions Constant
- Removed all `COMPETITIONS` imports from `my-competitions.tsx`
- `constants/competitions.ts` cleared to an empty stub (file permissions prevented deletion)

### T9 — Persisted Registrations
- Created `services/registrations.service.ts` — `list`, `create`, `updateStatus`, `remove`
- `AuthContext.registerCompetition` is now async, calls `POST /api/registrations`
- Optimistic updates on all mutation operations with rollback on failure
- `competitionName` and `fee` stored in `meta` JSON and surfaced on the `Registration` type

### T10 — Hydrate Registrations on App Load
- `checkAuth()` now calls `loadRegistrations()` in parallel with `loadProfile()`
- `login()` also hydrates registrations after auth
- Added `refreshRegistrations` to context
- My Registrations screen has `RefreshControl` (pull-to-refresh)

### T11 — Midtrans Sandbox Setup
- Added `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` to `.env.example` and `env.ts`
- Sandbox keys confirmed and stored in `.env`

### T12 — Backend Payments Skeleton (Snap token only)
- Installed `midtrans-client`
- Created `backend/src/services/midtrans.service.ts` — generates Snap tokens via Midtrans SDK
- Created `POST /api/payments/snap` endpoint: validates registration, checks for free competition (returns 400), re-uses existing pending token to avoid duplicate charges, persists payment row, returns `{ snapToken, redirectUrl, paymentId }`
- Webhook handling deferred to Sprint 2

### T13 — Free Competition Branch
- `POST /api/registrations` now looks up `competitions.fee` before inserting
- If `fee = 0`, sets `status = "paid"` immediately — payment step skipped entirely
- Frontend reads server-returned status and updates local state so free competitions show under "Ongoing" instantly

### T13.5 — Phone Identifier Migration
- Added `phone_verified_at TIMESTAMPTZ` to `users`
- Created partial unique index on `users.phone` (NULLs allowed, non-NULLs enforced)
- Cleaned duplicate phone entries from existing test data before applying the index

### T13.6 — Backend Phone OTP Endpoints (Twilio Verify)
- Installed `twilio`
- Created `backend/src/services/twilio.service.ts` — wraps Twilio Verify with Indonesian E.164 normalisation (`08xxx` → `+628xxx`)
- **Dev bypass**: if `TWILIO_VERIFY_SID` is not set, `sendPhoneOtp` logs to console and `verifyPhoneOtp` accepts `000000` — zero cost during development
- `POST /api/auth/phone/send-otp` — sends SMS OTP
- `POST /api/auth/phone/verify-otp` — verifies OTP, marks `phone_verified_at`, issues JWT. Returns `{ message: "NO_ACCOUNT" }` (404) if phone not registered

### T13.7 — Frontend Phone OTP Login
- Login screen rebuilt with two clean tabs: **Email** (email + password) and **Phone** (SMS OTP)
- Phone flow: enter number → Send OTP → enter 6-digit code → Verify
- If phone not registered, shows alert with direct link to Sign Up
- Removed email OTP option entirely (agreed auth methods: email+password only, phone+OTP only)

### T13.8 — Rate-Limit Middleware
- Installed `express-rate-limit`
- Created `backend/src/middleware/rate-limit.ts` with three limiters:
  - `otpSendLimiter` — 5 OTP sends per 15 min per IP+identifier
  - `otpVerifyLimiter` — 10 verify attempts per hour per IP+identifier
  - `authLimiter` — 20 login/signup attempts per 15 min per IP
- Applied to all 6 auth endpoints (login, signup, send-otp, verify-otp, phone/send-otp, phone/verify-otp)

### T14 — UU PDP Consent Screen
- Migration: `consent_accepted_at TIMESTAMPTZ` + `consent_version TEXT` added to `users`
- Register flow extended to 3 steps: **Role → Details → Consent**
- Consent screen (Indonesian) lists data collected, how it's used, and legal basis (UU No. 27 Tahun 2022)
- Checkbox must be ticked before "Buat Akun" enables
- Backend rejects signup without `consentAccepted: true`, stores timestamp + version `"1.0"` for audit trail

---

## New Files

| File | Purpose |
|------|---------|
| `backend/migrations/1744070400000_initial-schema.sql` | Initial schema migration |
| `backend/migrations/1744070500000_competitions-id-text.sql` | Change competitions.id to TEXT |
| `backend/migrations/1744200000000_add-consent-to-users.sql` | UU PDP consent columns |
| `backend/migrations/1744210000000_phone-identifier.sql` | phone_verified_at + unique index |
| `backend/src/db/seed.ts` | 15 Indonesian K-12 competitions |
| `backend/src/services/midtrans.service.ts` | Midtrans Snap token generation |
| `backend/src/services/twilio.service.ts` | Twilio Verify phone OTP (with dev bypass) |
| `backend/src/routes/payments.routes.ts` | POST /api/payments/snap |
| `backend/src/middleware/rate-limit.ts` | OTP + auth rate limiters |
| `services/competitions.service.ts` | Frontend competition API calls |
| `services/registrations.service.ts` | Frontend registration API calls |
| `services/analytics.ts` | PostHog analytics wrapper |
| `app/(tabs)/notifications.tsx` | Notifications tab placeholder |

---

## Environment Variables Added

### Frontend (`.env.local`)
```
EXPO_PUBLIC_API_URL=http://<your-ip>:3000/api
EXPO_PUBLIC_SENTRY_DSN=          # optional
EXPO_PUBLIC_POSTHOG_KEY=         # optional
```

### Backend (`.env`)
```
SENTRY_DSN=
MIDTRANS_SERVER_KEY=             # sandbox: Mid-server-...
MIDTRANS_CLIENT_KEY=             # sandbox: Mid-client-...
MIDTRANS_IS_PRODUCTION=false
TWILIO_ACCOUNT_SID=              # leave empty to use dev bypass (OTP = 000000)
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SID=
```

---

## Key Decisions Made

| # | Decision |
|---|---------|
| D1 | Auth: email+password AND phone+OTP both supported from day one |
| D2 | Closed Eduversal ecosystem — no external organizer onboarding |
| D3 | 4-tab nav: Discover / My Registrations / Notifications / Profile |
| D4 | Self-hosted VPS — no third-party DBaaS (Neon/Supabase/RDS) |
| D5 | Midtrans for payments |
| D6 | Free competitions skip payment and are immediately marked `paid` |
| D7 | Twilio Verify for phone OTP; dev bypass (code `000000`) when unconfigured |

---

## Sprint 2 Preview

- Midtrans webhook + signature verification + deep-link return
- Receipt generation
- S3-compatible file upload pipeline for Document Vault
- Data retention policy (UU PDP)
- Organizer/staff portal (Next.js) — create/edit competitions, image upload
