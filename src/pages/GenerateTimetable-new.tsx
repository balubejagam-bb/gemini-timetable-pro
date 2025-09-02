import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Sparkles, Brain, AlertTriangle, CheckCircle, Settings, Zap, Database } from "lucide-react";
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
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState({ subjects: 0, rooms: 0, staff: 0, timeSlots: 6 });
  const [loading, setLoading] = useState(true);
  const [advancedMode, setAdvancedMode] = useState(false);
  
  // Search filters
  const [subjectFilter, setSubjectFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  
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
          .select("id, name, department_id, semester, departments(name)");

        if (secError) throw secError;
        setSections(secData || []);
        
        // Fetch subjects
        const { data: subData, error: subError } = await supabase
          .from("subjects")
          .select("id, name, code, credits, hours_per_week, department_id, semester, subject_type, departments(name)");
          
        if (subError) throw subError;
        setSubjects(subData || []);
        
        // Fetch staff
        const { data: staffData, error: staffError } = await supabase
          .from("staff")
          .select("id, name, email, phone, designation, department_id, max_hours_per_week, departments(name)");
          
        if (staffError) throw staffError;
        setStaff(staffData || []);
        
        // Fetch rooms
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("id, room_number, capacity, room_type, building, floor");
          
        if (roomError) throw roomError;
        setRooms(roomData || []);
        
        // Update stats
        setStats({
          subjects: subData?.length || 0,
          staff: staffData?.length || 0,
          rooms: roomData?.length || 0,
          timeSlots: 6
        });

        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleGenerate = async () => {
    // Check if basic selections are made
    if (!advancedMode && selectedDepartments.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one department to generate timetables.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if advanced selections are made
    if (advancedMode && selectedSubjects.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one subject to generate timetables.",
        variant: "destructive"
      });
      return;
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
      
      // Prepare generation parameters
      const generationParams = {
        departments: selectedDepartments,
        semester: parseInt(selectedSemester),
        sections: selectedSections.length > 0 ? selectedSections : undefined,
        subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined,
        staff: selectedStaff.length > 0 ? selectedStaff : undefined,
        advancedMode: advancedMode
      };
      
      console.log('Generation parameters:', generationParams);
      
      // Call generation with new parameters
      const result = await aiGenerator.generateTimetable(
        selectedDepartments, 
        parseInt(selectedSemester),
        {
          sections: selectedSections.length > 0 ? selectedSections : undefined,
          subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined,
          staff: selectedStaff.length > 0 ? selectedStaff : undefined,
          advancedMode: advancedMode
        }
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

    } catch (error: any) {
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
    } catch (error: any) {
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
    
    // Clear section, subject and staff selections when departments change
    if (!advancedMode) {
      setSelectedSections([]);
      setSelectedSubjects([]);
      setSelectedStaff([]);
    }
  };
  
  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };
  
  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };
  
  const toggleStaff = (staffId: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const needsSupabase = false; // Database is connected and has sample data

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
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Generation Mode</label>
                <div className="flex items-center space-x-2">
                  <label className={`text-sm cursor-pointer ${!advancedMode ? 'font-medium' : 'text-muted-foreground'}`}>
                    Standard
                  </label>
                  <button 
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      advancedMode ? 'bg-primary' : 'bg-gray-200'
                    }`}
                    onClick={() => setAdvancedMode(!advancedMode)}
                  >
                    <span 
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        advancedMode ? 'translate-x-4' : 'translate-x-0'
                      }`} 
                    />
                  </button>
                  <label className={`text-sm cursor-pointer ${advancedMode ? 'font-medium' : 'text-muted-foreground'}`}>
                    Advanced
                  </label>
                </div>
              </div>
              
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
                      const deptSections = sections.filter(s => s.department_id === dept.id);
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
                              <p className="text-sm text-muted-foreground">
                                Sections: {deptSections.length > 0 ? deptSections.map(s => s.name).join(", ") : "None"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Advanced Mode - Section Selection */}
              {advancedMode && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium">
                      Select Specific Sections ({selectedSections.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const filteredSections = sections.filter(section => 
                            selectedDepartments.length === 0 || selectedDepartments.includes(section.department_id)
                          );
                          setSelectedSections(filteredSections.map(s => s.id));
                        }}
                        className="text-xs h-7 px-2"
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedSections([])}
                        className="text-xs h-7 px-2"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  {loading ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="p-4 border rounded-lg animate-pulse">
                          <div className="h-4 bg-muted rounded mb-2"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : sections.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No sections available.</p>
                      <p className="text-sm mt-1">Please add sections in the Sections page first.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2">
                        <Input
                          type="text"
                          placeholder="Search sections..."
                          value={sectionFilter}
                          onChange={(e) => setSectionFilter(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 max-h-60 overflow-y-auto p-1">
                        {sections
                          .filter(section => 
                            (selectedDepartments.length === 0 || selectedDepartments.includes(section.department_id)) &&
                            (sectionFilter === '' || 
                              section.name.toLowerCase().includes(sectionFilter.toLowerCase()) ||
                              (section.departments?.name || '').toLowerCase().includes(sectionFilter.toLowerCase()))
                          )
                          .map((section) => (
                            <div
                              key={section.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                                selectedSections.includes(section.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-border"
                              }`}
                              onClick={() => toggleSection(section.id)}
                            >
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={selectedSections.includes(section.id)}
                                  onChange={() => {}}
                                  className="mt-1"
                                />
                                <div>
                                  <p className="font-medium">{section.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {section.departments?.name} - Semester {section.semester}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Advanced Mode - Subject Selection */}
              {advancedMode && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium">
                      Select Specific Subjects ({selectedSubjects.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const filteredSubjects = subjects.filter(subject => 
                            (selectedDepartments.length === 0 || selectedDepartments.includes(subject.department_id)) &&
                            (selectedSemester === "" || subject.semester.toString() === selectedSemester)
                          );
                          setSelectedSubjects(filteredSubjects.map(s => s.id));
                        }}
                        className="text-xs h-7 px-2"
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedSubjects([])}
                        className="text-xs h-7 px-2"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  {loading ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="p-4 border rounded-lg animate-pulse">
                          <div className="h-4 bg-muted rounded mb-2"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No subjects available.</p>
                      <p className="text-sm mt-1">Please add subjects in the Subjects page first.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2">
                        <Input
                          type="text"
                          placeholder="Search subjects..."
                          value={subjectFilter}
                          onChange={(e) => setSubjectFilter(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 max-h-60 overflow-y-auto p-1">
                        {subjects
                          .filter(subject => 
                            (selectedDepartments.length === 0 || selectedDepartments.includes(subject.department_id)) &&
                            (selectedSemester === "" || subject.semester.toString() === selectedSemester) &&
                            (subjectFilter === '' || 
                              subject.name.toLowerCase().includes(subjectFilter.toLowerCase()) ||
                              subject.code.toLowerCase().includes(subjectFilter.toLowerCase()) ||
                              (subject.departments?.name || '').toLowerCase().includes(subjectFilter.toLowerCase()))
                          )
                          .map((subject) => (
                            <div
                              key={subject.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                                selectedSubjects.includes(subject.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-border"
                              }`}
                              onClick={() => toggleSubject(subject.id)}
                            >
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={selectedSubjects.includes(subject.id)}
                                  onChange={() => {}}
                                  className="mt-1"
                                />
                                <div>
                                  <p className="font-medium">{subject.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {subject.code} - {subject.credits} credits ({subject.hours_per_week} hrs/week)
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {subject.departments?.name} - Semester {subject.semester}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Advanced Mode - Staff Selection */}
              {advancedMode && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium">
                      Select Preferred Staff ({selectedStaff.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const filteredStaff = staff.filter(staffMember => 
                            selectedDepartments.length === 0 || selectedDepartments.includes(staffMember.department_id)
                          );
                          setSelectedStaff(filteredStaff.map(s => s.id));
                        }}
                        className="text-xs h-7 px-2"
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedStaff([])}
                        className="text-xs h-7 px-2"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  {loading ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="p-4 border rounded-lg animate-pulse">
                          <div className="h-4 bg-muted rounded mb-2"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : staff.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No staff available.</p>
                      <p className="text-sm mt-1">Please add staff in the Staff page first.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2">
                        <Input
                          type="text"
                          placeholder="Search staff..."
                          value={staffFilter}
                          onChange={(e) => setStaffFilter(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 max-h-60 overflow-y-auto p-1">
                        {staff
                          .filter(staffMember => 
                            (selectedDepartments.length === 0 || selectedDepartments.includes(staffMember.department_id)) &&
                            (staffFilter === '' || 
                              staffMember.name.toLowerCase().includes(staffFilter.toLowerCase()) ||
                              (staffMember.departments?.name || '').toLowerCase().includes(staffFilter.toLowerCase()) ||
                              (staffMember.designation || '').toLowerCase().includes(staffFilter.toLowerCase()))
                          )
                          .map((staffMember) => (
                            <div
                              key={staffMember.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                                selectedStaff.includes(staffMember.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-border"
                              }`}
                              onClick={() => toggleStaff(staffMember.id)}
                            >
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={selectedStaff.includes(staffMember.id)}
                                  onChange={() => {}}
                                  className="mt-1"
                                />
                                <div>
                                  <p className="font-medium">{staffMember.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {staffMember.designation} - {staffMember.max_hours_per_week} hrs/week
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {staffMember.departments?.name}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                <span className="text-sm">Advanced selection mode</span>
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
              {isGenerating 
                ? "Generating..." 
                : advancedMode 
                  ? "Generate Custom Timetable"
                  : "Generate with AI"
              }
            </Button>
            
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
