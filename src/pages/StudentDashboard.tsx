import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Sparkles, 
  AlertTriangle, 
  Upload, 
  Download, 
  Settings, 
  SlidersHorizontal, 
  Brain, 
  CheckCircle, 
  Search,
  User,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Grid3X3,
  List,
  Users,
  ChevronDown,
  Zap
} from 'lucide-react';
import { ClientTimetableGenerator } from '@/lib/timetableGenerator';
import { useToast } from '@/hooks/use-toast';

interface Subject { 
  id: string; 
  code: string; 
  name: string; 
  department_id: string | null; 
  semester?: number; 
  hours_per_week?: number; 
  subject_type?: string; 
  credits?: number; 
}

interface Staff { 
  id: string; 
  name: string; 
  department_id?: string; 
}

interface Department { 
  id: string; 
  code?: string; 
  name?: string; 
}

interface StudentRec { 
  id: string; 
  roll_no?: string; 
  name: string; 
  email?: string; 
  semester?: number; 
  department_id?: string | null; 
}

interface Section { 
  id: string; 
  name: string; 
  department_id: string; 
  semester: number; 
}

interface Room { 
  id: string; 
  room_number: string; 
  capacity: number; 
  room_type: string; 
}

interface Timing { 
  id: string; 
  day_of_week: number; 
  start_time: string; 
  end_time: string; 
}

interface IndivTimetableEntry { 
  day: string; 
  start_time: string; 
  end_time: string; 
  subject_code?: string; 
  subject_name?: string; 
  faculty_name?: string; 
  room?: string; 
}

const StudentDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timings, setTimings] = useState<Timing[]>([]);
  const [students, setStudents] = useState<StudentRec[]>([]);
  
  // Student search and selection
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRec | null>(null);
  
  // Individual generation selections
  const [indivSemester, setIndivSemester] = useState<string>('1');
  const [indivDepartments, setIndivDepartments] = useState<string[]>([]);
  const [indivSections, setIndivSections] = useState<string[]>([]);
  const [indivSubjects, setIndivSubjects] = useState<string[]>([]);
  const [indivStaff, setIndivStaff] = useState<string[]>([]);
  const [indivRooms, setIndivRooms] = useState<string[]>([]);
  const [indivTimings, setIndivTimings] = useState<string[]>([]);
  const [showAllSubjects, setShowAllSubjects] = useState(true);
  
  // Generation states
  const [indivGenerating, setIndivGenerating] = useState(false);
  const [indivProgress, setIndivProgress] = useState(0);
  const [indivPersonalized, setIndivPersonalized] = useState<IndivTimetableEntry[]>([]);
  const [loadingIndivPersonalized, setLoadingIndivPersonalized] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [subjRes, staffRes, deptRes, secRes, roomRes, timingRes, studRes] = await Promise.all([
          supabase.from('subjects').select('id, code, name, department_id, semester, hours_per_week, subject_type, credits'),
          supabase.from('staff').select('id, name, department_id'),
          supabase.from('departments').select('id, code, name'),
          supabase.from('sections').select('id, name, department_id, semester'),
          supabase.from('rooms').select('id, room_number, capacity, room_type'),
          supabase.from('college_timings').select('id, day_of_week, start_time, end_time').order('day_of_week'),
          (supabase as any).from('students').select('id, roll_no, name, email, semester, department_id')
        ]);

        if (subjRes.error) throw subjRes.error;
        if (staffRes.error) throw staffRes.error;
        if (deptRes.error) throw deptRes.error;
        if (secRes.error) throw secRes.error;
        if (roomRes.error) throw roomRes.error;
        if (timingRes.error) throw timingRes.error;
        if (studRes.error) throw studRes.error;

        setSubjects(subjRes.data || []);
        setFaculty(staffRes.data || []);
        setDepartments(deptRes.data || []);
        setSections(secRes.data || []);
        setRooms(roomRes.data || []);
        setTimings(timingRes.data || []);
        setStudents(studRes.data || []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        toast({ title: 'Load failed', description: msg, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  // Debounced server-side search for students
  useEffect(() => {
    const q = studentSearch.trim();
    let active = true;
    if (!q) return;
    setStudentSearchLoading(true);
    const handle = setTimeout(async () => {
      try {
        const or = `name.ilike.%${q}%,roll_no.ilike.%${q}%`;
        const { data, error } = await (supabase as any).from('students')
          .select('id, roll_no, name, email, semester, department_id')
          .or(or)
          .order('name')
          .limit(50);
        if (!active) return;
        if (error) throw error;
        if (data) setStudents(data);
      } catch (e) {
        if (active) console.error('Student search failed', e);
      } finally {
        if (active) setStudentSearchLoading(false);
      }
    }, 400);
    return () => { active = false; clearTimeout(handle); };
  }, [studentSearch]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 25);
    return students;
  }, [students, studentSearch]);

  useEffect(() => {
    if (selectedStudent?.semester) setIndivSemester(String(selectedStudent.semester));
  }, [selectedStudent]);

  // Auto-select student's department when picking a student
  useEffect(() => {
    if (selectedStudent && indivDepartments.length === 0) {
      if (selectedStudent.department_id) {
        setIndivDepartments([selectedStudent.department_id]);
      } else if (departments.length) {
        setIndivDepartments(departments.map(d => d.id));
      }
    }
  }, [selectedStudent, indivDepartments.length, departments]);

  const toggleIndiv = (id: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  const indivFilteredSections = useMemo(() => 
    sections.filter(s => s.semester === Number(indivSemester) && 
      (indivDepartments.length === 0 || indivDepartments.includes(s.department_id))), 
    [sections, indivSemester, indivDepartments]
  );

  const indivFilteredSubjects = useMemo(() => {
    if (showAllSubjects) return subjects.filter(sub => (!sub.semester || sub.semester === Number(indivSemester)));
    return subjects.filter(sub => sub && 
      (indivDepartments.length === 0 || indivDepartments.includes(sub.department_id || '')) && 
      (!sub.semester || sub.semester === Number(indivSemester)));
  }, [subjects, indivDepartments, indivSemester, showAllSubjects]);

  const indivFilteredStaff = useMemo(() => 
    faculty.filter(st => (indivDepartments.length === 0 || indivDepartments.includes(st.department_id || ''))), 
    [faculty, indivDepartments]
  );

  const deptNameMap = useMemo(() => 
    Object.fromEntries(departments.map(d => [d.id, d.name || d.code || 'Dept'])), 
    [departments]
  );

  // Select-All helpers for advanced selections
  const selectAllIndiv = (type: 'subjects' | 'staff' | 'rooms' | 'timings') => {
    switch (type) {
      case 'subjects': setIndivSubjects(indivFilteredSubjects.map(s => s.id)); break;
      case 'staff': setIndivStaff(indivFilteredStaff.map(s => s.id)); break;
      case 'rooms': setIndivRooms(rooms.map(r => r.id)); break;
      case 'timings': setIndivTimings(timings.map(t => t.id)); break;
    }
  };

  const clearAllIndiv = (type: 'subjects' | 'staff' | 'rooms' | 'timings') => {
    switch (type) {
      case 'subjects': setIndivSubjects([]); break;
      case 'staff': setIndivStaff([]); break;
      case 'rooms': setIndivRooms([]); break;
      case 'timings': setIndivTimings([]); break;
    }
  };

  const loadIndivPersonalized = useCallback(async () => {
    if (!selectedStudent) return;
    setLoadingIndivPersonalized(true);
    try {
      const { data, error } = await (supabase as any).from('personalized_timetables')
        .select('timetable_json, generated_at')
        .eq('student_id', selectedStudent.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setIndivPersonalized(Array.isArray(data?.timetable_json) ? data.timetable_json : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingIndivPersonalized(false);
    }
  }, [selectedStudent]);

  const handleGenerateIndividual = async () => {
    if (!selectedStudent) {
      toast({ title: 'Select Student', description: 'Search and pick a student first.', variant: 'destructive' });
      return;
    }

    if (indivSubjects.length === 0) {
      toast({ title: 'Select Subjects', description: 'Choose at least one subject for the timetable.', variant: 'destructive' });
      return;
    }

    setIndivGenerating(true);
    setIndivProgress(0);

    try {
      setIndivProgress(20);
      const generator = new ClientTimetableGenerator();
      
      // Prepare generation parameters similar to main generator
      const generationParams = {
        advancedMode: true,
        sections: indivSections.length ? indivSections : undefined,
        subjects: indivSubjects.length ? indivSubjects : undefined,
        staff: indivStaff.length ? indivStaff : undefined,
        rooms: indivRooms.length ? indivRooms : undefined,
        timings: indivTimings.length ? indivTimings : undefined,
        individual: true,
        studentId: selectedStudent.id
      };

      setIndivProgress(40);
      const result = await generator.generateTimetable(
        indivDepartments,
        parseInt(indivSemester),
        generationParams
      );

      setIndivProgress(80);

      if (result.success) {
        // Save to personalized_timetables
        const personalizedEntries = [];
        const { error } = await (supabase as any).from('personalized_timetables').insert({
          student_id: selectedStudent.id,
          model_version: 'gemini-individual-v1',
          timetable_json: personalizedEntries
        });

        if (error) throw error;

        setIndivProgress(100);
        setIndivGenerating(false);
        
        toast({
          title: "Individual Timetable Generated!",
          description: `Created personalized timetable for ${selectedStudent.name} with ${personalizedEntries.length} entries.`,
        });

        await loadIndivPersonalized();
      } else {
        throw new Error(result.error || 'Individual generation failed');
      }
    } catch (error) {
      console.error('Error generating individual timetable:', error);
      setIndivGenerating(false);
      setIndivProgress(0);
      toast({
        title: "Generation Failed",
        description: `Failed to generate individual timetable: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      loadIndivPersonalized();
    }
  }, [selectedStudent, loadIndivPersonalized]);

  const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const groupedPersonalized = useMemo(() => {
    const map: Record<string, typeof indivPersonalized> = {};
    indivPersonalized.forEach(e => {
      if (!map[e.day]) map[e.day] = [];
      map[e.day].push(e);
    });
    Object.values(map).forEach(list => list.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [indivPersonalized]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-secondary">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-lg font-medium">Loading Student Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary">
      <div className="container mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Student Timetable Hub
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Generate personalized AI-powered timetables for individual students
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="generator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Generator</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="timetable" className="flex items-center gap-2 lg:flex hidden">
              <Calendar className="w-4 h-4" />
              Timetable
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-6">
            <Card className="shadow-card border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Select Student
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Search by name or roll number..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  {studentSearchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin" />
                  )}
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                    {filteredStudents.map((student) => (
                      <Card
                        key={student.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedStudent?.id === student.id
                            ? 'ring-2 ring-primary bg-primary/5'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedStudent(student)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{student.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {student.roll_no || 'No Roll Number'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  Sem {student.semester || 1}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedStudent?.id === student.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedStudent(student)}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.roll_no || 'No Roll Number'} • Semester {student.semester || 1}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {deptNameMap[student.department_id || ''] || 'No Dept'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {selectedStudent && (
                  <div className="p-4 bg-gradient-to-r from-primary/5 to-primary-glow/5 rounded-lg border border-primary/20">
                    <h4 className="font-medium mb-2">Selected Student</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedStudent.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedStudent.roll_no} • Semester {selectedStudent.semester}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {deptNameMap[selectedStudent.department_id || ''] || 'No Department'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generation Settings */}
            {selectedStudent && (
              <Card className="shadow-card border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Generation Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Semester Selection */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Semester</label>
                    <Select value={indivSemester} onValueChange={setIndivSemester}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                          <SelectItem key={sem} value={String(sem)}>
                            Semester {sem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Department Selection */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Departments ({indivDepartments.length} selected)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {departments.map((dept) => (
                        <div
                          key={dept.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            indivDepartments.includes(dept.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-accent/50'
                          }`}
                          onClick={() => toggleIndiv(dept.id, indivDepartments, setIndivDepartments)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={indivDepartments.includes(dept.id)} />
                            <div>
                              <p className="font-medium text-sm">{dept.name}</p>
                              <p className="text-xs text-muted-foreground">{dept.code}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Selections */}
                  <div className="space-y-4">
                    {/* Subjects */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            Subjects ({indivSubjects.length} selected)
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <Checkbox 
                              checked={showAllSubjects} 
                              onCheckedChange={(v) => setShowAllSubjects(!!v)} 
                            />
                            Show all subjects (cross-department)
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => selectAllIndiv('subjects')}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => clearAllIndiv('subjects')}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {indivFilteredSubjects.map((subject) => (
                          <div
                            key={subject.id}
                            className={`p-2 border rounded cursor-pointer transition-all text-xs ${
                              indivSubjects.includes(subject.id)
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-accent/50'
                            }`}
                            onClick={() => toggleIndiv(subject.id, indivSubjects, setIndivSubjects)}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox checked={indivSubjects.includes(subject.id)} />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{subject.code}</p>
                                <p className="text-muted-foreground truncate">{subject.name}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Staff */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium">
                          Staff ({indivStaff.length} selected)
                        </label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => selectAllIndiv('staff')}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => clearAllIndiv('staff')}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {indivFilteredStaff.map((staff) => (
                          <div
                            key={staff.id}
                            className={`p-2 border rounded cursor-pointer transition-all text-xs ${
                              indivStaff.includes(staff.id)
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-accent/50'
                            }`}
                            onClick={() => toggleIndiv(staff.id, indivStaff, setIndivStaff)}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox checked={indivStaff.includes(staff.id)} />
                              <p className="font-medium truncate">{staff.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Generate Button */}
                    <div className="pt-4">
                      <Button
                        onClick={handleGenerateIndividual}
                        disabled={indivGenerating || !selectedStudent}
                        variant="premium"
                        size="lg"
                        className="w-full"
                      >
                        {indivGenerating ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Generating... {indivProgress}%
                          </>
                        ) : (
                          <>
                            <Brain className="w-5 h-5 mr-2" />
                            Generate Individual Timetable
                          </>
                        )}
                      </Button>
                      {indivGenerating && (
                        <Progress value={indivProgress} className="mt-3" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-card border-0 bg-gradient-to-br from-info/10 to-info/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-info" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{students.length}</p>
                      <p className="text-sm text-muted-foreground">Total Students</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0 bg-gradient-to-br from-success/10 to-success/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{subjects.length}</p>
                      <p className="text-sm text-muted-foreground">Available Subjects</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0 bg-gradient-to-br from-warning/10 to-warning/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{faculty.length}</p>
                      <p className="text-sm text-muted-foreground">Faculty Members</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0 bg-gradient-to-br from-primary/10 to-primary-glow/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{departments.length}</p>
                      <p className="text-sm text-muted-foreground">Departments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timetable" className="space-y-6">
            {selectedStudent && indivPersonalized.length > 0 ? (
              <Card className="shadow-card border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {selectedStudent.name}'s Timetable
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                    {orderedDays.map((day) => (
                      <div key={day} className="space-y-2">
                        <h4 className="font-semibold text-center p-2 bg-primary/10 rounded-lg text-primary">
                          {day}
                        </h4>
                        <div className="space-y-2">
                          {(groupedPersonalized[day] || []).map((entry, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-gradient-to-br from-accent/50 to-secondary/30 rounded-lg text-sm border border-primary/20"
                            >
                              <p className="font-medium text-primary">{entry.subject_code}</p>
                              <p className="text-xs text-muted-foreground truncate" title={entry.subject_name}>
                                {entry.subject_name}
                              </p>
                              <p className="text-xs font-medium">
                                {entry.start_time} - {entry.end_time}
                              </p>
                              {entry.faculty_name && (
                                <p className="text-xs text-muted-foreground">{entry.faculty_name}</p>
                              )}
                              {entry.room && (
                                <p className="text-xs text-muted-foreground">{entry.room}</p>
                              )}
                            </div>
                          ))}
                          {(!groupedPersonalized[day] || groupedPersonalized[day].length === 0) && (
                            <div className="p-3 text-center text-muted-foreground text-xs">
                              No classes
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card border-0 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Timetable Generated</h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedStudent 
                      ? `Generate a personalized timetable for ${selectedStudent.name} to see it here.`
                      : 'Select a student and generate their timetable to view it here.'
                    }
                  </p>
                  {selectedStudent && (
                    <Button 
                      onClick={() => {
                        // Switch to generator tab
                        const generatorTab = document.querySelector('[value="generator"]') as HTMLButtonElement;
                        generatorTab?.click();
                      }}
                      variant="premium"
                    >
                      Generate Timetable
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;