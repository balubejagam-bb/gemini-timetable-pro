import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, University, Bell, Shield, Download, Upload } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure system settings for Mohan Babu University
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* University Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <University className="w-5 h-5" />
              University Information
            </CardTitle>
            <CardDescription>
              Basic information about the institution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="university-name">University Name</Label>
              <Input id="university-name" defaultValue="Mohan Babu University" />
            </div>
            <div>
              <Label htmlFor="university-code">University Code</Label>
              <Input id="university-code" defaultValue="MBU" />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea 
                id="address" 
                defaultValue="Sree Sainath Nagar, Tirupati, Andhra Pradesh, India"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" defaultValue="+91 877 237 0999" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue="info@mbu.ac.in" />
              </div>
            </div>
            <Button>Update Information</Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Configure system notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email alerts for important events</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Timetable Updates</Label>
                <p className="text-sm text-muted-foreground">Notify when timetables are generated</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>System Maintenance</Label>
                <p className="text-sm text-muted-foreground">Alerts for scheduled maintenance</p>
              </div>
              <Switch />
            </div>
            <Button>Save Preferences</Button>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              System Configuration
            </CardTitle>
            <CardDescription>
              General system settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="academic-year">Academic Year</Label>
              <Input id="academic-year" defaultValue="2024-2025" />
            </div>
            <div>
              <Label htmlFor="semester">Current Semester</Label>
              <Input id="semester" defaultValue="1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="working-days">Working Days/Week</Label>
                <Input id="working-days" defaultValue="6" />
              </div>
              <div>
                <Label htmlFor="periods-per-day">Periods Per Day</Label>
                <Input id="periods-per-day" defaultValue="6" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Saturday Working</Label>
                <p className="text-sm text-muted-foreground">Include Saturday in weekly schedule</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Button>Update Configuration</Button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Backup and restore system data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Backup Data</Label>
              <p className="text-sm text-muted-foreground">
                Export all system data including subjects, staff, and timetables
              </p>
              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Download Backup
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Restore Data</Label>
              <p className="text-sm text-muted-foreground">
                Import previously exported system data
              </p>
              <Button variant="outline" className="w-full gap-2">
                <Upload className="w-4 h-4" />
                Import Backup
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-destructive">Reset System</Label>
              <p className="text-sm text-muted-foreground">
                Clear all data and reset to defaults (irreversible)
              </p>
              <Button variant="destructive" className="w-full">
                Reset All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
          <CardDescription>
            Configure AI settings for timetable generation
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label htmlFor="gemini-api-key">Gemini API Key</Label>
              <Input 
                id="gemini-api-key" 
                type="password"
                placeholder="Enter your Gemini API key"
                defaultValue="AIzaSyDVGpwtC69A_xp58jGbvW3VWInG2FV_PQY"
              />
            </div>
            <div>
              <Label htmlFor="api-endpoint">API Endpoint</Label>
              <Input 
                id="api-endpoint" 
                defaultValue="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
                readOnly
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Conflict Resolution</Label>
                <p className="text-sm text-muted-foreground">Automatically resolve scheduling conflicts</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Load Balancing</Label>
                <p className="text-sm text-muted-foreground">Balance workload across faculty</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Button>Save AI Configuration</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}