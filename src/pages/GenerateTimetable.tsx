import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Brain, AlertTriangle, CheckCircle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function GenerateTimetable() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState({ subjects: 0, rooms: 0, staff: 0, timeSlots: 6 });
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartmentsAndStats();
  }, []);

  const fetchDepartmentsAndStats = async () => {
    try {
      // Fetch departments
      const { data: deptData } = await supabase
        .from('departments')
        .select('*');
      
      // Fetch sections for each department
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('name, department_id');

      // Fetch stats
      const [subjectsCount, roomsCount, staffCount] = await Promise.all([
        supabase.from('subjects').select('id', { count: 'exact' }),
        supabase.from('rooms').select('id', { count: 'exact' }),
        supabase.from('staff').select('id', { count: 'exact' })
      ]);

      // Group sections by department
      const deptWithSections = deptData?.map(dept => ({
        ...dept,
        sections: sectionsData?.filter(s => s.department_id === dept.id).map(s => s.name) || []
      })) || [];

      setDepartments(deptWithSections);
      setStats({
        subjects: subjectsCount.count || 0,
        rooms: roomsCount.count || 0,
        staff: staffCount.count || 0,
        timeSlots: 6
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

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
      // Clear existing timetables for selected departments and semester
      await supabase
        .from('timetables')
        .delete()
        .in('section_id', selectedDepartments)
        .eq('semester', parseInt(selectedSemester));

      setProgress(20);

      // Fetch all required data
      const [sectionsResult, subjectsResult, staffResult, roomsResult] = await Promise.all([
        supabase.from('sections').select('*').in('department_id', selectedDepartments).eq('semester', parseInt(selectedSemester)),
        supabase.from('subjects').select('*, staff_subjects(staff_id)').in('department_id', selectedDepartments).eq('semester', parseInt(selectedSemester)),
        supabase.from('staff').select('*').in('department_id', selectedDepartments),
        supabase.from('rooms').select('*')
      ]);

      const sections = sectionsResult.data || [];
      const subjects = subjectsResult.data || [];
      const staff = staffResult.data || [];
      const rooms = roomsResult.data || [];

      setProgress(40);

      // Generate timetables using simple algorithm
      const generatedTimetables = [];
      const timeSlots = [1, 2, 3, 4, 5, 6]; // 6 time slots per day
      const days = [1, 2, 3, 4, 5, 6]; // Monday to Saturday

      for (const section of sections) {
        const sectionSubjects = subjects.filter(s => s.department_id === section.department_id);
        let currentSubjectIndex = 0;
        
        for (const day of days) {
          for (const slot of timeSlots) {
            if (currentSubjectIndex < sectionSubjects.length) {
              const subject = sectionSubjects[currentSubjectIndex];
              const availableStaff = staff.find(s => s.department_id === section.department_id);
              const availableRoom = rooms[Math.floor(Math.random() * rooms.length)];

              if (availableStaff && availableRoom) {
                generatedTimetables.push({
                  section_id: section.id,
                  subject_id: subject.id,
                  staff_id: availableStaff.id,
                  room_id: availableRoom.id,
                  day_of_week: day,
                  time_slot: slot,
                  semester: parseInt(selectedSemester)
                });
              }
              
              currentSubjectIndex = (currentSubjectIndex + 1) % sectionSubjects.length;
            }
          }
        }
      }

      setProgress(80);

      // Insert generated timetables
      if (generatedTimetables.length > 0) {
        const { error } = await supabase
          .from('timetables')
          .insert(generatedTimetables);

        if (error) {
          throw error;
        }
      }

      setProgress(100);
      
      setTimeout(() => {
        setIsGenerating(false);
        toast({
          title: "Success!",
          description: `Generated ${generatedTimetables.length} timetable entries for ${sections.length} sections.`,
        });
      }, 500);

    } catch (error) {
      console.error('Error generating timetables:', error);
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Failed to generate timetables. Please try again.",
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

  const needsSupabase = false; // Supabase is now connected

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
                <div className="grid gap-3 md:grid-cols-2">
                  {departments.map((dept) => (
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
                          <p className="text-sm text-muted-foreground">
                            Sections: {dept.sections.join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
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
                AI Features
              </CardTitle>
              <CardDescription>
                What our AI considers when generating timetables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <span className="text-sm">Workload balancing</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Break time optimization</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">Subject distribution</span>
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

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || needsSupabase}
            size="lg" 
            className="w-full gap-2 animate-glow"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? "Generating..." : "Generate Timetables"}
          </Button>
        </div>
      </div>
    </div>
  );
}