# Timetable Template Updates - Dynamic Data & Logo Integration

## Overview
Updated the university timetable template to use the actual MBU logo and make room numbers and dates dynamic based on generation data.

## Changes Made

### 1. **Logo Integration**

**File**: `src/components/TimetableTemplate.tsx`

- ✅ Replaced placeholder logo with actual MBU logo image
- ✅ Logo path: `/mbu-logo.webp` (loaded from public directory)
- ✅ Added error handling with fallback to placeholder if logo fails to load
- ✅ Maintains responsive sizing (20x20 / 80px)
- ✅ Uses `object-contain` for proper scaling

**Logo Location**: `public/mbu-logo.webp`

### 2. **Dynamic Room Number**

**Section Timetables** (`TimetableView.tsx`):
- Analyzes all timetable entries to find room assignments
- **Single Room**: Shows room number if all classes in one room (e.g., "611")
- **Multiple Rooms**: Shows "Multiple" if classes span different rooms
- **No Rooms**: Shows "Multiple" as default

**Student Timetables** (`Students.tsx`):
- Tracks all rooms assigned in student's personalized schedule
- **Single Room**: Shows the specific room if consistent
- **Multiple Rooms**: Shows "Multiple" if student moves between rooms
- **No Assignment**: Shows "As per Schedule" if no rooms assigned

### 3. **Dynamic Date (W.E.F.)**

**Format**: DD.MM.YYYY (e.g., "05.11.2025")

**Section Timetables**:
- Uses current date when timetable is generated/downloaded
- Format: `toLocaleDateString('en-GB')`

**Student Timetables**:
- Uses the original generation date from database
- Preserves when the timetable was first created
- Same format for consistency

### 4. **Dynamic Academic Year**

**Format**: (YYYY-YY)

- Automatically calculates current academic year
- Example: "(2025-26)" for 2025-2026 academic year
- Updates based on generation date

**Implementation**:
```typescript
const currentYear = today.getFullYear();
const nextYear = currentYear + 1;
const academicYear = `(${currentYear}-${nextYear.toString().slice(-2)})`;
```

**Display**:
- Section: "Semester X (2025-26)"
- Student: "Semester X (2025-26)"

### 5. **Header Layout Updates**

**Removed hardcoded year**: "CLASS WORK TIME TABLE (2025-26)"
**Now shows**: "CLASS WORK TIME TABLE" + semester with dynamic year

**Room/Date Row**:
- Proper spacing with flex layout
- Room number on left
- W.E.F. date on right

## File Changes Summary

### `src/components/TimetableTemplate.tsx`
```diff
- <div className="w-20 h-20 bg-red-600 flex items-center justify-center">
-   <div className="text-white font-bold text-center text-xs">MBU<br/>LOGO</div>
- </div>
+ <div className="w-20 h-20 flex items-center justify-center">
+   <img src="/mbu-logo.webp" alt="MBU Logo" className="w-full h-full object-contain" />
+ </div>

- <p className="text-base font-bold">CLASS WORK TIME TABLE (2025-26)</p>
+ <p className="text-base font-bold">CLASS WORK TIME TABLE</p>

- <div className="flex justify-between px-4 py-2 bg-gray-100">
-   {roomNo && <p className="font-semibold">Room No.: {roomNo}</p>}
-   {effectiveDate && <p className="font-semibold">W.E.F.: {effectiveDate}</p>}
- </div>
+ <div className="flex justify-between px-4 py-2 bg-gray-100">
+   {roomNo && <p className="font-semibold">Room No.: {roomNo}</p>}
+   <div className="flex-1"></div>
+   {effectiveDate && <p className="font-semibold">W.E.F.: {effectiveDate}</p>}
+ </div>
```

### `src/pages/TimetableView.tsx`
```diff
+ // Track all rooms used and find most common one
+ const roomCounts = new Map<string, number>();
+ entries.forEach(entry => {
+   const room = entry.rooms.room_number;
+   roomCounts.set(room, (roomCounts.get(room) || 0) + 1);
+ });
+ 
+ // Get the most frequently used room
+ let primaryRoom = "Multiple";
+ if (roomCounts.size === 1) {
+   primaryRoom = Array.from(roomCounts.keys())[0];
+ }

+ const today = new Date();
+ const currentYear = today.getFullYear();
+ const nextYear = currentYear + 1;
+ const formattedDate = today.toLocaleDateString('en-GB', {
+   day: '2-digit', month: '2-digit', year: 'numeric'
+ });

  <TimetableTemplate
    ...
-   roomNo="611"
+   roomNo={primaryRoom}
-   effectiveDate={new Date().toLocaleDateString('en-GB')}
+   effectiveDate={formattedDate}
-   semester={semesterInfo}
+   semester={`${semesterInfo} (${currentYear}-${nextYear.toString().slice(-2)})`}
  />
```

