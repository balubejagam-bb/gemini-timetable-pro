import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimetableRequest {
  selectedDepartments: string[];
  selectedSemester: number;
}

serve(async (req) => {
  console.log('=== Timetable AI Generation Request ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { selectedDepartments, selectedSemester }: TimetableRequest = await req.json();
    console.log('Request data:', { selectedDepartments, selectedSemester });

    // Fetch all required data
    const [departmentsResult, sectionsResult, subjectsResult, staffResult, roomsResult, timingsResult] = await Promise.all([
      supabaseClient.from('departments').select('*').in('id', selectedDepartments),
      supabaseClient.from('sections').select('*').in('department_id', selectedDepartments).eq('semester', selectedSemester),
      supabaseClient.from('subjects').select('*').in('department_id', selectedDepartments).eq('semester', selectedSemester),
      supabaseClient.from('staff').select('*').in('department_id', selectedDepartments),
      supabaseClient.from('rooms').select('*'),
      supabaseClient.from('college_timings').select('*').order('day_of_week')
    ]);

    if (departmentsResult.error || sectionsResult.error || subjectsResult.error || 
        staffResult.error || roomsResult.error || timingsResult.error) {
      throw new Error('Failed to fetch required data');
    }

    const departments = departmentsResult.data || [];
    const sections = sectionsResult.data || [];
    const subjects = subjectsResult.data || [];
    const staff = staffResult.data || [];
    const rooms = roomsResult.data || [];
    const timings = timingsResult.data || [];

    console.log('Fetched data counts:', {
      departments: departments.length,
      sections: sections.length,
      subjects: subjects.length,
      staff: staff.length,
      rooms: rooms.length,
      timings: timings.length
    });

    // Prepare data for AI
    const promptData = {
      departments: departments.map(d => ({ id: d.id, name: d.name, code: d.code })),
      sections: sections.map(s => ({ id: s.id, name: s.name, department_id: s.department_id })),
      subjects: subjects.map(s => ({ 
        id: s.id, 
        name: s.name, 
        code: s.code, 
        hours_per_week: s.hours_per_week,
        subject_type: s.subject_type,
        department_id: s.department_id 
      })),
      staff: staff.map(s => ({ 
        id: s.id, 
        name: s.name, 
        department_id: s.department_id,
        max_hours_per_week: s.max_hours_per_week 
      })),
      rooms: rooms.map(r => ({ 
        id: r.id, 
        room_number: r.room_number, 
        capacity: r.capacity,
        room_type: r.room_type 
      })),
      timings: timings.map(t => ({
        day_of_week: t.day_of_week,
        start_time: t.start_time,
        end_time: t.end_time,
        break_start: t.break_start,
        break_end: t.break_end,
        lunch_start: t.lunch_start,
        lunch_end: t.lunch_end
      }))
    };

    const prompt = `You are an expert timetable scheduling system. Generate an optimal university timetable based on the following data:

REQUIREMENTS:
1. Each section should have classes for all their subjects
2. No staff member should have more than their max_hours_per_week
3. No room conflicts (same room at same time)
4. No staff conflicts (same staff at same time)
5. Lab subjects need lab-type rooms, theory subjects can use classrooms
6. Distribute subjects evenly across the week
7. Respect college timings and break times

DATA:
${JSON.stringify(promptData, null, 2)}

INSTRUCTIONS:
- Generate timetable entries for semester ${selectedSemester}
- Each entry should specify: section_id, subject_id, staff_id, room_id, day_of_week (1-6), time_slot (1-8)
- Time slots: 1=9:00-10:00, 2=10:00-11:00, 3=11:00-12:00, 4=12:00-1:00, 5=2:00-3:00, 6=3:00-4:00, 7=4:00-5:00, 8=5:00-6:00
- Avoid scheduling during break and lunch times
- Return ONLY a valid JSON array of timetable entries, no other text

RESPONSE FORMAT:
[
  {
    "section_id": "uuid",
    "subject_id": "uuid", 
    "staff_id": "uuid",
    "room_id": "uuid",
    "day_of_week": number,
    "time_slot": number,
    "semester": ${selectedSemester}
  }
]`;

    console.log('Calling Gemini 2.0 Flash...');
    
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!googleApiKey) {
      throw new Error('Google AI API key not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 40000,
            temperature: 0.1,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const geminiResult = await response.json();
    console.log('Gemini response received');
    
    if (!geminiResult.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini');
    }

    let generatedText = geminiResult.candidates[0].content.parts[0].text;
    
    // Extract JSON from response
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }
    
    const timetableEntries = JSON.parse(jsonMatch[0]);
    console.log('Generated timetable entries:', timetableEntries.length);

    // Clear existing timetables for selected departments and semester
    await supabaseClient
      .from('timetables')
      .delete()
      .in('section_id', sections.map(s => s.id));

    // Insert new timetable entries
    const { error: insertError } = await supabaseClient
      .from('timetables')
      .insert(timetableEntries);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to save timetable');
    }

    console.log('Timetable generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Timetable generated successfully using AI',
        entriesCount: timetableEntries.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-timetable-ai:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});