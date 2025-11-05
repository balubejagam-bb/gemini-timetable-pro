import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
<<<<<<< HEAD
import { Loader2, Sparkles, AlertTriangle, Upload, Download, Settings, SlidersHorizontal, Brain, CheckCircle, Search } from 'lucide-react';
import { ClientTimetableGenerator } from '@/lib/timetableGenerator';
import { PersonalizedTimetableGenerator } from '../lib/../lib/personalizedGenerator';
import { useToast } from '@/hooks/use-toast';

interface Subject { id: string; code: string; name: string; department_id: string | null; semester?: number; hours_per_week?: number; subject_type?: string; credits?: number; }
interface Staff { id: string; name: string; department_id?: string; }
interface Slot { day: string; start_time: string; end_time: string; }
interface CourseOffering { id: string; subject_id: string; faculty_id: string | null; semester: number; max_seats: number; enrolled_count: number; schedule_json: Slot[] | null; subject?: Subject; faculty?: Staff; }

interface Preference { offeringId: string; rank: number; locked?: boolean; }
interface Department { id: string; code?: string; name?: string; }
interface CSVStudentRow { roll_no: string; name: string; email?: string; department_code?: string; semester?: number; _status?: string; _error?: string; }
interface StudentRec { id: string; roll_no?: string; name: string; email?: string; semester?: number; department_id?: string | null; }
interface IndivTimetableEntry { day: string; start_time: string; end_time: string; subject_code?: string; subject_name?: string; faculty_name?: string; room?: string; }
interface Section { id: string; name: string; department_id: string; semester: number; }
interface Room { id: string; room_number: string; capacity: number; room_type: string; }
interface Timing { id: string; day_of_week: number; start_time: string; end_time: string; }

const StudentDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [faculty, setFaculty] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timings, setTimings] = useState<Timing[]>([]);
  const [students, setStudents] = useState<StudentRec[]>([]);
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
  const [indivGenerating, setIndivGenerating] = useState(false);
  const [indivProgress, setIndivProgress] = useState(0);
  const [indivPersonalized, setIndivPersonalized] = useState<IndivTimetableEntry[]>([]);
  const [loadingIndivPersonalized, setLoadingIndivPersonalized] = useState(false);
  // Bulk upload state
  const [csvRows, setCsvRows] = useState<CSVStudentRow[]>([]);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  const studentIdentifierColumn = 'roll_no'; // change to 'register_number' if schema differs in later migration
  const [semester, setSemester] = useState<number>(1);
  const [filter, setFilter] = useState('');
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [personalized, setPersonalized] = useState<{ day: string; start_time: string; end_time: string; subject_code?: string; subject_name?: string; faculty_name?: string; room?: string }[]>([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);

  // Simulated student id (replace with auth integration later)
  const studentId = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
  const load = async () => {
      setLoading(true);
      try {
  const [subjRes, staffRes, offRes, deptRes, secRes, roomRes, timingRes, studRes] = await Promise.all([
          supabase.from('subjects').select('id, code, name, department_id, semester, hours_per_week, subject_type, credits'),
      supabase.from('staff').select('id, name'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('course_offerings').select('id, subject_id, faculty_id, semester, max_seats, enrolled_count, schedule_json'),
          supabase.from('departments').select('id, code, name'),
          supabase.from('sections').select('id, name, department_id, semester'),
          supabase.from('rooms').select('id, room_number, capacity, room_type'),
          supabase.from('college_timings').select('id, day_of_week, start_time, end_time').order('day_of_week'),
          // cast to any to bypass generated type limitations for new table
          supabase.from('students').select('id, roll_no, name, email, semester, department_id')
        ]);
        if (subjRes.error) throw subjRes.error;
        if (staffRes.error) throw staffRes.error;
        if (offRes.error) throw offRes.error;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawOfferings: any[] = (offRes as any).data || [];
        const joined: CourseOffering[] = rawOfferings.map(o => ({
          id: o.id,
          subject_id: o.subject_id,
          faculty_id: o.faculty_id,
          semester: o.semester,
          max_seats: o.max_seats,
          enrolled_count: o.enrolled_count,
          schedule_json: Array.isArray(o.schedule_json) ? o.schedule_json : null,
          subject: subjRes.data?.find(s => s.id === o.subject_id),
          faculty: staffRes.data?.find(f => f.id === o.faculty_id)
        }));
        setOfferings(joined);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        toast({ title: 'Load failed', description: msg, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
=======
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Upload, Download, Plus, Users, Edit, Trash2 } from 'lucide-react';
import { ViewToggle } from '@/components/ui/view-toggle';
import { Checkbox } from "@/components/ui/checkbox";
import { ClientTimetableGenerator } from "@/lib/timetableGenerator";

interface Student {
  id: string;
  name: string;
  roll_no: string;
  email?: string;
  semester: number;
  department_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function StudentDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [showAllSubjects, setShowAllSubjects] = useState(true);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  // Form state for adding/editing students
  const [studentForm, setStudentForm] = useState({
    name: '',
    roll_no: '',
    email: '',
    semester: 1,
    department_id: ''
  });

  useEffect(() => {
    fetchStudents();
    fetchDepartments();
  }, []);

  useEffect(() => {
    // Fetch all subjects and staff for selection
    const fetchData = async () => {
      const { data: subjData } = await supabase.from("subjects").select("id, name, code, department_id");
      const { data: stfData } = await supabase.from("staff").select("id, name, department_id");
      setAllSubjects(subjData || []);
      setAllStaff(stfData || []);
>>>>>>> 83fb3185b21a4003056fc3c30f9bf395937e4dd5
    };
    fetchData();
  }, []);

<<<<<<< HEAD
  const filtered = useMemo(() => offerings.filter(o => o.semester === semester && (
    !filter || o.subject?.name.toLowerCase().includes(filter.toLowerCase()) || o.subject?.code.toLowerCase().includes(filter.toLowerCase())
  )), [offerings, semester, filter]);

  const togglePreference = (offeringId: string) => {
    setPreferences(prev => {
      const exists = prev.find(p => p.offeringId === offeringId);
      if (exists) return prev.filter(p => p.offeringId !== offeringId).map((p, i) => ({ ...p, rank: i + 1 }));
      return [...prev, { offeringId, rank: prev.length + 1 }];
    });
  };

  const conflicts = useMemo(() => {
    // Basic naive conflict detection: if schedule_json shares same day & overlapping time
    const chosen = preferences.map(p => offerings.find(o => o.id === p.offeringId)).filter(Boolean) as CourseOffering[];
    const conflictPairs: string[] = [];
    for (let i = 0; i < chosen.length; i++) {
      for (let j = i + 1; j < chosen.length; j++) {
        const a = chosen[i];
        const b = chosen[j];
        if (a.schedule_json && b.schedule_json) {
          try {
            const slotsA = Array.isArray(a.schedule_json) ? a.schedule_json : [];
            const slotsB = Array.isArray(b.schedule_json) ? b.schedule_json : [];
            for (const sa of slotsA) {
              for (const sb of slotsB) {
                if (sa.day === sb.day) {
                  const overlap = !(sa.end_time <= sb.start_time || sb.end_time <= sa.start_time);
                  if (overlap) {
                    conflictPairs.push(`${a.subject?.code} ↔ ${b.subject?.code}`);
                    throw new Error('conflict-found-break');
                  }
                }
              }
            }
          } catch (e) {
            if (!(e instanceof Error) || e.message !== 'conflict-found-break') console.error(e);
          }
        }
      }
    }
    return conflictPairs;
  }, [preferences, offerings]);

  const savePreferences = async () => {
    if (!preferences.length) {
      toast({ title: 'No selections', description: 'Select at least one course offering.' });
      return;
    }
    setSaving(true);
    try {
      // Upsert each preference
      for (const pref of preferences) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('student_course_preferences').upsert({
          student_id: studentId,
            course_offering_id: pref.offeringId,
            preference_rank: pref.rank
        }, { onConflict: 'student_id,course_offering_id' });
        if (error) throw error;
      }
      toast({ title: 'Preferences saved', description: 'Your course preferences have been stored.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const generatePersonalized = async () => {
    if (conflicts.length) {
      toast({ title: 'Resolve conflicts', description: 'Please adjust selections to remove time conflicts.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const generator = new PersonalizedTimetableGenerator();
      const offeringIds = preferences.map(p => p.offeringId);
      if (offeringIds.length === 0) {
        toast({ title: 'No selections', description: 'Pick offerings first.' });
        setGenerating(false);
        return;
      }
      const entries = await generator.generate(studentId, offeringIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('personalized_timetables').insert({
        student_id: studentId,
        model_version: 'gemini-personalized-v1',
        timetable_json: entries
      });
      if (error) throw error;
      toast({ title: 'AI Timetable Ready', description: `Generated ${entries.length} personalized entries.` });
      await loadLatestPersonalized();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
    } finally { setGenerating(false); }
  };

  const loadLatestPersonalized = useCallback(async () => {
    setLoadingPersonalized(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('personalized_timetables')
        .select('timetable_json, generated_at')
        .eq('student_id', studentId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setPersonalized(Array.isArray(data?.timetable_json) ? data.timetable_json : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load personalized timetable';
      toast({ title: 'Load failed', description: msg, variant: 'destructive' });
    } finally { setLoadingPersonalized(false); }
  }, [studentId, toast]);

  useEffect(() => { loadLatestPersonalized(); }, [loadLatestPersonalized]);

  const orderedDays = ['Mon','Tue','Wed','Thu','Fri','Sat'];
  const groupedPersonalized = useMemo(() => {
    const map: Record<string, typeof personalized> = {};
    personalized.forEach(e => {
      if(!map[e.day]) map[e.day] = [];
      map[e.day].push(e);
    });
    Object.values(map).forEach(list => list.sort((a,b)=> a.start_time.localeCompare(b.start_time)));
    return map;
  }, [personalized]);

  // Derived filters for individual generator
  // Debounced server-side search for students (fallback to initial loaded list when empty)
  useEffect(()=> {
    const q = studentSearch.trim();
    let active = true;
    if (!q) return; // keep initial preloaded list
    setStudentSearchLoading(true);
    const handle = setTimeout(async () => {
      try {
  const or = `name.ilike.%${q}%,roll_no.ilike.%${q}%`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    }, 400); // debounce
    return () => { active = false; clearTimeout(handle); };
  }, [studentSearch]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 25);
    return students; // already filtered server-side
  }, [students, studentSearch]);

  useEffect(()=>{
    if (selectedStudent?.semester) setIndivSemester(String(selectedStudent.semester));
  }, [selectedStudent]);

  // Auto-select student's department (or all) when picking a student if none chosen yet
  useEffect(()=>{
    if (selectedStudent && indivDepartments.length === 0) {
      if (selectedStudent.department_id) {
        setIndivDepartments([selectedStudent.department_id]);
      } else if (departments.length) {
        setIndivDepartments(departments.map(d=>d.id));
      }
    }
  }, [selectedStudent, indivDepartments.length, departments]);

  const toggleIndiv = (id: string, list: string[], setter: (v:string[])=>void) => {
    setter(list.includes(id) ? list.filter(x=>x!==id) : [...list, id]);
  };

  const indivFilteredSections = useMemo(()=> sections.filter(s => s.semester === Number(indivSemester) && (indivDepartments.length===0 || indivDepartments.includes(s.department_id))), [sections, indivSemester, indivDepartments]);
  useEffect(()=>{ setIndivSections(indivFilteredSections.map(s=>s.id)); }, [indivFilteredSections]);
  const indivFilteredSubjects = useMemo(()=> {
    // When showAllSubjects is true, ignore department filter but still honor semester
    if (showAllSubjects) return subjects.filter(sub => (!sub.semester || sub.semester === Number(indivSemester)));
    return subjects.filter(sub => sub && (indivDepartments.length===0 || indivDepartments.includes(sub.department_id || '')) && (!sub.semester || sub.semester === Number(indivSemester)));
  }, [subjects, indivDepartments, indivSemester, showAllSubjects]);
  const indivFilteredStaff = useMemo(()=> faculty.filter(st => (indivDepartments.length===0 || indivDepartments.includes(st.department_id || ''))), [faculty, indivDepartments]);
  const deptNameMap = useMemo(() => Object.fromEntries(departments.map(d => [d.id, d.name || d.code || 'Dept'])), [departments]);

  // Select-All helpers for advanced selections
  const selectAllIndiv = (type: 'subjects' | 'staff' | 'rooms' | 'timings') => {
    switch(type){
      case 'subjects': setIndivSubjects(indivFilteredSubjects.map(s=>s.id)); break;
      case 'staff': setIndivStaff(indivFilteredStaff.map(s=>s.id)); break;
      case 'rooms': setIndivRooms(rooms.map(r=>r.id)); break;
      case 'timings': setIndivTimings(timings.map(t=>t.id)); break;
    }
  };
  const clearAllIndiv = (type: 'subjects' | 'staff' | 'rooms' | 'timings') => {
    switch(type){
      case 'subjects': setIndivSubjects([]); break;
      case 'staff': setIndivStaff([]); break;
      case 'rooms': setIndivRooms([]); break;
      case 'timings': setIndivTimings([]); break;
    }
  };

  const loadIndivPersonalized = useCallback(async () => {
    if(!selectedStudent) return;
    setLoadingIndivPersonalized(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from('personalized_timetables').select('timetable_json, generated_at').eq('student_id', selectedStudent.id).order('generated_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      setIndivPersonalized(Array.isArray(data?.timetable_json) ? data.timetable_json : []);
    } catch (e) {
      console.error(e);
    } finally { setLoadingIndivPersonalized(false); }
  }, [selectedStudent]);

  const handleGenerateIndividual = async () => {
    if(!selectedStudent){
      toast({ title: 'Select Student', description: 'Search and pick a student first.', variant: 'destructive'}); return;
    }
    if (indivDepartments.length===0 && indivSubjects.length===0 && indivSections.length===0) {
      toast({ title: 'Select Scope', description: 'Choose at least a Department or some Subjects/Sections before generating.', variant: 'destructive'}); return;
    }
    setIndivGenerating(true); setIndivProgress(10);
    try {
      const gen = new ClientTimetableGenerator();
      setIndivProgress(40);
      const result = await gen.generateTimetable(
        indivDepartments,
        Number(indivSemester),
        {
          advancedMode: true,
          sections: indivSections.length ? indivSections : undefined,
          subjects: indivSubjects.length ? indivSubjects : undefined,
          staff: indivStaff.length ? indivStaff : undefined,
          // timings removed: not part of AdvancedGenerationOptions type
        }
      );
      setIndivProgress(80);
      if(!result.success) throw new Error(result.error || 'Generation failed');
      // Store as personalized snapshot
  const detailed = result.entriesDetailed || [];
      const mapped = detailed.map(d => ({
        day: d.day,
        start_time: d.start_time,
        end_time: d.end_time,
        subject_code: d.subject_code,
        subject_name: d.subject_name,
        faculty_name: d.faculty_name,
        room: d.room
      }));
  // Supabase types may not yet include personalized_timetables; use any cast safely here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('personalized_timetables').insert({ student_id: selectedStudent.id, model_version: 'ai-individual-v1', timetable_json: mapped });
      if (error) throw error;
      setIndivProgress(100);
      toast({ title: 'Individual Timetable Generated', description: `Created ${result.entriesCount} entries for ${selectedStudent.name}.` });
      await loadIndivPersonalized();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
    } finally { setIndivGenerating(false); setIndivProgress(0); }
  };

  // -----------------------------------------------
  // CSV Bulk Upload Helpers
  // -----------------------------------------------
  const sampleCSV = useMemo(() => {
    return [
      'roll_no,name,email,department_code,semester',
      'R001,John Doe,john@example.com,CSE,1',
      'R002,Jane Smith,jane@example.com,ECE,1'
    ].join('\n');
  }, []);

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
=======
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('students')
        .select(`
          *,
          departments(name, code)
        `)
        .order('name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await (supabase as any)
        .from('students')
        .insert([studentForm]);

      if (error) throw error;
      
      toast.success('Student added successfully');
      setIsAddDialogOpen(false);
      setStudentForm({
        name: '',
        roll_no: '',
        email: '',
        semester: 1,
        department_id: ''
      });
      fetchStudents();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Failed to add student');
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      const { error } = await (supabase as any)
        .from('students')
        .update(studentForm)
        .eq('id', editingStudent.id);

      if (error) throw error;
      
      toast.success('Student updated successfully');
      setEditingStudent(null);
      setStudentForm({
        name: '',
        roll_no: '',
        email: '',
        semester: 1,
        department_id: ''
      });
      fetchStudents();
    } catch (error: any) {
      console.error('Error updating student:', error);
      toast.error(error.message || 'Failed to update student');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const { error } = await (supabase as any)
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;
      
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error(error.message || 'Failed to delete student');
    }
  };

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      roll_no: student.roll_no,
      email: student.email || '',
      semester: student.semester,
      department_id: student.department_id || ''
    });
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['name', 'roll_no', 'email', 'semester', 'department_code'],
      ['John Doe', 'CS001', 'john@example.com', '1', 'CSE'],
      ['Jane Smith', 'CS002', 'jane@example.com', '2', 'CSE'],
      ['Bob Johnson', 'EC001', 'bob@example.com', '1', 'ECE']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
>>>>>>> 83fb3185b21a4003056fc3c30f9bf395937e4dd5
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_sample.csv';
<<<<<<< HEAD
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): CSVStudentRow[] => {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length);
    if (!lines.length) return [];
    const header = lines[0].split(',').map(h => h.trim());
    const required = ['roll_no','name'];
    for (const r of required) {
      if (!header.includes(r)) throw new Error(`Missing required column: ${r}`);
    }
    const rows: CSVStudentRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      // naive split (assumes no quoted commas)
      const cols = raw.split(',').map(c => c.trim());
      const map: Record<string,string> = {};
      header.forEach((h, idx) => { map[h] = cols[idx] || ''; });
      rows.push({
        roll_no: map['roll_no'],
        name: map['name'],
        email: map['email'],
        department_code: map['department_code'],
        semester: map['semester'] ? Number(map['semester']) : 1
      });
=======
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];
      const data = rows.slice(1).filter(row => row.length === headers.length);

      const studentsToInsert = data.map(row => ({
        name: row[0]?.trim(),
        roll_no: row[1]?.trim(),
        email: row[2]?.trim(),
        semester: parseInt(row[3]?.trim()) || 1,
        department_id: departments.find(d => d.code === row[4]?.trim())?.id
      })).filter(student => student.name && student.roll_no);

      if (studentsToInsert.length === 0) {
        toast.error('No valid student data found in CSV');
        return;
      }

      const { error } = await (supabase as any)
        .from('students')
        .insert(studentsToInsert);

      if (error) throw error;

      toast.success(`Successfully imported ${studentsToInsert.length} students`);
      fetchStudents();
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      toast.error(error.message || 'Failed to import CSV');
    }

    // Reset input
    event.target.value = '';
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getDepartmentName = (departmentId?: string) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept ? dept.name : 'No Department';
  };

  // Timetable generation handler
  const handleGenerateTimetable = async () => {
    try {
      const generator = new ClientTimetableGenerator();
      const departmentIds = departments.map(d => d.id); // or filter as needed
      const semester = 1; // or get from UI
      const result = await generator.generateTimetable(departmentIds, semester, {
        advancedMode: true,
        subjects: selectedSubjects,
        staff: selectedStaffIds
      });
      if (result.success) {
        toast.success(`Timetable generated! Entries: ${result.entriesCount}`);
      } else {
        toast.error(result.error || "Failed to generate timetable");
      }
    } catch (error) {
      toast.error("Error generating timetable");
      console.error(error);
>>>>>>> 83fb3185b21a4003056fc3c30f9bf395937e4dd5
    }
    return rows;
  };

  const handleCSVFile = (file: File) => {
    setCsvError(null);
    setCsvParsing(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result?.toString() || '';
        const parsed = parseCSV(text).slice(0, 1000); // safety cap
        // enrich with validation status
        const rows = parsed.map(r => {
          let error: string | undefined;
            if (!r.roll_no) error = 'roll_no required';
            else if (!r.name) error = 'name required';
            else if (r.semester && (r.semester < 1 || r.semester > 12)) error = 'semester out of range';
          return { ...r, _status: error ? 'invalid' : 'ready', _error: error };
        });
        setCsvRows(rows);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Parse error';
        setCsvError(msg);
        setCsvRows([]);
      } finally {
        setCsvParsing(false);
      }
    };
    reader.onerror = () => {
      setCsvError('Failed to read file');
      setCsvParsing(false);
    };
    reader.readAsText(file);
  };

  const handleImportStudents = async () => {
    if (!csvRows.length) {
      toast({ title: 'No data', description: 'Upload a CSV first.' });
      return;
    }
    const valid = csvRows.filter(r => r._status === 'ready');
    if (!valid.length) {
      toast({ title: 'Nothing to import', description: 'All rows invalid.' });
      return;
    }
    setCsvImporting(true);
    try {
      // map department_code to id
      const deptMap: Record<string,string> = {};
      departments.forEach(d => { if (d.code) deptMap[d.code.toUpperCase()] = d.id; });
      const payload = valid.map(v => ({
        [studentIdentifierColumn]: v.roll_no,
        name: v.name,
        email: v.email || null,
        department_id: v.department_code ? deptMap[v.department_code.toUpperCase()] || null : null,
        semester: v.semester || 1
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('students').upsert(payload, { onConflict: studentIdentifierColumn });
      if (error) throw error;
      toast({ title: 'Import complete', description: `Processed ${payload.length} student(s).` });
      // mark statuses
      setCsvRows(prev => prev.map(r => r._status === 'ready' ? { ...r, _status: 'imported' } : r));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      toast({ title: 'Import failed', description: msg, variant: 'destructive' });
    } finally {
      setCsvImporting(false);
    }
  };

<<<<<<< HEAD
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Student Database</h1>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving || loading} onClick={savePreferences}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Preferences
          </Button>
          <Button disabled={generating || loading} onClick={generatePersonalized}>
            {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Sparkles className="w-4 h-4 mr-2" />Generate Personalized
          </Button>
=======
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
>>>>>>> 83fb3185b21a4003056fc3c30f9bf395937e4dd5
        </div>
      </div>
      <Separator />

<<<<<<< HEAD
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        {/* Individual Student Timetable Generator */}
        <Card className="md:col-span-3 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Settings className="w-4 h-4" />Individual Student Timetable Generator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Student Selector */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-1">
                <label className="text-xs font-medium flex items-center gap-1"><Search className="w-3 h-3" />Search Student</label>
                <Input placeholder="Enter name / roll no" value={studentSearch} onChange={e=>setStudentSearch(e.target.value)} />
                <div className="border rounded max-h-56 overflow-auto text-xs divide-y relative">
                  {studentSearchLoading && <div className="absolute inset-x-0 top-0 bg-background/80 backdrop-blur text-[10px] flex items-center gap-1 px-2 py-1"><Loader2 className="w-3 h-3 animate-spin" />Searching…</div>}
                  {filteredStudents.map(st => (
                    <button key={st.id} type="button" onClick={()=>setSelectedStudent(st)} className={`w-full text-left px-2 py-1 hover:bg-accent/40 ${selectedStudent?.id===st.id?'bg-primary/10':''}`}>
                      <span className="font-medium">{st.name}</span>
                      <div className="text-[10px] text-muted-foreground">{st.roll_no} • Sem {st.semester}</div>
                    </button>
                  ))}
                  {filteredStudents.length===0 && <div className="px-2 py-1 text-muted-foreground">No results</div>}
                </div>
              </div>
              <div className="space-y-6 md:col-span-3">
                {!selectedStudent && <div className="text-xs text-muted-foreground">Select a student to configure timetable generation settings.</div>}
                {selectedStudent && (
                  <>
                    {/* Generation Settings */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div><span className="font-semibold">Name:</span> {selectedStudent.name}</div>
                        <div><span className="font-semibold">Roll:</span> {selectedStudent.roll_no}</div>
                        <div className="flex items-center gap-1"><span className="font-semibold">Semester:</span>
                          <select aria-label="Individual Student Semester" value={indivSemester} onChange={e=>setIndivSemester(e.target.value)} className="border rounded px-1 py-0.5 bg-background">
                            {Array.from({length:8}).map((_,i)=><option key={i+1}>{i+1}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold tracking-wide uppercase text-muted-foreground">Generation Settings</h3>
                        <div>
                          <label className="text-[11px] font-medium mb-2 block">Select Departments ({indivDepartments.length} selected)</label>
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {departments.map(dept => {
                              const count = sections.filter(s=>s.department_id===dept.id && s.semester===Number(indivSemester)).length;
                              const active = indivDepartments.includes(dept.id);
                              return (
                                <div key={dept.id} onClick={()=>toggleIndiv(dept.id, indivDepartments, setIndivDepartments)} className={`p-3 border rounded cursor-pointer transition-all hover:shadow-sm text-[11px] ${active? 'border-primary bg-primary/5':'border-border'}`}>
                                  <div className="flex items-start gap-2">
                                    <Checkbox checked={active} onCheckedChange={()=>{}} className="mt-0.5" />
                                    <div className="flex-1">
                                      <p className="font-medium truncate">{dept.name || dept.code}</p>
                                      <p className="text-[10px] text-muted-foreground">Code: {dept.code}</p>
                                      <p className="text-[10px] text-muted-foreground">Sections this semester: {count}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {departments.length===0 && <div className="text-[11px] text-muted-foreground">No departments found.</div>}
                        </div>
                      </div>
                    </div>
                    {/* Advanced Options */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-3 h-3" />
                        <h3 className="text-xs font-bold tracking-wide uppercase text-muted-foreground">Advanced Options</h3>
                      </div>
                      {/* Sections auto */}
                      <div>
                        <h4 className="text-xs font-semibold mb-1">Sections (auto-selected)</h4>
                        <div className="flex flex-wrap gap-1">
                          {indivFilteredSections.length===0 && <span className="text-[10px] text-muted-foreground">Select departments / semester to load sections.</span>}
                          {indivFilteredSections.map(sec => {
                            const deptName = deptNameMap[sec.department_id];
                            return <span key={sec.id} className="px-2 py-0.5 rounded border bg-muted/40 text-[10px]" title={deptName}>{sec.name}-{deptName}</span>;
                          })}
                        </div>
                      </div>
                      {/* Subjects */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <h4 className="text-xs font-semibold">Subjects {showAllSubjects ? '(All Departments)' : ''}</h4>
                            <label className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
                              <Checkbox checked={showAllSubjects} onCheckedChange={v=>setShowAllSubjects(!!v)} />
                              <span>Show all subjects (cross-department)</span>
                            </label>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={()=>selectAllIndiv('subjects')}>Select All</Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={()=>clearAllIndiv('subjects')}>Clear</Button>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3 max-h-48 overflow-y-auto pr-1">
                          {indivFilteredSubjects.map(sub => {
                            const active = indivSubjects.includes(sub.id);
                            const hours = sub.hours_per_week ? `${sub.hours_per_week}h` : '';
                            return (
                              <label key={sub.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-[10px] cursor-pointer ${active?'bg-primary/10 border-primary':'border-border'}`}
                                onClick={()=>toggleIndiv(sub.id, indivSubjects, setIndivSubjects)} title={`${sub.name} (${sub.code})`}>
                                <Checkbox checked={active} onCheckedChange={()=>{}} className="h-3 w-3" />
                                <span className="truncate">{sub.name} <span className="font-semibold">({sub.code})</span>{hours && <span className="ml-1 text-muted-foreground">· {hours}</span>}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      {/* Staff */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold">Staff</h4>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={()=>selectAllIndiv('staff')}>Select All</Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={()=>clearAllIndiv('staff')}>Clear</Button>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3 max-h-40 overflow-y-auto pr-1">
                          {indivFilteredStaff.map(st => {
                            const active = indivStaff.includes(st.id);
                            return (
                              <label key={st.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-[10px] cursor-pointer ${active?'bg-primary/10 border-primary':'border-border'}`}
                                onClick={()=>toggleIndiv(st.id, indivStaff, setIndivStaff)} title={st.name}>
                                <Checkbox checked={active} onCheckedChange={()=>{}} className="h-3 w-3" />
                                <span className="truncate">{st.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      {/* Rooms */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold">Rooms</h4>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={()=>selectAllIndiv('rooms')}>Select All</Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={()=>clearAllIndiv('rooms')}>Clear</Button>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3 max-h-40 overflow-y-auto pr-1">
                          {rooms.map(r => {
                            const active = indivRooms.includes(r.id);
                            return (
                              <label key={r.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-[10px] cursor-pointer ${active?'bg-primary/10 border-primary':'border-border'}`}
                                onClick={()=>toggleIndiv(r.id, indivRooms, setIndivRooms)} title={r.room_number}>
                                <Checkbox checked={active} onCheckedChange={()=>{}} className="h-3 w-3" />
                                <span className="truncate">{r.room_number}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      {/* Timings */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold">Timings (reference)</h4>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={()=>selectAllIndiv('timings')}>Select All</Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={()=>clearAllIndiv('timings')}>Clear</Button>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-40 overflow-y-auto pr-1 text-[10px]">
                          {timings.map(t => {
                            const active = indivTimings.includes(t.id);
                            const label = `${t.day_of_week}-${t.start_time.slice(0,5)}-${t.end_time.slice(0,5)}`;
                            return (
                              <label key={t.id} className={`flex items-center gap-2 border rounded px-2 py-1 cursor-pointer ${active?'bg-primary/10 border-primary':'border-border'}`}
                                onClick={()=>toggleIndiv(t.id, indivTimings, setIndivTimings)}>
                                <Checkbox checked={active} onCheckedChange={()=>{}} className="h-3 w-3" />
                                <span className="truncate" title={label}>{label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground">(Selecting timings is optional; generation uses DB timings automatically.)</p>
                      </div>
                    </div>
                    {/* Actions & Progress */}
                    <div className="flex items-center gap-3 flex-wrap pt-2">
                      <Button type="button" disabled={indivGenerating} onClick={handleGenerateIndividual} className="gap-2 text-xs">
                        {indivGenerating && <Loader2 className="w-3 h-3 animate-spin" />}<Sparkles className="w-3 h-3" />Generate Student Timetable
                      </Button>
                      {indivGenerating && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground" aria-live="polite">
                          <div className="w-32 h-1 bg-muted rounded overflow-hidden relative">
                            <div className={"h-full bg-primary transition-all " + (indivProgress >= 100 ? 'w-full' : indivProgress >= 90 ? 'w-[90%]' : indivProgress >=80 ? 'w-[80%]' : indivProgress >=70 ? 'w-[70%]' : indivProgress >=60 ? 'w-[60%]' : indivProgress >=50 ? 'w-1/2' : indivProgress >=40 ? 'w-[40%]' : indivProgress >=30 ? 'w-[30%]' : indivProgress >=20 ? 'w-[20%]' : indivProgress >=10 ? 'w-[10%]' : 'w-[5%]')} data-progress-bar></div>
                          </div>
                          {indivProgress}%
                        </div>
                      )}
                      <Button type="button" variant="outline" size="sm" disabled={!selectedStudent || loadingIndivPersonalized} onClick={loadIndivPersonalized} className="h-7 px-2 text-[11px]">{loadingIndivPersonalized? 'Loading…':'View Latest'}</Button>
                    </div>
                    {/* Table */}
                    {selectedStudent && !loadingIndivPersonalized && indivPersonalized.length>0 && (
                      <div className="overflow-x-auto border rounded">
                        <table className="w-full text-[11px]">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="p-1 border">Day</th>
                              <th className="p-1 border">Start</th>
                              <th className="p-1 border">End</th>
                              <th className="p-1 border">Subject</th>
                              <th className="p-1 border">Faculty</th>
                              <th className="p-1 border">Room</th>
                            </tr>
                          </thead>
                          <tbody>
                            {indivPersonalized.map((row,i)=>(
                              <tr key={i} className="hover:bg-accent/30">
                                <td className="p-1 border">{row.day}</td>
                                <td className="p-1 border">{row.start_time?.slice(0,5)}</td>
                                <td className="p-1 border">{row.end_time?.slice(0,5)}</td>
                                <td className="p-1 border">{row.subject_code} <span className="text-muted-foreground">{row.subject_name}</span></td>
                                <td className="p-1 border">{row.faculty_name||'-'}</td>
                                <td className="p-1 border">{row.room||'TBD'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Bulk Student Upload */}
        <Card className="md:col-span-3 lg:col-span-4">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-sm flex items-center gap-2">Bulk Student Upload</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadSample}>
                <Download className="w-4 h-4 mr-1" />Sample CSV
              </Button>
              <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-medium border rounded px-3 py-1 bg-background hover:bg-accent/40">
                <Upload className="w-4 h-4" />
                <span>Choose CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if(f) handleCSVFile(f); }}
                />
              </label>
              <Button type="button" size="sm" disabled={csvImporting || !csvRows.some(r=>r._status==='ready')} onClick={handleImportStudents}>
                {csvImporting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Import
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">Columns: roll_no, name, email, department_code, semester. Max 1000 rows. Semester defaults to 1. Department code matched case-insensitively.</div>
            {csvError && <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">{csvError}</div>}
            {csvParsing && <div className="flex items-center text-xs text-muted-foreground"><Loader2 className="w-3 h-3 mr-2 animate-spin" />Parsing CSV...</div>}
            {(!csvParsing && csvRows.length>0) && (
              <div className="border rounded overflow-hidden">
                <table className="w-full text-[11px]"> 
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-1 border">#</th>
                      <th className="p-1 border">roll_no</th>
                      <th className="p-1 border">name</th>
                      <th className="p-1 border">email</th>
                      <th className="p-1 border">dept</th>
                      <th className="p-1 border">sem</th>
                      <th className="p-1 border">status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0,50).map((r,i)=>(
                      <tr key={i} className={r._status==='invalid' ? 'bg-destructive/10' : r._status==='imported' ? 'bg-emerald-500/10' : ''}>
                        <td className="p-1 border text-center">{i+1}</td>
                        <td className="p-1 border font-mono">{r.roll_no}</td>
                        <td className="p-1 border truncate max-w-[140px]">{r.name}</td>
                        <td className="p-1 border truncate max-w-[140px]">{r.email}</td>
                        <td className="p-1 border">{r.department_code}</td>
                        <td className="p-1 border text-center">{r.semester}</td>
                        <td className="p-1 border text-center">{r._status}{r._error && <span className="text-destructive"> · {r._error}</span>}</td>
=======
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Student Database
            </h1>
            <p className="text-muted-foreground">Manage student records and information</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadSampleCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Sample CSV
            </Button>
            
            <Button variant="outline" size="sm" className="relative">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <Input
                    placeholder="Student Name"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                    required
                  />
                  <Input
                    placeholder="Roll Number"
                    value={studentForm.roll_no}
                    onChange={(e) => setStudentForm({...studentForm, roll_no: e.target.value})}
                    required
                  />
                  <Input
                    placeholder="Email (optional)"
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                  />
                  <Input
                    placeholder="Semester"
                    type="number"
                    min="1"
                    max="8"
                    value={studentForm.semester}
                    onChange={(e) => setStudentForm({...studentForm, semester: parseInt(e.target.value) || 1})}
                    required
                  />
                  <select
                    className="w-full p-2 border rounded-md"
                    value={studentForm.department_id}
                    onChange={(e) => setStudentForm({...studentForm, department_id: e.target.value})}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <Button type="submit" className="w-full">Add Student</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-auto sm:min-w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name, roll number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-blue-600">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Departments</p>
                  <p className="text-2xl font-bold text-green-600">{departments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Search className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Search Results</p>
                  <p className="text-2xl font-bold text-purple-600">{filteredStudents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students List/Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{student.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{student.roll_no}</p>
                    </div>
                    <Badge variant="secondary">Sem {student.semester}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {student.email && (
                      <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                    )}
                    <p className="text-sm font-medium text-primary">{getDepartmentName(student.department_id)}</p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(student)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteStudent(student.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Roll No</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Semester</th>
                      <th className="text-left p-4 font-medium">Department</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{student.name}</td>
                        <td className="p-4 text-muted-foreground">{student.roll_no}</td>
                        <td className="p-4 text-muted-foreground">{student.email || '-'}</td>
                        <td className="p-4">
                          <Badge variant="secondary">Sem {student.semester}</Badge>
                        </td>
                        <td className="p-4 text-primary">{getDepartmentName(student.department_id)}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(student)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteStudent(student.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
>>>>>>> 83fb3185b21a4003056fc3c30f9bf395937e4dd5
                      </tr>
                    ))}
                  </tbody>
                </table>
<<<<<<< HEAD
                {csvRows.length>50 && <div className="text-[10px] px-2 py-1 text-muted-foreground">Showing first 50 of {csvRows.length} rows.</div>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Semester</label>
              <select aria-label="Semester" value={semester} onChange={e => setSemester(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm bg-background">
                {Array.from({ length: 8 }).map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Search Subject</label>
              <Input placeholder="Search by name/code" value={filter} onChange={e => setFilter(e.target.value)} />
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              Select preferred course offerings. Order is captured automatically. Conflicts flagged in real-time.
            </div>
            {conflicts.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <span>{conflicts.length} conflict(s) detected. Adjust selections.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Course Offerings (Semester {semester})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[540px] overflow-auto pr-2">
            {loading && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</div>}
            {!loading && filtered.length === 0 && <div className="text-xs text-muted-foreground">No offerings.</div>}
            {!loading && filtered.map(off => {
              const selected = preferences.find(p => p.offeringId === off.id);
              return (
                <div key={off.id} className={`flex items-center gap-3 border rounded-md px-3 py-2 text-sm ${selected ? 'bg-primary/5 border-primary/40' : 'hover:bg-accent/40'}`}> 
                  <Checkbox checked={!!selected} onCheckedChange={() => togglePreference(off.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{off.subject?.code} – {off.subject?.name}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                      {off.faculty?.name && <span>Faculty: {off.faculty.name}</span>}
                      <span>Seats: {off.enrolled_count}/{off.max_seats}</span>
                      {off.schedule_json && <span>Slots: {Array.isArray(off.schedule_json) ? off.schedule_json.map((s:Slot) => `${s.day}${s.start_time}`).join(', ') : '—'}</span>}
                    </div>
                  </div>
                  {selected && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary text-primary-foreground">{selected.rank}</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Selected Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[540px] overflow-auto">
            {preferences.length === 0 && <div className="text-xs text-muted-foreground">No selections yet.</div>}
            {preferences.sort((a,b)=>a.rank-b.rank).map(pref => {
              const off = offerings.find(o => o.id === pref.offeringId);
              if (!off) return null;
              return (
                <div key={pref.offeringId} className="border rounded px-2 py-1 text-xs bg-muted/30 flex items-center gap-2">
                  <span className="font-semibold w-5 text-center">{pref.rank}</span>
                  <span className="truncate flex-1">{off.subject?.code} {off.subject?.name}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-4">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-sm flex items-center gap-2">Latest Personalized Timetable
              <Button type="button" size="sm" variant="outline" disabled={loadingPersonalized} onClick={loadLatestPersonalized} className="ml-2 h-6 px-2 text-xs">{loadingPersonalized ? 'Loading...' : 'Refresh'}</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPersonalized && <div className="text-xs text-muted-foreground flex items-center"><Loader2 className="w-3 h-3 mr-2 animate-spin"/>Loading timetable...</div>}
            {!loadingPersonalized && personalized.length === 0 && (
              <div className="text-xs text-muted-foreground">No personalized timetable generated yet.</div>
            )}
            {!loadingPersonalized && personalized.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="p-2 text-left font-medium border">Day</th>
                      <th className="p-2 text-left font-medium border">Start</th>
                      <th className="p-2 text-left font-medium border">End</th>
                      <th className="p-2 text-left font-medium border">Subject</th>
                      <th className="p-2 text-left font-medium border">Faculty</th>
                      <th className="p-2 text-left font-medium border">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedDays.filter(d => groupedPersonalized[d]?.length).map(day => (
                      groupedPersonalized[day].map((row, idx) => (
                        <tr key={day+idx} className="hover:bg-accent/30">
                          <td className="p-2 border align-top font-semibold">{idx===0 ? day : ''}</td>
                          <td className="p-2 border">{row.start_time?.slice(0,5)}</td>
                          <td className="p-2 border">{row.end_time?.slice(0,5)}</td>
                          <td className="p-2 border">{row.subject_code} <span className="text-muted-foreground">{row.subject_name}</span></td>
                          <td className="p-2 border">{row.faculty_name || '-'}</td>
                          <td className="p-2 border">{row.room || 'TBD'}</td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
=======
              </div>
            </CardContent>
          </Card>
        )}

        {filteredStudents.length === 0 && (
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'Add your first student to get started'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit Student Dialog */}
        <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditStudent} className="space-y-4">
              <Input
                placeholder="Student Name"
                value={studentForm.name}
                onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                required
              />
              <Input
                placeholder="Roll Number"
                value={studentForm.roll_no}
                onChange={(e) => setStudentForm({...studentForm, roll_no: e.target.value})}
                required
              />
              <Input
                placeholder="Email (optional)"
                type="email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
              />
              <Input
                placeholder="Semester"
                type="number"
                min="1"
                max="8"
                value={studentForm.semester}
                onChange={(e) => setStudentForm({...studentForm, semester: parseInt(e.target.value) || 1})}
                required
              />
              <select
                className="w-full p-2 border rounded-md"
                value={studentForm.department_id}
                onChange={(e) => setStudentForm({...studentForm, department_id: e.target.value})}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Update Student</Button>
                <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Timetable Generation Popup */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default">Generate Timetable (AI)</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Timetable</DialogTitle>
            </DialogHeader>
            {/* Subject Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-2">Subjects (All Departments)</h4>
              <label className="flex items-center gap-2 text-xs font-normal mb-2">
                <Checkbox checked={showAllSubjects} onCheckedChange={v => setShowAllSubjects(!!v)} />
                <span>Show all subjects (cross-department)</span>
              </label>
              <div className="grid gap-2 md:grid-cols-3 max-h-48 overflow-y-auto pr-1">
                {allSubjects.map(sub => (
                  <label key={sub.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer ${selectedSubjects.includes(sub.id)?'bg-primary/10 border-primary':'border-border'}`}
                    onClick={() => setSelectedSubjects(selectedSubjects.includes(sub.id) ? selectedSubjects.filter(id => id !== sub.id) : [...selectedSubjects, sub.id])}>
                    <Checkbox checked={selectedSubjects.includes(sub.id)} onCheckedChange={() => {}} />
                    <span className="truncate">{sub.name} <span className="font-semibold">({sub.code})</span></span>
                    <span className="ml-2 text-muted-foreground">Dept: {departments.find(d => d.id === sub.department_id)?.name || 'Unknown'}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Staff Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-2">Staff (All Departments)</h4>
              <div className="grid gap-2 md:grid-cols-3 max-h-44 overflow-y-auto pr-1">
                {allStaff.map(st => (
                  <label key={st.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer ${selectedStaffIds.includes(st.id)?'bg-primary/10 border-primary':'border-border'}`}
                    onClick={() => setSelectedStaffIds(selectedStaffIds.includes(st.id) ? selectedStaffIds.filter(id => id !== st.id) : [...selectedStaffIds, st.id])}>
                    <Checkbox checked={selectedStaffIds.includes(st.id)} onCheckedChange={() => {}} />
                    <span className="truncate" title={st.name}>{st.name}</span>
                    <span className="ml-2 text-muted-foreground">Dept: {departments.find(d => d.id === st.department_id)?.name || 'Unknown'}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerateTimetable} variant="default" className="w-full">Generate Timetable</Button>
          </DialogContent>
        </Dialog>

        {/* Timetable Generation Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={handleGenerateTimetable} variant="default">Generate Timetable (AI)</Button>
          <Button variant="outline">View Timetables</Button>
          <Button variant="outline">College Timings</Button>
          <Button variant="outline">Subjects</Button>
          <Button variant="outline">Sections</Button>
          <Button variant="outline">Departments</Button>
          <Button variant="outline">Rooms</Button>
          <Button variant="outline">Staff</Button>
        </div>

        {/* Subject Selection */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-2">Subjects (All Departments)</h4>
          <label className="flex items-center gap-2 text-xs font-normal mb-2">
            <Checkbox checked={showAllSubjects} onCheckedChange={v => setShowAllSubjects(!!v)} />
            <span>Show all subjects (cross-department)</span>
          </label>
          <div className="grid gap-2 md:grid-cols-3 max-h-48 overflow-y-auto pr-1">
            {allSubjects.map(sub => (
              <label key={sub.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer ${selectedSubjects.includes(sub.id)?'bg-primary/10 border-primary':'border-border'}`}
                onClick={() => setSelectedSubjects(selectedSubjects.includes(sub.id) ? selectedSubjects.filter(id => id !== sub.id) : [...selectedSubjects, sub.id])}>
                <Checkbox checked={selectedSubjects.includes(sub.id)} onCheckedChange={() => {}} />
                <span className="truncate">{sub.name} <span className="font-semibold">({sub.code})</span></span>
                <span className="ml-2 text-muted-foreground">Dept: {departments.find(d => d.id === sub.department_id)?.name || 'Unknown'}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Staff Selection */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-2">Staff (All Departments)</h4>
          <div className="grid gap-2 md:grid-cols-3 max-h-44 overflow-y-auto pr-1">
            {allStaff.map(st => (
              <label key={st.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer ${selectedStaffIds.includes(st.id)?'bg-primary/10 border-primary':'border-border'}`}
                onClick={() => setSelectedStaffIds(selectedStaffIds.includes(st.id) ? selectedStaffIds.filter(id => id !== st.id) : [...selectedStaffIds, st.id])}>
                <Checkbox checked={selectedStaffIds.includes(st.id)} onCheckedChange={() => {}} />
                <span className="truncate" title={st.name}>{st.name}</span>
                <span className="ml-2 text-muted-foreground">Dept: {departments.find(d => d.id === st.department_id)?.name || 'Unknown'}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
>>>>>>> 83fb3185b21a4003056fc3c30f9bf395937e4dd5
