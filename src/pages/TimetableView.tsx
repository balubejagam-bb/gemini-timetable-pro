import { useState, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Edit3, RefreshCw, Calendar, Grid, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const timeSlots = [
  "9:00-10:00",
  "10:00-11:00", 
  "11:15-12:15",
  "12:15-13:15",
  "14:00-15:00",
  "15:00-16:00",
  "16:00-17:00",
  "17:00-18:00"
];

// Monday to Friday only (as requested)
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const subjectColors: Record<string, string> = {
  "Mathematics": "bg-blue-100 text-blue-800 border-blue-200",
  "Physics": "bg-green-100 text-green-800 border-green-200",
  "Chemistry": "bg-purple-100 text-purple-800 border-purple-200",
  "English": "bg-orange-100 text-orange-800 border-orange-200",
  "Computer Science": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Biology": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "History": "bg-amber-100 text-amber-800 border-amber-200",
  "Sports": "bg-red-100 text-red-800 border-red-200",
  "default": "bg-gray-100 text-gray-800 border-gray-200"
};

interface TimetableEntry {
  id: string;
  day_of_week: number;
  time_slot: number;
  semester: number;
  sections: { name: string; department_id: string };
  subjects: { name: string; code: string };
  staff: { name: string };
  rooms: { room_number: string };
}

interface AllTimetablesData {
  [departmentId: string]: {
    departmentName: string;
    sections: {
      [sectionId: string]: {
        sectionName: string;
        semester: number;
        entries: TimetableEntry[];
      };
    };
  };
}

export default function TimetableView() {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [viewMode, setViewMode] = useState<"single" | "all">("single");
  const [departments, setDepartments] = useState<{id: string; name: string; code: string}[]>([]);
  const [sections, setSections] = useState<{id: string; name: string; semester: number}[]>([]);
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const [allTimetablesData, setAllTimetablesData] = useState<AllTimetablesData>({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedExportKeys, setSelectedExportKeys] = useState<string[]>([]); // deptId|sectionName|semester
  const { toast } = useToast();

  const fetchDepartments = useCallback(async () => {
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
  }, [toast]);

  const fetchSections = useCallback(async () => {
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
  }, [selectedDepartment, toast]);

  const fetchTimetable = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('timetables')
        .select(`
          *,
          sections:section_id(name, department_id),
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
  }, [selectedSection, selectedSemester, toast]);

  const fetchAllTimetables = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('timetables')
        .select(`
          *,
          sections:section_id(name, department_id),
          subjects:subject_id(name, code),
          staff:staff_id(name),
          rooms:room_id(room_number)
        `);

      if (error) throw error;

      // Fetch departments for names
      const { data: departmentsData } = await supabase.from('departments').select('*');
      const departmentsMap = new Map(departmentsData?.map(d => [d.id, d.name]) || []);

      // Group data by department and section
      const groupedData: AllTimetablesData = {};
      
      (data as TimetableEntry[] || []).forEach(entry => {
        const deptId = entry.sections.department_id;
        const deptName = departmentsMap.get(deptId) || 'Unknown Department';
        
        if (!groupedData[deptId]) {
          groupedData[deptId] = {
            departmentName: deptName,
            sections: {}
          };
        }

        const sectionId = entry.sections.name; // Using section name as key for simplicity
        if (!groupedData[deptId].sections[sectionId]) {
          groupedData[deptId].sections[sectionId] = {
            sectionName: entry.sections.name,
            semester: entry.semester,
            entries: []
          };
        }

        groupedData[deptId].sections[sectionId].entries.push(entry);
      });

      setAllTimetablesData(groupedData);
    } catch (error) {
      console.error('Error fetching all timetables:', error);
      toast({
        title: "Error",
        description: "Failed to load all timetables",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchSections();
    }
  }, [selectedDepartment, fetchSections]);

  useEffect(() => {
    if (selectedSection && selectedSemester && viewMode === "single") {
      fetchTimetable();
    }
  }, [selectedSection, selectedSemester, viewMode, fetchTimetable]);

  useEffect(() => {
    if (viewMode === "all") {
      fetchAllTimetables();
    }
  }, [viewMode, fetchAllTimetables]);

  const getTimetableEntry = (entries: TimetableEntry[], day: number, timeSlot: number) => {
    return entries.find(entry => 
      entry.day_of_week === day && entry.time_slot === timeSlot
    );
  };

  const renderTimetableGrid = (entries: TimetableEntry[], title: string, exportKey?: string) => (
    <Card className="mb-6 timetable-grid-export" data-export-key={exportKey || ''}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{entries.length} entries loaded</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-6 gap-2 min-w-full">
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
                  const entry = getTimetableEntry(entries, dayIndex + 1, index + 1);
                  
                  if (!entry) {
                    return (
                      <div key={`${day}-${timeSlot}`} className="p-3 border border-dashed border-muted rounded-lg text-center text-muted-foreground text-sm">
                        Free Period
                      </div>
                    );
                  }

                  return (
                    <div key={`${day}-${timeSlot}`} className="p-3 border rounded-lg hover:shadow-sm transition-shadow">
                      <Badge className={`${subjectColors[entry.subjects.name] || subjectColors.default} mb-2 text-xs`}>
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
      </CardContent>
    </Card>
  );

  const selectedDeptName = departments.find(d => d.id === selectedDepartment)?.name || "";
  const selectedSectionName = sections.find(s => s.id === selectedSection)?.name || "";

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      if (viewMode === 'single') {
        if (!timetableData.length) {
          toast({ title: 'Nothing to export', description: 'Load a timetable first', variant: 'destructive' });
          return;
        }
        const element = document.getElementById('single-timetable-export');
        if (!element) {
          toast({ title: 'Error', description: 'Could not find timetable element', variant: 'destructive' });
          return;
        }
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const usableWidth = pageWidth - margin * 2;
        const imgHeight = canvas.height * (usableWidth / canvas.width);
        let y = margin;
        if (imgHeight < pageHeight - margin * 2) {
          // center vertically if shorter
          y = (pageHeight - imgHeight) / 2;
        }
        pdf.addImage(imgData, 'PNG', margin, y, usableWidth, imgHeight);
        const fileName = `${selectedDeptName || 'Department'}-${selectedSectionName || 'Section'}-Sem${selectedSemester || ''}-timetable.pdf`.replace(/\s+/g, '_');
        pdf.save(fileName);
      } else {
        // all timetables: optionally filter by selectedExportKeys
        const allGrids = Array.from(document.querySelectorAll('.timetable-grid-export')) as HTMLElement[];
        const grids = selectedExportKeys.length
          ? allGrids.filter(g => selectedExportKeys.includes(g.dataset.exportKey || ''))
          : allGrids;
        if (!grids.length) {
          toast({ title: 'Nothing to export', description: 'No timetables loaded', variant: 'destructive' });
          return;
        }
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        let first = true;
        for (const grid of Array.from(grids)) {
          const canvas = await html2canvas(grid as HTMLElement, { scale: 2, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          if (!first) pdf.addPage();
          const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const usableWidth = pageWidth - margin * 2;
            const imgHeight = canvas.height * (usableWidth / canvas.width);
            let y = margin;
            if (imgHeight < pageHeight - margin * 2) {
              y = (pageHeight - imgHeight) / 2;
            }
            pdf.addImage(imgData, 'PNG', margin, y, usableWidth, imgHeight);
          first = false;
        }
        const nameSuffix = selectedExportKeys.length ? 'selected' : 'all';
        pdf.save(`${nameSuffix}-timetables.pdf`);
      }
      toast({ title: 'Exported', description: 'PDF downloaded successfully' });
    } catch (err) {
      console.error('PDF export error', err);
      toast({ title: 'Export failed', description: 'Could not generate PDF', variant: 'destructive' });
    } finally {
      setExporting(false);
      setExportDialogOpen(false);
    }
  };

  const toggleExportKey = (key: string) => {
    setSelectedExportKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const selectAllExports = () => {
    const keys: string[] = [];
    Object.entries(allTimetablesData).forEach(([deptId, dept]) => {
      Object.entries(dept.sections).forEach(([sectionKey, section]) => {
        keys.push(`${deptId}|${section.sectionName}|${section.semester}`);
      });
    });
    setSelectedExportKeys(keys);
  };

  const clearAllExports = () => setSelectedExportKeys([]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timetable View</h1>
          <p className="text-muted-foreground">
            View and manage generated timetables (Monday to Friday)
          </p>
        </div>
        <div className="flex gap-2">
          {viewMode === 'all' ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setExportDialogOpen(true)}
              disabled={exporting || (viewMode === 'all' && !Object.keys(allTimetablesData).length)}
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportPDF}
              disabled={exporting || (viewMode === 'single' && !timetableData.length)}
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          )}
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

      {/* View Mode Selector */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "single" | "all")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Single Timetable
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Grid className="w-4 h-4" />
            All Timetables
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          {/* Filters for Single View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timetable Filters
              </CardTitle>
              <CardDescription>
                Select department and section to view specific timetable
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

          {/* Single Timetable Display */}
          {loading ? (
            <Card>
              <CardContent className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : !selectedSection || !selectedSemester ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <p>Please select department, section and semester to view timetable</p>
              </CardContent>
            </Card>
          ) : timetableData.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <p>No timetable data found for the selected criteria</p>
                <p className="text-sm mt-1">Generate a timetable first using the Generate Timetable page</p>
              </CardContent>
            </Card>
          ) : (
            <div id="single-timetable-export">
              {renderTimetableGrid(
                timetableData,
                `${selectedDeptName} - ${selectedSectionName} Timetable (Semester ${selectedSemester})`
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          {/* All Timetables Display */}
          {loading ? (
            <Card>
              <CardContent className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : Object.keys(allTimetablesData).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <p>No timetable data found</p>
                <p className="text-sm mt-1">Generate timetables first using the Generate Timetable page</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(allTimetablesData).map(([deptId, department]) => (
                <div key={deptId}>
                  <h2 className="text-2xl font-bold mb-4">{department.departmentName}</h2>
                  {Object.entries(department.sections).map(([sectionKey, section]) => (
                    renderTimetableGrid(
                      section.entries,
                      `${section.sectionName} - Semester ${section.semester}`,
                      `${deptId}|${section.sectionName}|${section.semester}`
                    )
                  ))}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Timetables to Export</DialogTitle>
            <DialogDescription>
              Choose specific section timetables. Leave all unselected to export every timetable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-2">
            <div className="flex gap-2 flex-wrap">
              <Button type="button" size="sm" variant="outline" onClick={selectAllExports}>Select All</Button>
              <Button type="button" size="sm" variant="outline" onClick={clearAllExports}>Clear All</Button>
              <div className="text-xs text-muted-foreground self-center">{selectedExportKeys.length} selected</div>
            </div>
            <div className="space-y-6">
              {Object.entries(allTimetablesData).map(([deptId, dept]) => (
                <div key={deptId} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">{dept.departmentName}</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(dept.sections).map(([sectionKey, section]) => {
                      const key = `${deptId}|${section.sectionName}|${section.semester}`;
                      const checked = selectedExportKeys.includes(key);
                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer text-sm hover:bg-muted/40 transition ${checked ? 'border-primary bg-primary/5' : 'border-border'}`}
                          onClick={() => toggleExportKey(key)}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => {}} className="mt-0.5" />
                          <span>{section.sectionName} (Sem {section.semester})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setExportDialogOpen(false)} disabled={exporting}>Cancel</Button>
            <Button type="button" onClick={handleExportPDF} disabled={exporting} className="gap-2">
              {exporting ? 'Exporting...' : `Export ${selectedExportKeys.length ? 'Selected' : 'All'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
