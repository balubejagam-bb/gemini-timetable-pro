import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Sparkles, Users, Calendar, Clock, X, Eye, Download, Trash2 } from 'lucide-react';
import { ViewToggle } from '@/components/ui/view-toggle';
import { useNavigate } from 'react-router-dom';
import { StudentTimetableGenerator } from '@/lib/timetableGenerator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TimetableTemplate } from '@/components/TimetableTemplate';

interface Student {
  id: string;
  name: string;
  roll_no: string;
  email?: string;
  semester: number;
  department_id?: string;
  departments?: {
    name: string;
    code: string;
  };
}

interface PersonalizedTimetable {
  id: string;
  student_id: string;
  timetable_json: any;
  generated_at: string;
  model_version?: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [personalizedTimetables, setPersonalizedTimetables] = useState<PersonalizedTimetable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
    fetchPersonalizedTimetables();
    fetchDepartments();
    fetchSections();
    fetchSubjects();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from('departments').select('*');
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase.from('sections').select('*');
      if (error) throw error;
      setAllSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw error;
      setAllSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('students')
        .select(`
          *,
          departments(name, code)
        `)
        .order('name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalizedTimetables = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('personalized_timetables')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setPersonalizedTimetables(data || []);
    } catch (error) {
      console.error('Error fetching personalized timetables:', error);
    }
  };

  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [selectedStudentForGeneration, setSelectedStudentForGeneration] = useState<Student | null>(null);
  const [departments, setDepartments] = useState<{id: string; name: string; code: string}[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedSemesterForGen, setSelectedSemesterForGen] = useState("1");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [allSections, setAllSections] = useState<{id: string; name: string; department_id: string; semester: number}[]>([]);
  const [allSubjects, setAllSubjects] = useState<{id: string; name: string; code: string; department_id: string; semester: number}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewTimetableDialog, setViewTimetableDialog] = useState(false);
  const [selectedTimetableForView, setSelectedTimetableForView] = useState<PersonalizedTimetable | null>(null);
  const [exporting, setExporting] = useState(false);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeSlots = [
    "9:00-10:00",
    "10:00-11:00",
    "11:15-12:15",
    "12:15-13:15",
    "14:00-15:00",
    "15:00-16:00"
  ];

  const getDefaultFreePeriod = (semester: number, dayIndex: number, timeSlotIndex: number) => {
    // Alternate between Library and Internship based on semester and position
    if (semester >= 5) {
      // Higher semesters get more internship periods
      return (dayIndex + timeSlotIndex) % 2 === 0 ? 'Internship' : 'Library Period';
    } else {
      // Lower semesters get more library periods
      return (dayIndex + timeSlotIndex) % 3 === 0 ? 'Internship' : 'Library Period';
    }
  };

  const generatePersonalizedTimetable = async (student: Student) => {
    setSelectedStudentForGeneration(student);
    setSelectedSemesterForGen(student.semester.toString());
    if (student.department_id) {
      setSelectedDepartments([student.department_id]);
    }
    setShowGenerationDialog(true);
  };

  const handleGeneration = async () => {
    if (!selectedStudentForGeneration) return;

    try {
      setIsGenerating(true);
      toast.loading('Generating personalized timetable with AI...');

      // Use the StudentTimetableGenerator class
      const generator = new StudentTimetableGenerator();
      
      const result = await generator.generateStudentTimetable(
        selectedStudentForGeneration.id,
        parseInt(selectedSemesterForGen),
        selectedDepartments.length > 0 ? selectedDepartments : undefined,
        selectedSections.length > 0 ? selectedSections : undefined,
        selectedSubjects.length > 0 ? selectedSubjects : undefined
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate timetable');
      }

      // Save generated timetable to Supabase
      const { error } = await (supabase as any).from('personalized_timetables').insert({
        student_id: selectedStudentForGeneration.id,
        timetable_json: result.timetable,
        generated_at: new Date().toISOString(),
        model_version: result.model_version || 'gemini-2.0-flash'
      });
      
      if (error) throw error;

      toast.dismiss();
      toast.success('Personalized timetable generated successfully!');
      fetchPersonalizedTimetables();
      setShowGenerationDialog(false);
      setSelectedDepartments([]);
      setSelectedSections([]);
      setSelectedSubjects([]);
    } catch (error: any) {
      console.error('Error generating personalized timetable:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to generate personalized timetable');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const hasPersonalizedTimetable = (studentId: string) => {
    return personalizedTimetables.some(tt => tt.student_id === studentId);
  };

  const getLatestTimetable = (studentId: string) => {
    return personalizedTimetables.find(tt => tt.student_id === studentId);
  };

  const handleViewTimetable = (student: Student) => {
    const timetable = getLatestTimetable(student.id);
    if (timetable) {
      setSelectedTimetableForView(timetable);
      setViewTimetableDialog(true);
    } else {
      toast.error('No timetable found for this student');
    }
  };

  const handleDeleteTimetable = async (studentId: string) => {
    if (!window.confirm('Are you sure you want to delete this timetable?')) return;
    
    try {
      const timetable = getLatestTimetable(studentId);
      if (!timetable) return;

      await (supabase as any).from('personalized_timetables').delete().eq('id', timetable.id);
      toast.success('Timetable deleted successfully');
      fetchPersonalizedTimetables();
    } catch (error) {
      console.error('Error deleting timetable:', error);
      toast.error('Failed to delete timetable');
    }
  };

  const handleDownloadTimetable = async (student: Student) => {
    const timetable = getLatestTimetable(student.id);
    if (!timetable) {
      toast.error('No timetable found for this student');
      return;
    }

    try {
      setExporting(true);

      // Convert timetable JSON to format for university template
      const schedule: any = {};
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      
      days.forEach(day => {
        schedule[day] = {};
      });

      // Track rooms used in student's timetable
      const roomSet = new Set<string>();

      if (timetable.timetable_json && timetable.timetable_json.schedule) {
        Object.entries(timetable.timetable_json.schedule).forEach(([day, slots]: [string, any]) => {
          Object.entries(slots).forEach(([timeSlot, slotData]: [string, any]) => {
            if (slotData && slotData.subject) {
              const room = slotData.room || 'TBD';
              if (room !== 'TBD') roomSet.add(room);
              
              schedule[day][timeSlot] = {
                subject: slotData.subject,
                code: slotData.code || slotData.subject.substring(0, 3),
                staff: slotData.staff || 'TBD',
                room: room,
                type: slotData.subject.toLowerCase().includes('lab') ? 'LAB' : 'Theory'
              };
            }
          });
        });
      }

      // Determine primary room (if student has assigned rooms)
      const primaryRoom = roomSet.size === 1 
        ? Array.from(roomSet)[0] 
        : roomSet.size > 1 
          ? "Multiple" 
          : "As per Schedule";

      // Extract subjects for legend
      const subjectMap = new Map();
      Object.values(schedule).forEach((daySchedule: any) => {
        Object.values(daySchedule).forEach((slot: any) => {
          if (slot && slot.code) {
            subjectMap.set(slot.code, {
              code: slot.code,
              name: slot.subject,
              faculty: slot.staff
            });
          }
        });
      });
      const subjects = Array.from(subjectMap.values());

      // Format dates for student timetable
      const generatedDate = new Date(timetable.generated_at);
      const formattedDate = generatedDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const currentYear = generatedDate.getFullYear();
      const nextYear = currentYear + 1;

      // Create temporary container
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '210mm';
      document.body.appendChild(tempDiv);

      // Render template
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempDiv);
      
      await new Promise<void>((resolve) => {
        root.render(
          <TimetableTemplate
            title="SCHOOL OF COMPUTING"
            subtitle="INDIVIDUAL STUDENT TIMETABLE"
            department={`Student: ${student.name}`}
            semester={`Semester ${student.semester} (${currentYear}-${nextYear.toString().slice(-2)})`}
            section={`Roll No: ${student.roll_no}`}
            roomNo={primaryRoom}
            effectiveDate={formattedDate}
            schedule={schedule}
            subjects={subjects}
            pageNumber={1}
          />
        );
        setTimeout(resolve, 500);
      });

      // Capture and convert to PDF
      const canvas = await html2canvas(tempDiv.firstChild as HTMLElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: 794,
        height: 1123
      });

      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`${student.name.replace(/\s+/g, '_')}-${student.roll_no}-timetable.pdf`);

      // Cleanup
      root.unmount();
      document.body.removeChild(tempDiv);
      
      toast.success('Timetable downloaded successfully');
    } catch (error) {
      console.error('PDF export error', error);
      toast.error('Failed to download timetable');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Students & Individual Timetables
            </h1>
            <p className="text-muted-foreground">Generate personalized AI-powered timetables for individual students</p>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-auto sm:min-w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name, roll number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-blue-600">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Generated Timetables</p>
                  <p className="text-2xl font-bold text-green-600">{personalizedTimetables.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Search className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Search Results</p>
                  <p className="text-2xl font-bold text-purple-600">{filteredStudents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students List/Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => {
              const hasTimetable = hasPersonalizedTimetable(student.id);
              const latestTimetable = getLatestTimetable(student.id);
              
              return (
                <Card key={student.id} className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{student.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{student.roll_no}</p>
                      </div>
                      <Badge variant="secondary">Sem {student.semester}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {student.email && (
                        <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                      )}
                      <p className="text-sm font-medium text-primary">
                        {student.departments?.name || 'No Department'}
                      </p>
                      
                      {hasTimetable && latestTimetable && (
                        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Timetable Generated</span>
                          </div>
                          <p className="text-xs text-green-600">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(latestTimetable.generated_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => generatePersonalizedTimetable(student)}
                          disabled={loading}
                          className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                          size="sm"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          {hasTimetable ? 'Regenerate' : 'Generate'}
                        </Button>
                      </div>
                      
                      {hasTimetable && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleViewTimetable(student)}
                            variant="outline"
                            className="flex-1"
                            size="sm"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={() => handleDownloadTimetable(student)}
                            disabled={exporting}
                            variant="outline"
                            className="flex-1"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {exporting ? 'Exporting...' : 'Download'}
                          </Button>
                          <Button
                            onClick={() => handleDeleteTimetable(student.id)}
                            variant="destructive"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Roll No</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Semester</th>
                      <th className="text-left p-4 font-medium">Department</th>
                      <th className="text-left p-4 font-medium">Timetable Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const hasTimetable = hasPersonalizedTimetable(student.id);
                      const latestTimetable = getLatestTimetable(student.id);
                      
                      return (
                        <tr key={student.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-4 font-medium">{student.name}</td>
                          <td className="p-4 text-muted-foreground">{student.roll_no}</td>
                          <td className="p-4 text-muted-foreground">{student.email || '-'}</td>
                          <td className="p-4">
                            <Badge variant="secondary">Sem {student.semester}</Badge>
                          </td>
                          <td className="p-4 text-primary">
                            {student.departments?.name || 'No Department'}
                          </td>
                          <td className="p-4">
                            {hasTimetable ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                                Generated {latestTimetable && new Date(latestTimetable.generated_at).toLocaleDateString()}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                                Not Generated
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => generatePersonalizedTimetable(student)}
                                disabled={loading}
                                size="sm"
                                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                              >
                                <Sparkles className="w-4 h-4 mr-1" />
                                {hasTimetable ? 'Regenerate' : 'Generate'}
                              </Button>
                              {hasTimetable && (
                                <>
                                  <Button
                                    onClick={() => handleViewTimetable(student)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    onClick={() => handleDownloadTimetable(student)}
                                    disabled={exporting}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    PDF
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteTimetable(student.id)}
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredStudents.length === 0 && (
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'No students available for timetable generation'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Generation Dialog */}
        {showGenerationDialog && selectedStudentForGeneration && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Generate Timetable for {selectedStudentForGeneration.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Configure AI generation options</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGenerationDialog(false)}
                    disabled={isGenerating}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Semester Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Semester</label>
                  <select 
                    value={selectedSemesterForGen} 
                    onChange={(e) => setSelectedSemesterForGen(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    disabled={isGenerating}
                  >
                    {[1,2,3,4,5,6,7,8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Departments ({selectedDepartments.length} selected) - Optional
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {departments.map(dept => (
                      <label key={dept.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                        <input 
                          type="checkbox" 
                          checked={selectedDepartments.includes(dept.id)}
                          disabled={isGenerating}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments([...selectedDepartments, dept.id]);
                            } else {
                              setSelectedDepartments(selectedDepartments.filter(id => id !== dept.id));
                            }
                          }}
                        />
                        <span className="text-sm">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use student's department</p>
                </div>

                {/* Section Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Sections (Optional - {selectedSections.length} selected)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {allSections
                      .filter(sec => sec.semester.toString() === selectedSemesterForGen && 
                        (selectedDepartments.length === 0 || selectedDepartments.includes(sec.department_id)))
                      .map(section => (
                      <label key={section.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                        <input 
                          type="checkbox" 
                          checked={selectedSections.includes(section.id)}
                          disabled={isGenerating}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSections([...selectedSections, section.id]);
                            } else {
                              setSelectedSections(selectedSections.filter(id => id !== section.id));
                            }
                          }}
                        />
                        <span className="text-xs">{section.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Optional: Select specific sections</p>
                </div>

                {/* Subject Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Subjects (Optional - {selectedSubjects.length} selected)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {allSubjects
                      .filter(subj => subj.semester.toString() === selectedSemesterForGen && 
                        (selectedDepartments.length === 0 || selectedDepartments.includes(subj.department_id)))
                      .map(subject => (
                      <label key={subject.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                        <input 
                          type="checkbox" 
                          checked={selectedSubjects.includes(subject.id)}
                          disabled={isGenerating}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubjects([...selectedSubjects, subject.id]);
                            } else {
                              setSelectedSubjects(selectedSubjects.filter(id => id !== subject.id));
                            }
                          }}
                        />
                        <span className="text-xs">{subject.name} ({subject.code})</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Optional: Select specific subjects</p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">AI-Powered Generation</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Using Gemini 2.0 Flash to create an optimized, conflict-free personalized timetable
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="flex gap-2 p-6 pt-0">
                <Button 
                  onClick={handleGeneration} 
                  disabled={isGenerating}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Timetable'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowGenerationDialog(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* View Timetable Dialog */}
        {viewTimetableDialog && selectedTimetableForView && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Student Timetable</CardTitle>
                    <CardDescription>
                      Generated on {new Date(selectedTimetableForView.generated_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const student = students.find(s => s.id === selectedTimetableForView.student_id);
                        if (student) handleDownloadTimetable(student);
                      }}
                      disabled={exporting}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {exporting ? 'Exporting...' : 'Download PDF'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewTimetableDialog(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div id={`timetable-${selectedTimetableForView.student_id}`}>
                  {selectedTimetableForView.timetable_json && selectedTimetableForView.timetable_json.schedule ? (
                    <div className="overflow-x-auto">
                      <div className="grid grid-cols-6 gap-2 min-w-full">
                        {/* Header */}
                        <div className="font-semibold p-3 bg-muted rounded-lg text-center text-sm">
                          Time
                        </div>
                        {days.map(day => (
                          <div key={day} className="font-semibold p-3 bg-muted rounded-lg text-center text-sm">
                            {day}
                          </div>
                        ))}

                        {/* Time slots and schedule */}
                        {timeSlots.map((timeSlot, timeSlotIndex) => (
                          <React.Fragment key={timeSlot}>
                            <div className="p-3 bg-muted/50 rounded-lg text-center font-medium text-xs">
                              {timeSlot}
                            </div>
                            {days.map((day, dayIndex) => {
                              const daySchedule = selectedTimetableForView.timetable_json.schedule?.[day] || {};
                              const slot = daySchedule[timeSlot];
                              
                              if (!slot || !slot.subject) {
                                const freePeriodText = getDefaultFreePeriod(
                                  selectedTimetableForView.timetable_json.semester || 1,
                                  dayIndex,
                                  timeSlotIndex
                                );
                                return (
                                  <div key={`${day}-${timeSlot}`} className="p-3 border border-dashed border-muted rounded-lg text-center text-muted-foreground text-xs">
                                    {freePeriodText}
                                  </div>
                                );
                              }

                              return (
                                <div key={`${day}-${timeSlot}`} className="p-2 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                                  <Badge className="mb-1 text-[10px] bg-blue-200 text-blue-800 border-blue-300">
                                    {slot.code || slot.subject.substring(0, 3)}
                                  </Badge>
                                  <p className="text-xs font-medium break-words leading-tight">{slot.subject}</p>
                                  <p className="text-[10px] text-muted-foreground break-words leading-tight">{slot.staff || 'TBD'}</p>
                                  <p className="text-[10px] text-muted-foreground break-words leading-tight">Room: {slot.room || 'TBD'}</p>
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No timetable data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}