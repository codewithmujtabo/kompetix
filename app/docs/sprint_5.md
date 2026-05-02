# Sprint 5: Parent Accounts & School Management

**Completion Date:** April 18, 2026
**Status:** ✅ Complete

## Overview

Sprint 5 implements three major features to enhance platform capabilities for parents and school administrators:
- **S09-S10:** Parent account linking with PIN-based verification
- **S11:** Bulk registration via CSV upload with background processing
- **S12:** School admin role and management dashboard

## Features Implemented

### Track A: Parent Account Linking (S09-S10)

**Goal:** Allow students to link their accounts to parent accounts for monitoring

**Implementation:**
- **Database Tables:**
  - `parent_student_links`: Junction table for many-to-many parent-student relationships
  - `invitations`: Temporary invitations with 6-digit PIN codes (24-hour expiry)

- **Backend API Endpoints:**
  - `POST /api/parents/invite-parent` - Student sends invitation to parent email
  - `POST /api/parents/accept-invitation` - Parent accepts with PIN
  - `GET /api/parents/my-children` - Parent views linked children with registrations
  - `GET /api/parents/pending-invitations` - Student views pending approvals
  - `PUT /api/parents/links/:linkId/approve` - Student approves/rejects link

- **Frontend Screens:**
  - `app/(tabs)/profile/link-parent.tsx` - Student invitation interface
  - `app/(tabs)/children.tsx` - Parent dashboard to view linked children
  - Tab conditionally shown for parent role only

**User Flow:**
1. Student enters parent email → 6-digit PIN sent via email
2. Parent logs in, enters PIN → link created with status 'pending'
3. Student receives notification, approves/rejects link
4. Parent can view child's registrations in "My Children" tab

**Security Features:**
- PIN codes expire after 24 hours
- Duplicate invitation prevention (one pending per email-student pair)
- Student approval required before parent can view data
- Role-based access control

### Track B: Bulk Registration (S11)

**Goal:** Enable teachers/school admins to register multiple students via CSV upload

**Implementation:**
- **Database Tables:**
  - `bulk_registration_jobs`: Tracks upload jobs with status, progress, and errors
  - `students.nisn`: Added NISN field for Indonesian student ID verification

- **Background Processing:**
  - Cron job runs every minute to process pending jobs
  - Row-by-row processing with error tracking
  - Progress updates every 10 rows
  - Duplicate detection by email or NISN

- **Backend API Endpoints:**
  - `POST /api/bulk-registration/upload` - Upload CSV file
  - `GET /api/bulk-registration/jobs/:jobId` - Poll job status
  - `GET /api/bulk-registration/jobs` - List recent uploads

- **Frontend Screen:**
  - `app/bulk-registration.tsx` - File picker, progress tracking, error display

**CSV Format:**
```csv
full_name,email,phone,nisn,grade,competition_id
John Doe,john@example.com,081234567890,0123456789,10,comp-123
```

**Processing Features:**
- Validates NISN format (10 digits)
- Creates student accounts if they don't exist (default password: `password123`)
- Checks competition availability and registration deadlines
- Prevents duplicate registrations
- Generates detailed error reports

**Error Handling:**
- Invalid CSV format → rejected at upload
- Invalid NISN → row skipped with error
- Duplicate student → row skipped with warning
- Competition closed → row skipped with error
- Job progress tracked in real-time

### Track C: School Admin Dashboard (S12)

**Goal:** Provide school administrators with student and registration management tools

**Implementation:**
- **Database Tables:**
  - `schools`: Master table with NPSN (Indonesian school ID)
  - `users.school_id`: Links users to schools
  - `users.role`: Updated constraint to include 'school_admin'

- **Backend API Endpoints:**
  - `POST /api/schools` - Create school
  - `GET /api/schools/my-school` - View school details
  - `GET /api/schools/students` - List students (with search, grade filter, pagination)
  - `GET /api/schools/registrations` - List registrations
  - `GET /api/schools/export/csv` - Export student list (CSV)
  - `GET /api/schools/export/registrations/pdf` - Export registration report (PDF)

