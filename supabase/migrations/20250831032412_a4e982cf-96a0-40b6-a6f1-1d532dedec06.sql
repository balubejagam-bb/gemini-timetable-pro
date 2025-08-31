-- Insert sample departments
INSERT INTO public.departments (name, code) VALUES
('Computer Science Engineering', 'CSE'),
('Electronics & Communication Engineering', 'ECE'),
('Mechanical Engineering', 'MECH'),
('Civil Engineering', 'CIVIL'),
('Electrical Engineering', 'EEE'),
('Information Technology', 'IT')
ON CONFLICT (code) DO NOTHING;

-- Get department IDs for inserting related data
DO $$
DECLARE
    cse_id UUID;
    ece_id UUID;
    mech_id UUID;
    civil_id UUID;
    eee_id UUID;
    it_id UUID;
BEGIN
    -- Get department IDs
    SELECT id INTO cse_id FROM public.departments WHERE code = 'CSE';
    SELECT id INTO ece_id FROM public.departments WHERE code = 'ECE';
    SELECT id INTO mech_id FROM public.departments WHERE code = 'MECH';
    SELECT id INTO civil_id FROM public.departments WHERE code = 'CIVIL';
    SELECT id INTO eee_id FROM public.departments WHERE code = 'EEE';
    SELECT id INTO it_id FROM public.departments WHERE code = 'IT';

    -- Insert sections
    INSERT INTO public.sections (name, department_id, semester) VALUES
    ('A', cse_id, 1), ('B', cse_id, 1), ('C', cse_id, 1),
    ('A', ece_id, 1), ('B', ece_id, 1),
    ('A', mech_id, 1), ('B', mech_id, 1),
    ('A', civil_id, 1), ('B', civil_id, 1),
    ('A', eee_id, 1),
    ('A', it_id, 1), ('B', it_id, 1)
    ON CONFLICT (name, department_id) DO NOTHING;

    -- Insert sample subjects
    INSERT INTO public.subjects (name, code, credits, hours_per_week, department_id, semester, subject_type) VALUES
    ('Programming in C', 'CSE101', 4, 4, cse_id, 1, 'theory'),
    ('Data Structures', 'CSE102', 4, 4, cse_id, 1, 'theory'),
    ('Computer Graphics Lab', 'CSE103', 2, 3, cse_id, 1, 'lab'),
    ('Digital Electronics', 'ECE101', 4, 4, ece_id, 1, 'theory'),
    ('Signals & Systems', 'ECE102', 4, 4, ece_id, 1, 'theory'),
    ('Electronics Lab', 'ECE103', 2, 3, ece_id, 1, 'lab'),
    ('Engineering Mechanics', 'MECH101', 4, 4, mech_id, 1, 'theory'),
    ('Thermodynamics', 'MECH102', 4, 4, mech_id, 1, 'theory'),
    ('Surveying', 'CIVIL101', 4, 4, civil_id, 1, 'theory'),
    ('Concrete Technology', 'CIVIL102', 4, 4, civil_id, 1, 'theory'),
    ('Circuit Analysis', 'EEE101', 4, 4, eee_id, 1, 'theory'),
    ('Power Systems', 'EEE102', 4, 4, eee_id, 1, 'theory'),
    ('Web Development', 'IT101', 4, 4, it_id, 1, 'theory'),
    ('Database Systems', 'IT102', 4, 4, it_id, 1, 'theory')
    ON CONFLICT (code) DO NOTHING;

    -- Insert sample staff
    INSERT INTO public.staff (name, email, designation, department_id, max_hours_per_week) VALUES
    ('Dr. Rajesh Kumar', 'rajesh.kumar@mbu.edu.in', 'Professor', cse_id, 20),
    ('Prof. Anita Sharma', 'anita.sharma@mbu.edu.in', 'Associate Professor', cse_id, 18),
    ('Dr. Suresh Reddy', 'suresh.reddy@mbu.edu.in', 'Professor', ece_id, 20),
    ('Prof. Priya Patel', 'priya.patel@mbu.edu.in', 'Assistant Professor', ece_id, 16),
    ('Dr. Venkat Rao', 'venkat.rao@mbu.edu.in', 'Professor', mech_id, 20),
    ('Prof. Lakshmi Devi', 'lakshmi.devi@mbu.edu.in', 'Associate Professor', mech_id, 18),
    ('Dr. Kiran Singh', 'kiran.singh@mbu.edu.in', 'Professor', civil_id, 20),
    ('Prof. Meera Gupta', 'meera.gupta@mbu.edu.in', 'Assistant Professor', civil_id, 16),
    ('Dr. Ravi Prasad', 'ravi.prasad@mbu.edu.in', 'Professor', eee_id, 20),
    ('Prof. Sita Ram', 'sita.ram@mbu.edu.in', 'Associate Professor', it_id, 18)
    ON CONFLICT (email) DO NOTHING;

END $$;

-- Insert sample rooms
INSERT INTO public.rooms (room_number, capacity, room_type, building, floor) VALUES
('101', 60, 'classroom', 'A Block', 1),
('102', 60, 'classroom', 'A Block', 1),
('103', 40, 'lab', 'A Block', 1),
('201', 80, 'classroom', 'A Block', 2),
('202', 80, 'classroom', 'A Block', 2),
('203', 40, 'lab', 'A Block', 2),
('301', 60, 'classroom', 'B Block', 1),
('302', 60, 'classroom', 'B Block', 1),
('303', 40, 'lab', 'B Block', 1),
('401', 100, 'auditorium', 'B Block', 2),
('501', 60, 'classroom', 'C Block', 1),
('502', 60, 'classroom', 'C Block', 1)
ON CONFLICT (room_number) DO NOTHING;