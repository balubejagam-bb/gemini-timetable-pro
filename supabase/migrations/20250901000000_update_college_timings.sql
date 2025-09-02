-- Add new columns to the college_timings table
ALTER TABLE college_timings ADD COLUMN academic_year INTEGER NOT NULL DEFAULT 1;
ALTER TABLE college_timings ADD COLUMN semester INTEGER NOT NULL DEFAULT 1;
ALTER TABLE college_timings ADD COLUMN section TEXT;

-- Create an index for faster queries
CREATE INDEX idx_college_timings_year_sem_section
ON college_timings(academic_year, semester, section);

-- Add a unique constraint to avoid duplicate timings
-- Each combination of academic_year, semester, section, day_of_week should be unique
ALTER TABLE college_timings
ADD CONSTRAINT unique_timing_for_class
UNIQUE (academic_year, semester, section, day_of_week);
