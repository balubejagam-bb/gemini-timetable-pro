import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, UserCheck, Plus, Edit, Trash2, Search, Phone, Mail, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StaffMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  department_id: string;
  designation?: string;
  max_hours_per_week: number;
  availability?: string[];
  departments?: {
    name: string;
    code: string;
  };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  subject_type: string;
  department?: {
    name: string;
  };
}

interface StaffSubject {
  id: string;
  staff_id: string;
  subject_id: string;
  subject?: Subject;
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffSubjects, setStaffSubjects] = useState<StaffSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const { toast } = useToast();

  const availabilityOptions = [
    "Monday 9:00-10:00", "Monday 10:00-11:00", "Monday 11:30-12:30", "Monday 12:30-1:30",
    "Monday 2:30-3:30", "Monday 3:30-4:30", "Monday 4:30-5:30", "Monday 5:30-6:30",
    "Tuesday 9:00-10:00", "Tuesday 10:00-11:00", "Tuesday 11:30-12:30", "Tuesday 12:30-1:30",
    "Tuesday 2:30-3:30", "Tuesday 3:30-4:30", "Tuesday 4:30-5:30", "Tuesday 5:30-6:30",
    "Wednesday 9:00-10:00", "Wednesday 10:00-11:00", "Wednesday 11:30-12:30", "Wednesday 12:30-1:30",
    "Wednesday 2:30-3:30", "Wednesday 3:30-4:30", "Wednesday 4:30-5:30", "Wednesday 5:30-6:30",
    "Thursday 9:00-10:00", "Thursday 10:00-11:00", "Thursday 11:30-12:30", "Thursday 12:30-1:30",
    "Thursday 2:30-3:30", "Thursday 3:30-4:30", "Thursday 4:30-5:30", "Thursday 5:30-6:30",
    "Friday 9:00-10:00", "Friday 10:00-11:00", "Friday 11:30-12:30", "Friday 12:30-1:30",
    "Friday 2:30-3:30", "Friday 3:30-4:30", "Friday 4:30-5:30", "Friday 5:30-6:30"
  ];

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          departments(name, code)
        `)
        .order('name');

      if (error) throw error;
      
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to load staff data",
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
        .select('*')
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

  const fetchSubjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          code,
          subject_type,
          department:departments(name)
        `)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  const fetchStaffSubjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('staff_subjects')
        .select(`
          *,
          subject:subjects(
            id,
            name,
            code,
            subject_type,
            department:departments(name)
          )
        `);

      if (error) throw error;
      setStaffSubjects(data || []);
    } catch (error) {
      console.error('Error fetching staff subjects:', error);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
    fetchSubjects();
    fetchStaffSubjects();
  }, [fetchStaff, fetchDepartments, fetchSubjects, fetchStaffSubjects]);

  const handleSaveStaff = async (staffData: Omit<StaffMember, 'id' | 'departments'> & { 
    id?: string; 
    selectedSubjects?: string[] 
  }) => {
    try {
      setLoading(true);
      
      const staffToSave = {
        name: staffData.name,
        email: staffData.email,
        phone: staffData.phone,
        department_id: staffData.department_id,
        designation: staffData.designation,
        max_hours_per_week: staffData.max_hours_per_week,
        availability: staffData.availability
      };

      let staffId = staffData.id;
      
      if (staffData.id) {
        // Update existing staff
        const { error } = await supabase
          .from('staff')
          .update(staffToSave)
          .eq('id', staffData.id);

        if (error) throw error;
        staffId = staffData.id;
      } else {
        // Add new staff
        const { data, error } = await supabase
          .from('staff')
          .insert(staffToSave)
          .select()
          .single();

        if (error) throw error;
        staffId = data.id;
      }

      // Update staff subjects if selectedSubjects is provided
      if (staffData.selectedSubjects && staffId) {
        // Remove existing assignments
        await supabase
          .from('staff_subjects')
          .delete()
          .eq('staff_id', staffId);

        // Add new assignments
        if (staffData.selectedSubjects.length > 0) {
          const assignments = staffData.selectedSubjects.map(subjectId => ({
            staff_id: staffId,
            subject_id: subjectId
          }));

          const { error: assignError } = await supabase
            .from('staff_subjects')
            .insert(assignments);

          if (assignError) throw assignError;
        }
      }
      
      toast({
        title: "Success",
        description: staffData.id ? "Staff member updated successfully" : "Staff member added successfully"
      });
      
      setEditingStaff(null);
      setIsAddDialogOpen(false);
      fetchStaff();
      fetchStaffSubjects();
    } catch (error) {
      console.error('Error saving staff:', error);
      toast({
        title: "Error",
        description: "Failed to save staff member",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Staff member deleted successfully"
      });
      
      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast({
        title: "Error",
        description: "Failed to delete staff member",
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
      
      const staffData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            name: values[0] || '',
            email: values[1] || '',
            phone: values[2] || '',
            department_id: values[3] || departments[0]?.id || '',
            designation: values[4] || '',
            max_hours_per_week: parseInt(values[5]) || 20
          };
        });

      // Insert all staff members
      for (const staff of staffData) {
        await supabase.from('staff').insert(staff);
      }

      toast({
        title: "Success",
        description: `${staffData.length} staff members imported successfully`
      });
      
      fetchStaff();
    } catch (error) {
      console.error('Error importing staff:', error);
      toast({
        title: "Error",
        description: "Failed to import staff data",
        variant: "destructive"
      });
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.departments?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "all" || member.department_id === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage faculty members, their schedules and availability
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="staff-upload"
            />
            <Button variant="outline" asChild className="gap-2">
              <label htmlFor="staff-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
              </DialogHeader>
              <StaffForm 
                departments={departments}
                subjects={subjects}
                staffSubjects={staffSubjects}
                availabilityOptions={availabilityOptions}
                onSave={handleSaveStaff}
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
            placeholder="Search staff by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by Department" />
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
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            All Staff ({filteredStaff.length})
          </CardTitle>
          <CardDescription>
            Manage faculty members and their teaching schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No staff members found</p>
              <p className="text-sm">Add staff members to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStaff.map((member) => (
                <Card key={member.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.designation}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingStaff(member)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStaff(member.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Badge variant="outline" className="mb-2">
                      {member.departments?.code}
                    </Badge>
                    
                    <div className="space-y-1 text-sm">
                      {member.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Max Hours: {member.max_hours_per_week}/week
                      </div>
                      {member.availability && member.availability.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Available: {member.availability.length} slots
                        </div>
                      )}
                      {(() => {
                        const assignedSubjects = staffSubjects.filter(ss => ss.staff_id === member.id);
                        return assignedSubjects.length > 0 && (
                          <div className="text-xs text-green-600">
                            Teaching: {assignedSubjects.length} subject{assignedSubjects.length > 1 ? 's' : ''}
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingStaff && (
        <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
            </DialogHeader>
            <StaffForm 
              staff={editingStaff}
              departments={departments}
              subjects={subjects}
              staffSubjects={staffSubjects}
              availabilityOptions={availabilityOptions}
              onSave={handleSaveStaff}
              onCancel={() => setEditingStaff(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Staff Form Component
interface StaffFormProps {
  staff?: StaffMember;
  departments: Department[];
  subjects: Subject[];
  staffSubjects: StaffSubject[];
  availabilityOptions: string[];
  onSave: (staff: Omit<StaffMember, 'id' | 'departments'> & { 
    id?: string; 
    selectedSubjects?: string[] 
  }) => void;
  onCancel: () => void;
}

function StaffForm({ 
  staff, 
  departments, 
  subjects, 
  staffSubjects, 
  availabilityOptions, 
  onSave, 
  onCancel 
}: StaffFormProps) {
  const [formData, setFormData] = useState({
    id: staff?.id || '',
    name: staff?.name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    department_id: staff?.department_id || departments[0]?.id || '',
    designation: staff?.designation || '',
    max_hours_per_week: staff?.max_hours_per_week || 40,
    availability: staff?.availability || [],
    selectedSubjects: staff ? staffSubjects.filter(ss => ss.staff_id === staff.id).map(ss => ss.subject_id) : []
  });

  const [newSpecialization, setNewSpecialization] = useState('');

  const handleAvailabilityChange = (slot: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      availability: checked
        ? [...prev.availability, slot]
        : prev.availability.filter(s => s !== slot)
    }));
  };

  const handleSubjectChange = (subjectId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedSubjects: checked
        ? [...prev.selectedSubjects, subjectId]
        : prev.selectedSubjects.filter(id => id !== subjectId)
    }));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const subjectsByDepartment = subjects.reduce((acc, subject) => {
    const deptName = subject.department?.name || 'Other';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(subject);
    return acc;
  }, {} as Record<string, Subject[]>);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="designation">Designation</Label>
          <Input
            id="designation"
            value={formData.designation}
            onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
            placeholder="e.g., Assistant Professor, Associate Professor"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department">Primary Department *</Label>
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
        <div>
          <Label htmlFor="maxHours">Max Hours per Week</Label>
          <Input
            id="maxHours"
            type="number"
            min="10"
            max="60"
            value={formData.max_hours_per_week}
            onChange={(e) => setFormData(prev => ({ ...prev, max_hours_per_week: parseInt(e.target.value) }))}
          />
        </div>
      </div>


      <div>
        <Label>Subject Assignments</Label>
        <div className="space-y-4 mt-2 max-h-64 overflow-y-auto border rounded p-4">
          {Object.entries(subjectsByDepartment).map(([deptName, deptSubjects]) => (
            <div key={deptName}>
              <h4 className="font-semibold text-sm mb-2">{deptName}</h4>
              <div className="grid grid-cols-1 gap-2 pl-4">
                {deptSubjects.map(subject => (
                  <div key={subject.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={formData.selectedSubjects.includes(subject.id)}
                      onCheckedChange={(checked) => handleSubjectChange(subject.id, checked as boolean)}
                    />
                    <Label htmlFor={`subject-${subject.id}`} className="text-sm flex-1">
                      <span className="font-medium">{subject.name}</span>
                      <span className="text-muted-foreground ml-2">
                        ({subject.code} - {subject.subject_type})
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(subjectsByDepartment).length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No subjects available. Please add subjects first.
            </p>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Selected: {formData.selectedSubjects.length} subject{formData.selectedSubjects.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div>
        <Label>Staff Availability (Monday - Friday)</Label>
        <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto border rounded p-3">
          {availabilityOptions.map(slot => (
            <div key={slot} className="flex items-center space-x-2">
              <Checkbox
                id={slot}
                checked={formData.availability.includes(slot)}
                onCheckedChange={(checked) => handleAvailabilityChange(slot, checked as boolean)}
              />
              <Label htmlFor={slot} className="text-sm">
                {slot}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">Assignment Summary</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Primary Department: {departments.find(d => d.id === formData.department_id)?.name}</p>
          <p>• Subject Assignments: {formData.selectedSubjects.length} subjects</p>
          <p>• Available Time Slots: {formData.availability.length} slots</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-1" />
          Save Staff
        </Button>
      </div>
    </form>
  );
} 
