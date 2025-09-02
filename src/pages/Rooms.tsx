import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, Building, Plus, Edit, Trash2, Search, Save, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Room {
  id: string;
  room_number: string;
  capacity: number;
  room_type: string;
  building?: string;
  floor?: number;
}

export default function Rooms() {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const roomTypes = ["classroom", "lab", "lecture_hall", "seminar", "auditorium", "other"];

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number');

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load rooms",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleSaveRoom = async (roomData: Omit<Room, 'id'> & { id?: string }) => {
    try {
      setLoading(true);
      
      if (roomData.id) {
        // Update existing room
        const { error } = await supabase
          .from('rooms')
          .update({
            room_number: roomData.room_number,
            capacity: roomData.capacity,
            room_type: roomData.room_type,
            building: roomData.building,
            floor: roomData.floor
          })
          .eq('id', roomData.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Room updated successfully"
        });
      } else {
        // Add new room
        const { error } = await supabase
          .from('rooms')
          .insert({
            room_number: roomData.room_number,
            capacity: roomData.capacity,
            room_type: roomData.room_type,
            building: roomData.building,
            floor: roomData.floor
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Room added successfully"
        });
      }
      
      setEditingRoom(null);
      setIsAddDialogOpen(false);
      fetchRooms();
    } catch (error) {
      console.error('Error saving room:', error);
      toast({
        title: "Error",
        description: "Failed to save room",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Room deleted successfully"
      });
      
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({
        title: "Error",
        description: "Failed to delete room",
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
      
      const roomData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            room_number: values[0] || '',
            capacity: parseInt(values[1]) || 30,
            room_type: values[2] || 'classroom',
            building: values[3] || '',
            floor: parseInt(values[4]) || 1
          };
        });

      // Insert all rooms
      for (const room of roomData) {
        await supabase.from('rooms').insert(room);
      }

      toast({
        title: "Success",
        description: `${roomData.length} rooms imported successfully`
      });
      
      fetchRooms();
    } catch (error) {
      console.error('Error importing rooms:', error);
      toast({
        title: "Error",
        description: "Failed to import rooms data",
        variant: "destructive"
      });
    }
  };

  // Get unique buildings for filter
  const uniqueBuildings = [...new Set(rooms.map(room => room.building).filter(Boolean))];

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (room.building && room.building.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "all" || room.room_type === filterType;
    
    const matchesBuilding = filterBuilding === "all" || room.building === filterBuilding;
    
    return matchesSearch && matchesType && matchesBuilding;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allFilteredSelected = filteredRooms.length > 0 && filteredRooms.every(r => selectedIds.has(r.id));

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected room(s)? This cannot be undone.`)) return;
    try {
      setLoading(true);
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('rooms').delete().in('id', ids);
      if (error) throw error;
      toast({ title: 'Deleted', description: `${ids.length} rooms removed.` });
      setSelectedIds(new Set());
      fetchRooms();
    } catch (e) {
      console.error('Bulk delete rooms error', e);
      toast({ title: 'Error', description: 'Failed bulk delete', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">
            Manage classroom facilities and venue spaces
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const csvContent =
                'room_number,capacity,room_type,building,floor\n' +
                'A101,40,classroom,Main,1\n' +
                'Lab1,30,lab,Tech,2\n';
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'rooms_sample.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Download Rooms Sample CSV
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="rooms-upload"
            />
            <Button variant="outline" asChild className="gap-2">
              <label htmlFor="rooms-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Room</DialogTitle>
              </DialogHeader>
              <RoomForm 
                roomTypes={roomTypes}
                onSave={handleSaveRoom}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          {selectedIds.size > 0 && (
            <Button variant="secondary" size="sm" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {roomTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterBuilding} onValueChange={setFilterBuilding}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {uniqueBuildings.map(building => (
              <SelectItem key={building} value={building}>
                {building}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {filteredRooms.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            if (allFilteredSelected) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(filteredRooms.map(r => r.id)));
            }
          }}
        >
          {allFilteredSelected ? 'Clear Selection' : 'Select All Shown'}
        </Button>
      )}

      {/* Rooms Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Rooms ({filteredRooms.length})
          </CardTitle>
          <CardDescription>
            Classroom facilities and venue management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No rooms found</p>
              <p className="text-sm">Add rooms to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRooms.map((room) => {
                const checked = selectedIds.has(room.id);
                return (
                  <Card key={room.id} className={`hover:shadow-md transition-shadow ${checked ? 'ring-2 ring-primary/40' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <Checkbox checked={checked} onCheckedChange={() => toggleSelect(room.id)} />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{room.room_number}</h3>
                            {room.building && (
                              <p className="text-sm text-muted-foreground">{room.building}{room.floor ? ` - Floor ${room.floor}` : ''}</p>
                            )}
                            <p className="text-sm text-muted-foreground">Capacity: {room.capacity} students</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingRoom(room)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteRoom(room.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={room.room_type === 'classroom' ? 'default' : room.room_type === 'lab' ? 'secondary' : 'outline'} className="text-xs">
                          {room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingRoom && (
        <Dialog open={!!editingRoom} onOpenChange={() => setEditingRoom(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
            </DialogHeader>
            <RoomForm 
              room={editingRoom}
              roomTypes={roomTypes}
              onSave={handleSaveRoom}
              onCancel={() => setEditingRoom(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Room Form Component
interface RoomFormProps {
  room?: Room;
  roomTypes: string[];
  onSave: (room: Omit<Room, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

function RoomForm({ room, roomTypes, onSave, onCancel }: RoomFormProps) {
  const [formData, setFormData] = useState({
    id: room?.id || '',
    room_number: room?.room_number || '',
    capacity: room?.capacity || 30,
    room_type: room?.room_type || 'classroom',
    building: room?.building || '',
    floor: room?.floor || 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="room_number">Room Number *</Label>
        <Input
          id="room_number"
          value={formData.room_number}
          onChange={(e) => setFormData(prev => ({ ...prev, room_number: e.target.value }))}
          placeholder="e.g., 101, LAB-A, AUDITORIUM-1"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="capacity">Capacity *</Label>
          <Input
            id="capacity"
            type="number"
            min="1"
            max="500"
            value={formData.capacity}
            onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="room_type">Room Type *</Label>
          <Select
            value={formData.room_type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, room_type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              {roomTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="building">Building</Label>
          <Input
            id="building"
            value={formData.building}
            onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
            placeholder="e.g., Main Block, Engineering Block"
          />
        </div>
        <div>
          <Label htmlFor="floor">Floor</Label>
          <Input
            id="floor"
            type="number"
            min="1"
            max="20"
            value={formData.floor}
            onChange={(e) => setFormData(prev => ({ ...prev, floor: parseInt(e.target.value) }))}
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
          Save Room
        </Button>
      </div>
    </form>
  );
}
