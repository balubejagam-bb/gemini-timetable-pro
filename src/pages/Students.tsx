import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Sparkles, Users, Calendar, Clock } from 'lucide-react';
import { ViewToggle } from '@/components/ui/view-toggle';
import { useNavigate } from 'react-router-dom';

interface Student {
  id: string;
  name: string;
  roll_no: string;
  email?: string;
  semester: number;
  department_id?: string;
  departments?: {
    name: string;
    code: string;
  };
}

interface PersonalizedTimetable {
  id: string;
  student_id: string;
  timetable_json: any;
  generated_at: string;
  model_version?: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [personalizedTimetables, setPersonalizedTimetables] = useState<PersonalizedTimetable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
    fetchPersonalizedTimetables();
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

  const fetchPersonalizedTimetables = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('personalized_timetables')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setPersonalizedTimetables(data || []);
    } catch (error) {
      console.error('Error fetching personalized timetables:', error);
    }
  };

  const generatePersonalizedTimetable = async (studentId: string) => {
    try {
      toast.loading('Generating personalized timetable...');
      
      // Call the AI timetable generation edge function
      const { data, error } = await supabase.functions.invoke('generate-timetable-ai', {
        body: { 
          student_id: studentId,
          type: 'personalized'
        }
      });

      if (error) throw error;

      toast.success('Personalized timetable generated successfully!');
      fetchPersonalizedTimetables();
    } catch (error: any) {
      console.error('Error generating personalized timetable:', error);
      toast.error(error.message || 'Failed to generate personalized timetable');
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const hasPersonalizedTimetable = (studentId: string) => {
    return personalizedTimetables.some(tt => tt.student_id === studentId);
  };

  const getLatestTimetable = (studentId: string) => {
    return personalizedTimetables.find(tt => tt.student_id === studentId);
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
              Students & Individual Timetables
            </h1>
            <p className="text-muted-foreground">Generate personalized AI-powered timetables for individual students</p>
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
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Generated Timetables</p>
                  <p className="text-2xl font-bold text-green-600">{personalizedTimetables.length}</p>
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
            {filteredStudents.map((student) => {
              const hasTimetable = hasPersonalizedTimetable(student.id);
              const latestTimetable = getLatestTimetable(student.id);
              
              return (
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
                    <div className="space-y-3">
                      {student.email && (
                        <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                      )}
                      <p className="text-sm font-medium text-primary">
                        {student.departments?.name || 'No Department'}
                      </p>
                      
                      {hasTimetable && latestTimetable && (
                        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Timetable Generated</span>
                          </div>
                          <p className="text-xs text-green-600">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(latestTimetable.generated_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => generatePersonalizedTimetable(student.id)}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                        size="sm"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {hasTimetable ? 'Regenerate Timetable' : 'Generate Timetable'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                      <th className="text-left p-4 font-medium">Timetable Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const hasTimetable = hasPersonalizedTimetable(student.id);
                      const latestTimetable = getLatestTimetable(student.id);
                      
                      return (
                        <tr key={student.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-4 font-medium">{student.name}</td>
                          <td className="p-4 text-muted-foreground">{student.roll_no}</td>
                          <td className="p-4 text-muted-foreground">{student.email || '-'}</td>
                          <td className="p-4">
                            <Badge variant="secondary">Sem {student.semester}</Badge>
                          </td>
                          <td className="p-4 text-primary">
                            {student.departments?.name || 'No Department'}
                          </td>
                          <td className="p-4">
                            {hasTimetable ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                                Generated {latestTimetable && new Date(latestTimetable.generated_at).toLocaleDateString()}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                                Not Generated
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <Button
                              onClick={() => generatePersonalizedTimetable(student.id)}
                              disabled={loading}
                              size="sm"
                              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                            >
                              <Sparkles className="w-4 h-4 mr-1" />
                              {hasTimetable ? 'Regenerate' : 'Generate'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
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
                {searchTerm ? 'Try adjusting your search criteria' : 'No students available for timetable generation'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}