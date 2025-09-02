import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, Users, Plus, Edit, Trash2, Search, Save, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  code?: string; // optional code (added to support CSV mapping)
}

export default function Sections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
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
    fetchSections();
    fetchDepartments();
  }, [fetchSections, fetchDepartments]);

  const handleSaveSection = async (sectionData: Omit<Section, 'id'> & { id?: string }) => {
    try {
      setLoading(true);
      
      if (sectionData.id) {
        // Update existing section
        const { error } = await supabase
          .from('sections')
          .update({
            name: sectionData.name,
            department_id: sectionData.department_id,
            semester: sectionData.semester
          })
          .eq('id', sectionData.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Section updated successfully"
        });
      } else {
        // Add new section
        const { error } = await supabase
          .from('sections')
          .insert({
            name: sectionData.name,
            department_id: sectionData.department_id,
            semester: sectionData.semester
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Section added successfully"
        });
      }
      
      setEditingSection(null);
      setIsAddDialogOpen(false);
      fetchSections();
    } catch (error) {
      console.error('Error saving section:', error);
      toast({
        title: "Error",
        description: "Failed to save section",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Section deleted successfully"
      });
      
      fetchSections();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected section(s)? This cannot be undone.`)) return;
    try {
      setLoading(true);
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('sections').delete().in('id', ids);
      if (error) throw error;
      toast({ title: 'Deleted', description: `${ids.length} sections removed.` });
      setSelectedIds(new Set());
      fetchSections();
    } catch (e) {
      console.error('Bulk delete error', e);
      toast({ title: 'Error', description: 'Failed bulk delete', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      if (lines.filter(l => l.trim()).length <= 1) {
        toast({ title: "Import Error", description: "CSV appears empty", variant: "destructive" });
        return;
      }

      // Build quick lookup maps for department resolution
      const rebuildDeptMaps = (list: Department[]) => {
        const id = new Map<string, Department>();
        const name = new Map<string, Department>();
        const code = new Map<string, Department>();
        list.forEach(d => {
          id.set(d.id, d);
          name.set(d.name.toLowerCase(), d);
          if (d.code) code.set(d.code.toLowerCase(), d);
        });
        return { id, name, code };
      };
      let { id: deptById, name: deptByName, code: deptByCode } = rebuildDeptMaps(departments);

      // Detect header & normalize
      const headerRaw = lines[0].toLowerCase();
      const isLikelyHeader = /name/.test(headerRaw);
      const dataLines = (isLikelyHeader ? lines.slice(1) : lines)
        .filter(l => l.trim())
        .filter(l => !l.trim().startsWith('#')); // skip comment lines

      interface RowResult { row: { name: string; department_id: string; semester: number }; raw: string; reason?: string; }
      const validRows: RowResult[] = [];
      const invalidRows: RowResult[] = [];

      // Collect potential new departments for optional auto-create
      const newDeptTokens = new Set<string>();
      for (const raw of dataLines) {
        const originalParts = raw.split(',');
        const parts = originalParts.map(p => p.trim());
        if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

        let name = parts[0];
        if (!name) { invalidRows.push({ raw, row: { name: '', department_id: '', semester: 0 }, reason: 'Missing name' }); continue; }
        let deptToken = parts.length > 1 ? parts[1] : '';
        const semesterVal = parts.length > 2 && parts[2] ? parseInt(parts[2], 10) : 1;

        // If no explicit department column but name formatted like CSE-A or CSE_A
        if (!deptToken && /[-_]/.test(name)) {
          const maybeDept = name.split(/[-_]/)[0];
          deptToken = maybeDept;
          // keep section name as trailing token after separator if exists
          const maybeSection = name.split(/[-_]/)[1];
          if (maybeSection) {
            name = maybeSection; // store just A if CSE-A
          }
        }

        if (!deptToken) { invalidRows.push({ raw, row: { name, department_id: '', semester: semesterVal }, reason: 'Missing department' }); continue; }

        const tokenLower = deptToken.toLowerCase();
  const dept: Department | undefined = deptById.get(deptToken) || deptByCode.get(tokenLower) || deptByName.get(tokenLower);
        if (!dept) {
          newDeptTokens.add(deptToken);
          // We'll attempt auto-create later; temporarily mark as unresolved
          validRows.push({ raw, row: { name, department_id: '__PENDING__:' + deptToken, semester: isNaN(semesterVal) ? 1 : semesterVal } });
          continue;
        }
        validRows.push({ raw, row: { name, department_id: dept.id, semester: isNaN(semesterVal) ? 1 : semesterVal } });
      }

      // Auto-create missing departments if any
      let createdDeptCount = 0;
      if (newDeptTokens.size) {
        const existingCodes = new Set(departments.map(d => d.code?.toUpperCase()).filter(Boolean) as string[]);
        const existingNames = new Set(departments.map(d => d.name.toLowerCase()));
        const toInsert: { name: string; code: string }[] = [];
        const makeCode = (token: string) => {
          const cleaned = token.trim();
          let base: string;
            if (cleaned.length <= 6 && /^[A-Za-z0-9]+$/.test(cleaned)) base = cleaned.toUpperCase();
            else {
              const letters = cleaned.split(/\s+/).map(w => w[0]).join('').slice(0,6).toUpperCase();
              base = letters || cleaned.replace(/[^A-Za-z0-9]/g,'').slice(0,6).toUpperCase() || 'DEPT';
            }
          let candidate = base;
          let i = 1;
          while (existingCodes.has(candidate)) { candidate = base + i; i++; }
          existingCodes.add(candidate);
          return candidate;
        };
        newDeptTokens.forEach(tok => {
          const nameLower = tok.toLowerCase();
          if (deptByCode.get(nameLower) || deptByName.get(nameLower)) return; // now resolved
          const code = makeCode(tok);
          let deptName: string;
          if (tok.length <= 6 && /^[A-Za-z0-9]+$/.test(tok)) deptName = tok.toUpperCase(); else deptName = tok.split(/\s+/).map(w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
          if (existingNames.has(deptName.toLowerCase())) return;
          toInsert.push({ name: deptName, code });
          existingNames.add(deptName.toLowerCase());
        });
        if (toInsert.length) {
          const { data: inserted, error: deptInsErr } = await supabase.from('departments').insert(toInsert).select('id, name, code');
          if (!deptInsErr && inserted) {
            createdDeptCount = inserted.length;
            interface InsertedDept { id: string; name: string; code?: string }
            const casted: InsertedDept[] = inserted as InsertedDept[];
            const updatedDeptList: Department[] = [...departments, ...casted.map(d => ({ id: d.id, name: d.name, code: d.code }))];
            ({ id: deptById, name: deptByName, code: deptByCode } = rebuildDeptMaps(updatedDeptList));
          } else if (deptInsErr) {
            toast({ title: 'Dept Create Error', description: deptInsErr.message, variant: 'destructive' });
          }
        }
      }

      // Replace placeholder department ids after auto-create
      for (const v of validRows) {
        if (v.row.department_id.startsWith('__PENDING__:')) {
          const token = v.row.department_id.split(':',2)[1];
          const tokenLower = token.toLowerCase();
            const dept = deptByCode.get(tokenLower) || deptByName.get(tokenLower);
            if (dept) v.row.department_id = dept.id; else {
              invalidRows.push({ raw: v.raw, row: v.row, reason: 'Unknown department (creation failed)' });
            }
        }
      }
      // Filter again now that unresolved moved to invalid
      const finalValid = validRows.filter(v => !v.row.department_id.startsWith('__PENDING__:'));

      if (finalValid.length === 0) {
        toast({ title: 'Import Error', description: `No valid rows. ${invalidRows.length} invalid.`, variant: 'destructive' });
        event.target.value = '';
        return;
      }

      // Remove duplicates inside file (same name+dept+semester) matching DB unique constraint (now includes semester)
      const seen = new Set<string>();
  const deduped = finalValid.filter(v => {
        const key = v.row.name + '|' + v.row.department_id + '|' + v.row.semester;
        if (seen.has(key)) { return false; }
        seen.add(key); return true;
      });
  const skippedDuplicates = finalValid.length - deduped.length;
      // Determine existing by key (name+department) reflecting actual DB unique constraint
      const existingKeySet = new Set(
        sections.map(s => `${s.name}|${s.department_id}|${s.semester}`)
      );
      let newCount = 0; let updateCount = 0;
      const payload = deduped.map(v => {
        const key = `${v.row.name}|${v.row.department_id}|${v.row.semester}`;
        if (existingKeySet.has(key)) updateCount++; else newCount++;
        return v.row; // semester will be updated if different
      });

      let failed = 0; let firstError: string | null = null;
      if (payload.length) {
    const { error: upErr } = await supabase.from('sections').upsert(payload, { onConflict: 'name,department_id,semester', ignoreDuplicates: false });
        if (upErr) {
          // Fallback row by row
          newCount = 0; updateCount = 0; // recompute precisely while doing row ops
          for (const r of payload) {
      const key = `${r.name}|${r.department_id}|${r.semester}`;
      const { error: rowErr } = await supabase.from('sections').upsert(r, { onConflict: 'name,department_id,semester', ignoreDuplicates: false });
            if (rowErr) { failed++; if (!firstError) firstError = rowErr.message; }
            else {
              if (existingKeySet.has(key)) {
                updateCount++;
              } else {
                newCount++;
              }
            }
          }
        }
      }

  // Build a clearer summary. Always show Inserted/Updated counts (even when 0)
  // NOTE: DB UNIQUE constraint is (name, department_id, semester) allowing same
  // section letter across different semesters.
  const summaryParts: string[] = [];
      summaryParts.push(`Valid: ${finalValid.length}`);
  if (invalidRows.length) summaryParts.push(`Invalid: ${invalidRows.length}`);
  if (skippedDuplicates) summaryParts.push(`In-file dups skipped: ${skippedDuplicates}`);
  summaryParts.push(`Updated: ${updateCount}`);
  summaryParts.push(`Inserted: ${newCount}`);
  if (failed) summaryParts.push(`Failed: ${failed}`);
  if (firstError) summaryParts.push(`First error: ${firstError}`);
  if (!newCount && updateCount && !failed) summaryParts.push('All rows already existed (semester updated if different)');
      if (createdDeptCount) summaryParts.push(`New departments: ${createdDeptCount}`);
      if (invalidRows.length) {
        const firstFew = invalidRows.slice(0,3).map(r => r.reason).join(', ');
        summaryParts.push(`Invalid reasons sample: ${firstFew}`);
      }

      toast({
        title: failed || invalidRows.length ? 'Partial Import' : 'Import Complete',
        description: `${summaryParts.join(' | ')}`.slice(0, 300)
      });
      fetchSections();
    } catch (e) {
      console.error('Error importing sections:', e);
      toast({ title: 'Error', description: 'Failed to import sections data', variant: 'destructive' });
    } finally {
      event.target.value = '';
    }
  };

  const filteredSections = sections.filter(section => {
    const matchesSearch = section.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filterDepartment === "all" || 
                              section.department_id === filterDepartment;
    
    const matchesSemester = filterSemester === "all" || 
                           section.semester === parseInt(filterSemester);
    
    return matchesSearch && matchesDepartment && matchesSemester;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filteredSections.length > 0 && filteredSections.every(s => selectedIds.has(s.id));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sections</h1>
          <p className="text-muted-foreground">
            Manage student sections and class groups
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="sections-upload"
            />
            <Button variant="outline" size="sm" asChild className="gap-2">
              <label htmlFor="sections-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </Button>
          </div>
          {selectedIds.size > 0 && (
            <Button variant="secondary" size="sm" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csvContent =
                'name,department,semester\n' +
                'A,CSE,1\n' +
                'B,CSE,1\n' +
                'A,ECE,1\n' +
                '# department column accepts id, code or name. Lines starting with # are ignored';
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sections_sample.csv';
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
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Section</DialogTitle>
                <DialogDescription>Enter the details below to create a new section.</DialogDescription>
              </DialogHeader>
              <SectionForm 
                departments={departments}
                semesters={semesters}
                onSave={handleSaveSection}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-start flex-wrap">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sections..."
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
        {filteredSections.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (allFilteredSelected) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(filteredSections.map(s => s.id)));
              }
            }}
          >
            {allFilteredSelected ? 'Clear Selection' : 'Select All Shown'}
          </Button>
        )}
      </div>

      {/* Sections Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Sections ({filteredSections.length})
          </CardTitle>
          <CardDescription>
            Student sections and class group management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No sections found</p>
              <p className="text-sm">Add sections to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSections.map((section) => {
                const checked = selectedIds.has(section.id);
                return (
                  <Card key={section.id} className={`hover:shadow-md transition-shadow ${checked ? 'ring-2 ring-primary/40' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <Checkbox checked={checked} onCheckedChange={() => toggleSelect(section.id)} />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{section.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {section.department?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSection(section)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSection(section.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          Sem {section.semester}
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
      {editingSection && (
        <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
              <DialogDescription>Update the section information and save changes.</DialogDescription>
            </DialogHeader>
            <SectionForm 
              section={editingSection}
              departments={departments}
              semesters={semesters}
              onSave={handleSaveSection}
              onCancel={() => setEditingSection(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Section Form Component
interface SectionFormProps {
  section?: Section;
  departments: Department[];
  semesters: number[];
  onSave: (section: Omit<Section, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

function SectionForm({ section, departments, semesters, onSave, onCancel }: SectionFormProps) {
  const [formData, setFormData] = useState({
    id: section?.id || '',
    name: section?.name || '',
    department_id: section?.department_id || '',
    semester: section?.semester || 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Section Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., CSE-A, CSE-B"
          required
        />
      </div>

      <div>
        <Label htmlFor="department_id">Department *</Label>
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
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="semester">Semester *</Label>
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
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-1" />
          Save Section
        </Button>
      </div>
    </form>
  );
}
