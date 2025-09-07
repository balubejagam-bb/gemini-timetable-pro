-- Student module schema for NEP 2020 flexible selections

CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.course_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  faculty_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  semester INTEGER NOT NULL,
  max_seats INTEGER NOT NULL DEFAULT 60,
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  schedule_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.student_course_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
  preference_rank INTEGER NOT NULL DEFAULT 1,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_offering_id)
);

CREATE TABLE public.personalized_timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  model_version TEXT,
  timetable_json JSONB NOT NULL
);

CREATE OR REPLACE VIEW public.v_student_counts AS
SELECT 
  (SELECT count(*) FROM public.students) AS students,
  (SELECT count(*) FROM public.course_offerings) AS offerings,
  (SELECT count(*) FROM public.student_course_preferences) AS preferences,
  (SELECT count(*) FROM public.personalized_timetables) AS personalized;

-- Enable RLS (optional)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_course_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalized_timetables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on course_offerings" ON public.course_offerings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on student_course_preferences" ON public.student_course_preferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on personalized_timetables" ON public.personalized_timetables FOR ALL USING (true) WITH CHECK (true);
