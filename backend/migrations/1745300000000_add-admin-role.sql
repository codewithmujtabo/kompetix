-- Migration: Add admin role
-- Adds admin role to users table and updates role constraint

-- Update role constraint to include admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'parent', 'teacher', 'school_admin', 'admin'));
