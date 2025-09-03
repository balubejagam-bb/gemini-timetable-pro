import { useEffect, useState, useMemo } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
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

interface ActivityItem { message: string; meta?: string; type?: string; ts: string; }
interface Counts { subjects: number; sections: number; departments: number; rooms: number; staff: number; timetableSlots: number; filledSlots: number; timetablesGenerated: number; }

export default function Dashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        // Parallel fetches
        const [subj, sect, dept, room, staff, tt, timings] = await Promise.all([
          supabase.from('subjects').select('id'),
          supabase.from('sections').select('id'),
          supabase.from('departments').select('id'),
            supabase.from('rooms').select('id'),
          supabase.from('staff').select('id,max_hours_per_week'),
          supabase.from('timetables').select('id,created_at,section_id'),
          supabase.from('college_timings').select('id,day_of_week')
        ]);
        if (cancelled) return;
        const subjects = subj.data?.length || 0;
        const sections = sect.data?.length || 0;
        const departments = dept.data?.length || 0;
        const rooms = room.data?.length || 0;
        const staffCount = staff.data?.length || 0;
        const timetableEntries = tt.data || [];
        const timingsData = timings.data || [];
        // Estimate total possible slots: unique (section x day x timing)
        const uniqueDays = new Set(timingsData.map(t => t.day_of_week));
        const timingsPerDay = timingsData.length / (uniqueDays.size || 1);
        const timetableSlots = sections * uniqueDays.size * timingsPerDay;
        const filledSlots = timetableEntries.length;
        // Timetables generated: count distinct section_ids having at least one row
        const timetablesGenerated = new Set(timetableEntries.map(r => r.section_id)).size;
        setCounts({ subjects, sections, departments, rooms, staff: staffCount, timetableSlots, filledSlots, timetablesGenerated });

        // Build activity list (latest 5 timetable entries + a synthetic summary)
        const recent = [...timetableEntries]
          .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0,5)
          .map(r => ({ message: `Timeslot scheduled`, meta: r.section_id, type: 'success', ts: r.created_at }));
  if (subjects) recent.unshift({ message: `Subjects catalog size: ${subjects}`, meta: '', ts: new Date().toISOString(), type: 'info' });
        setActivities(recent);
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const efficiency = useMemo(() => {
    if (!counts) return 0;
    if (!counts.timetableSlots) return 0;
    return Math.round((counts.filledSlots / counts.timetableSlots) * 100);
  }, [counts]);

  const workloadUtilization = useMemo(() => {
    // Placeholder: could derive from staff_subjects + hours_per_week vs max_hours_per_week
    return efficiency; // reuse until more detailed calc implemented
  }, [efficiency]);

  const LoadingGrid = (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({length:4}).map((_,i)=>(<Skeleton key={i} className="h-32 w-full" />))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time analytics for the AI timetable system
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
      {loading || !counts ? LoadingGrid : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total Subjects" value={counts.subjects} description="Active subjects" icon={BookOpen} color="info" />
          <StatsCard title="Sections" value={counts.sections} description="All sections" icon={Users} color="success" />
          <StatsCard title="Departments" value={counts.departments} description="Academic units" icon={Building2} color="warning" />
          <StatsCard title="Available Rooms" value={counts.rooms} description="Classrooms & labs" icon={MapPin} />
        </div>
      )}

      {/* Additional Stats */}
      {loading || !counts ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({length:3}).map((_,i)=>(<Skeleton key={i} className="h-32 w-full" />))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard title="Faculty Members" value={counts.staff} description="Teaching staff" icon={UserCheck} color="success" />
          <StatsCard title="Generated Timetables" value={counts.timetablesGenerated} description="Sections with schedules" icon={Calendar} color="info" />
          <StatsCard title="Slot Utilization" value={`${efficiency}%`} description={`${counts.filledSlots}/${Math.max(counts.timetableSlots,1)} slots used`} icon={TrendingUp} color={efficiency>70? 'success' : 'warning'} />
        </div>
      )}

      {/* Quick Actions & Activity */}
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
            {loading && <Skeleton className="h-24 w-full" />}
            {!loading && (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1" role="list" aria-label="Recent activity list">
                {activities.length === 0 && <p className="text-xs text-muted-foreground">No recent activity.</p>}
                {activities.map((a,i) => (
                  <div key={i} role="listitem" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-2 h-2 rounded-full ${a.type==='success' ? 'bg-success' : a.type==='warning' ? 'bg-warning' : 'bg-info'}`}></div>
                    <div className="text-sm min-w-0">
                      <p className="font-medium truncate" title={a.message + (a.meta?` (${a.meta})`: '')}>{a.message}{a.meta && <span className="text-muted-foreground"> · {a.meta}</span>}</p>
                      <p className="text-muted-foreground text-[11px]">{new Date(a.ts).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}