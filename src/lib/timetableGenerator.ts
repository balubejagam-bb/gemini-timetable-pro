import { supabase } from "@/integrations/supabase/client";
import { env } from "./env";
import {
  isClassroomLike,
  isLabRoomLike,
  isLabSubjectLike,
  splitRoomsByType,
} from "./newmethod";

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
  } catch (e) { }

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
    } catch (e) { }
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
            } catch (e) { }
            objStart = -1;
          }
        }
      }
    }

    if (objects.length > 0) return objects;
  } catch (e) { }

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
  } catch (e) { }

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

// Fisher-Yates shuffle helper
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  existingTimetables?: TimetableEntry[];
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
  periodsPerDay?: number;  // Dynamic: 5, 6, 7, 8 etc.
  daysPerWeek?: number;    // Dynamic: 5 (Mon-Fri) or 6 (Mon-Sat)
  customTimings?: Array<{ slot: number; start: string; end: string }>; // Custom period timings
  labSubjectIds?: string[];  // Subject IDs that need a lab session (2 consecutive periods)
  staffSubjectMap?: Record<string, string>; // subjectId -> staffId manual assignment
}

type SimpleGenerationOptions = AdvancedGenerationOptions;

const getDayRange = (daysPerWeek?: number) =>
  Array.from({ length: Math.max(1, Math.min(daysPerWeek || 5, 6)) }, (_, index) => index + 1);

