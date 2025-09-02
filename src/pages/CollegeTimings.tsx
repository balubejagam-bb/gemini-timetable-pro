import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, Clock, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CollegeTiming {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
}

export default function CollegeTimings() {
  const [timings, setTimings] = useState<CollegeTiming[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTiming, setEditingTiming] = useState<CollegeTiming | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const fetchTimings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('college_timings')
        .select('*')
        .order('day_of_week');

      if (error) throw error;
      setTimings(data || []);
    } catch (error) {
      console.error('Error fetching timings:', error);
      toast({
        title: "Error",
        description: "Failed to load college timings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTimings();
  }, [fetchTimings]);

  const handleSaveTiming = async (timingData: Omit<CollegeTiming, 'id'> & { id?: string }) => {
    try {
      setLoading(true);
      
      if (timingData.id) {
        // Update existing timing
        const { error } = await supabase
          .from('college_timings')
          .update({
            day_of_week: timingData.day_of_week,
            start_time: timingData.start_time,
            end_time: timingData.end_time,
            break_start: timingData.break_start,
            break_end: timingData.break_end,
            lunch_start: timingData.lunch_start,
            lunch_end: timingData.lunch_end
          })
          .eq('id', timingData.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "College timing updated successfully"
        });
      } else {
        // Add new timing
        const { error } = await supabase
          .from('college_timings')
          .insert({
            day_of_week: timingData.day_of_week,
            start_time: timingData.start_time,
            end_time: timingData.end_time,
            break_start: timingData.break_start,
            break_end: timingData.break_end,
            lunch_start: timingData.lunch_start,
            lunch_end: timingData.lunch_end
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "College timing added successfully"
        });
      }
      
      setEditingTiming(null);
      setIsAddDialogOpen(false);
      fetchTimings();
    } catch (error) {
      console.error('Error saving timing:', error);
      toast({
        title: "Error",
        description: "Failed to save college timing",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTiming = async (id: string) => {
    if (!confirm("Are you sure you want to delete this timing?")) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('college_timings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "College timing deleted successfully"
      });
      
      fetchTimings();
    } catch (error) {
      console.error('Error deleting timing:', error);
      toast({
        title: "Error",
        description: "Failed to delete college timing",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      
      const timingData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            day_of_week: parseInt(values[0]) || 1,
            start_time: values[1] || '09:00',
            end_time: values[2] || '17:00',
            break_start: values[3] || null,
            break_end: values[4] || null,
            lunch_start: values[5] || null,
            lunch_end: values[6] || null
          };
        });

      // Insert all timings
      for (const timing of timingData) {
        await supabase.from('college_timings').insert(timing);
      }

      toast({
        title: "Success",
        description: `${timingData.length} timings imported successfully`
      });
      
      fetchTimings();
    } catch (error) {
      console.error('Error importing timings:', error);
      toast({
        title: "Error",
        description: "Failed to import timings data",
        variant: "destructive"
      });
    }
  };

  const formatTime = (time: string) => {
    try {
      const date = new Date(`2000-01-01T${time}`);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return time;
    }
  };

  const getDayName = (dayNumber: number) => {
    return daysOfWeek[dayNumber - 1] || `Day ${dayNumber}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">College Timings</h1>
          <p className="text-muted-foreground">
            Manage daily schedule and break times
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="timings-upload"
            />
            <Button variant="outline" asChild className="gap-2">
              <label htmlFor="timings-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Timing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New College Timing</DialogTitle>
              </DialogHeader>
              <TimingForm 
                daysOfWeek={daysOfWeek}
                onSave={handleSaveTiming}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Timings Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            College Schedule ({timings.length})
          </CardTitle>
          <CardDescription>
            Daily timings and break schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : timings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No timings configured</p>
              <p className="text-sm">Add college timings to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {timings.map((timing) => (
                <Card key={timing.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {getDayName(timing.day_of_week)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(timing.start_time)} - {formatTime(timing.end_time)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTiming(timing)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTiming(timing.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {timing.break_start && timing.break_end && (
                        <div className="text-sm">
                          <Badge variant="secondary" className="text-xs mr-2">Break</Badge>
                          <span className="text-muted-foreground">
                            {formatTime(timing.break_start)} - {formatTime(timing.break_end)}
                          </span>
                        </div>
                      )}
                      
                      {timing.lunch_start && timing.lunch_end && (
                        <div className="text-sm">
                          <Badge variant="outline" className="text-xs mr-2">Lunch</Badge>
                          <span className="text-muted-foreground">
                            {formatTime(timing.lunch_start)} - {formatTime(timing.lunch_end)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingTiming && (
        <Dialog open={!!editingTiming} onOpenChange={() => setEditingTiming(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit College Timing</DialogTitle>
            </DialogHeader>
            <TimingForm 
              timing={editingTiming}
              daysOfWeek={daysOfWeek}
              onSave={handleSaveTiming}
              onCancel={() => setEditingTiming(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Timing Form Component
interface TimingFormProps {
  timing?: CollegeTiming;
  daysOfWeek: string[];
  onSave: (timing: Omit<CollegeTiming, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

function TimingForm({ timing, daysOfWeek, onSave, onCancel }: TimingFormProps) {
  const [formData, setFormData] = useState({
    id: timing?.id || '',
    day_of_week: timing?.day_of_week || 1,
    start_time: timing?.start_time || '09:00',
    end_time: timing?.end_time || '17:00',
    break_start: timing?.break_start || '',
    break_end: timing?.break_end || '',
    lunch_start: timing?.lunch_start || '',
    lunch_end: timing?.lunch_end || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      break_start: formData.break_start || null,
      break_end: formData.break_end || null,
      lunch_start: formData.lunch_start || null,
      lunch_end: formData.lunch_end || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="day_of_week">Day of Week *</Label>
        <Select
          value={formData.day_of_week.toString()}
          onValueChange={(value) => setFormData(prev => ({ ...prev, day_of_week: parseInt(value) }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Day" />
          </SelectTrigger>
          <SelectContent>
            {daysOfWeek.map((day, index) => (
              <SelectItem key={day} value={(index + 1).toString()}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Start Time *</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="end_time">End Time *</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="break_start">Break Start</Label>
          <Input
            id="break_start"
            type="time"
            value={formData.break_start}
            onChange={(e) => setFormData(prev => ({ ...prev, break_start: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="break_end">Break End</Label>
          <Input
            id="break_end"
            type="time"
            value={formData.break_end}
            onChange={(e) => setFormData(prev => ({ ...prev, break_end: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lunch_start">Lunch Start</Label>
          <Input
            id="lunch_start"
            type="time"
            value={formData.lunch_start}
            onChange={(e) => setFormData(prev => ({ ...prev, lunch_start: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="lunch_end">Lunch End</Label>
          <Input
            id="lunch_end"
            type="time"
            value={formData.lunch_end}
            onChange={(e) => setFormData(prev => ({ ...prev, lunch_end: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-1" />
          Save Timing
        </Button>
      </div>
    </form>
  );
}
