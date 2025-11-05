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
  console.log('=== Edge Function Started ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseAnonKey,
      hasGoogleKey: !!googleApiKey
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!googleApiKey) {
      throw new Error('Google AI API key not configured');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    console.log('Parsing request body...');
    const body = await req.text();
    console.log('Raw body:', body);
    
    const { selectedDepartments, selectedSemester }: TimetableRequest = JSON.parse(body);
    console.log('Parsed data:', { selectedDepartments, selectedSemester });

    // Validate input data
    if (!selectedDepartments || selectedDepartments.length === 0) {
      throw new Error('At least one department must be selected');
    }
    
    if (!selectedSemester || selectedSemester < 1 || selectedSemester > 8) {
      throw new Error('Valid semester (1-8) must be provided');
    }

    // Fetch all required data including staff-subject relationships
    console.log('Fetching data from database...');
    const [departmentsResult, sectionsResult, subjectsResult, staffResult, roomsResult, timingsResult, staffSubjectsResult] = await Promise.all([
      supabaseClient.from('departments').select('*').in('id', selectedDepartments),
      supabaseClient.from('sections').select('*').in('department_id', selectedDepartments).eq('semester', selectedSemester),
      supabaseClient.from('subjects').select('*').in('department_id', selectedDepartments).eq('semester', selectedSemester),
      supabaseClient.from('staff').select('*').in('department_id', selectedDepartments),
      supabaseClient.from('rooms').select('*'),
      supabaseClient.from('college_timings').select('*').order('day_of_week'),
      supabaseClient.from('staff_subjects').select('staff_id, subject_id, staff:staff_id(*), subjects:subject_id(*)')
    ]);

    console.log('Database query results:', {
      departments: departmentsResult.error ? 'error' : departmentsResult.data?.length,
      sections: sectionsResult.error ? 'error' : sectionsResult.data?.length,
      subjects: subjectsResult.error ? 'error' : subjectsResult.data?.length,
      staff: staffResult.error ? 'error' : staffResult.data?.length,
      rooms: roomsResult.error ? 'error' : roomsResult.data?.length,
      timings: timingsResult.error ? 'error' : timingsResult.data?.length,
      staffSubjects: staffSubjectsResult.error ? 'error' : staffSubjectsResult.data?.length
    });

    if (departmentsResult.error || sectionsResult.error || subjectsResult.error || 
        staffResult.error || roomsResult.error || timingsResult.error || staffSubjectsResult.error) {
      console.error('Database errors:', {
        departments: departmentsResult.error,
        sections: sectionsResult.error,
        subjects: subjectsResult.error,
        staff: staffResult.error,
        rooms: roomsResult.error,
        timings: timingsResult.error,
        staffSubjects: staffSubjectsResult.error
      });
      throw new Error('Failed to fetch required data from database');
    }

    const departments = departmentsResult.data || [];
    const sections = sectionsResult.data || [];
    const subjects = subjectsResult.data || [];
    const staff = staffResult.data || [];
    const rooms = roomsResult.data || [];
    const timings = timingsResult.data || [];
    const staffSubjects = staffSubjectsResult.data || [];

    console.log('Data fetched successfully:', {
      departments: departments.length,
      sections: sections.length,
      subjects: subjects.length,
      staff: staff.length,
      rooms: rooms.length,
      timings: timings.length,
      staffSubjects: staffSubjects.length
    });

    // Clear existing timetables for selected sections
    console.log('Clearing existing timetables...');
    const sectionIds = sections.map(s => s.id);
    if (sectionIds.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('timetables')
        .delete()
        .in('section_id', sectionIds);
      
      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new Error('Failed to clear existing timetables');
      }
    }

    // Prepare simplified data for AI
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
      staffSubjects: staffSubjects.map(ss => ({
        staff_id: ss.staff_id,
        subject_id: ss.subject_id
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

    const prompt = `You are an AI timetable generator for a university. Generate a comprehensive timetable in JSON format for semester ${selectedSemester}.

CRITICAL REQUIREMENTS:
1. ONLY assign staff to subjects they are authorized to teach (check staffSubjects mapping)
2. NO staff conflicts: Same staff cannot be in two places at once
3. NO room conflicts: Same room cannot host two classes simultaneously
4. Lab subjects (subject_type: 'lab' or 'practical') MUST use lab-type rooms
5. Theory subjects can use any classroom or lab
6. Each subject must be scheduled for its required hours_per_week
7. Distribute classes evenly across the week
8. Respect college timings and avoid break/lunch periods
9. Time slots: 1-8 representing different periods of the day
10. Days: 1-6 (Monday=1 to Saturday=6)

OPTIMIZATION GOALS:
- Minimize gaps in student schedules
- Balance faculty workload (respect max_hours_per_week)
- Use room capacity efficiently
- Spread lab sessions across different days

DATA PROVIDED:
${JSON.stringify(promptData, null, 2)}

RESPONSE FORMAT:
Return ONLY a valid JSON array with no additional text or explanation:
[
  {
    "section_id": "uuid-here",
    "subject_id": "uuid-here", 
    "staff_id": "uuid-here",
    "room_id": "uuid-here",
    "day_of_week": 1,
    "time_slot": 1,
    "semester": ${selectedSemester}
  }
]

Generate entries for ALL sections and subjects. Each subject should appear multiple times per week based on its hours_per_week value.`;

    console.log('Calling Gemini 1.5 Pro...');
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${googleApiKey}`,
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
            maxOutputTokens: 8192,
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      }
    );

    console.log('Gemini response status:', geminiResponse.status);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiResult = await geminiResponse.json();
    console.log('Gemini response structure:', {
      hasCandidates: !!geminiResult.candidates,
      candidatesLength: geminiResult.candidates?.length,
      hasContent: !!geminiResult.candidates?.[0]?.content,
      hasParts: !!geminiResult.candidates?.[0]?.content?.parts,
      partsLength: geminiResult.candidates?.[0]?.content?.parts?.length
    });
    
    if (!geminiResult.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini response:', geminiResult);
      throw new Error('Invalid response from Gemini AI');
    }

    let generatedText = geminiResult.candidates[0].content.parts[0].text;
    console.log('Generated text preview:', generatedText.substring(0, 200) + '...');
    
    // Extract JSON from response
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', generatedText);
      throw new Error('No valid JSON found in AI response');
    }
    
    const timetableEntries = JSON.parse(jsonMatch[0]);
    console.log('Parsed timetable entries:', timetableEntries.length);

    // Validate timetable entries
    const validatedEntries = timetableEntries.filter((entry: any) => {
      return entry.section_id && 
             entry.subject_id && 
             entry.staff_id && 
             entry.room_id && 
             entry.day_of_week >= 1 && 
             entry.day_of_week <= 6 &&
             entry.time_slot >= 1 && 
             entry.time_slot <= 8 &&
             entry.semester === selectedSemester;
    });

    console.log(`Validated ${validatedEntries.length} out of ${timetableEntries.length} entries`);

    // Insert new timetable entries
    if (validatedEntries.length > 0) {
      console.log('Inserting timetable entries...');
      const { error: insertError } = await supabaseClient
        .from('timetables')
        .insert(validatedEntries);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to save timetable to database');
      }
    } else {
      throw new Error('No valid timetable entries were generated by AI');
    }

    console.log('Timetable generation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Timetable generated successfully using Gemini 1.5 Pro with enhanced AI optimization',
        entriesCount: validatedEntries.length,
        totalGenerated: timetableEntries.length,
        model: 'gemini-1.5-pro',
        sectionsProcessed: sections.length,
        subjectsProcessed: subjects.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    const err = error as Error;
    console.error('Error stack:', err.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message,
        details: err.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});