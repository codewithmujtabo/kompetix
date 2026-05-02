# KompetiApp — Sprint 1 Plan & Critical Roadmap

## Context

KompetiApp (Beyond Classroom) is a mobile-first marketplace for K-12 competition registration in Indonesia. PRD targets 1,000 paid registrations + 50 active competitions in 6 months, with the long-term goal of serving 50,000+ users. Revenue is a 6% transaction fee per registration — meaning **the product does not exist as a business until end-to-end payment works**.

Today the repo has:
- ✅ Multi-role auth (student/parent/teacher) via email + password and email-OTP, JWT in AsyncStorage, Postgres schema covering nearly every PRD entity (users, students, parents, teachers, competitions, registrations, documents, payments)
- ✅ A 5-tab Expo app with onboarding, login/register, profile editing, document vault UI, news feed, competition browse/detail/registration UI
- 🟡 Competitions are still hardcoded in `constants/competitions.ts`; the backend `/api/competitions` route exists but is **never called** from the app
- 🟡 Document vault accepts metadata but has **no actual file upload pipeline**
- 🟡 Registrations live only in React state — they vanish on app restart even though `/api/registrations` exists
- ❌ No Midtrans, no push, no WhatsApp, no organizer portal, no admin role, no analytics, no error monitoring, no tests, no migration system, no NISN verification

---

## Critical Thinking — Where I Disagree With Current Direction

These are the things I would not stay quiet about. Each is load-bearing for the 50K-user goal.

1. **The app has already drifted from the PRD on auth.** PRD §6 says: *phone number + OTP (primary), Google SSO (secondary), no username/password*. We built email + password + email-OTP. For Indonesian K-12 students this is the wrong primitive — many students don't have personal email; WhatsApp and SMS are the primary channels, and phone is the natural identifier for parent-linking (S09) and WA notifications (S10, E05). **Recommendation:** add phone+OTP as the real auth path before we have users to migrate. Email login can stay as a secondary for parents/teachers.

2. **Mock data is the #1 blocker, not payments.** Until competitions, banners and categories come from the backend, *nothing* in the product scales. Marketing can't push a new competition, organizers can't be onboarded, recommendations (E01–E04) are impossible. This must be Sprint 1 day one.

3. **Payments are existential, but Midtrans integration is a 1.5–2 sprint job done right** (snap token, deep-link return on iOS+Android, webhook signature verification, idempotency, VA expiry, free-comp branch). Don't underestimate it. Start the foundation in Sprint 1 (DB + service skeleton + sandbox account) so Sprint 2 can finish it.

4. **The 5-tab bottom nav is scope creep vs. PRD §5.** On a 360×640 Android screen with status bar + header + 5 tabs, content area is cramped. We've collapsed to 4 tabs (D3 below).

5. **No organizer portal exists.** Resolved by D2 below — closed Eduversal ecosystem with parallel Next.js portal workstream from Sprint 1.

6. **UU PDP / data privacy is a launch blocker, not a "nice later".** We are about to store student NISN, photos, and report cards. Without (a) explicit consent at profile setup, (b) encryption-at-rest, (c) retention/erasure policy, (d) document access scoped per organizer — we have legal exposure on day one. PRD already flags this in open questions #6 and #17. Needs to be in Sprint 2 at the latest.

7. **No analytics, no error monitoring, no tests.** For a payment-handling app planning 50K users, this is reckless. Sentry + a product analytics tool (PostHog or Mixpanel) and a minimum smoke-test suite for the auth + register + pay path must land before any beta.

8. **Two auth contexts (`AuthContext` + `UserContext`) and unused `AuthContext-MultiRole.tsx` / `UserContext-new.tsx` / `AuthScreens.tsx` / `RegistrationForm.tsx` files** are early tech debt. Consolidate now while it's cheap — it gets harder once organizer/admin roles enter.

9. **No DB migration system.** Schema is a single `schema.sql` file. The moment we add a new column or table, we'll be hand-editing prod. Add a real migration runner (e.g. `node-pg-migrate`) early.

10. **WhatsApp template approval has a 1–3 day Meta lead time.** Even though WA notifications ship in Sprint 3+, the template submissions need to start in Sprint 1.

11. **NISN verification (Dapodik API)** has been decided in the PRD but is not built. Without it, organizers cannot trust the participant list, which kills the supply side. This is at least a Sprint 3 task — but we should *capture* the NISN now and validate it later, not retrofit later.

