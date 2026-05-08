-- Drop the orphan parent_school_id column on students (legacy from earlier schema rev).
-- The "parents" table never received this column despite earlier comments — verified empty.

ALTER TABLE students DROP COLUMN IF EXISTS parent_school_id;
