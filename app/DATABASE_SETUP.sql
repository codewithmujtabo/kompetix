-- ============================================================================
-- BEYOND CLASSROOM DATABASE SCHEMA
-- ============================================================================

-- 1. USERS TABLE (Base profile for all roles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT DEFAULT '',
  phone TEXT,
  city TEXT,
  role TEXT DEFAULT 'student',
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable write access for own record" ON users;
DROP POLICY IF EXISTS "Service role can insert user profiles" ON users;

-- 1. SELECT: Users can read their own data only
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- 2. INSERT: Allow any authenticated user to insert their own record
CREATE POLICY "Users can create their own profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 3. UPDATE: Users can update their own profile
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. DELETE: Users can delete their own profile
CREATE POLICY "Users can delete their own profile" ON users
  FOR DELETE
  USING (auth.uid() = id);

-- ============================================================================
-- 2. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  school TEXT,
  grade TEXT,
  nisn TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students can read their own data" ON students;
DROP POLICY IF EXISTS "Students can insert their own profile" ON students;
DROP POLICY IF EXISTS "Students can update their own data" ON students;
CREATE POLICY "Students can read their own data" ON students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Students can insert their own profile" ON students FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Students can update their own data" ON students FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- 3. PARENTS TABLE
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  child_name TEXT,
  child_school TEXT,
  child_grade TEXT,
  relationship TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents can read their own data" ON parents;
DROP POLICY IF EXISTS "Parents can insert their own profile" ON parents;
DROP POLICY IF EXISTS "Parents can update their own data" ON parents;
CREATE POLICY "Parents can read their own data" ON parents FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Parents can insert their own profile" ON parents FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Parents can update their own data" ON parents FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- 4. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  school TEXT,
  subject TEXT,
  department TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers can read their own data" ON teachers;
DROP POLICY IF EXISTS "Teachers can insert their own profile" ON teachers;
DROP POLICY IF EXISTS "Teachers can update their own data" ON teachers;
CREATE POLICY "Teachers can read their own data" ON teachers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Teachers can insert their own profile" ON teachers FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Teachers can update their own data" ON teachers FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- COMPETITIONS TABLE
CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  category TEXT,
  grade_level TEXT,
  fee INTEGER DEFAULT 0,
  quota INTEGER,
  reg_open_date TIMESTAMP,
  reg_close_date TIMESTAMP,
  competition_date TIMESTAMP,
  required_docs TEXT[],
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can read competitions" ON competitions;
CREATE POLICY "Everyone can read competitions" ON competitions FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_competitions_category ON competitions(category);
CREATE INDEX IF NOT EXISTS idx_competitions_grade ON competitions(grade_level);

-- ============================================================================
-- 3. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comp_id TEXT NOT NULL,
  status TEXT DEFAULT 'submitted',
  meta JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their registrations" ON registrations;
DROP POLICY IF EXISTS "Users can insert registrations" ON registrations;
DROP POLICY IF EXISTS "Users can update their registrations" ON registrations;
DROP POLICY IF EXISTS "Users can delete their registrations" ON registrations;
CREATE POLICY "Users can read their registrations" ON registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert registrations" ON registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their registrations" ON registrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their registrations" ON registrations FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_comp_id ON registrations(comp_id);

-- ============================================================================
-- 4. DOCUMENTS TABLE (Student document vault)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their documents" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can delete documents" ON documents;
CREATE POLICY "Users can read their documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete documents" ON documents FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

-- ============================================================================
-- 5. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their payments" ON payments;
DROP POLICY IF EXISTS "Users can insert payments" ON payments;
CREATE POLICY "Users can read their payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON payments(registration_id);