12. **Free competitions (PRD open Q#9)** — payment branch logic is undefined. This is a single-day decision but blocks the registration flow.

---

## Decisions Locked In

| # | Decision | Locked answer | Implication |
|---|---|---|---|
| D1 | **Auth identifier** | Support **both** phone+OTP and email+password from day one | Auth surface roughly doubles in Sprint 1. Need an SMS provider and a unified OTP table that works for either identifier. |
| D2 | **Organizer model** | **Closed ecosystem.** Eduversal Foundation is the *only* organizer. Internal Eduversal team members are assigned per competition. Some are Eduversal-run, some are partnership competitions still managed by Eduversal. **Self-serve organizer portal is being built in parallel as a Next.js workstream from day one**, and mobile + portal are interchangeable for the same Eduversal team for ease of use. | Massively simplifies: no external organizer onboarding, no organizer T&C/verification, no third-party payouts/revenue split, no marketplace KYC. The "organizer portal" is really an **internal staff portal** for Eduversal, not a public sign-up product. We do NOT need to build payout splitting, organizer revenue dashboards, or organizer self-serve onboarding. |
| D3 | **Tab structure** | **4 tabs**: Discover / My Registrations / Notifications / Profile | Drop Home and News tabs. Notifications becomes a first-class tab (in-app inbox = E06). Recommended-for-you rail (E01) lives at the top of Discover. |
| D4 | **Hosting** | **Single fully-managed VPS** running everything ourselves: Postgres + Express API + Next.js portal + Nginx reverse proxy + Let's Encrypt. No third-party DBaaS. Provider TBD (Hetzner / DigitalOcean / Contabo / local Indonesian VPS). All services live on one box for v1; we'll scale by adding read replicas / a separate DB box only when load demands it. |

## Decisions Still Open (working assumption noted)

| # | Decision | Working assumption |
|---|---|---|
| D5 | **Payment provider** | Midtrans (PRD-aligned: GoPay/OVO/Dana/BCA VA/Mandiri VA all native, IDR settlement). |
| D6 | **Free competitions** | Skip the payment step entirely; mark registration `paid` immediately on the server. |
| D7 | **SMS provider for phone OTP** | **Twilio Verify** for Sprint 1 (fastest to integrate, global reach incl. +62). Migrate to a local Indonesian SMS gateway (Zenziva / Wavecell / MessageBird ID) in Sprint 3 once volume justifies the cheaper rate, OR switch to WhatsApp OTP once Meta templates are approved. |

---

## Sprint 1 — "VPS, real data, real persistence, dual auth, payment foundation, 4-tab IA" (~3 weeks, 19 tasks)

Goal: every screen shows real backend data, every registration survives a restart, both phone+OTP and email login work, the app uses the locked 4-tab IA, and the payment skeleton is in place so Sprint 2 can finish Midtrans without architectural rework.

Tasks are ordered for one-by-one execution. Each is 0.5–1.5 days. Tracks A/B/C/D/E can be done strictly in order; nothing branches.

### Track A — Foundation cleanup (do first, unblocks everything else)

**T0. Provision the VPS and stand up the production stack**
- Pick provider (Hetzner CX22 or DigitalOcean 4vCPU/8GB recommended; cheapest acceptable: Contabo).
- OS: Ubuntu 24.04 LTS. Harden: disable root SSH, key-only auth, UFW (allow 22/80/443 only), fail2ban, unattended-upgrades.
- Install: Postgres 16, PgBouncer (transaction pooling), Node 20 (via nvm or nodesource), Nginx, certbot for Let's Encrypt, pm2 for process supervision.
- Create Postgres roles: `bc_app` (app user, limited grants), `bc_admin` (migrations only). Create `beyond_classroom` DB.
- Configure Nginx as reverse proxy: `api.<domain>` → Node Express on `:3000`, `portal.<domain>` → Next.js on `:3001` (Sprint 1 the portal is bootstrapped only). Both on TLS via Let's Encrypt.
- Set up nightly `pg_dump` cron writing to off-VPS S3-compatible storage (Backblaze B2 or Wasabi — both cheaper than S3). Test restore on a throwaway box.
- Document all of this in a new `INFRA.md` at the repo root.
- Why first: every later task assumes a real production target exists. Doing this now also forces us to write the env config story properly.

**T1. Add a database migration system**
- Add `node-pg-migrate` to `backend/`, port `schema.sql` into the first migration, add `npm run migrate` script.
- Critical files: `backend/src/db/schema.sql`, new `backend/migrations/`, `backend/package.json`.
- Why first: every later DB change needs this.

**T2. Consolidate auth state into a single context**
- Merge `AuthContext` and `UserContext` into one `AuthContext` exposing `{ user, registrations, token, loading, login, signup, logout, refresh }`.
- Delete `context/UserContext-new.tsx`, `context/AuthContext-MultiRole.tsx`, `components/AuthScreens.tsx`, `components/RegistrationForm.tsx` (confirmed unused).
- Critical files: `context/AuthContext.tsx`, `context/UserContext.tsx`, `app/_layout.tsx`.

**T3. Wire Sentry (frontend + backend) and a product analytics SDK**
- `@sentry/react-native` in app, `@sentry/node` in backend, init in `app/_layout.tsx` and `backend/src/index.ts`.
- Add PostHog (or Mixpanel) for product analytics — track `signup_completed`, `competition_viewed`, `registration_started`, `registration_paid`.
- Why now: anything we ship after this is observable; anything before is dark.

### Track A.5 — Information architecture migration to 4 tabs

**T3.5. Restructure tab navigation to 4 tabs**
- New tabs: `Discover` / `My Registrations` / `Notifications` / `Profile`.
- Move Home (banners, featured, "Recommended for you" rail placeholder) into `Discover` as section blocks above the competition list.
- Move News content into `Notifications` tab as the in-app inbox seed (real notification rendering comes Sprint 3).
- Delete the old `index.tsx` (Home) and `news.tsx` tabs.
- Critical files: `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx` (delete or repurpose), `app/(tabs)/news.tsx` (delete), `app/(tabs)/competitions.tsx` (becomes Discover root), new `app/(tabs)/notifications.tsx`.
- Keep my-competitions.tsx and profile/ as-is.

### Track B — Real competition data (the main unblock)

**T4. Seed the competitions table**
- Create `backend/src/db/seed.ts` that inserts ~15 realistic Indonesian K-12 competitions covering Academic / Arts / Sports / Debate, mix of free + paid, mix of SD/SMP/SMA.
- Reuse the structure from `constants/competitions.ts` so the frontend doesn't visually regress.
- Critical files: `backend/src/db/seed.ts`, `backend/package.json` (add `db:seed` script).

**T5. Add `competitions.service.ts` on the frontend**
- Methods: `list({ category?, grade?, search? })`, `get(id)`.
- Mirror existing pattern in `services/document.service.ts`.
- Critical files: new `services/competitions.service.ts`, `services/api.ts`.

**T6. Replace `constants/competitions.ts` usage in Discover/competitions list with real fetch**
- React Query (`@tanstack/react-query`) for caching + offline-readable list (PRD §6 requires 24h cached listings).
- Skeleton loader within 300ms (PRD §5).
- Critical files: `app/(tabs)/competitions.tsx`, `app/(tabs)/index.tsx`, new query hooks under `hooks/queries/`.

**T7. Replace mock data on competition detail page**
- `app/(tabs)/competitions/[id].tsx` fetches via `competitions.service.ts`.
- Handle `closed` / `quota full` states from PRD S02.
- Critical files: `app/(tabs)/competitions/[id].tsx`.

**T8. Delete `constants/competitions.ts` once nothing imports it**
- Use grep to confirm zero imports, then remove. Keeps the codebase honest.

### Track C — Persisted registrations

**T9. Persist registrations via the existing `/api/registrations` route**
- `UserContext.registerForCompetition` currently only updates React state. Make it call `POST /api/registrations`.
- Add `services/registrations.service.ts` (`list`, `create`, `update`, `delete`).
- Critical files: `services/registrations.service.ts`, `context/AuthContext.tsx`, `app/(tabs)/competitions/[id].tsx`, `app/(tabs)/my-competitions.tsx`.

**T10. Hydrate registrations on app load**
- On `checkAuth()` success, also fetch the user's registrations and populate context. Pull-to-refresh on My Registrations.
- Critical files: `context/AuthContext.tsx`, `app/(tabs)/my-competitions.tsx`.

### Track D — Payment foundation (skeleton only — Sprint 2 finishes it)

**T11. Sign up for a Midtrans sandbox account + add server keys to `backend/.env.example`**
- No code yet — just the credential and the `.env` doc.

**T12. Add `payments.service.ts` on the backend with stub `createTransaction(registrationId)`**
- Generates a Midtrans Snap token using sandbox keys; persists to `payments` table.
- Returns `{ snapToken, redirectUrl }`. No webhook yet.
- Critical files: new `backend/src/services/midtrans.service.ts`, new `backend/src/routes/payments.routes.ts`, register in `backend/src/index.ts`.

**T13. Decide & implement free-competition branch (D6 above)**
- If fee = 0, skip payment step in registration flow and mark registration `paid` immediately on the server.
- Critical files: `backend/src/routes/registrations.routes.ts`, `app/(tabs)/competitions/[id].tsx`.

### Track D.5 — Dual auth (phone + email) per D1

**T13.5. Schema + migration: make `users.phone` unique-indexable, add `phone_verified_at`, generalize `otp_codes` to support both `email` and `phone` identifiers**
- New migration via T1's runner. Backfill existing rows so `email` users keep working.
- Critical files: new migration, `backend/src/db/schema.sql` (kept in sync as documentation only).

**T13.6. Backend: add `POST /api/auth/phone/send-otp` and `POST /api/auth/phone/verify-otp`**
- Wire Twilio Verify (D7). Twilio Verify handles OTP storage + rate-limit on its side, so we don't have to over-engineer the `otp_codes` table for phone — we just call `verifications.create({ to, channel: 'sms' })` and `verificationChecks.create({ to, code })`.
- On successful verification: find-or-create user by phone; if new user → return signup token (90s) so frontend can complete profile; if existing → issue full JWT.
- Critical files: new `backend/src/services/twilio.service.ts`, `backend/src/routes/auth.routes.ts`, `backend/.env.example` (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID).

**T13.7. Frontend: add phone+OTP login/signup path alongside existing email path**
- Login screen: tabbed UI ("Email" | "Phone"). Phone form: country code defaults to +62, 10–13 digit input, validates Indonesian formats.
- Signup: if phone path, the post-OTP screen collects email (optional), full name, role; if email path, unchanged.
- Update `auth.service.ts` with `sendPhoneOtp(phone)`, `verifyPhoneOtp(phone, code)`.
- Critical files: `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `services/auth.service.ts`.

**T13.8. Add rate-limit middleware to all OTP endpoints**
- Per-IP and per-identifier (email or phone) sliding window — 5 OTP requests per 15min, 10 verify attempts per identifier per hour.
- Use `express-rate-limit` with a Postgres-backed store (or in-memory for v1, Redis Sprint 2).
- Why now: open OTP endpoints are the #1 abuse vector. Twilio Verify charges per send; uncapped this is also a money leak.
- Critical files: new `backend/src/middleware/rate-limit.ts`, applied to all `/auth/*` OTP routes.

### Track E — Compliance & ops minimum

**T14. UU PDP consent screen at profile setup**
- One-screen consent for behavioral data + document storage, with link to a placeholder privacy policy. Persist consent timestamp on the user row (new column via T1's migration system).
- Critical files: `app/(auth)/register.tsx` or new `app/(onboarding)/consent.tsx`, new migration.
- Why this sprint: cheaper to add to fresh users than retrofit later.

---

## Sprint 1 Verification (end-to-end smoke test)

After all tasks land, this manual flow must work on a real Android device on real Wi-Fi:

1. Fresh install → onboarding → register as a student → consent screen → home shows real competitions from `GET /api/competitions`.
2. Filter by category and grade → results update from API, not from `constants/competitions.ts` (grep should confirm file is deleted).
3. Open a paid competition → tap Register → registration is created via `POST /api/registrations` → the placeholder Midtrans snap token endpoint returns 200 in the network log (UI can stop here in Sprint 1).
4. Open a *free* competition → register → registration immediately appears as `paid` in My Registrations.
5. Force-quit the app → relaunch → My Registrations still shows the registrations (not in-memory anymore).
6. Trigger a deliberate JS error → Sentry receives it.
7. `npm run migrate` rolls schema forward and back cleanly.

---

## Sprint Roadmap (so Sprint 1 makes sense in context)

Note: an Eduversal Next.js **organizer/staff portal** is a parallel workstream from Sprint 1 onward — it shares the same Postgres + Express backend as the mobile app and is built by either a parallel sub-team or as an interleaved second track. The roadmap below tracks the mobile-side work; portal milestones are listed in the right-hand column.

| Sprint | Mobile theme | Mobile outputs | Parallel portal track |
|---|---|---|---|
| **Sprint 1 (this plan)** | Real data + dual auth + 4-tab IA + payment foundation | Backend-driven competitions, persisted registrations, phone+OTP + email auth, Midtrans skeleton, consent, observability, migrations | Portal repo bootstrapped (Next.js + shared Postgres); staff login (email+password); read-only competitions list |
| **Sprint 2** | Payment end-to-end + file upload | Midtrans webhook + signature verify + idempotency, deep-link return, receipt PDF, S3-or-equivalent file pipeline for document vault, retention policy | Portal: create/edit competition, image upload to same S3 bucket, draft/publish workflow |
| **Sprint 3** | Notifications + organizer review surface in mobile (read-only) | Expo Push + FCM, in-app notification centre (E06), notification preferences (E07), WA Meta template submission, mobile org-staff role can view registrations | Portal: registrations list, registration detail, approve/reject with reason, bulk approve, CSV/PDF export (S13–S15) |
| **Sprint 4** | Personalization + parent linking + NISN | Recommended for you (E01), post-reg nudge (E02), new-comp alert (E03), deadline urgency (E04), parent linking (S09–S10), Dapodik NISN verification | Portal: revenue dashboard (Eduversal-internal only — no payout split), simple analytics |
| **Sprint 5** | School admin + bulk | Bulk registration (S11), school dashboard role-switched view (S12) | Portal: school account management, audit log |
| **Sprint 6 (pre-beta)** | Hardening + load + legal | Load testing for 50K, PDPA legal review pass, support tooling, performance budget enforcement, Sentry SLOs | Portal: hardening + handoff to Eduversal staff training |

---

## What I'm explicitly NOT doing in Sprint 1 (and why)

- **Push / WA notifications** — Sprint 3. Meta template submission starts in Sprint 1 as a side task because of the 1–3 day lead time.
- **Midtrans webhook + receipt + deep-link return** — Sprint 2. Sprint 1 only lands the Snap-token endpoint and DB plumbing so Sprint 2 can finish without architectural rework.
- **NISN Dapodik integration** — Sprint 4. Capture NISN in profile now, validate later.
- **Recommendations (E01–E04)** — Sprint 4. Meaningless without real registration data, which Sprint 1 unlocks.
- **Bulk registration / school dashboard** — Sprint 5. Depends on stable single-student flow first.
- **Dark mode** — explicitly disabled this conversation; revisit post-launch.
- **External organizer onboarding / payouts / KYC** — out of scope entirely (closed Eduversal ecosystem per D2).

---

## Cost / Operational Notes For 50K-User Goal

A few things that aren't tasks but will bite us if not budgeted now:

- **Twilio Verify (D7)** — ~$0.05 per SMS to Indonesia. At 50K activations + retries, budget ~$3–5K for SMS. Migrating to a local Indonesian SMS gateway in Sprint 3 cuts this 60–80%.
- **Midtrans fee** — ~2% per transaction on top of our 6% platform fee. Net margin per registration is ~4%. Make sure this is reflected in the business model.
- **Object storage for documents** — at 50K students × ~3 docs × ~1MB compressed = ~150GB. Cheap on Backblaze B2 or Wasabi (~$1/mo for 150GB), but egress on document downloads (organizer-side bulk export) needs a CDN cap.
- **Postgres connection pool** — Express + Node default pool is too small for spiky webhook traffic. Since we're self-hosting Postgres on the VPS (D4), install **PgBouncer** in transaction-pooling mode in front of Postgres from day one. Set `pg.Pool` max to ~10 per Node process; PgBouncer handles the fan-out.
- **VPS sizing** — for Sprint 1 / pre-launch, a 4 vCPU / 8GB RAM VPS comfortably runs Postgres + Node + Next.js + Nginx. Plan to vertically scale to 8/16 before public beta. Daily `pg_dump` to off-VPS object storage is non-negotiable from day one — losing the database loses the company.
- **Backups & disaster recovery** — self-hosted Postgres means we own backups end-to-end. Required from Sprint 1: nightly `pg_dump` to off-box storage, WAL archiving to the same location, weekly restore test, documented runbook. This is a hard launch blocker; if we don't have it before paying users, one bad disk wipes the business.
- **Ops surface** — self-hosting trades dollars for hours. Budget for: OS patching, fail2ban / SSH hardening, UFW firewall, Nginx TLS renewal monitoring, Postgres tuning, log rotation, uptime monitoring (UptimeRobot or similar). Capture all of this in `INFRA.md` before Sprint 2.
- **Sentry quota** — free tier is 5K events/mo. At 50K users this gets eaten in days. Budget the Team plan (~$26/mo) before launch.