- **Frontend Screen:**
  - `app/school-dashboard.tsx` - Three-tab dashboard

**Dashboard Features:**
- **Students Tab:**
  - Search by name or email
  - Filter by grade (7-12)
  - View registration count per student
  - Paginated list (50 per page)

- **Registrations Tab:**
  - View all school registrations
  - Filter by competition or status
  - Display student and competition details

- **Analytics Tab:**
  - Total student count
  - Total registration count
  - Placeholder for future charts

**Authorization:**
- School admins can only access their own school's data
- Data isolation enforced at database query level
- Teachers have dedicated dashboard with three tabs (see Teacher Dashboard below)

### Teacher Dashboard (Post-Sprint Enhancement)

**Goal:** Provide teachers with an engaging, data-rich interface for student management and analytics

**Implementation:**
- **Frontend Screens (3 new tabs):**
  - `app/(tabs)/teacher-students.tsx` - Student management
  - `app/(tabs)/teacher-analytics.tsx` - Data visualizations
  - `app/(tabs)/teacher-actions.tsx` - Quick actions dashboard

- **Role Separation:**
  - Distinguished teacher from school_admin role
  - Teachers see: My Students, Analytics, Actions tabs
  - School admins keep separate dashboard access (competition management, notifications)

**Teacher Features:**

**1. My Students Tab:**
- Search students by name or email
- Filter by grade (7-12)
- Quick stats cards:
  - Total students count
  - Total registrations count
  - Active students count
- Student cards displaying:
  - Avatar/initial
  - Full name and NISN
  - Email
  - Registration count
- Bulk registration button in header

**2. Analytics Tab:**
- Key metrics cards:
  - Total registrations with month-over-month change
  - Active students count
  - Average registrations per student
- Bar chart: Registrations by month (Victory Native)
- Pie chart: Competition categories distribution (Academic, Arts, Sports, Debate)
- Progress bars: Participation by grade levels
- Success rate metrics (Confirmed/Pending/Rejected percentages)

**3. Actions Tab:**
- Quick action cards:
  - Bulk Registration (navigates to bulk upload screen)
  - Export Student Data (CSV download)
  - Send Reminder (notify students about deadlines)
  - View Reports (detailed performance reports)
- Upcoming deadlines section:
  - Competition name and deadline date
  - Days left with urgency badges (urgent vs upcoming)
  - Student registration count per competition
- Recent activities feed:
  - Bulk registration actions
  - Data exports
  - Reminder notifications
  - Color-coded icons

**Data Visualization:**
- Installed Victory Native charts library (version 41.20.2)
- Charts include:
  - Bar charts for time series data
  - Pie charts for category distribution
  - Custom progress bars for grade participation
  - Metrics cards with trend indicators

**Technical Implementation:**
- Uses mock data for rapid UI development (backend API integration pending)
- Responsive design with proper spacing and shadows
- Color-coded visualizations matching brand theme
- Real-time search and filtering
- Tab visibility controlled via Expo Router `href` prop

**UI/UX Enhancements:**
- Engaging visual design with charts and diagrams
- Quick access to common tasks
- Deadline tracking with urgency indicators
- Activity history for auditing
- Consistent design system (Brand colors, shadows, typography)

**Files Created:**
1. `app/(tabs)/teacher-students.tsx` - Student list with search/filters (380 lines)
2. `app/(tabs)/teacher-analytics.tsx` - Charts and visualizations (358 lines)
3. `app/(tabs)/teacher-actions.tsx` - Quick actions dashboard (380 lines)

**Files Modified:**
1. `app/(tabs)/_layout.tsx` - Added teacher tab definitions
2. `app/(tabs)/profile/index.tsx` - Removed school dashboard from teacher profile
3. `backend/src/routes/auth.routes.ts` - Added school_admin role data fetching

