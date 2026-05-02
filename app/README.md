# 🏆 Beyond Classroom - K-12 Competition Hub for Indonesia

**One-stop registration & payment platform for K-12 competitions in Indonesia**

---

## 📋 Overview

Beyond Classroom solves the fragmentation problem: students, parents, and schools currently manage competition registrations across dozens of websites with different forms, payment methods, and deadlines.

**Our Solution:** A unified mobile + web platform that aggregates competitions, handles payments, and keeps all stakeholders informed.

---

## 🔐 Authentication

### **Signup (Registration)**

- **Email** - Required (for login)
- **Password** - 6+ characters
- **Phone Number** - For contact
- **Full Name** - User's name
- **School Name** - School/Institution
- **City** - Location
- **Role** - Student, Parent, or Teacher
- **Grade** - Only if Student role

✅ Data saved directly to database on signup
✅ User can login immediately after registration

### **Login**

#### Mode 1: Password Login

- Enter **Phone Number** + **Password**
- Validates against database user record
- Quick sign-in

#### Mode 2: OTP Login

- Enter **Email**
- Click "Send OTP" → Check email for 6-digit code
- Enter OTP → Click "Verify OTP"
- Sign-in complete

Switch between modes using the "or" buttons

---

## 🎯 Project Scope

**Market:** Indonesia | **Platform:** Mobile-first (iOS + Android) + Web | **Version:** v1.0

| Metric                | Target          |
| --------------------- | --------------- |
| 6-month registrations | 1,000 completed |
| Active competitions   | 50+ listings    |
| Organizer partners    | 5+ onboarded    |
| Payment success rate  | ≥95%            |
| D30 retention         | ≥40%            |

---

## � User Personas

- **Student (P1)** 🎒 — Discover & register for competitions
- **Parent (P2)** 👨‍👧 — Monitor child's registrations & pay
- **Teacher (P3)** 📖 — Bulk register students from school
- **Organizer (P4)** 🎯 — Create competitions & review registrations
- **Representative (P5)** 🤝 — Regional partner (v2 scope)

---

## � Core Features (v1)

### **Discovery**

- Browse by category, grade level, deadline, fee
- Search competitions
- See organizer info

### **Registration (4-Step Modal)**

1. Review auto-filled profile info
2. Attach documents from vault
3. Choose payment method (GoPay, OVO, Dana, Bank VA)

---

## 📱 User Registration Flow

### **Step 1: Role Selection**

Choose: Student / Parent / Teacher

### **Step 2: Phone + OTP**

- Enter Indonesian phone number (08xxx or +62xxx)
- Receive 6-digit OTP via SMS
- Verify OTP

### **Step 3: Complete Details**

- Full name (required)
- School name (required)
- Grade (for students only)
- City (required)

### **Step 4: Account Created**

- Auto-saved to Supabase
- Redirected to home
- First-time users see profile setup screen

### **After Login: Profile Setup**

- Add NISN (16-digit National ID)
- Add photo
- Configure notification preferences
- Upload documents to vault

---

## 📝 Competition Registration (4-Step Modal)

1. **Review Info** — Name, school, grade auto-filled
2. **Attach Documents** — Select from vault or upload new
3. **Choose Payment** — GoPay, OVO, Dana, Bank Transfer
4. **Confirm & Pay** — Order summary → Deep-link to payment

**Payment Status Updates:**

- Pending → Paid (via webhook from Midtrans)
- Organizer reviews → Confirmed or Rejected
- Notifications sent via push + WhatsApp

---

## 💳 Payment Flow

```
User selects payment method
  ↓
Midtrans gateway session created
  ↓
Deep-link to e-wallet app OR show Bank VA
  ↓
User completes payment in wallet/bank
  ↓
Webhook callback received
  ↓
Registration status updated (paid)
  ↓
Success confirmation + receipt issued
  ↓
Student & parent notified via push + WA
```

---

## 🔔 Notification Strategy

### **Push Notifications** (Firebase Cloud Messaging)

- Registration confirmation
- Payment confirmation
- Organizer approval/rejection
- Deadline reminders (3 days + 1 day before)
- Recommended competitions (post-registration)
- **Global cap:** 2 push/day per student
- **Silent hours:** 10pm–8am

