@echo off
echo 🚀 Deploying Gemini Timetable Pro Edge Function...

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Supabase CLI not found. Installing...
    npm install -g @supabase/cli
)

REM Check if logged in
echo 🔐 Checking Supabase authentication...
supabase projects list >nul 2>&1
if errorlevel 1 (
    echo 🔑 Please log in to Supabase:
    supabase login
)

REM Link project if not already linked
echo 🔗 Linking to Supabase project...
supabase link --project-ref cjvoiyjpyjagfrxtispo

REM Deploy edge function
echo 📦 Deploying generate-timetable-ai edge function...
supabase functions deploy generate-timetable-ai

if errorlevel 0 (
    echo ✅ Edge function deployed successfully!
    echo 🔧 Don't forget to set your GOOGLE_AI_API_KEY environment variable in the Supabase dashboard.
    echo    Go to: Dashboard ^> Edge Functions ^> Environment Variables
    echo    Add: GOOGLE_AI_API_KEY = your_google_ai_api_key
    echo.
    echo 🌐 Your edge function is now available at:
    echo    https://cjvoiyjpyjagfrxtispo.supabase.co/functions/v1/generate-timetable-ai
) else (
    echo ❌ Deployment failed. Please check the error messages above.
    pause
    exit /b 1
)

pause
