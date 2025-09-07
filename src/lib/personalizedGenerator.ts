import { supabase } from '@/integrations/supabase/client';
import { env } from './env';

interface Slot { day: string; start_time: string; end_time: string; }
interface OfferingRow { id: string; subject_id: string; faculty_id: string | null; semester: number; schedule_json: Slot[] | null; }
interface Subject { id: string; code: string; name: string; hours_per_week?: number; }
interface Staff { id: string; name: string; }

export interface PersonalizedEntry {
  day: string;
  start_time: string;
  end_time: string;
  subject_code?: string;
  subject_name?: string;
  faculty_name?: string;
  room?: string;
}

export class PersonalizedTimetableGenerator {
  private apiKey: string;
  constructor(){
    if(!env.GOOGLE_AI_API_KEY) throw new Error('GOOGLE_AI_API_KEY missing');
    this.apiKey = env.GOOGLE_AI_API_KEY;
  }

  async generate(studentId: string, preferenceOfferingIds: string[]): Promise<PersonalizedEntry[]> {
    // Fetch selected offerings with subjects + staff
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: offerings, error: offErr } = await (supabase as any)
      .from('course_offerings')
      .select('id, subject_id, faculty_id, semester, schedule_json')
      .in('id', preferenceOfferingIds);
    if (offErr) throw offErr;

  const subjectIds = Array.from(new Set(offerings.map((o:OfferingRow)=>o.subject_id))) as string[];
  const facultyIds = Array.from(new Set(offerings.map((o:OfferingRow)=>o.faculty_id).filter(Boolean))) as string[];

    const [{ data: subjects }, { data: staff }] = await Promise.all([
  supabase.from('subjects').select('id, code, name, hours_per_week').in('id', subjectIds as string[]),
  supabase.from('staff').select('id, name').in('id', facultyIds as string[])
    ]);

    const subjectsMap = new Map<string, Subject>((subjects||[]).map(s=>[s.id, s]));
    const staffMap = new Map<string, Staff>((staff||[]).map(s=>[s.id, s]));

    const simplified = offerings.map((o:OfferingRow) => ({
      id: o.id,
      subject: subjectsMap.get(o.subject_id),
      faculty: o.faculty_id ? staffMap.get(o.faculty_id) : undefined,
      schedule: o.schedule_json || []
    }));

    const prompt = `You are an AI that creates a personalized timetable for a single student.\nThe student has chosen these course offerings (with possible pre-defined schedule slots). Your task:\n1. Respect existing given slots if schedule array is non-empty for an offering.\n2. If an offering has no schedule slots, assign appropriate day/time windows balancing load across the week.\n3. Avoid overlapping times.\n4. Return ONLY a JSON array. Each element: {"day":"Mon|Tue|Wed|Thu|Fri|Sat","start_time":"HH:MM","end_time":"HH:MM","subject_code":"...","subject_name":"...","faculty_name":"...","room":"TBD"}\n5. Keep between 3 and 5 classes per active day. Prefer spreading subjects.\n6. Days limited to Mon-Sat.\n7. Start_time/end_time should align with existing college timings if possible (08:00,08:55,10:15,11:10,12:05 etc.).\n\nOfferings JSON:\n${JSON.stringify(simplified, null, 2)}\n\nReturn JSON now:`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        contents:[{ parts:[{ text: prompt }] }],
        generationConfig:{ maxOutputTokens:2048, temperature:0.2 }
      })
    });
    if(!response.ok){
      const t = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${t}`);
    }
    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\[[\s\S]*\]/);
    if(!match) throw new Error('No JSON array in AI response');
    let parsed: PersonalizedEntry[] = [];
    try { parsed = JSON.parse(match[0]); } catch(e){ throw new Error('Failed to parse AI JSON'); }
    return parsed.map(p => ({
      day: p.day,
      start_time: p.start_time,
      end_time: p.end_time,
      subject_code: p.subject_code,
      subject_name: p.subject_name,
      faculty_name: p.faculty_name,
      room: p.room || 'TBD'
    }));
  }
}
