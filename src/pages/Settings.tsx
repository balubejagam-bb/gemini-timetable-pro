import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings as SettingsIcon, University, Bell, Shield, Download, Upload, Key, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { env } from "@/lib/env";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<"unknown" | "valid" | "invalid">("unknown");
  const [isTestingKey, setIsTestingKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load API key from environment variable
    const envApiKey = env.GOOGLE_AI_API_KEY;
    if (envApiKey) {
      setApiKey(envApiKey);
      setApiKeyStatus("valid"); // Assume valid if from env
    }
  }, []);

  const testApiKey = async () => {
    if (!apiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key to test",
        variant: "destructive"
      });
      return;
    }

    setIsTestingKey(true);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello" }] }],
            generationConfig: { 
              maxOutputTokens: 10,
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (response.ok) {
        setApiKeyStatus("valid");
        toast({
          title: "Success",
          description: "API key is valid and working correctly"
        });
      } else {
        setApiKeyStatus("invalid");
        toast({
          title: "Error",
          description: "API key is invalid or has insufficient permissions",
          variant: "destructive"
        });
      }
    } catch (error) {
      setApiKeyStatus("invalid");
      toast({
        title: "Error",
        description: "Failed to test API key connection",
        variant: "destructive"
      });
    }
    setIsTestingKey(false);
  };

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


    </div>
  );
}