-- Add new fields to subjects table for better scheduling
ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS is_elective BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS min_periods_per_week INTEGER DEFAULT 5;

-- Add new fields to staff table for cross-department teaching
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS can_teach_across_departments BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS availability TEXT[] DEFAULT '{}';

-- Add new fields to departments table
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS hod TEXT;

-- Update existing subjects to have minimum 5 periods per week
UPDATE public.subjects 
SET min_periods_per_week = GREATEST(5, hours_per_week)
WHERE min_periods_per_week IS NULL OR min_periods_per_week < 5;

-- Create a view for department statistics
CREATE OR REPLACE VIEW public.department_stats AS
SELECT 
    d.*,
    COALESCE(s.subject_count, 0) as total_subjects,
    COALESCE(st.staff_count, 0) as total_staff,
    COALESCE(sec.section_count, 0) as total_sections
FROM public.departments d
LEFT JOIN (
    SELECT department_id, COUNT(*) as subject_count 
    FROM public.subjects 
    GROUP BY department_id
) s ON d.id = s.department_id
LEFT JOIN (
    SELECT department_id, COUNT(*) as staff_count 
    FROM public.staff 
    GROUP BY department_id
) st ON d.id = st.department_id
LEFT JOIN (
    SELECT department_id, COUNT(*) as section_count 
    FROM public.sections 
    GROUP BY department_id
) sec ON d.id = sec.department_id;

-- Create function to get staff qualified for a subject
CREATE OR REPLACE FUNCTION public.get_qualified_staff_for_subject(subject_id_param UUID)
RETURNS TABLE (
    staff_id UUID,
    staff_name TEXT,
    department_name TEXT,
    can_teach BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as staff_id,
        s.name as staff_name,
        d.name as department_name,
        CASE 
            WHEN ss.staff_id IS NOT NULL THEN TRUE
            WHEN s.can_teach_across_departments = TRUE THEN TRUE
            ELSE FALSE
        END as can_teach
    FROM public.staff s
    JOIN public.departments d ON s.department_id = d.id
    LEFT JOIN public.staff_subjects ss ON s.id = ss.staff_id AND ss.subject_id = subject_id_param
    LEFT JOIN public.subjects sub ON sub.id = subject_id_param
    WHERE 
        ss.staff_id IS NOT NULL OR 
        s.can_teach_across_departments = TRUE OR 
        s.department_id = (SELECT department_id FROM public.subjects WHERE id = subject_id_param)
    ORDER BY 
        CASE WHEN ss.staff_id IS NOT NULL THEN 1 ELSE 2 END,
        s.name;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate timetable conflicts with enhanced checking
CREATE OR REPLACE FUNCTION public.check_timetable_conflicts(
    section_id_param UUID,
    staff_id_param UUID,
    room_id_param UUID,
    day_of_week_param INTEGER,
    time_slot_param INTEGER,
    exclude_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
    conflict_type TEXT,
    conflict_message TEXT
) AS $$
BEGIN
    -- Check for section conflicts
    IF EXISTS (
        SELECT 1 FROM public.timetables 
        WHERE section_id = section_id_param 
        AND day_of_week = day_of_week_param 
        AND time_slot = time_slot_param
        AND (exclude_id_param IS NULL OR id != exclude_id_param)
    ) THEN
        RETURN QUERY SELECT 'section'::TEXT, 'Section already has a class at this time'::TEXT;
    END IF;

    -- Check for staff conflicts
    IF EXISTS (
        SELECT 1 FROM public.timetables 
        WHERE staff_id = staff_id_param 
        AND day_of_week = day_of_week_param 
        AND time_slot = time_slot_param
        AND (exclude_id_param IS NULL OR id != exclude_id_param)
    ) THEN
        RETURN QUERY SELECT 'staff'::TEXT, 'Staff member already has a class at this time'::TEXT;
    END IF;

    -- Check for room conflicts
    IF EXISTS (
        SELECT 1 FROM public.timetables 
        WHERE room_id = room_id_param 
        AND day_of_week = day_of_week_param 
        AND time_slot = time_slot_param
        AND (exclude_id_param IS NULL OR id != exclude_id_param)
    ) THEN
        RETURN QUERY SELECT 'room'::TEXT, 'Room is already booked at this time'::TEXT;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subjects_department_semester ON public.subjects(department_id, semester);
CREATE INDEX IF NOT EXISTS idx_staff_subjects_staff_id ON public.staff_subjects(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_subjects_subject_id ON public.staff_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetables_section_day_slot ON public.timetables(section_id, day_of_week, time_slot);
CREATE INDEX IF NOT EXISTS idx_timetables_staff_day_slot ON public.timetables(staff_id, day_of_week, time_slot);
CREATE INDEX IF NOT EXISTS idx_timetables_room_day_slot ON public.timetables(room_id, day_of_week, time_slot);

-- Add constraints to ensure data integrity
ALTER TABLE public.subjects 
ADD CONSTRAINT check_min_periods_valid 
CHECK (min_periods_per_week >= 3 AND min_periods_per_week <= 12);

ALTER TABLE public.subjects 
ADD CONSTRAINT check_hours_vs_min_periods 
CHECK (hours_per_week >= min_periods_per_week);

-- Insert some sample specializations for demonstration
-- This would typically be done through the UI
INSERT INTO public.departments (name, code, description) VALUES
('Computer Science Engineering', 'CSE', 'Focuses on software development, algorithms, and computer systems'),
('Electronics and Communication Engineering', 'ECE', 'Deals with electronic devices, circuits, and communication systems'),
('Mechanical Engineering', 'MECH', 'Covers design, manufacturing, and maintenance of mechanical systems'),
('Civil Engineering', 'CIVIL', 'Involves construction, design, and maintenance of infrastructure')
ON CONFLICT (name) DO UPDATE SET 
    description = EXCLUDED.description;

-- Enable RLS for new functions
GRANT EXECUTE ON FUNCTION public.get_qualified_staff_for_subject TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_timetable_conflicts TO authenticated, anon;
GRANT SELECT ON public.department_stats TO authenticated, anon;

-- Add policies for new columns
CREATE POLICY "Allow all operations on department_stats" ON public.department_stats FOR ALL USING (true) WITH CHECK (true);
