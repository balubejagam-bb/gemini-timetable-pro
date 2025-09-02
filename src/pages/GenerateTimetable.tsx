import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Sparkles, Brain, AlertTriangle, CheckCircle, Settings, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClientTimetableGenerator } from "@/lib/timetableGenerator";
import DatabaseDebug from "@/lib/databaseDebug";

interface Department { id: string; name: string; code: string; }
interface Section { id: string; name: string; department_id: string; semester: number; departments?: { name: string }; }
interface Subject { id: string; name: string; code: string; credits: number; hours_per_week: number; department_id: string; semester: number; subject_type: string; departments?: { name: string }; }
interface Staff { id: string; name: string; email?: string; phone?: string; designation: string; department_id: string; max_hours_per_week: number; departments?: { name: string }; }
interface Room { id: string; room_number: string; capacity: number; room_type: string; building?: string; floor?: number; }

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
  const [subjectFilter, setSubjectFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => { (async () => {
    try {
      setLoading(true);
      const { data: deptData, error: deptError } = await supabase.from("departments").select("id, name, code");
      if (deptError) throw deptError; setDepartments(deptData || []);
      const { data: secData, error: secError } = await supabase.from("sections").select("id, name, department_id, semester, departments(name)");
      if (secError) throw secError; setSections(secData || []);
      const { data: subData, error: subError } = await supabase.from("subjects").select("id, name, code, credits, hours_per_week, department_id, semester, subject_type, departments(name)");
      if (subError) throw subError; setSubjects(subData || []);
      const { data: staffData, error: staffError } = await supabase.from("staff").select("id, name, email, phone, designation, department_id, max_hours_per_week, departments(name)");
      if (staffError) throw staffError; setStaff(staffData || []);
      const { data: roomData, error: roomError } = await supabase.from("rooms").select("id, room_number, capacity, room_type, building, floor");
      if (roomError) throw roomError; setRooms(roomData || []);
      setStats({ subjects: subData?.length || 0, staff: staffData?.length || 0, rooms: roomData?.length || 0, timeSlots: 6 });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  })(); }, []);

  const handleGenerate = async () => {
    if (!advancedMode && selectedDepartments.length === 0) { toast({ title: "Selection Required", description: "Select at least one department.", variant: "destructive" }); return; }
    if (advancedMode && selectedSubjects.length === 0) { toast({ title: "Selection Required", description: "Select at least one subject.", variant: "destructive" }); return; }
    setIsGenerating(true); setProgress(0);
    try {
      setProgress(20);
      const aiGenerator = new ClientTimetableGenerator();
      setProgress(40);
      const result = await aiGenerator.generateTimetable(
        selectedDepartments, parseInt(selectedSemester), {
          sections: selectedSections.length ? selectedSections : undefined,
          subjects: selectedSubjects.length ? selectedSubjects : undefined,
            staff: selectedStaff.length ? selectedStaff : undefined,
          advancedMode
        }
      );
      setProgress(80);
      if (result.success) { setProgress(100); toast({ title: "Success", description: `Generated ${result.entriesCount} entries.` }); }
      else { throw new Error(result.error || 'AI generation failed'); }
    } catch (e:unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
      setProgress(0);
    } finally { setIsGenerating(false); }
  };

  const handleDatabaseDiagnostic = async () => { try { toast({ title: "Running Database Diagnostic", description: "Checking..." }); const diagnostic = await DatabaseDebug.runFullDiagnostic(); if (diagnostic.success) { if (diagnostic.issues.length === 0) toast({ title: "Database OK", description: "No issues found." }); else toast({ title: `Found ${diagnostic.issues.length} Issue(s)`, description: "See console for details.", variant: "destructive" }); } else toast({ title: "Diagnostic Failed", description: diagnostic.report, variant: "destructive" }); } catch (e:unknown) { toast({ title: "Diagnostic Error", description: (e as Error).message, variant: "destructive" }); } };

  const toggleDepartment = (id:string) => { setSelectedDepartments(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]); if (!advancedMode){ setSelectedSections([]); setSelectedSubjects([]); setSelectedStaff([]);} };
  const toggleSection = (id:string) => setSelectedSections(p => p.includes(id)? p.filter(x=>x!==id):[...p,id]);
  const toggleSubject = (id:string) => setSelectedSubjects(p => p.includes(id)? p.filter(x=>x!==id):[...p,id]);
  const toggleStaff = (id:string) => setSelectedStaff(p => p.includes(id)? p.filter(x=>x!==id):[...p,id]);

  const needsSupabase = false;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Timetable</h1>
          <p className="text-muted-foreground">Use AI to automatically generate optimized timetables</p>
        </div>
      </div>
      {needsSupabase && (
        <Alert className="border-warning/20 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription><strong>Database Connection Required:</strong> Connect to Supabase to save timetables.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Generation Settings</CardTitle>
              <CardDescription>Configure your timetable generation parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Generation Mode</label>
                <div className="flex items-center space-x-2">
                  <label className={`text-sm cursor-pointer ${!advancedMode ? 'font-medium' : 'text-muted-foreground'}`}>Standard</label>
                  <button className={`relative inline-flex h-5 w-9 rounded-full border-2 transition-colors ${advancedMode ? 'bg-primary' : 'bg-gray-200'}`} onClick={()=>setAdvancedMode(!advancedMode)}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${advancedMode ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <label className={`text-sm cursor-pointer ${advancedMode ? 'font-medium' : 'text-muted-foreground'}`}>Advanced</label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-3 block">Select Semester</label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger><SelectValue placeholder="Choose semester" /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6,7,8].map(n=> <SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-3 block">Select Departments ({selectedDepartments.length} selected)</label>
                {loading ? <div className="grid gap-3 md:grid-cols-2">{[1,2,3,4].map(i=> <div key={i} className="p-4 border rounded-lg animate-pulse"><div className="h-4 bg-muted rounded mb-2"/><div className="h-3 bg-muted rounded w-2/3"/></div>)}</div> : departments.length===0 ? <div className="text-center py-8 text-muted-foreground"><p>No departments found.</p><p className="text-sm mt-1">Add departments first.</p></div> : <div className="grid gap-3 md:grid-cols-2">{departments.map(dept=>{ const deptSections=sections.filter(s=>s.department_id===dept.id); return <div key={dept.id} onClick={()=>toggleDepartment(dept.id)} className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${selectedDepartments.includes(dept.id)?'border-primary bg-primary/5':'border-border'}`}> <div className="flex items-start gap-3"><Checkbox checked={!!selectedDepartments.includes(dept.id)} onCheckedChange={()=>{}} className="mt-1"/><div className="flex-1"><p className="font-medium">{dept.name}</p><p className="text-xs text-muted-foreground">Code: {dept.code}</p><p className="text-sm text-muted-foreground">Sections: {deptSections.length?deptSections.map(s=>s.name).join(', '):'None'}</p></div></div></div>; })}</div>}
              </div>
              {advancedMode && (
                <div>
                  <div className="flex justify-between items-center mb-3"><label className="text-sm font-medium">Select Specific Sections ({selectedSections.length} selected)</label><div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>{ const filtered=sections.filter(s=> !selectedDepartments.length || selectedDepartments.includes(s.department_id)); setSelectedSections(filtered.map(s=>s.id)); }} className="text-xs h-7 px-2">Select All</Button><Button variant="outline" size="sm" onClick={()=>setSelectedSections([])} className="text-xs h-7 px-2">Clear</Button></div></div>
                  {loading ? <div className="grid gap-3 md:grid-cols-2">{[1,2].map(i=> <div key={i} className="p-4 border rounded-lg animate-pulse"><div className="h-4 bg-muted rounded mb-2"/><div className="h-3 bg-muted rounded w-2/3"/></div>)}</div> : sections.length===0 ? <div className="text-center py-4 text-muted-foreground"><p>No sections available.</p><p className="text-sm mt-1">Add sections first.</p></div> : <div><div className="mb-2"><Input placeholder="Search sections..." value={sectionFilter} onChange={e=>setSectionFilter(e.target.value)} /></div><div className="grid gap-3 md:grid-cols-2 max-h-60 overflow-y-auto p-1">{sections.filter(s=> (!selectedDepartments.length || selectedDepartments.includes(s.department_id)) && (sectionFilter==='' || s.name.toLowerCase().includes(sectionFilter.toLowerCase()) || (s.departments?.name||'').toLowerCase().includes(sectionFilter.toLowerCase()))).map(section=> <div key={section.id} onClick={()=>toggleSection(section.id)} className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${selectedSections.includes(section.id)?'border-primary bg-primary/5':'border-border'}`}><div className="flex items-start gap-2"><Checkbox checked={selectedSections.includes(section.id)} onCheckedChange={()=>{}} className="mt-1"/><div><p className="font-medium">{section.name}</p><p className="text-xs text-muted-foreground">{section.departments?.name} - Semester {section.semester}</p></div></div></div>)}</div></div>}
                </div>
              )}
              {advancedMode && (
                <div>
                  <div className="flex justify-between items-center mb-3"><label className="text-sm font-medium">Select Specific Subjects ({selectedSubjects.length} selected)</label><div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>{ const filtered=subjects.filter(sub=> (!selectedDepartments.length || selectedDepartments.includes(sub.department_id)) && (selectedSemester==='' || sub.semester.toString()===selectedSemester)); setSelectedSubjects(filtered.map(s=>s.id)); }} className="text-xs h-7 px-2">Select All</Button><Button variant="outline" size="sm" onClick={()=>setSelectedSubjects([])} className="text-xs h-7 px-2">Clear</Button></div></div>
                  {loading ? <div className="grid gap-3 md:grid-cols-2">{[1,2].map(i=> <div key={i} className="p-4 border rounded-lg animate-pulse"><div className="h-4 bg-muted rounded mb-2"/><div className="h-3 bg-muted rounded w-2/3"/></div>)}</div> : subjects.length===0 ? <div className="text-center py-4 text-muted-foreground"><p>No subjects available.</p><p className="text-sm mt-1">Add subjects first.</p></div> : <div><div className="mb-2"><Input placeholder="Search subjects..." value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)} /></div><div className="grid gap-3 md:grid-cols-2 max-h-60 overflow-y-auto p-1">{subjects.filter(sub=> (!selectedDepartments.length || selectedDepartments.includes(sub.department_id)) && (selectedSemester==='' || sub.semester.toString()===selectedSemester) && (subjectFilter==='' || sub.name.toLowerCase().includes(subjectFilter.toLowerCase()) || sub.code.toLowerCase().includes(subjectFilter.toLowerCase()) || (sub.departments?.name||'').toLowerCase().includes(subjectFilter.toLowerCase()))).map(subject=> <div key={subject.id} onClick={()=>toggleSubject(subject.id)} className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${selectedSubjects.includes(subject.id)?'border-primary bg-primary/5':'border-border'}`}><div className="flex items-start gap-2"><Checkbox checked={selectedSubjects.includes(subject.id)} onCheckedChange={()=>{}} className="mt-1"/><div><p className="font-medium">{subject.name}</p><p className="text-xs text-muted-foreground">{subject.code} - {subject.credits} credits ({subject.hours_per_week} hrs/week)</p><p className="text-xs text-muted-foreground">{subject.departments?.name} - Semester {subject.semester}</p></div></div></div>)}</div></div>}
                </div>
              )}
              {advancedMode && (
                <div>
                  <div className="flex justify-between items-center mb-3"><label className="text-sm font-medium">Select Preferred Staff ({selectedStaff.length} selected)</label><div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>{ const filtered=staff.filter(st=> !selectedDepartments.length || selectedDepartments.includes(st.department_id)); setSelectedStaff(filtered.map(s=>s.id)); }} className="text-xs h-7 px-2">Select All</Button><Button variant="outline" size="sm" onClick={()=>setSelectedStaff([])} className="text-xs h-7 px-2">Clear</Button></div></div>
                  {loading ? <div className="grid gap-3 md:grid-cols-2">{[1,2].map(i=> <div key={i} className="p-4 border rounded-lg animate-pulse"><div className="h-4 bg-muted rounded mb-2"/><div className="h-3 bg-muted rounded w-2/3"/></div>)}</div> : staff.length===0 ? <div className="text-center py-4 text-muted-foreground"><p>No staff available.</p><p className="text-sm mt-1">Add staff first.</p></div> : <div><div className="mb-2"><Input placeholder="Search staff..." value={staffFilter} onChange={e=>setStaffFilter(e.target.value)} /></div><div className="grid gap-3 md:grid-cols-2 max-h-60 overflow-y-auto p-1">{staff.filter(st=> (!selectedDepartments.length || selectedDepartments.includes(st.department_id)) && (staffFilter==='' || st.name.toLowerCase().includes(staffFilter.toLowerCase()) || st.designation?.toLowerCase().includes(staffFilter.toLowerCase()) || (st.departments?.name||'').toLowerCase().includes(staffFilter.toLowerCase()))).map(staffMember=> <div key={staffMember.id} onClick={()=>toggleStaff(staffMember.id)} className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${selectedStaff.includes(staffMember.id)?'border-primary bg-primary/5':'border-border'}`}><div className="flex items-start gap-2"><Checkbox checked={selectedStaff.includes(staffMember.id)} onCheckedChange={()=>{}} className="mt-1"/><div><p className="font-medium">{staffMember.name}</p><p className="text-xs text-muted-foreground">{staffMember.designation} - {staffMember.max_hours_per_week} hrs/week</p><p className="text-xs text-muted-foreground">{staffMember.departments?.name}</p></div></div></div>)}</div></div>}
                </div>
              )}
            </CardContent>
          </Card>
          {isGenerating && (
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 animate-pulse text-primary" />AI Generation in Progress</CardTitle><CardDescription>Please wait while we generate your timetables...</CardDescription></CardHeader><CardContent><div className="space-y-3"><Progress value={progress} /><p className="text-sm text-muted-foreground text-center">{Math.round(progress)}% Complete</p></div></CardContent></Card>
          )}
        </div>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" />Client-Side AI Features</CardTitle><CardDescription>Advanced timetable generation powered by Google Gemini AI</CardDescription></CardHeader><CardContent className="space-y-3">{["Direct API integration (no edge functions)","Gemini AI model","Conflict detection & resolution","Faculty availability optimization","Room capacity matching","Advanced filtering options"].map(t=> <div key={t} className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-success" /><span className="text-sm">{t}</span></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader><CardContent className="space-y-3">{[["Total Subjects",stats.subjects],["Available Rooms",stats.rooms],["Faculty Members",stats.staff],["Time Slots/Day",stats.timeSlots]].map(([l,v])=> <div key={String(l)} className="flex justify-between"><span className="text-sm text-muted-foreground">{l}</span><span className="font-medium">{v}</span></div>)}</CardContent></Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Selection</CardTitle>
              <CardDescription>Departments & Sections included in generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDepartments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No departments selected</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {selectedDepartments.map(deptId => {
                    const dept = departments.find(d => d.id === deptId);
                    const deptSections = sections.filter(s => s.department_id === deptId && s.semester.toString() === selectedSemester);
                    const chosenSections = selectedSections.length ? deptSections.filter(s => selectedSections.includes(s.id)) : deptSections;
                    return (
                      <div key={deptId} className="border rounded-md p-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-xs">{dept?.name || 'Department'}</span>
                          <span className="text-[10px] text-muted-foreground">{chosenSections.length} sec</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {chosenSections.slice(0,8).map(sec => (
                            <span key={sec.id} className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">{sec.name}</span>
                          ))}
                          {chosenSections.length > 8 && (
                            <span className="text-[10px] text-muted-foreground">+{chosenSections.length - 8} more</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground border-t pt-2">
                Semester {selectedSemester} • Subjects {selectedSubjects.length || 'all filter'} • Staff {selectedStaff.length || 'all filter'}
              </div>
            </CardContent>
          </Card>
          <div className="space-y-3">
            <Button onClick={handleGenerate} disabled={isGenerating || needsSupabase} size="lg" className="w-full gap-2 animate-glow"><Sparkles className="w-4 h-4" />{isGenerating?"Generating...": advancedMode?"Generate Custom Timetable":"Generate with AI"}</Button>
            <Button onClick={handleDatabaseDiagnostic} disabled={isGenerating} size="sm" variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-foreground"><Database className="w-4 h-4" />Debug Database Issues</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
