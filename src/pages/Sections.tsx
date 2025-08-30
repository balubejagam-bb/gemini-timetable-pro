import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Users, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Sections() {
  const [sections] = useState([
    { id: 1, name: "CSE-A", department: "Computer Science Engineering", semester: 1, strength: 60 },
    { id: 2, name: "CSE-B", department: "Computer Science Engineering", semester: 1, strength: 58 },
    { id: 3, name: "CSE-C", department: "Computer Science Engineering", semester: 1, strength: 55 },
    { id: 4, name: "ECE-A", department: "Electronics & Communication", semester: 1, strength: 50 },
    { id: 5, name: "ECE-B", department: "Electronics & Communication", semester: 1, strength: 48 },
    { id: 6, name: "MECH-A", department: "Mechanical Engineering", semester: 1, strength: 45 },
    { id: 7, name: "MECH-B", department: "Mechanical Engineering", semester: 1, strength: 47 },
    { id: 8, name: "MECH-C", department: "Mechanical Engineering", semester: 1, strength: 42 },
    { id: 9, name: "CIVIL-A", department: "Civil Engineering", semester: 1, strength: 40 },
    { id: 10, name: "CIVIL-B", department: "Civil Engineering", semester: 1, strength: 38 },
    { id: 11, name: "EEE-A", department: "Electrical Engineering", semester: 1, strength: 35 },
    { id: 12, name: "IT-A", department: "Information Technology", semester: 1, strength: 52 },
    { id: 13, name: "IT-B", department: "Information Technology", semester: 1, strength: 50 },
  ]);

  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "File Uploaded",
        description: `${file.name} uploaded successfully. Processing sections data...`,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sections</h1>
          <p className="text-muted-foreground">
            Manage student sections for Mohan Babu University
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="section-upload"
            />
            <label htmlFor="section-upload" className="flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload CSV/Excel
            </label>
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Section
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Sections ({sections.length})
              </CardTitle>
              <CardDescription>
                Student sections organized by department and semester
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">{section.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {section.department} • Semester {section.semester} • {section.strength} Students
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
              <CardTitle>Add New Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="section-name">Section Name</Label>
                <Input id="section-name" placeholder="e.g., CSE-A" />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cse">Computer Science Engineering</SelectItem>
                    <SelectItem value="ece">Electronics & Communication</SelectItem>
                    <SelectItem value="mech">Mechanical Engineering</SelectItem>
                    <SelectItem value="civil">Civil Engineering</SelectItem>
                    <SelectItem value="eee">Electrical Engineering</SelectItem>
                    <SelectItem value="it">Information Technology</SelectItem>
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
              <div>
                <Label htmlFor="strength">Student Strength</Label>
                <Input id="strength" type="number" placeholder="e.g., 60" />
              </div>
              <Button className="w-full">Add Section</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}