**Dependencies Added:**
- `victory-native@41.20.2` - Chart library for React Native
- `react-native-svg@15.15.4` - Peer dependency for Victory Native

**User Feedback Addressed:**
- "make teachers page different not just two tabs... something more interesting with diagrams"
- Created three engaging tabs with data visualizations
- Separated teacher and school_admin roles in UI and backend

## Database Schema Changes

### New Tables

**parent_student_links:**
```sql
id UUID PRIMARY KEY
parent_id UUID → users(id)
student_id UUID → users(id)
status TEXT ('pending', 'active', 'rejected')
created_at TIMESTAMPTZ
approved_at TIMESTAMPTZ
UNIQUE(parent_id, student_id)
```

**invitations:**
```sql
id UUID PRIMARY KEY
student_id UUID → users(id)
parent_email TEXT
verification_pin TEXT (6 digits)
expires_at TIMESTAMPTZ (24 hours from creation)
status TEXT ('pending', 'accepted', 'expired')
```

**bulk_registration_jobs:**
```sql
id UUID PRIMARY KEY
uploaded_by UUID → users(id)
file_name TEXT
total_rows INTEGER
processed_rows INTEGER
successful_rows INTEGER
failed_rows INTEGER
status TEXT ('pending', 'processing', 'completed', 'failed')
errors JSONB (array of {row, error})
csv_data JSONB (parsed rows)
created_at, completed_at TIMESTAMPTZ
```

**schools:**
```sql
id UUID PRIMARY KEY
npsn TEXT UNIQUE (Indonesian school ID)
name TEXT
address TEXT
city TEXT
province TEXT
created_at, updated_at TIMESTAMPTZ
```

### Modified Tables

**students:**
- Added `nisn TEXT UNIQUE` - Indonesian student ID

**users:**
- Added `school_id UUID → schools(id)`
- Updated role constraint to include 'school_admin'

## API Endpoints Summary

### Parent Linking (`/api/parents`)
- `POST /invite-parent` - Send invitation (student)
- `POST /accept-invitation` - Accept with PIN (parent)
- `GET /my-children?status=active` - View children (parent)
- `GET /pending-invitations` - View pending (student)
- `PUT /links/:linkId/approve` - Approve/reject (student)

### Bulk Registration (`/api/bulk-registration`)
- `POST /upload` - Upload CSV file
- `GET /jobs/:jobId` - Get job status
- `GET /jobs` - List jobs

### School Management (`/api/schools`)
- `POST /` - Create school
- `GET /my-school` - Get school details
- `GET /students?grade=10&search=john` - List students
- `GET /registrations?compId=...&status=paid` - List registrations
- `GET /export/csv` - Export students CSV
- `GET /export/registrations/pdf` - Export PDF report

## Files Created/Modified

### Backend Files (13 created/modified)

**New Files:**
1. `backend/migrations/1744900000000_parent-student-linking.sql` - Parent linking migration
2. `backend/migrations/1745000000000_bulk-registration.sql` - Bulk registration migration
3. `backend/migrations/1745100000000_school-admin.sql` - School admin migration
4. `backend/src/routes/parents.routes.ts` - Parent linking endpoints
5. `backend/src/routes/bulk-registration.routes.ts` - Bulk upload endpoints
6. `backend/src/routes/schools.routes.ts` - School management endpoints
7. `backend/src/services/bulk-processor.service.ts` - Background job processor
8. `backend/src/middleware/school-admin.middleware.ts` - Authorization middleware

**Modified Files:**
1. `backend/src/index.ts` - Added new routes
2. `backend/src/services/email.service.ts` - Added PIN email template
3. `backend/src/services/cron.service.ts` - Added bulk job processor cron
4. `backend/src/middleware/auth.ts` - Added userRole to request object
5. `backend/package.json` - Added csv-parse, pdfkit dependencies

### Frontend Files (13 created/modified)

