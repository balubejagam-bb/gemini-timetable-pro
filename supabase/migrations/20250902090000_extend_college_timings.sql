-- Extend college_timings to support year/section level schedules
-- Adds year_number, section_id, section label and updates uniqueness

ALTER TABLE public.college_timings
	ADD year_number INTEGER,
	ADD section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
	ADD section TEXT;

-- Backfill missing year_number with 1 (legacy rows)
UPDATE public.college_timings SET year_number = 1 WHERE year_number IS NULL;

-- Drop old single-column unique constraint if it exists
ALTER TABLE public.college_timings DROP CONSTRAINT IF EXISTS college_timings_day_of_week_key;

-- Add new composite uniqueness (allows multiple days across different year/section combos)
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint 
		WHERE conname = 'college_timings_unique_schedule'
	) THEN
		ALTER TABLE public.college_timings
			ADD CONSTRAINT college_timings_unique_schedule UNIQUE (day_of_week, year_number, section_id);
	END IF;
END $$;

-- Note: UNIQUE with NULL section_id allows multiple NULL entries per (day,year); clients should supply section_id for distinct schedules.
