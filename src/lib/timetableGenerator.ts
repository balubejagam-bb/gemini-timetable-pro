import { supabase } from "@/integrations/supabase/client";
import { env } from "./env";

// Helper to extract JSON array from text with robust parsing
function extractJsonArray(text: string): any[] | null {
  // Clean up markdown code blocks first
  text = text.replace(/```json\s*|\s*```/g, '').trim();
  // Also remove generic code blocks
  text = text.replace(/```\s*|\s*```/g, '').trim();

  // 1. Try direct parse if it looks like pure JSON
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}

  // 2. Try to find the first valid JSON array block using bracket balancing
  let startIndex = text.indexOf('[');
  while (startIndex !== -1) {
    let balance = 0;
    let inString = false;
    let escape = false;
    
    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];
      
      if (escape) {
        escape = false;
        continue;
      }
      
      if (char === '\\') {
        escape = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '[') balance++;
        else if (char === ']') {
          balance--;
          if (balance === 0) {
            // Found a potential matching bracket
            const potentialJson = text.substring(startIndex, i + 1);
            try {
              const parsed = JSON.parse(potentialJson);
              if (Array.isArray(parsed)) return parsed;
            } catch (e) {
              // Continue searching if parse failed
            }
            break; // Break inner loop to find next '['
          }
        }
      }
    }
    startIndex = text.indexOf('[', startIndex + 1);
  }
  
  // 3. Fallback: Look for object wrapper containing array
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const obj = JSON.parse(objectMatch[0]);
      // Check common property names
      const possibleArrays = [
        obj.timetable, obj.entries, obj.schedule, obj.data, obj.result, obj.output
      ];
      for (const arr of possibleArrays) {
        if (Array.isArray(arr)) return arr;
      }
      // Search all values
      for (const key in obj) {
        if (Array.isArray(obj[key]) && obj[key].length > 0) {
          return obj[key];
        }
      }
    } catch (e) {}
  }

  // 4. Last resort: Try to find multiple JSON objects and wrap them
  // This handles the case where the model returns: { ... }, { ... }
  try {
    const objects: any[] = [];
    let braceBalance = 0;
    let objStart = -1;
    let inStr = false;
    let esc = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (esc) { esc = false; continue; }
      if (char === '\\') { esc = true; continue; }
      if (char === '"') { inStr = !inStr; continue; }
      
      if (!inStr) {
        if (char === '{') {
          if (braceBalance === 0) objStart = i;
          braceBalance++;
        } else if (char === '}') {
          braceBalance--;
          if (braceBalance === 0 && objStart !== -1) {
            const potentialObj = text.substring(objStart, i + 1);
            try {
              const parsed = JSON.parse(potentialObj);
              objects.push(parsed);
            } catch (e) {}
            objStart = -1;
          }
        }
      }
    }
    
    if (objects.length > 0) return objects;
  } catch (e) {}

  return null;
}

// Helper to extract JSON object from text with robust parsing
function extractJsonObject(text: string): any | null {
  // Clean up markdown code blocks first
  text = text.replace(/```json\n?|\n?```/g, '').trim();

  // 1. Try direct parse
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch (e) {}

  // 2. Try to find the first valid JSON object block using bracket balancing
  let startIndex = text.indexOf('{');
  while (startIndex !== -1) {
    let balance = 0;
    let inString = false;
    let escape = false;
    
    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];
      
      if (escape) {
        escape = false;
        continue;
      }
      
      if (char === '\\') {
        escape = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') balance++;
        else if (char === '}') {
          balance--;
          if (balance === 0) {
            // Found a potential matching bracket
            const potentialJson = text.substring(startIndex, i + 1);
            try {
              const parsed = JSON.parse(potentialJson);
              if (parsed && typeof parsed === 'object') return parsed;
            } catch (e) {
              // Continue searching
            }
            break;
          }
        }
      }
    }
    startIndex = text.indexOf('{', startIndex + 1);
  }
  
  return null;
}

interface TimetableEntry {
  section_id: string;
  subject_id: string;
  staff_id: string;
  room_id: string;
  day_of_week: number;
  time_slot: number;
  semester: number;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Section {
  id: string;
  name: string;
  department_id: string;
  semester: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  hours_per_week: number;
  subject_type: string;
  department_id: string;
}

interface Staff {
  id: string;
  name: string;
  department_id: string;
  max_hours_per_week: number;
}

interface Room {
  id: string;
  room_number: string;
  capacity: number;
  room_type: string;
}

interface Timing {
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  lunch_start?: string;
  lunch_end?: string;
}

interface StaffSubject {
  staff_id: string;
  subject_id: string;
}

interface GenerationData {
  departments: Department[];
  sections: Section[];
  subjects: Subject[];
  staff: Staff[];
  rooms: Room[];
  timings: Timing[];
  staffSubjects: StaffSubject[];
  fillerSubjects?: Subject[];
}

interface StudentTimetableSchedule {
  [day: string]: {
    [timeSlot: string]: {
      subject: string;
      code: string;
      staff: string;
      room: string;
      type: string;
    } | null;
  };
}

interface StudentTimetableJson {
  schedule: StudentTimetableSchedule;
  summary?: {
    total_classes: number;
    subjects_covered: string[];
    free_periods: number;
  };
}

interface StudentGenerationData {
  student: {
    id: string;
    name: string;
    roll_no: string;
    semester: number;
    department_id: string;
    departments?: {
      name: string;
      code: string;
    };
  };
  sections: Section[];
  subjects: Subject[];
  staff: Staff[];
  rooms: Room[];
  timings: Timing[];
  staffSubjects: StaffSubject[];
}

// Advanced generation options (restored)
interface RoomSelectionOptions {
  rooms?: string[];
}

interface AdvancedGenerationOptions extends RoomSelectionOptions {
  sections?: string[];
  subjects?: string[];
  staff?: string[];
  advancedMode?: boolean;
}

type SimpleGenerationOptions = AdvancedGenerationOptions;

export class ClientTimetableGenerator {
  private googleApiKey: string;

  constructor() {
    const apiKey = env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('Google AI API key not configured. Please check your environment variables.');
    }
    this.googleApiKey = apiKey;
  }