### **WhatsApp** (WhatsApp Business API)

- Registration confirmation
- Payment status
- Organizer decision
- Deadline urgency
- **Cap:** 2 WA/week per student
- Uses pre-approved Meta templates

### **In-App Notifications**

- Bell icon inbox
- 30-day archive
- Mark as read
- Delete options

---

## 🔐 Security & Privacy

✅ **Phone OTP** — More secure than passwords
✅ **Row-Level Security (RLS)** — Database enforces access control
✅ **Encrypted Storage** — Documents encrypted at rest in S3
✅ **HTTPS** — All API calls encrypted
✅ **PDPA Compliance** — Data privacy for student documents (Indonesia law)
✅ **No Password Storage** — Stateless OTP authentication

---

## 📊 Engagement Features

### **Personalized Discovery**

- "Recommended for you" section based on:
  - Student's grade level
  - Past registration categories
  - Never shows already-registered competitions

### **Smart Notifications**

- Post-registration nudge (30 min after payment)
- New competition alerts (match grade + category)
- Deadline urgency nudges

### **Weekly Digest** (v2)

- Email summary
- WhatsApp summary
- Customizable preferences

---

## 🎯 Success Metrics

Track & optimize:

| Metric                | Definition                               |
| --------------------- | ---------------------------------------- |
| **Signup Rate**       | Users who complete registration          |
| **Registration Rate** | Users who register for ≥1 competition    |
| **Payment Success**   | Registrations that complete payment ≥95% |
| **Completion Rate**   | Registrations approved by organizer      |
| **D30 Retention**     | Users who return within 30 days ≥40%     |
| **Organizer NPS**     | Net Promoter Score from organizers ≥50   |

---

## 🛠️ Development Environment

### **Required**

- Node.js 16+
- npm or yarn
- Expo CLI
- PostgreSQL (local or remote)

### **Recommended**

- TypeScript knowledge
- React Native basics

### **Backend Setup**

```bash
# 1. Set up PostgreSQL database
createdb beyond_classroom

# 2. Run schema
cd backend
cp .env.example .env    # Edit with your DB credentials and JWT secret
psql $DATABASE_URL < src/db/schema.sql
psql $DATABASE_URL < src/db/seed.sql   # Optional: sample competitions

# 3. Install and start
npm install
npm run dev              # Runs on http://localhost:3000
```

### **Mobile App Setup**

```bash
# 1. Install dependencies
cd ..   # back to project root
npm install

# 2. Configure API URL
# Edit .env.local:
# EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000/api

# 3. Start Expo
npm start
# Scan QR code with Expo Go (iOS/Android)
# Or press 'w' for web browser
```

---

## 📝 Database Schema

The database schema is in `backend/src/db/schema.sql`. Tables:
- `users` — Base profile for all roles (with password_hash for auth)
- `otp_codes` — Email OTP verification codes
- `students`, `parents`, `teachers` — Role-specific data
- `competitions` — Competition listings
- `registrations` — User registrations for competitions
- `documents` — Document vault
- `payments` — Payment tracking

---

## 🔐 Authentication

Authentication uses JWT tokens with bcrypt password hashing:
- **Password login** — Email + password
- **OTP login** — Email OTP sent via SMTP (nodemailer)
- Tokens stored in AsyncStorage on mobile
- All protected endpoints require `Authorization: Bearer <token>` header

---

## 📱 Screen Inventory

### **Student Mobile App**

| Tab              | Screens                                                  | Purpose           |
| ---------------- | -------------------------------------------------------- | ----------------- |
| Discover         | Competition list, detail, organizer profile, recommended | Find competitions |
| My Registrations | Dashboard, detail, receipt                               | Track status      |
| Profile          | Overview, edit, vault, docs, settings                    | Manage account    |

### **Organizer Web Portal**

| Section       | Screens                            | Purpose             |
| ------------- | ---------------------------------- | ------------------- |
| Competitions  | List, create, edit, preview        | Manage listings     |
| Registrations | List, detail, bulk approve, export | Review participants |
| Revenue       | Dashboard, payouts                 | Track earnings      |
| Account       | Profile, team, settings            | Account management  |

### **School Admin Dashboard**

