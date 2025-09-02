import { supabase } from "@/integrations/supabase/client";

export class DatabaseDiagnostic {
  
  static async runFullDiagnostic(): Promise<{
    success: boolean;
    report: string;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let report = "🔍 Database Diagnostic Report\n";
    report += "=" .repeat(50) + "\n\n";

    try {
      // Check table structure and data
      const tables = ['departments', 'sections', 'subjects', 'staff', 'rooms', 'staff_subjects', 'college_timings', 'timetables'];
      
      for (const tableName of tables) {
        report += `📊 Table: ${tableName}\n`;
        
        try {
          const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact' })
            .limit(1);

          if (error) {
            issues.push(`❌ ${tableName}: ${error.message}`);
            report += `   Status: ERROR - ${error.message}\n`;
          } else {
            report += `   Status: ✅ Connected\n`;
            report += `   Records: ${count || 0}\n`;
            
            if (count === 0) {
              issues.push(`⚠️ ${tableName} is empty`);
              recommendations.push(`Add sample data to ${tableName} table`);
            }
            
            if (data && data.length > 0) {
              const sampleKeys = Object.keys(data[0]);
              report += `   Columns: ${sampleKeys.join(', ')}\n`;
            }
          }
        } catch (tableError) {
          issues.push(`❌ ${tableName}: Access denied or table doesn't exist`);
          report += `   Status: ERROR - Access denied or missing\n`;
        }
        
        report += "\n";
      }

      // Check relationships
      report += "🔗 Relationship Checks\n";
      report += "-".repeat(30) + "\n";

      // Check departments have sections
      const { data: depts } = await supabase.from('departments').select('id, name');
      if (depts && depts.length > 0) {
        for (const dept of depts.slice(0, 3)) { // Check first 3 departments
          const { data: sections } = await supabase
            .from('sections')
            .select('id')
            .eq('department_id', dept.id);
          
          report += `Department "${dept.name}": ${sections?.length || 0} sections\n`;
          
          if (!sections || sections.length === 0) {
            issues.push(`⚠️ Department "${dept.name}" has no sections`);
            recommendations.push(`Add sections for department "${dept.name}"`);
          }
        }
      }

      // Check staff-subject relationships
      const { data: staffSubjects } = await supabase
        .from('staff_subjects')
        .select('staff_id, subject_id');
      
      report += `\nStaff-Subject mappings: ${staffSubjects?.length || 0}\n`;
      
      if (!staffSubjects || staffSubjects.length === 0) {
        issues.push('⚠️ No staff-subject relationships defined');
        recommendations.push('Add staff-subject mappings in staff_subjects table');
      }

      // Check for essential data
      report += "\n📋 Data Validation\n";
      report += "-".repeat(30) + "\n";

      const essentialChecks = [
        { table: 'departments', min: 1, message: 'At least one department needed' },
        { table: 'staff', min: 1, message: 'At least one staff member needed' },
        { table: 'rooms', min: 1, message: 'At least one room needed' },
        { table: 'sections', min: 1, message: 'At least one section needed' },
        { table: 'subjects', min: 1, message: 'At least one subject needed' }
      ];

      for (const check of essentialChecks) {
        const { count } = await supabase
          .from(check.table)
          .select('*', { count: 'exact' })
          .limit(0);
        
        const actualCount = count || 0;
        const status = actualCount >= check.min ? '✅' : '❌';
        report += `${status} ${check.table}: ${actualCount} records (need ${check.min}+)\n`;
        
        if (actualCount < check.min) {
          issues.push(`❌ ${check.message}`);
          recommendations.push(`Add more data to ${check.table} table`);
        }
      }

      // Final summary
      report += "\n" + "=".repeat(50) + "\n";
      report += `Total Issues: ${issues.length}\n`;
      report += `Total Recommendations: ${recommendations.length}\n`;
      
      if (issues.length === 0) {
        report += "🎉 No critical issues found!\n";
      } else {
        report += "\n🚨 Issues Found:\n";
        issues.forEach((issue, i) => {
          report += `${i + 1}. ${issue}\n`;
        });
      }
      
      if (recommendations.length > 0) {
        report += "\n💡 Recommendations:\n";
        recommendations.forEach((rec, i) => {
          report += `${i + 1}. ${rec}\n`;
        });
      }

      return {
        success: true,
        report,
        issues,
        recommendations
      };

    } catch (error) {
      return {
        success: false,
        report: `Diagnostic failed: ${error.message}`,
        issues: [`Critical error: ${error.message}`],
        recommendations: ['Check database connection and permissions']
      };
    }
  }

  static async quickHealthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('departments').select('id').limit(1);
      return !error && Array.isArray(data);
    } catch {
      return false;
    }
  }
}

export default DatabaseDiagnostic;
