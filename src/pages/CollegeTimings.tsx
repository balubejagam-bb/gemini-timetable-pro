import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CollegeTimings() {
  const [timings, setTimings] = useState([
    { id: 1, period: "Period 1", startTime: "09:00", endTime: "09:50" },
    { id: 2, period: "Period 2", startTime: "09:50", endTime: "10:40" },
    { id: 3, period: "Break", startTime: "10:40", endTime: "11:00" },
    { id: 4, period: "Period 3", startTime: "11:00", endTime: "11:50" },
    { id: 5, period: "Period 4", startTime: "11:50", endTime: "12:40" },
    { id: 6, period: "Lunch Break", startTime: "12:40", endTime: "01:30" },
    { id: 7, period: "Period 5", startTime: "01:30", endTime: "02:20" },
    { id: 8, period: "Period 6", startTime: "02:20", endTime: "03:10" },
  ]);

  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "File Uploaded",
        description: `${file.name} uploaded successfully. Processing timings data...`,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">College Timings</h1>
          <p className="text-muted-foreground">
            Manage daily schedule and time periods for Mohan Babu University
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="timing-upload"
            />
            <label htmlFor="timing-upload" className="flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload CSV/Excel
            </label>
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Period
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Daily Schedule
              </CardTitle>
              <CardDescription>
                Configure time periods and breaks for the university
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timings.map((timing) => (
                  <div
                    key={timing.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="font-medium">{timing.period}</div>
                      <div className="text-sm text-muted-foreground">
                        {timing.startTime} - {timing.endTime}
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
              <CardTitle>Add New Period</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="period-name">Period Name</Label>
                <Input id="period-name" placeholder="e.g., Period 1" />
              </div>
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input id="start-time" type="time" />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input id="end-time" type="time" />
              </div>
              <Button className="w-full">Add Period</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}