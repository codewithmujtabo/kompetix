-- Teacher-student links: each teacher explicitly links to students they supervise.
-- Teacher adds student by email; scopes all teacher dashboard data to linked students only.

CREATE TABLE IF NOT EXISTS teacher_student_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_tsl_teacher ON teacher_student_links(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tsl_student ON teacher_student_links(student_id);
