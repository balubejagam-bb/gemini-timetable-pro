-- Sample data seeding for testing the timetable generation
-- Run this in your Supabase SQL editor to populate the database

-- Insert sample departments
INSERT INTO public.departments (id, name, code) VALUES 
  (gen_random_uuid(), 'Computer Science Engineering', 'CSE'),
  (gen_random_uuid(), 'Electronics and Communication', 'ECE'),
  (gen_random_uuid(), 'Mechanical Engineering', 'MECH'),
  (gen_random_uuid(), 'Civil Engineering', 'CIVIL');

-- Insert sample rooms
INSERT INTO public.rooms (id, room_number, capacity, room_type, building, floor) VALUES 
  (gen_random_uuid(), '101', 60, 'classroom', 'Block A', 1),
  (gen_random_uuid(), '102', 60, 'classroom', 'Block A', 1),
  (gen_random_uuid(), '201', 40, 'classroom', 'Block A', 2),
  (gen_random_uuid(), '301', 50, 'classroom', 'Block A', 3),
  (gen_random_uuid(), 'LAB-1', 30, 'lab', 'Block B', 1),
  (gen_random_uuid(), 'LAB-2', 30, 'lab', 'Block B', 1),
  (gen_random_uuid(), 'LAB-3', 25, 'lab', 'Block B', 2),
  (gen_random_uuid(), 'HALL-1', 200, 'auditorium', 'Block C', 1);

-- Get department IDs for foreign key references
DO $$
DECLARE
    cse_id UUID;
    ece_id UUID;
    mech_id UUID;
    civil_id UUID;
