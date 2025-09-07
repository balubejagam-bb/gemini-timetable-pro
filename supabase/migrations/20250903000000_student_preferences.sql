-- ====================================================================
-- NEP 2020 Flexible Curriculum & AI Personalized Timetable Module
-- Comprehensive migration (student entities, offerings, preferences,
-- personalized JSON snapshots, supporting views, RLS & performance).
-- NOTE: This migration is destructive for existing earlier versions
-- (drops old objects). Run only on new envs or after backup.
-- ====================================================================

-- Prerequisites ------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- Utility: updated_at trigger ----------------------------------------
DROP FUNCTION IF EXISTS public.fn_set_updated_at CASCADE;
CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

-- Drop dependent views first (if any) --------------------------------
DROP VIEW IF EXISTS public.v_student_selected_credits;
DROP VIEW IF EXISTS public.v_student_counts;

-- Core Tables --------------------------------------------------------
DROP TABLE IF EXISTS public.personalized_timetables CASCADE;
DROP TABLE IF EXISTS public.student_course_preferences CASCADE;
DROP TABLE IF EXISTS public.student_timetables CASCADE;
DROP TABLE IF EXISTS public.student_course_selections CASCADE;
DROP TABLE IF EXISTS public.course_offerings CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;

-- Students table
CREATE TABLE public.students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no         TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE,
  department_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  semester        INT  NOT NULL DEFAULT 1 CHECK (semester BETWEEN 1 AND 12),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Course offerings (subject + faculty + optional room) ---------------
CREATE TABLE public.course_offerings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id         UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  staff_id           UUID REFERENCES public.staff(id)   ON DELETE SET NULL,
  room_id            UUID REFERENCES public.rooms(id)   ON DELETE SET NULL,
  semester           INT  NOT NULL CHECK (semester BETWEEN 1 AND 12),
  max_students       INT  NOT NULL DEFAULT 60 CHECK (max_students > 0),
  enrolled_count     INT  NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0 AND enrolled_count <= max_students),
  schedule_day       INT  CHECK (schedule_day BETWEEN 1 AND 7), -- optional pre-assigned day
  schedule_time_slot INT  CHECK (schedule_time_slot > 0),       -- maps to existing time slot id/index
  schedule_json      JSONB,                                     -- optional richer schedule structure
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Optional business rule to avoid duplicate identical offering slots:
  -- , UNIQUE(subject_id, staff_id, semester, schedule_day, schedule_time_slot)
);

-- Student selections (legacy simple link) ---------------------------
-- Kept for backward compatibility. Can be deprecated in favor of
-- student_course_preferences (which adds ranking & locking).
CREATE TABLE public.student_course_selections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_offering_id)
);

-- Per-slot personalized timetable entries (structured) --------------
-- Retained if you need granular queries; otherwise JSON snapshots table
-- can suffice. Both can coexist.
CREATE TABLE public.student_timetables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  day_of_week INT  NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  time_slot   INT  NOT NULL CHECK (time_slot > 0),
  subject_id  UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  staff_id    UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  room_id     UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  semester    INT  NOT NULL CHECK (semester BETWEEN 1 AND 12),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, day_of_week, time_slot)
);

-- Preference ranking (supersedes selections) ------------------------
CREATE TABLE public.student_course_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
  preference_rank   INT  NOT NULL DEFAULT 1 CHECK (preference_rank > 0),
  locked            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_offering_id)
);

-- AI personalized timetable snapshots (JSON) ------------------------
CREATE TABLE public.personalized_timetables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_version TEXT,
  timetable_json JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Views --------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_student_selected_credits AS
SELECT s.id AS student_id,
       s.name AS student_name,
       co.semester,
       SUM(sub.credits) AS total_credits
FROM public.students s
LEFT JOIN public.student_course_selections scs ON scs.student_id = s.id
LEFT JOIN public.course_offerings co ON co.id = scs.course_offering_id
LEFT JOIN public.subjects sub ON sub.id = co.subject_id
GROUP BY s.id, s.name, co.semester;

CREATE VIEW public.v_student_counts AS
SELECT
  (SELECT COUNT(*) FROM public.students)                AS students,
  (SELECT COUNT(*) FROM public.course_offerings)        AS offerings,
  (SELECT COUNT(*) FROM public.student_course_preferences) AS preferences,
  (SELECT COUNT(*) FROM public.personalized_timetables) AS personalized;

