# University Timetable Template Implementation

## Overview
Implemented professional university timetable format matching Mohan Babu University's official template style.

## Template Features

### 1. **Professional Header**
- University logo placeholder (MBU)
- University name: "MOHAN BABU UNIVERSITY"
- Location: "Sree Sainath Nagar, A. Rangampet-517102"
- School/Department name
- Page numbering in top-right corner

### 2. **Timetable Information Section**
- Title: "SCHOOL OF COMPUTING"
- Subtitle: Department name
- Academic year: "CLASS WORK TIME TABLE (2025-26)"
- Semester information
- Room number
- Effective date (W.E.F.)

### 3. **Timetable Grid**
- **Days**: MON, TUE, WED, THU, FRI
- **Time Slots**:
  - 08:00AM TO 08:55AM
  - 08:55AM TO 09:50AM
  - 10:15AM TO 11:10AM
  - 11:10AM TO 12:05PM
  - 12:05PM TO 01:00PM
- **Break Period**: Highlighted in gray
- **Subject Cells**: Color-coded with:
  - Subject code (bold)
  - Subject type (LAB/Theory)
  - Consistent colors per subject
  - Lab subjects highlighted in green

### 4. **Subject Legend Table**
- Three columns:
  - SUBJECT CODE
  - SUBJECT NAME
  - FACULTY NAME
- All subjects used in the timetable listed
- Professional border styling

## Files Created

### `/src/components/TimetableTemplate.tsx`
- React component for university timetable template
- Props interface for customization
- Color-coding logic for subjects
- Responsive A4 page layout

### `/src/components/TimetableTemplate.css`
- External CSS for A4 page sizing
- Column width definitions
- Prevents inline style lint warnings

## Integration Points

### 1. **TimetableView.tsx**
- Added "University Format" checkbox toggle
- `handleDownloadSectionTimetable()` updated with template export
- `exportWithUniversityTemplate()` function for section timetables
- Uses React DOM createRoot for template rendering
- html2canvas for PDF generation

### 2. **Students.tsx**
- `handleDownloadTimetable()` updated for student timetables
- Renders individual student information
- Converts student timetable JSON to template format
- Includes subject legend from student schedule

## Usage

### For Section Timetables (View Timetables Page)
1. Enable "University Format" checkbox
2. Click "Download" button on any section timetable
3. PDF generated in official university format

### For Student Timetables (Students Page)
1. Click "Download" button on student card
2. Automatically uses university template
3. Includes student name and roll number

## Template Customization

### Modify Header Information
```tsx
<TimetableTemplate
  title="SCHOOL OF COMPUTING"           // Main title
  subtitle="DEPARTMENT NAME"            // Department
  department="Computer Science"         // Dept details
  semester="VII Semester (DS-2)"        // Semester info
  section="Section A"                   // Section name
  roomNo="611"                          // Room number
  effectiveDate="28.07.2025"           // Effective date
  schedule={scheduleData}               // Timetable data
  subjects={subjectsArray}              // Subject legend
  pageNumber={1}                        // Page number
/>
```

### Schedule Data Format
```typescript
{
  "Monday": {
    "9:00-10:00": {
      subject: "Data Analytics",
      code: "DA",
      staff: "Ms. Ch Prathima",
      room: "611",
      type: "Theory"
    },
    // ... more slots
  },
  // ... other days
}
```

### Subject Legend Format
```typescript
[
  {
    code: "DV",
    name: "Data Visualization",
    faculty: "Ms. Chengamma Chitteti"
  },
  // ... more subjects
]
```

## PDF Export Process

1. **Template Rendering**:
   - Create temporary div element off-screen
   - Use React createRoot to render template
   - Wait 500ms for complete rendering

2. **Capture**:
   - html2canvas captures rendered template
   - Scale: 2x for high quality
   - A4 dimensions: 794x1123 pixels (96 DPI)

3. **PDF Generation**:
   - jsPDF in portrait mode
   - A4 paper size (210mm x 297mm)
   - Image inserted at full page size

4. **Cleanup**:
   - Unmount React component
   - Remove temporary DOM element

## Color Scheme

- **Header**: Red (#DC2626) for university name
- **Borders**: Black (4px for outer, 2px for inner)
- **Background**: 
  - Gray-300 for headers
  - Gray-200 for row labels
  - Gray-100 for info section
  - Gray-400 for break periods
- **Subject Cells**: Auto-generated light colors
- **Lab Highlight**: Light green (#C8E6C9)

## Benefits

✅ **Professional Appearance** - Matches official university format
✅ **Brand Consistency** - University header on every timetable
✅ **Clear Layout** - Well-structured grid with borders
✅ **Subject Legend** - Complete reference table included
✅ **Print-Ready** - A4 size, high-resolution PDF
✅ **Color-Coded** - Easy visual identification of subjects
✅ **Flexible** - Works for both section and student timetables

## Future Enhancements

- [ ] Add actual university logo image
- [ ] Make colors configurable per department
- [ ] Support for multi-page timetables
- [ ] Add signatures section at bottom
- [ ] Configurable time slots per institution
- [ ] Support for custom header text
- [ ] Export in multiple formats (PNG, JPEG, PDF)
- [ ] Batch export with template

## Notes

- Template uses inline styles for PDF generation (required for html2canvas)
- CSS file created to handle column widths
- React 18+ required for createRoot API
- Temporary DOM manipulation needed for off-screen rendering
