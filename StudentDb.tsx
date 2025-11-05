import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Download, Search } from 'lucide-react';
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
  // Removed subject, offering, faculty, department, section, room, timing state
  const [students, setStudents] = useState<StudentRec[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRec | null>(null);
  // Removed individual generation selections
  // Bulk upload state
  const [csvRows, setCsvRows] = useState<CSVStudentRow[]>([]);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  const studentIdentifierColumn = 'roll_no'; // change to 'register_number' if schema differs in later migration
  // Removed preferences, semester, filter, saving, generating, personalized timetable state

  // Removed simulated student id

  useEffect(() => {
    setLoading(true);
    supabase.from('students').select('id, roll_no, name, email, semester, department_id')
      .then(({ data, error }) => {
        if (error) toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
        {/* Bulk Student Upload */}
        <Card className="md:col-span-1">
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
            <div className="text-xs text-muted-foreground">Columns: roll_no, name, email, semester. Max 1000 rows. Semester defaults to 1.</div>
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
                      <th className="p-1 border text-center">sem</th>
                      <th className="p-1 border text-center">status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0,50).map((r,i)=>(
                      <tr key={i} className={r._status==='invalid' ? 'bg-destructive/10' : r._status==='imported' ? 'bg-emerald-500/10' : ''}>
                        <td className="p-1 border text-center">{i+1}</td>
                        <td className="p-1 border font-mono">{r.roll_no}</td>
                        <td className="p-1 border truncate max-w-[140px]">{r.name}</td>
                        <td className="p-1 border truncate max-w-[140px]">{r.email}</td>
                        <td className="p-1 border text-center">{r.semester}</td>
                        <td className="p-1 border text-center">{r._status}{r._error && <span className="text-destructive"> · {r._error}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvRows.length>50 && <div className="text-[10px] px-2 py-1 text-muted-foreground">Showing first 50 of {csvRows.length} rows.</div>}
              </div>
            )}
          </CardContent>
        </Card>
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
  // Debounced server-side search for students
  useEffect(() => {
    const q = studentSearch.trim();
    let active = true;
    if (!q) return;
    setStudentSearchLoading(true);
    const handle = setTimeout(async () => {
      try {
        const or = `name.ilike.%${q}%,roll_no.ilike.%${q}%`;
        const { data, error } = await supabase.from('students')
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
    }, 400);
    return () => { active = false; clearTimeout(handle); };
  }, [studentSearch]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 25);
    return students;
  }, [students, studentSearch]);

  // Removed all individual generator logic

  // CSV Bulk Upload Helpers
  const sampleCSV = useMemo(() => {
    return [
      'roll_no,name,email,department_code,semester',
      'R001,John Doe,john@example.com,CSE,1',
      'R002,Jane Smith,jane@example.com,ECE,1'
    ].join('\n');
  }, []);

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_sample.csv';
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
      // Only import roll_no, name, email, semester (no department mapping)
      const payload = valid.map(v => ({
        [studentIdentifierColumn]: v.roll_no,
        name: v.name,
        email: v.email || null,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Student Database</h1>
      </div>
      <Separator />
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        {/* Student Search & Edit */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Search className="w-4 h-4" />Find & Edit Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
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
              <div className="space-y-6">
                {!selectedStudent && <div className="text-xs text-muted-foreground">Select a student to view and edit details.</div>}
                {selectedStudent && (
                  <form className="space-y-4" onSubmit={async e => {
                    e.preventDefault();
                    const form = e.target as typeof e.target & { name: { value: string }, email: { value: string }, semester: { value: string } };
                    const updated = {
                      name: form.name.value,
                      email: form.email.value,
                      semester: Number(form.semester.value)
                    };
                    try {
                      const { error } = await supabase.from('students').update(updated).eq('id', selectedStudent.id);
                      if (error) throw error;
                      toast({ title: 'Student updated', description: 'Student data updated successfully.' });
                      setSelectedStudent({ ...selectedStudent, ...updated });
                    } catch (err) {
                      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
                    }
                  }}>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium">Name</label>
                      <Input name="name" defaultValue={selectedStudent.name} required />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium">Email</label>
                      <Input name="email" defaultValue={selectedStudent.email || ''} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium">Semester</label>
                      <Input name="semester" type="number" min={1} max={12} defaultValue={selectedStudent.semester || 1} required />
                    </div>
                    <Button type="submit">Update Student</Button>
                  </form>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Bulk Student Upload */}
        <Card className="md:col-span-1">
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
            <div className="text-xs text-muted-foreground">Columns: roll_no, name, email, semester. Max 1000 rows. Semester defaults to 1.</div>
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
                        <td className="p-1 border text-center">{r.semester}</td>
                        <td className="p-1 border text-center">{r._status}{r._error && <span className="text-destructive"> · {r._error}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvRows.length>50 && <div className="text-[10px] px-2 py-1 text-muted-foreground">Showing first 50 of {csvRows.length} rows.</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
                      </tr>
                    ))}
                  </tbody>
                </table>
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
