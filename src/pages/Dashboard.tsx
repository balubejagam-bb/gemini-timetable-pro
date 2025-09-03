import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  Building2,
  MapPin,
  UserCheck,
  Calendar,
  Sparkles,
  TrendingUp,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Mohan Babu University's AI-powered timetable management system
          </p>
        </div>
        <Link to="/generate">
          <Button size="lg" className="gap-2 animate-glow">
            <Sparkles className="w-4 h-4" />
            Generate Timetable
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Subjects"
          value="24"
          description="Active subjects"
          icon={BookOpen}
          color="info"
        />
        <StatsCard
          title="Sections"
          value="12"
          description="Across all departments"
          icon={Users}
          color="success"
        />
        <StatsCard
          title="Departments"
          value="6"
          description="Academic departments"
          icon={Building2}
          color="warning"
        />
        <StatsCard
          title="Available Rooms"
          value="36"
          description="Classrooms & labs"
          icon={MapPin}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Faculty Members"
          value="18"
          description="Teaching staff"
          icon={UserCheck}
          color="success"
        />
        <StatsCard
          title="Generated Timetables"
          value="3"
          description="This semester"
          icon={Calendar}
          color="info"
        />
        <StatsCard
          title="Average Efficiency"
          value="92%"
          description="AI optimization rate"
          icon={TrendingUp}
          color="success"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Frequently used management tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/subjects">
              <Button variant="outline" className="w-full justify-start gap-2">
                <BookOpen className="w-4 h-4" />
                Manage Subjects
              </Button>
            </Link>
            <Link to="/staff">
              <Button variant="outline" className="w-full justify-start gap-2">
                <UserCheck className="w-4 h-4" />
                Manage Staff
              </Button>
            </Link>
            <Link to="/sections">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="w-4 h-4" />
                Manage Sections
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest updates and changes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <div className="text-sm">
                <p className="font-medium">Timetable generated for CSE-A</p>
                <p className="text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 bg-info rounded-full"></div>
              <div className="text-sm">
                <p className="font-medium">New faculty member added</p>
                <p className="text-muted-foreground">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <div className="text-sm">
                <p className="font-medium">Room allocation updated</p>
                <p className="text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}