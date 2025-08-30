import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, MapPin, Plus, Edit, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Rooms() {
  const [rooms] = useState([
    { id: 1, number: "101", building: "A Block", floor: 1, capacity: 60, type: "Classroom", features: ["Projector", "AC", "Whiteboard"] },
    { id: 2, number: "102", building: "A Block", floor: 1, capacity: 60, type: "Classroom", features: ["Projector", "AC", "Whiteboard"] },
    { id: 3, number: "103", building: "A Block", floor: 1, capacity: 40, type: "Lab", features: ["Computers", "AC", "Network"] },
    { id: 4, number: "201", building: "A Block", floor: 2, capacity: 80, type: "Classroom", features: ["Projector", "AC", "Audio System"] },
    { id: 5, number: "202", building: "A Block", floor: 2, capacity: 60, type: "Classroom", features: ["Smart Board", "AC"] },
    { id: 6, number: "203", building: "A Block", floor: 2, capacity: 30, type: "Lab", features: ["Computers", "AC", "Software"] },
    { id: 7, number: "301", building: "A Block", floor: 3, capacity: 100, type: "Seminar Hall", features: ["Projector", "AC", "Audio System", "Stage"] },
    { id: 8, number: "B101", building: "B Block", floor: 1, capacity: 45, type: "Classroom", features: ["Projector", "AC"] },
    { id: 9, number: "B102", building: "B Block", floor: 1, capacity: 50, type: "Lab", features: ["Equipment", "AC", "Safety"] },
    { id: 10, number: "B201", building: "B Block", floor: 2, capacity: 35, type: "Tutorial Room", features: ["Whiteboard", "AC"] },
    { id: 11, number: "C101", building: "C Block", floor: 1, capacity: 120, type: "Auditorium", features: ["Stage", "Audio System", "Lighting", "AC"] },
    { id: 12, number: "C102", building: "C Block", floor: 1, capacity: 25, type: "Conference Room", features: ["Projector", "AC", "Video Conferencing"] },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const { toast } = useToast();

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.building.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || room.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "File Uploaded",
        description: `${file.name} uploaded successfully. Processing rooms data...`,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">
            Manage classrooms and facilities at Mohan Babu University
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="room-upload"
            />
            <label htmlFor="room-upload" className="flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload CSV/Excel
            </label>
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Room
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                All Rooms ({filteredRooms.length})
              </CardTitle>
              <CardDescription>
                Complete list of rooms and facilities
              </CardDescription>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Classroom">Classroom</SelectItem>
                    <SelectItem value="Lab">Laboratory</SelectItem>
                    <SelectItem value="Seminar Hall">Seminar Hall</SelectItem>
                    <SelectItem value="Auditorium">Auditorium</SelectItem>
                    <SelectItem value="Tutorial Room">Tutorial Room</SelectItem>
                    <SelectItem value="Conference Room">Conference Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">Room {room.number}</h3>
                        <p className="text-sm text-muted-foreground">
                          {room.building} • Floor {room.floor}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{room.type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Capacity:</span>
                        <span className="font-medium">{room.capacity} seats</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Features:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {room.features.map((feature, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
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
              <CardTitle>Add New Room</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="room-number">Room Number</Label>
                <Input id="room-number" placeholder="e.g., 101" />
              </div>
              <div>
                <Label htmlFor="building">Building</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A Block">A Block</SelectItem>
                    <SelectItem value="B Block">B Block</SelectItem>
                    <SelectItem value="C Block">C Block</SelectItem>
                    <SelectItem value="D Block">D Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="floor">Floor</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Ground Floor</SelectItem>
                    <SelectItem value="1">First Floor</SelectItem>
                    <SelectItem value="2">Second Floor</SelectItem>
                    <SelectItem value="3">Third Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" type="number" placeholder="e.g., 60" />
              </div>
              <div>
                <Label htmlFor="room-type">Room Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Classroom">Classroom</SelectItem>
                    <SelectItem value="Lab">Laboratory</SelectItem>
                    <SelectItem value="Seminar Hall">Seminar Hall</SelectItem>
                    <SelectItem value="Auditorium">Auditorium</SelectItem>
                    <SelectItem value="Tutorial Room">Tutorial Room</SelectItem>
                    <SelectItem value="Conference Room">Conference Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Add Room</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}