  async generateTimetable(
    selectedDepartments: string[], 
    selectedSemester: number,
    options?: AdvancedGenerationOptions
  ): Promise<{
    success: boolean;
    message: string;
    entriesCount?: number;
    totalGenerated?: number;
    error?: string;
  }> {
    try {
      console.log('Starting client-side timetable generation...');
      
      // Validate input
      if (!selectedDepartments || selectedDepartments.length === 0) {
        if (!options?.advancedMode || !options?.subjects || options.subjects.length === 0) {
          throw new Error('At least one department must be selected in standard mode, or subjects in advanced mode');
        }
      }
      
      if (!selectedSemester || selectedSemester < 1 || selectedSemester > 8) {
        throw new Error('Valid semester (1-8) must be provided');
      }

      // Fetch all required data
      console.log('Fetching data from database...');
  const data = await this.fetchData(selectedDepartments, selectedSemester, options);
      
      // Clear existing timetables
      console.log('Clearing existing timetables...');
      await this.clearExistingTimetables(data.sections.map(s => s.id));
      
      // Generate timetable using AI
      console.log('Generating timetable with AI...');
  const timetableEntries = await this.callGeminiAPI(data, selectedSemester, options);
      
      // Validate and save entries
      console.log('Validating and saving entries...');
  let validatedEntries = this.validateEntries(timetableEntries, selectedSemester);
  // Enforce minimum daily load of 3 classes (days 1-6) while allowing free periods beyond that
  validatedEntries = this.enforceMinimumDailyClasses(validatedEntries, data, selectedSemester);
      
      if (validatedEntries.length > 0) {
        await this.saveTimetable(validatedEntries);
        
        return {
          success: true,
          message: `Timetable generated successfully using client-side AI integration!`,
          entriesCount: validatedEntries.length,
          totalGenerated: timetableEntries.length
        };
      } else {
        throw new Error('No valid timetable entries were generated by AI');
      }
      
    } catch (error) {
      console.error('Client-side timetable generation error:', error);
      return {
        success: false,
        message: 'Failed to generate timetable',
        error: error.message
      };
    }
  }

  private async fetchData(
    selectedDepartments: string[], 
    selectedSemester: number,
    options?: AdvancedGenerationOptions
  ): Promise<GenerationData> {
    console.log(`Fetching data for departments: ${selectedDepartments.join(', ')} and semester: ${selectedSemester}`);
    console.log('Advanced options:', options);
    
    // Department fetch
    let departmentsPromise;
    if (selectedDepartments.length > 0) {
      departmentsPromise = supabase.from('departments').select('*').in('id', selectedDepartments);
    } else {
      departmentsPromise = supabase.from('departments').select('*');
    }

    // Section fetch (respect advanced mode selection)
    let sectionsPromise;
    if (options?.sections && options.sections.length > 0) {
      sectionsPromise = supabase.from('sections')
        .select('*')
        .in('id', options.sections)
        .eq('semester', selectedSemester);
    } else if (selectedDepartments.length > 0) {
      sectionsPromise = supabase.from('sections')
        .select('*')
        .in('department_id', selectedDepartments)
        .eq('semester', selectedSemester);
    } else {
      sectionsPromise = supabase.from('sections')
        .select('*')
        .eq('semester', selectedSemester);
    }

    // Subject fetch
    let subjectsPromise;
    if (options?.subjects && options.subjects.length > 0) {
      // If specific subjects are selected, fetch them regardless of semester
      subjectsPromise = supabase.from('subjects')
        .select('*')
        .in('id', options.subjects);
    } else if (selectedDepartments.length > 0) {
      subjectsPromise = supabase.from('subjects')
        .select('*')
        .in('department_id', selectedDepartments)
        .eq('semester', selectedSemester);
    } else {
      subjectsPromise = supabase.from('subjects')
        .select('*')
        .eq('semester', selectedSemester);
    }

    // Staff fetch
    let staffPromise;
    if (options?.staff && options.staff.length > 0) {
      staffPromise = supabase.from('staff')
        .select('*')
        .in('id', options.staff);
    } else if (selectedDepartments.length > 0) {
      staffPromise = supabase.from('staff')
        .select('*')
        .in('department_id', selectedDepartments);
    } else {
      staffPromise = supabase.from('staff').select('*');
    }

    const roomsPromise = options?.rooms && options.rooms.length > 0
      ? supabase.from('rooms').select('*').in('id', options.rooms)
      : supabase.from('rooms').select('*');

    const [departmentsResult, sectionsResult, subjectsResult, staffResult, roomsResult, timingsResult, staffSubjectsResult] = await Promise.all([
      departmentsPromise,
      sectionsPromise,
      subjectsPromise,
      staffPromise,
      roomsPromise,
      supabase.from('college_timings').select('*').order('day_of_week'),
      supabase.from('staff_subjects').select('staff_id, subject_id, staff:staff_id(*), subjects:subject_id(*)')
    ]);

    // Check for errors
    const errors = [
      { name: 'departments', error: departmentsResult.error },
      { name: 'sections', error: sectionsResult.error },
      { name: 'subjects', error: subjectsResult.error },
      { name: 'staff', error: staffResult.error },
      { name: 'rooms', error: roomsResult.error },
      { name: 'timings', error: timingsResult.error },
      { name: 'staffSubjects', error: staffSubjectsResult.error }
    ].filter(item => item.error !== null);

    if (errors.length > 0) {
      console.error('Database fetch errors:', errors);
      const errorMessages = errors.map(e => `${e.name}: ${e.error.message}`).join(', ');
      throw new Error(`Failed to fetch data from database: ${errorMessages}`);
    }

    const data: GenerationData = {
      departments: departmentsResult.data || [],
      sections: sectionsResult.data || [],
      subjects: subjectsResult.data || [],
      staff: staffResult.data || [],
      rooms: roomsResult.data || [],
      timings: timingsResult.data || [],
      staffSubjects: staffSubjectsResult.data || []
    };

    // Filter staff_subjects to only include selected subjects/staff in advanced mode
    if (options?.advancedMode && (options.subjects?.length || options.staff?.length)) {
      data.staffSubjects = data.staffSubjects.filter(ss => {
        const subjectMatch = !options.subjects?.length || options.subjects.includes(ss.subject_id);
        const staffMatch = !options.staff?.length || options.staff.includes(ss.staff_id);
        return subjectMatch && staffMatch;
      });
    }

    // Log data counts for debugging
    console.log('Fetched data counts:', {
      departments: data.departments.length,
      sections: data.sections.length,
      subjects: data.subjects.length,
      staff: data.staff.length,
      rooms: data.rooms.length,
      timings: data.timings.length,
      staffSubjects: data.staffSubjects.length
    });

    // Validate essential data
    if (data.departments.length === 0) {
      throw new Error('No departments found for the selected IDs');
    }
    if (data.sections.length === 0) {
      throw new Error(`No sections found for semester ${selectedSemester} in selected departments`);
    }
    if (data.subjects.length === 0) {
      throw new Error(`No subjects found for semester ${selectedSemester} in selected departments`);
    }
    if (data.staff.length === 0) {
      throw new Error('No staff found for the selected departments');
    }
    if (data.rooms.length === 0) {
      if (options?.rooms?.length) {
        throw new Error('Selected rooms are unavailable. Please pick different rooms or leave the room list empty to auto-assign.');
      }
      throw new Error('No rooms found in the database');
    }

    return data;
  }

