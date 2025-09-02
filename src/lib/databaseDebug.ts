import { supabase } from "@/integrations/supabase/client";

interface TimetableEntry {
  id: string;
  section_id: string;
  subject_id: string;
  staff_id: string;
  room_id: string;
  day_of_week: number;
  time_slot: number;
  semester: number;
}

interface DiagnosticData {
  existingTimetables?: TimetableEntry[];
  conflictSummary?: {
    staffConflicts: number;
    roomConflicts: number;
    sectionConflicts: number;
  };
  dataIntegrity?: Record<string, number>;
  integrity?: Record<string, number>;
}

/**
 * Database debugging utility to help diagnose timetable generation issues
 */
export class DatabaseDebug {
  static async checkTimetableConstraints(): Promise<{
    success: boolean;
    issues: string[];
    recommendations: string[];
    data: DiagnosticData;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const data: DiagnosticData = {};

    try {
      console.log('🔍 Starting database constraint check...');

      // 1. Check existing timetable entries for conflicts
      const { data: existingTimetables, error: timetableError } = await supabase
        .from('timetables')
        .select('*')
        .order('section_id, day_of_week, time_slot');

      if (timetableError) {
        issues.push(`Failed to fetch existing timetables: ${timetableError.message}`);
        return { success: false, issues, recommendations, data };
      }

      data.existingTimetables = existingTimetables;
      console.log(`📊 Found ${existingTimetables?.length || 0} existing timetable entries`);

      // 2. Check for constraint violations in existing data
      const staffConflicts = new Map<string, TimetableEntry[]>();
      const roomConflicts = new Map<string, TimetableEntry[]>();
      const sectionConflicts = new Map<string, TimetableEntry[]>();

      existingTimetables?.forEach(entry => {
        const staffKey = `${entry.staff_id}:${entry.day_of_week}:${entry.time_slot}`;
        const roomKey = `${entry.room_id}:${entry.day_of_week}:${entry.time_slot}`;
        const sectionKey = `${entry.section_id}:${entry.day_of_week}:${entry.time_slot}`;

        if (!staffConflicts.has(staffKey)) staffConflicts.set(staffKey, []);
        if (!roomConflicts.has(roomKey)) roomConflicts.set(roomKey, []);
        if (!sectionConflicts.has(sectionKey)) sectionConflicts.set(sectionKey, []);

        staffConflicts.get(staffKey)!.push(entry);
        roomConflicts.get(roomKey)!.push(entry);
        sectionConflicts.get(sectionKey)!.push(entry);
      });

      // Check for actual conflicts
      let staffConflictCount = 0;
      let roomConflictCount = 0;
      let sectionConflictCount = 0;

      staffConflicts.forEach((entries, key) => {
        if (entries.length > 1) {
          staffConflictCount++;
          issues.push(`Staff conflict at ${key}: ${entries.length} entries`);
        }
      });

      roomConflicts.forEach((entries, key) => {
        if (entries.length > 1) {
          roomConflictCount++;
          issues.push(`Room conflict at ${key}: ${entries.length} entries`);
        }
      });

      sectionConflicts.forEach((entries, key) => {
        if (entries.length > 1) {
          sectionConflictCount++;
          issues.push(`Section conflict at ${key}: ${entries.length} entries`);
        }
      });

      data.conflictSummary = {
        staffConflicts: staffConflictCount,
        roomConflicts: roomConflictCount,
        sectionConflicts: sectionConflictCount
      };

      // 3. Check data integrity
      const dataChecks = await this.checkDataIntegrity();
      data.dataIntegrity = dataChecks.counts;
      
      if (!dataChecks.success) {
        issues.push(...dataChecks.issues);
        recommendations.push(...dataChecks.recommendations);
      }

      // 4. Generate recommendations
      if (staffConflictCount > 0) {
        recommendations.push(`Clear existing timetables before generating new ones to resolve ${staffConflictCount} staff conflicts`);
      }
      
      if (roomConflictCount > 0) {
        recommendations.push(`Clear existing timetables before generating new ones to resolve ${roomConflictCount} room conflicts`);
      }
      
      if (sectionConflictCount > 0) {
        recommendations.push(`Clear existing timetables before generating new ones to resolve ${sectionConflictCount} section conflicts`);
      }

      if (issues.length === 0) {
        console.log('✅ No database constraint issues found');
        return { success: true, issues, recommendations, data };
      } else {
        console.log(`❌ Found ${issues.length} database issues`);
        return { success: false, issues, recommendations, data };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      issues.push(`Database check failed: ${errorMessage}`);
      return { success: false, issues, recommendations, data };
    }
  }

  static async checkDataIntegrity(): Promise<{
    success: boolean;
    issues: string[];
    recommendations: string[];
    counts: Record<string, number>;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const counts: Record<string, number> = {};

    try {
      // Check all required tables have data
      const [deptResult, sectionsResult, subjectsResult, staffResult, roomsResult, timingsResult] = await Promise.all([
        supabase.from('departments').select('id, name').limit(1),
        supabase.from('sections').select('id, name, department_id, semester').limit(1),
        supabase.from('subjects').select('id, name, department_id, semester').limit(1),
        supabase.from('staff').select('id, name, department_id').limit(1),
        supabase.from('rooms').select('id, room_number, room_type').limit(1),
        supabase.from('college_timings').select('id, day_of_week').limit(1)
      ]);

      const results = {
        departments: deptResult,
        sections: sectionsResult,
        subjects: subjectsResult,
        staff: staffResult,
        rooms: roomsResult,
        timings: timingsResult
      };

      // Check for errors and empty tables
      Object.entries(results).forEach(([tableName, result]) => {
        if (result.error) {
          issues.push(`Error accessing ${tableName}: ${result.error.message}`);
        } else if (!result.data || result.data.length === 0) {
          issues.push(`No data found in ${tableName} table`);
          recommendations.push(`Add data to ${tableName} table before generating timetables`);
        }
        counts[tableName] = result.data?.length || 0;
      });

      // Check staff-subjects relationship
      const { data: staffSubjects, error: ssError } = await supabase
        .from('staff_subjects')
        .select('staff_id, subject_id')
        .limit(1);

      if (ssError) {
        issues.push(`Error accessing staff_subjects: ${ssError.message}`);
      } else if (!staffSubjects || staffSubjects.length === 0) {
        issues.push('No staff-subject relationships found');
        recommendations.push('Assign subjects to staff members in the staff management page');
      }
      counts.staffSubjects = staffSubjects?.length || 0;

      return {
        success: issues.length === 0,
        issues,
        recommendations,
        counts
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      issues.push(`Data integrity check failed: ${errorMessage}`);
      return { success: false, issues, recommendations, counts };
    }
  }

  static async clearAllTimetables(): Promise<{ success: boolean; message: string; cleared: number }> {
    try {
      console.log('🧹 Clearing all timetable entries...');
      
      // First get count
      const { data: existingEntries, error: countError } = await supabase
        .from('timetables')
        .select('id');
        
      if (countError) {
        throw new Error(`Failed to count existing entries: ${countError.message}`);
      }
      
      const count = existingEntries?.length || 0;
      console.log(`Found ${count} existing timetable entries`);
      
      if (count === 0) {
        return { success: true, message: 'No timetable entries to clear', cleared: 0 };
      }
      
      // Clear all entries
      const { error: deleteError } = await supabase
        .from('timetables')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all entries
        
      if (deleteError) {
        throw new Error(`Failed to clear timetables: ${deleteError.message}`);
      }
      
      console.log(`✅ Successfully cleared ${count} timetable entries`);
      return { success: true, message: `Successfully cleared ${count} timetable entries`, cleared: count };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to clear timetables:', error);
      return { success: false, message: `Failed to clear timetables: ${errorMessage}`, cleared: 0 };
    }
  }

  static async runFullDiagnostic(): Promise<{
    success: boolean;
    report: string;
    issues: string[];
    recommendations: string[];
    data: DiagnosticData;
  }> {
    console.log('🔍 Running full database diagnostic...');
    
    const constraints = await this.checkTimetableConstraints();
    const integrity = await this.checkDataIntegrity();
    
    const allIssues = [...constraints.issues, ...integrity.issues];
    const allRecommendations = [...constraints.recommendations, ...integrity.recommendations];
    
    const report = `
DATABASE DIAGNOSTIC REPORT
=========================

Data Integrity:
- Departments: ${integrity.counts.departments || 0} records
- Sections: ${integrity.counts.sections || 0} records  
- Subjects: ${integrity.counts.subjects || 0} records
- Staff: ${integrity.counts.staff || 0} records
- Rooms: ${integrity.counts.rooms || 0} records
- College Timings: ${integrity.counts.timings || 0} records
- Staff-Subject Relationships: ${integrity.counts.staffSubjects || 0} records

Existing Timetables: ${constraints.data.existingTimetables?.length || 0} entries

Constraint Conflicts:
- Staff conflicts: ${constraints.data.conflictSummary?.staffConflicts || 0}
- Room conflicts: ${constraints.data.conflictSummary?.roomConflicts || 0}
- Section conflicts: ${constraints.data.conflictSummary?.sectionConflicts || 0}

Issues Found: ${allIssues.length}
${allIssues.map(issue => `- ${issue}`).join('\n')}

Recommendations: ${allRecommendations.length}
${allRecommendations.map(rec => `- ${rec}`).join('\n')}
`;

    return {
      success: allIssues.length === 0,
      report: report.trim(),
      issues: allIssues,
      recommendations: allRecommendations,
      data: { ...constraints.data, integrity: integrity.counts }
    };
  }
}

export default DatabaseDebug;
