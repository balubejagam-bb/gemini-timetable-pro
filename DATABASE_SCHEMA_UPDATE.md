# Database Schema Updates for Enhanced Timetable Editor

## Overview
These schema updates add support for:
- Room capacity tracking
- Department association for subjects and staff
- Improved search performance with indexes
- Better data organization

## How to Apply These Changes in Supabase

### Option 1: Using Supabase Dashboard (SQL Editor)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the SQL commands below
5. Click **Run** to execute

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or apply the specific migration
supabase migration up --db-url "your-supabase-connection-string"
```

## SQL Commands to Run

```sql
-- ============================================
-- 1. Add capacity column to rooms table
-- ============================================
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS capacity INTEGER;

COMMENT ON COLUMN rooms.capacity IS 'Maximum seating capacity of the room';

-- ============================================
-- 2. Add department_id to subjects table
-- ============================================
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);

-- ============================================
-- 3. Add department_id to staff table
-- ============================================
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department_id);

-- ============================================
-- 4. Create indexes for better search performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);

-- ============================================
-- 5. (Optional) Add unique constraint on subject code per department
-- Uncomment if you want to enforce unique codes per department
-- ============================================
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_code_dept 
-- ON subjects(code, COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid));
```

## Verification

After running the SQL commands, verify the changes:

```sql
-- Check if capacity column was added to rooms
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rooms' AND column_name = 'capacity';

-- Check if department_id was added to subjects
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subjects' AND column_name = 'department_id';

-- Check if department_id was added to staff
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'staff' AND column_name = 'department_id';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('subjects', 'staff', 'rooms')
ORDER BY tablename, indexname;
```

## Data Migration (Optional)

If you want to populate existing data with department associations:

```sql
-- Example: Associate subjects with departments based on existing data
-- Adjust the logic based on your data structure

UPDATE subjects s
SET department_id = (
    SELECT DISTINCT t.sections.department_id 
    FROM timetables t
    WHERE t.subject_id = s.id
    LIMIT 1
)
WHERE department_id IS NULL;

-- Example: Associate staff with departments based on their timetable assignments
UPDATE staff st
SET department_id = (
    SELECT DISTINCT sec.department_id
    FROM timetables t
    JOIN sections sec ON t.section_id = sec.id
    WHERE t.staff_id = st.id
    LIMIT 1
)
WHERE department_id IS NULL;
```

## Rollback (If Needed)

If you need to revert these changes:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_subjects_name;
DROP INDEX IF EXISTS idx_subjects_code;
DROP INDEX IF EXISTS idx_staff_name;
DROP INDEX IF EXISTS idx_rooms_room_number;
DROP INDEX IF EXISTS idx_subjects_department;
DROP INDEX IF EXISTS idx_staff_department;

-- Remove columns
ALTER TABLE subjects DROP COLUMN IF EXISTS department_id;
ALTER TABLE staff DROP COLUMN IF EXISTS department_id;
ALTER TABLE rooms DROP COLUMN IF EXISTS capacity;
```

## Benefits

1. **Better Organization**: Department associations help organize subjects and staff by department
2. **Room Management**: Capacity tracking helps in room allocation
3. **Improved Performance**: Indexes speed up searches in the editor
4. **Data Integrity**: Foreign key constraints ensure referential integrity
5. **Scalability**: Structure supports future enhancements

## Notes

- All changes use `IF NOT EXISTS` or `IF EXISTS` to prevent errors if already applied
- Foreign key constraints use `ON DELETE SET NULL` for soft deletion
- Indexes improve query performance for search operations
- The schema is backward compatible with existing data
