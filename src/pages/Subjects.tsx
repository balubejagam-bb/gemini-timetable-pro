import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, BookOpen, Plus, Edit, Trash2, Search, Save, X } from "lucide-react";
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
  is_elective: boolean;
  min_periods_per_week: number;
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
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
      
      // Set default values for new fields if they don't exist
      const subjectsWithDefaults = (data || []).map(subject => ({
        ...subject,
        is_elective: subject.is_elective || false,
        min_periods_per_week: subject.min_periods_per_week || Math.max(5, subject.hours_per_week || 5)
      }));
      
      setSubjects(subjectsWithDefaults);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: "Error",
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
        .select('id, name')
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
      
      // Ensure minimum periods is at least 5 for proper timetable scheduling
      const minPeriods = Math.max(5, subjectData.min_periods_per_week || subjectData.hours_per_week || 5);
      const hoursPerWeek = Math.max(minPeriods, subjectData.hours_per_week || 5);
      
      const subjectToSave = {
        name: subjectData.name,
        code: subjectData.code,
        credits: subjectData.credits,
        hours_per_week: hoursPerWeek,
        department_id: subjectData.department_id,
        semester: subjectData.semester,
        subject_type: subjectData.subject_type,
        is_elective: subjectData.is_elective || false,
        min_periods_per_week: minPeriods
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
      const lines = text.split('\n');
      
      const subjectData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            name: values[0] || '',
            code: values[1] || '',
            credits: parseInt(values[2]) || 3,
            hours_per_week: parseInt(values[3]) || 3,
            department_id: values[4] || departments[0]?.id || '',
            semester: parseInt(values[5]) || 1,
            subject_type: values[6] || 'theory'
          };
        });

      // Insert all subjects
      for (const subject of subjectData) {
        await supabase.from('subjects').insert(subject);
      }

      toast({
        title: "Success",
        description: `${subjectData.length} subjects imported successfully`
      });
      
      fetchSubjects();
    } catch (error) {
      console.error('Error importing subjects:', error);
      toast({
        title: "Error",
        description: "Failed to import subjects data",
        variant: "destructive"
      });
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            Manage academic curriculum and course subjects
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="subjects-upload"
            />
            <Button variant="outline" asChild className="gap-2">
              <label htmlFor="subjects-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
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
              {filteredSubjects.map((subject) => (
                <Card key={subject.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{subject.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">
                          {subject.code}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {subject.department?.name}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSubject(subject)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSubject(subject.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        Sem {subject.semester}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {subject.credits} Credits
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {subject.hours_per_week} Hrs/Week
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Min {subject.min_periods_per_week || 5} Periods/Week
                      </Badge>
                      <Badge 
                        variant={subject.subject_type === 'lab' ? 'destructive' : 
                                subject.subject_type === 'theory' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {subject.subject_type.charAt(0).toUpperCase() + subject.subject_type.slice(1)}
                      </Badge>
                      {subject.is_elective && (
                        <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                          Elective
                        </Badge>
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
      {editingSubject && (
        <Dialog open={!!editingSubject} onOpenChange={() => setEditingSubject(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
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
    subject_type: subject?.subject_type || 'theory',
    is_elective: subject?.is_elective || false,
    min_periods_per_week: subject?.min_periods_per_week || 5
  });

  // Auto-adjust minimum periods when hours per week changes
  useEffect(() => {
    const minPeriods = Math.max(5, formData.hours_per_week);
    if (formData.min_periods_per_week < minPeriods) {
      setFormData(prev => ({
        ...prev,
        min_periods_per_week: minPeriods
      }));
    }
  }, [formData.hours_per_week, formData.min_periods_per_week]);

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
        <div>
          <Label htmlFor="min_periods_per_week">Min Periods/Week *</Label>
          <Select
            value={formData.min_periods_per_week.toString()}
            onValueChange={(value) => setFormData(prev => ({ ...prev, min_periods_per_week: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Min Periods" />
            </SelectTrigger>
            <SelectContent>
              {[5, 6, 7, 8, 9, 10].map(periods => (
                <SelectItem key={periods} value={periods.toString()}>
                  {periods} periods
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_elective"
          checked={formData.is_elective}
          onChange={(e) => setFormData(prev => ({ ...prev, is_elective: e.target.checked }))}
          className="rounded border-gray-300"
        />
        <Label htmlFor="is_elective">
          Elective Subject
        </Label>
        <p className="text-sm text-muted-foreground">
          (Can be offered to multiple semesters/departments)
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">Scheduling Information</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• This subject will have at least {formData.min_periods_per_week} periods per week in the timetable</p>
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
