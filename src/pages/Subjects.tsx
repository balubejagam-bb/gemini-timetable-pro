import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, BookOpen, Plus, Edit, Trash2, Search, Save, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  hours_per_week: number;
  department_id: string;
  semester: number;
  subject_type: string;
  department?: {
    id: string;
    name: string;
  };
}

interface SubjectDepartment {
  id: string;
  subject_id: string;
  department_id: string;
  semester: number;
  is_core: boolean;
}

interface Department {
  id: string;
  name: string;
  code?: string; // include code for CSV mapping
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjectDepartments, setSubjectDepartments] = useState<SubjectDepartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [filterSubjectType, setFilterSubjectType] = useState("all");
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  const subjectTypes = ["theory", "lab", "practical", "project"];
  const minimumPeriods = [5, 6, 7, 8]; // Minimum periods per week options

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(id, name)
        `)
        .order('code');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        description: "Failed to load subjects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
    fetchDepartments();
  }, [fetchSubjects, fetchDepartments]);

  const handleSaveSubject = async (subjectData: Omit<Subject, 'id'> & { id?: string }) => {
    try {
      setLoading(true);
      
      const subjectToSave = {
        name: subjectData.name,
        code: subjectData.code,
        credits: subjectData.credits,
        hours_per_week: subjectData.hours_per_week,
        department_id: subjectData.department_id,
        semester: subjectData.semester,
        subject_type: subjectData.subject_type
      };
      
      if (subjectData.id) {
        // Update existing subject
        const { error } = await supabase
          .from('subjects')
          .update(subjectToSave)
          .eq('id', subjectData.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Subject updated successfully"
        });
      } else {
        // Add new subject
        const { error } = await supabase
          .from('subjects')
          .insert(subjectToSave);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Subject added successfully"
        });
      }
      
      setEditingSubject(null);
      setIsAddDialogOpen(false);
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast({
        title: "Error",
        description: "Failed to save subject",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Subject deleted successfully"
      });
      
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({
        title: "Error",
        description: "Failed to delete subject",
        variant: "destructive"
      });
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

      // Header detection
      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(',').map(h => h.trim());
      
      // Map headers to indices
      const colMap = new Map<string, number>();
      headers.forEach((h, i) => colMap.set(h, i));

      // Check for required columns
      // subject_name, subject_code, credits, hours, department_code, department_name, semester, subject_type
      const hasDeptCode = colMap.has('department_code');
      const hasDeptName = colMap.has('department_name');
      
      // Fallback for legacy columns
      const nameIdx = colMap.has('subject_name') ? colMap.get('subject_name') : colMap.get('name');
      const codeIdx = colMap.has('subject_code') ? colMap.get('subject_code') : colMap.get('code');
      
      if (!hasDeptCode || nameIdx === undefined || codeIdx === undefined) {
        toast({ 
          title: "Import Error", 
          description: "CSV must have 'department_code', 'subject_name' (or 'name'), and 'subject_code' (or 'code') columns.", 
          variant: "destructive" 
        });
        return;
      }

      // Build department lookup maps
      const deptByCode = new Map<string, Department>();
      departments.forEach(d => {
        if (d.code) deptByCode.set(d.code.toLowerCase(), d);
      });

      interface Row { name: string; code: string; credits: number; hours_per_week: number; department_id: string; semester: number; subject_type: string; }
      interface RowResult { raw: string; row?: Row; reason?: string; }

      const valid: Row[] = [];
      const invalid: RowResult[] = [];
      const seenCodes = new Set<string>();
      const allowedTypes = new Set(['theory', 'lab', 'practical']);
      const newDeptsToCreate = new Map<string, string>(); // code -> name

      const dataLines = lines.slice(1);

      for (const raw of dataLines) {
        const cols = raw.split(',').map(c => c.trim());
        
        const name = cols[nameIdx!] || '';
        const code = cols[codeIdx!] || '';
        const deptCode = cols[colMap.get('department_code')!] || '';
        const deptName = hasDeptName ? (cols[colMap.get('department_name')!] || '') : '';
        
        const creditsStr = colMap.has('credits') ? cols[colMap.get('credits')!] : '3';
        const hoursStr = colMap.has('hours') ? cols[colMap.get('hours')!] : (colMap.has('hours_per_week') ? cols[colMap.get('hours_per_week')!] : '3');
        const semStr = colMap.has('semester') ? cols[colMap.get('semester')!] : '1';
        const typeRaw = colMap.has('subject_type') ? cols[colMap.get('subject_type')!] : (colMap.has('type') ? cols[colMap.get('type')!] : 'theory');

        if (!name || !code || !deptCode) { 
          invalid.push({ raw, reason: 'Missing name, code, or department_code' }); 
          continue; 
        }
        if (seenCodes.has(code)) { invalid.push({ raw, reason: 'Duplicate code in file' }); continue; }
        seenCodes.add(code);

        const credits = parseInt(creditsStr, 10) || 3;
        const hours = parseInt(hoursStr, 10) || 3;
        const semester = parseInt(semStr, 10) || 1;
        
        let type = (typeRaw || 'theory').toLowerCase();
        if (type === 'project') type = 'practical';
        const subject_type = allowedTypes.has(type) ? type : 'theory';

        const codeLower = deptCode.toLowerCase();
        let dept = deptByCode.get(codeLower);

        if (!dept) {
          if (deptName) {
            if (!newDeptsToCreate.has(codeLower)) {
              newDeptsToCreate.set(codeLower, deptName);
            }
            valid.push({ name, code, credits, hours_per_week: hours, department_id: `__NEW__:${codeLower}`, semester, subject_type });
          } else {
            invalid.push({ raw, reason: `Department code '${deptCode}' not found` });
          }
        } else {
          valid.push({ name, code, credits, hours_per_week: hours, department_id: dept.id, semester, subject_type });
        }
      }

      // Create new departments
      if (newDeptsToCreate.size > 0) {
        const toInsert = Array.from(newDeptsToCreate.entries()).map(([code, name]) => ({
          code: code.toUpperCase(),
          name: name
        }));

        const { data: createdDepts, error: createError } = await supabase
          .from('departments')
          .insert(toInsert)
          .select('id, code');

        if (createError) {
          console.error('Error creating departments:', createError);
          toast({ title: "Import Warning", description: "Failed to create new departments.", variant: "destructive" });
        } else if (createdDepts) {
          createdDepts.forEach(d => {
            if (d.code) deptByCode.set(d.code.toLowerCase(), { id: d.id, name: '', code: d.code } as Department);
          });
          toast({ title: "Info", description: `Created ${createdDepts.length} new departments.` });
        }
      }

      // Resolve pending departments
      const finalRows = valid.map(r => {
        if (r.department_id.startsWith('__NEW__:')) {
          const code = r.department_id.split(':')[1];
          const dept = deptByCode.get(code);
          if (dept) {
            return { ...r, department_id: dept.id };
          } else {
            return null;
          }
        }
        return r;
      }).filter(r => r !== null) as Row[];

      if (!finalRows.length) {
        toast({ title: 'Import Error', description: `No valid rows. ${invalid.length} invalid.`, variant: 'destructive' });
        return;
      }

      // Upsert by code (unique on code)
      const { error: bulkError } = await supabase.from('subjects').upsert(finalRows, { onConflict: 'code', ignoreDuplicates: true });
      let inserted = finalRows.length;
      let failed = 0;
      let firstError: string | null = null;
      if (bulkError) {
        // fallback row-by-row
        inserted = 0;
        for (const row of finalRows) {
          const { error: rowErr } = await supabase.from('subjects').upsert(row, { onConflict: 'code', ignoreDuplicates: true });
          if (rowErr) { failed++; if (!firstError) firstError = rowErr.message; } else { inserted++; }
        }
      }

      const summary: string[] = [];
      if (invalid.length) summary.push(`Invalid: ${invalid.length}`);
      if (failed) summary.push(`Failed: ${failed}`);
      if (firstError) summary.push(`First error: ${firstError}`);

      toast({
        title: failed || invalid.length ? 'Partial Import' : 'Import Complete',
        description: `Imported ~${inserted} of ${finalRows.length} rows. ${summary.join(' | ') || 'All good.'}`.slice(0,300)
      });
      fetchSubjects();
      fetchDepartments();
    } catch (error) {
      console.error('Error importing subjects:', error);
      toast({ title: 'Error', description: 'Failed to import subjects', variant: 'destructive' });
    } finally {
      event.target.value = '';
    }
  };

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filterDepartment === "all" || 
                              subject.department_id === filterDepartment;
    
    const matchesSemester = filterSemester === "all" || 
                           subject.semester === parseInt(filterSemester);
    
    const matchesType = filterSubjectType === "all" ||
                        subject.subject_type === filterSubjectType;
    
    return matchesSearch && matchesDepartment && matchesSemester && matchesType;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filteredSubjects.length > 0 && filteredSubjects.every(s => selectedIds.has(s.id));

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected subject(s)? This cannot be undone.`)) return;
    try {
      setLoading(true);
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('subjects').delete().in('id', ids);
      if (error) throw error;
      toast({ title: 'Deleted', description: `${ids.length} subjects removed.` });
      setSelectedIds(new Set());
      fetchSubjects();
    } catch (e) {
      console.error('Bulk delete subjects error', e);
      toast({ title: 'Error', description: 'Failed bulk delete', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            Manage academic curriculum and course subjects
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="subjects-upload"
            />
            <Button variant="outline" size="sm" asChild className="gap-2">
              <label htmlFor="subjects-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csvContent =
                'subject_name,subject_code,credits,hours_per_week,department_code,department_name,semester,subject_type\n' +
                'Data Structures,CSE101,4,5,CSE,Computer Science Engineering,3,theory\n' +
                'Database Management,CSE202,3,5,CSE,Computer Science Engineering,4,theory\n' +
                'Operating Systems Lab,CSE303,2,6,CSE,Computer Science Engineering,5,lab\n' +
                '# department_code is required. department_name is optional but recommended for auto-creation.\n' +
                '# subject_type must be one of: theory, lab, practical';
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'subjects_sample.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Download Sample CSV
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
                <DialogDescription>Enter subject details below to create a new subject.</DialogDescription>
              </DialogHeader>
              <SubjectForm 
                departments={departments}
                semesters={semesters}
                subjectTypes={subjectTypes}
                minimumPeriods={minimumPeriods}
                onSave={handleSaveSubject}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          {selectedIds.size > 0 && (
            <Button variant="secondary" size="sm" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSemester} onValueChange={setFilterSemester}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Semesters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {semesters.map(sem => (
              <SelectItem key={sem} value={sem.toString()}>
                Sem {sem}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSubjectType} onValueChange={setFilterSubjectType}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {subjectTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {filteredSubjects.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            if (allFilteredSelected) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(filteredSubjects.map(s => s.id)));
            }
          }}
        >
          {allFilteredSelected ? 'Clear Selection' : 'Select All Shown'}
        </Button>
      )}

      {/* Subjects Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Subjects ({filteredSubjects.length})
          </CardTitle>
          <CardDescription>
            Academic subjects and curriculum details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No subjects found</p>
              <p className="text-sm">Add subjects to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSubjects.map((subject) => {
                const checked = selectedIds.has(subject.id);
                return (
                  <Card key={subject.id} className={`hover:shadow-md transition-shadow ${checked ? 'ring-2 ring-primary/40' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <Checkbox checked={checked} onCheckedChange={() => toggleSelect(subject.id)} />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{subject.name}</h3>
                            <p className="text-sm text-muted-foreground font-mono">{subject.code}</p>
                            <p className="text-sm text-muted-foreground">{subject.department?.name}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingSubject(subject)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSubject(subject.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">Sem {subject.semester}</Badge>
                        <Badge variant="secondary" className="text-xs">{subject.credits} Credits</Badge>
                        <Badge variant="outline" className="text-xs">{subject.hours_per_week} Hrs/Week</Badge>
                        <Badge variant={subject.subject_type === 'lab' ? 'destructive' : subject.subject_type === 'theory' ? 'default' : 'secondary'} className="text-xs">
                          {subject.subject_type.charAt(0).toUpperCase() + subject.subject_type.slice(1)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingSubject && (
        <Dialog open={!!editingSubject} onOpenChange={() => setEditingSubject(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
              <DialogDescription>Update the subject information and save changes.</DialogDescription>
            </DialogHeader>
            <SubjectForm 
              subject={editingSubject}
              departments={departments}
              semesters={semesters}
              subjectTypes={subjectTypes}
              minimumPeriods={minimumPeriods}
              onSave={handleSaveSubject}
              onCancel={() => setEditingSubject(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Subject Form Component
interface SubjectFormProps {
  subject?: Subject;
  departments: Department[];
  semesters: number[];
  subjectTypes: string[];
  minimumPeriods: number[];
  onSave: (subject: Omit<Subject, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

function SubjectForm({ subject, departments, semesters, subjectTypes, minimumPeriods, onSave, onCancel }: SubjectFormProps) {
  const [formData, setFormData] = useState({
    id: subject?.id || '',
    name: subject?.name || '',
    code: subject?.code || '',
    credits: subject?.credits || 3,
    hours_per_week: subject?.hours_per_week || 5,
    department_id: subject?.department_id || '',
    semester: subject?.semester || 1,
    subject_type: subject?.subject_type || 'theory'
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Subject Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Data Structures and Algorithms"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Subject Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            placeholder="e.g., CS301"
            required
          />
        </div>
        <div>
          <Label htmlFor="credits">Credits *</Label>
          <Input
            id="credits"
            type="number"
            min="1"
            max="10"
            value={formData.credits}
            onChange={(e) => setFormData(prev => ({ ...prev, credits: parseInt(e.target.value) }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hours_per_week">Hours/Week *</Label>
          <Input
            id="hours_per_week"
            type="number"
            min="3"
            max="12"
            value={formData.hours_per_week}
            onChange={(e) => setFormData(prev => ({ ...prev, hours_per_week: parseInt(e.target.value) }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="department_id">Primary Department *</Label>
        <Select
          value={formData.department_id}
          onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}
        >
          <SelectTrigger>
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
        <p className="text-sm text-muted-foreground mt-1">
          This subject can be taught across multiple departments by qualified staff
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="semester">Primary Semester *</Label>
          <Select
            value={formData.semester.toString()}
            onValueChange={(value) => setFormData(prev => ({ ...prev, semester: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map(sem => (
                <SelectItem key={sem} value={sem.toString()}>
                  Semester {sem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="subject_type">Subject Type</Label>
          <Select
            value={formData.subject_type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, subject_type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              {subjectTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  {type === 'lab' && ' (Requires Lab Equipment)'}
                  {type === 'theory' && ' (Classroom Lectures)'}
                  {type === 'practical' && ' (Hands-on Training)'}
                  {type === 'project' && ' (Project Work)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">Scheduling Information</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• This subject will have {formData.hours_per_week} hours per week in the timetable</p>
          <p>• Staff from any department can be assigned to teach this subject</p>
          <p>• {formData.subject_type === 'lab' ? 'Requires lab rooms with appropriate equipment' : 
               formData.subject_type === 'theory' ? 'Can be scheduled in any classroom' :
               formData.subject_type === 'practical' ? 'May require specialized equipment/rooms' :
               'Project work - flexible scheduling'}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-1" />
          Save Subject
        </Button>
      </div>
    </form>
  );
}
