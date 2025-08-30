import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, UserCheck, Plus, Edit, Trash2, Search, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Staff() {
  const [staff] = useState([
    { 
      id: 1, 
      name: "Dr. Rajesh Kumar", 
      designation: "Professor & HOD", 
      department: "Computer Science", 
      email: "rajesh.kumar@mbu.ac.in",
      phone: "+91 9876543210",
      subjects: ["Data Structures", "Algorithms", "Software Engineering"],
      experience: "15 years"
    },
    { 
      id: 2, 
      name: "Dr. Priya Sharma", 
      designation: "Associate Professor", 
      department: "Electronics & Communication", 
      email: "priya.sharma@mbu.ac.in",
      phone: "+91 9876543211",
      subjects: ["Digital Electronics", "Communication Systems", "Signal Processing"],
      experience: "12 years"
    },
    { 
      id: 3, 
      name: "Prof. Suresh Reddy", 
      designation: "Assistant Professor", 
      department: "Mechanical Engineering", 
      email: "suresh.reddy@mbu.ac.in",
      phone: "+91 9876543212",
      subjects: ["Thermodynamics", "Fluid Mechanics", "Heat Transfer"],
      experience: "8 years"
    },
    { 
      id: 4, 
      name: "Dr. Anitha Rao", 
      designation: "Professor", 
      department: "Civil Engineering", 
      email: "anitha.rao@mbu.ac.in",
      phone: "+91 9876543213",
      subjects: ["Structural Analysis", "Concrete Technology", "Transportation Engineering"],
      experience: "18 years"
    },
    { 
      id: 5, 
      name: "Prof. Venkat Krishnan", 
      designation: "Associate Professor", 
      department: "Electrical Engineering", 
      email: "venkat.krishnan@mbu.ac.in",
      phone: "+91 9876543214",
      subjects: ["Power Systems", "Control Systems", "Electrical Machines"],
      experience: "10 years"
    },
    { 
      id: 6, 
      name: "Dr. Srinivas Patel", 
      designation: "Assistant Professor", 
      department: "Information Technology", 
      email: "srinivas.patel@mbu.ac.in",
      phone: "+91 9876543215",
      subjects: ["Database Management", "Web Technologies", "Network Security"],
      experience: "6 years"
    },
    { 
      id: 7, 
      name: "Prof. Meera Gupta", 
      designation: "Assistant Professor", 
      department: "Computer Science", 
      email: "meera.gupta@mbu.ac.in",
      phone: "+91 9876543216",
      subjects: ["Object Oriented Programming", "Computer Networks", "Machine Learning"],
      experience: "5 years"
    },
    { 
      id: 8, 
      name: "Dr. Ramesh Babu", 
      designation: "Professor", 
      department: "Electronics & Communication", 
      email: "ramesh.babu@mbu.ac.in",
      phone: "+91 9876543217",
      subjects: ["Microprocessors", "VLSI Design", "Embedded Systems"],
      experience: "20 years"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const { toast } = useToast();

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "all" || member.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "File Uploaded",
        description: `${file.name} uploaded successfully. Processing staff data...`,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage faculty and staff at Mohan Babu University
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="staff-upload"
            />
            <label htmlFor="staff-upload" className="flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload CSV/Excel
            </label>
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Staff
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                All Staff ({filteredStaff.length})
              </CardTitle>
              <CardDescription>
                Faculty and staff members with their details
              </CardDescription>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
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
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Electronics & Communication">Electronics & Communication</SelectItem>
                    <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                    <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                    <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                    <SelectItem value="Information Technology">Information Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredStaff.map((member) => (
                  <div
                    key={member.id}
                    className="p-6 border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{member.name}</h3>
                          <Badge variant="secondary">{member.designation}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{member.department}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>{member.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{member.phone}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Experience:</span>
                            <span className="ml-2 font-medium">{member.experience}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Subjects:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.subjects.map((subject, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {subject}
                                </Badge>
                              ))}
                            </div>
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add New Staff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="staff-name">Full Name</Label>
                <Input id="staff-name" placeholder="e.g., Dr. John Smith" />
              </div>
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Professor">Professor</SelectItem>
                    <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                    <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                    <SelectItem value="Lecturer">Lecturer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Electronics & Communication">Electronics & Communication</SelectItem>
                    <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                    <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                    <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                    <SelectItem value="Information Technology">Information Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="email@mbu.ac.in" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+91 9876543210" />
              </div>
              <div>
                <Label htmlFor="experience">Experience</Label>
                <Input id="experience" placeholder="e.g., 5 years" />
              </div>
              <Button className="w-full">Add Staff Member</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}