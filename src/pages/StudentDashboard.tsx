import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Upload, Download, Plus, Users, Edit, Trash2 } from 'lucide-react';
import { ViewToggle } from '@/components/ui/view-toggle';
import { Checkbox } from "@/components/ui/checkbox";
import { ClientTimetableGenerator } from "@/lib/timetableGenerator";

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
  const [allSubjects, setAllSubjects] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [showAllSubjects, setShowAllSubjects] = useState(true);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  // Form state for adding/editing students
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

  useEffect(() => {
    // Fetch all subjects and staff for selection
    const fetchData = async () => {
      const { data: subjData } = await supabase.from("subjects").select("id, name, code, department_id");
      const { data: stfData } = await supabase.from("staff").select("id, name, department_id");
      setAllSubjects(subjData || []);
      setAllStaff(stfData || []);
    };
    fetchData();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('students')
        .select(`
          *,
          departments(name, code)
        `)
        .order('name');

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

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await (supabase as any)
        .from('students')
        .insert([studentForm]);

      if (error) throw error;
      
      toast.success('Student added successfully');
      setIsAddDialogOpen(false);
      setStudentForm({
        name: '',
        roll_no: '',
        email: '',
        semester: 1,
        department_id: ''
      });
      fetchStudents();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Failed to add student');
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      const { error } = await (supabase as any)
        .from('students')
        .update(studentForm)
        .eq('id', editingStudent.id);

      if (error) throw error;
      
      toast.success('Student updated successfully');
      setEditingStudent(null);
      setStudentForm({
        name: '',
        roll_no: '',
        email: '',
        semester: 1,
        department_id: ''
      });
      fetchStudents();
    } catch (error: any) {
      console.error('Error updating student:', error);
      toast.error(error.message || 'Failed to update student');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const { error } = await (supabase as any)
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;
      
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error(error.message || 'Failed to delete student');
    }
  };

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      roll_no: student.roll_no,
      email: student.email || '',
      semester: student.semester,
      department_id: student.department_id || ''
    });
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['name', 'roll_no', 'email', 'semester', 'department_code'],
      ['John Doe', 'CS001', 'john@example.com', '1', 'CSE'],
      ['Jane Smith', 'CS002', 'jane@example.com', '2', 'CSE'],
      ['Bob Johnson', 'EC001', 'bob@example.com', '1', 'ECE']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];
      const data = rows.slice(1).filter(row => row.length === headers.length);

      const studentsToInsert = data.map(row => ({
        name: row[0]?.trim(),
        roll_no: row[1]?.trim(),
        email: row[2]?.trim(),
        semester: parseInt(row[3]?.trim()) || 1,
        department_id: departments.find(d => d.code === row[4]?.trim())?.id
      })).filter(student => student.name && student.roll_no);

      if (studentsToInsert.length === 0) {
        toast.error('No valid student data found in CSV');
        return;
      }

      const { error } = await (supabase as any)
        .from('students')
        .insert(studentsToInsert);

      if (error) throw error;

      toast.success(`Successfully imported ${studentsToInsert.length} students`);
      fetchStudents();
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      toast.error(error.message || 'Failed to import CSV');
    }

    // Reset input
    event.target.value = '';
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getDepartmentName = (departmentId?: string) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept ? dept.name : 'No Department';
  };

  // Timetable generation handler
  const handleGenerateTimetable = async () => {
    try {
      const generator = new ClientTimetableGenerator();
      const departmentIds = departments.map(d => d.id); // or filter as needed
      const semester = 1; // or get from UI
      const result = await generator.generateTimetable(departmentIds, semester, {
        advancedMode: true,
        subjects: selectedSubjects,
        staff: selectedStaffIds
      });
      if (result.success) {
        toast.success(`Timetable generated! Entries: ${result.entriesCount}`);
      } else {
        toast.error(result.error || "Failed to generate timetable");
      }
    } catch (error) {
      toast.error("Error generating timetable");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Student Database
            </h1>
            <p className="text-muted-foreground">Manage student records and information</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadSampleCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Sample CSV
            </Button>
            
            <Button variant="outline" size="sm" className="relative">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <Input
                    placeholder="Student Name"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                    required
                  />
                  <Input
                    placeholder="Roll Number"
                    value={studentForm.roll_no}
                    onChange={(e) => setStudentForm({...studentForm, roll_no: e.target.value})}
                    required
                  />
                  <Input
                    placeholder="Email (optional)"
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                  />
                  <Input
                    placeholder="Semester"
                    type="number"
                    min="1"
                    max="8"
                    value={studentForm.semester}
                    onChange={(e) => setStudentForm({...studentForm, semester: parseInt(e.target.value) || 1})}
                    required
                  />
                  <select
                    className="w-full p-2 border rounded-md"
                    value={studentForm.department_id}
                    onChange={(e) => setStudentForm({...studentForm, department_id: e.target.value})}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <Button type="submit" className="w-full">Add Student</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-auto sm:min-w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name, roll number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-blue-600">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Departments</p>
                  <p className="text-2xl font-bold text-green-600">{departments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Search className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Search Results</p>
                  <p className="text-2xl font-bold text-purple-600">{filteredStudents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students List/Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{student.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{student.roll_no}</p>
                    </div>
                    <Badge variant="secondary">Sem {student.semester}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {student.email && (
                      <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                    )}
                    <p className="text-sm font-medium text-primary">{getDepartmentName(student.department_id)}</p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(student)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteStudent(student.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Roll No</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Semester</th>
                      <th className="text-left p-4 font-medium">Department</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{student.name}</td>
                        <td className="p-4 text-muted-foreground">{student.roll_no}</td>
                        <td className="p-4 text-muted-foreground">{student.email || '-'}</td>
                        <td className="p-4">
                          <Badge variant="secondary">Sem {student.semester}</Badge>
                        </td>
                        <td className="p-4 text-primary">{getDepartmentName(student.department_id)}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(student)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteStudent(student.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredStudents.length === 0 && (
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'Add your first student to get started'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit Student Dialog */}
        <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditStudent} className="space-y-4">
              <Input
                placeholder="Student Name"
                value={studentForm.name}
                onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                required
              />
              <Input
                placeholder="Roll Number"
                value={studentForm.roll_no}
                onChange={(e) => setStudentForm({...studentForm, roll_no: e.target.value})}
                required
              />
              <Input
                placeholder="Email (optional)"
                type="email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
              />
              <Input
                placeholder="Semester"
                type="number"
                min="1"
                max="8"
                value={studentForm.semester}
                onChange={(e) => setStudentForm({...studentForm, semester: parseInt(e.target.value) || 1})}
                required
              />
              <select
                className="w-full p-2 border rounded-md"
                value={studentForm.department_id}
                onChange={(e) => setStudentForm({...studentForm, department_id: e.target.value})}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Update Student</Button>
                <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Timetable Generation Popup */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default">Generate Timetable (AI)</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Timetable</DialogTitle>
            </DialogHeader>
            {/* Subject Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-2">Subjects (All Departments)</h4>
              <label className="flex items-center gap-2 text-xs font-normal mb-2">
                <Checkbox checked={showAllSubjects} onCheckedChange={v => setShowAllSubjects(!!v)} />
                <span>Show all subjects (cross-department)</span>
              </label>
              <div className="grid gap-2 md:grid-cols-3 max-h-48 overflow-y-auto pr-1">
                {allSubjects.map(sub => (
                  <label key={sub.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer ${selectedSubjects.includes(sub.id)?'bg-primary/10 border-primary':'border-border'}`}
                    onClick={() => setSelectedSubjects(selectedSubjects.includes(sub.id) ? selectedSubjects.filter(id => id !== sub.id) : [...selectedSubjects, sub.id])}>
                    <Checkbox checked={selectedSubjects.includes(sub.id)} onCheckedChange={() => {}} />
                    <span className="truncate">{sub.name} <span className="font-semibold">({sub.code})</span></span>
                    <span className="ml-2 text-muted-foreground">Dept: {departments.find(d => d.id === sub.department_id)?.name || 'Unknown'}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Staff Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-2">Staff (All Departments)</h4>
              <div className="grid gap-2 md:grid-cols-3 max-h-44 overflow-y-auto pr-1">
                {allStaff.map(st => (
                  <label key={st.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer ${selectedStaffIds.includes(st.id)?'bg-primary/10 border-primary':'border-border'}`}
                    onClick={() => setSelectedStaffIds(selectedStaffIds.includes(st.id) ? selectedStaffIds.filter(id => id !== st.id) : [...selectedStaffIds, st.id])}>
                    <Checkbox checked={selectedStaffIds.includes(st.id)} onCheckedChange={() => {}} />
                    <span className="truncate" title={st.name}>{st.name}</span>
                    <span className="ml-2 text-muted-foreground">Dept: {departments.find(d => d.id === st.department_id)?.name || 'Unknown'}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerateTimetable} variant="default" className="w-full">Generate Timetable</Button>
          </DialogContent>
        </Dialog>

        {/* Timetable Generation Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={handleGenerateTimetable} variant="default">Generate Timetable (AI)</Button>
          <Button variant="outline">View Timetables</Button>
          <Button variant="outline">College Timings</Button>
          <Button variant="outline">Subjects</Button>
          <Button variant="outline">Sections</Button>
          <Button variant="outline">Departments</Button>
          <Button variant="outline">Rooms</Button>
          <Button variant="outline">Staff</Button>
        </div>

        {/* Subject Selection */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-2">Subjects (All Departments)</h4>
          <label className="flex items-center gap-2 text-xs font-normal mb-2">
            <Checkbox checked={showAllSubjects} onCheckedChange={v => setShowAllSubjects(!!v)} />
            <span>Show all subjects (cross-department)</span>
          </label>
          <div className="grid gap-2 md:grid-cols-3 max-h-48 overflow-y-auto pr-1">
            {allSubjects.map(sub => (
              <label key={sub.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer ${selectedSubjects.includes(sub.id)?'bg-primary/10 border-primary':'border-border'}`}
                onClick={() => setSelectedSubjects(selectedSubjects.includes(sub.id) ? selectedSubjects.filter(id => id !== sub.id) : [...selectedSubjects, sub.id])}>
                <Checkbox checked={selectedSubjects.includes(sub.id)} onCheckedChange={() => {}} />
                <span className="truncate">{sub.name} <span className="font-semibold">({sub.code})</span></span>
                <span className="ml-2 text-muted-foreground">Dept: {departments.find(d => d.id === sub.department_id)?.name || 'Unknown'}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Staff Selection */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-2">Staff (All Departments)</h4>
          <div className="grid gap-2 md:grid-cols-3 max-h-44 overflow-y-auto pr-1">
            {allStaff.map(st => (
              <label key={st.id} className={`flex items-center gap-2 border rounded px-2 py-1 text-xs cursor-pointer ${selectedStaffIds.includes(st.id)?'bg-primary/10 border-primary':'border-border'}`}
                onClick={() => setSelectedStaffIds(selectedStaffIds.includes(st.id) ? selectedStaffIds.filter(id => id !== st.id) : [...selectedStaffIds, st.id])}>
                <Checkbox checked={selectedStaffIds.includes(st.id)} onCheckedChange={() => {}} />
                <span className="truncate" title={st.name}>{st.name}</span>
                <span className="ml-2 text-muted-foreground">Dept: {departments.find(d => d.id === st.department_id)?.name || 'Unknown'}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}