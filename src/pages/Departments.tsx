import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Building2, Plus, Edit, Trash2, Save, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  hod?: string;
  total_subjects?: number;
  total_staff?: number;
  total_sections?: number;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch departments with related counts
      const { data: departmentsData, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get counts for each department
      const departmentsWithCounts = await Promise.all(
        (departmentsData || []).map(async (dept) => {
          const [
            { count: subjectsCount },
            { count: staffCount },
            { count: sectionsCount }
          ] = await Promise.all([
            supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('department_id', dept.id),
            supabase.from('staff').select('*', { count: 'exact', head: true }).eq('department_id', dept.id),
            supabase.from('sections').select('*', { count: 'exact', head: true }).eq('department_id', dept.id)
          ]);

          return {
            ...dept,
            total_subjects: subjectsCount || 0,
            total_staff: staffCount || 0,
            total_sections: sectionsCount || 0
          };
        })
      );

      setDepartments(departmentsWithCounts);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSaveDepartment = async (departmentData: Omit<Department, 'id'> & { id?: string }) => {
    try {
      setLoading(true);
      
      if (departmentData.id) {
        // Update existing department
        const { error } = await supabase
          .from('departments')
          .update({
            name: departmentData.name,
            code: departmentData.code,
            description: departmentData.description,
            hod: departmentData.hod
          })
          .eq('id', departmentData.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Department updated successfully"
        });
      } else {
        // Add new department
        const { error } = await supabase
          .from('departments')
          .insert({
            name: departmentData.name,
            code: departmentData.code,
            description: departmentData.description,
            hod: departmentData.hod
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Department added successfully"
        });
      }
      
      setEditingDepartment(null);
      setIsAddDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      toast({
        title: "Error",
        description: "Failed to save department",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department? This will also delete all associated sections and subjects.")) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Department deleted successfully"
      });
      
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({
        title: "Error",
        description: "Failed to delete department",
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
      const headers = lines[0].split(',').map(h => h.trim());
      
      const departmentData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            name: values[0] || '',
            code: values[1] || '',
            description: values[2] || '',
            hod: values[3] || ''
          };
        });

      // Insert all departments
      for (const dept of departmentData) {
        await supabase.from('departments').insert(dept);
      }

      toast({
        title: "Success",
        description: `${departmentData.length} departments imported successfully`
      });
      
      fetchDepartments();
    } catch (error) {
      console.error('Error importing departments:', error);
      toast({
        title: "Error",
        description: "Failed to import departments data",
        variant: "destructive"
      });
    }
  };

  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">
            Manage academic departments and their information
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="dept-upload"
            />
            <Button variant="outline" asChild className="gap-2">
              <label htmlFor="dept-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Department</DialogTitle>
              </DialogHeader>
              <DepartmentForm 
                onSave={handleSaveDepartment}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Departments Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            All Departments ({filteredDepartments.length})
          </CardTitle>
          <CardDescription>
            Academic departments in your institution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No departments found</p>
              <p className="text-sm">Add departments to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDepartments.map((dept) => (
                <Card key={dept.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{dept.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{dept.code}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingDepartment(dept)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDepartment(dept.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {dept.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {dept.description}
                      </p>
                    )}
                    
                    <div className="flex gap-3 text-sm mb-2">
                      <span className="text-blue-600">
                        {dept.total_subjects || 0} Subjects
                      </span>
                      <span className="text-green-600">
                        {dept.total_staff || 0} Staff
                      </span>
                      <span className="text-purple-600">
                        {dept.total_sections || 0} Sections
                      </span>
                    </div>
                    
                    {dept.hod && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">HOD: </span>
                        <span className="font-medium">{dept.hod}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingDepartment && (
        <Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
            </DialogHeader>
            <DepartmentForm 
              department={editingDepartment}
              onSave={handleSaveDepartment}
              onCancel={() => setEditingDepartment(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Department Form Component
interface DepartmentFormProps {
  department?: Department;
  onSave: (department: Omit<Department, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

function DepartmentForm({ department, onSave, onCancel }: DepartmentFormProps) {
  const [formData, setFormData] = useState({
    id: department?.id || '',
    name: department?.name || '',
    code: department?.code || '',
    description: department?.description || '',
    hod: department?.hod || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Department Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Computer Science Engineering"
          required
        />
      </div>

      <div>
        <Label htmlFor="code">Department Code *</Label>
        <Input
          id="code"
          value={formData.code}
          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
          placeholder="e.g., CSE"
          maxLength={10}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of the department"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="hod">Head of Department</Label>
        <Input
          id="hod"
          value={formData.hod}
          onChange={(e) => setFormData(prev => ({ ...prev, hod: e.target.value }))}
          placeholder="Name of the HOD"
        />
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">Department Features</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Subjects from this department can be taught by qualified staff from any department</p>
          <p>• Staff from this department can teach subjects across multiple departments</p>
          <p>• All subjects will have minimum 5-6 periods per week for effective scheduling</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-1" />
          Save Department
        </Button>
      </div>
    </form>
  );
} 
