# Quick Start: Apply Database Schema Updates

## ⚡ Fast Track (Copy & Run)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### Step 2: Copy and Run This SQL

```sql
-- Quick schema update for enhanced timetable editor
-- Run this entire block in Supabase SQL Editor

-- Add capacity to rooms
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- Add department associations
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department_id);

-- Done! You should see "Success. No rows returned"
```

### Step 3: Verify Changes

Run this to confirm:

```sql
-- Quick verification
SELECT 
    'rooms.capacity' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'capacity'
    ) THEN '✅ Added' ELSE '❌ Missing' END as status
UNION ALL
SELECT 
    'subjects.department_id',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'department_id'
    ) THEN '✅ Added' ELSE '❌ Missing' END
UNION ALL
SELECT 
    'staff.department_id',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'department_id'
    ) THEN '✅ Added' ELSE '❌ Missing' END;
```

Expected output:
```
check_item                | status
--------------------------|----------
rooms.capacity            | ✅ Added
subjects.department_id    | ✅ Added
staff.department_id       | ✅ Added
```

## ✅ That's It!

Your database is now ready for the enhanced timetable editor.

## 🔄 If You Get Errors

### Error: "column already exists"
**Solution**: This is fine! It means the column was already added. Continue.

### Error: "relation does not exist"
**Solution**: Make sure you're in the right project and schema. Check table names.

### Error: "permission denied"
**Solution**: Ensure you're logged in as the project owner or have admin access.

## 🧪 Test the Changes

1. Start your development server
2. Go to Timetable View page
3. Click any edit icon on a timetable cell
4. Try searching for subjects, staff, or rooms
5. Try adding a new entry

## 📞 Need Help?

- Check `DATABASE_SCHEMA_UPDATE.md` for detailed explanation
- Check `EDITOR_IMPLEMENTATION_SUMMARY.md` for feature details
- Review Supabase logs if queries fail
