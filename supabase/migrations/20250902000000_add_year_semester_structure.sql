-- Create Academic Years table
CREATE TABLE academic_years (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    year_name VARCHAR(50) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Semesters table
CREATE TABLE semesters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_name VARCHAR(50) NOT NULL,
    semester_number INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add year and semester references to existing tables
ALTER TABLE sections ADD COLUMN academic_year_id uuid;
ALTER TABLE sections ADD COLUMN semester_id uuid;

ALTER TABLE subjects ADD COLUMN academic_year_id uuid;
ALTER TABLE subjects ADD COLUMN semester_id uuid;

ALTER TABLE college_timings ADD COLUMN academic_year_id uuid;
ALTER TABLE college_timings ADD COLUMN semester_id uuid;
ALTER TABLE college_timings ADD COLUMN section_id uuid;

-- Create timetables table for generated timetables
CREATE TABLE timetables (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_id uuid REFERENCES semesters(id) ON DELETE CASCADE,
    section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
    staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
    room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
    timing_id uuid REFERENCES college_timings(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add staff-subject mapping with year/semester context
CREATE TABLE staff_subject_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_id uuid REFERENCES semesters(id) ON DELETE CASCADE,
    section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(staff_id, subject_id, academic_year_id, semester_id, section_id)
);

-- Insert default academic years
INSERT INTO academic_years (year_name, is_active) VALUES
('1st Year', true),
('2nd Year', true),
('3rd Year', true),
('4th Year', true);

-- Insert default semesters for each year
INSERT INTO semesters (academic_year_id, semester_name, semester_number) 
SELECT ay.id, 'Semester 1', 1 FROM academic_years ay;

INSERT INTO semesters (academic_year_id, semester_name, semester_number) 
SELECT ay.id, 'Semester 2', 2 FROM academic_years ay;

-- Create indexes for better performance
CREATE INDEX idx_sections_year_semester ON sections(academic_year_id, semester_id);
CREATE INDEX idx_subjects_year_semester ON subjects(academic_year_id, semester_id);
CREATE INDEX idx_college_timings_year_semester_section ON college_timings(academic_year_id, semester_id, section_id);
CREATE INDEX idx_timetables_year_semester_section ON timetables(academic_year_id, semester_id, section_id);
CREATE INDEX idx_staff_assignments_year_semester_section ON staff_subject_assignments(academic_year_id, semester_id, section_id);
