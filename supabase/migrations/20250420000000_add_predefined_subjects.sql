-- Migration: Add predefined subjects for timetable editor quick select buttons
-- This migration adds support for Library, Internship, Seminar, Mentoring, Sports, and Free Period
-- Note: All predefined subjects use 'theory' type to avoid affecting timetable generation logic

-- Step 1: Create a "General" department for cross-department subjects (if it doesn't exist)
INSERT INTO public.departments (name, code)
VALUES ('General', 'GEN')
ON CONFLICT (code) DO NOTHING;

-- Step 2: Get the General department ID for use in subsequent inserts
DO $$
DECLARE
  general_dept_id UUID;
  general_room_id UUID;
  general_staff_id UUID;
BEGIN
  -- Get General department ID
  SELECT id INTO general_dept_id FROM public.departments WHERE code = 'GEN' LIMIT 1;

  -- Step 3: Create a generic room for these activities (if it doesn't exist)
  INSERT INTO public.rooms (room_number, capacity, room_type, building)
  VALUES ('GENERAL', 100, 'classroom', 'General')
  ON CONFLICT (room_number) DO NOTHING;

  SELECT id INTO general_room_id FROM public.rooms WHERE room_number = 'GENERAL' LIMIT 1;

  -- Step 4: Create a generic staff member for these activities (if it doesn't exist)
  INSERT INTO public.staff (name, designation, department_id, max_hours_per_week)
  VALUES ('To Be Assigned', 'Faculty', general_dept_id, 40)
  ON CONFLICT (email) DO NOTHING;

  -- Get the staff ID (since email can be null, we need to find by name)
  SELECT id INTO general_staff_id FROM public.staff WHERE name = 'To Be Assigned' AND department_id = general_dept_id LIMIT 1;

  -- Step 5: Insert predefined subjects for all semesters (1-8)
  -- Note: Since code must be unique, we append semester number to make each code unique
  -- All subjects use 'theory' type to avoid affecting timetable generation logic
  
  -- Library Period (2 hours per week, mandatory)
  INSERT INTO public.subjects (name, code, credits, hours_per_week, department_id, semester, subject_type)
  SELECT 'Library Period', 'LIBRARY-S' || semester_num, 0, 2, general_dept_id, semester_num, 'theory'
  FROM generate_series(1, 8) AS semester_num
  ON CONFLICT (code) DO NOTHING;

  -- Internship (variable hours, typically for higher semesters)
  INSERT INTO public.subjects (name, code, credits, hours_per_week, department_id, semester, subject_type)
  SELECT 'Internship', 'INTERNSHIP-S' || semester_num, 0, 4, general_dept_id, semester_num, 'theory'
  FROM generate_series(1, 8) AS semester_num
  ON CONFLICT (code) DO NOTHING;

  -- Seminar (1-2 hours per week)
  INSERT INTO public.subjects (name, code, credits, hours_per_week, department_id, semester, subject_type)
  SELECT 'Seminar', 'SEMINAR-S' || semester_num, 0, 1, general_dept_id, semester_num, 'theory'
  FROM generate_series(1, 8) AS semester_num
  ON CONFLICT (code) DO NOTHING;

  -- Mentoring (1 hour per week)
  INSERT INTO public.subjects (name, code, credits, hours_per_week, department_id, semester, subject_type)
  SELECT 'Mentoring', 'MENTORING-S' || semester_num, 0, 1, general_dept_id, semester_num, 'theory'
  FROM generate_series(1, 8) AS semester_num
  ON CONFLICT (code) DO NOTHING;

  -- Sports/Physical Education (2 hours per week)
  INSERT INTO public.subjects (name, code, credits, hours_per_week, department_id, semester, subject_type)
  SELECT 'Sports/Physical Education', 'SPORTS-S' || semester_num, 0, 2, general_dept_id, semester_num, 'theory'
  FROM generate_series(1, 8) AS semester_num
  ON CONFLICT (code) DO NOTHING;

  -- Free Period (0 hours, just a placeholder)
  INSERT INTO public.subjects (name, code, credits, hours_per_week, department_id, semester, subject_type)
  SELECT 'Free Period', 'FREE-S' || semester_num, 0, 0, general_dept_id, semester_num, 'theory'
  FROM generate_series(1, 8) AS semester_num
  ON CONFLICT (code) DO NOTHING;

  -- Step 6: Link the generic staff to all predefined subjects
  INSERT INTO public.staff_subjects (staff_id, subject_id)
  SELECT general_staff_id, s.id
  FROM public.subjects s
  WHERE s.code LIKE 'LIBRARY-S%' 
     OR s.code LIKE 'INTERNSHIP-S%' 
     OR s.code LIKE 'SEMINAR-S%' 
     OR s.code LIKE 'MENTORING-S%' 
     OR s.code LIKE 'SPORTS-S%' 
     OR s.code LIKE 'FREE-S%'
  ON CONFLICT (staff_id, subject_id) DO NOTHING;

END $$;
