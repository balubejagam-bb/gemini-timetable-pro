-- Ensure departments table exposes metadata expected by the dashboard UI
ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS hod TEXT;

COMMENT ON COLUMN public.departments.description IS 'Optional summary that is shown in the departments dashboard.';
COMMENT ON COLUMN public.departments.hod IS 'Stores the Head of Department name for quick reference.';

-- Seed friendly descriptions/HOD names for well-known default records (no overwrite of existing data)
UPDATE public.departments AS d
SET
    description = COALESCE(d.description, metadata.description),
    hod = COALESCE(d.hod, metadata.hod)
FROM (
    VALUES
        ('CSE', 'Focuses on software development, algorithms, and computer systems', 'Dr. John Smith'),
        ('ECE', 'Deals with electronic devices, circuits, and communication systems', 'Dr. Jane Doe'),
        ('MECH', 'Covers design, manufacturing, and maintenance of mechanical systems', 'Dr. Robert Johnson'),
        ('CIVIL', 'Involves construction, design, and maintenance of infrastructure', 'Dr. Priya Singh')
) AS metadata(code, description, hod)
WHERE d.code = metadata.code;