| Section       | Screens                     | Purpose           |
| ------------- | --------------------------- | ----------------- |
| Students      | Roster, profile, invite     | Manage students   |
| Registrations | List, bulk register, detail | Register students |
| Reports       | Participation, export       | View analytics    |
| Settings      | School profile, admins      | Config            |

---

## 🚀 Roadmap

### **v1 (Current)** ✅

- Registration & discovery
- Payment integration
- Organizer portal
- School dashboard
- Notifications

### **v2** 🎯

- Representative portal (regional partners)
- Advanced matching algorithm
- Sponsored placements
- Email digest
- In-app messaging

---

## � Design Tokens

**Colors:**

- Primary: #6366F1 (Indigo)
- Success: #10B981 (Green)
- Warning: #F59E0B (Orange)
- Error: #EF4444 (Red)
- Background: #F8FAFC

**Typography:**

- Heading: 24-28px, bold
- Body: 14-16px, regular
- Small: 12-13px, regular

**Spacing:**

- 4px, 8px, 12px, 16px, 20px, 24px, 32px

---

## 📚 API Endpoints (Express.js Backend)

Base URL: `http://localhost:3000/api`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/signup` | No | Create account |
| POST | `/auth/login` | No | Password login |
| POST | `/auth/send-otp` | No | Send email OTP |
| POST | `/auth/verify-otp` | No | Verify OTP login |
| GET | `/auth/me` | Yes | Current user profile |
| GET | `/users/me` | Yes | Full profile + role data |
| PUT | `/users/me` | Yes | Update profile |
| GET | `/registrations` | Yes | List registrations |
| POST | `/registrations` | Yes | Create registration |
| PUT | `/registrations/:id` | Yes | Update status |
| DELETE | `/registrations/:id` | Yes | Delete registration |
| GET | `/documents` | Yes | List documents |
| POST | `/documents` | Yes | Create document |
| DELETE | `/documents/:id` | Yes | Delete document |
| GET | `/competitions` | No | List competitions |
| GET | `/competitions/:id` | No | Competition detail |

---

## � Links & Resources

- **Expo Router:** https://expo.github.io/router
- **React Native:** https://reactnative.dev
- **Express.js:** https://expressjs.com
- **node-postgres:** https://node-postgres.com
- **Midtrans:** https://midtrans.com

---

## � Support & Questions

For issues or questions:

1. Check the Database Schema section
2. Review the Registration Flow documentation
3. Refer to the Feature descriptions above
4. Contact the product team

---

**Status:** v1.0 Draft | **Last Updated:** April 6, 2026 | **Market:** Indonesia

---

## 🐛 Troubleshooting

### "Module not found" errors

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm start -- --clear
```

### Build fails on iOS Simulator

```bash
# Ensure iOS Simulator is running
open -a Simulator

# Then run
npm run ios
```

### App won't reload after changes

```bash
# Press 's' in terminal to send QR code again
# Or restart the dev server:
npm start
```

### Port already in use

```bash
# If port 8081 is in use, specify a different one
npx expo start --port 8082
```

---

## 📚 Learning Resources

- **Expo Documentation**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/
- **Expo Router Guide**: https://docs.expo.dev/router/introduction/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

## 🤝 Contributing

This is a development project. To contribute:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add feature description"`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

---

## 📝 Development Notes

### Current Implementation Status ✅

- ✅ Home screen with banners & recommendations
- ✅ Competitions list & browsing
- ✅ Competition detail page with 3 tabs
- ✅ Registration system (in-memory)
- ✅ Payment status tracking
- ✅ My competitions management
- ✅ News & announcements with expandable detail modal
- ✅ Profile screen placeholder
- ✅ Smart navigation with origin tracking
- ✅ Color-coded UI with consistent design system

### Future Enhancements 🚀

- Backend API integration
- Real authentication system
- AsyncStorage for offline data
- Payment gateway integration
- Push notifications
- Chat/messaging feature
- Leaderboards & achievements

---

## 📄 License

This project is proprietary and created for Eduversal Internship.

---

## 👨‍💻 Developer

**Project Created**: March 2026  
**Current Version**: 1.0.0  
**Status**: Active Development

---

## 📧 Support

For issues, questions, or suggestions, please open an GitHub issue or contact the development team.

---

**Happy Coding! 🚀**
