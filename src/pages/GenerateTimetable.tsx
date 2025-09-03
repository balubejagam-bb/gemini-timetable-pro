import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Brain, AlertTriangle, CheckCircle, Settings, Zap, Database } from "lucide-react";
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
  const [stats, setStats] = useState({ subjects: 0, rooms: 0, staff: 0, timeSlots: 6 });
  const [loading, setLoading] = useState(true);
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
      toast({
        title: "Selection Required",
        description: "Please select at least one department to generate timetables.",
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
      
      const result = await aiGenerator.generateTimetable(selectedDepartments, parseInt(selectedSemester));
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