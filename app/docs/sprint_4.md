# Sprint 4 — Personalization & Engagement

Implemented personalized competition recommendations and automated engagement notifications to increase user registrations and activity.

**Completed:** April 17, 2026

---

## Features Implemented

### E01: Personalized Recommendations
- "Recommended for you" section on Competitions tab
- Intelligent scoring algorithm (interests, grade, history, deadline, popularity)
- Horizontal scrollable cards with urgency badges
- Shows only for users with ≥1 registration
- 1-hour caching per user

### E02: Post-Registration Nudge
- Automated notification 30 minutes after payment
- Suggests 3 similar competitions (same category/grade)
- Scheduled delivery via cron job (every 5 minutes)
- Smart filtering to avoid duplicates

### E03: New Competition Alerts
- Batch notifications to interested users when admin creates competition
- Interest + grade matching algorithm
- Immediate delivery (within 1 hour)
- API endpoint: `POST /api/competitions`

### E04: Deadline Urgency Reminders
- Daily automated reminders at 10:00 AM
- Two-tier system (3 days + 1 day before deadline)
- Targets users who viewed (≥10 seconds) but didn't register
- 24-hour cooldown to prevent spam

### Bonus: Interest Picker UI
- Multi-select chips for standard categories (Math, Science, Debate, Arts, Language, Technology, Sports)
- Visual feedback (blue = selected)
- "Other Interests" field for custom entries
- Backward compatible (stores as comma-separated string)

---

## Technical Implementation

### Database Changes
**New Tables:**
- `competition_views` - Tracks user engagement (user_id, comp_id, viewed_at, view_duration_seconds)

**New Columns:**
- `notifications.scheduled_for` - When to send notification
- `notifications.sent` - Delivery status flag

**Indexes:** 5 new indexes for efficient querying

### API Endpoints
- `POST /api/competitions/:id/view` - Track competition views
- `GET /api/competitions/recommended?limit=10` - Get personalized recommendations
- `POST /api/competitions` - Create competition (admin, triggers alerts)

### Cron Jobs
- **Scheduled Notification Sender** - Every 5 minutes, sends pending scheduled notifications
- **Deadline Urgency Reminders** - Daily at 10:00 AM, sends reminders to interested users

### Files Changed
**Created (5):**
- `backend/migrations/1744700000000_create-competition-views.sql`
- `backend/migrations/1744800000000_add-scheduled-notifications.sql`
- `backend/src/services/recommendations.service.ts`
- `constants/interests.ts`
- `sprint_4.md`

**Modified (8):**
- `backend/src/index.ts` - Initialize cron jobs
- `backend/src/routes/competitions.routes.ts` - 3 new endpoints + caching
- `backend/src/routes/payments.routes.ts` - Payment confirmation notification
- `backend/src/routes/registrations.routes.ts` - Registration notification
- `backend/src/services/cron.service.ts` - 2 new cron jobs
- `app/(tabs)/competitions.tsx` - Recommended section
- `app/(tabs)/competitions/[id].tsx` - View tracking
- `app/(tabs)/profile/edit.tsx` - Interest picker
- `services/competitions.service.ts` - New methods

**Total:** 1,077 lines added

---

## User Experience

### Visible Changes
1. **"Recommended for you"** section on Competitions tab (if user has registrations)
2. **Interest picker** with chips on Profile → Edit page

### Notifications Timeline
- **Immediately:** "Registration Successful!" after registering
- **Immediately:** "Payment Confirmed!" after payment
- **30 minutes later:** "More competitions you might like" (similar competitions)
- **Daily 10 AM:** "Registration closes in 3 days!" or "Last chance! Closes tomorrow"
- **On new competition:** "New [Category] Competition!" to interested users

---

## Setup Instructions

### 1. Run Database Migrations
```bash
psql $DATABASE_URL -f backend/migrations/1744700000000_create-competition-views.sql
psql $DATABASE_URL -f backend/migrations/1744800000000_add-scheduled-notifications.sql
```

### 2. Restart Backend
Backend will automatically initialize all cron jobs on startup.

### 3. Verify Cron Jobs
Check logs for:
```
[Cron] Scheduled notification sender job scheduled (every 5 minutes)
[Cron] Deadline urgency reminder job scheduled (daily at 10:00 AM)
[Cron] All cron jobs initialized
```

---

## Testing

**Test Recommendations:**
1. Register for at least 1 competition
2. Go to Competitions tab
3. Look for "✨ Recommended for you" section

**Test Interest Picker:**
1. Go to Profile → Edit
2. Scroll to Interests
3. Tap chips to select/deselect
4. Save changes

**Test Notifications:**
1. Register for a new competition → notification appears immediately
2. Complete payment → notification appears immediately
3. Wait 30-35 minutes → "More competitions you might like" notification

---

## Analytics Events

- `recommendation_clicked` - User clicks recommended competition (includes score)
- `competition_viewed` - Enhanced with view duration

---
