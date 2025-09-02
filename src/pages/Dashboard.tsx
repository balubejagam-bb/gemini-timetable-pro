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
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface ActivityItem {
  id: string;
  label: string;
  timeAgo: string;
  color: string; // success | info | warning
}

export default function Dashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    subjects: 0,
    sections: 0,
    departments: 0,
    rooms: 0,
    staff: 0,
    timetables: 0
  });
  const [efficiency, setEfficiency] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const fetchCounts = useCallback(async () => {
    try {
      setLoading(true);
      // Parallel lightweight count queries (using head:true & select count)
  const tables = ['subjects','sections','departments','rooms','staff','timetables'] as const;
  const results = await Promise.all(tables.map(t => supabase.from(t).select('id', { count: 'exact', head: true })));
      const newCounts: Record<string, number> = {};
      tables.forEach((t,i) => { newCounts[t] = results[i].count || 0; });
      setCounts({
        subjects: newCounts.subjects,
        sections: newCounts.sections,
        departments: newCounts.departments,
        rooms: newCounts.rooms,
        staff: newCounts.staff,
        timetables: newCounts.timetables
      });

      // Build recent activity from updated_at/created_at of key tables
      interface BasicRow { id: string; updated_at?: string; created_at?: string; }
      interface StaffRow extends BasicRow { name?: string; }
      interface RoomRow extends BasicRow { room_number?: string; }
      const activityQueries = [
        supabase.from('timetables').select('id, updated_at, created_at').order('updated_at', { ascending: false }).limit(5),
        supabase.from('staff').select('id, name, updated_at, created_at').order('updated_at', { ascending: false }).limit(5),
        supabase.from('rooms').select('id, room_number, updated_at, created_at').order('updated_at', { ascending: false }).limit(5),
      ];
      const [ttRes, staffRes, roomRes] = await Promise.all(activityQueries);

      const now = Date.now();
      const rel = (ts?: string) => {
        if (!ts) return '';
        const diffMs = now - new Date(ts).getTime();
        const mins = Math.floor(diffMs/60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins/60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs/24);
        return `${days}d ago`;
      };

      const acts: ActivityItem[] = [];
  (ttRes.data as BasicRow[] | null || []).forEach(r => acts.push({ id: `tt-${r.id}`, label: 'Timetable updated', timeAgo: rel(r.updated_at || r.created_at), color: 'success' }));
  (staffRes.data as StaffRow[] | null || []).forEach(r => acts.push({ id: `st-${r.id}`, label: 'Staff change: ' + (r.name || 'Unknown'), timeAgo: rel(r.updated_at || r.created_at), color: 'info' }));
  (roomRes.data as RoomRow[] | null || []).forEach(r => acts.push({ id: `rm-${r.id}`, label: 'Room updated ' + (r.room_number || ''), timeAgo: rel(r.updated_at || r.created_at), color: 'warning' }));

      // Sort globally and take top 6
      const sorted = acts.sort((a,b) => (a.timeAgo > b.timeAgo ? -1 : 1)).slice(0,6);
      setActivities(sorted);

      // Fake efficiency metric based on timetable coverage ratio
      const efficiencyCalc = newCounts.timetables && newCounts.sections ? Math.min(100, Math.round((newCounts.timetables / (newCounts.sections*6 || 1)) * 100)) : 0;
      setEfficiency(efficiencyCalc);
    } catch (e) {
      const message = (e instanceof Error) ? e.message : String(e);
      toast({ title: 'Dashboard Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

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
  <StatsCard title="Total Subjects" value={counts.subjects} description="Active subjects" icon={BookOpen} color="info" isLoading={loading} />
  <StatsCard title="Sections" value={counts.sections} description="Across all departments" icon={Users} color="success" isLoading={loading} />
  <StatsCard title="Departments" value={counts.departments} description="Academic departments" icon={Building2} color="warning" isLoading={loading} />
  <StatsCard title="Available Rooms" value={counts.rooms} description="Classrooms & labs" icon={MapPin} isLoading={loading} />
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
  <StatsCard title="Faculty Members" value={counts.staff} description="Teaching staff" icon={UserCheck} color="success" isLoading={loading} />
  <StatsCard title="Generated Timetables" value={counts.timetables} description="Total entries" icon={Calendar} color="info" isLoading={loading} />
  <StatsCard title="Average Efficiency" value={efficiency!==null? `${efficiency}%` : '—'} description="Coverage estimate" icon={TrendingUp} color="success" isLoading={loading} />
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
            {loading && activities.length===0 && (
              <div className="space-y-2">
                {[...Array(3)].map((_,i)=>(
                  <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            )}
            {!loading && activities.length===0 && (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
            {!loading && activities.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className={`w-2 h-2 rounded-full ${a.color==='success'?'bg-success':a.color==='info'?'bg-info':'bg-warning'}`}></div>
                <div className="text-sm">
                  <p className="font-medium truncate max-w-[220px]">{a.label}</p>
                  <p className="text-muted-foreground text-xs">{a.timeAgo}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}