  private async clearExistingTimetables(sectionIds: string[]): Promise<void> {
    if (sectionIds.length > 0) {
      console.log(`Clearing existing timetables for ${sectionIds.length} sections...`);
      
      const { data: existingEntries, error: selectError } = await supabase
        .from('timetables')
        .select('id')
        .in('section_id', sectionIds);
        
      if (selectError) {
        console.error('Error fetching existing timetables:', selectError);
        throw new Error('Failed to fetch existing timetables for clearing');
      }
      
      console.log(`Found ${existingEntries?.length || 0} existing timetable entries to clear`);
      
      if (existingEntries && existingEntries.length > 0) {
        const { error: deleteError } = await supabase
          .from('timetables')
          .delete()
          .in('section_id', sectionIds);
        
        if (deleteError) {
          console.error('Error clearing existing timetables:', deleteError);
          throw new Error('Failed to clear existing timetables');
        }
        
        console.log(`Successfully cleared ${existingEntries.length} existing timetable entries`);
      }
    }
  }

  private async callGeminiAPI(
    data: GenerationData, 
    selectedSemester: number,
    options?: AdvancedGenerationOptions
  ): Promise<TimetableEntry[]> {
    // Prepare simplified data for AI
    const promptData = {
      departments: data.departments.map(d => ({ id: d.id, name: d.name, code: d.code })),
      sections: data.sections.map(s => ({ id: s.id, name: s.name, department_id: s.department_id })),
      subjects: data.subjects.map(s => ({ 
        id: s.id, 
        name: s.name, 
        code: s.code, 
        hours_per_week: s.hours_per_week,
        subject_type: s.subject_type,
        department_id: s.department_id 
      })),
      staff: data.staff.map(s => ({ 
        id: s.id, 
        name: s.name, 
        department_id: s.department_id,
        max_hours_per_week: s.max_hours_per_week 
      })),
      rooms: data.rooms.map(r => ({ 
        id: r.id, 
        room_number: r.room_number, 
        capacity: r.capacity,
        room_type: r.room_type 
      })),
      staffSubjects: data.staffSubjects.map(ss => ({
        staff_id: ss.staff_id,
        subject_id: ss.subject_id
      })),
      timings: data.timings.map(t => ({
        day_of_week: t.day_of_week,
        start_time: t.start_time,
        end_time: t.end_time,
        break_start: t.break_start,
        break_end: t.break_end,
        lunch_start: t.lunch_start,
        lunch_end: t.lunch_end
      }))
    };

    const additionalNotes = options?.advancedMode ? 
      `IMPORTANT ADVANCED MODE SELECTION:
      - User has specifically selected ${options?.sections?.length || 0} sections
      - User has specifically selected ${options?.subjects?.length || 0} subjects  
      - User has specifically selected ${options?.staff?.length || 0} staff members
      When in advanced mode, ONLY use the sections, subjects, and staff that have been explicitly provided in the data.` : '';

    const prompt = `You are an AI timetable generator for Mohan Babu University. Generate a comprehensive timetable in JSON format for semester ${selectedSemester}.

CRITICAL DATABASE CONSTRAINTS (WILL CAUSE SAVE FAILURES IF VIOLATED):
1. UNIQUE(staff_id, day_of_week, time_slot) - Same staff cannot teach multiple classes at same time
2. UNIQUE(room_id, day_of_week, time_slot) - Same room cannot host multiple classes at same time
3. UNIQUE(section_id, day_of_week, time_slot) - Same section cannot have multiple classes at same time

TIMETABLE FORMAT REQUIREMENTS (Based on MBU Format):
1. Days: 1-6 (Monday=1 to Saturday=6)
2. Time Slots: 1-5 representing periods (08:00AM-08:55AM, 08:55AM-09:50AM, 10:15AM-11:10AM, 11:10AM-12:05PM, 12:05PM-01:00PM)
3. Break between slots 2-3 (09:50AM-10:15AM)
4. Subject codes should be displayed (like DV, BIT, DA, etc.)
5. For theory+lab subjects: Create both theory and lab entries with same subject_id but different room types
6. FREE PERIOD HANDLING:
   - For sections with MANY subjects (5+ subjects): Fill ALL time slots, distribute subjects evenly, NO free periods
   - For sections with FEW subjects (3-4 subjects): Can leave some slots free for "Library Period" or "Internship"
   - Free periods should default to "Library Period" or "Internship" depending on semester (higher semesters get Internship)
   - Ensure minimum 3 classes per day, but aim for 4-5 if enough subjects available

MANDATORY SCHEDULING RULES:
1. SCHEDULE EVERY SUBJECT: You MUST schedule every single subject provided in the data for its required 'hours_per_week'.
2. DO NOT SKIP SUBJECTS: If a subject has hours_per_week=3, you MUST create 3 entries for it.
3. FILL THE WEEK: Do not leave the schedule empty. Aim to fill at least 4-5 slots per day for every section.
4. CROSS-SEMESTER SUBJECTS: The provided subjects list may contain subjects from different semesters. Treat them all as valid subjects for this timetable.
5. ONLY assign staff to subjects they are authorized to teach (check staffSubjects mapping).
6. NO staff conflicts: Each staff member can only be in ONE place at any given day/time_slot.
7. NO room conflicts: Each room can only host ONE class at any given day/time_slot.
8. NO section conflicts: Each section can only have ONE class at any given day/time_slot.
9. Lab subjects (subject_type: 'lab' or 'practical') MUST use lab-type rooms.
10. Theory subjects can use any classroom or lab.

CONFLICT RESOLUTION STRATEGY:
- If a staff member is already assigned to day X, slot Y, find different staff for other subjects at that time
- If a room is already used at day X, slot Y, find different room for other classes at that time
- Spread subject hours across different days and time slots
- Prioritize avoiding conflicts over perfect distribution
- For theory+lab subjects: Schedule lab sessions in lab rooms and theory in regular classrooms

IMPORTANT: If a conflict is unavoidable (e.g., all staff are busy at a slot), you MUST still generate a timetable by updating the existing slot with the new subject/staff/room for that section, day, and time. Do NOT leave any slot empty or skip generation due to conflicts. Always ensure a complete timetable is generated, even if it means overwriting previous assignments for a slot.

OPTIMIZATION GOALS:
- Schedule all subjects according to their hours_per_week requirement
- Minimize scheduling conflicts
- Balance faculty workload (respect max_hours_per_week)
- Use room capacity efficiently
- Spread lab sessions across different days to avoid congestion
- Ensure at least 3 classes per section per day (may repeat subjects if necessary to meet the minimum)
- Follow MBU timetable format with proper time slots (1-5) and days (1-6)

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

IMPORTANT: Before adding each entry, verify:
- This staff_id is not already used at this day_of_week + time_slot
- This room_id is not already used at this day_of_week + time_slot
- This section_id is not already used at this day_of_week + time_slot
- Use time_slot values 1-5 only (MBU format)
- Use day_of_week values 1-6 (Monday to Saturday)

${additionalNotes}

Generate entries for ALL sections and subjects. Ensure NO DUPLICATE assignments for the same day/time combination.
If a section would otherwise have fewer than 3 classes on a day, you may repeat a subject already scheduled that week for that section to reach the minimum of 3.
For subjects needing both theory and lab: create separate entries with different room types but same subject_id.
If a slot is already occupied, update it with the new assignment for that section, day, and time.`;

    const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt + "\n\nIMPORTANT: Return output as a raw JSON object only. Do not include markdown formatting or backticks."
            }]
          }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            responseMimeType: "application/json"
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Google AI API');
    }

    let generatedText = result.candidates[0].content.parts[0].text;
    
    // Clean up markdown code blocks if present
    generatedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
    
    console.log('Gemini Raw Response:', generatedText);

    const parsedData = extractJsonArray(generatedText);

    if (!parsedData || !Array.isArray(parsedData)) {
      console.error('AI Response Text (Failed to find JSON array):', generatedText);
      const snippet = generatedText.substring(0, 200).replace(/\n/g, ' ');
      throw new Error(`No valid JSON found in AI response. Response snippet: "${snippet}..."`);
    }
    
    return parsedData;
  }

  // Post-processing: guarantee minimum 3 classes per day for each section (days 1-6)
  private enforceMinimumDailyClasses(
    entries: TimetableEntry[],
    data: GenerationData,
    selectedSemester: number
  ): TimetableEntry[] {
    const MIN_PER_DAY = 3;
    const days = [1,2,3,4,5,6];
    const timeSlots = [1,2,3,4,5,6,7];
    const result: TimetableEntry[] = [...entries];

    const staffSlots = new Set(result.map(e => `${e.staff_id}:${e.day_of_week}:${e.time_slot}`));
    const roomSlots = new Set(result.map(e => `${e.room_id}:${e.day_of_week}:${e.time_slot}`));
    const sectionSlots = new Set(result.map(e => `${e.section_id}:${e.day_of_week}:${e.time_slot}`));

    const sections = data.sections.filter(s => s.semester === selectedSemester);

    const subjectsByDept = new Map<string, Subject[]>();
    data.subjects.forEach(sub => {
      if(!subjectsByDept.has(sub.department_id)) subjectsByDept.set(sub.department_id, []);
      subjectsByDept.get(sub.department_id)!.push(sub);
    });

    const subjectStaffMap = new Map<string, Staff[]>();
    data.staffSubjects.forEach(ss => {
      const staff = data.staff.find(st => st.id === ss.staff_id);
      if (staff) {
        if(!subjectStaffMap.has(ss.subject_id)) subjectStaffMap.set(ss.subject_id, []);
        subjectStaffMap.get(ss.subject_id)!.push(staff);
      }
    });

    const roomsByType = {
      lab: data.rooms.filter(r => r.room_type === 'lab' || r.room_type === 'practical'),
      any: data.rooms
    };

    for (const section of sections) {
      for (const day of days) {
        const dayCount = result.filter(e => e.section_id === section.id && e.day_of_week === day).length;
        if (dayCount >= MIN_PER_DAY) continue;
        let needed = MIN_PER_DAY - dayCount;
        const candidateSubjects = subjectsByDept.get(section.department_id) || [];
        if (candidateSubjects.length === 0) continue;
        let subjectIndex = 0;
        for (const slot of timeSlots) {
          if (needed <= 0) break;
          const sectionKey = `${section.id}:${day}:${slot}`;
            if (sectionSlots.has(sectionKey)) continue;
          const subject = candidateSubjects[subjectIndex % candidateSubjects.length];
          subjectIndex++;
          const staffCandidates = subjectStaffMap.get(subject.id) || data.staff.filter(st => st.department_id === section.department_id);
          const roomPool = (subject.subject_type === 'lab' || subject.subject_type === 'practical') ? roomsByType.lab : roomsByType.any;
          if (staffCandidates.length === 0 || roomPool.length === 0) continue;
          let placed = false;
          for (const staff of staffCandidates) {
            if (placed) break;
            const staffKey = `${staff.id}:${day}:${slot}`;
            if (staffSlots.has(staffKey)) continue;
            for (const room of roomPool) {
              if (placed) break;
              const roomKey = `${room.id}:${day}:${slot}`;
              if (roomSlots.has(roomKey)) continue;
              const newEntry: TimetableEntry = {
                section_id: section.id,
                subject_id: subject.id,
                staff_id: staff.id,
                room_id: room.id,
                day_of_week: day,
                time_slot: slot,
                semester: selectedSemester
              };
              result.push(newEntry);
              staffSlots.add(staffKey);
              roomSlots.add(roomKey);
              sectionSlots.add(sectionKey);
              needed--;
              placed = true;
              console.log(`Added filler (min 3/day) Section ${section.name} Day ${day} Slot ${slot}`);
            }
          }
        }
      }
    }
    return result;
  }

  private validateEntries(entries: TimetableEntry[], selectedSemester: number): TimetableEntry[] {
    console.log(`Validating ${entries.length} entries for conflicts...`);
    
    // First, filter basic validation
    const validEntries = entries.filter(entry => {
      return entry.section_id && 
             entry.subject_id && 
             entry.staff_id && 
             entry.room_id && 
             entry.day_of_week >= 1 && 
             entry.day_of_week <= 6 && // Monday to Saturday (MBU format)
             entry.time_slot >= 1 && 
             entry.time_slot <= 5 && // MBU format: 5 periods per day
             entry.semester === selectedSemester;
    });

    console.log(`${validEntries.length} entries passed basic validation`);

    // Advanced conflict resolution - keep first occurrence and remove conflicts
    const conflictFreeEntries: TimetableEntry[] = [];
    const usedStaffSlots = new Map<string, TimetableEntry>();
    const usedRoomSlots = new Map<string, TimetableEntry>();
    const usedSectionSlots = new Map<string, TimetableEntry>();

    validEntries.forEach((entry, index) => {
      const staffKey = `${entry.staff_id}:${entry.day_of_week}:${entry.time_slot}`;
      const roomKey = `${entry.room_id}:${entry.day_of_week}:${entry.time_slot}`;
      const sectionKey = `${entry.section_id}:${entry.day_of_week}:${entry.time_slot}`;

      // Check all three types of conflicts
      const staffConflict = usedStaffSlots.has(staffKey);
      const roomConflict = usedRoomSlots.has(roomKey);
      const sectionConflict = usedSectionSlots.has(sectionKey);

      if (!staffConflict && !roomConflict && !sectionConflict) {
        // No conflicts, add this entry
        conflictFreeEntries.push(entry);
        usedStaffSlots.set(staffKey, entry);
        usedRoomSlots.set(roomKey, entry);
        usedSectionSlots.set(sectionKey, entry);
      } else {
        // Log specific conflicts for debugging
        const conflicts = [];
        if (staffConflict) {
          const conflictingEntry = usedStaffSlots.get(staffKey)!;
          conflicts.push(`staff ${entry.staff_id} already teaching at this time (conflicting with entry for section ${conflictingEntry.section_id})`);
        }
        if (roomConflict) {
          const conflictingEntry = usedRoomSlots.get(roomKey)!;
          conflicts.push(`room ${entry.room_id} already occupied at this time (conflicting with entry for section ${conflictingEntry.section_id})`);
        }
        if (sectionConflict) {
          const conflictingEntry = usedSectionSlots.get(sectionKey)!;
          conflicts.push(`section ${entry.section_id} already has a class at this time (conflicting with subject ${conflictingEntry.subject_id})`);
        }
        
        console.warn(`Removing conflicting entry ${index + 1}: Day ${entry.day_of_week}, Slot ${entry.time_slot} - ${conflicts.join('; ')}`);
      }
    });

    const removedCount = validEntries.length - conflictFreeEntries.length;
    if (removedCount > 0) {
      console.warn(`Removed ${removedCount} conflicting entries to prevent database constraint violations`);
    }

    // Verify no duplicates remain
    const finalStaffSlots = new Set<string>();
    const finalRoomSlots = new Set<string>();  
    const finalSectionSlots = new Set<string>();
    
    for (const entry of conflictFreeEntries) {
      const staffKey = `${entry.staff_id}:${entry.day_of_week}:${entry.time_slot}`;
      const roomKey = `${entry.room_id}:${entry.day_of_week}:${entry.time_slot}`;
      const sectionKey = `${entry.section_id}:${entry.day_of_week}:${entry.time_slot}`;
      
      if (finalStaffSlots.has(staffKey) || finalRoomSlots.has(roomKey) || finalSectionSlots.has(sectionKey)) {
        console.error('CRITICAL: Duplicate entries still present after validation!', entry);
        throw new Error('Validation failed - duplicate entries detected');
      }
      
      finalStaffSlots.add(staffKey);
      finalRoomSlots.add(roomKey);
      finalSectionSlots.add(sectionKey);
    }

    console.log(`Final validated entries: ${conflictFreeEntries.length} (guaranteed conflict-free)`);
    return conflictFreeEntries;
  }

  private async saveTimetable(entries: TimetableEntry[]): Promise<void> {
    console.log(`Attempting to save ${entries.length} timetable entries...`);
    
    if (entries.length === 0) {
      throw new Error('No entries to save');
    }

    // Log first entry for debugging
    console.log('Sample entry:', entries[0]);
    
    // Validate entries before saving
    const invalidEntries = entries.filter(entry => 
      !entry.section_id || 
      !entry.subject_id || 
      !entry.staff_id || 
      !entry.room_id ||
      typeof entry.day_of_week !== 'number' ||
      typeof entry.time_slot !== 'number' ||
      typeof entry.semester !== 'number'
    );
    
    if (invalidEntries.length > 0) {
      console.error('Invalid entries found:', invalidEntries.slice(0, 3));
      throw new Error(`Found ${invalidEntries.length} invalid entries with missing required fields`);
    }

    // Use upsert with conflict resolution to handle duplicates
    try {
      const { data, error } = await supabase
        .from('timetables')
        .upsert(entries, { 
          onConflict: 'section_id,day_of_week,time_slot',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('Supabase upsert error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Try individual inserts with update on conflict
        console.log('Attempting individual inserts with update on conflict...');
        let successCount = 0;
        let updateCount = 0;
        let fatalErrorCount = 0;
        
        for (const entry of entries) {
          try {
            // Try insert first
            const { error: insertError } = await supabase
              .from('timetables')
              .insert(entry);
            if (insertError) {
              if (insertError.message.includes('duplicate') || insertError.message.includes('violates unique constraint')) {
                // If duplicate, perform update
                const { error: updateError } = await supabase
                  .from('timetables')
                  .update({
                    subject_id: entry.subject_id,
                    staff_id: entry.staff_id,
                    room_id: entry.room_id,
                    semester: entry.semester
                  })
                  .eq('section_id', entry.section_id)
                  .eq('day_of_week', entry.day_of_week)
                  .eq('time_slot', entry.time_slot);
                if (updateError) {
                  console.error(`Failed to update duplicate entry:`, updateError);
                  fatalErrorCount++;
                } else {
                  updateCount++;
                }
              } else {
                throw insertError;
              }
            } else {
              successCount++;
            }
          } catch (individualError) {
            console.error(`Failed to insert/update individual entry:`, individualError);
            fatalErrorCount++;
          }
        }
        
        if (successCount === 0 && updateCount > 0 && fatalErrorCount === 0) {
          console.warn('All offline timetable entries already existed and were updated.');
          return;
        }

        if (successCount === 0 && updateCount === 0) {
          throw new Error(`Failed to insert or update any timetable entries. ${fatalErrorCount} errors detected.`);
        }
        
        console.log(`Successfully inserted ${successCount} entries, updated ${updateCount} duplicates`);
        return;
      }

      console.log(`Successfully saved ${data?.length || entries.length} timetable entries`);
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw dbError;
    }
  }
}

// Individual student timetable generator
export class StudentTimetableGenerator {
  private googleApiKey: string;

  constructor() {
    const apiKey = env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('Google AI API key not configured. Please check your environment variables.');
    }
    this.googleApiKey = apiKey;
  }

  async generateStudentTimetable(
    studentId: string,
    semester: number,
    departmentIds?: string[],
    sectionIds?: string[],
    subjectIds?: string[]
  ): Promise<{
    success: boolean;
    timetable?: StudentTimetableJson;
    model_version?: string;
    error?: string;
  }> {
    try {
      console.log('Generating personalized student timetable...');
      
      // Fetch student data - using type assertion since students table is not in the schema
      const { data: studentData, error: studentError } = await (supabase as any)
        .from('students')
        .select('*, departments(name, code)')
        .eq('id', studentId)
        .single();
      
      if (studentError || !studentData) {
        throw new Error('Student not found');
      }

      const deptIds = departmentIds && departmentIds.length > 0 ? departmentIds : [studentData.department_id];

      // Fetch relevant data based on filters
      const [sectionsResult, subjectsResult, staffResult, roomsResult, timingsResult, staffSubjectsResult] = await Promise.all([
        sectionIds && sectionIds.length > 0
          ? supabase.from('sections').select('*').in('id', sectionIds)
          : supabase.from('sections').select('*').eq('semester', semester).in('department_id', deptIds),
        subjectIds && subjectIds.length > 0
          ? supabase.from('subjects').select('*').in('id', subjectIds)
          : supabase.from('subjects').select('*').eq('semester', semester).in('department_id', deptIds),
        supabase.from('staff').select('*').in('department_id', deptIds),
        supabase.from('rooms').select('*'),
        supabase.from('college_timings').select('*').order('day_of_week'),
        supabase.from('staff_subjects').select('staff_id, subject_id, staff:staff_id(*), subjects:subject_id(*)')
      ]);

      const data = {
        student: studentData,
        sections: sectionsResult.data || [],
        subjects: subjectsResult.data || [],
        staff: staffResult.data || [],
        rooms: roomsResult.data || [],
        timings: timingsResult.data || [],
        staffSubjects: staffSubjectsResult.data || []
      };

      // Generate timetable using Gemini AI
      const timetableJson = await this.callGeminiForStudent(data, semester);
      
      return {
        success: true,
        timetable: timetableJson,
        model_version: 'gemini-2.5-flash'
      };
      
    } catch (error) {
      console.error('Student timetable generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate student timetable'
      };
    }
  }

  private async callGeminiForStudent(data: StudentGenerationData, semester: number): Promise<StudentTimetableJson> {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const timeSlots = [
      "09:00-10:00",
      "10:15-11:15",
      "11:15-12:15",
      "13:15-14:00",
      "14:00-14:45",
      "15:00-16:00",
      "16:00-17:00"
    ];

    const prompt = `You are an AI timetable generator for individual students at Mohan Babu University. Generate a personalized weekly timetable for the following student:

STUDENT INFORMATION:
Name: ${data.student.name}
Roll Number: ${data.student.roll_no}
Semester: ${semester}
Department: ${data.student.departments?.name || 'Unknown'}

AVAILABLE DATA:
Subjects: ${JSON.stringify(data.subjects.map(s => ({ id: s.id, name: s.name, code: s.code, hours_per_week: s.hours_per_week, subject_type: s.subject_type })))}
Staff: ${JSON.stringify(data.staff.map(s => ({ id: s.id, name: s.name })))}
Rooms: ${JSON.stringify(data.rooms.map(r => ({ id: r.id, room_number: r.room_number, room_type: r.room_type, capacity: r.capacity })))}
Staff-Subject Mapping: ${JSON.stringify(data.staffSubjects.map(ss => ({ staff_id: ss.staff_id, subject_id: ss.subject_id })))}

TIMETABLE REQUIREMENTS:
1. Days: Monday to Friday (5 days)
2. Time Slots: ${timeSlots.join(', ')}
3. Schedule classes according to subject hours_per_week
4. Assign appropriate staff who can teach each subject (check staff-subject mapping)
5. Use lab rooms for lab/practical subjects, regular classrooms for theory
6. Distribute classes evenly across the week
7. Avoid back-to-back lab sessions if possible
8. Include breaks (11:00-11:15 break time is already in the time slots)
9. Ensure at least 4-5 classes per day for a balanced schedule
10. Leave some free periods for self-study

RESPONSE FORMAT:
Return ONLY valid JSON in this exact format (no additional text):
{
  "schedule": {
    "Monday": {
      "9:00-10:00": {
        "subject": "Subject Name",
        "code": "SUB101",
        "staff": "Staff Name",
        "room": "Room Number",
        "type": "theory/lab"
      },
      "10:00-11:00": { ... },
      ... (continue for all time slots)
    },
    "Tuesday": { ... },
    ... (continue for all days)
  },
  "summary": {
    "total_classes": 25,
    "subjects_covered": ["Subject1", "Subject2", ...],
    "free_periods": 5
  }
}

IMPORTANT:
- Ensure each subject appears for its required hours_per_week across the week
- Verify staff assignments match the staff-subject mapping
- Use appropriate room types for each subject
- Create a balanced, realistic student schedule
- If a time slot should be free, use null or omit it
- Ensure proper JSON formatting with no syntax errors`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt + "\n\nIMPORTANT: Return output as a raw JSON object only. Do not include markdown formatting or backticks."
            }]
          }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Google AI API');
    }

    let generatedText = result.candidates[0].content.parts[0].text;
    
    // Clean up markdown code blocks if present
    generatedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
    
    console.log('Gemini Student Timetable Raw Response:', generatedText);

    const timetableJson = extractJsonObject(generatedText);

    if (!timetableJson) {
      console.error('AI Response Text (Failed to find JSON object):', generatedText);
      throw new Error('No valid JSON found in AI response');
    }
    
    // Validate the structure
    if (!timetableJson.schedule) {
      throw new Error('Invalid timetable structure - missing schedule');
    }
    
    return timetableJson;
  }
}

