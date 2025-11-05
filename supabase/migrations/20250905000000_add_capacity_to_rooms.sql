-- Add capacity column to rooms table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'capacity'
    ) THEN
        ALTER TABLE rooms ADD COLUMN capacity INTEGER;
    END IF;
END $$;

-- Add department_id to subjects if not exists (for better organization)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'department_id'
    ) THEN
        ALTER TABLE subjects ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);
    END IF;
END $$;

-- Add department_id to staff if not exists (for better organization)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'department_id'
    ) THEN
        ALTER TABLE staff ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department_id);
    END IF;
END $$;

-- Add comment to capacity column
COMMENT ON COLUMN rooms.capacity IS 'Maximum seating capacity of the room';

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);

-- Add unique constraint on subject code within a department (optional but recommended)
-- Uncomment if you want to enforce unique codes per department
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_code_dept ON subjects(code, COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid));
