# 🎓 Gemini Timetable Pro

An AI-powered university timetable management system that uses Google's Gemini AI for intelligent schedule generation with advanced conflict resolution and optimization algorithms.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technologies Used](#technologies-used)
- [Algorithms & Techniques](#algorithms--techniques)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Research Paper Content](#research-paper-content)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

Gemini Timetable Pro is an intelligent timetable management system designed for educational institutions, particularly universities. It automates the complex process of creating class schedules by leveraging artificial intelligence and optimization algorithms to generate conflict-free, balanced timetables that respect multiple constraints including faculty availability, room capacity, subject requirements, and institutional policies.

### Problem Statement

Manual timetable creation in universities is time-consuming, error-prone, and often results in:
- Scheduling conflicts (staff, rooms, sections)
- Uneven faculty workload distribution
- Inefficient room utilization
- Student schedule gaps
- Difficulty accommodating last-minute changes

### Solution

This system addresses these challenges through:
- **AI-Powered Generation**: Google Gemini AI models analyze all constraints and generate optimized schedules
- **Constraint Satisfaction**: Multiple algorithms ensure zero conflicts
- **Automatic Optimization**: Load balancing, room matching, and schedule optimization
- **Real-time Validation**: Database-level constraints prevent invalid entries
- **Flexible Configuration**: Support for multiple departments, semesters, and custom requirements

---

## ✨ Key Features

### 🤖 AI-Powered Timetable Generation
- **Google Gemini 1.5 Pro**: Primary AI model for intelligent schedule generation
- **Google Gemini 2.0 Flash**: Alternative model for faster generation
- **Prompt Engineering**: Sophisticated prompts that encode all constraints and optimization goals
- **JSON Response Parsing**: Structured output processing with validation

### 🎯 Advanced Conflict Resolution
- **Staff Conflict Detection**: Ensures no faculty member is double-booked
- **Room Conflict Prevention**: Prevents simultaneous room usage
- **Section Conflict Avoidance**: No overlapping classes for student sections
- **Database-Level Constraints**: Unique constraints enforce conflict-free schedules

### ⚙️ Optimization Algorithms
- **Constraint Satisfaction Problem (CSP)**:
  - Variables: Classes (section, subject, staff, room, day, time)
  - Domains: Available staff, rooms, time slots
  - Constraints: Uniqueness, capacity, availability
  
- **Greedy Heuristic Algorithm**:
  - Faculty workload balancing
  - Room type matching (lab vs classroom)
  - Minimum daily class enforcement
  - Gap minimization

- **Post-Processing Algorithms**:
  - Minimum daily load enforcement (3+ classes per day)
  - Conflict resolution and duplicate removal
  - Schedule validation and verification

### 📊 Data Management
- **CRUD Operations**: Complete management for departments, sections, subjects, staff, rooms
- **Relationship Management**: Staff-subject assignments, section-semester mapping
- **Real-time Updates**: Supabase real-time subscriptions for live data
- **Data Validation**: Type checking, constraint validation, referential integrity

### 🎨 User Interface
- **Modern React UI**: Built with React 18, TypeScript, and Tailwind CSS
- **shadcn/ui Components**: Professional, accessible UI components
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Interactive Timetable Views**: Visual representation of generated schedules
- **Advanced Filtering**: Multi-select options for fine-grained control

---

## 🛠️ Technologies Used

### Frontend Technologies
- **React 18.3.1**: Modern UI library with hooks and concurrent features
- **TypeScript 5.8.3**: Type-safe development
- **Vite 5.4.19**: Fast build tool and dev server
- **Tailwind CSS 3.4.17**: Utility-first CSS framework
- **shadcn/ui**: High-quality React component library
- **React Router DOM 6.30.1**: Client-side routing
- **React Hook Form 7.61.1**: Form state management
- **Zod 3.25.76**: Schema validation
- **TanStack Query 5.83.0**: Data fetching and caching
- **Recharts 2.15.4**: Data visualization
- **html2canvas 1.4.1**: Screenshot generation
- **jspdf 3.0.2**: PDF generation

### Backend & Database
- **Supabase**: Backend-as-a-Service platform
  - PostgreSQL database with real-time capabilities
  - Row Level Security (RLS) policies
  - Edge Functions (Deno runtime)
  - RESTful API auto-generated
  - Real-time subscriptions

### AI & APIs
- **Google Gemini 1.5 Pro**: Large language model for schedule generation
- **Google Gemini 2.0 Flash**: Faster alternative model
- **Google Generative AI API**: REST API for AI interactions

### Development Tools
- **ESLint**: Code linting
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing
- **TypeScript ESLint**: TypeScript-specific linting

### Deployment
- **Vercel**: Frontend hosting platform
- **Supabase Cloud**: Database and backend hosting
- **Git**: Version control

---

## 🔬 Algorithms & Techniques

### 1. AI-Powered Generation Algorithm

**Model**: Google Gemini 1.5 Pro / Gemini 2.0 Flash

**Process**:
```
Input Data Preparation → Prompt Engineering → AI Generation → JSON Parsing → Validation → Database Storage
```

**Key Components**:
- **Prompt Construction**: Dynamically builds comprehensive prompts with:
  - All entities (departments, sections, subjects, staff, rooms)
  - Constraints and rules
  - Optimization goals
  - Format specifications
  
- **Generation Config**:
  ```typescript
  {
    maxOutputTokens: 8192,
    temperature: 0.1,  // Low for deterministic output
    topK: 1,
    topP: 0.8
  }
  ```

- **Response Processing**:
  - JSON extraction using regex pattern matching
  - Structure validation
  - Type checking

### 2. Constraint Satisfaction Problem (CSP) Algorithm

**Problem Formulation**:
- **Variables**: Each timetable entry (section × subject × day × time)
- **Domains**: 
  - Staff: Available faculty for the subject
  - Rooms: Rooms matching subject type (lab/classroom)
  - Time Slots: Valid periods (1-5 for MBU format)
  - Days: Monday-Saturday (1-6)
  
- **Constraints**:
  1. **Uniqueness Constraints** (Database Level):
     - `UNIQUE(staff_id, day_of_week, time_slot)`
     - `UNIQUE(room_id, day_of_week, time_slot)`
     - `UNIQUE(section_id, day_of_week, time_slot)`
     
  2. **Logical Constraints**:
     - Staff must be authorized for subject (via `staff_subjects` table)
     - Lab subjects require lab-type rooms
     - Each subject must meet `hours_per_week` requirement
     - Staff workload ≤ `max_hours_per_week`
     - Room capacity must accommodate section size

**Algorithm Implementation**:
```typescript
// Conflict Detection Algorithm
function detectConflicts(entries: TimetableEntry[]): {
  staffConflicts: Conflict[],
  roomConflicts: Conflict[],
  sectionConflicts: Conflict[]
} {
  const staffSlots = new Map<string, TimetableEntry>();
  const roomSlots = new Map<string, TimetableEntry>();
  const sectionSlots = new Map<string, TimetableEntry>();
  
  // Track all assignments
  entries.forEach(entry => {
    const staffKey = `${entry.staff_id}:${entry.day_of_week}:${entry.time_slot}`;
    const roomKey = `${entry.room_id}:${entry.day_of_week}:${entry.time_slot}`;
    const sectionKey = `${entry.section_id}:${entry.day_of_week}:${entry.time_slot}`;
    
    // Check for conflicts
    if (staffSlots.has(staffKey)) { /* conflict */ }
    if (roomSlots.has(roomKey)) { /* conflict */ }
    if (sectionSlots.has(sectionKey)) { /* conflict */ }
    
    // Store if no conflict
    staffSlots.set(staffKey, entry);
    roomSlots.set(roomKey, entry);
    sectionSlots.set(sectionKey, entry);
  });
}
```

### 3. Greedy Heuristic Algorithm (Fallback Generator)

**Use Case**: Algorithm-based generation when AI is unavailable

**Algorithm**:
```
For each section:
  For each subject in section:
    Calculate required hours per week
    For each required hour:
      Find first available slot (day, time) where:
        - Staff available for subject
        - Room available and matches subject type
        - Section slot free
        - No conflicts
      Assign class to slot
      Mark slot as occupied
```

**Heuristics**:
1. **Room Type Matching**: Lab subjects → Lab rooms, Theory → Any room
2. **Faculty Authorization**: Only assign staff who can teach the subject
3. **Load Balancing**: Distribute workload evenly across staff
4. **Gap Minimization**: Fill empty slots to reduce gaps

### 4. Minimum Daily Load Enforcement Algorithm

**Goal**: Ensure each section has at least 3 classes per day (Monday-Saturday)

**Algorithm**:
```typescript
function enforceMinimumDailyClasses(
  entries: TimetableEntry[],
  sections: Section[],
  selectedSemester: number
): TimetableEntry[] {
  const MIN_PER_DAY = 3;
  const days = [1, 2, 3, 4, 5, 6]; // Monday to Saturday
  const timeSlots = [1, 2, 3, 4, 5];
  
  for (const section of sections) {
    for (const day of days) {
      const dayCount = entries.filter(
        e => e.section_id === section.id && e.day_of_week === day
      ).length;
      
      if (dayCount < MIN_PER_DAY) {
        const needed = MIN_PER_DAY - dayCount;
        // Fill remaining slots with available subjects
        fillSlots(section, day, needed, entries);
      }
    }
  }
}
```

**Strategy**:
- If a section has fewer than 3 classes on a day, add classes from subjects already in that section's schedule
- Prioritize subjects that need more hours
- Maintain all conflict constraints

### 5. Validation & Post-Processing Algorithm

**Multi-Stage Validation**:

1. **Basic Validation**:
   - Required fields present
   - Valid day (1-6), time slot (1-5)
   - Valid semester match
   
2. **Conflict Resolution**:
   - Remove duplicate assignments
   - Keep first occurrence of conflicts
   - Log removed entries
   
3. **Constraint Verification**:
   - Verify staff-subject relationships
   - Check room type compatibility
   - Validate time slot ranges

**Implementation**:
```typescript
function validateEntries(
  entries: TimetableEntry[],
  semester: number
): TimetableEntry[] {
  // Stage 1: Basic validation
  const validEntries = entries.filter(entry => 
    entry.section_id && 
    entry.subject_id && 
    entry.staff_id && 
    entry.room_id &&
    entry.day_of_week >= 1 && entry.day_of_week <= 6 &&
    entry.time_slot >= 1 && entry.time_slot <= 5 &&
    entry.semester === semester
  );
  
  // Stage 2: Conflict resolution
  const conflictFreeEntries: TimetableEntry[] = [];
  const usedSlots = {
    staff: new Set<string>(),
    room: new Set<string>(),
    section: new Set<string>()
  };
  
  validEntries.forEach(entry => {
    const keys = generateKeys(entry);
    if (!hasConflicts(keys, usedSlots)) {
      conflictFreeEntries.push(entry);
      markAsUsed(keys, usedSlots);
    }
  });
  
  return conflictFreeEntries;
}
```

### 6. Room Type Matching Algorithm

**Purpose**: Match subjects with appropriate rooms based on subject type

**Algorithm**:
```typescript
function findAppropriateRooms(
  subject: Subject,
  allRooms: Room[]
): Room[] {
  if (subject.subject_type === 'lab' || subject.subject_type === 'practical') {
    // Lab subjects require lab rooms
    return allRooms.filter(r => 
      r.room_type === 'lab' || r.room_type === 'practical'
    );
  } else {
    // Theory subjects can use any room type
    return allRooms;
  }
}
```

### 7. Faculty Workload Balancing Algorithm

**Goal**: Distribute teaching hours evenly among faculty

**Process**:
1. Track current hours per staff member
2. When assigning classes, prefer staff with fewer hours
3. Respect `max_hours_per_week` limit
4. Distribute across different time slots

**Implementation**:
```typescript
function selectBestStaff(
  eligibleStaff: Staff[],
  currentWorkload: Map<string, number>,
  maxHours: number
): Staff | null {
  // Sort by current workload (ascending)
  const sorted = eligibleStaff
    .filter(s => (currentWorkload.get(s.id) || 0) < s.max_hours_per_week)
    .sort((a, b) => 
      (currentWorkload.get(a.id) || 0) - (currentWorkload.get(b.id) || 0)
    );
  
  return sorted[0] || null;
}
```

### 8. Schedule Optimization Heuristics

**Optimization Goals**:
1. **Minimize Gaps**: Reduce free periods in student schedules
2. **Balance Distribution**: Spread subjects evenly across week
3. **Lab Session Spacing**: Avoid back-to-back lab sessions
4. **Faculty Travel Time**: Consider room locations (future enhancement)
5. **Student Preference**: Accommodate popular time slots (future enhancement)

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Dashboard│  │ Generate │  │  View    │  │ Settings │   │
│  │          │  │ Timetable│  │ Timetable│  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP/REST API
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   PostgreSQL │  │ Edge Functions│  │   Real-time  │     │
│  │   Database   │  │   (Deno)     │  │  Subscriptions│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ API Calls
                           │
┌──────────────────────────┴──────────────────────────────────┐
│              External AI Services                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │        Google Gemini AI API                        │    │
│  │  - Gemini 1.5 Pro (Primary)                        │    │
│  │  - Gemini 2.0 Flash (Alternative)                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Frontend collects generation parameters
2. **Data Fetching** → Supabase queries fetch all related entities
3. **AI Generation** → Google Gemini API generates schedule
4. **Validation** → Multiple validation algorithms check constraints
5. **Database Storage** → Valid entries saved to PostgreSQL
6. **Real-time Update** → Frontend receives updated timetable

### Component Architecture

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components
│   └── dashboard/      # Dashboard-specific components
├── pages/              # Route pages
│   ├── Dashboard.tsx
│   ├── GenerateTimetable.tsx
│   ├── TimetableView.tsx
│   └── ...
├── lib/                # Core business logic
│   ├── timetableGenerator.ts  # AI & Algorithm generators
│   ├── env.ts          # Environment configuration
│   └── utils.ts        # Utility functions
├── integrations/       # Third-party integrations
│   └── supabase/       # Supabase client & types
└── hooks/              # Custom React hooks
```

---

## 📦 Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase Account**: [https://supabase.com](https://supabase.com)
- **Google AI API Key**: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

### Step-by-Step Installation

1. **Clone the Repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd gemini-timetable-pro
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
   VITE_SUPABASE_PROJECT_ID="your_project_id"
   VITE_GOOGLE_AI_API_KEY="your_google_ai_api_key"
   ```

4. **Set Up Supabase Database**
   
   Run the migration files in order:
   ```bash
   # Using Supabase CLI
   supabase db reset
   
   # Or manually apply migrations via Supabase Dashboard
   # Go to SQL Editor and run each migration file
   ```

5. **Configure Supabase Edge Functions** (if using)
   
   In Supabase Dashboard:
   - Go to Edge Functions → Settings
   - Add environment variable: `GOOGLE_AI_API_KEY`

6. **Start Development Server**
   ```bash
   npm run dev
   ```

7. **Build for Production**
   ```bash
   npm run build
   npm run preview
   ```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous/public key | Yes |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID | Yes |
| `VITE_GOOGLE_AI_API_KEY` | Google AI API key | Yes |

### Database Configuration

The system uses PostgreSQL with the following key tables:
- `departments`: University departments
- `sections`: Student sections (linked to departments and semesters)
- `subjects`: Course subjects with hours per week
- `staff`: Faculty members with max hours per week
- `rooms`: Classrooms and labs with capacity and type
- `staff_subjects`: Many-to-many relationship (which staff can teach which subjects)
- `college_timings`: Day-wise timing configuration
- `timetables`: Generated schedule entries

### AI Model Configuration

**Primary Model**: Gemini 1.5 Pro
- Max Output Tokens: 8192
- Temperature: 0.1 (deterministic)
- Top-K: 1
- Top-P: 0.8

**Alternative Model**: Gemini 2.0 Flash
- Faster generation
- Lower cost
- Similar capabilities

---

## 🚀 Usage

### Generating a Timetable

1. **Navigate to Generate Timetable Page**
   - Select the semester (1-8)
   - Choose one or more departments
   - Optionally select specific sections, subjects, and staff (Advanced Mode)

2. **Click "Generate with AI"**
   - System fetches all related data
   - Calls Google Gemini AI API
   - Validates generated schedule
   - Saves to database

3. **View Results**
   - Go to Timetable View page
   - See generated schedule for each section
   - Export to PDF if needed

### Managing Data

- **Departments**: Add/edit university departments
- **Sections**: Create sections linked to departments and semesters
- **Subjects**: Add courses with hours per week and type (theory/lab)
- **Staff**: Add faculty members with max hours per week
- **Rooms**: Register classrooms and labs with capacity
- **Staff-Subject Assignment**: Map which staff can teach which subjects

### Advanced Features

- **Advanced Mode**: Select specific sections, subjects, and staff for fine-grained control
- **Database Diagnostic**: Check for data inconsistencies
- **Real-time Updates**: Changes reflect immediately across the application
- **Export Options**: Download timetables as PDF

---

## 📄 Research Paper Content

### Suggested Research Paper Structure

#### 1. **Title**
"AI-Powered Automated Timetable Generation System for Universities: A Hybrid Approach Using Constraint Satisfaction and Large Language Models"

#### 2. **Abstract**
- Problem statement: Manual timetable creation challenges
- Solution approach: AI + Algorithms hybrid system
- Key contributions: CSP solving with LLM, conflict resolution algorithms
- Results: Automated, conflict-free schedule generation

#### 3. **Introduction**
- Background: Timetable scheduling problem in educational institutions
- Problem complexity: NP-hard combinatorial optimization
- Existing solutions: Limitations of manual and algorithmic approaches
- Proposed solution: Hybrid AI-algorithmic approach

#### 4. **Literature Review**
- Constraint Satisfaction Problem (CSP) for timetabling
- Genetic Algorithms for schedule optimization
- Simulated Annealing approaches
- AI/ML applications in scheduling
- Large Language Models (LLMs) for structured output generation

#### 5. **Methodology**

##### 5.1 System Architecture
- Frontend-Backend separation
- Database design
- AI integration

##### 5.2 Constraint Modeling
- Variables: `(Section, Subject, Staff, Room, Day, Time)`
- Domain definitions
- Constraint types:
  - Uniqueness constraints
  - Capacity constraints
  - Authorization constraints
  - Temporal constraints

##### 5.3 AI-Powered Generation
- Prompt engineering for LLM
- Structured output generation (JSON)
- Temperature and token configuration
- Response parsing and validation

##### 5.4 Conflict Resolution Algorithms
- Staff conflict detection
- Room conflict prevention
- Section conflict avoidance
- Multi-stage validation pipeline

##### 5.5 Optimization Heuristics
- Greedy algorithm for fallback
- Faculty workload balancing
- Room type matching
- Minimum daily load enforcement
- Gap minimization

##### 5.6 Post-Processing
- Validation algorithms
- Conflict resolution
- Constraint verification
- Database insertion with error handling

#### 6. **Implementation Details**

##### 6.1 Technologies Used
- Frontend: React, TypeScript, Tailwind CSS
- Backend: Supabase (PostgreSQL)
- AI: Google Gemini 1.5 Pro / 2.0 Flash
- APIs: RESTful architecture

##### 6.2 Database Schema
- Entity-Relationship diagram
- Constraint definitions
- Index optimization

##### 6.3 Algorithm Pseudocode
- AI generation algorithm
- CSP solving algorithm
- Conflict resolution algorithm
- Validation algorithm

#### 7. **Experimental Results**

##### 7.1 Test Cases
- Small dataset (1 department, 5 sections, 10 subjects)
- Medium dataset (3 departments, 15 sections, 30 subjects)
- Large dataset (5+ departments, 30+ sections, 60+ subjects)

##### 7.2 Performance Metrics
- Generation time
- Conflict rate (before/after resolution)
- Faculty workload distribution
- Room utilization rate
- Schedule quality metrics

##### 7.3 Comparison
- AI-only vs Algorithm-only vs Hybrid approach
- Accuracy comparison
- Time complexity analysis
- Scalability evaluation

#### 8. **Discussion**
- Advantages of hybrid approach
- Limitations and challenges
- AI model selection rationale
- Constraint handling effectiveness
- Scalability considerations

#### 9. **Future Work**
- Multi-objective optimization
- Preference learning from user feedback
- Real-time schedule updates
- Mobile application
- Integration with Learning Management Systems (LMS)

#### 10. **Conclusion**
- Summary of contributions
- Key findings
- Impact on educational institutions

### Key Algorithms to Highlight in Research Paper

1. **Constraint Satisfaction Problem (CSP) Formulation**
   - Formal problem definition
   - Variable, domain, constraint modeling
   - Complexity analysis

2. **AI Prompt Engineering**
   - Prompt structure
   - Constraint encoding
   - JSON output format specification

3. **Multi-Stage Validation Pipeline**
   - Stage-by-stage validation process
   - Conflict detection algorithms
   - Resolution strategies

4. **Greedy Heuristic Algorithm**
   - Algorithm description
   - Heuristic selection criteria
   - Time complexity: O(n²) where n = number of classes

5. **Minimum Daily Load Enforcement**
   - Algorithm for gap filling
   - Constraint satisfaction during filling
   - Complexity: O(sections × days × time_slots)

### Research Contributions

1. **Novel Hybrid Approach**: Combining LLM with traditional algorithms
2. **Efficient Constraint Handling**: Multi-stage validation pipeline
3. **Real-World Application**: Production-ready system with Supabase integration
4. **Scalability**: Handles multiple departments and semesters
5. **Conflict-Free Guarantee**: Database-level constraints ensure validity

---

## 📁 Project Structure

```
gemini-timetable-pro/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── layout/        # Layout components
│   │   └── dashboard/     # Dashboard components
│   ├── pages/             # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── GenerateTimetable.tsx
│   │   ├── TimetableView.tsx
│   │   ├── Departments.tsx
│   │   ├── Sections.tsx
│   │   ├── Subjects.tsx
│   │   ├── Staff.tsx
│   │   └── Rooms.tsx
│   ├── lib/               # Core logic
│   │   ├── timetableGenerator.ts  # AI & Algorithm generators
│   │   ├── env.ts         # Environment config
│   │   └── utils.ts       # Utilities
│   ├── integrations/      # Third-party integrations
│   │   └── supabase/      # Supabase client
│   └── hooks/             # Custom React hooks
├── supabase/
│   ├── functions/         # Edge Functions
│   │   └── generate-timetable-ai/
│   └── migrations/        # Database migrations
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

---

## 🗄️ Database Schema

### Core Tables

#### departments
- `id` (UUID, Primary Key)
- `name` (TEXT, Unique)
- `code` (TEXT, Unique)
- `created_at`, `updated_at` (Timestamps)

#### sections
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `department_id` (UUID, Foreign Key → departments)
- `semester` (INTEGER, 1-8)
- Unique: `(name, department_id, semester)`

#### subjects
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `code` (TEXT, Unique)
- `credits` (INTEGER, default: 3)
- `hours_per_week` (INTEGER, default: 3)
- `department_id` (UUID, Foreign Key → departments)
- `semester` (INTEGER, 1-8)
- `subject_type` (TEXT: 'theory' | 'lab' | 'practical')

#### staff
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `email` (TEXT, Unique)
- `designation` (TEXT)
- `department_id` (UUID, Foreign Key → departments)
- `max_hours_per_week` (INTEGER, default: 20)

#### rooms
- `id` (UUID, Primary Key)
- `room_number` (TEXT, Unique)
- `capacity` (INTEGER)
- `room_type` (TEXT: 'classroom' | 'lab' | 'auditorium')
- `building` (TEXT, optional)
- `floor` (INTEGER, optional)

#### staff_subjects
- `id` (UUID, Primary Key)
- `staff_id` (UUID, Foreign Key → staff)
- `subject_id` (UUID, Foreign Key → subjects)
- Unique: `(staff_id, subject_id)`

#### college_timings
- `id` (UUID, Primary Key)
- `day_of_week` (INTEGER, 1-6: Mon-Sat)
- `start_time` (TIME)
- `end_time` (TIME)
- `break_start`, `break_end` (TIME, optional)
- `lunch_start`, `lunch_end` (TIME, optional)
- Unique: `day_of_week`

#### timetables
- `id` (UUID, Primary Key)
- `section_id` (UUID, Foreign Key → sections)
- `subject_id` (UUID, Foreign Key → subjects)
- `staff_id` (UUID, Foreign Key → staff)
- `room_id` (UUID, Foreign Key → rooms)
- `day_of_week` (INTEGER, 1-6)
- `time_slot` (INTEGER, 1-5)
- `semester` (INTEGER, 1-8)
- Unique Constraints:
  - `(section_id, day_of_week, time_slot)`
  - `(staff_id, day_of_week, time_slot)`
  - `(room_id, day_of_week, time_slot)`

### Indexes

- `idx_subjects_department_semester`: On `subjects(department_id, semester)`
- `idx_staff_subjects_staff_id`: On `staff_subjects(staff_id)`
- `idx_staff_subjects_subject_id`: On `staff_subjects(subject_id)`
- `idx_timetables_section_day_slot`: On `timetables(section_id, day_of_week, time_slot)`
- `idx_timetables_staff_day_slot`: On `timetables(staff_id, day_of_week, time_slot)`
- `idx_timetables_room_day_slot`: On `timetables(room_id, day_of_week, time_slot)`

---

## 📡 API Documentation

### Client-Side Generation API

#### `ClientTimetableGenerator.generateTimetable()`

**Purpose**: Generate timetable using AI

**Parameters**:
```typescript
{
  selectedDepartments: string[],
  selectedSemester: number,
  options?: {
    advancedMode?: boolean,
    sections?: string[],
    subjects?: string[],
    staff?: string[]
  }
}
```

**Returns**:
```typescript
{
  success: boolean,
  message: string,
  entriesCount?: number,
  totalGenerated?: number,
  error?: string
}
```

### Supabase Edge Function API

#### `POST /functions/v1/generate-timetable-ai`

**Request Body**:
```json
{
  "selectedDepartments": ["uuid1", "uuid2"],
  "selectedSemester": 1
}
```

**Response**:
```json
{
  "success": true,
  "message": "Timetable generated successfully",
  "entriesCount": 150,
  "totalGenerated": 150,
  "model": "gemini-1.5-pro",
  "sectionsProcessed": 10,
  "subjectsProcessed": 25
}
```

---

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Configure Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required variables

### Supabase Edge Functions Deployment

```bash
supabase functions deploy generate-timetable-ai
```

### Manual Deployment Steps

1. Build the project: `npm run build`
2. Deploy `dist/` folder to your hosting platform
3. Configure environment variables
4. Set up Supabase database (run migrations)
5. Deploy Edge Functions (if using)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit: `git commit -m 'Add feature'`
5. Push: `git push origin feature-name`
6. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint for code quality
- Write meaningful commit messages
- Update documentation for new features
- Test thoroughly before submitting PR

---

## 📄 License

This project is licensed under the MIT License.

---

## 🆘 Support

### Documentation
- [Environment Setup Guide](./ENVIRONMENT_SETUP.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Google AI Documentation](https://ai.google.dev/docs)

### Troubleshooting

**Issue**: AI generation fails
- **Solution**: Check Google AI API key in environment variables

**Issue**: Database connection errors
- **Solution**: Verify Supabase URL and keys in `.env` file

**Issue**: Timetable conflicts
- **Solution**: Run database diagnostic tool, check constraints

**Issue**: Build errors
- **Solution**: Run `npm install` to update dependencies

---

## 📞 Contact

For questions, issues, or contributions:
- Open an issue on GitHub
- Check the documentation files
- Review the code comments

---

## 🙏 Acknowledgments

- **Google Gemini AI**: For powerful LLM capabilities
- **Supabase**: For excellent backend infrastructure
- **shadcn/ui**: For beautiful UI components
- **React Team**: For the amazing framework
- **Open Source Community**: For inspiration and tools

---

**Built with ❤️ for educational institutions worldwide**