// Simple algorithm-based fallback generator
export class SimpleTimetableGenerator {
  async generateTimetable(selectedDepartments: string[], selectedSemester: number, options?: SimpleGenerationOptions): Promise<{
    success: boolean;
    message: string;
    entriesCount?: number;
    error?: string;
  }> {
    try {
      console.log('Starting simple algorithm-based timetable generation...');
      
      // Fetch data
      const data = await this.fetchData(selectedDepartments, selectedSemester, options);
      
      // Clear existing timetables
      await this.clearExistingTimetables(data.sections.map(s => s.id));
      
      // Generate using simple algorithm
      const timetableEntries = this.generateSimpleSchedule(data, selectedSemester, options);
      
      if (timetableEntries.length > 0) {
        await this.saveTimetable(timetableEntries);
        
        return {
          success: true,
          message: `Timetable generated using simple algorithm (${timetableEntries.length} entries)`,
          entriesCount: timetableEntries.length
        };
      } else {
        throw new Error('Failed to generate any timetable entries');
      }
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate timetable using simple algorithm',
        error: error.message
      };
    }
  }

  private async fetchData(selectedDepartments: string[], selectedSemester: number, options?: SimpleGenerationOptions): Promise<GenerationData> {
    const roomsPromise = options?.rooms && options.rooms.length > 0
      ? supabase.from('rooms').select('*').in('id', options.rooms)
      : supabase.from('rooms').select('*');

    // If advanced mode with specific subjects selected, fetch only those
    const subjectsPromise = options?.subjects && options.subjects.length > 0
      ? supabase.from('subjects').select('*').in('id', options.subjects)
      : supabase.from('subjects').select('*').in('department_id', selectedDepartments).eq('semester', selectedSemester);

    // Always fetch filler subjects (Library, Internship, Project) to ensure we can fill gaps
    // even if they weren't explicitly selected in advanced mode
    const fillerSubjectsPromise = supabase.from('subjects')
      .select('*')
      .or('name.ilike.%library%,name.ilike.%internship%,name.ilike.%project%');

    // If advanced mode with specific sections selected, fetch only those
    const sectionsPromise = options?.sections && options.sections.length > 0
      ? supabase.from('sections').select('*').in('id', options.sections)
      : supabase.from('sections').select('*').in('department_id', selectedDepartments).eq('semester', selectedSemester);

    const [departmentsResult, sectionsResult, subjectsResult, staffResult, roomsResult, timingsResult, staffSubjectsResult, fillerSubjectsResult] = await Promise.all([
      supabase.from('departments').select('*').in('id', selectedDepartments),
      sectionsPromise,
      subjectsPromise,
      supabase.from('staff').select('*').in('department_id', selectedDepartments),
      roomsPromise,
      supabase.from('college_timings').select('*').order('day_of_week'),
      supabase.from('staff_subjects').select('staff_id, subject_id'),
      fillerSubjectsPromise
    ]);

    const data: GenerationData = {
      departments: departmentsResult.data || [],
      sections: sectionsResult.data || [],
      subjects: subjectsResult.data || [],
      staff: staffResult.data || [],
      rooms: roomsResult.data || [],
      timings: timingsResult.data || [],
      staffSubjects: staffSubjectsResult.data || [],
      fillerSubjects: fillerSubjectsResult.data || []
    };

    if (data.rooms.length === 0) {
      if (options?.rooms?.length) {
        throw new Error('Selected rooms are unavailable. Clear the filter to auto-assign from all rooms.');
      }
      throw new Error('No rooms found in the database. Please add rooms before running the offline generator.');
    }

    return data;
  }

  private async clearExistingTimetables(sectionIds: string[]): Promise<void> {
    if (sectionIds.length > 0) {
      console.log(`Clearing existing timetables for ${sectionIds.length} sections...`);
      
      const { data: existingEntries, error: selectError } = await supabase
        .from('timetables')
        .select('id')
        .in('section_id', sectionIds);
        
      if (selectError) {
        console.error('Error fetching existing timetables:', selectError);
        throw new Error('Failed to fetch existing timetables for clearing');
      }
      
      console.log(`Found ${existingEntries?.length || 0} existing timetable entries to clear`);
      
      if (existingEntries && existingEntries.length > 0) {
        const { error: deleteError } = await supabase
          .from('timetables')
          .delete()
          .in('section_id', sectionIds);
        
        if (deleteError) {
          console.error('Error clearing existing timetables:', deleteError);
          throw new Error('Failed to clear existing timetables');
        }
        
        console.log(`Successfully cleared ${existingEntries.length} existing timetable entries`);
      }
    }
  }

  private generateSimpleSchedule(data: GenerationData, selectedSemester: number, options?: SimpleGenerationOptions): TimetableEntry[] {
    const entries: TimetableEntry[] = [];
    const timeSlots = 7; // 7 periods per day
    const days = 5; // Monday to Friday only
    
    // Track occupied slots to avoid conflicts
    const occupiedSlots = {
      staff: new Set<string>(), // staff_id:day:slot
      rooms: new Set<string>(), // room_id:day:slot
      sections: new Set<string>() // section_id:day:slot
    };

    // Track staff load for balancing
    const staffLoad: Record<string, number> = {};
    data.staff.forEach(s => staffLoad[s.id] = 0);
    
    // Helper function to check if a slot is available
    const isSlotAvailable = (staffId: string, roomId: string, sectionId: string, day: number, slot: number): boolean => {
      const staffKey = `${staffId}:${day}:${slot}`;
      const roomKey = `${roomId}:${day}:${slot}`;
      const sectionKey = `${sectionId}:${day}:${slot}`;
      
      return !occupiedSlots.staff.has(staffKey) && 
             !occupiedSlots.rooms.has(roomKey) && 
             !occupiedSlots.sections.has(sectionKey);
    };
    
    // Helper function to mark a slot as occupied
    const markSlotOccupied = (staffId: string, roomId: string, sectionId: string, day: number, slot: number): void => {
      occupiedSlots.staff.add(`${staffId}:${day}:${slot}`);
      occupiedSlots.rooms.add(`${roomId}:${day}:${slot}`);
      occupiedSlots.sections.add(`${sectionId}:${day}:${slot}`);
      staffLoad[staffId] = (staffLoad[staffId] || 0) + 1;
    };
    
    // Process each section
    data.sections.forEach((section) => {
      console.log(`Processing section: ${section.name}`);
      
      // In Advanced Mode (specific subjects selected), don't filter by department to allow cross-dept subjects
      // In Auto Mode, filter by department to ensure correct mapping
      // Also ensure we only schedule subjects for the correct semester
      let sectionSubjects = options?.subjects 
        ? data.subjects.filter(s => s.semester === section.semester) 
        : data.subjects.filter(s => s.department_id === section.department_id);
      
      // Sort subjects: Labs/Practical first (harder to schedule), then by hours descending
      sectionSubjects.sort((a, b) => {
        const typeScore = (type: string) => (type?.toLowerCase().includes('lab') || type?.toLowerCase().includes('practical')) ? 2 : 1;
        const scoreA = typeScore(a.subject_type) * 100 + (Number(a.hours_per_week) || 3);
        const scoreB = typeScore(b.subject_type) * 100 + (Number(b.hours_per_week) || 3);
        return scoreB - scoreA; // Descending
      });

      // Track subject distribution per day for this section
      const subjectDays = new Map<string, Set<number>>();
      
      // Schedule subjects for this section
      sectionSubjects.forEach((subject) => {
        const hoursPerWeek = Number(subject.hours_per_week) || 3;
        const isLab = subject.subject_type?.toLowerCase().includes('lab') || subject.subject_type?.toLowerCase().includes('practical');
        const blockSize = isLab ? 2 : 1;

        console.log(`Scheduling subject: ${subject.name} (${hoursPerWeek} hours/week, Block: ${blockSize})`);
        if (!subjectDays.has(subject.id)) subjectDays.set(subject.id, new Set());
        
        // Find staff who can teach this subject
        const eligibleStaff = data.staffSubjects
          .filter(ss => ss.subject_id === subject.id)
          .map(ss => data.staff.find(s => s.id === ss.staff_id))
          .filter(Boolean);
        
        // If no specific staff assigned, use any staff from the department
        let availableStaff = eligibleStaff.length > 0 
          ? eligibleStaff 
          : data.staff.filter(s => s.department_id === section.department_id);

        if (availableStaff.length === 0) {
          // Fall back to any staff in the institution so offline mode still works for new departments
          availableStaff = data.staff;
        }
        
        if (availableStaff.length === 0) {
          console.warn(`No staff available for subject: ${subject.name}`);
          return;
        }

        // Sort staff by load (ascending) to balance workload
        availableStaff.sort((a, b) => (staffLoad[a.id] || 0) - (staffLoad[b.id] || 0));
        
        // Find appropriate rooms
        const appropriateRooms = isLab
          ? data.rooms.filter(r => r.room_type === 'lab')
          : data.rooms; // Theory can use any room
        
        if (appropriateRooms.length === 0) {
          console.warn(`No appropriate rooms for subject: ${subject.name} (${subject.subject_type})`);
          return;
        }
        
        // Schedule the required hours for this subject
        let scheduledHours = 0;
        let attempts = 0;
        const maxAttempts = 500; // Increased to ensure mandatory hours are met

        while (scheduledHours < hoursPerWeek && attempts < maxAttempts) {
            attempts++;
            
            // Strategy: Try to find a day we haven't used yet for this subject
            let bestDay = -1;
            let bestSlot = -1;
            let bestStaff = null;
            let bestRoom = null;

            // Create a list of all possible slots (day, slot)
            const possibleSlots = [];
            for(let d=1; d<=days; d++) {
                for(let s=1; s<=timeSlots; s++) {
                    possibleSlots.push({day: d, slot: s});
                }
            }

            // Shuffle slots to randomize
            for (let i = possibleSlots.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [possibleSlots[i], possibleSlots[j]] = [possibleSlots[j], possibleSlots[i]];
            }

            // Sort slots: Prioritize days not used yet
            possibleSlots.sort((a, b) => {
                const usedA = subjectDays.get(subject.id)?.has(a.day) ? 1 : 0;
                const usedB = subjectDays.get(subject.id)?.has(b.day) ? 1 : 0;
                return usedA - usedB; // 0 (unused) comes before 1 (used)
            });

            // If we are struggling to find a slot (attempts > 50), try deterministic search to ensure we don't miss any opportunity
            if (attempts > 50) {
                possibleSlots.sort((a, b) => (a.day * 10 + a.slot) - (b.day * 10 + b.slot));
            }

            // Find first valid slot
            for (const {day, slot} of possibleSlots) {
                // For labs, enforce consecutive slots (1-2, 3-4, 5-6, 7-8)
                if (isLab) {
                    if (slot % 2 === 0) continue; // Must start on odd slot
                    if (slot + 1 > timeSlots) continue; // Must fit in day
                }

                // Check if section is free for all blocks
                let sectionFree = true;
                for(let i=0; i<blockSize; i++) {
                    if (occupiedSlots.sections.has(`${section.id}:${day}:${slot+i}`)) {
                        sectionFree = false;
                        break;
                    }
                }
                if (!sectionFree) continue;

                // Try to find staff and room
                for (const staff of availableStaff) {
                    if (bestStaff) break;
                    for (const room of appropriateRooms) {
                        // Check availability for all blocks
                        let available = true;
                        for(let i=0; i<blockSize; i++) {
                            if (!isSlotAvailable(staff.id, room.id, section.id, day, slot+i)) {
                                available = false;
                                break;
                            }
                        }
                        
                        if (available) {
                            bestDay = day;
                            bestSlot = slot;
                            bestStaff = staff;
                            bestRoom = room;
                            break;
                        }
                    }
                }
                if (bestDay !== -1) break;
            }

            if (bestDay !== -1 && bestStaff && bestRoom) {
                for(let i=0; i<blockSize; i++) {
                    entries.push({
                        section_id: section.id,
                        subject_id: subject.id,
                        staff_id: bestStaff.id,
                        room_id: bestRoom.id,
                        day_of_week: bestDay,
                        time_slot: bestSlot + i,
                        semester: selectedSemester
                    });
                    markSlotOccupied(bestStaff.id, bestRoom.id, section.id, bestDay, bestSlot + i);
                }
                
                subjectDays.get(subject.id)?.add(bestDay);
                scheduledHours += blockSize;
                console.log(`Scheduled: ${subject.name} - Day ${bestDay}, Slot ${bestSlot}-${bestSlot+blockSize-1} - Staff: ${bestStaff.name}, Room: ${bestRoom.room_number}`);
            }
        }
        
        if (scheduledHours < hoursPerWeek) {
          console.warn(`Only scheduled ${scheduledHours}/${hoursPerWeek} hours for ${subject.name} in section ${section.name}`);
        }
      });

      // Fill remaining slots with Library or Internship if available
      // Use a combined list to find fillers, but don't iterate over them for main scheduling
      const allAvailableSubjects = [...data.subjects, ...(data.fillerSubjects || [])];
      
      const librarySubject = allAvailableSubjects.find(s => s.name.toLowerCase().includes('library') && (s.department_id === section.department_id || !s.department_id));
      const internshipSubject = allAvailableSubjects.find(s => (s.name.toLowerCase().includes('internship') || s.name.toLowerCase().includes('project')) && (s.department_id === section.department_id || !s.department_id));
      
      const fillerSubject = selectedSemester >= 7 ? internshipSubject : librarySubject;

      if (fillerSubject) {
        console.log(`Filling empty slots for ${section.name} with ${fillerSubject.name}`);
        // Find any staff (maybe a coordinator or just any staff member to supervise)
        // For simplicity, we'll pick the first available staff member or a random one
        const fillerStaff = data.staff.filter(s => s.department_id === section.department_id)[0] || data.staff[0];
        const fillerRoom = data.rooms.find(r => r.room_type !== 'lab') || data.rooms[0];

        if (fillerStaff && fillerRoom) {
            for(let d=1; d<=days; d++) {
                for(let s=1; s<=timeSlots; s++) {
                    if (!occupiedSlots.sections.has(`${section.id}:${d}:${s}`)) {
                        // Try to find a valid staff/room for this slot
                        // Since it's a filler, we can be more flexible, but still need to avoid conflicts
                        let assignedStaff = fillerStaff;
                        let assignedRoom = fillerRoom;
                        
                        // Try to find ANY available staff/room
                        const availableStaff = data.staff.find(st => !occupiedSlots.staff.has(`${st.id}:${d}:${s}`));
                        const availableRoom = data.rooms.find(r => !occupiedSlots.rooms.has(`${r.id}:${d}:${s}`));

                        if (availableStaff && availableRoom) {
                            entries.push({
                                section_id: section.id,
                                subject_id: fillerSubject.id,
                                staff_id: availableStaff.id,
                                room_id: availableRoom.id,
                                day_of_week: d,
                                time_slot: s,
                                semester: selectedSemester
                            });
                            markSlotOccupied(availableStaff.id, availableRoom.id, section.id, d, s);
                        }
                    }
                }
            }
        }
      }
    });

    console.log(`Generated ${entries.length} timetable entries with conflict resolution`);

    if (entries.length === 0) {
      throw new Error('Offline generator could not create entries. Please ensure the selected departments have subjects, staff, and at least one available room.');
    }

    return entries;
  }

  private async saveTimetable(entries: TimetableEntry[]): Promise<void> {
    console.log(`Saving ${entries.length} simple timetable entries...`);
    
    if (entries.length === 0) {
      throw new Error('No entries to save');
    }

    // Validate entries
    const invalidEntries = entries.filter(entry => 
      !entry.section_id || 
      !entry.subject_id || 
      !entry.staff_id || 
      !entry.room_id
    );
    
    if (invalidEntries.length > 0) {
      console.error('Invalid entries found:', invalidEntries.slice(0, 3));
      throw new Error(`Found ${invalidEntries.length} invalid entries`);
    }

    // Use upsert with conflict resolution
    try {
      const { data, error } = await supabase
        .from('timetables')
        .upsert(entries, { 
          onConflict: 'section_id,day_of_week,time_slot',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('Simple generator upsert error:', error);
        
        // Try individual inserts with conflict handling
        console.log('Attempting individual inserts with conflict handling...');
        let successCount = 0;
        let errorCount = 0;
        
        for (const entry of entries) {
          try {
            const { error: insertError } = await supabase
              .from('timetables')
              .insert(entry);
            
            if (insertError) {
              if (insertError.message.includes('duplicate') || insertError.message.includes('violates unique constraint')) {
                console.log(`Skipping duplicate entry: Day ${entry.day_of_week}, Slot ${entry.time_slot}`);
                errorCount++;
              } else {
                throw insertError;
              }
            } else {
              successCount++;
            }
          } catch (individualError) {
            console.error(`Failed to insert individual entry:`, individualError);
            errorCount++;
          }
        }
        
        if (successCount === 0) {
          throw new Error(`Failed to insert any timetable entries. ${errorCount} conflicts detected.`);
        }
        
        console.log(`Successfully inserted ${successCount} entries, skipped ${errorCount} conflicts`);
        return;
      }

      console.log(`Successfully saved ${data?.length || entries.length} entries`);
    } catch (dbError) {
      console.error('Simple generator database operation failed:', dbError);
      throw dbError;
    }
  }
}