**New Files:**
1. `app/(tabs)/profile/link-parent.tsx` - Student invitation screen
2. `app/(tabs)/children.tsx` - Parent dashboard tab
3. `app/bulk-registration.tsx` - CSV upload screen
4. `app/school-dashboard.tsx` - School admin dashboard
5. `services/parents.service.ts` - Parent API client
6. `app/(tabs)/teacher-students.tsx` - Teacher student management (380 lines)
7. `app/(tabs)/teacher-analytics.tsx` - Teacher analytics with charts (358 lines)
8. `app/(tabs)/teacher-actions.tsx` - Teacher quick actions (380 lines)

**Modified Files:**
1. `app/(tabs)/_layout.tsx` - Added teacher tabs and role-based visibility
2. `app/(tabs)/profile/index.tsx` - Separated teacher from school_admin roles
3. `backend/src/routes/auth.routes.ts` - Added school_admin role data fetching
4. `package.json` - Added victory-native and react-native-svg
5. `package-lock.json` - Updated dependencies

## Dependencies Added

**Backend:**
- `csv-parse@6.2.1` - CSV file parsing
- `pdfkit@0.18.0` - PDF generation for reports
- `@types/pdfkit@0.17.6` - TypeScript definitions
- `expo-server-sdk@6.1.0` - Push notifications (from Sprint 4)
- `node-cron@4.2.1` - Background job scheduling
- `@types/node-cron@3.0.11` - TypeScript definitions for cron

**Frontend:**
- `victory-native@41.20.2` - Chart library for data visualizations
- `react-native-svg@15.15.4` - SVG rendering (peer dependency for Victory)

## Configuration Changes

**Cron Jobs:**
- Added bulk job processor (runs every minute)
- Processes one pending job per run to avoid queue congestion

**Email Templates:**
- Added `sendParentInvitationEmail()` - Sends 6-digit PIN to parent

## Testing Checklist

### Parent Linking ✅
- [x] Student sends invitation → PIN generated and emailed
- [x] Parent enters valid PIN → link created with status 'pending'
- [x] Student approves link → status changes to 'active'
- [x] Parent views children → sees student with registrations
- [x] Duplicate invitation prevention
- [x] PIN expiry after 24 hours
- [x] Multiple parents can link to same student

### Bulk Registration ✅
- [x] Upload valid CSV → job created
- [x] Cron processes job within 1 minute
- [x] Valid rows create users + registrations
- [x] Invalid rows logged in errors array
- [x] Progress updates in real-time
- [x] Job completes successfully
- [x] Duplicate detection works
- [x] NISN validation enforced

### School Dashboard ✅
- [x] School admin sees only their school's data
- [x] Search and filter students works
- [x] Registration list displays correctly
- [x] Export CSV generates file
- [x] Export PDF generates report
- [x] Non-school admins cannot access (403)

## Edge Cases Handled

**Parent Linking:**
1. Expired PINs → Rejected with error message
2. Parent already linked → Duplicate error
3. Student rejects link → Parent notified
4. Multiple children per parent → Allowed
5. Parent account doesn't exist → Invitation sent, user creates account later

**Bulk Registration:**
1. Invalid CSV format → Rejected at upload
2. Empty CSV → Rejected
3. Missing required columns → Clear error message
4. Duplicate students → Skipped with warning
5. Competition full → Error logged per row
6. Large files (1000+ rows) → Processed in batches
7. Job crashes → Status remains 'processing', can be retried manually

**School Dashboard:**
1. Teacher vs School Admin → Only admins have write access
2. Student changes school → Previous school loses access
3. No students in school → Shows empty state
4. Export with no data → Returns empty file

## Security Considerations

1. **PIN Security:**
   - 6-digit random PIN (100000-999999)
   - 24-hour expiry
   - Single-use (marked as 'accepted' after use)
   - Not stored in logs

2. **Data Isolation:**
   - School admins query filtered by school_id
   - Parent-student links require student approval
   - Bulk registration restricted to teacher/school_admin roles

3. **File Upload:**
   - 5MB file size limit
   - CSV-only file type validation
   - Malicious CSV content sanitized during parsing

