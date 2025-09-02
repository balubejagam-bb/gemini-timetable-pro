import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, Clock, Plus, Edit, Trash2, Save, X, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Section {
  id: string;
  name: string;
  department_id: string;
  semester: number;
  department?: {
    id: string;
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface CollegeTiming {
  id: string;
  year_number?: number; // actual DB column
  section?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  section_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function CollegeTimings() {
  const [timings, setTimings] = useState<CollegeTiming[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTiming, setEditingTiming] = useState<CollegeTiming | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filterAcademicYear, setFilterAcademicYear] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const academicYears = [1, 2, 3, 4];

  const fetchSections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select(`
          *,
          department:departments(id, name)
        `)
        .order('name');

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
  }, [toast]);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

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

  const fetchTimings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('college_timings')
        .select('*')
        .order('year_number')
        .order('day_of_week');
      
      if (error) throw error;
      setTimings(data || []);
    } catch (error) {
      const errMsg = error?.message || JSON.stringify(error);
      console.error('Error fetching timings:', errMsg);
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTimings();
    fetchSections();
    fetchDepartments();
  }, [fetchTimings, fetchSections, fetchDepartments]);

  const handleSaveTiming = async (timingData: Omit<CollegeTiming, 'id'> & { id?: string }) => {
    try {
      setLoading(true);

      // Base payload for the database operation
      const payload = {
        year_number: timingData.year_number,
        section: timingData.section,
        day_of_week: timingData.day_of_week,
        start_time: timingData.start_time,
        end_time: timingData.end_time,
        break_start: timingData.break_start,
        break_end: timingData.break_end,
        lunch_start: timingData.lunch_start,
        lunch_end: timingData.lunch_end,
        section_id: timingData.section_id
      };

      if (timingData.id) {
        // Direct update by id when editing
        const { error: updErr } = await supabase.from('college_timings').update(payload).eq('id', timingData.id);
        if (updErr) throw updErr;
        toast({ title: 'Success', description: 'College timing updated' });
      } else {
        // Manual merge: check existing by composite (day_of_week + year_number + section_id/null)
        // Build query stepwise to avoid deep generic instantiation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let queryBuilder: any = (supabase as any).from('college_timings').select('id');
  queryBuilder = queryBuilder.eq('day_of_week', timingData.day_of_week);
  queryBuilder = queryBuilder.eq('year_number', timingData.year_number || 1);
  queryBuilder = timingData.section ? queryBuilder.eq('section', timingData.section) : queryBuilder.is('section', null);
        const { data: existing } = await queryBuilder.maybeSingle();
        if (existing) {
          const confirmUpdate = confirm('Timing already exists for this criteria. Update it?');
          if (!confirmUpdate) { setLoading(false); return; }
          const { error: updErr } = await supabase.from('college_timings').update(payload).eq('id', existing.id);
          if (updErr) throw updErr;
          toast({ title: 'Success', description: 'Existing timing updated' });
        } else {
          const { error: insErr } = await supabase.from('college_timings').insert(payload);
          if (insErr) throw insErr;
          toast({ title: 'Success', description: 'College timing added' });
        }
      }

      setEditingTiming(null);
      setIsAddDialogOpen(false);
      fetchTimings();
    } catch (error) {
      const errMsg = error?.message || JSON.stringify(error);
      console.error('Error saving timing:', errMsg);
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTiming = async (id: string) => {
    if (!confirm("Are you sure you want to delete this timing?")) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('college_timings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "College timing deleted successfully"
      });

      fetchTimings();
    } catch (error) {
      const errMsg = error?.message || JSON.stringify(error);
      console.error('Error deleting timing:', errMsg);
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} selected timing(s)? This cannot be undone.`)) return;
    try {
      setLoading(true);
      // Batch delete by IDs chunk to avoid URL length issues
      const ids = Array.from(selectedIds);
      const chunkSize = 50;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { error } = await supabase.from('college_timings').delete().in('id', chunk);
        if (error) throw error;
      }
      toast({ title: 'Deleted', description: `Removed ${ids.length} timings.` });
      setSelectedIds(new Set());
      fetchTimings();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Delete Failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
      if (lines.length <= 1) {
        toast({ title: 'Import Error', description: 'CSV appears empty', variant: 'destructive' });
        return;
      }
  // Detect delimiter (support comma or tab). Prefer tab if present and yields more columns.
  const headerLineRaw = lines[0].replace(/^\uFEFF/, '');
  const commaCols = headerLineRaw.split(',').length;
  const tabCols = headerLineRaw.split('\t').length;
  const delimiter = (tabCols > 1 && (tabCols > commaCols)) ? '\t' : ',';
  const splitHeader = headerLineRaw.split(delimiter);
  const headers = splitHeader.map(h => h.trim().toLowerCase());
  const isHeader = headers.includes('start_time') && headers.includes('end_time');
      const dataLines = isHeader ? lines.slice(1) : lines;

      const idx = (name: string) => headers.indexOf(name);

      // Support multiple alias names for robustness
      const firstExisting = (...candidates: string[]) => {
        for (const c of candidates) { const i = idx(c); if (i !== -1) return i; }
        return -1;
      };

  const yearIdx = firstExisting('year_number', 'academic_year', 'year');
      const sectionIdx = firstExisting('section', 'section_name');
      const sectionIdIdx = firstExisting('section_id');
      const dayIdx = firstExisting('day_of_week', 'day', 'day_number');
      const daysIdx = firstExisting('days', 'day_list');
      const startIdx = firstExisting('start_time', 'college_start', 'from');
      const endIdx = firstExisting('end_time', 'college_end', 'to');
      const breakSIdx = firstExisting('break_start', 'interval_start');
      const breakEIdx = firstExisting('break_end', 'interval_end');
      const lunchSIdx = firstExisting('lunch_start');
      const lunchEIdx = firstExisting('lunch_end');

      if (startIdx === -1 || endIdx === -1) {
        toast({ title: 'Import Error', description: 'Missing start_time/end_time columns', variant: 'destructive' });
        return;
      }

  interface Row { year_number: number; section: string | null; section_id: string | null; day_of_week: number; start_time: string; end_time: string; break_start: string | null; break_end: string | null; lunch_start: string | null; lunch_end: string | null; }
      const rows: Row[] = [];
      const invalid: { raw: string; reason: string }[] = [];
      const addRow = (base: Omit<Row,'day_of_week'>, day: number) => {
        if (day < 1 || day > 6) { return; }
        rows.push({ ...base, day_of_week: day });
      };

      // Map textual day names to 1-6
      const dayNameMap: Record<string, number> = {
        monday: 1, mon: 1,
        tuesday: 2, tue: 2, tues: 2,
        wednesday: 3, wed: 3,
        thursday: 4, thu: 4, thurs: 4,
        friday: 5, fri: 5,
        saturday: 6, sat: 6
      };

      const numericDay = (token: string): number | null => {
        if (!token) return null;
        const lower = token.toLowerCase();
        if (dayNameMap[lower] !== undefined) return dayNameMap[lower];
        const num = parseInt(token, 10);
        return isNaN(num) ? null : num;
      };

      const splitRow = (row: string) => row.split(delimiter).map(p => p.trim());

      dataLines.forEach((raw, lineIdx) => {
        // Normalize unicode dashes and non-breaking spaces; trim right to avoid phantom empty columns
        const normalized = raw.replace(/[–—−]/g, '-').replace(/\u00A0/g, ' ').replace(/\s+$/,'');
        const parts = splitRow(normalized);
  const year_number = yearIdx !== -1 ? parseInt(parts[yearIdx] || '1', 10) || 1 : 1;
        const sectionLabel = sectionIdx !== -1 ? (parts[sectionIdx] || null) : null;
        const section_id = sectionIdIdx !== -1 ? (parts[sectionIdIdx] || null) : null;
        const start_time = parts[startIdx] || '09:00';
        const end_time = parts[endIdx] || '17:00';
        const break_start = breakSIdx !== -1 ? (parts[breakSIdx] || null) : null;
        const break_end = breakEIdx !== -1 ? (parts[breakEIdx] || null) : null;
        const lunch_start = lunchSIdx !== -1 ? (parts[lunchSIdx] || null) : null;
        const lunch_end = lunchEIdx !== -1 ? (parts[lunchEIdx] || null) : null;

        // Basic time validation pattern HH:MM
        const timeRe = /^\d{1,2}:\d{2}$/;
        const safeTime = (t: string | null, fallback: string | null) => (t && timeRe.test(t) ? t : fallback);
  const base = { year_number, section: sectionLabel, section_id, start_time: safeTime(start_time,'09:00') as string, end_time: safeTime(end_time,'17:00') as string, break_start: safeTime(break_start, null), break_end: safeTime(break_end, null), lunch_start: safeTime(lunch_start, null), lunch_end: safeTime(lunch_end, null) };

        if (daysIdx !== -1) {
          const rawDaysCell = parts[daysIdx] ? parts[daysIdx].replace(/^"|"$/g,'').trim() : '';
          if (rawDaysCell) {
            const tokens = rawDaysCell.split(/;/).join(',').split(',').map(t => t.trim()).filter(Boolean);
            const days: number[] = [];
            tokens.forEach(t => {
              if (t.includes('-')) {
                const [aRaw,bRaw] = t.split('-');
                const a = numericDay(aRaw.trim());
                const b = numericDay(bRaw.trim());
                if (a && b) { for (let d=a; d<=b; d++) if (d>=1 && d<=6) days.push(d); }
              } else {
                const d = numericDay(t);
                if (d && d>=1 && d<=6) days.push(d);
              }
            });
            // Deduplicate
            const uniqueDays = Array.from(new Set(days));
            if (uniqueDays.length) {
              uniqueDays.forEach(d => addRow(base, d));
              return; // processed
            }
            // fall through to day_of_week fallback if no valid days parsed
          }
          // fallback path: use day_of_week column if present
          if (dayIdx !== -1 && parts[dayIdx]) {
            const dTok = parts[dayIdx].trim();
            const dayNum = numericDay(dTok) || 0;
            if (dayNum>=1 && dayNum<=6) { addRow(base, dayNum); return; }
          }
          invalid.push({ raw, reason: 'No valid days parsed (line ' + (lineIdx+2) + ') cell="' + rawDaysCell + '"' });
          return;
        }
        // Case: no days column at all
        const dTok = dayIdx !== -1 ? (parts[dayIdx] || '') : '1';
        const dayNum = numericDay(dTok) || 1;
        addRow(base, dayNum);
      });

      if (!rows.length) {
        const firstReasons = invalid.slice(0,5).map(i => i.reason).join('; ');
        toast({ title: 'Import Error', description: `No valid rows. Invalid: ${invalid.length}${firstReasons? ' | ' + firstReasons : ''}`.slice(0,300), variant: 'destructive' });
        console.warn('[CollegeTimings Import] Invalid lines detail:', invalid);
        return;
      }

      if (!confirm(`Import ${rows.length} timing rows?`)) {
        toast({ title: 'Import Cancelled', description: 'No timings were imported' });
        return;
      }

      // Manual merge per row (avoids reliance on DB composite unique constraint)
      let inserted = 0; let updated = 0; let failed = 0; let firstErr: string | null = null;
      for (const r of rows) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let q: any = (supabase as any).from('college_timings').select('id');
          q = q.eq('day_of_week', r.day_of_week);
          q = q.eq('year_number', r.year_number);
          q = r.section ? q.eq('section', r.section) : q.is('section', null);
          const { data: existing } = await q.maybeSingle();
          if (existing) {
            const { error: uErr } = await supabase.from('college_timings').update(r).eq('id', existing.id);
            if (uErr) throw uErr; else updated++;
          } else {
            const { error: iErr } = await supabase.from('college_timings').insert(r);
            if (iErr) throw iErr; else inserted++;
          }
        } catch (err) {
          failed++; if (!firstErr && err instanceof Error) firstErr = err.message;
        }
      }
      toast({ title: failed ? 'Partial Import' : 'Import Complete', description: `Inserted:${inserted} Updated:${updated} Failed:${failed} Invalid:${invalid.length}${firstErr?` Err:${firstErr}`:''}`.slice(0,300) });
      fetchTimings();
    } catch (e: unknown) {
      const msg = (e instanceof Error) ? e.message : String(e);
      console.error('Error importing timings:', msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      event.target.value = '';
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    
    try {
      const date = new Date(`2000-01-01T${time}`);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return time;
    }
  };

  const getDayName = (dayNumber: number) => {
    return daysOfWeek[dayNumber - 1] || `Day ${dayNumber}`;
  };
  
  const downloadSampleCSV = () => {
  const csvContent =
  '# year_number: 1-4 (default 1)\n' +
  '# day_of_week: 1=Mon .. 6=Sat (or use days list for multiple)\n' +
  '# days: comma/semicolon list or ranges (e.g. 1-5,1;3;5) to apply to multiple days\n' +
  '# section_id optional; section text stored if provided (blank = global year)\n' +
  'year_number,section,day_of_week,start_time,end_time,break_start,break_end,lunch_start,lunch_end,section_id,days\n' +
  '1,A,1,09:00,17:00,10:30,10:45,12:30,13:00,,,\n' +
  '2,B,2,09:00,16:30,10:20,10:35,12:30,13:15,,,\n' +
  '1,,3,08:45,16:00,10:30,10:45,12:15,12:55,,,\n' +
  '3,C,,08:30,16:30,10:00,10:15,12:00,12:30,,1-5\n' +
  '4,D,,08:00,16:00,10:00,10:20,13:00,14:00,,1;3;5\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'college_timings_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const filteredTimings = timings.filter(timing => {
  const matchesAcademicYear = filterAcademicYear === "all" || 
          timing.year_number === parseInt(filterAcademicYear);
      
    const matchesSection = filterSection === "all" || 
                          timing.section_id === filterSection;
                          
    const matchesDepartment = filterDepartment === "all" || 
                             (timing.section_id && 
                              sections.find(s => s.id === timing.section_id)?.department_id === filterDepartment);
    
    return matchesAcademicYear && matchesSection && matchesDepartment;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">College Timings</h1>
          <p className="text-muted-foreground">
            Manage schedules for different years, semesters and sections
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={loading}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete Selected ({selectedIds.size})
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
            </div>
          )}
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="timings-upload"
            />
            <Button variant="outline" size="sm" asChild className="gap-2">
              <label htmlFor="timings-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadSampleCSV}
          >
            Download Sample CSV
          </Button>
          {filteredTimings.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allIds = filteredTimings.map(t => t.id);
                const allSelected = allIds.every(id => selectedIds.has(id));
                setSelectedIds(allSelected ? new Set() : new Set(allIds));
              }}
            >
              {filteredTimings.every(t => selectedIds.has(t.id)) ? 'Deselect All' : 'Select All'}
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Timing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New College Timing</DialogTitle>
                <DialogDescription>Define schedule hours, breaks and lunch for a day or multiple days.</DialogDescription>
              </DialogHeader>
              <TimingForm 
                daysOfWeek={daysOfWeek}
                academicYears={academicYears}
                sections={sections}
                departments={departments}
                downloadSampleCSV={downloadSampleCSV}
                onSave={handleSaveTiming}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 flex-wrap mb-4">
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(department => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterAcademicYear} onValueChange={setFilterAcademicYear}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {academicYears.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year === 1 ? '1st Year' : year === 2 ? '2nd Year' : year === 3 ? '3rd Year' : `${year}th Year`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections
              .filter(section => filterDepartment === "all" || section.department_id === filterDepartment)
              .map(section => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timings Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            College Schedule ({filteredTimings.length})
          </CardTitle>
          <CardDescription>
            Year-wise and semester-wise timings and schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTimings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No timings configured</p>
              <p className="text-sm">Add college timings to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTimings.map((timing) => (
                <Card key={timing.id} className={`hover:shadow-md transition-shadow ${selectedIds.has(timing.id) ? 'ring-2 ring-primary/60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          aria-label={selectedIds.has(timing.id) ? 'Unselect timing' : 'Select timing'}
                          onClick={() => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (next.has(timing.id)) next.delete(timing.id); else next.add(timing.id);
                              return next;
                            });
                          }}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {selectedIds.has(timing.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                        <h3 className="font-semibold text-lg">
                          {getDayName(timing.day_of_week)}
                        </h3>
                        <div className="flex gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            Year {timing.year_number}
                          </Badge>

                          {timing.section_id && (
                            <Badge variant="default" className="text-xs">
                              {sections.find(s => s.id === timing.section_id)?.name || `Section ${timing.section}`}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(timing.start_time)} - {formatTime(timing.end_time)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTiming(timing)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTiming(timing.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mt-3 pt-3 border-t border-muted/20">
                      <TimeRange 
                        label="College Hours"
                        startTime={timing.start_time}
                        endTime={timing.end_time}
                        colorClass="bg-green-500"
                      />
                      
                      {timing.break_start && timing.break_end && (
                        <TimeRange 
                          label="Break"
                          startTime={timing.break_start}
                          endTime={timing.break_end}
                          colorClass="bg-blue-400"
                        />
                      )}
                      
                      {timing.lunch_start && timing.lunch_end && (
                        <TimeRange 
                          label="Lunch"
                          startTime={timing.lunch_start}
                          endTime={timing.lunch_end}
                          colorClass="bg-amber-500"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingTiming && (
        <Dialog open={!!editingTiming} onOpenChange={() => setEditingTiming(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit College Timing</DialogTitle>
              <DialogDescription>Modify schedule details and save changes.</DialogDescription>
            </DialogHeader>
            <TimingForm 
              timing={editingTiming}
              daysOfWeek={daysOfWeek}
              academicYears={academicYears}
              sections={sections}
              departments={departments}
              downloadSampleCSV={downloadSampleCSV}
              onSave={handleSaveTiming}
              onCancel={() => setEditingTiming(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Time Range Component
interface TimeRangeProps {
  label: string;
  startTime: string;
  endTime: string;
  colorClass: string; // Full Tailwind class for the dot color
}

function TimeRange({ label, startTime, endTime, colorClass }: TimeRangeProps) {
  const formatTime = (time: string) => {
    if (!time) return '';
    
    try {
      const date = new Date(`2000-01-01T${time}`);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return time;
    }
  };
  
  const calculateDuration = (start: string, end: string): string => {
    if (!start || !end) return '';
    
    try {
      const startDate = new Date(`2000-01-01T${start}`);
      const endDate = new Date(`2000-01-01T${end}`);
      
      // Calculate difference in minutes
      let diffMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      
      // If negative (crossing midnight), add 24 hours
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
      }
      
      const hours = Math.floor(diffMinutes / 60);
      const minutes = Math.floor(diffMinutes % 60);
      
      if (hours === 0) {
        return `${minutes}m`;
      } else if (minutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${minutes}m`;
      }
    } catch {
      return '';
    }
  };
  
  const duration = calculateDuration(startTime, endTime);
  
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${colorClass}`}></div>
      <div className="text-sm font-medium flex-1">
        {label}
        <span className="text-muted-foreground font-normal ml-1">
          {formatTime(startTime)} - {formatTime(endTime)}
        </span>
      </div>
      {duration && (
        <div className="text-xs bg-muted/30 text-muted-foreground px-1.5 py-0.5 rounded">
          {duration}
        </div>
      )}
    </div>
  );
}

// Timing Form Component
interface TimingFormProps {
  timing?: CollegeTiming;
  daysOfWeek: string[];
  academicYears: number[];
  sections: Section[];
  departments: Department[];
  downloadSampleCSV: () => void;
  onSave: (timing: Omit<CollegeTiming, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

function TimingForm({ timing, daysOfWeek, academicYears, sections, departments, downloadSampleCSV, onSave, onCancel }: TimingFormProps) {
  const [formData, setFormData] = useState({
    id: timing?.id || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    year_number: (timing as any)?.year_number || 1,
    section: timing?.section || null,
    section_id: timing?.section_id || null,
    day_of_week: timing?.day_of_week || 1,
    start_time: timing?.start_time || '09:00',
    end_time: timing?.end_time || '17:00',
    break_start: timing?.break_start || '',
    break_end: timing?.break_end || '',
    lunch_start: timing?.lunch_start || '',
    lunch_end: timing?.lunch_end || ''
  });
  
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([timing?.day_of_week || 1]);
  const [applyToMultipleDays, setApplyToMultipleDays] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDaySelection = (dayIndex: number) => {
    setSelectedDays(prev => {
      if (prev.includes(dayIndex)) {
        return prev.filter(d => d !== dayIndex);
      } else {
        return [...prev, dayIndex];
      }
    });
  };

  const handleSelectAllDays = () => {
    if (selectedDays.length === daysOfWeek.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays(daysOfWeek.map((_, i) => i + 1));
    }
  };

  const validateTimes = () => {
    const newErrors: Record<string, string> = {};
    
    // Helper function to compare times
    const isTimeAfter = (time1: string, time2: string): boolean => {
      if (!time1 || !time2) return true;
      return time1 >= time2;
    };
    
    // Validate start and end time
    if (!formData.start_time) {
      newErrors.start_time = "Start time is required";
    }
    
    if (!formData.end_time) {
      newErrors.end_time = "End time is required";
    } else if (isTimeAfter(formData.start_time, formData.end_time)) {
      newErrors.end_time = "End time must be after start time";
    }
    
    // Validate break times if both are provided
    if (formData.break_start && formData.break_end) {
      if (isTimeAfter(formData.break_start, formData.break_end)) {
        newErrors.break_end = "Break end time must be after break start time";
      }
      
      // Check if break is within college hours
      if (formData.break_start < formData.start_time) {
        newErrors.break_start = "Break must be within college hours";
      }
      
      if (formData.break_end > formData.end_time) {
        newErrors.break_end = "Break must be within college hours";
      }
    } else if ((formData.break_start && !formData.break_end) || (!formData.break_start && formData.break_end)) {
      newErrors.break_start = "Both break start and end times must be provided";
    }
    
    // Validate lunch times if both are provided
    if (formData.lunch_start && formData.lunch_end) {
      if (isTimeAfter(formData.lunch_start, formData.lunch_end)) {
        newErrors.lunch_end = "Lunch end time must be after lunch start time";
      }
      
      // Check if lunch is within college hours
      if (formData.lunch_start < formData.start_time) {
        newErrors.lunch_start = "Lunch must be within college hours";
      }
      
      if (formData.lunch_end > formData.end_time) {
        newErrors.lunch_end = "Lunch must be within college hours";
      }
    } else if ((formData.lunch_start && !formData.lunch_end) || (!formData.lunch_start && formData.lunch_end)) {
      newErrors.lunch_start = "Both lunch start and end times must be provided";
    }
    
    // Validate selected days
    if (applyToMultipleDays && selectedDays.length === 0) {
      newErrors.selectedDays = "Please select at least one day";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!validateTimes()) {
      return;
    }
    
    const baseTimingData = {
      ...formData,
      break_start: formData.break_start || null,
      break_end: formData.break_end || null,
      lunch_start: formData.lunch_start || null,
      lunch_end: formData.lunch_end || null
    };

    if (!applyToMultipleDays) {
      // Save for single day as before
      onSave(baseTimingData);
      return;
    }
    
    // Apply to multiple selected days
    try {
      // Submit each selected day
      for (const dayIndex of selectedDays) {
        await onSave({
          ...baseTimingData,
          day_of_week: dayIndex,
          // Only keep the ID if this is the original day being edited
          id: dayIndex === formData.day_of_week ? formData.id : undefined
        });
      }
    } catch (error) {
      console.error("Error saving multiple days:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2 pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="year_number">Academic Year *</Label>
          <Select
            value={formData.year_number.toString()}
            onValueChange={(value) => setFormData(prev => ({ ...prev, year_number: parseInt(value) }))}
          >
  {/* semester removed: not present in current DB schema */}
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year === 1 ? '1st Year' : year === 2 ? '2nd Year' : year === 3 ? '3rd Year' : `${year}th Year`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="department">Department</Label>
          <Select
            value={selectedDepartment || 'none'}
            onValueChange={(value) => {
              setSelectedDepartment(value === 'none' ? null : value);
              // Clear section selection when department changes
              setFormData(prev => ({ ...prev, section_id: null }));
            }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="section">Section</Label>
          <Select
            value={formData.section_id || 'none'}
            onValueChange={(value) => {
              const sectionId = value === 'none' ? null : value;
              const selectedSection = sections.find(s => s.id === sectionId);
              
              setFormData(prev => ({ 
                ...prev, 
                section_id: sectionId,
                section: selectedSection ? selectedSection.name : null 
              }));
            }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All Sections</SelectItem>
              {sections
                .filter(section => !selectedDepartment || section.department_id === selectedDepartment)
                .map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="sm:col-span-2">
        <Label htmlFor="day_of_week">Day of Week *</Label>
        <Select
          value={formData.day_of_week.toString()}
          onValueChange={(value) => setFormData(prev => ({ ...prev, day_of_week: parseInt(value) }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Day" />
          </SelectTrigger>
          <SelectContent>
            {daysOfWeek.map((day, index) => (
              <SelectItem key={day} value={(index + 1).toString()}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="sm:col-span-2 flex items-center space-x-2">
        <input
          type="checkbox"
          id="applyToMultiple"
          checked={applyToMultipleDays}
          onChange={() => setApplyToMultipleDays(!applyToMultipleDays)}
          className="h-4 w-4 rounded border-gray-300 focus:ring-2"
        />
        <Label htmlFor="applyToMultiple" className="cursor-pointer">Apply to multiple days</Label>
      </div>

      {applyToMultipleDays && (
        <div className={`sm:col-span-2 space-y-2 p-3 border rounded-lg ${errors.selectedDays ? 'border-red-500 bg-red-50/10' : 'bg-muted/20'}`}>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Select Days to Apply:</Label>
            <Button 
              type="button" 
              size="sm" 
              variant={selectedDays.length === daysOfWeek.length ? "default" : "outline"}
              onClick={handleSelectAllDays}
              className="h-8 px-2 text-xs"
            >
              {selectedDays.length === daysOfWeek.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day, index) => (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={selectedDays.includes(index + 1) ? "default" : "outline"}
                onClick={() => {
                  handleDaySelection(index + 1);
                  setErrors(prev => ({ ...prev, selectedDays: '' }));
                }}
                className="h-8 px-2 text-xs flex-1 min-w-[80px] sm:min-w-0"
              >
                {day}
              </Button>
            ))}
          </div>
          <p className={`text-xs mt-1 ${errors.selectedDays ? "text-red-500" : "text-muted-foreground"}`}>
            {errors.selectedDays || `Selected ${selectedDays.length} of ${daysOfWeek.length} days`}
          </p>
        </div>
      )}

      <div className="sm:col-span-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/10">
          <div className="sm:col-span-2 mb-1">
            <h3 className="font-medium text-sm">College Hours</h3>
          </div>
          <div>
            <Label htmlFor="start_time">Start Time *</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, start_time: e.target.value }));
                setErrors(prev => ({ ...prev, start_time: '' }));
              }}
              required
              className={`w-full ${errors.start_time ? 'border-red-500' : ''}`}
            />
            {errors.start_time && (
              <p className="text-xs text-red-500 mt-1">{errors.start_time}</p>
            )}
          </div>
          <div>
            <Label htmlFor="end_time">End Time *</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, end_time: e.target.value }));
                setErrors(prev => ({ ...prev, end_time: '' }));
              }}
              required
              className={`w-full ${errors.end_time ? 'border-red-500' : ''}`}
            />
            {errors.end_time && (
              <p className="text-xs text-red-500 mt-1">{errors.end_time}</p>
            )}
          </div>
        </div>
      </div>

      <div className="sm:col-span-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/10">
          <div className="sm:col-span-2 mb-1">
            <h3 className="font-medium text-sm">Break Time</h3>
            <p className="text-xs text-muted-foreground">Leave blank if no break</p>
          </div>
          <div>
            <Label htmlFor="break_start">Break Start</Label>
            <Input
              id="break_start"
              type="time"
              value={formData.break_start}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, break_start: e.target.value }));
                setErrors(prev => ({ ...prev, break_start: '' }));
              }}
              className={`w-full ${errors.break_start ? 'border-red-500' : ''}`}
            />
            {errors.break_start && (
              <p className="text-xs text-red-500 mt-1">{errors.break_start}</p>
            )}
          </div>
          <div>
            <Label htmlFor="break_end">Break End</Label>
            <Input
              id="break_end"
              type="time"
              value={formData.break_end}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, break_end: e.target.value }));
                setErrors(prev => ({ ...prev, break_end: '' }));
              }}
              className={`w-full ${errors.break_end ? 'border-red-500' : ''}`}
            />
            {errors.break_end && (
              <p className="text-xs text-red-500 mt-1">{errors.break_end}</p>
            )}
          </div>
        </div>
      </div>

      <div className="sm:col-span-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/10">
          <div className="sm:col-span-2 mb-1">
            <h3 className="font-medium text-sm">Lunch Time</h3>
            <p className="text-xs text-muted-foreground">Leave blank if no lunch break</p>
          </div>
          <div>
            <Label htmlFor="lunch_start">Lunch Start</Label>
            <Input
              id="lunch_start"
              type="time"
              value={formData.lunch_start}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, lunch_start: e.target.value }));
                setErrors(prev => ({ ...prev, lunch_start: '' }));
              }}
              className={`w-full ${errors.lunch_start ? 'border-red-500' : ''}`}
            />
            {errors.lunch_start && (
              <p className="text-xs text-red-500 mt-1">{errors.lunch_start}</p>
            )}
          </div>
          <div>
            <Label htmlFor="lunch_end">Lunch End</Label>
            <Input
              id="lunch_end"
              type="time"
              value={formData.lunch_end}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, lunch_end: e.target.value }));
                setErrors(prev => ({ ...prev, lunch_end: '' }));
              }}
              className={`w-full ${errors.lunch_end ? 'border-red-500' : ''}`}
            />
            {errors.lunch_end && (
              <p className="text-xs text-red-500 mt-1">{errors.lunch_end}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="gap-2"
          type="button"
          onClick={downloadSampleCSV}
        >
          Download Timings Sample CSV
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-1" />
          Save Timing
        </Button>
      </div>
    </form>
  );
}
