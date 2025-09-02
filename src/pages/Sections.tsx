import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, Users, Plus, Edit, Trash2, Search, Save, X } from "lucide-react";
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
        .select('id, name')
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      
      const sectionData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            name: values[0] || '',
            department_id: values[1] || departments[0]?.id || '',
            semester: parseInt(values[2]) || 1
          };
        });

      // Insert all sections
      for (const section of sectionData) {
        await supabase.from('sections').insert(section);
      }

      toast({
        title: "Success",
        description: `${sectionData.length} sections imported successfully`
      });
      
      fetchSections();
    } catch (error) {
      console.error('Error importing sections:', error);
      toast({
        title: "Error",
        description: "Failed to import sections data",
        variant: "destructive"
      });
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sections</h1>
          <p className="text-muted-foreground">
            Manage student sections and class groups
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="sections-upload"
            />
            <Button variant="outline" asChild className="gap-2">
              <label htmlFor="sections-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Section</DialogTitle>
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
      <div className="flex gap-4">
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
              {filteredSections.map((section) => (
                <Card key={section.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{section.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {section.department?.name}
                        </p>
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
              ))}
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
