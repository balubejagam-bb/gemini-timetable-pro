import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Edit2, Save, X, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TimetableSlot {
  subject: string;
  code: string;
  staff: string;
  room: string;
  type: string;
}

interface TimetableEditorProps {
  isOpen: boolean;
  onClose: () => void;
  day: string;
  timeSlot: string;
  initialData?: TimetableSlot | null;
  currentData?: TimetableSlot | null;
  onSave: (data: TimetableSlot) => void;
}

export function TimetableEditor({
  isOpen,
  onClose,
  day,
  timeSlot,
  initialData = null,
  currentData = null,
  onSave
}: TimetableEditorProps) {
  const dataToUse = initialData || currentData;
  const [editData, setEditData] = useState<TimetableSlot>(
    dataToUse || {
      subject: '',
      code: '',
      staff: '',
      room: '',
      type: 'theory'
    }
  );

  // Fetch data from database
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; code: string; department_id?: string }>>([]);
  const [staff, setStaff] = useState<Array<{ id: string; name: string; department_id?: string }>>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; room_number: string; capacity?: number }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // UI state
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // New entry states
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [showNewStaff, setShowNewStaff] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subjectsRes, staffRes, roomsRes, deptsRes] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('staff').select('*').order('name'),
        supabase.from('rooms').select('*').order('room_number'),
        supabase.from('departments').select('*').order('name')
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      if (roomsRes.data) setRooms(roomsRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data from database');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewSubject = async () => {
    if (!newSubjectName || !newSubjectCode) {
      toast.error('Please enter both subject name and code');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: newSubjectName,
          code: newSubjectCode,
          department_id: selectedDepartment || null,
          semester: 1, // Default semester
          subject_type: 'theory' // Use lowercase to match database constraint
        })
        .select()
        .single();

      if (error) throw error;

      setSubjects([...subjects, data]);
      setEditData({
        ...editData,
        subject: data.name,
        code: data.code
      });
      setShowNewSubject(false);
      setNewSubjectName('');
      setNewSubjectCode('');
      toast.success('New subject added successfully');
    } catch (error) {
      console.error('Error adding subject:', error);
      toast.error('Failed to add new subject');
    }
  };

  const handleAddNewStaff = async () => {
    if (!newStaffName) {
      toast.error('Please enter staff name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('staff')
        .insert({
          name: newStaffName,
          department_id: selectedDepartment || null,
          designation: 'Faculty' // Default designation
        })
        .select()
        .single();

      if (error) throw error;

      setStaff([...staff, data]);
      setEditData({
        ...editData,
        staff: data.name
      });
      setShowNewStaff(false);
      setNewStaffName('');
      toast.success('New staff added successfully');
    } catch (error) {
      console.error('Error adding staff:', error);
      toast.error('Failed to add new staff');
    }
  };

  const handleAddNewRoom = async () => {
    if (!newRoomNumber) {
      toast.error('Please enter room number');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          room_number: newRoomNumber,
          capacity: newRoomCapacity ? parseInt(newRoomCapacity) : 50, // Default capacity
          room_type: 'classroom' // Use lowercase to match database constraint ('classroom', 'lab', 'auditorium')
        })
        .select()
        .single();

      if (error) throw error;

      setRooms([...rooms, data]);
      setEditData({
        ...editData,
        room: data.room_number
      });
      setShowNewRoom(false);
      setNewRoomNumber('');
      setNewRoomCapacity('');
      toast.success('New room added successfully');
    } catch (error) {
      console.error('Error adding room:', error);
      toast.error('Failed to add new room');
    }
  };

  const predefinedOptions = [
    { value: 'LIBRARY', label: 'Library Period' },
    { value: 'INTERNSHIP', label: 'Internship' },
    { value: 'SEMINAR', label: 'Seminar' },
    { value: 'MENTORING', label: 'Mentoring' },
    { value: 'SPORTS', label: 'Sports/Physical Education' },
    { value: 'FREE', label: 'Free Period' }
  ];

  const handlePredefinedSelect = (option: typeof predefinedOptions[0]) => {
    setEditData({
      subject: option.label,
      code: option.value,
      staff: 'TBD',
      room: 'TBD',
      type: 'theory'
    });
  };

  const handleSubjectSelect = (subjectId: string) => {
    const selected = subjects.find(s => s.id === subjectId);
    if (selected) {
      setEditData({
        ...editData,
        subject: selected.name,
        code: selected.code
      });
      setSubjectOpen(false);
    }
  };

  const handleStaffSelect = (staffId: string) => {
    const selected = staff.find(s => s.id === staffId);
    if (selected) {
      setEditData({
        ...editData,
        staff: selected.name
      });
      setStaffOpen(false);
    }
  };

  const handleRoomSelect = (roomId: string) => {
    const selected = rooms.find(r => r.id === roomId);
    if (selected) {
      setEditData({
        ...editData,
        room: selected.room_number
      });
      setRoomOpen(false);
    }
  };

  const handleSave = () => {
    if (!editData.subject || !editData.code) {
      toast.error('Please select or enter a subject');
      return;
    }
    onSave(editData);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit2 className="w-5 h-5" />
              Edit Timetable Slot
            </DialogTitle>
            <DialogDescription className="text-sm">
              {day} • {timeSlot}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Quick Options Section */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Quick Select Predefined Periods
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {predefinedOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePredefinedSelect(option)}
                      className="justify-start h-auto py-2.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <span className="text-xs font-medium">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Entry Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Or Enter Custom Details
                </h3>
                
                {/* Two Column Layout for Landscape */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Subject Search */}
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium">
                        Subject <span className="text-destructive">*</span>
                      </Label>
                      <Popover open={subjectOpen} onOpenChange={setSubjectOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={subjectOpen}
                            className="w-full justify-between h-10 font-normal"
                          >
                            <span className="truncate">
                              {editData.subject || "Search and select subject..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Type to search..." className="h-9" />
                            <CommandList className="max-h-[300px]">
                              <CommandEmpty>
                                <div className="p-4 text-center">
                                  <p className="text-sm text-muted-foreground mb-3">No subject found</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setShowNewSubject(true);
                                      setSubjectOpen(false);
                                    }}
                                    className="gap-2"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Add New Subject
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup heading="Available Subjects">
                                {subjects.map((subject) => (
                                  <CommandItem
                                    key={subject.id}
                                    value={subject.name}
                                    onSelect={() => handleSubjectSelect(subject.id)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        editData.subject === subject.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col flex-1">
                                      <span className="font-medium">{subject.name}</span>
                                      <span className="text-xs text-muted-foreground">{subject.code}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setShowNewSubject(true);
                                    setSubjectOpen(false);
                                  }}
                                  className="cursor-pointer border-t"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add New Subject
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Subject Code (Auto-filled) */}
                    <div className="space-y-2">
                      <Label htmlFor="code" className="text-sm font-medium">
                        Subject Code
                      </Label>
                      <Input
                        id="code"
                        value={editData.code}
                        onChange={(e) => setEditData({ ...editData, code: e.target.value })}
                        placeholder="Auto-filled from subject"
                        className="h-10"
                      />
                      <p className="text-xs text-muted-foreground">Automatically filled when you select a subject</p>
                    </div>

                    {/* Subject Type */}
                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-sm font-medium">
                        Type <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={editData.type || 'theory'}
                        onValueChange={(value) => setEditData({ ...editData, type: value })}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="theory">Theory</SelectItem>
                          <SelectItem value="lab">Lab</SelectItem>
                          <SelectItem value="practical">Practical</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Select the type of class</p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Staff Search */}
                    <div className="space-y-2">
                      <Label htmlFor="staff" className="text-sm font-medium">
                        Staff / Faculty <span className="text-destructive">*</span>
                      </Label>
                      <Popover open={staffOpen} onOpenChange={setStaffOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={staffOpen}
                            className="w-full justify-between h-10 font-normal"
                          >
                            <span className="truncate">
                              {editData.staff || "Search and select staff..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Type to search..." className="h-9" />
                            <CommandList className="max-h-[300px]">
                              <CommandEmpty>
                                <div className="p-4 text-center">
                                  <p className="text-sm text-muted-foreground mb-3">No staff found</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setShowNewStaff(true);
                                      setStaffOpen(false);
                                    }}
                                    className="gap-2"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Add New Staff
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup heading="Available Staff">
                                {staff.map((s) => (
                                  <CommandItem
                                    key={s.id}
                                    value={s.name}
                                    onSelect={() => handleStaffSelect(s.id)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        editData.staff === s.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="font-medium">{s.name}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setShowNewStaff(true);
                                    setStaffOpen(false);
                                  }}
                                  className="cursor-pointer border-t"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add New Staff
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Room Search */}
                    <div className="space-y-2">
                      <Label htmlFor="room" className="text-sm font-medium">
                        Room / Venue <span className="text-destructive">*</span>
                      </Label>
                      <Popover open={roomOpen} onOpenChange={setRoomOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={roomOpen}
                            className="w-full justify-between h-10 font-normal"
                          >
                            <span className="truncate">
                              {editData.room || "Search and select room..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Type to search..." className="h-9" />
                            <CommandList className="max-h-[300px]">
                              <CommandEmpty>
                                <div className="p-4 text-center">
                                  <p className="text-sm text-muted-foreground mb-3">No room found</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setShowNewRoom(true);
                                      setRoomOpen(false);
                                    }}
                                    className="gap-2"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Add New Room
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup heading="Available Rooms">
                                {rooms.map((room) => (
                                  <CommandItem
                                    key={room.id}
                                    value={room.room_number}
                                    onSelect={() => handleRoomSelect(room.id)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        editData.room === room.room_number ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col flex-1">
                                      <span className="font-medium">{room.room_number}</span>
                                      {room.capacity && (
                                        <span className="text-xs text-muted-foreground">Capacity: {room.capacity}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setShowNewRoom(true);
                                    setRoomOpen(false);
                                  }}
                                  className="cursor-pointer border-t"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add New Room
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Tip:</strong> Can't find what you're looking for? Click "Add New" in any dropdown to create a new entry.
                </p>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <div className="flex gap-3 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSave}
                className="flex-1 sm:flex-none"
                disabled={!editData.subject || !editData.code}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Subject Dialog */}
      <Dialog open={showNewSubject} onOpenChange={setShowNewSubject}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Subject
            </DialogTitle>
            <DialogDescription>Enter the subject details to add to the database</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-subject-name" className="text-sm font-medium">
                Subject Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-subject-name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g., Data Structures and Algorithms"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-subject-code" className="text-sm font-medium">
                Subject Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-subject-code"
                value={newSubjectCode}
                onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                placeholder="e.g., CS201"
                className="h-10"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-subject-dept" className="text-sm font-medium">Department (Optional)</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSubject(false)}>Cancel</Button>
            <Button onClick={handleAddNewSubject} disabled={!newSubjectName || !newSubjectCode}>
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Staff Dialog */}
      <Dialog open={showNewStaff} onOpenChange={setShowNewStaff}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Staff Member
            </DialogTitle>
            <DialogDescription>Enter the staff member details to add to the database</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-staff-name" className="text-sm font-medium">
                Staff Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-staff-name"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="e.g., Dr. John Doe"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-staff-dept" className="text-sm font-medium">Department (Optional)</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewStaff(false)}>Cancel</Button>
            <Button onClick={handleAddNewStaff} disabled={!newStaffName}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Room Dialog */}
      <Dialog open={showNewRoom} onOpenChange={setShowNewRoom}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Room
            </DialogTitle>
            <DialogDescription>Enter the room details to add to the database</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-room-number" className="text-sm font-medium">
                Room Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-room-number"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value.toUpperCase())}
                placeholder="e.g., A-101, LAB-3, AUDITORIUM"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-room-capacity" className="text-sm font-medium">Capacity (Optional)</Label>
              <Input
                id="new-room-capacity"
                type="number"
                value={newRoomCapacity}
                onChange={(e) => setNewRoomCapacity(e.target.value)}
                placeholder="e.g., 60"
                className="h-10"
                min="1"
                max="500"
              />
              <p className="text-xs text-muted-foreground">Maximum number of students the room can accommodate</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRoom(false)}>Cancel</Button>
            <Button onClick={handleAddNewRoom} disabled={!newRoomNumber}>
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
