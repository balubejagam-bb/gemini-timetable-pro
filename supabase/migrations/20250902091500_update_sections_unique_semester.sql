-- Update unique constraint on sections to include semester
-- (If your Supabase instance uses 'public' schema this is equivalent)
ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_name_department_id_key;
ALTER TABLE sections ADD CONSTRAINT sections_name_department_id_semester_key UNIQUE(name, department_id, semester);
