# Gemini Timetable Pro - Setup Instructions

This project has been completely fixed and enhanced to work with Google's Gemini AI for intelligent timetable generation. Here's what was fixed and how to set it up:

## 🔧 Issues Fixed

1. **Updated Gemini AI Model**: Changed from experimental `gemini-2.0-flash-exp` to stable `gemini-1.5-pro`
2. **Improved Token Limits**: Reduced `maxOutputTokens` from 40000 to 8192 for better reliability  
3. **Enhanced Prompt Engineering**: Complete rewrite of AI prompt for better timetable generation
4. **Staff-Subject Relationships**: Added proper mapping between staff and subjects they can teach
5. **Better Error Handling**: Enhanced CORS, error handling, and logging in edge function
6. **Real Data Integration**: Updated TimetableView to fetch and display actual data from Supabase
7. **Safety Settings**: Added content filtering for AI responses
8. **Sample Data**: Created comprehensive seed data for testing

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Go to your Supabase Dashboard
4. Navigate to **Edge Functions > Environment Variables**
5. Add a new variable:
   - **Name**: `GOOGLE_AI_API_KEY`
   - **Value**: Your Google AI API key

### 3. Populate Sample Data
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the content from `sample_data.sql` file in this project
4. This will create sample departments, sections, subjects, staff, and rooms

### 4. Deploy Edge Functions
```bash
# Install Supabase CLI if you haven't already
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref cjvoiyjpyjagfrxtispo

# Deploy the edge function
supabase functions deploy generate-timetable-ai
```

### 5. Run the Project
```bash
npm run dev
```

## 🎯 How to Use

1. **Add Data**: First, populate your database with:
   - Departments (use the Departments page)
   - Sections (use the Sections page)
   - Subjects (use the Subjects page)
   - Staff (use the Staff page)  
   - Rooms (use the Rooms page)

2. **Generate Timetable**:
   - Go to the "Generate Timetable" page
   - Select semester and departments
   - Click "Generate Timetables"
   - The AI will create optimized schedules considering:
     - Staff availability and expertise
     - Room capacity and type (lab vs classroom)
     - No scheduling conflicts
     - Balanced workload distribution

3. **View Timetables**:
   - Go to the "Timetable View" page
   - Select department, section, and semester
   - View the generated timetable with real data

## 🤖 AI Features

The enhanced Gemini AI integration now includes:
- **Conflict Resolution**: No staff or room double-booking
- **Smart Room Assignment**: Labs for lab subjects, classrooms for theory
- **Workload Balancing**: Respects faculty maximum hours per week
- **Subject Distribution**: Spreads classes evenly across the week
- **Staff-Subject Matching**: Only assigns qualified staff to subjects
- **Break Time Awareness**: Considers college timing constraints

## 🔍 Testing

Use the provided sample data to test the system:
- **Departments**: CSE, ECE, MECH, CIVIL
- **Staff**: 5 sample faculty members with subject specializations
- **Subjects**: Mix of theory and lab subjects with different hours per week
- **Rooms**: Various classroom and lab types

## 🛠️ Environment Variables

Make sure these are set:
- `VITE_SUPABASE_URL`: Your Supabase URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon key
- `GOOGLE_AI_API_KEY`: Your Google AI API key (set in Supabase Edge Functions)

## 📝 Notes

- The system now uses Gemini 1.5 Pro for maximum reliability
- All database operations are properly handled with error logging
- The UI displays real-time data from your Supabase database
- Edge functions include proper CORS headers for cross-origin requests
- Sample data includes realistic university course structure

Your timetable generation system is now fully functional with AI-powered optimization!
