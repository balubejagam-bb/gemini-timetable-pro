import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Building2, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Departments() {
  const [departments] = useState([
    { 
      id: 1, 
      name: "Computer Science Engineering", 
      code: "CSE", 
      hod: "Dr. Rajesh Kumar",
      totalSections: 3,
      totalStudents: 173,
      description: "Focuses on programming, algorithms, software development, and computer systems."
    },
    { 
      id: 2, 
      name: "Electronics & Communication Engineering", 
      code: "ECE", 
      hod: "Dr. Priya Sharma",
      totalSections: 2,
      totalStudents: 98,
      description: "Covers electronic devices, communication systems, and signal processing."
    },
    { 
      id: 3, 
      name: "Mechanical Engineering", 
      code: "MECH", 
      hod: "Dr. Suresh Reddy",
      totalSections: 3,
      totalStudents: 134,
      description: "Deals with design, manufacturing, and maintenance of mechanical systems."
    },
    { 
      id: 4, 
      name: "Civil Engineering", 
      code: "CIVIL", 
      hod: "Dr. Anitha Rao",
      totalSections: 2,
      totalStudents: 78,
      description: "Involves planning, design, and construction of infrastructure projects."
    },
    { 
      id: 5, 
      name: "Electrical Engineering", 
      code: "EEE", 
      hod: "Dr. Venkat Krishnan",
      totalSections: 1,
      totalStudents: 35,
      description: "Focuses on electrical systems, power generation, and control systems."
    },
    { 
      id: 6, 
      name: "Information Technology", 
      code: "IT", 
      hod: "Dr. Srinivas Patel",
      totalSections: 2,
      totalStudents: 102,
      description: "Emphasizes software applications, database management, and IT solutions."
    },
  ]);

  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "File Uploaded",
        description: `${file.name} uploaded successfully. Processing departments data...`,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">
            Manage academic departments at Mohan Babu University
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="department-upload"
            />
            <label htmlFor="department-upload" className="flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload CSV/Excel
            </label>
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Department
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                All Departments ({departments.length})
              </CardTitle>
              <CardDescription>
                Academic departments and their details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departments.map((department) => (
                  <div
                    key={department.id}
                    className="p-6 border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{department.name}</h3>
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                            {department.code}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {department.description}
                        </p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">HOD:</span>
                            <div className="font-medium">{department.hod}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sections:</span>
                            <div className="font-medium">{department.totalSections}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Students:</span>
                            <div className="font-medium">{department.totalStudents}</div>
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
              <CardTitle>Add New Department</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dept-name">Department Name</Label>
                <Input id="dept-name" placeholder="e.g., Computer Science Engineering" />
              </div>
              <div>
                <Label htmlFor="dept-code">Department Code</Label>
                <Input id="dept-code" placeholder="e.g., CSE" />
              </div>
              <div>
                <Label htmlFor="hod">Head of Department</Label>
                <Input id="hod" placeholder="e.g., Dr. John Smith" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Brief description of the department..." />
              </div>
              <Button className="w-full">Add Department</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}