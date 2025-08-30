import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, BookOpen, Plus, Edit, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Subjects() {
  const [subjects] = useState([
    { id: 1, code: "CS101", name: "Programming Fundamentals", credits: 4, department: "CSE", semester: 1 },
    { id: 2, code: "CS102", name: "Data Structures", credits: 4, department: "CSE", semester: 2 },
    { id: 3, code: "CS201", name: "Object Oriented Programming", credits: 3, department: "CSE", semester: 3 },
    { id: 4, code: "CS202", name: "Database Management Systems", credits: 4, department: "CSE", semester: 4 },
    { id: 5, code: "CS301", name: "Computer Networks", credits: 3, department: "CSE", semester: 5 },
    { id: 6, code: "CS302", name: "Operating Systems", credits: 4, department: "CSE", semester: 5 },
    { id: 7, code: "CS401", name: "Software Engineering", credits: 3, department: "CSE", semester: 7 },
    { id: 8, code: "CS402", name: "Machine Learning", credits: 4, department: "CSE", semester: 7 },
    { id: 9, code: "CS403", name: "Artificial Intelligence", credits: 3, department: "CSE", semester: 8 },
    { id: 10, code: "CS404", name: "Cloud Computing", credits: 3, department: "CSE", semester: 8 },
    { id: 11, code: "EC101", name: "Electronics Fundamentals", credits: 4, department: "ECE", semester: 1 },
    { id: 12, code: "EC102", name: "Circuit Analysis", credits: 4, department: "ECE", semester: 2 },
    { id: 13, code: "EC201", name: "Digital Electronics", credits: 3, department: "ECE", semester: 3 },
    { id: 14, code: "EC202", name: "Signals and Systems", credits: 4, department: "ECE", semester: 4 },
    { id: 15, code: "EC301", name: "Communication Systems", credits: 4, department: "ECE", semester: 5 },
    { id: 16, code: "EC302", name: "Microprocessors", credits: 3, department: "ECE", semester: 5 },
    { id: 17, code: "ME101", name: "Engineering Mechanics", credits: 4, department: "MECH", semester: 1 },
    { id: 18, code: "ME102", name: "Thermodynamics", credits: 4, department: "MECH", semester: 2 },
    { id: 19, code: "ME201", name: "Fluid Mechanics", credits: 3, department: "MECH", semester: 3 },
    { id: 20, code: "ME202", name: "Heat Transfer", credits: 4, department: "MECH", semester: 4 },
    { id: 21, code: "ME301", name: "Machine Design", credits: 4, department: "MECH", semester: 5 },
    { id: 22, code: "ME302", name: "Manufacturing Processes", credits: 3, department: "MECH", semester: 5 },
    { id: 23, code: "CV101", name: "Engineering Surveying", credits: 3, department: "CIVIL", semester: 1 },
    { id: 24, code: "CV102", name: "Building Materials", credits: 4, department: "CIVIL", semester: 2 },
    { id: 25, code: "CV201", name: "Structural Analysis", credits: 4, department: "CIVIL", semester: 3 },
    { id: 26, code: "CV202", name: "Concrete Technology", credits: 3, department: "CIVIL", semester: 4 },
    { id: 27, code: "CV301", name: "Transportation Engineering", credits: 3, department: "CIVIL", semester: 5 },
    { id: 28, code: "CV302", name: "Environmental Engineering", credits: 4, department: "CIVIL", semester: 5 },
    { id: 29, code: "EE101", name: "Electrical Circuits", credits: 4, department: "EEE", semester: 1 },
    { id: 30, code: "EE102", name: "Electrical Machines", credits: 4, department: "EEE", semester: 2 },
    { id: 31, code: "EE201", name: "Power Systems", credits: 4, department: "EEE", semester: 3 },
    { id: 32, code: "EE202", name: "Control Systems", credits: 3, department: "EEE", semester: 4 },
    { id: 33, code: "IT101", name: "Information Technology Fundamentals", credits: 3, department: "IT", semester: 1 },
    { id: 34, code: "IT102", name: "Web Technologies", credits: 4, department: "IT", semester: 2 },
    { id: 35, code: "IT201", name: "System Administration", credits: 3, department: "IT", semester: 3 },
    { id: 36, code: "IT202", name: "Network Security", credits: 4, department: "IT", semester: 4 },
    { id: 37, code: "GE101", name: "Engineering Mathematics I", credits: 4, department: "General", semester: 1 },
    { id: 38, code: "GE102", name: "Engineering Physics", credits: 3, department: "General", semester: 1 },
    { id: 39, code: "GE103", name: "Engineering Chemistry", credits: 3, department: "General", semester: 2 },
    { id: 40, code: "GE104", name: "English Communication", credits: 2, department: "General", semester: 1 },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const { toast } = useToast();

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "all" || subject.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "File Uploaded",
        description: `${file.name} uploaded successfully. Processing subjects data...`,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            Manage subjects and courses for Mohan Babu University
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="subject-upload"
            />
            <label htmlFor="subject-upload" className="flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload CSV/Excel
            </label>
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Subject
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                All Subjects ({filteredSubjects.length})
              </CardTitle>
              <CardDescription>
                Complete list of subjects available at the university
              </CardDescription>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subjects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="CSE">Computer Science</SelectItem>
                    <SelectItem value="ECE">Electronics & Communication</SelectItem>
                    <SelectItem value="MECH">Mechanical</SelectItem>
                    <SelectItem value="CIVIL">Civil</SelectItem>
                    <SelectItem value="EEE">Electrical</SelectItem>
                    <SelectItem value="IT">Information Technology</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">{subject.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {subject.code} • {subject.department} • Semester {subject.semester} • {subject.credits} Credits
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add New Subject</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subject-code">Subject Code</Label>
                <Input id="subject-code" placeholder="e.g., CS101" />
              </div>
              <div>
                <Label htmlFor="subject-name">Subject Name</Label>
                <Input id="subject-name" placeholder="e.g., Programming Fundamentals" />
              </div>
              <div>
                <Label htmlFor="credits">Credits</Label>
                <Input id="credits" type="number" placeholder="e.g., 4" />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CSE">Computer Science</SelectItem>
                    <SelectItem value="ECE">Electronics & Communication</SelectItem>
                    <SelectItem value="MECH">Mechanical</SelectItem>
                    <SelectItem value="CIVIL">Civil</SelectItem>
                    <SelectItem value="EEE">Electrical</SelectItem>
                    <SelectItem value="IT">Information Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="semester">Semester</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(sem => (
                      <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Add Subject</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}