const getSlotRange = (periodsPerDay?: number) =>
  Array.from({ length: Math.max(1, Math.min(periodsPerDay || 7, 10)) }, (_, index) => index + 1);

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
      // Remove or fix entries that would violate staff, room, or section constraints
      const seenStaff = new Set();
      const seenRoom = new Set();
      const seenSection = new Set();
      const filteredEntries = [];
      for (const entry of timetableEntries) {
        let staffKey = `${entry.staff_id}:${entry.day_of_week}:${entry.time_slot}`;
        let roomKey = `${entry.room_id}:${entry.day_of_week}:${entry.time_slot}`;
        let sectionKey = `${entry.section_id}:${entry.day_of_week}:${entry.time_slot}`;
        // If conflict, try to find an alternative staff or room, or fill with offline logic
        let fixed = false;
        if (seenStaff.has(staffKey) || seenRoom.has(roomKey) || seenSection.has(sectionKey)) {
          // Try to find an alternative staff
          const section = data.sections.find(s => s.id === entry.section_id);
          const subject = data.subjects.find(s => s.id === entry.subject_id);
          let altStaff = data.staff;
          if (subject && data.staffSubjects) {
            // Only staff who can teach this subject
            const eligibleStaffIds = data.staffSubjects.filter(ss => ss.subject_id === subject.id).map(ss => ss.staff_id);
            if (eligibleStaffIds.length > 0) {
              altStaff = data.staff.filter(s => eligibleStaffIds.includes(s.id));
            }
          }
          for (const staff of altStaff) {
            staffKey = `${staff.id}:${entry.day_of_week}:${entry.time_slot}`;
            if (!seenStaff.has(staffKey)) {
              entry.staff_id = staff.id;
              fixed = true;
              break;
            }
          }
          // Try to find an alternative room if still conflict
          if (!fixed) {
            let altRooms = data.rooms.filter((room) => isClassroomLike(room));
            if (subject && (isLabSubjectLike(subject) || options?.labSubjectIds?.includes(subject.id))) {
              altRooms = data.rooms.filter((room) => isLabRoomLike(room));
            }
            if (altRooms.length === 0) {
              altRooms = data.rooms;
            }
            for (const room of altRooms) {
              roomKey = `${room.id}:${entry.day_of_week}:${entry.time_slot}`;
              if (!seenRoom.has(roomKey)) {
                entry.room_id = room.id;
                fixed = true;
                break;
              }
            }
          }
          // If still not fixed, try to fill with offline logic (rotate staff/room/subject)
          if (!fixed && section && data.subjects.length > 0 && data.staff.length > 0 && data.rooms.length > 0) {
            // Find a subject for this section not already scheduled at this slot
            const scheduledSubjects = filteredEntries
              .filter(e => e.section_id === section.id && e.day_of_week === entry.day_of_week && e.time_slot === entry.time_slot)
              .map(e => e.subject_id);
            const availableSubjects = data.subjects.filter(s => !scheduledSubjects.includes(s.id));
            for (const subject of availableSubjects) {
              // Find eligible staff for this subject
              let eligibleStaff = data.staff;
              if (data.staffSubjects) {
                const eligibleStaffIds = data.staffSubjects.filter(ss => ss.subject_id === subject.id).map(ss => ss.staff_id);
                if (eligibleStaffIds.length > 0) {
                  eligibleStaff = data.staff.filter(s => eligibleStaffIds.includes(s.id));
                }
              }
              for (const staff of eligibleStaff) {
                staffKey = `${staff.id}:${entry.day_of_week}:${entry.time_slot}`;
                if (seenStaff.has(staffKey)) continue;
                // Find available room
                let possibleRooms = data.rooms.filter((room) => isClassroomLike(room));
                if (isLabSubjectLike(subject) || options?.labSubjectIds?.includes(subject.id)) {
                  possibleRooms = data.rooms.filter((room) => isLabRoomLike(room));
                }
                if (possibleRooms.length === 0) {
                  possibleRooms = data.rooms;
                }
                for (const room of possibleRooms) {
                  roomKey = `${room.id}:${entry.day_of_week}:${entry.time_slot}`;
                  if (seenRoom.has(roomKey)) continue;
                  // All constraints passed, fill this slot
                  filteredEntries.push({
                    section_id: section.id,
                    subject_id: subject.id,
                    staff_id: staff.id,
                    room_id: room.id,
                    day_of_week: entry.day_of_week,
                    time_slot: entry.time_slot
                  });
                  seenStaff.add(staffKey);
                  seenRoom.add(roomKey);
                  seenSection.add(sectionKey);
                  fixed = true;
                  break;
                }
                if (fixed) break;
              }
              if (fixed) break;
            }
          }
        }
        staffKey = `${entry.staff_id}:${entry.day_of_week}:${entry.time_slot}`;
        roomKey = `${entry.room_id}:${entry.day_of_week}:${entry.time_slot}`;
        sectionKey = `${entry.section_id}:${entry.day_of_week}:${entry.time_slot}`;
        if (!seenStaff.has(staffKey) && !seenRoom.has(roomKey) && !seenSection.has(sectionKey)) {
          seenStaff.add(staffKey);
          seenRoom.add(roomKey);
          seenSection.add(sectionKey);
          filteredEntries.push(entry);
        }
      }
      let validatedEntries = this.applyRoomPolicies(filteredEntries, data, options);
      validatedEntries = this.validateEntries(validatedEntries, selectedSemester, options);
      // Enforce minimum daily load of 3 classes (days 1-6) while allowing free periods beyond that
      validatedEntries = this.enforceMinimumDailyClasses(validatedEntries, data, selectedSemester, options);
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

    const activeDays = getDayRange(options?.daysPerWeek);
    const activeSlots = getSlotRange(options?.periodsPerDay);
    const activeTimings = (options?.customTimings || []).filter((timing) => activeSlots.includes(timing.slot));
    const selectedRoomIds = new Set(options?.rooms || []);
    const selectedRooms = selectedRoomIds.size > 0
      ? data.rooms.filter((room) => selectedRoomIds.has(room.id))
      : data.rooms;
    const selectedRoomPools = splitRoomsByType(selectedRooms);
    const labPromptSubjects = data.subjects
      .filter((subject) => isLabSubjectLike(subject) || options?.labSubjectIds?.includes(subject.id))
      .map((subject) => ({
        id: subject.id,
        code: subject.code,
        name: subject.name,
        subject_type: subject.subject_type,
        treat_as_lab_block_once_per_week: true,
      }));

    const additionalNotes = options?.advancedMode
      ? `ADVANCED MODE:
- Use only the provided sections, subjects, staff, and rooms.
- Sections provided: ${options?.sections?.length || 0}
- Subjects provided: ${options?.subjects?.length || 0}
- Staff provided: ${options?.staff?.length || 0}
- Rooms provided: ${selectedRooms.length}`
      : "";

    const prompt = `You are a production timetable planner for Mohan Babu University.

Return ONLY a raw JSON array. No markdown. No comments. No explanation.

TARGET SEMESTER:
- Semester: ${selectedSemester}
- Allowed day_of_week values: ${activeDays.join(", ")}
- Allowed time_slot values: ${activeSlots.join(", ")}
- Period definitions: ${activeTimings.length > 0 ? JSON.stringify(activeTimings) : "Use the provided college timings table."}

DATABASE CONSTRAINTS THAT MUST NEVER BE VIOLATED:
1. UNIQUE(staff_id, day_of_week, time_slot)
2. UNIQUE(room_id, day_of_week, time_slot)
3. UNIQUE(section_id, day_of_week, time_slot)

ROOM POLICY:
1. Use ONLY room IDs from the provided rooms list.
2. Lab/practical sessions must use lab rooms only.
3. Theory sessions must prefer classroom rooms.
4. If both classroom and lab rooms are provided, never place theory in a lab room.
5. If the selected room list includes a classroom like 301 and a lab room, then:
   - classroom periods use the classroom
   - lab periods use the lab room only

LAB POLICY - FOLLOW STRICTLY:
1. Every lab/practical subject must appear exactly once per week as one 2-period block.
2. A lab block means TWO entries with the same section_id, subject_id, staff_id, room_id, day_of_week and consecutive time_slot values.
3. Valid priority pairs for 7-period MBU style: (4,5), (6,7), (1,2), (2,3). If some slots are unavailable, use any other consecutive pair within the allowed active slots.
4. Maximum one lab block per day per section.
5. Spread different lab subjects across different days.
6. The following subjects must be treated as weekly 2-period lab blocks: ${JSON.stringify(labPromptSubjects)}
7. If a non-lab subject ID is marked for a lab block, schedule exactly one 2-period lab block for that subject and schedule the remaining hours as normal theory periods.

SCHEDULING RULES:
1. Use every subject from the provided data.
2. Respect hours_per_week for each subject.
3. For a dedicated lab subject, its weekly hours should normally be satisfied by its one 2-period lab block.
4. For a theory subject marked for a lab block, split its workload into:
   - one 2-period lab block once in the week
   - remaining hours as theory periods
5. Only assign staff who are authorized through staffSubjects when a mapping exists.
6. Do not create duplicate entries for the same section/day/slot.
7. Do not create duplicate entries for the same room/day/slot.
8. Do not create duplicate entries for the same staff/day/slot.
9. Prefer Monday-Friday balance. Use Saturday only when it is part of the allowed day range.
10. Prefer 4-5 classes per day, and never leave a section nearly empty if valid placements exist.
11. Each section must also receive exactly 2 weekly library hours. Prefer two single periods, but a single 2-period block is acceptable if it fits better.

OUTPUT SHAPE:
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

VALIDATION CHECKLIST BEFORE YOU RETURN:
- Every entry uses an allowed section_id, subject_id, staff_id, and room_id from the supplied data.
- Every day_of_week is in ${activeDays.join(", ")}.
- Every time_slot is in ${activeSlots.join(", ")}.
- Each lab block is exactly two consecutive periods on one day.
- Each lab subject appears only once in the week for each section.
- Each section has at most one lab block on any day.
- No staff conflict.
- No room conflict.
- No section conflict.

${additionalNotes}

DATA PROVIDED:
${JSON.stringify(promptData, null, 2)}`;

    // Use only the confirmed working model
    const MODELS_TO_TRY = ['gemini-2.5-flash'];

    const requestBody = JSON.stringify({
      contents: [{
        parts: [{
          text: prompt + "\n\nIMPORTANT: Return output as a raw JSON array only. Do not include markdown formatting or backticks."
        }]
      }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1,
        topK: 1,
        topP: 0.8
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
      ]
    });

    let lastError: Error | null = null;

    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`Trying Gemini model: ${modelName}...`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.googleApiKey
            },
            body: requestBody
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          const statusCode = response.status;
          // 429 = rate limit, 503 = overloaded Ã¢â€ â€™ try next model
          // 401/403 = auth error Ã¢â€ â€™ stop immediately (bad key)
          if (statusCode === 401 || statusCode === 403) {
            throw new Error(`API key error (${statusCode}): ${errorText}. Please check your Gemini API key.`);
          }
          throw new Error(`${modelName}: HTTP ${statusCode} - ${errorText.substring(0, 200)}`);
        }

        const result = await response.json();

        if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error(`${modelName}: No candidates in response`);
        }

        let generatedText = result.candidates[0].content.parts[0].text;
        // Clean up markdown code blocks if present
        generatedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();

        console.log(`Ã¢Å“â€œ Model ${modelName} succeeded. Response length: ${generatedText.length}`);
        console.log('Gemini Raw Response (first 500 chars):', generatedText.substring(0, 500));

        const parsedData = extractJsonArray(generatedText);

        if (!parsedData || !Array.isArray(parsedData)) {
          console.error('AI Response Text (Failed to find JSON array):', generatedText);
          const snippet = generatedText.substring(0, 200).replace(/\n/g, ' ');
          throw new Error(`${modelName}: No JSON array in response. Snippet: "${snippet}"`);
        }

        return parsedData; // SUCCESS Ã¢â‚¬â€ return immediately

      } catch (err: any) {
        // Re-throw auth errors immediately
        if (err?.message?.includes('API key error')) throw err;
        console.warn(`Model ${modelName} threw an error:`, err?.message);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    // All models failed
    throw new Error(
      `All Gemini models failed to generate a timetable. Last error: ${lastError?.message || 'Unknown error'}. ` +
      `Please check your API key or try again in a few minutes.`
    );
  }

  private applyRoomPolicies(
    entries: TimetableEntry[],
    data: GenerationData,
    options?: AdvancedGenerationOptions
  ): TimetableEntry[] {
    const roomPools = splitRoomsByType(data.rooms);
    const subjectMap = new Map(data.subjects.map((subject) => [subject.id, subject]));
    const roomMap = new Map(data.rooms.map((room) => [room.id, room]));
    const labSubjectIds = new Set(options?.labSubjectIds || []);

    const chooseReplacementRoom = (
      currentRoomId: string,
      preferredRooms: Room[],
      fallbackRooms: Room[],
    ) => {
      const currentRoom = roomMap.get(currentRoomId);
      if (currentRoom && preferredRooms.some((room) => room.id === currentRoom.id)) {
        return currentRoomId;
      }

      return preferredRooms[0]?.id || fallbackRooms[0]?.id || currentRoomId;
    };

    return entries.map((entry) => {
      const subject = subjectMap.get(entry.subject_id);
      const room = roomMap.get(entry.room_id);
      const isLabSubject = isLabSubjectLike(subject) || labSubjectIds.has(entry.subject_id);

      if (isLabSubject) {
        return {
          ...entry,
          room_id: chooseReplacementRoom(entry.room_id, roomPools.labRooms, data.rooms),
        };
      }

      if (room && isLabRoomLike(room) && roomPools.classRooms.length > 0) {
        return {
          ...entry,
          room_id: chooseReplacementRoom(entry.room_id, roomPools.classRooms, data.rooms),
        };
      }

      return entry;
    });
  }

  // Post-processing: guarantee minimum 3 classes per day for each section (days 1-6)
  private enforceMinimumDailyClasses(
    entries: TimetableEntry[],
    data: GenerationData,
    selectedSemester: number,
    options?: AdvancedGenerationOptions
  ): TimetableEntry[] {
    const MIN_PER_DAY = 3;
    const days = getDayRange(options?.daysPerWeek);
    const timeSlots = getSlotRange(options?.periodsPerDay);
    const result: TimetableEntry[] = [...entries];

    const staffSlots = new Set(result.map(e => `${e.staff_id}:${e.day_of_week}:${e.time_slot}`));
    const roomSlots = new Set(result.map(e => `${e.room_id}:${e.day_of_week}:${e.time_slot}`));
    const sectionSlots = new Set(result.map(e => `${e.section_id}:${e.day_of_week}:${e.time_slot}`));

    const sections = data.sections.filter(s => s.semester === selectedSemester);

    const subjectsByDept = new Map<string, Subject[]>();
    data.subjects.forEach(sub => {
      if (!subjectsByDept.has(sub.department_id)) subjectsByDept.set(sub.department_id, []);
      subjectsByDept.get(sub.department_id)!.push(sub);
    });

    const subjectStaffMap = new Map<string, Staff[]>();
    data.staffSubjects.forEach(ss => {
      const staff = data.staff.find(st => st.id === ss.staff_id);
      if (staff) {
        if (!subjectStaffMap.has(ss.subject_id)) subjectStaffMap.set(ss.subject_id, []);
        subjectStaffMap.get(ss.subject_id)!.push(staff);
      }
    });

    const roomsByType = {
      lab: data.rooms.filter((room) => isLabRoomLike(room)),
      any: data.rooms.filter((room) => isClassroomLike(room)),
      fallback: data.rooms,
    };

    for (const section of sections) {
      for (const day of days) {
        const dayCount = result.filter(e => e.section_id === section.id && e.day_of_week === day).length;
        if (dayCount >= MIN_PER_DAY) continue;
        let needed = MIN_PER_DAY - dayCount;
        // Only use theory/non-lab subjects as fillers to avoid breaking lab scheduling rules
        const candidateSubjects = (subjectsByDept.get(section.department_id) || [])
          .filter(s => !s.subject_type?.toLowerCase().includes('lab') && !s.subject_type?.toLowerCase().includes('practical'));
        if (candidateSubjects.length === 0) continue;
        let subjectIndex = 0;
        for (const slot of timeSlots) {
          if (needed <= 0) break;
          const sectionKey = `${section.id}:${day}:${slot}`;
          if (sectionSlots.has(sectionKey)) continue;
          const subject = candidateSubjects[subjectIndex % candidateSubjects.length];
          subjectIndex++;
          const staffCandidates = subjectStaffMap.get(subject.id) || data.staff.filter(st => st.department_id === section.department_id);
          const roomPool = isLabSubjectLike(subject)
            ? (roomsByType.lab.length > 0 ? roomsByType.lab : roomsByType.fallback)
            : (roomsByType.any.length > 0 ? roomsByType.any : roomsByType.fallback);
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

  private validateEntries(
    entries: TimetableEntry[],
    selectedSemester: number,
    options?: AdvancedGenerationOptions
  ): TimetableEntry[] {
    console.log(`Validating ${entries.length} entries for conflicts...`);
    const maxDay = Math.max(...getDayRange(options?.daysPerWeek));
    const maxSlot = Math.max(...getSlotRange(options?.periodsPerDay));

    // First, filter basic validation
    const validEntries = entries.filter(entry => {
      return entry.section_id &&
        entry.subject_id &&
        entry.staff_id &&
        entry.room_id &&
        entry.day_of_week >= 1 &&
        entry.day_of_week <= maxDay &&
        entry.time_slot >= 1 &&
        entry.time_slot <= maxSlot &&
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.googleApiKey
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
            topP: 0.8
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

    const { data: existingTimetables } = await supabase
      .from('timetables')
      .select('section_id, subject_id, staff_id, room_id, day_of_week, time_slot, semester');

    const data: GenerationData = {
      departments: departmentsResult.data || [],
      sections: sectionsResult.data || [],
      subjects: subjectsResult.data || [],
      staff: staffResult.data || [],
      rooms: roomsResult.data || [],
      timings: timingsResult.data || [],
      staffSubjects: staffSubjectsResult.data || [],
      fillerSubjects: fillerSubjectsResult.data || [],
      existingTimetables: existingTimetables || []
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

  private async saveTimetable(entries: TimetableEntry[]): Promise<void> {
    console.log(`Attempting to save ${entries.length} simple timetable entries...`);

    if (entries.length === 0) {
      throw new Error('No entries to save');
    }

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
      console.error('Invalid simple timetable entries found:', invalidEntries.slice(0, 3));
      throw new Error(`Found ${invalidEntries.length} invalid timetable entries`);
    }

    const { error } = await supabase
      .from('timetables')
      .upsert(entries, {
        onConflict: 'section_id,day_of_week,time_slot',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error saving simple timetable entries:', error);
      throw new Error(`Failed to save timetable entries: ${error.message}`);
    }

    console.log(`Successfully saved ${entries.length} simple timetable entries`);
  }

    private generateSimpleSchedule(data: GenerationData, selectedSemester: number, options?: SimpleGenerationOptions): TimetableEntry[] {
    const entries: TimetableEntry[] = [];

    // â”â”â” DYNAMIC CONFIG â”â”â”
    const TOTAL_PERIODS = options?.periodsPerDay || 7;
    const TOTAL_DAYS    = options?.daysPerWeek  || 5;

    console.log(`[Generator] ${TOTAL_PERIODS} periods/day Ã— ${TOTAL_DAYS} days = ${TOTAL_PERIODS * TOTAL_DAYS} slots`);

    // â”â”â” ROOM POOLS â”â”â”
    const roomPools = splitRoomsByType(data.rooms);
    const effectiveLabRooms = roomPools.labRooms.length > 0 ? roomPools.labRooms : data.rooms;
    const effectiveClassRooms = roomPools.classRooms.length > 0 ? roomPools.classRooms : data.rooms.filter((room) => !isLabRoomLike(room));
    const fallbackTheoryRooms = effectiveClassRooms.length > 0 ? effectiveClassRooms : data.rooms;

    console.log(`[Generator] Rooms: ${fallbackTheoryRooms.length} classrooms, ${effectiveLabRooms.length} lab rooms`);

    // â”â”â” CONFLICT TRACKERS â”â”â”
    const usedStaff   = new Set<string>();
    const usedRoom    = new Set<string>();
    const usedSection = new Set<string>();
    const staffLoad: Record<string, number> = {};
    data.staff.forEach(s => { staffLoad[s.id] = 0; });

    const selectedSectionIds = new Set(data.sections.map(section => section.id));

    const key = (id: string, day: number, slot: number) => `${id}:${day}:${slot}`;

    for (const existing of data.existingTimetables || []) {
      if (selectedSectionIds.has(existing.section_id)) {
        continue;
      }
      if (existing.staff_id) {
        usedStaff.add(key(existing.staff_id, existing.day_of_week, existing.time_slot));
      }
      if (existing.room_id) {
        usedRoom.add(key(existing.room_id, existing.day_of_week, existing.time_slot));
      }
    }

    const mark = (staffId: string, roomId: string, sectionId: string, day: number, slot: number) => {
      usedStaff.add(key(staffId, day, slot));
      usedRoom.add(key(roomId, day, slot));
      usedSection.add(key(sectionId, day, slot));
      staffLoad[staffId] = (staffLoad[staffId] || 0) + 1;
    };

    const isFree = (staffId: string, roomId: string, sectionId: string, day: number, slot: number) =>
      !usedStaff.has(key(staffId, day, slot)) &&
      !usedRoom.has(key(roomId, day, slot)) &&
      !usedSection.has(key(sectionId, day, slot));

    // â”â”â” LAB DETECTION â”â”â”
    const userLabIds = new Set(options?.labSubjectIds || []);
    const isIntrinsicLab = (s: { id?: string; subject_type?: string; name?: string; code?: string }) =>
      isLabSubjectLike(s);
    const hasUserLabBlock = (subjectId?: string) => !!subjectId && userLabIds.has(subjectId);
    const requiresLabBlock = (s: { id?: string; subject_type?: string; name?: string; code?: string }) =>
      isIntrinsicLab(s) || hasUserLabBlock(s.id);
    const getTheoryHours = (subject: Subject) => {
      if (isIntrinsicLab(subject)) {
        return 0;
      }
      if (hasUserLabBlock(subject.id)) {
        return Math.max((subject.hours_per_week || 0) - 2, 0);
      }
      return Math.max(subject.hours_per_week || 0, 0);
    };

    // â”â”â” STAFF RESOLUTION â”â”â”
    const userStaffMap = options?.staffSubjectMap || {};
    const resolveStaff = (subjectId: string, departmentId: string): typeof data.staff => {
      // Priority 0: Manual assignment from user
      if (userStaffMap[subjectId]) {
        const manual = data.staff.find(s => s.id === userStaffMap[subjectId]);
        if (manual) return [manual];
      }
      // Priority 1: staff_subjects mapping
      const mapped = data.staffSubjects
        .filter(ss => ss.subject_id === subjectId)
        .map(ss => data.staff.find(s => s.id === ss.staff_id))
        .filter(Boolean) as typeof data.staff;
      if (mapped.length > 0) return mapped.sort((a, b) => (staffLoad[a.id] || 0) - (staffLoad[b.id] || 0));
      // Priority 2: Same department staff
      const deptStaff = data.staff.filter(s => s.department_id === departmentId);
      if (deptStaff.length > 0) return deptStaff.sort((a, b) => (staffLoad[a.id] || 0) - (staffLoad[b.id] || 0));
      // Priority 3: Any staff
      return [...data.staff].sort((a, b) => (staffLoad[a.id] || 0) - (staffLoad[b.id] || 0));
    };

    // â”â”â” HELPER: Find free staff+room for a slot â”â”â”
        const findFreeAssignment = (
      subjectId: string, sectionId: string, departmentId: string, day: number, slot: number, useLabRoom: boolean
    ): { staffId: string; roomId: string } | null => {
      const staffPool = resolveStaff(subjectId, departmentId);
      const roomPool = useLabRoom ? effectiveLabRooms : fallbackTheoryRooms;
      // Try to find a free assignment in the preferred room pool
      for (const staff of staffPool) {
        for (const room of roomPool) {
          if (isFree(staff.id, room.id, sectionId, day, slot)) {
            return { staffId: staff.id, roomId: room.id };
          }
        }
      }
      return null;
    };

    // â”â”â” BUILD LAB SLOT PAIRS â”â”â”
    const midpoint = Math.ceil(TOTAL_PERIODS / 2);
    const LAB_SLOT_PAIRS: number[][] = [];
    // Afternoon pairs first
    for (let s = midpoint + 1; s < TOTAL_PERIODS; s++) LAB_SLOT_PAIRS.push([s, s + 1]);
    // Morning pairs
    for (let s = 1; s < midpoint; s++) LAB_SLOT_PAIRS.push([s, s + 1]);
    // Add the midpoint pair
    if (midpoint < TOTAL_PERIODS) LAB_SLOT_PAIRS.push([midpoint, midpoint + 1]);

    console.log(`[Generator] Lab slot pairs:`, LAB_SLOT_PAIRS);

    // â”â”â” PROCESS EACH SECTION â”â”â”
    for (const section of data.sections) {
      const deptId = section.department_id;

      // Get subjects for this section
      let sectionSubjects = data.subjects.filter(s =>
        s.department_id === deptId && s.semester === selectedSemester
      );

      // If advanced mode with specific subjects, use only those that match this dept/semester
      if (options?.subjects && options.subjects.length > 0) {
        const selectedSet = new Set(options.subjects);
        sectionSubjects = data.subjects.filter(s => selectedSet.has(s.id));
      }

      if (sectionSubjects.length === 0) {
        console.warn(`[Generator] Section ${section.name}: no subjects found, skipping`);
        continue;
      }

      // Split into lab and theory subjects
      const labSubjects = sectionSubjects.filter((subject) => requiresLabBlock(subject));
      const theorySubjects = sectionSubjects.filter((subject) => getTheoryHours(subject) > 0);

      console.log(`[Generator] Section ${section.name}: ${theorySubjects.length} theory, ${labSubjects.length} lab subjects`);

      // Track what's placed for this section
      const sectionSchedule: Record<string, string> = {}; // "day:slot" -> subjectId
      const labPlacedSubjects = new Set<string>();
      const labDaysUsed = new Set<number>();
      const theoryDayCount: Record<string, number> = {}; // subjectId -> days placed
      theorySubjects.forEach(s => { theoryDayCount[s.id] = 0; });

      // â•â•â•â•â•â•â•â•â•â•â• PHASE 1: SCHEDULE LABS â•â•â•â•â•â•â•â•â•â•â•
      // Each lab: 2 consecutive periods, 1 per week, max 1 lab per day, lab rooms only
      const shuffledDays = shuffle(Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1));
      let labDayIndex = 0;

      for (const labSubject of labSubjects) {
        if (labPlacedSubjects.has(labSubject.id)) continue;

        let placed = false;
        // Try each day (shuffled to distribute)
        for (let di = 0; di < TOTAL_DAYS && !placed; di++) {
          const day = shuffledDays[(labDayIndex + di) % TOTAL_DAYS];

          // Check: no other lab already on this day for this section
          const hasLabThisDay = labDaysUsed.has(day) || entries.some(e =>
            e.section_id === section.id &&
            e.day_of_week === day &&
            requiresLabBlock(sectionSubjects.find(s => s.id === e.subject_id) || {})
          );
          if (hasLabThisDay) continue;

          // Try each slot pair
          for (const [slot1, slot2] of LAB_SLOT_PAIRS) {
            if (slot1 > TOTAL_PERIODS || slot2 > TOTAL_PERIODS) continue;

            // Check section is free for both slots
            if (usedSection.has(key(section.id, day, slot1)) ||
                usedSection.has(key(section.id, day, slot2))) continue;

            const assignment = findFreeAssignment(labSubject.id, section.id, deptId, day, slot1, true);
            if (!assignment) continue;

            // Must also be free for slot2 with same staff+room
            if (!isFree(assignment.staffId, assignment.roomId, section.id, day, slot2)) continue;

            // Place both slots
            for (const slot of [slot1, slot2]) {
              mark(assignment.staffId, assignment.roomId, section.id, day, slot);
              sectionSchedule[`${day}:${slot}`] = labSubject.id;
              entries.push({
                section_id: section.id,
                subject_id: labSubject.id,
                staff_id: assignment.staffId,
                room_id: assignment.roomId,
                day_of_week: day,
                time_slot: slot,
                semester: selectedSemester,
              });
            }

            labPlacedSubjects.add(labSubject.id);
            labDaysUsed.add(day);
            placed = true;
            console.log(`[Generator] Lab "${labSubject.name}" â†’ Section ${section.name}, Day ${day}, Slots ${slot1}-${slot2}`);
            break;
          }
        }
        labDayIndex++;

        if (!placed) {
          console.warn(`[Generator] Could not place lab "${labSubject.name}" for section ${section.name}`);
        }
      }

      // â•â•â•â•â•â•â•â•â•â•â• PHASE 2: SCHEDULE THEORY â•â•â•â•â•â•â•â•â•â•â•
      // Goal: spread each theory subject across different days, max 1 per day per subject
      // Fill morning slots first, then afternoon
      const theorySlotOrder: number[] = [];
      for (let s = 1; s <= TOTAL_PERIODS; s++) theorySlotOrder.push(s);

      // Sort theory subjects by hours_per_week (descending) â€” heavy subjects first
      const sortedTheory = [...theorySubjects].sort((a, b) => getTheoryHours(b) - getTheoryHours(a));

      for (const subject of sortedTheory) {
        const requiredTheoryHours = getTheoryHours(subject);
        if (requiredTheoryHours <= 0) {
          continue;
        }

        // Place one theory period per day first, then allow a second repeat on heavier subjects.
        const targetDays = Math.max(1, Math.min(TOTAL_DAYS, requiredTheoryHours));
        let placedCount = 0;

        for (let day = 1; day <= TOTAL_DAYS && placedCount < targetDays; day++) {
          // Skip if subject already placed on this day
          const alreadyOnDay = entries.some(e =>
            e.section_id === section.id && e.day_of_week === day && e.subject_id === subject.id
          );
          if (alreadyOnDay) continue;

          // Find an empty slot this day
          for (const slot of theorySlotOrder) {
            if (sectionSchedule[`${day}:${slot}`]) continue; // slot taken

            const assignment = findFreeAssignment(subject.id, section.id, deptId, day, slot, false);
            if (!assignment) continue;

            mark(assignment.staffId, assignment.roomId, section.id, day, slot);
            sectionSchedule[`${day}:${slot}`] = subject.id;
            entries.push({
              section_id: section.id,
              subject_id: subject.id,
              staff_id: assignment.staffId,
              room_id: assignment.roomId,
              day_of_week: day,
              time_slot: slot,
              semester: selectedSemester,
            });

            placedCount++;
            theoryDayCount[subject.id] = (theoryDayCount[subject.id] || 0) + 1;
            break;
          }
        }

        if (placedCount < requiredTheoryHours) {
          for (let pass = 0; pass < 2 && placedCount < requiredTheoryHours; pass++) {
            for (let day = 1; day <= TOTAL_DAYS && placedCount < requiredTheoryHours; day++) {
              const countOnDay = entries.filter(e =>
                e.section_id === section.id && e.day_of_week === day && e.subject_id === subject.id
              ).length;
              if (countOnDay > pass) continue;

              for (const slot of theorySlotOrder) {
                if (sectionSchedule[`${day}:${slot}`]) continue;

                const assignment = findFreeAssignment(subject.id, section.id, deptId, day, slot, false);
                if (!assignment) continue;

                mark(assignment.staffId, assignment.roomId, section.id, day, slot);
                sectionSchedule[`${day}:${slot}`] = subject.id;
                entries.push({
                  section_id: section.id,
                  subject_id: subject.id,
                  staff_id: assignment.staffId,
                  room_id: assignment.roomId,
                  day_of_week: day,
                  time_slot: slot,
                  semester: selectedSemester,
                });
                placedCount++;
                theoryDayCount[subject.id] = (theoryDayCount[subject.id] || 0) + 1;
                break;
              }
            }
          }
        }

        console.log(`[Generator] Theory "${subject.name}" -> placed ${placedCount}/${requiredTheoryHours} periods`);
      }

      // â•â•â•â•â•â•â•â•â•â•â• PHASE 3: RESERVE WEEKLY LIBRARY SLOTS â•â•â•â•â•â•â•â•â•â•â•
      // Every section should get 2 weekly library hours, ideally as two separate periods.
      const librarySubject =
        data.fillerSubjects?.find(s => s.name?.toLowerCase().includes('library')) ||
        data.subjects.find(s => s.name?.toLowerCase().includes('library'));

      const libraryDays = shuffle(Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1));
      let libraryPeriodsPlaced = 0;

      if (librarySubject) {
        for (const day of libraryDays) {
          if (libraryPeriodsPlaced >= 2) break;

          for (let slot = 1; slot <= TOTAL_PERIODS; slot++) {
            if (libraryPeriodsPlaced >= 2) break;
            if (sectionSchedule[`${day}:${slot}`]) continue;

            const assignment = findFreeAssignment(librarySubject.id, section.id, deptId, day, slot, false);
            if (!assignment) continue;

            mark(assignment.staffId, assignment.roomId, section.id, day, slot);
            sectionSchedule[`${day}:${slot}`] = librarySubject.id;
            entries.push({
              section_id: section.id,
              subject_id: librarySubject.id,
              staff_id: assignment.staffId,
              room_id: assignment.roomId,
              day_of_week: day,
              time_slot: slot,
              semester: selectedSemester,
            });
            libraryPeriodsPlaced++;
          }
        }

        console.log(`[Generator] Section ${section.name}: library periods placed ${libraryPeriodsPlaced}/2`);
      } else {
        console.warn(`[Generator] No library subject found for section ${section.name}`);
      }

      // â•â•â•â•â•â•â•â•â•â•â• PHASE 4: FILL REMAINING SLOTS â•â•â•â•â•â•â•â•â•â•â•
      // Remaining empty slots: cycle through theory subjects (round-robin)
      for (let day = 1; day <= TOTAL_DAYS; day++) {
        for (let slot = 1; slot <= TOTAL_PERIODS; slot++) {
          if (sectionSchedule[`${day}:${slot}`]) continue; // already filled

          let filled = false;

          const sortedForFill = [...theorySubjects].sort((a, b) =>
            (theoryDayCount[a.id] || 0) - (theoryDayCount[b.id] || 0)
          );

          for (const subject of sortedForFill) {
            const countOnDay = entries.filter(e =>
              e.section_id === section.id && e.day_of_week === day && e.subject_id === subject.id
            ).length;
            if (countOnDay >= 2) continue;

            const assignment = findFreeAssignment(subject.id, section.id, deptId, day, slot, false);
            if (!assignment) continue;

            mark(assignment.staffId, assignment.roomId, section.id, day, slot);
            sectionSchedule[`${day}:${slot}`] = subject.id;
            entries.push({
              section_id: section.id,
              subject_id: subject.id,
              staff_id: assignment.staffId,
              room_id: assignment.roomId,
              day_of_week: day,
              time_slot: slot,
              semester: selectedSemester,
            });
            theoryDayCount[subject.id] = (theoryDayCount[subject.id] || 0) + 1;
            filled = true;
            break;
          }

          if (!filled) {
            continue;
          }
        }
      }

      // Log section summary
      const sectionEntries = entries.filter(e => e.section_id === section.id);
      const uniqueSubjects = new Set(sectionEntries.map(e => e.subject_id));
      console.log(`[Generator] Section ${section.name}: ${sectionEntries.length} entries, ${uniqueSubjects.size} unique subjects, ${labPlacedSubjects.size} labs placed`);
    }

    console.log(`[Generator] Total entries: ${entries.length} for ${data.sections.length} sections`);
    return entries;
  }


}
