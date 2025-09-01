import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Edit3, RefreshCw, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const timeSlots = [
  "9:00-10:00",
  "10:00-11:00", 
  "11:15-12:15",
  "12:15-13:15",
  "14:00-15:00",
  "15:00-16:00"
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const subjectColors: Record<string, string> = {
  "Mathematics": "bg-blue-100 text-blue-800 border-blue-200",
  "Physics": "bg-green-100 text-green-800 border-green-200",
  "Chemistry": "bg-purple-100 text-purple-800 border-purple-200",
  "English": "bg-orange-100 text-orange-800 border-orange-200",
  "Computer Science": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Biology": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "History": "bg-amber-100 text-amber-800 border-amber-200",
  "Sports": "bg-red-100 text-red-800 border-red-200"
};

interface TimetableEntry {
  id: string;
  day_of_week: number;
  time_slot: number;
  sections: { name: string };
  subjects: { name: string; code: string };
  staff: { name: string };
  rooms: { room_number: string };
}

export default function TimetableView() {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchSections();
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedSection && selectedSemester) {
      fetchTimetable();
    }
  }, [selectedSection, selectedSemester]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from('departments').select('*');
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive"
      });
    }
  };

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('department_id', selectedDepartment);
      
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast({
        title: "Error",
        description: "Failed to load sections",
        variant: "destructive"
      });
    }
  };

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('timetables')
        .select(`
          *,
          sections:section_id(name),
          subjects:subject_id(name, code),
          staff:staff_id(name),
          rooms:room_id(room_number)
        `)
        .eq('section_id', selectedSection)
        .eq('semester', parseInt(selectedSemester));

      if (error) throw error;
      setTimetableData(data as TimetableEntry[] || []);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      toast({
        title: "Error",
        description: "Failed to load timetable data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimetableEntry = (day: number, timeSlot: number) => {
    return timetableData.find(entry => 
      entry.day_of_week === day && entry.time_slot === timeSlot
    );
  };

  const selectedDeptName = departments.find(d => d.id === selectedDepartment)?.name || "";
  const selectedSectionName = sections.find(s => s.id === selectedSection)?.name || "";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timetable View</h1>
          <p className="text-muted-foreground">
            View and manage generated timetables
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Edit3 className="w-4 h-4" />
            Edit
          </Button>
          <Button size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Timetable Filters
          </CardTitle>
          <CardDescription>
            Select department and section to view timetable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={selectedSection} 
              onValueChange={setSelectedSection}
              disabled={!selectedDepartment}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Sem 1</SelectItem>
                <SelectItem value="2">Sem 2</SelectItem>
                <SelectItem value="3">Sem 3</SelectItem>
                <SelectItem value="4">Sem 4</SelectItem>
                <SelectItem value="5">Sem 5</SelectItem>
                <SelectItem value="6">Sem 6</SelectItem>
                <SelectItem value="7">Sem 7</SelectItem>
                <SelectItem value="8">Sem 8</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDeptName && selectedSectionName ? 
              `${selectedDeptName} - ${selectedSectionName} Timetable` : 
              "Timetable"}
          </CardTitle>
          <CardDescription>
            {selectedSemester && selectedSectionName ? 
              `Semester ${selectedSemester} | ${timetableData.length} entries loaded` : 
              "Select department, section and semester to view timetable"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !selectedSection || !selectedSemester ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Please select department, section and semester to view timetable</p>
            </div>
          ) : timetableData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No timetable data found for the selected criteria</p>
              <p className="text-sm mt-1">Generate a timetable first using the Generate Timetable page</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-2 min-w-full">
                {/* Header */}
                <div className="font-semibold p-3 bg-muted rounded-lg text-center">
                  Time
                </div>
                {days.map(day => (
                  <div key={day} className="font-semibold p-3 bg-muted rounded-lg text-center">
                    {day}
                  </div>
                ))}

                {/* Time slots and schedule */}
                {timeSlots.map((timeSlot, index) => (
                  <div key={timeSlot} className="contents">
                    <div className="p-3 bg-muted/50 rounded-lg text-center font-medium text-sm">
                      {timeSlot}
                    </div>
                    {days.map((day, dayIndex) => {
                      const entry = getTimetableEntry(dayIndex + 1, index + 1);
                      
                      if (!entry) {
                        return (
                          <div key={`${day}-${timeSlot}`} className="p-3 border border-dashed border-muted rounded-lg text-center text-muted-foreground text-sm">
                            Free
                          </div>
                        );
                      }

                      return (
                        <div key={`${day}-${timeSlot}`} className="p-3 border rounded-lg hover:shadow-sm transition-shadow">
                          <Badge className={`${subjectColors[entry.subjects.name] || "bg-gray-100 text-gray-800"} mb-2 text-xs`}>
                            {entry.subjects.code}
                          </Badge>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{entry.subjects.name}</p>
                            <p className="text-xs text-muted-foreground">{entry.staff.name}</p>
                            <p className="text-xs text-muted-foreground">Room: {entry.rooms.room_number}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
