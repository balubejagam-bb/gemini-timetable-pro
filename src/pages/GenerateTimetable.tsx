import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Brain, AlertTriangle, Settings, Zap, Database, SlidersHorizontal, Search } from "lucide-react";
import { useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
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
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setBackoffStatus({ attempt, message: attempt === 1 ? "Running Gemini 1.5 Pro pipeline..." : `Retry ${attempt}/${maxAttempts} with adaptive backoff...` });
        const result = await operation();
        setBackoffStatus({ attempt, message: `Succeeded after ${attempt} attempt(s).` });
        return result;
      } catch (error) {
        const err = error as Error;
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

    setIsGenerating(true);
    setProgress(0);
    setBackoffStatus({ attempt: 0, message: "Priming ML pipeline..." });

    try {
      setProgress(20);
      
      console.log('Starting client-side AI timetable generation...');
      console.log('Environment check:', {
        hasGoogleKey: !!import.meta.env.VITE_GOOGLE_AI_API_KEY,
        keyPrefix: import.meta.env.VITE_GOOGLE_AI_API_KEY?.substring(0, 10) || 'NOT_FOUND'
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
            rooms: selectedRoomIds.length ? selectedRoomIds : undefined
          } : undefined
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
          advancedMode: advancedMode
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

  const filteredRoomsDisplay = allRooms.filter(r => 
    r.room_number.toLowerCase().includes(roomSearch.toLowerCase()) ||
    (r.room_type || '').toLowerCase().includes(roomSearch.toLowerCase())
  );

  const selectAll = (type: 'sections' | 'subjects' | 'staff' | 'rooms' | 'timings') => {
    switch(type){
      case 'sections': setSelectedSections(filteredSectionsDisplay.map(s=>s.id)); break;
      case 'subjects': setSelectedSubjects(filteredSubjectsDisplay.map(s=>s.id)); break;
      case 'staff': setSelectedStaffIds(filteredStaffDisplay.map(s=>s.id)); break;
      case 'rooms': setSelectedRoomIds(filteredRoomsDisplay.map(r=>r.id)); break;
      case 'timings': setSelectedTimingIds(allTimingIds); break;
    }
  };
  const clearAll = (type: 'sections' | 'subjects' | 'staff' | 'rooms' | 'timings') => {
    switch(type){
      case 'sections': setSelectedSections([]); break;
      case 'subjects': setSelectedSubjects([]); break;
      case 'staff': setSelectedStaffIds([]); break;
      case 'rooms': setSelectedRoomIds([]); break;
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
            Use AI to automatically generate optimized timetables
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

              {/* Subjects */}
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {filteredSubjectsDisplay.map(subject => (
                    <div key={subject.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`sub-${subject.id}`}
                        checked={selectedSubjects.includes(subject.id)}
                        onCheckedChange={(checked) => {
                          if(checked) setSelectedSubjects(prev => [...prev, subject.id]);
                          else setSelectedSubjects(prev => prev.filter(id => id !== subject.id));
                        }}
                      />
                      <Label htmlFor={`sub-${subject.id}`} className="text-xs cursor-pointer truncate" title={`${subject.name} (${subject.code})`}>
                        <span className="text-muted-foreground mr-1">[Sem {subject.semester}]</span>
                        {subject.name} <span className="text-muted-foreground">({subject.code})</span>
                      </Label>
                    </div>
                  ))}
                  {filteredSubjectsDisplay.length === 0 && (
                    <div className="col-span-full text-center text-sm text-muted-foreground py-2">
                      No subjects found
                    </div>
                  )}
                </div>
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
                    <Button variant="ghost" size="sm" onClick={() => selectAll('rooms')}>All</Button>
                    <Button variant="ghost" size="sm" onClick={() => clearAll('rooms')}>None</Button>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {filteredRoomsDisplay.map(room => (
                    <div key={room.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`room-${room.id}`}
                        checked={selectedRoomIds.includes(room.id)}
                        onCheckedChange={(checked) => {
                          if(checked) setSelectedRoomIds(prev => [...prev, room.id]);
                          else setSelectedRoomIds(prev => prev.filter(id => id !== room.id));
                        }}
                      />
                      <Label htmlFor={`room-${room.id}`} className="text-xs cursor-pointer truncate" title={`${room.room_number} (${room.room_type || 'General'})`}>
                        {room.room_number} <span className="text-muted-foreground">({room.room_type || 'Gen'})</span>
                      </Label>
                    </div>
                  ))}
                  {filteredRoomsDisplay.length === 0 && (
                    <div className="col-span-full text-center text-sm text-muted-foreground py-2">
                      No rooms found
                    </div>
                  )}
                </div>
              </div>

              {/* Timings (Informational) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">Timings (reference)</h4>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={()=>selectAll('timings')}>Select All</Button>
                    <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={()=>clearAll('timings')}>Clear</Button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-40 overflow-y-auto pr-1 text-[11px]">
                  {availableTimings.map(t => {
                    const key = t.id;
                    const label = `${t.day_of_week}-${t.start_time?.slice(0,5)}-${t.end_time?.slice(0,5)}`;
                    return (
                      <label key={key} className={`flex items-center gap-2 border rounded px-2 py-1 cursor-pointer ${selectedTimingIds.includes(key)?'bg-primary/10 border-primary':'border-border'}`}
                        onClick={()=>toggleInList(key, selectedTimingIds, setSelectedTimingIds)}>
                        <Checkbox checked={selectedTimingIds.includes(key)} onCheckedChange={()=>{}} />
                        <span className="truncate" title={label}>{label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">(Selecting timings is optional; generation uses DB timings automatically.)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Features & Info */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || needsSupabase || offlineGenerating}
              size="lg" 
              className="w-full gap-2 animate-glow"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "Generating..." : "Generate with AI"}
            </Button>
            
            <Button 
              onClick={handleOfflineGenerate}
              disabled={offlineGenerating || isGenerating || needsSupabase}
              size="lg" 
              variant="secondary"
              className="w-full gap-2"
            >
              <Zap className="w-4 h-4" />
              {offlineGenerating ? "Generating Offline..." : "Generate Offline (Heuristic)"}
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