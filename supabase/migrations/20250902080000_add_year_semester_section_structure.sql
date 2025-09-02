-- Migration to add year-wise, semester-wise, and section-wise organization
-- Created on 2025-09-02

-- Create academic_years table to store information about each academic year
CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_number INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create semesters table (more detailed than just numbers)
CREATE TABLE semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_number INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (academic_year_id, semester_number)
);

-- Alter existing sections table to link with academic_year and semester
ALTER TABLE sections ADD academic_year_id UUID;
ALTER TABLE sections ADD year_number INT;
ALTER TABLE sections ADD CONSTRAINT fk_sections_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);

-- Add year_number to subjects
ALTER TABLE subjects ADD academic_year_id UUID;
ALTER TABLE subjects ADD year_number INT;
ALTER TABLE subjects ADD semester_number INT;
ALTER TABLE subjects ADD CONSTRAINT fk_subjects_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);

-- Add semester_number to rooms (for rooms dedicated to specific semesters)
ALTER TABLE rooms ADD preferred_year_number INT;
ALTER TABLE rooms ADD preferred_semester_number INT;

-- Modify staff_subjects table to include year and semester
ALTER TABLE staff_subjects ADD academic_year_id UUID;
ALTER TABLE staff_subjects ADD year_number INT;
ALTER TABLE staff_subjects ADD semester_number INT;
ALTER TABLE staff_subjects ADD CONSTRAINT fk_staff_subjects_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id);

-- Create indices for performance
CREATE INDEX idx_sections_academic_year ON sections(academic_year_id);
CREATE INDEX idx_subjects_academic_year ON subjects(academic_year_id);
CREATE INDEX idx_subjects_year_semester ON subjects(year_number, semester_number);
CREATE INDEX idx_staff_subjects_year_sem ON staff_subjects(academic_year_id, year_number, semester_number);
CREATE INDEX idx_rooms_preferred_year_sem ON rooms(preferred_year_number, preferred_semester_number);

-- Create a view for easy access to section details with year and semester info
CREATE OR REPLACE VIEW section_details AS
SELECT 
    s.id,
    s.name,
    s.department_id,
    s.semester,
    s.academic_year_id,
    s.year_number,
    ay.name AS academic_year_name,
    sem.name AS semester_name,
    d.name AS department_name,
    d.code AS department_code
FROM sections s
LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
LEFT JOIN semesters sem ON sem.academic_year_id = ay.id AND sem.semester_number = s.semester
LEFT JOIN departments d ON s.department_id = d.id;

-- Create a view for subject details with year and semester info
CREATE OR REPLACE VIEW subject_details AS
SELECT 
    s.id,
    s.name,
    s.code,
    s.subject_type,
    s.department_id,
    s.academic_year_id,
    s.year_number,
    s.semester_number,
    ay.name AS academic_year_name,
    d.name AS department_name
FROM subjects s
LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
LEFT JOIN departments d ON s.department_id = d.id;

-- Modify college_timings table to ensure it has the required fields
ALTER TABLE college_timings ADD year_number INT;
ALTER TABLE college_timings ADD section_id UUID;
ALTER TABLE college_timings ADD CONSTRAINT fk_college_timings_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;

-- Populate academic_years with default data
INSERT INTO academic_years (year_number, name, is_active)
VALUES 
(1, 'First Year', true),
(2, 'Second Year', true),
(3, 'Third Year', true),
(4, 'Fourth Year', true)
ON CONFLICT (id) DO NOTHING;

-- For each academic year, populate semester data
DO $$
DECLARE
    academic_year_rec RECORD;
BEGIN
    FOR academic_year_rec IN SELECT id, year_number FROM academic_years LOOP
        -- Populate semesters for each academic year
        INSERT INTO semesters (academic_year_id, semester_number, name)
        VALUES 
            (academic_year_rec.id, 1, 'Semester 1'),
            (academic_year_rec.id, 2, 'Semester 2')
        ON CONFLICT (academic_year_id, semester_number) DO NOTHING;
    END LOOP;
END $$;
