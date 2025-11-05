import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Upload, Download, Plus, Edit, Trash2 } from 'lucide-react';
import { ViewToggle } from '@/components/ui/view-toggle';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

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

  const handleAddStudent = async () => {
    try {
      const { error } = await supabase
        .from('students')
        .insert([studentForm]);

      if (error) throw error;

      toast.success('Student added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Failed to add student');
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    try {
      const { error } = await supabase
        .from('students')
        .update(studentForm)
        .eq('id', editingStudent.id);

      if (error) throw error;

      toast.success('Student updated successfully');
      setEditingStudent(null);
      resetForm();
      fetchStudents();
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  };

  const resetForm = () => {
    setStudentForm({
      name: '',
      roll_no: '',
      email: '',
      semester: 1,
      department_id: ''
    });
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      roll_no: student.roll_no,
      email: student.email || '',
      semester: student.semester,
      department_id: student.department_id || ''
    });
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split('\n').slice(1); // Skip header
      const studentsToImport = rows
        .filter(row => row.trim())
        .map(row => {
          const [roll_no, name, email, semester, department_code] = row.split(',').map(s => s.trim());
          const dept = departments.find(d => d.code === department_code);
          return {
            roll_no,
            name,
            email,
            semester: parseInt(semester) || 1,
            department_id: dept?.id || null
          };
        });

      const { error } = await supabase
        .from('students')
        .insert(studentsToImport);

      if (error) throw error;

      toast.success(`Imported ${studentsToImport.length} students`);
      fetchStudents();
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast.error('Failed to import CSV');
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Roll No', 'Name', 'Email', 'Semester', 'Department'],
      ...students.map(s => [
        s.roll_no,
        s.name,
        s.email || '',
        s.semester,
        departments.find(d => d.id === s.department_id)?.code || ''
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Student Database</h1>
        <div className="flex gap-2">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={studentForm.name}
                        onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Roll Number</Label>
                      <Input
                        value={studentForm.roll_no}
                        onChange={(e) => setStudentForm({ ...studentForm, roll_no: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={studentForm.email}
                        onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Semester</Label>
                      <Input
                        type="number"
                        min="1"
                        max="8"
                        value={studentForm.semester}
                        onChange={(e) => setStudentForm({ ...studentForm, semester: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Department</Label>
                      <select
                        className="w-full border rounded-md p-2"
                        value={studentForm.department_id}
                        onChange={(e) => setStudentForm({ ...studentForm, department_id: e.target.value })}
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <Button onClick={handleAddStudent} className="w-full">
                      Add Student
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <label htmlFor="csv-import">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </span>
                </Button>
                <input
                  id="csv-import"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCSV}
                />
              </label>

              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {filteredStudents.map(student => (
              <Card key={student.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{student.name}</h3>
                      <p className="text-sm text-muted-foreground">{student.roll_no}</p>
                    </div>
                    <Badge variant="secondary">Sem {student.semester}</Badge>
                  </div>
                  {student.email && (
                    <p className="text-sm text-muted-foreground mb-2">{student.email}</p>
                  )}
                  {student.department_id && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {departments.find(d => d.id === student.department_id)?.name}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(student)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteStudent(student.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {editingStudent && (
        <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Roll Number</Label>
                <Input
                  value={studentForm.roll_no}
                  onChange={(e) => setStudentForm({ ...studentForm, roll_no: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Semester</Label>
                <Input
                  type="number"
                  min="1"
                  max="8"
                  value={studentForm.semester}
                  onChange={(e) => setStudentForm({ ...studentForm, semester: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Department</Label>
                <select
                  className="w-full border rounded-md p-2"
                  value={studentForm.department_id}
                  onChange={(e) => setStudentForm({ ...studentForm, department_id: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleUpdateStudent} className="w-full">
                Update Student
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