4. **Authorization:**
   - Role-based middleware (schoolAdminOnly, teacherOrAdminOnly)
   - JWT authentication required for all endpoints
   - User role fetched from database (not trusted from token)

## Performance Optimizations

1. **Database Indexes:**
   - `parent_student_links(parent_id)` WHERE status = 'active'
   - `invitations(parent_email)` WHERE status = 'pending'
   - `bulk_registration_jobs(status)` WHERE status IN ('pending', 'processing')
   - `students(nisn)` WHERE nisn IS NOT NULL
   - `users(school_id)` WHERE school_id IS NOT NULL

2. **Background Processing:**
   - Bulk jobs run asynchronously via cron
   - Progress updates batched (every 10 rows)
   - One job processed per cron run (prevents CPU overload)

3. **Query Optimization:**
   - Pagination for student lists (50 per page)
   - Limited CSV exports (500 rows max)
   - JOIN optimization for school queries

## Known Limitations

1. **Bulk Registration:**
   - Maximum 5MB CSV file size
   - No resume support for failed jobs (must re-upload)
   - Manual retry required if job crashes mid-processing

2. **Parent Linking:**
   - Email-only invitation (no SMS support)
   - PIN codes not memorable (random 6 digits)
   - No notification when invitation expires

3. **School Dashboard:**
   - Basic analytics only (charts planned for Sprint 6)
   - CSV/PDF export requires browser access (not in-app)
   - No bulk edit/delete operations

## Future Enhancements

1. **Parent Linking:**
   - SMS-based PIN delivery (via Twilio)
   - QR code scanning for faster linking
   - Parent-initiated linking (reverse flow)

2. **Bulk Registration:**
   - Redis/Bull queue for better job management
   - Excel file support (.xlsx)
   - Template download for CSV format
   - Job retry logic with resume support

3. **School Dashboard:**
   - Bulk operations (delete multiple students, export filtered lists)
   - In-app CSV/PDF preview before download
   - Email notifications for school events

4. **Teacher Dashboard:**
   - Connect analytics to real backend API (currently using mock data)
   - Export student reports as PDF
   - Customizable reminder templates
   - Email notifications for teacher actions

## Migration Instructions

### Running Migrations

```bash
# From backend directory
npm run db:migrate
```

This will run:
1. `1744900000000_parent-student-linking.sql`
2. `1745000000000_bulk-registration.sql`
3. `1745100000000_school-admin.sql`

### Creating Test Data

**Create a school:**
```bash
curl -X POST http://localhost:4000/api/schools \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "npsn": "12345678",
    "name": "Test High School",
    "city": "Jakarta",
    "province": "DKI Jakarta"
  }'
```

**Create school admin user:**
```sql
UPDATE users SET role = 'school_admin', school_id = '<school_uuid>' WHERE email = 'admin@test.com';
```

**Sample CSV for bulk registration:**
```csv
full_name,email,phone,nisn,grade,competition_id
Alice Johnson,alice@test.com,081234567890,1234567890,10,<comp_id>
Bob Smith,bob@test.com,081234567891,1234567891,11,<comp_id>
```

## Lessons Learned

1. **Background Processing:** Initially tried synchronous CSV processing, but large files (100+ rows) caused timeouts. Switching to cron-based background processing solved this.

2. **PIN vs Magic Link:** Considered magic link emails but chose PIN codes because:
   - Parents often share devices with children
   - PIN entry is faster on mobile
   - Familiar pattern (banking apps, 2FA)

3. **Data Isolation:** School admins initially could see all students. Added school_id filtering to all queries to ensure proper data isolation.

4. **CSV Error Handling:** First version failed entire job on single error. Changed to row-level error tracking so partial uploads succeed.

## Conclusion

Sprint 5 successfully delivered parent account linking, bulk registration, and school admin features. All critical paths are tested and documented. The system is ready for production use with the known limitations listed above.

**Next Sprint:** Sprint 6 will focus on advanced analytics, gamification, and achievement badges.