-- Indexes ------------------------------------------------------------
CREATE INDEX idx_students_semester ON public.students(semester);
CREATE INDEX idx_offerings_semester ON public.course_offerings(semester);
CREATE INDEX idx_offerings_subject ON public.course_offerings(subject_id);
CREATE INDEX idx_offerings_staff   ON public.course_offerings(staff_id);
CREATE INDEX idx_offerings_room    ON public.course_offerings(room_id);
CREATE INDEX idx_offerings_sched   ON public.course_offerings(schedule_day, schedule_time_slot);
CREATE INDEX idx_sel_student       ON public.student_course_selections(student_id);
CREATE INDEX idx_sel_offering      ON public.student_course_selections(course_offering_id);
CREATE INDEX idx_tt_student_sem_slot ON public.student_timetables(student_id, day_of_week, time_slot);
CREATE INDEX idx_pref_student      ON public.student_course_preferences(student_id);
CREATE INDEX idx_pref_offering     ON public.student_course_preferences(course_offering_id);
CREATE INDEX idx_personalized_student_time ON public.personalized_timetables(student_id, generated_at DESC);
CREATE INDEX idx_personalized_json ON public.personalized_timetables USING gin(timetable_json);

-- Triggers: updated_at -----------------------------------------------
CREATE TRIGGER trg_students_updated            BEFORE UPDATE ON public.students                 FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_offerings_updated           BEFORE UPDATE ON public.course_offerings          FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_selections_updated          BEFORE UPDATE ON public.student_course_selections FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_timetables_updated          BEFORE UPDATE ON public.student_timetables        FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_preferences_updated         BEFORE UPDATE ON public.student_course_preferences FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_personalized_updated        BEFORE UPDATE ON public.personalized_timetables   FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- (Optional) Maintain enrolled_count via triggers --------------------
DROP FUNCTION IF EXISTS public.fn_inc_enrolled_count CASCADE;
CREATE FUNCTION public.fn_inc_enrolled_count() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.course_offerings SET enrolled_count = enrolled_count + 1, updated_at = now() WHERE id = NEW.course_offering_id;
  RETURN NEW;
END;$$;

DROP FUNCTION IF EXISTS public.fn_dec_enrolled_count CASCADE;
CREATE FUNCTION public.fn_dec_enrolled_count() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.course_offerings SET enrolled_count = GREATEST(enrolled_count - 1,0), updated_at = now() WHERE id = OLD.course_offering_id;
  RETURN OLD;
END;$$;

CREATE TRIGGER trg_pref_insert_enrolled AFTER INSERT ON public.student_course_preferences
  FOR EACH ROW EXECUTE FUNCTION public.fn_inc_enrolled_count();
CREATE TRIGGER trg_pref_delete_enrolled AFTER DELETE ON public.student_course_preferences
  FOR EACH ROW EXECUTE FUNCTION public.fn_dec_enrolled_count();

-- Row Level Security -------------------------------------------------
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_course_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_course_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalized_timetables ENABLE ROW LEVEL SECURITY;

-- Permissive policies (PLACEHOLDER: tighten later) -------------------
-- Replace with auth.uid() mapping once you have an auth.users linkage.
DO $$
BEGIN
  -- Students
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_all'
  ) THEN
    CREATE POLICY students_all ON public.students FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- Course offerings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='course_offerings' AND policyname='offerings_all'
  ) THEN
    CREATE POLICY offerings_all ON public.course_offerings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- Selections
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_course_selections' AND policyname='selections_all'
  ) THEN
    CREATE POLICY selections_all ON public.student_course_selections FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- Timetables
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_timetables' AND policyname='timetables_all'
  ) THEN
    CREATE POLICY timetables_all ON public.student_timetables FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- Preferences
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_course_preferences' AND policyname='preferences_all'
  ) THEN
    CREATE POLICY preferences_all ON public.student_course_preferences FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- Personalized
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='personalized_timetables' AND policyname='personalized_all'
  ) THEN
    CREATE POLICY personalized_all ON public.personalized_timetables FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Reference queries / helpers ---------------------------------------
-- Seat utilization manual refresh (if triggers disabled):
-- UPDATE public.course_offerings co
-- SET enrolled_count = sub.cnt
-- FROM (
--   SELECT course_offering_id, COUNT(*)::int cnt
--   FROM public.student_course_preferences
--   GROUP BY course_offering_id
-- ) sub
-- WHERE co.id = sub.course_offering_id;

-- Conflict detection example using schedule_json (if populated):
-- SELECT a.student_id,
--        a.course_offering_id AS offering_a,
--        b.course_offering_id AS offering_b,
--        sa ->> 'day'       AS day,
--        sa ->> 'start_time' AS start_a,
--        sb ->> 'start_time' AS start_b
-- FROM public.student_course_preferences a
-- JOIN public.student_course_preferences b
--   ON a.student_id = b.student_id AND a.course_offering_id < b.course_offering_id
-- JOIN public.course_offerings oa ON oa.id = a.course_offering_id
-- JOIN public.course_offerings ob ON ob.id = b.course_offering_id
-- CROSS JOIN LATERAL jsonb_array_elements(COALESCE(oa.schedule_json,'[]')) sa
-- CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ob.schedule_json,'[]')) sb
-- WHERE sa ->> 'day' = sb ->> 'day'
--   AND NOT ( (sa ->> 'end_time') <= (sb ->> 'start_time')
--          OR (sb ->> 'end_time') <= (sa ->> 'start_time') );

-- ====================================================================
-- END MIGRATION
-- ====================================================================