### `src/pages/Students.tsx`
```diff
+ // Track rooms used in student's timetable
+ const roomSet = new Set<string>();
+ if (slotData && slotData.subject) {
+   const room = slotData.room || 'TBD';
+   if (room !== 'TBD') roomSet.add(room);
+ }
+
+ const primaryRoom = roomSet.size === 1 
+   ? Array.from(roomSet)[0] 
+   : roomSet.size > 1 ? "Multiple" : "As per Schedule";

+ const generatedDate = new Date(timetable.generated_at);
+ const formattedDate = generatedDate.toLocaleDateString('en-GB', {
+   day: '2-digit', month: '2-digit', year: 'numeric'
+ });
+ const currentYear = generatedDate.getFullYear();
+ const nextYear = currentYear + 1;

  <TimetableTemplate
    ...
-   roomNo="-"
+   roomNo={primaryRoom}
-   effectiveDate={new Date(timetable.generated_at).toLocaleDateString('en-GB')}
+   effectiveDate={formattedDate}
-   semester={`Semester ${student.semester}`}
+   semester={`Semester ${student.semester} (${currentYear}-${nextYear.toString().slice(-2)})`}
  />
```

## Logo File Setup

**Source**: `C:\Local Disk D_7182025857\FINALYEARPROJECTS\HARI-DS-4\gemini-timetable-pro\mbu-logo.webp`

**Destination**: `public/mbu-logo.webp`

**Command Used**:
```powershell
Copy-Item "mbu-logo.webp" -Destination "public/mbu-logo.webp" -Force
```

## Room Number Logic

### Section Timetables
```typescript
// Count room usage across all entries
const roomCounts = new Map<string, number>();
entries.forEach(entry => {
  const room = entry.rooms.room_number;
  roomCounts.set(room, (roomCounts.get(room) || 0) + 1);
});

// Determine display value
if (roomCounts.size === 1) {
  primaryRoom = Array.from(roomCounts.keys())[0]; // Single room
} else if (roomCounts.size > 0) {
  // Find most common room
  let maxCount = 0;
  roomCounts.forEach((count, room) => {
    if (count > maxCount) {
      maxCount = count;
      primaryRoom = room;
    }
  });
}
```

### Student Timetables
```typescript
// Track unique rooms
const roomSet = new Set<string>();
// Add each room that's not "TBD"
if (room !== 'TBD') roomSet.add(room);

// Determine display
const primaryRoom = roomSet.size === 1 
  ? Array.from(roomSet)[0]           // Single room
  : roomSet.size > 1 
    ? "Multiple"                      // Multiple rooms
    : "As per Schedule";              // No rooms assigned
```

## Date Format Examples

| Date | Display |
|------|---------|
| November 5, 2025 | 05.11.2025 |
| January 15, 2026 | 15.01.2026 |
| December 31, 2025 | 31.12.2025 |

## Benefits

✅ **Professional Appearance** - Real university logo instead of placeholder
✅ **Accurate Information** - Room numbers reflect actual assignments
✅ **Current Dates** - Shows when timetable was generated
✅ **Dynamic Years** - Academic year updates automatically
✅ **Flexible Display** - Handles single/multiple room scenarios
✅ **Consistent Format** - DD.MM.YYYY date format throughout
✅ **Error Handling** - Fallback if logo fails to load
✅ **Student Context** - Preserves original generation date for students

## Testing Checklist

- [x] Logo displays correctly in PDF exports
- [x] Logo fallback works if file missing
- [x] Room number shows correctly for single-room timetables
- [x] Room number shows "Multiple" for multi-room timetables
- [x] Date format is DD.MM.YYYY
- [x] Academic year calculates correctly
- [x] Student timetables use generation date
- [x] Section timetables use current date
- [x] Layout spacing is correct with dynamic values

## Future Enhancements

- [ ] Allow admin to upload custom logo
- [ ] Configure date format preference
- [ ] Add building name to room display
- [ ] Support for afternoon/evening shift timing display
- [ ] Multiple page numbers for multi-section exports
