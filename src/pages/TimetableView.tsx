import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Download, Edit3, RefreshCw, Calendar, Grid, Eye, Search, Printer, RotateCcw, User, X, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { TimetableTemplate } from "@/components/TimetableTemplate";
import { TimetableEditor } from "@/components/TimetableEditor";

const timeSlots = [
  "9:00-10:00",
  "10:00-11:00", 
  "11:15-12:15",
  "12:15-13:15",
  "14:00-15:00",
  "15:00-16:00"
];

// Monday to Friday only (as requested)
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const subjectColors: Record<string, string> = {
  "Mathematics": "bg-gradient-to-br from-sky-100 to-sky-200 text-sky-800 border-sky-300",
  "Physics": "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border-blue-300",
  "Chemistry": "bg-gradient-to-br from-cyan-100 to-cyan-200 text-cyan-800 border-cyan-300",
  "English": "bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-800 border-indigo-300",
  "Computer Science": "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border-blue-300",
  "Biology": "bg-gradient-to-br from-teal-100 to-teal-200 text-teal-800 border-teal-300",
  "History": "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 border-slate-300",
  "Sports": "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border-blue-300",
  "default": "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border-blue-300"
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

interface PersonalizedTimetable {
  id: string;
  student_id: string;
  timetable_json: any;
  generated_at: string;
  model_version?: string;
  students?: { name: string; roll_no: string };
}

interface TimetablePopupData {
  title: string;
  entries: TimetableEntry[] | any;
  type: 'section' | 'student';
  timetableId?: string;
  generatedAt?: string;
}

export default function TimetableView() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
  const [searchTerm, setSearchTerm] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [personalizedTimetables, setPersonalizedTimetables] = useState<PersonalizedTimetable[]>([]);
  const [popupData, setPopupData] = useState<TimetablePopupData | null>(null);
  const [useUniversityTemplate, setUseUniversityTemplate] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCell, setEditingCell] = useState<{ day: number; timeSlot: number; data: { subject: string; code: string; staff: string; room: string } | null } | null>(null);
  const [editedTimetableData, setEditedTimetableData] = useState<TimetableEntry[]>([]);
  
  // New states for advanced filtering
  const [availableTimetables, setAvailableTimetables] = useState<{
    id: string;
    sectionName: string;
    sectionId: string;
    departmentName: string;
    semester: number;
    count: number;
  }[]>([]);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSearchTerm, setFilterSearchTerm] = useState("");
  
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

  // Fetch available timetables based on filters
  const fetchAvailableTimetables = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('timetables')
        .select(`
          section_id,
          semester,
          sections:section_id(id, name, department_id),
          departments:sections(departments:department_id(name))
        `);

      if (selectedDepartment) {
        query = query.eq('sections.department_id', selectedDepartment);
      }
      
      if (selectedSection) {
        query = query.eq('section_id', selectedSection);
      }
      
      if (selectedSemester) {
        query = query.eq('semester', parseInt(selectedSemester));
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by section and semester
      const grouped = new Map<string, {
        sectionId: string;
        sectionName: string;
        departmentName: string;
        semester: number;
        count: number;
      }>();

      (data || []).forEach((item: any) => {
        const key = `${item.section_id}-${item.semester}`;
        if (grouped.has(key)) {
          grouped.get(key)!.count++;
        } else {
          grouped.set(key, {
            sectionId: item.section_id,
            sectionName: item.sections?.name || 'Unknown',
            departmentName: departments.find(d => d.id === item.sections?.department_id)?.name || 'Unknown',
            semester: item.semester,
            count: 1
          });
        }
      });

      const result = Array.from(grouped.values()).map((item, index) => ({
        id: `${item.sectionId}-${item.semester}`,
        ...item
      }));

      setAvailableTimetables(result);
    } catch (error) {
      console.error('Error fetching available timetables:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, selectedSection, selectedSemester, departments]);

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

  // Function to handle opening the editor with validation
  const handleEditClick = (day: number, timeSlot: number, data: { subject: string; code: string; staff: string; room: string } | null) => {
    // In 'all' view mode, we can't edit since we don't know which section/semester
    if (viewMode === 'all') {
      toast({
        title: "Cannot Edit in All View",
        description: "Please switch to Single View and select a section/semester to edit timetable entries",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedSection || !selectedSemester) {
      toast({
        title: "Selection Required",
        description: "Please select a Department, Section, and Semester from the dropdowns above before editing",
        variant: "destructive"
      });
      return;
    }
    
    setEditingCell({ day, timeSlot, data });
  };

  const handleSaveEdit = async (editedData: {
    subject: string;
    code: string;
    staff: string;
    room: string;
    type: string;
  }) => {
    if (!editingCell) return;

    try {
      // Find the subject, staff, and room IDs
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, code')
        .or(`name.eq.${editedData.subject},code.eq.${editedData.code}`)
        .limit(1);

      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name')
        .eq('name', editedData.staff)
        .limit(1);

      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, room_number')
        .eq('room_number', editedData.room)
        .limit(1);

      if (!subjects?.[0] || !staffData?.[0] || !rooms?.[0]) {
        toast({
          title: "Error",
          description: "Subject, Staff, or Room not found in the database",
          variant: "destructive"
        });
        return;
      }

      // Check if entry exists
      const { data: existingEntry } = await supabase
        .from('timetables')
        .select('id')
        .eq('section_id', selectedSection)
        .eq('semester', parseInt(selectedSemester))
        .eq('day_of_week', editingCell.day)
        .eq('time_slot', editingCell.timeSlot)
        .limit(1);

      if (existingEntry && existingEntry.length > 0) {
        // Update existing entry
        const { error } = await supabase
          .from('timetables')
          .update({
            subject_id: subjects[0].id,
            staff_id: staffData[0].id,
            room_id: rooms[0].id
          })
          .eq('id', existingEntry[0].id);

        if (error) throw error;
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('timetables')
          .insert({
            section_id: selectedSection,
            semester: parseInt(selectedSemester),
            day_of_week: editingCell.day,
            time_slot: editingCell.timeSlot,
            subject_id: subjects[0].id,
            staff_id: staffData[0].id,
            room_id: rooms[0].id
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Timetable entry updated successfully"
      });

      // Refresh the timetable
      await fetchTimetable();
      setEditingCell(null);
    } catch (error) {
      console.error('Error saving timetable entry:', error);
      toast({
        title: "Error",
        description: "Failed to save timetable entry",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchSections();
    }
  }, [selectedDepartment, fetchSections]);

  // Auto-fetch available timetables when filters change
  useEffect(() => {
    if (viewMode === "single") {
      fetchAvailableTimetables();
    }
  }, [selectedDepartment, selectedSection, selectedSemester, viewMode, fetchAvailableTimetables]);

  useEffect(() => {
    if (selectedSection && selectedSemester && viewMode === "single") {
      fetchTimetable();
    }
  }, [selectedSection, selectedSemester, viewMode, fetchTimetable]);

  useEffect(() => {
    if (viewMode === "all") {
      fetchAllTimetables();
      fetchPersonalizedTimetables();
    }
  }, [viewMode, fetchAllTimetables]);

  const fetchPersonalizedTimetables = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('personalized_timetables')
        .select(`
          *,
          students(name, roll_no)
        `)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setPersonalizedTimetables((data as any) || []);
    } catch (error) {
      console.error('Error fetching personalized timetables:', error);
    }
  }, []);

  const getTimetableEntry = (entries: TimetableEntry[], day: number, timeSlot: number) => {
    return entries.find(entry => 
      entry.day_of_week === day && entry.time_slot === timeSlot
    );
  };

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

  // Handle selecting a timetable from the list
  const handleSelectTimetable = (sectionId: string, semester: number) => {
    setSelectedSection(sectionId);
    setSelectedSemester(semester.toString());
  };

  // Filter available timetables based on search term
  const filteredTimetables = availableTimetables.filter(tt => 
    tt.sectionName.toLowerCase().includes(filterSearchTerm.toLowerCase()) ||
    tt.departmentName.toLowerCase().includes(filterSearchTerm.toLowerCase()) ||
    `Semester ${tt.semester}`.toLowerCase().includes(filterSearchTerm.toLowerCase())
  );

  const handleRegenerate = async () => {
    if (!selectedSection || !selectedSemester) {
      toast({
        title: "Selection Required",
        description: "Please select department, section and semester first",
        variant: "destructive"
      });
      return;
    }
    
    setRegenerating(true);
    try {
      // Navigate to generate page with pre-filled values
      navigate(`/generate?department=${selectedDepartment}&section=${selectedSection}&semester=${selectedSemester}`);
    } catch (error) {
      console.error('Error navigating to generate:', error);
      toast({
        title: "Error",
        description: "Failed to navigate to generation page",
        variant: "destructive"
      });
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Inject temporary styles to improve PDF rendering (prevent overlapping)
  const injectPdfStyles = () => {
    if (document.getElementById('tt-pdf-style')) return;
    const style = document.createElement('style');
    style.id = 'tt-pdf-style';
    style.innerHTML = `
      .timetable-grid-export .grid { table-layout: fixed; }
      .timetable-grid-export .pdf-cell { 
        display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:2px;
        line-height:1.15;white-space:normal;word-break:break-word;min-height:78px;overflow:hidden;
      }
      .timetable-grid-export .pdf-cell p{margin:0;}
      .timetable-grid-export .pdf-badge{align-self:flex-start;}
    `;
    document.head.appendChild(style);
  };
  const removePdfStyles = () => {
    const style = document.getElementById('tt-pdf-style');
    if (style) style.remove();
  };

  const handleDownloadSectionTimetable = async (entries: TimetableEntry[], title: string, exportKey: string) => {
    try {
      setExporting(true);
      
      if (useUniversityTemplate) {
        // Use university template for export
        await exportWithUniversityTemplate(entries, title);
      } else {
        // Use old simple grid export
        injectPdfStyles();
        const element = document.querySelector(`[data-export-key="${exportKey}"]`) as HTMLElement;
        if (!element) {
          toast({ title: 'Error', description: 'Could not find timetable element', variant: 'destructive' });
          return;
        }

        const canvas = await html2canvas(element, { 
          scale: 2, 
          backgroundColor: '#ffffff', 
          useCORS: true, 
          allowTaint: true, 
          logging: false 
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'mm', 'a4');
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
        const fileName = `${title.replace(/\s+/g, '_')}-timetable.pdf`;
        pdf.save(fileName);
        removePdfStyles();
      }
      
      toast({ title: 'Downloaded', description: 'Timetable PDF downloaded successfully' });
    } catch (err) {
      console.error('PDF export error', err);
      toast({ title: 'Export failed', description: 'Could not generate PDF', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportWithUniversityTemplate = async (entries: TimetableEntry[], title: string) => {
    // Convert entries to schedule format
    const schedule: any = {};
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const timeSlotMap: { [key: number]: string } = {
      1: "9:00-10:00",
      2: "10:00-11:00",
      3: "11:15-12:15",
      4: "12:15-13:15",
      5: "14:00-15:00"
    };

    days.forEach(day => {
      schedule[day] = {};
    });

    // Track all rooms used and find most common one
    const roomCounts = new Map<string, number>();
    
    entries.forEach(entry => {
      const dayName = days[entry.day_of_week - 1];
      const timeSlot = timeSlotMap[entry.time_slot];
      if (dayName && timeSlot) {
        schedule[dayName][timeSlot] = {
          subject: entry.subjects.name,
          code: entry.subjects.code,
          staff: entry.staff.name,
          room: entry.rooms.room_number,
          type: entry.subjects.name.toLowerCase().includes('lab') ? 'LAB' : 'Theory'
        };
        
        // Count room usage
        const room = entry.rooms.room_number;
        roomCounts.set(room, (roomCounts.get(room) || 0) + 1);
      }
    });

    // Get the most frequently used room, or "Multiple" if mixed
    let primaryRoom = "Multiple";
    if (roomCounts.size === 1) {
      primaryRoom = Array.from(roomCounts.keys())[0];
    } else if (roomCounts.size > 0) {
      // Find most common room
      let maxCount = 0;
      roomCounts.forEach((count, room) => {
        if (count > maxCount) {
          maxCount = count;
          primaryRoom = room;
        }
      });
    }

    // Extract unique subjects for legend
    const subjectMap = new Map();
    entries.forEach(entry => {
      if (!subjectMap.has(entry.subjects.code)) {
        subjectMap.set(entry.subjects.code, {
          code: entry.subjects.code,
          name: entry.subjects.name,
          faculty: entry.staff.name
        });
      }
    });
    const subjects = Array.from(subjectMap.values());

    // Parse title for department and section info
    const titleParts = title.split('-');
    const sectionInfo = titleParts[0]?.trim() || 'Section';
    const semesterInfo = titleParts[1]?.trim() || 'Semester';

    // Get current academic year and format date
    const today = new Date();
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;
    const formattedDate = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Create a temporary container for the template
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm';
    document.body.appendChild(tempDiv);

    // Render the template using React
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(tempDiv);
    
    await new Promise<void>((resolve) => {
      root.render(
        <TimetableTemplate
          title="SCHOOL OF COMPUTING"
          subtitle={selectedDeptName || "DEPARTMENT"}
          department={selectedDeptName || ""}
          semester={`${semesterInfo} (${currentYear}-${nextYear.toString().slice(-2)})`}
          section={sectionInfo}
          roomNo={primaryRoom}
          effectiveDate={formattedDate}
          schedule={schedule}
          subjects={subjects}
          pageNumber={1}
        />
      );
      setTimeout(resolve, 500); // Wait for rendering
    });

    // Capture and convert to PDF
    const templateElement = tempDiv.querySelector('#timetable-pdf-template') as HTMLElement || tempDiv;
    const canvas = await html2canvas(templateElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123 // A4 height in pixels at 96 DPI
    });

    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    pdf.save(`${title.replace(/\s+/g, '_')}-university-format.pdf`);

    // Cleanup
    root.unmount();
    document.body.removeChild(tempDiv);
  };

  const handleDownloadStudentTimetable = async (timetable: PersonalizedTimetable) => {
    try {
      setExporting(true);
      injectPdfStyles();
      
      const studentName = timetable.students?.name || 'Student';
      const rollNo = timetable.students?.roll_no || '';
      
      // Create a temporary element with the timetable
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '1200px';
      tempDiv.innerHTML = `
        <div class="timetable-grid-export" style="background: white; padding: 20px;">
          <div style="margin-bottom: 20px;">
            <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${studentName} - ${rollNo}</h2>
            <p style="color: #666; font-size: 14px;">Generated: ${new Date(timetable.generated_at).toLocaleDateString()}</p>
          </div>
          <div style="overflow-x: auto;">
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; min-width: 100%;">
              ${renderStudentTimetableHTML(timetable.timetable_json)}
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv.firstChild as HTMLElement, { 
        scale: 2, 
        backgroundColor: '#ffffff', 
        useCORS: true, 
        allowTaint: true, 
        logging: false 
      });
      
      document.body.removeChild(tempDiv);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
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
      const fileName = `${studentName.replace(/\s+/g, '_')}-${rollNo}-timetable.pdf`;
      pdf.save(fileName);
      
      toast({ title: 'Downloaded', description: 'Student timetable PDF downloaded successfully' });
    } catch (err) {
      console.error('PDF export error', err);
      toast({ title: 'Export failed', description: 'Could not generate PDF', variant: 'destructive' });
    } finally {
      setExporting(false);
      removePdfStyles();
    }
  };

  const renderStudentTimetableHTML = (timetableJson: any) => {
    if (!timetableJson || !timetableJson.schedule) return '<div>No data</div>';
    
    let html = `
      <div style="font-weight: 600; padding: 12px; background: #f1f5f9; border-radius: 8px; text-align: center; font-size: 14px;">Time</div>
    `;
    
    days.forEach(day => {
      html += `<div style="font-weight: 600; padding: 12px; background: #f1f5f9; border-radius: 8px; text-align: center; font-size: 14px;">${day}</div>`;
    });
    
    timeSlots.forEach(timeSlot => {
      html += `<div style="padding: 12px; background: rgba(241, 245, 249, 0.5); border-radius: 8px; text-align: center; font-weight: 500; font-size: 12px;">${timeSlot}</div>`;
      
      days.forEach(day => {
        const daySchedule = timetableJson.schedule?.[day] || {};
        const slot = daySchedule[timeSlot];
        
        if (!slot || !slot.subject) {
          const dayIndex = days.indexOf(day);
          const timeSlotIndex = timeSlots.indexOf(timeSlot);
          const freePeriodText = getDefaultFreePeriod(timetableJson.semester || parseInt(selectedSemester), dayIndex, timeSlotIndex);
          html += `<div style="padding: 12px; border: 2px dashed #e2e8f0; border-radius: 8px; text-align: center; color: #94a3b8; font-size: 12px;">${freePeriodText}</div>`;
        } else {
          html += `
            <div style="padding: 8px; border: 1px solid #bfdbfe; border-radius: 8px; background: linear-gradient(to bottom right, #dbeafe, #bfdbfe);">
              <div style="background: #bfdbfe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-block; margin-bottom: 4px; border: 1px solid #93c5fd;">${slot.code || slot.subject.substring(0, 3)}</div>
              <p style="font-size: 12px; font-weight: 500; word-break: break-word; line-height: 1.2; margin: 0;">${slot.subject}</p>
              <p style="font-size: 10px; color: #64748b; word-break: break-word; line-height: 1.2; margin: 0;">${slot.staff || 'TBD'}</p>
              <p style="font-size: 10px; color: #64748b; word-break: break-word; line-height: 1.2; margin: 0;">Room: ${slot.room || 'TBD'}</p>
            </div>
          `;
        }
      });
    });
    
    return html;
  };

  const renderTimetableGrid = (entries: TimetableEntry[], title: string, exportKey?: string, showDownloadButton?: boolean) => (
    <Card className="mb-6 timetable-grid-export" data-export-key={exportKey || ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
            <CardDescription>{entries.length} entries loaded</CardDescription>
          </div>
          {showDownloadButton && exportKey && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadSectionTimetable(entries, title, exportKey);
              }}
              disabled={exporting}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Downloading...' : 'Download'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className={`grid grid-cols-6 gap-1 md:gap-2 min-w-full ${isMobile ? 'text-xs' : ''}`}>
            {/* Header */}
            <div className="font-semibold p-2 md:p-3 bg-muted rounded-lg text-center text-xs md:text-sm">
              Time
            </div>
            {days.map(day => (
              <div key={day} className="font-semibold p-2 md:p-3 bg-muted rounded-lg text-center text-xs md:text-sm">
                {isMobile ? day.substring(0, 3) : day}
              </div>
            ))}

            {/* Time slots and schedule */}
            {timeSlots.map((timeSlot, index) => (
              <div key={timeSlot} className="contents">
                <div className="p-2 md:p-3 bg-muted/50 rounded-lg text-center font-medium text-xs">
                  {isMobile ? timeSlot.split('-')[0] : timeSlot}
                </div>
                {days.map((day, dayIndex) => {
                  const entry = getTimetableEntry(entries, dayIndex + 1, index + 1);
                  
                  if (!entry) {
                    const freePeriodText = getDefaultFreePeriod(parseInt(selectedSemester), dayIndex, index);
                    return (
                      <div key={`${day}-${timeSlot}`} className="p-1 md:p-3 border border-dashed border-muted rounded-lg text-center text-muted-foreground text-xs relative group">
                        {isMobile ? (freePeriodText === 'Library Period' ? 'Library' : 'Intern') : freePeriodText}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => handleEditClick(dayIndex + 1, index + 1, null)}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div key={`${day}-${timeSlot}`} className="p-1 md:p-2 border rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer pdf-cell bg-gradient-to-br from-blue-50 to-blue-100 relative group">
                      <Badge className={`${subjectColors[entry.subjects.name] || subjectColors.default} mb-1 text-[10px] pdf-badge shadow-sm`}>{entry.subjects.code}</Badge>
                      <p className="text-[10px] md:text-xs font-medium break-words w-full leading-tight">{entry.subjects.name}</p>
                      <p className="text-[10px] text-muted-foreground break-words w-full leading-tight">{entry.staff.name}</p>
                      <p className="text-[10px] text-muted-foreground break-words w-full leading-tight">Room: {entry.rooms.room_number}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={() => handleEditClick(
                          dayIndex + 1, 
                          index + 1, 
                          {
                            subject: entry.subjects.name,
                            code: entry.subjects.code,
                            staff: entry.staff.name,
                            room: entry.rooms.room_number
                          }
                        )}
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
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
      injectPdfStyles();
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
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: true, logging: false });
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
          const canvas = await html2canvas(grid as HTMLElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: true, logging: false });
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
  removePdfStyles();
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

  // Filter timetables based on search term
  const filteredTimetablesData = Object.fromEntries(
    Object.entries(allTimetablesData).filter(([_, dept]) =>
      dept.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(dept.sections).some(section =>
        section.sectionName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  );

  // Extend search to student timetables
  const filteredPersonalizedTimetables = personalizedTimetables.filter(timetable =>
    timetable.students?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    timetable.students?.roll_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header - Mobile responsive */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Timetable View</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View and manage generated timetables
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
            <Checkbox
              id="university-template"
              checked={useUniversityTemplate}
              onCheckedChange={(checked) => setUseUniversityTemplate(checked as boolean)}
            />
            <label
              htmlFor="university-template"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              University Format
            </label>
          </div>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className="gap-2"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
            {isMobile ? "Print" : "Print"}
          </Button>
          {viewMode === 'all' ? (
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className="gap-2"
              onClick={() => setExportDialogOpen(true)}
              disabled={exporting || (viewMode === 'all' && !Object.keys(allTimetablesData).length)}
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          ) : (
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className="gap-2"
              onClick={handleExportPDF}
              disabled={exporting || (viewMode === 'single' && !timetableData.length)}
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          )}
          <Button 
            size={isMobile ? "sm" : "default"} 
            className="gap-2"
            onClick={handleRegenerate}
            disabled={regenerating || (!selectedSection && !selectedSemester)}
          >
            <RotateCcw className="w-4 h-4" />
            {regenerating ? 'Loading...' : 'Regenerate'}
          </Button>
        </div>
      </div>

      {/* View Mode Selector - Mobile responsive */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "single" | "all")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4" />
            {isMobile ? "Single" : "Single Timetable"}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2 text-sm">
            <Grid className="w-4 h-4" />
            {isMobile ? "All" : "All Timetables"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          {/* Advanced Filters for Single View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timetable Filters
              </CardTitle>
              <CardDescription>
                Filter and select timetables - Auto-updates as you select
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter Dropdowns */}
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={selectedDepartment || undefined} onValueChange={(val) => {
                  setSelectedDepartment(val || "");
                  setSelectedSection("");
                  setSelectedSemester("");
                }}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Departments" />
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
                  value={selectedSection || undefined} 
                  onValueChange={(val) => {
                    setSelectedSection(val || "");
                    setSelectedSemester("");
                  }}
                  disabled={!selectedDepartment}
                >
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map(section => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSemester || undefined} onValueChange={(val) => setSelectedSemester(val || "")}>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue placeholder="All Semesters" />
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

                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    setSelectedDepartment("");
                    setSelectedSection("");
                    setSelectedSemester("");
                    setFilterSearchTerm("");
                  }}
                  title="Clear all filters"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search timetables by section, department, or semester..."
                  value={filterSearchTerm}
                  onChange={(e) => setFilterSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Display Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {filteredTimetables.length} timetable{filteredTimetables.length !== 1 ? 's' : ''} found
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={displayMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDisplayMode("list")}
                  >
                    List View
                  </Button>
                  <Button
                    variant={displayMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDisplayMode("grid")}
                  >
                    Grid View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Timetables List/Grid */}
          {loading ? (
            <Card>
              <CardContent className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : filteredTimetables.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No timetables found</p>
                <p className="text-sm mt-1">
                  {filterSearchTerm || selectedDepartment || selectedSection || selectedSemester
                    ? "Try adjusting your filters or search terms"
                    : "Generate timetables first using the Generate Timetable page"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Available Timetables</CardTitle>
                <CardDescription>Click on a timetable to view and edit</CardDescription>
              </CardHeader>
              <CardContent>
                {displayMode === "list" ? (
                  <div className="space-y-2">
                    {filteredTimetables.map((tt) => {
                      const isSelected = selectedSection === tt.sectionId && selectedSemester === tt.semester.toString();
                      return (
                        <div
                          key={tt.id}
                          onClick={() => handleSelectTimetable(tt.sectionId, tt.semester)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{tt.sectionName}</h3>
                              <p className="text-sm text-muted-foreground">{tt.departmentName}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                Semester {tt.semester}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {tt.count} classes scheduled
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTimetables.map((tt) => {
                      const isSelected = selectedSection === tt.sectionId && selectedSemester === tt.semester.toString();
                      return (
                        <div
                          key={tt.id}
                          onClick={() => handleSelectTimetable(tt.sectionId, tt.semester)}
                          className={`p-6 border rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                            isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                          }`}
                        >
                          <div className="text-center space-y-2">
                            <Calendar className="w-8 h-8 mx-auto text-primary" />
                            <h3 className="font-semibold text-lg">{tt.sectionName}</h3>
                            <p className="text-sm text-muted-foreground">{tt.departmentName}</p>
                            <Badge variant="secondary" className="text-xs">
                              Semester {tt.semester}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {tt.count} classes
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selected Timetable Display */}
          {selectedSection && selectedSemester && timetableData.length > 0 && (
            <div id="single-timetable-export">
              {renderTimetableGrid(
                timetableData,
                `${selectedDeptName} - ${selectedSectionName} Timetable (Semester ${selectedSemester})`
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          {/* Search bar for all timetables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="w-5 h-5" />
                Search Timetables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by department or section name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </CardContent>
          </Card>

          {loading ? (
            <Card>
              <CardContent className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : Object.keys(filteredTimetablesData).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <p>{searchTerm ? "No timetables match your search." : "No timetable data found"}</p>
                <p className="text-sm mt-1">
                  {searchTerm ? "Try different search terms." : "Generate timetables first using the Generate Timetable page"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* List view of all timetables */}
              <Card>
                <CardHeader>
                  <CardTitle>All Timetables ({Object.keys(filteredTimetablesData).length} departments)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(filteredTimetablesData).map(([deptId, dept]) => (
                      <Card key={deptId} className="p-4">
                        <h3 className="font-semibold mb-2">{dept.departmentName}</h3>
                        <div className="space-y-1">
                          {Object.entries(dept.sections).map(([sectionKey, section]) => (
                            <div key={sectionKey} className="flex justify-between items-center text-sm">
                              <span>{section.sectionName}</span>
                              <Badge variant="secondary">Sem {section.semester}</Badge>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed timetable grids */}
              <div className="space-y-8">
                {Object.entries(filteredTimetablesData).map(([deptId, department]) => (
                  <div key={deptId}>
                    <h2 className="text-xl md:text-2xl font-bold mb-4">{department.departmentName}</h2>
                    {Object.entries(department.sections).map(([sectionKey, section]) => (
                      <div
                        key={sectionKey}
                        className="cursor-pointer"
                        onClick={() => setPopupData({
                          title: `${section.sectionName} - Semester ${section.semester}`,
                          entries: section.entries,
                          type: 'section'
                        })}
                      >
                        {renderTimetableGrid(
                          section.entries,
                          `${section.sectionName} - Semester ${section.semester}`,
                          `${deptId}|${section.sectionName}|${section.semester}`,
                          true
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Student Timetables Section */}
              {filteredPersonalizedTimetables.length > 0 && (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Individual Student Timetables ({filteredPersonalizedTimetables.length})
                    </CardTitle>
                    <CardDescription>AI-generated personalized timetables for students</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredPersonalizedTimetables.map((timetable) => (
                        <Card 
                          key={timetable.id} 
                          className="p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold">{timetable.students?.name || 'Unknown Student'}</h3>
                              <p className="text-sm text-muted-foreground">{timetable.students?.roll_no || 'No Roll Number'}</p>
                            </div>
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                              <Calendar className="w-3 h-3 mr-1" />
                              AI Generated
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            Generated: {new Date(timetable.generated_at).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setPopupData({
                                title: `${timetable.students?.name || 'Unknown Student'} - ${timetable.students?.roll_no || ''}`,
                                entries: timetable.timetable_json,
                                type: 'student',
                                timetableId: timetable.id,
                                generatedAt: timetable.generated_at
                              })}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDownloadStudentTimetable(timetable)}
                              disabled={exporting}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              {exporting ? 'Loading...' : 'Download'}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Popup Dialog for Timetables */}
      {popupData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{popupData.title}</CardTitle>
                <CardDescription>
                  {popupData.type === 'student' ? 'AI-Generated Individual Timetable' : 'Section Timetable'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this timetable?')) {
                      if (popupData.type === 'student' && popupData.timetableId) {
                        await (supabase as any).from('personalized_timetables').delete().eq('id', popupData.timetableId);
                        toast({ title: 'Deleted', description: 'Student timetable deleted.' });
                        setPopupData(null);
                        fetchPersonalizedTimetables();
                      } else {
                        // Section timetable: need to identify and delete entries
                        // For now, show a message
                        toast({ title: 'Info', description: 'Section timetable deletion requires section ID. Please use regenerate feature instead.', variant: 'default' });
                      }
                    }
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPopupData(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {popupData.type === 'student' ? (
                <div className="space-y-4">
                  {popupData.entries && popupData.entries.schedule ? (
                    <div className="overflow-x-auto">
                      <div className={`grid grid-cols-6 gap-1 md:gap-2 min-w-full ${isMobile ? 'text-xs' : ''}`}>
                        {/* Header */}
                        <div className="font-semibold p-2 md:p-3 bg-muted rounded-lg text-center text-xs md:text-sm">
                          Time
                        </div>
                        {days.map(day => (
                          <div key={day} className="font-semibold p-2 md:p-3 bg-muted rounded-lg text-center text-xs md:text-sm">
                            {isMobile ? day.substring(0, 3) : day}
                          </div>
                        ))}

                        {/* Time slots and schedule */}
                        {timeSlots.map((timeSlot, timeIndex) => (
                          <div key={timeSlot} className="contents">
                            <div className="p-2 md:p-3 bg-muted/50 rounded-lg text-center font-medium text-xs">
                              {isMobile ? timeSlot.split('-')[0] : timeSlot}
                            </div>
                            {days.map((day, dayIndex) => {
                              const daySchedule = popupData.entries.schedule?.[day] || {};
                              const slot = daySchedule[timeSlot];
                              
                              if (!slot || !slot.subject) {
                                const freePeriodText = getDefaultFreePeriod(popupData.entries.semester || parseInt(selectedSemester), dayIndex, timeIndex);
                                return (
                                  <div key={`${day}-${timeSlot}`} className="p-1 md:p-3 border border-dashed border-muted rounded-lg text-center text-muted-foreground text-xs">
                                    {isMobile ? (freePeriodText === 'Library Period' ? 'Library' : 'Intern') : freePeriodText}
                                  </div>
                                );
                              }

                              return (
                                <div key={`${day}-${timeSlot}`} className="p-1 md:p-2 border rounded-lg hover:shadow-md transition-all duration-200 pdf-cell bg-gradient-to-br from-blue-50 to-blue-100">
                                  <Badge className={`${subjectColors[slot.subject] || subjectColors.default} mb-1 text-[10px] pdf-badge shadow-sm`}>
                                    {slot.code || slot.subject.substring(0, 3)}
                                  </Badge>
                                  <p className="text-[10px] md:text-xs font-medium break-words w-full leading-tight">{slot.subject}</p>
                                  <p className="text-[10px] text-muted-foreground break-words w-full leading-tight">{slot.staff || 'TBD'}</p>
                                  <p className="text-[10px] text-muted-foreground break-words w-full leading-tight">Room: {slot.room || 'TBD'}</p>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No timetable data available</p>
                    </div>
                  )}
                </div>
              ) : (
                renderTimetableGrid(popupData.entries as TimetableEntry[], popupData.title)
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Timetables to Export</DialogTitle>
            <DialogDescription>
              Choose specific section timetables. Leave all unselected to export every timetable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-2">
            <Input
              type="date"
              placeholder="Filter by generation date"
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-xs mb-2"
            />
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

      {/* Timetable Editor */}
      {editingCell && (
        <TimetableEditor
          isOpen={!!editingCell}
          onClose={() => setEditingCell(null)}
          onSave={handleSaveEdit}
          initialData={editingCell.data}
          day={days[editingCell.day - 1]}
          timeSlot={timeSlots[editingCell.timeSlot - 1]}
        />
      )}
    </div>
  );
}
