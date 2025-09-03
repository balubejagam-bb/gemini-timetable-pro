import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Brain, AlertTriangle, CheckCircle, Settings, Zap, Database, SlidersHorizontal } from "lucide-react";
import { useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClientTimetableGenerator } from "@/lib/timetableGenerator";
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
  const [stats, setStats] = useState({ subjects: 0, rooms: 0, staff: 0, timeSlots: 6 });
  const [loading, setLoading] = useState(true);
  // Advanced mode state
  // Advanced mode always enabled now
  const advancedMode = true;
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [availableTimings, setAvailableTimings] = useState<{ id: string; day_of_week: number; start_time: string; end_time: string }[]>([]);
  const [selectedTimingIds, setSelectedTimingIds] = useState<string[]>([]);
  // Visibility toggles (user requested all subjects/sections irrespective of department)
  const [showAllSubjects, setShowAllSubjects] = useState(true);
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

    setIsGenerating(true);
    setProgress(0);

    try {
      setProgress(20);
      
      console.log('Starting client-side AI timetable generation...');
      console.log('Environment check:', {
        hasGoogleKey: !!import.meta.env.VITE_GOOGLE_AI_API_KEY,
        keyPrefix: import.meta.env.VITE_GOOGLE_AI_API_KEY?.substring(0, 10) || 'NOT_FOUND'
      });
      
      // Only use AI generation
      const aiGenerator = new ClientTimetableGenerator();
      setProgress(40);
      const result = await aiGenerator.generateTimetable(
        selectedDepartments,
        parseInt(selectedSemester),
        advancedMode ? {
          advancedMode: true,
          sections: selectedSections.length ? selectedSections : undefined,
          subjects: selectedSubjects.length ? selectedSubjects : undefined,
          staff: selectedStaffIds.length ? selectedStaffIds : undefined
        } : undefined
      );
      setProgress(80);

      if (result.success) {
        setProgress(100);
        setIsGenerating(false);
        
        toast({
          title: "Success!",
          description: `AI-powered timetable generated successfully! Created ${result.entriesCount} entries using Gemini 1.5 Pro.`,
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
    : allSubjects.filter(s => s.semester.toString() === selectedSemester && (selectedDepartments.length === 0 || selectedDepartments.includes(s.department_id)));
  const allFilteredStaff = allStaff.filter(st => selectedDepartments.length === 0 || selectedDepartments.includes(st.department_id));
  const allTimingIds = availableTimings.map(t => t.id);
  const deptNameMap = useMemo(() => Object.fromEntries(departments.map(d => [d.id, d.name])), [departments]);

  const selectAll = (type: 'sections' | 'subjects' | 'staff' | 'timings') => {
    switch(type){
      case 'sections': setSelectedSections(allSectionsSelectable.map(s=>s.id)); break;
      case 'subjects': setSelectedSubjects(allFilteredSubjects.map(s=>s.id)); break;
      case 'staff': setSelectedStaffIds(allFilteredStaff.map(s=>s.id)); break;
      case 'timings': setSelectedTimingIds(allTimingIds); break;
    }
  };
  const clearAll = (type: 'sections' | 'subjects' | 'staff' | 'timings') => {
    switch(type){
      case 'sections': setSelectedSections([]); break;
      case 'subjects': setSelectedSubjects([]); break;
      case 'staff': setSelectedStaffIds([]); break;
      case 'timings': setSelectedTimingIds([]); break;
    }
  };

  // Auto-update selected sections when semester or departments change
  useEffect(()=>{
    setSelectedSections(filteredAutoSections.map(s=>s.id));
  }, [filteredAutoSections]);

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
                          className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                            selectedDepartments.includes(dept.id)
                              ? "border-primary bg-primary/5"
                              : "border-border"
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
                              <p className="font-medium">{dept.name}</p>
                              <p className="text-xs text-muted-foreground">Code: {dept.code}</p>
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
            <CardContent className="space-y-4">
              {/* Sections (auto, read-only) */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Sections (auto-selected)</h4>
                    <div className="flex flex-wrap gap-2">
                      {allSectionsSelectable.length === 0 && <span className="text-xs text-muted-foreground">Select a department to load sections.</span>}
                      {allSectionsSelectable.map(sec => {
                        const deptName = deptNameMap[sec.department_id] || 'Dept';
                        return (
                          <span key={sec.id} className="px-2 py-1 text-xs rounded border bg-muted/40" title={deptName}>{sec.name}-{deptName}</span>
                        );
                      })}
                    </div>
                  </div>
                  {/* Subjects */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-semibold">Subjects {showAllSubjects ? '(All Departments)' : ''}</h4>
                        <label className="flex items-center gap-2 text-[11px] font-normal">
                          <Checkbox checked={showAllSubjects} onCheckedChange={v=>setShowAllSubjects(!!v)} />
                          <span>Show all subjects (cross-department)</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={()=>selectAll('subjects')}>Select All</Button>
                        <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={()=>clearAll('subjects')}>Clear</Button>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3 max-h-48 overflow-y-auto pr-1">
                      {allFilteredSubjects.map(sub => {
                        const deptName = deptNameMap[sub.department_id] || 'Dept';
                        return (
                          <label key={sub.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer ${selectedSubjects.includes(sub.id)?'bg-primary/10 border-primary':'border-border'}`}
                            onClick={()=>toggleInList(sub.id, selectedSubjects, setSelectedSubjects)} title={`${sub.name} (${sub.code}) • ${deptName}`}>
                            <Checkbox checked={selectedSubjects.includes(sub.id)} onCheckedChange={()=>{}} />
                            <span className="truncate">{sub.name} <span className="font-semibold">({sub.code})</span></span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  {/* Staff */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">Staff</h4>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={()=>selectAll('staff')}>Select All</Button>
                        <Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={()=>clearAll('staff')}>Clear</Button>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3 max-h-44 overflow-y-auto pr-1">
                      {allFilteredStaff.map(st => (
                        <label key={st.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer ${selectedStaffIds.includes(st.id)?'bg-primary/10 border-primary':'border-border'}`}
                          onClick={()=>toggleInList(st.id, selectedStaffIds, setSelectedStaffIds)}>
                          <Checkbox checked={selectedStaffIds.includes(st.id)} onCheckedChange={()=>{}} />
                          <span className="truncate" title={st.name}>{st.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Timings (Informational) */}
                  <div>
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
                </div>
            </CardContent>
          </Card>

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

        {/* AI Features & Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Client-Side AI Features
              </CardTitle>
              <CardDescription>
                Advanced timetable generation powered by Google Gemini AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Direct API integration (no edge functions)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Gemini 1.5 Pro AI model</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Conflict detection & resolution</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Faculty availability optimization</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Room capacity matching</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Algorithm fallback if AI fails</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Subjects</span>
                <span className="font-medium">{stats.subjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Available Rooms</span>
                <span className="font-medium">{stats.rooms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Faculty Members</span>
                <span className="font-medium">{stats.staff}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Time Slots/Day</span>
                <span className="font-medium">{stats.timeSlots}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || needsSupabase}
              size="lg" 
              className="w-full gap-2 animate-glow"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "Generating..." : "Generate with AI"}
            </Button>
            
            {/* Removed Simple Algorithm button. Only AI generation is available. */}
            
            <Button 
              onClick={handleDatabaseDiagnostic}
              disabled={isGenerating}
              size="sm" 
              variant="ghost"
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
            >
              <Database className="w-4 h-4" />
              Debug Database Issues
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}