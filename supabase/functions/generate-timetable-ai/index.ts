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

    // Fetch all required data
    console.log('Fetching data from database...');
    const [departmentsResult, sectionsResult, subjectsResult, staffResult, roomsResult, timingsResult] = await Promise.all([
      supabaseClient.from('departments').select('*').in('id', selectedDepartments),
      supabaseClient.from('sections').select('*').in('department_id', selectedDepartments).eq('semester', selectedSemester),
      supabaseClient.from('subjects').select('*').in('department_id', selectedDepartments).eq('semester', selectedSemester),
      supabaseClient.from('staff').select('*').in('department_id', selectedDepartments),
      supabaseClient.from('rooms').select('*'),
      supabaseClient.from('college_timings').select('*').order('day_of_week')
    ]);

    console.log('Database query results:', {
      departments: departmentsResult.error ? 'error' : departmentsResult.data?.length,
      sections: sectionsResult.error ? 'error' : sectionsResult.data?.length,
      subjects: subjectsResult.error ? 'error' : subjectsResult.data?.length,
      staff: staffResult.error ? 'error' : staffResult.data?.length,
      rooms: roomsResult.error ? 'error' : roomsResult.data?.length,
      timings: timingsResult.error ? 'error' : timingsResult.data?.length
    });

    if (departmentsResult.error || sectionsResult.error || subjectsResult.error || 
        staffResult.error || roomsResult.error || timingsResult.error) {
      console.error('Database errors:', {
        departments: departmentsResult.error,
        sections: sectionsResult.error,
        subjects: subjectsResult.error,
        staff: staffResult.error,
        rooms: roomsResult.error,
        timings: timingsResult.error
      });
      throw new Error('Failed to fetch required data from database');
    }

    const departments = departmentsResult.data || [];
    const sections = sectionsResult.data || [];
    const subjects = subjectsResult.data || [];
    const staff = staffResult.data || [];
    const rooms = roomsResult.data || [];
    const timings = timingsResult.data || [];

    console.log('Data fetched successfully:', {
      departments: departments.length,
      sections: sections.length,
      subjects: subjects.length,
      staff: staff.length,
      rooms: rooms.length,
      timings: timings.length
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
      }))
    };

    const prompt = `Generate university timetable entries in JSON format for semester ${selectedSemester}.

Requirements:
- Each section needs classes for their subjects
- No staff conflicts (same staff at same time)
- No room conflicts (same room at same time)
- Lab subjects need lab-type rooms, theory subjects can use classrooms
- Time slots: 1-8 representing different periods
- Days: 1-6 (Monday to Saturday)

Data:
${JSON.stringify(promptData, null, 2)}

Return ONLY a JSON array of timetable entries:
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
    
    const geminiResponse = await fetch(
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

    // Insert new timetable entries
    if (timetableEntries.length > 0) {
      console.log('Inserting timetable entries...');
      const { error: insertError } = await supabaseClient
        .from('timetables')
        .insert(timetableEntries);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to save timetable to database');
      }
    }

    console.log('Timetable generation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Timetable generated successfully using Gemini 2.0 Flash',
        entriesCount: timetableEntries.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});