BEGIN
    SELECT id INTO cse_id FROM public.departments WHERE code = 'CSE';
    SELECT id INTO ece_id FROM public.departments WHERE code = 'ECE';
    SELECT id INTO mech_id FROM public.departments WHERE code = 'MECH';
    SELECT id INTO civil_id FROM public.departments WHERE code = 'CIVIL';

    -- Insert sample sections for CSE
    INSERT INTO public.sections (id, name, department_id, semester) VALUES 
      (gen_random_uuid(), 'Section A', cse_id, 1),
      (gen_random_uuid(), 'Section B', cse_id, 1),
      (gen_random_uuid(), 'Section A', cse_id, 2),
      (gen_random_uuid(), 'Section A', cse_id, 3);

    -- Insert sample subjects for CSE Semester 1
    INSERT INTO public.subjects (id, name, code, credits, hours_per_week, department_id, semester, subject_type) VALUES 
      (gen_random_uuid(), 'Programming in C', 'CSE101', 4, 4, cse_id, 1, 'theory'),
      (gen_random_uuid(), 'C Programming Lab', 'CSE101L', 2, 3, cse_id, 1, 'lab'),
      (gen_random_uuid(), 'Mathematics-I', 'MATH101', 4, 4, cse_id, 1, 'theory'),
      (gen_random_uuid(), 'Physics', 'PHY101', 3, 3, cse_id, 1, 'theory'),
      (gen_random_uuid(), 'Physics Lab', 'PHY101L', 2, 2, cse_id, 1, 'lab'),
      (gen_random_uuid(), 'English Communication', 'ENG101', 3, 3, cse_id, 1, 'theory');

    -- Insert sample subjects for CSE Semester 2
    INSERT INTO public.subjects (id, name, code, credits, hours_per_week, department_id, semester, subject_type) VALUES 
      (gen_random_uuid(), 'Data Structures', 'CSE201', 4, 4, cse_id, 2, 'theory'),
      (gen_random_uuid(), 'Data Structures Lab', 'CSE201L', 2, 3, cse_id, 2, 'lab'),
      (gen_random_uuid(), 'Mathematics-II', 'MATH201', 4, 4, cse_id, 2, 'theory'),
      (gen_random_uuid(), 'Digital Electronics', 'ECE201', 3, 3, cse_id, 2, 'theory'),
      (gen_random_uuid(), 'Digital Electronics Lab', 'ECE201L', 2, 2, cse_id, 2, 'lab');

    -- Insert sample staff for CSE
    INSERT INTO public.staff (id, name, email, designation, department_id, max_hours_per_week) VALUES 
      (gen_random_uuid(), 'Dr. Rajesh Kumar', 'rajesh@university.edu', 'Professor', cse_id, 18),
      (gen_random_uuid(), 'Prof. Priya Sharma', 'priya@university.edu', 'Associate Professor', cse_id, 20),
      (gen_random_uuid(), 'Mr. Amit Patel', 'amit@university.edu', 'Assistant Professor', cse_id, 22),
      (gen_random_uuid(), 'Ms. Sneha Reddy', 'sneha@university.edu', 'Assistant Professor', cse_id, 20),
      (gen_random_uuid(), 'Dr. Suresh Babu', 'suresh@university.edu', 'Professor', cse_id, 16);

    -- Link staff to subjects they can teach
    -- Get subject and staff IDs for mapping
    DECLARE
        programming_id UUID;
        programming_lab_id UUID;
        math1_id UUID;
        physics_id UUID;
        physics_lab_id UUID;
        english_id UUID;
        ds_id UUID;
        ds_lab_id UUID;
        math2_id UUID;
        digital_id UUID;
        digital_lab_id UUID;
        
        rajesh_id UUID;
        priya_id UUID;
        amit_id UUID;
        sneha_id UUID;
        suresh_id UUID;
    BEGIN
        -- Get subject IDs
        SELECT id INTO programming_id FROM public.subjects WHERE code = 'CSE101';
        SELECT id INTO programming_lab_id FROM public.subjects WHERE code = 'CSE101L';
        SELECT id INTO math1_id FROM public.subjects WHERE code = 'MATH101';
        SELECT id INTO physics_id FROM public.subjects WHERE code = 'PHY101';
        SELECT id INTO physics_lab_id FROM public.subjects WHERE code = 'PHY101L';
        SELECT id INTO english_id FROM public.subjects WHERE code = 'ENG101';
        SELECT id INTO ds_id FROM public.subjects WHERE code = 'CSE201';
        SELECT id INTO ds_lab_id FROM public.subjects WHERE code = 'CSE201L';
        SELECT id INTO math2_id FROM public.subjects WHERE code = 'MATH201';
        SELECT id INTO digital_id FROM public.subjects WHERE code = 'ECE201';
        SELECT id INTO digital_lab_id FROM public.subjects WHERE code = 'ECE201L';

        -- Get staff IDs
        SELECT id INTO rajesh_id FROM public.staff WHERE name = 'Dr. Rajesh Kumar';
        SELECT id INTO priya_id FROM public.staff WHERE name = 'Prof. Priya Sharma';
        SELECT id INTO amit_id FROM public.staff WHERE name = 'Mr. Amit Patel';
        SELECT id INTO sneha_id FROM public.staff WHERE name = 'Ms. Sneha Reddy';
        SELECT id INTO suresh_id FROM public.staff WHERE name = 'Dr. Suresh Babu';

        -- Create staff-subject mappings
        INSERT INTO public.staff_subjects (staff_id, subject_id) VALUES 
          -- Rajesh can teach Programming and Data Structures
          (rajesh_id, programming_id),
          (rajesh_id, programming_lab_id),
          (rajesh_id, ds_id),
          (rajesh_id, ds_lab_id),
          
          -- Priya can teach Math subjects
          (priya_id, math1_id),
          (priya_id, math2_id),
          
          -- Amit can teach Programming and Digital Electronics
          (amit_id, programming_id),
          (amit_id, programming_lab_id),
          (amit_id, digital_id),
          (amit_id, digital_lab_id),
          
          -- Sneha can teach Physics
          (sneha_id, physics_id),
          (sneha_id, physics_lab_id),
          
          -- Suresh can teach English and Data Structures
          (suresh_id, english_id),
          (suresh_id, ds_id),
          (suresh_id, ds_lab_id);
    END;
END;
$$;
