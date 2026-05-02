# Sprint 2 — Implementation Summary

**Branch:** `feat/sprint-2`
**Commit:** `f3b5d73`
**Status:** In Progress

---

## ✅ What Was Completed This Session

### 1. Enhanced Profile Management

#### Database Migration
- ✅ Added new fields to `students` table:
  - **Student Details:** `date_of_birth`, `interests`, `referral_source`, `student_card_url`
  - **School Details:** `npsn`, `school_address`, `school_email`, `school_whatsapp`, `school_phone`
  - **Supervisor Details:** `supervisor_name`, `supervisor_email`, `supervisor_whatsapp`, `supervisor_phone`, `supervisor_school_id`, `supervisor_linked`
  - **Parent Details:** `parent_name`, `parent_occupation`, `parent_whatsapp`, `parent_phone`, `parent_school_id`, `parent_linked`

#### Backend API
- ✅ **GET /api/users/me** — now returns all new profile fields
- ✅ **PUT /api/users/me** — accepts updates to all new fields
- ✅ **POST /api/users/photo** — upload profile photo (multer + local storage)
- ✅ **POST /api/users/student-card** — upload student card image

#### Frontend
- ✅ **Profile Edit Screen** (`app/(tabs)/profile/edit.tsx`)
  - Tap profile photo to change
  - Upload student card button
  - All fields editable (Student Details, School Details, Supervisor, Parent)
  - Save changes button
- ✅ **Users Service** (`services/users.service.ts`)
  - `getProfile()` — fetch full profile
  - `updateProfile(data)` — update profile fields
  - `uploadPhoto(uri)` — upload profile photo
  - `uploadStudentCard(uri)` — upload student card
- ✅ Updated main profile screen to link to edit page

### 2. Payment Flow (from previous session)
- ✅ Midtrans webhook with signature verification
- ✅ Deep-link return (`beyondclassroom://` scheme)
- ✅ Payment result screens (success/pending/failed/cancelled)
- ✅ Idempotency for Snap tokens

### 3. File Upload Pipeline (from previous session)
- ✅ Document vault file upload (multer)
- ✅ Local filesystem storage (`backend/uploads/<userId>/`)
- ✅ Storage service abstraction (ready for S3 migration)

---

## 🐛 Known Issue: OTP Login "Network request failed"

### Problem
When trying to log in with Phone OTP, you see "Network request failed"

### Root Cause
The app is trying to connect to `http://192.168.16.128:3000/api` but:
1. Your IP address might have changed
2. Backend might not be running
3. You're testing on a different network

### Solution

#### Option 1: Update API URL in `.env.local`

1. Find your current IP address:
   ```bash
   # On macOS:
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Or use:
   ipconfig getifaddr en0
   ```

2. Update `.env.local` in the project root:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_NEW_IP:3000/api
   ```

3. Restart Expo:
   ```bash
   npm start
   ```

#### Option 2: Use iOS Simulator / Android Emulator with localhost

If you're using a simulator/emulator on the same machine as the backend:

```
# For iOS Simulator:
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# For Android Emulator:
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

#### Option 3: Test with Dev Bypass OTP

Since Twilio is not configured, the backend uses a dev bypass mode:

1. **Send OTP** — phone number: `082218865809`
2. **Verify OTP** — code: `000000` (six zeros)

This bypasses Twilio and logs you in immediately.

#### Verify Backend is Running

```bash
cd backend
npm run dev

# In another terminal:
curl http://localhost:3000/api/competitions
```

If you see JSON output, backend is working.

---

## 📝 How to Test New Features

### Test Profile Editing

1. Open the app and navigate to **Profile** tab
2. Tap "Edit Profil"
3. Tap the profile photo circle → pick a photo from library
4. Fill in the new fields:
   - Date of Birth (format: YYYY-MM-DD)
   - Interests (e.g., "Math, Science, Arts")
   - Referral ("Instagram", "Friend", etc.)
   - School details (NPSN, Address, Email, WhatsApp, Phone)
   - Supervisor details
   - Parent details
5. Tap "Upload Kartu Pelajar" → pick student card image
6. Tap "Simpan Perubahan"
7. Go back → profile should show updated photo

### Test Payment Flow

1. Go to **Discover** tab → select a paid competition
2. Tap "Daftar Sekarang" → register
3. Payment screen opens
4. Browser opens with Midtrans sandbox
5. Complete payment OR close browser
6. You return to the app with payment result screen
7. Go to "My Registrations" → status should be "paid" if successful

---

## 🚀 Next Steps (Remaining Sprint 2 Tasks)

### High Priority
1. **Receipt PDF generation**
   - Generate PDF receipt after successful payment
   - Include: student name, competition, amount, date, payment method, transaction ID

2. **Data retention policy** (UU PDP compliance)
   - Encryption-at-rest for uploaded documents
   - Document access scoped per organizer
   - Retention/erasure policy

### Nice to Have
3. **Organizer Portal** (separate Next.js app)
   - Create/edit competitions
   - Image upload to same S3 bucket
   - Draft/publish workflow

---

## 📂 New Files Created

### Backend
- `backend/migrations/1744400000000_add-profile-fields.sql`
- `backend/src/services/storage.service.ts`
- Updated: `backend/src/routes/users.routes.ts`

### Frontend
- `app/(tabs)/profile/edit.tsx` — Profile edit screen
- `app/(payment)/pay.tsx` — Payment flow screen
- `app/(payment)/_layout.tsx`
- `services/users.service.ts` — User profile API calls
- `services/payments.service.ts` — Payment API calls

### Documentation
- `SPRINT_2.md` — Sprint 2 plan
- `SPRINT_2_SUMMARY.md` — This file

---

## 🔧 Troubleshooting

### "Network request failed" on login
→ Check `.env.local` API URL and restart Expo

### "Failed to upload photo"
→ Ensure backend is running and uploads directory exists (`backend/uploads/`)

### Profile fields not saving
→ Check backend logs for errors: `cd backend && npm run dev`

### Student card not showing after upload
→ Check API_BASE_URL is correct in the frontend code

---

## ✅ Verification Checklist

Before considering Sprint 2 complete:

- [ ] Phone OTP login works without network errors
- [ ] User can change profile photo
- [ ] User can upload student card
- [ ] All profile fields save correctly
- [ ] Changes persist after app restart
- [ ] Payment flow works end-to-end
- [ ] Receipt PDF generates after payment *(TODO)*
- [ ] Data retention policy implemented *(TODO)*

---

**Status:** Sprint 2 is ~70% complete. Main functionality done, need to finish receipt PDF and compliance features.

