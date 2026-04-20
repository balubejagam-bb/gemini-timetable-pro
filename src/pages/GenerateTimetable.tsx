import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Brain, AlertTriangle, Settings, Zap, Database, SlidersHorizontal, Search, Clock, Calendar, Plus, Trash2 } from "lucide-react";
import { useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { env } from "@/lib/env";
import { supabase } from "@/integrations/supabase/client";
import { ClientTimetableGenerator, SimpleTimetableGenerator } from "@/lib/timetableGenerator";
import DatabaseDebug from "@/lib/databaseDebug";

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
  departments?: { name: string };
}

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  hours_per_week: number;
  department_id: string;
  semester: number;
  subject_type: string;
  departments?: { name: string };
}

interface Staff {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  designation: string;
  department_id: string;
  max_hours_per_week: number;
  departments?: { name: string };
}

interface Room {
  id: string;
  room_number: string;
  capacity: number;
  room_type: string;
  building?: string;
  floor?: number;
}

const DEFAULT_PERIOD_TIMINGS = [
  { start: "09:00", end: "10:00" },
  { start: "10:15", end: "11:15" },
  { start: "11:15", end: "12:15" },
  { start: "13:15", end: "14:00" },
  { start: "14:00", end: "14:45" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
  { start: "17:00", end: "17:45" },
  { start: "17:45", end: "18:30" },
  { start: "18:30", end: "19:15" },
];

const getDefaultTimingConfig = (periodCount: number) =>
  Array.from({ length: periodCount }, (_, index) => ({
    slot: index + 1,
    start: DEFAULT_PERIOD_TIMINGS[index]?.start || `${String(8 + index).padStart(2, "0")}:00`,
    end: DEFAULT_PERIOD_TIMINGS[index]?.end || `${String(9 + index).padStart(2, "0")}:00`,
  }));

export default function GenerateTimetable() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineGenerating, setOfflineGenerating] = useState(false);
  const [backoffStatus, setBackoffStatus] = useState<{ attempt: number; message: string }>({ attempt: 0, message: "Idle" });
  // Advanced mode state
  // Advanced mode always enabled now
  const advancedMode = true;
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [availableTimings, setAvailableTimings] = useState<{ id: string; day_of_week: number; start_time: string; end_time: string }[]>([]);
  const [selectedTimingIds, setSelectedTimingIds] = useState<string[]>([]);
  
  // Dynamic period/day configuration
  const [periodsPerDay, setPeriodsPerDay] = useState(7);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [customTimings, setCustomTimings] = useState<Array<{ slot: number; start: string; end: string }>>(
    getDefaultTimingConfig(7)
  );

  // Lab selection: which subjects should have a lab session (2 consecutive periods)
  const [labSubjectIds, setLabSubjectIds] = useState<Set<string>>(new Set());
  // Staff-subject assignment: user can manually assign staff to subjects
  const [staffSubjectMap, setStaffSubjectMap] = useState<Record<string, string>>({}); // subjectId -> staffId

  // Search states
  const [sectionSearch, setSectionSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");

  // Visibility toggles (user requested all subjects/sections irrespective of department)
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [showAllStaff, setShowAllStaff] = useState(true);
  const { toast } = useToast();
  useEffect(() => {
  const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch departments
        const { data: deptData, error: deptError } = await supabase
          .from("departments")
          .select("id, name, code");

        if (deptError) throw deptError;
        setDepartments(deptData || []);

        // Fetch sections
        const { data: secData, error: secError } = await supabase
          .from("sections")
          .select("id, name, department_id, semester");

        if (secError) throw secError;
        setSections(secData || []);

        // Fetch subjects, staff, rooms, timings for advanced mode
        const [{ data: subjData }, { data: stfData }, { data: rmData }, { data: timingData }] = await Promise.all([
          supabase.from("subjects").select("id,name,code,credits,hours_per_week,department_id,semester,subject_type"),
          supabase.from("staff").select("id,name,designation,department_id,max_hours_per_week"),
          supabase.from("rooms").select("id,room_number,capacity,room_type"),
          supabase.from("college_timings").select("id,day_of_week,start_time,end_time").order('day_of_week')
        ]);
        setAllSubjects(subjData || []);
        setAllStaff(stfData || []);
        setAllRooms(rmData || []);
        setAvailableTimings((timingData || []).map(t => ({ ...t, id: t.id })));
        setLoading(false);
      } catch (err) {
        console.error("Error fetching departments/sections:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  const runWithBackoff = async <T,>(operation: () => Promise<T>, maxAttempts = 3, baseDelay = 1000): Promise<T> => {
    const isQuotaError = (message: string) =>
      /429|quota|rate limit|resource exhausted/i.test(message);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setBackoffStatus({ attempt, message: attempt === 1 ? "Running Gemini Flash-Lite pipeline..." : `Retry ${attempt}/${maxAttempts} with adaptive backoff...` });
        const result = await operation();
        setBackoffStatus({ attempt, message: `Succeeded after ${attempt} attempt(s).` });
        return result;
      } catch (error) {
        const err = error as Error;
        if (isQuotaError(err.message)) {
          setBackoffStatus({ attempt, message: `Gemini quota/rate limit reached: ${err.message}` });
          throw err;
        }
        if (attempt === maxAttempts) {
          setBackoffStatus({ attempt, message: `Failed after ${maxAttempts} attempts: ${err.message}` });
          throw err;
        }
        const delay = baseDelay * Math.pow(2, attempt - 1);
        setBackoffStatus({ attempt, message: `Attempt ${attempt} failed (${err.message}). Retrying in ${(delay / 1000).toFixed(1)}s...` });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Exponential backoff exhausted');
  };
  const handleGenerate = async () => {
    if (selectedDepartments.length === 0) {
      if (!advancedMode || selectedSubjects.length === 0) {
        toast({
          title: "Selection Required",
          description: "Select at least one department or enable advanced mode with subjects.",
          variant: "destructive"
        });
        return;
      }
    }

    // Validate sections are selected
    if (selectedSections.length === 0) {
      toast({
        title: "Sections Required",
        description: "Please select at least one section to generate timetables for.",
        variant: "destructive"
      });
      return;
    }

    if (selectedRoomIds.length === 0) {
      toast({
        title: "Rooms Required",
        description: "Please select at least one classroom or lab room before generating timetables.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setBackoffStatus({ attempt: 0, message: "Priming ML pipeline..." });

    try {
      setProgress(20);
      
      console.log('Starting client-side AI timetable generation...');
      console.log('Environment check:', {
        hasGoogleKey: !!env.GOOGLE_AI_API_KEY,
        keyPrefix: env.GOOGLE_AI_API_KEY?.substring(0, 10) || 'NOT_FOUND'
      });
      
      // Only use AI generation via adaptive backoff
      const aiTask = () => {
        const aiGenerator = new ClientTimetableGenerator();
        return aiGenerator.generateTimetable(
          selectedDepartments,
          parseInt(selectedSemester),
          advancedMode ? {
            advancedMode: true,
            sections: selectedSections.length ? selectedSections : undefined,
            subjects: selectedSubjects.length ? selectedSubjects : undefined,
            staff: selectedStaffIds.length ? selectedStaffIds : undefined,
            rooms: selectedRoomIds.length ? selectedRoomIds : undefined,
            periodsPerDay,
            daysPerWeek,
            customTimings,
            labSubjectIds: Array.from(labSubjectIds),
            staffSubjectMap,
          } : { periodsPerDay, daysPerWeek, customTimings, labSubjectIds: Array.from(labSubjectIds), staffSubjectMap }
        );
      };

      setProgress(50);
      const result = await runWithBackoff(aiTask, 3);
      setProgress(80);

      if (result.success) {
        setProgress(100);
        setIsGenerating(false);
        
        toast({
          title: "Success!",
          description: `AI-powered timetable generated successfully! Created ${result.entriesCount} entries.`,
        });
        return;
      } else {
        console.error('AI generation failed with error:', result.error);
        throw new Error(result.error || 'AI generation failed');
      }

    } catch (error) {
      console.error('Error generating timetables:', error);
      setIsGenerating(false);
      setProgress(0);
      const err = error as Error;
      if (/429|quota|rate limit|resource exhausted/i.test(err.message || "")) {
        toast({
          title: "Gemini quota reached",
          description: "Switching to offline timetable generation.",
        });
        await handleOfflineGenerate();
        return;
      }
      toast({
        title: "Error",
        description: `Failed to generate timetables: ${error.message}. Please ensure you have valid data and API keys configured.`,
        variant: "destructive"
      });
    }
  };
  const handleOfflineGenerate = async () => {
    if (selectedDepartments.length === 0) {
      toast({
        title: "Departments Required",
        description: "Select at least one department before running offline generation.",
        variant: "destructive"
      });
      return;
    }

    if (selectedRoomIds.length === 0) {
      toast({
        title: "Rooms Required",
        description: "Select at least one room before running offline generation.",
        variant: "destructive"
      });
      return;
    }

    setOfflineGenerating(true);
    try {
      const simpleGenerator = new SimpleTimetableGenerator();
      const result = await simpleGenerator.generateTimetable(
        selectedDepartments,
        parseInt(selectedSemester),
        {
          rooms: selectedRoomIds.length ? selectedRoomIds : undefined,
          subjects: selectedSubjects.length ? selectedSubjects : undefined,
          staff: selectedStaffIds.length ? selectedStaffIds : undefined,
          sections: selectedSections.length ? selectedSections : undefined,
          advancedMode: advancedMode,
          periodsPerDay,
          daysPerWeek,
          customTimings,
          labSubjectIds: Array.from(labSubjectIds),
          staffSubjectMap,
        }
      );

      if (result.success) {
        toast({
          title: "Offline Success",
          description: result.message
        });
      } else {
        throw new Error(result.error || result.message || 'Offline generator failed');
      }
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Offline Generation Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setOfflineGenerating(false);
    }
  };
  // ...existing code...

  // Removed simple algorithm fallback. Only AI generation is used.

  const handleDatabaseDiagnostic = async () => {
    try {
      toast({
        title: "Running Database Diagnostic",
        description: "Checking database structure and data...",
      });

      const diagnostic = await DatabaseDebug.runFullDiagnostic();
      
      if (diagnostic.success) {
        console.log('Database Diagnostic Report:', diagnostic.report);
        
        if (diagnostic.issues.length === 0) {
          toast({
            title: "Database OK!",
            description: "No issues found. Check browser console for detailed report.",
          });
        } else {
          toast({
            title: `Found ${diagnostic.issues.length} Issue(s)`,
            description: `Check browser console for detailed report and recommendations.`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Diagnostic Failed",
          description: diagnostic.report,
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Diagnostic Error",
        description: `Failed to run diagnostic: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartments(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const needsSupabase = false; // Database is connected and has sample data

  const toggleInList = (id: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };
  // Sections auto-selected: only those matching chosen semester & departments
  const filteredAutoSections = sections.filter(s => s.semester.toString() === selectedSemester && (selectedDepartments.length===0 || selectedDepartments.includes(s.department_id)));
  const allSectionsSelectable = filteredAutoSections; // kept for compatibility
  const allFilteredSubjects = showAllSubjects
    ? allSubjects
    : allSubjects.filter(s => (selectedDepartments.length === 0 || selectedDepartments.includes(s.department_id)));
  const allFilteredStaff = showAllStaff
    ? allStaff
    : allStaff.filter(st => selectedDepartments.length === 0 || selectedDepartments.includes(st.department_id));
  const allTimingIds = availableTimings.map(t => t.id);
  const deptNameMap = useMemo(() => Object.fromEntries(departments.map(d => [d.id, d.name])), [departments]);

  // Filtered lists based on search
  const filteredSectionsDisplay = allSectionsSelectable.filter(s => 
    s.name.toLowerCase().includes(sectionSearch.toLowerCase()) || 
    (deptNameMap[s.department_id] || '').toLowerCase().includes(sectionSearch.toLowerCase())
  );

  const filteredSubjectsDisplay = allFilteredSubjects.filter(s => 
    s.name.toLowerCase().includes(subjectSearch.toLowerCase()) || 
    s.code.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const filteredStaffDisplay = allFilteredStaff.filter(s => 
    s.name.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const filteredClassRoomsDisplay = allRooms.filter(r =>
    !((r.room_type || '').toLowerCase().includes('lab') || r.room_number.toLowerCase().includes('lab')) &&
    (r.room_number.toLowerCase().includes(roomSearch.toLowerCase()) ||
      (r.room_type || '').toLowerCase().includes(roomSearch.toLowerCase()))
  );
  const filteredLabRoomsDisplay = allRooms.filter(r =>
    ((r.room_type || '').toLowerCase().includes('lab') || r.room_number.toLowerCase().includes('lab')) &&
    (r.room_number.toLowerCase().includes(roomSearch.toLowerCase()) ||
      (r.room_type || '').toLowerCase().includes(roomSearch.toLowerCase()))
  );
  const selectedRoomDetails = allRooms.filter(room => selectedRoomIds.includes(room.id));
  const selectedLabRoomCount = selectedRoomDetails.filter(room =>
    (room.room_type || '').toLowerCase().includes('lab') || room.room_number.toLowerCase().includes('lab')
  ).length;
  const selectedClassRoomCount = Math.max(selectedRoomDetails.length - selectedLabRoomCount, 0);

  const selectAll = (type: 'sections' | 'subjects' | 'staff' | 'classRooms' | 'labRooms' | 'timings') => {
    switch(type){
      case 'sections': setSelectedSections(filteredSectionsDisplay.map(s=>s.id)); break;
      case 'subjects': setSelectedSubjects(filteredSubjectsDisplay.map(s=>s.id)); break;
      case 'staff': setSelectedStaffIds(filteredStaffDisplay.map(s=>s.id)); break;
      case 'classRooms': setSelectedRoomIds(prev => Array.from(new Set([...prev, ...filteredClassRoomsDisplay.map(r=>r.id)]))); break;
      case 'labRooms': setSelectedRoomIds(prev => Array.from(new Set([...prev, ...filteredLabRoomsDisplay.map(r=>r.id)]))); break;
      case 'timings': setSelectedTimingIds(allTimingIds); break;
    }
  };
  const clearAll = (type: 'sections' | 'subjects' | 'staff' | 'classRooms' | 'labRooms' | 'timings') => {
    switch(type){
      case 'sections': setSelectedSections([]); break;
      case 'subjects': setSelectedSubjects([]); break;
      case 'staff': setSelectedStaffIds([]); break;
      case 'classRooms': setSelectedRoomIds(prev => prev.filter(id => !filteredClassRoomsDisplay.some(r => r.id === id))); break;
      case 'labRooms': setSelectedRoomIds(prev => prev.filter(id => !filteredLabRoomsDisplay.some(r => r.id === id))); break;
      case 'timings': setSelectedTimingIds([]); break;
    }
  };

  // Auto-update selected sections when semester or departments change (removed - now manual)
  // useEffect(()=>{
  //   setSelectedSections(filteredAutoSections.map(s=>s.id));
  // }, [filteredAutoSections]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Timetable</h1>
          <p className="text-muted-foreground">
            Build production-ready online and offline timetables with strict lab, room, and template rules.
          </p>
        </div>
      </div>

      {/* Supabase Integration Notice */}
      {needsSupabase && (
        <Alert className="border-warning/20 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>
            <strong>Database Connection Required:</strong> To generate and save timetables for Mohan Babu University, you need to connect to Supabase. 
            Click the green Supabase button in the top right to set up the database integration.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Generation Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Generation Settings
              </CardTitle>
              <CardDescription>
                Configure your timetable generation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">Select Semester</label>
                  <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                      <SelectItem value="3">Semester 3</SelectItem>
                      <SelectItem value="4">Semester 4</SelectItem>
                      <SelectItem value="5">Semester 5</SelectItem>
                      <SelectItem value="6">Semester 6</SelectItem>
                      <SelectItem value="7">Semester 7</SelectItem>
                      <SelectItem value="8">Semester 8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">
                  Select Departments ({selectedDepartments.length} selected)
                </label>
                {loading ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-4 border rounded-lg animate-pulse">
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : departments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No departments found.</p>
                    <p className="text-sm mt-1">Please add departments in the Departments page first.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {departments.map((dept) => {
                      const deptSections = sections.filter(s => s.department_id === dept.id && s.semester.toString() === selectedSemester);
                      return (
                        <div
                          key={dept.id}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                            selectedDepartments.includes(dept.id)
                              ? "border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 shadow-blue-100"
                              : "border-muted-foreground/20 bg-gradient-to-br from-background to-muted/30"
                          }`}
                          onClick={() => toggleDepartment(dept.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedDepartments.includes(dept.id)}
                              onChange={() => {}}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-lg">{dept.name}</p>
                              <p className="text-sm text-blue-600 font-medium">Code: {dept.code}</p>
                              <p className="text-xs text-muted-foreground">Sections this semester: {deptSections.length}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options (always enabled) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="w-5 h-5" />Advanced Options</CardTitle>
              <CardDescription>Fine-tune generation by explicitly selecting resources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sections */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Sections to Schedule</h3>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => selectAll('sections')}>All</Button>
                    <Button variant="ghost" size="sm" onClick={() => clearAll('sections')}>None</Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sections..."
                    value={sectionSearch}
                    onChange={(e) => setSectionSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {filteredSectionsDisplay.map(section => (
                    <div key={section.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`sec-${section.id}`}
                        checked={selectedSections.includes(section.id)}
                        onCheckedChange={(checked) => {
                          if(checked) setSelectedSections(prev => [...prev, section.id]);
                          else setSelectedSections(prev => prev.filter(id => id !== section.id));
                        }}
                      />
                      <Label htmlFor={`sec-${section.id}`} className="text-xs cursor-pointer">
                        {section.name} <span className="text-muted-foreground">({deptNameMap[section.department_id]})</span>
                      </Label>
                    </div>
                  ))}
                  {filteredSectionsDisplay.length === 0 && (
                    <div className="col-span-full text-center text-sm text-muted-foreground py-2">
                      No sections found
                    </div>
                  )}
                </div>
              </div>

              {/* Subjects with Lab Toggle & Staff Assignment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium">Subjects {showAllSubjects ? '(All Departments)' : ''}</h3>
                    <label className="flex items-center gap-2 text-[11px] font-normal">
                      <Checkbox checked={showAllSubjects} onCheckedChange={v=>setShowAllSubjects(!!v)} />
                      <span>Show all subjects (cross-department)</span>
                    </label>
                  </div>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => selectAll('subjects')}>All</Button>
                    <Button variant="ghost" size="sm" onClick={() => clearAll('subjects')}>None</Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subjects..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto border rounded-md p-2">
                  {filteredSubjectsDisplay.map(subject => {
                    const isSelected = selectedSubjects.includes(subject.id);
                    const hasLab = labSubjectIds.has(subject.id);
                    const assignedStaffId = staffSubjectMap[subject.id];
                    const isDbLab = subject.subject_type?.toLowerCase().includes('lab') || subject.subject_type?.toLowerCase().includes('practical');
                    return (
                      <div key={subject.id} className={`flex flex-col gap-1 p-2 rounded-lg border transition-all ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-transparent'}`}>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id={`sub-${subject.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if(checked) setSelectedSubjects(prev => [...prev, subject.id]);
                              else {
                                setSelectedSubjects(prev => prev.filter(id => id !== subject.id));
                                setLabSubjectIds(prev => { const n = new Set(prev); n.delete(subject.id); return n; });
                              }
                            }}
                          />
                          <Label htmlFor={`sub-${subject.id}`} className="text-xs cursor-pointer truncate flex-1" title={`${subject.name} (${subject.code})`}>
                            <span className="text-muted-foreground mr-1">[Sem {subject.semester}]</span>
                            {subject.name} <span className="text-muted-foreground">({subject.code})</span>
                          </Label>
                          {isDbLab && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium shrink-0">LAB</span>}
                        </div>
                        {/* Lab toggle & staff assignment — only shown when subject is selected */}
                        {isSelected && (
                          <div className="flex items-center gap-3 pl-6 mt-1">
                            {!isDbLab && (
                              <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                                <Checkbox 
                                  checked={hasLab}
                                  onCheckedChange={(checked) => {
                                    setLabSubjectIds(prev => {
                                      const n = new Set(prev);
                                      if (checked) n.add(subject.id);
                                      else n.delete(subject.id);
                                      return n;
                                    });
                                  }}
                                  className="h-3.5 w-3.5"
                                />
                                <span className="text-green-700 font-medium">Needs Lab</span>
                              </label>
                            )}
                            <Select 
                              value={assignedStaffId || '_auto'} 
                              onValueChange={(v) => {
                                setStaffSubjectMap(prev => {
                                  const n = { ...prev };
                                  if (v === '_auto') delete n[subject.id];
                                  else n[subject.id] = v;
                                  return n;
                                });
                              }}
                            >
                              <SelectTrigger className="h-6 text-[10px] w-32">
                                <SelectValue placeholder="Auto Staff" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_auto">Auto Assign</SelectItem>
                                {allStaff.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredSubjectsDisplay.length === 0 && (
                    <div className="col-span-full text-center text-sm text-muted-foreground py-2">
                      No subjects found
                    </div>
                  )}
                </div>
                {selectedSubjects.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
                    <span>{selectedSubjects.length} subjects selected · {labSubjectIds.size} with labs · {Object.keys(staffSubjectMap).length} staff assigned</span>
                  </div>
                )}
              </div>

              {/* Staff */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium">Staff {showAllStaff ? '(All Departments)' : ''}</h3>
                    <label className="flex items-center gap-2 text-[11px] font-normal">
                      <Checkbox checked={showAllStaff} onCheckedChange={v=>setShowAllStaff(!!v)} />
                      <span>Show all staff (cross-department)</span>
                    </label>
                  </div>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => selectAll('staff')}>All</Button>
                    <Button variant="ghost" size="sm" onClick={() => clearAll('staff')}>None</Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {filteredStaffDisplay.map(staff => (
                    <div key={staff.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`staff-${staff.id}`}
                        checked={selectedStaffIds.includes(staff.id)}
                        onCheckedChange={(checked) => {
                          if(checked) setSelectedStaffIds(prev => [...prev, staff.id]);
                          else setSelectedStaffIds(prev => prev.filter(id => id !== staff.id));
                        }}
                      />
                      <Label htmlFor={`staff-${staff.id}`} className="text-xs cursor-pointer truncate" title={staff.name}>
                        {staff.name}
                      </Label>
                    </div>
                  ))}
                  {filteredStaffDisplay.length === 0 && (
                    <div className="col-span-full text-center text-sm text-muted-foreground py-2">
                      No staff found
                    </div>
                  )}
                </div>
              </div>

              {/* Rooms */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Rooms</h3>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => selectAll('classRooms')}>All Classrooms</Button>
                    <Button variant="ghost" size="sm" onClick={() => selectAll('labRooms')}>All Labs</Button>
                    <Button variant="ghost" size="sm" onClick={() => clearAll('classRooms')}>Clear Classrooms</Button>
                    <Button variant="ghost" size="sm" onClick={() => clearAll('labRooms')}>Clear Labs</Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rooms..."
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-700">Classroom Numbers</h4>
                      <span className="text-[11px] text-muted-foreground">{selectedClassRoomCount} selected</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {filteredClassRoomsDisplay.map(room => (
                        <div key={room.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`room-class-${room.id}`}
                            checked={selectedRoomIds.includes(room.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedRoomIds(prev => [...prev, room.id]);
                              else setSelectedRoomIds(prev => prev.filter(id => id !== room.id));
                            }}
                          />
                          <Label htmlFor={`room-class-${room.id}`} className="text-xs cursor-pointer truncate" title={`${room.room_number} (${room.room_type || 'General'})`}>
                            {room.room_number} <span className="text-muted-foreground">({room.room_type || 'Gen'})</span>
                          </Label>
                        </div>
                      ))}
                      {filteredClassRoomsDisplay.length === 0 && (
                        <div className="col-span-full text-center text-sm text-muted-foreground py-2">
                          No classroom rooms found
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-amber-700">Lab Room Numbers</h4>
                      <span className="text-[11px] text-muted-foreground">{selectedLabRoomCount} selected</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {filteredLabRoomsDisplay.map(room => (
                        <div key={room.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`room-lab-${room.id}`}
                            checked={selectedRoomIds.includes(room.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedRoomIds(prev => [...prev, room.id]);
                              else setSelectedRoomIds(prev => prev.filter(id => id !== room.id));
                            }}
                          />
                          <Label htmlFor={`room-lab-${room.id}`} className="text-xs cursor-pointer truncate" title={`${room.room_number} (${room.room_type || 'General'})`}>
                            {room.room_number} <span className="text-muted-foreground">({room.room_type || 'Gen'})</span>
                          </Label>
                        </div>
                      ))}
                      {filteredLabRoomsDisplay.length === 0 && (
                        <div className="col-span-full text-center text-sm text-muted-foreground py-2">
                          No lab rooms found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  Room selection required:
                  {selectedRoomIds.length === 0
                    ? " Please select at least one classroom or lab room before generating."
                    : ` ${selectedRoomDetails.length} room(s) selected: ${selectedClassRoomCount} classroom, ${selectedLabRoomCount} lab.`}
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Lab policy: selected lab rooms are used for lab periods, and each lab block stays highlighted as a single yellow block.
                </div>
              </div>

              {/* Period & Timing Configuration */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
                    <Clock className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold">Period & Timing Configuration</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Periods per day */}
                  <div>
                    <Label className="text-xs mb-1 block">Periods per Day</Label>
                    <Select value={periodsPerDay.toString()} onValueChange={(v) => {
                      const n = parseInt(v);
                      setPeriodsPerDay(n);
                      setCustomTimings(getDefaultTimingConfig(n));
                    }}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 5, 6, 7, 8, 9, 10].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} Periods</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Days per week */}
                  <div>
                    <Label className="text-xs mb-1 block">Days per Week</Label>
                    <Select value={daysPerWeek.toString()} onValueChange={(v) => setDaysPerWeek(parseInt(v))}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Mon – Fri (5 days)</SelectItem>
                        <SelectItem value="6">Mon – Sat (6 days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Summary badge */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{periodsPerDay} periods × {daysPerWeek} days = <strong className="text-foreground">{periodsPerDay * daysPerWeek} total slots/week</strong></span>
                </div>

                {/* Custom period timings */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Period Timings (editable)</Label>
                  <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                    {customTimings.map((t, idx) => (
                      <div key={t.slot} className="grid grid-cols-[72px_minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2 text-xs">
                        <span className="font-medium text-muted-foreground">Period {t.slot}</span>
                        <Input
                          type="time"
                          step={300}
                          value={t.start}
                          onChange={(e) => {
                            const updated = [...customTimings];
                            updated[idx] = { ...updated[idx], start: e.target.value };
                            setCustomTimings(updated);
                          }}
                          className="h-9 min-w-0 text-xs pr-3"
                        />
                        <span className="text-center text-muted-foreground">to</span>
                        <Input
                          type="time"
                          step={300}
                          value={t.end}
                          onChange={(e) => {
                            const updated = [...customTimings];
                            updated[idx] = { ...updated[idx], end: e.target.value };
                            setCustomTimings(updated);
                          }}
                          className="h-9 min-w-0 text-xs pr-3"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Features & Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generation Summary</CardTitle>
              <CardDescription>Quick sanity check before we run the generator.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Departments</span>
                <span className="font-medium">{selectedDepartments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sections</span>
                <span className="font-medium">{selectedSections.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subjects</span>
                <span className="font-medium">{selectedSubjects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lab Blocks</span>
                <span className="font-medium">{labSubjectIds.size}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Room Pool</span>
                <span className="font-medium">{selectedRoomIds.length || allRooms.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scheduling Rules</CardTitle>
              <CardDescription>Applied to both online and offline generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Every lab is one 2-period continuous block on a single day.</p>
              <p>2. Each lab subject appears only once in the week.</p>
              <p>3. A section gets at most one lab block on a day.</p>
              <p>4. Theory stays in classrooms; labs stay in lab rooms.</p>
              <p>5. Downloads use the university-style template format.</p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || needsSupabase || offlineGenerating}
              size="lg" 
              className="w-full gap-2 animate-glow"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "Generating..." : "Generate Online (AI)"}
            </Button>
            
            <Button 
              onClick={handleOfflineGenerate}
              disabled={offlineGenerating || isGenerating || needsSupabase}
              size="lg" 
              variant="secondary"
              className="w-full gap-2"
            >
              <Zap className="w-4 h-4" />
              {offlineGenerating ? "Generating Offline..." : "Generate Offline"}
            </Button>
            
            <Button 
              onClick={handleDatabaseDiagnostic}
              disabled={isGenerating || offlineGenerating}
              size="sm" 
              variant="ghost"
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
            >
              <Database className="w-4 h-4" />
              Debug Database Issues
            </Button>
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 animate-pulse text-primary" />
                  AI Generation in Progress
                </CardTitle>
                <CardDescription>
                  Please wait while we generate your timetables...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">
                    {Math.round(progress)}% Complete
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
