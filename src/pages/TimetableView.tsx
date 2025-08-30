import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Edit3, RefreshCw, Calendar } from "lucide-react";

const timeSlots = [
  "9:00-10:00",
  "10:00-11:00", 
  "11:15-12:15",
  "12:15-13:15",
  "14:00-15:00",
  "15:00-16:00"
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const sampleTimetable = {
  "Monday": {
    "9:00-10:00": { subject: "Mathematics", teacher: "Dr. Smith", room: "101" },
    "10:00-11:00": { subject: "Physics", teacher: "Prof. Johnson", room: "201" },
    "11:15-12:15": { subject: "Chemistry", teacher: "Dr. Brown", room: "301" },
    "12:15-13:15": { subject: "English", teacher: "Ms. Davis", room: "102" },
    "14:00-15:00": { subject: "Computer Science", teacher: "Mr. Wilson", room: "Lab-1" },
    "15:00-16:00": { subject: "Sports", teacher: "Coach Lee", room: "Ground" }
  },
  "Tuesday": {
    "9:00-10:00": { subject: "Physics", teacher: "Prof. Johnson", room: "201" },
    "10:00-11:00": { subject: "Mathematics", teacher: "Dr. Smith", room: "101" },
    "11:15-12:15": { subject: "English", teacher: "Ms. Davis", room: "102" },
    "12:15-13:15": { subject: "Chemistry", teacher: "Dr. Brown", room: "301" },
    "14:00-15:00": { subject: "Biology", teacher: "Dr. White", room: "Lab-2" },
    "15:00-16:00": { subject: "History", teacher: "Mr. Taylor", room: "103" }
  },
  // ... other days would be similar
};

const subjectColors: Record<string, string> = {
  "Mathematics": "bg-blue-100 text-blue-800 border-blue-200",
  "Physics": "bg-green-100 text-green-800 border-green-200",
  "Chemistry": "bg-purple-100 text-purple-800 border-purple-200",
  "English": "bg-orange-100 text-orange-800 border-orange-200",
  "Computer Science": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Biology": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "History": "bg-amber-100 text-amber-800 border-amber-200",
  "Sports": "bg-red-100 text-red-800 border-red-200"
};

export default function TimetableView() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timetable View</h1>
          <p className="text-muted-foreground">
            View and manage generated timetables
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Edit3 className="w-4 h-4" />
            Edit
          </Button>
          <Button size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Timetable Filters
          </CardTitle>
          <CardDescription>
            Select department and section to view timetable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select defaultValue="cse">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cse">Computer Science</SelectItem>
                <SelectItem value="ece">Electronics</SelectItem>
                <SelectItem value="mech">Mechanical</SelectItem>
                <SelectItem value="civil">Civil</SelectItem>
              </SelectContent>
            </Select>
            
            <Select defaultValue="a">
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Section A</SelectItem>
                <SelectItem value="b">Section B</SelectItem>
                <SelectItem value="c">Section C</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="sem1">
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sem1">Sem 1</SelectItem>
                <SelectItem value="sem2">Sem 2</SelectItem>
                <SelectItem value="sem3">Sem 3</SelectItem>
                <SelectItem value="sem4">Sem 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      <Card>
        <CardHeader>
          <CardTitle>CSE - Section A Timetable</CardTitle>
          <CardDescription>Semester 1 | Generated on {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-full">
              {/* Header */}
              <div className="font-semibold p-3 bg-muted rounded-lg text-center">
                Time
              </div>
              {days.map(day => (
                <div key={day} className="font-semibold p-3 bg-muted rounded-lg text-center">
                  {day}
                </div>
              ))}

              {/* Time slots and schedule */}
              {timeSlots.map(timeSlot => (
                <div key={timeSlot} className="contents">
                  <div className="p-3 bg-muted/50 rounded-lg text-center font-medium text-sm">
                    {timeSlot}
                  </div>
                  {days.map(day => {
                    const classData = sampleTimetable[day as keyof typeof sampleTimetable]?.[timeSlot];
                    
                    if (!classData) {
                      return (
                        <div key={`${day}-${timeSlot}`} className="p-3 border border-dashed border-muted rounded-lg text-center text-muted-foreground text-sm">
                          Free
                        </div>
                      );
                    }

                    return (
                      <div key={`${day}-${timeSlot}`} className="p-3 border rounded-lg hover:shadow-sm transition-shadow">
                        <Badge className={`${subjectColors[classData.subject] || "bg-gray-100 text-gray-800"} mb-2 text-xs`}>
                          {classData.subject}
                        </Badge>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{classData.teacher}</p>
                          <p className="text-xs text-muted-foreground">{classData.room}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
