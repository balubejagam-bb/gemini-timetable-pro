@echo off
setlocal enabledelayedexpansion

echo 🧪 Testing Gemini Timetable Pro Setup...
echo ========================================

rem Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found!
    echo    Please copy .env.example to .env and configure your API keys
    echo    Run: copy .env.example .env
    pause
    exit /b 1
) else (
    echo ✅ .env file found
)

rem Load environment variables from .env file
for /f "delims== tokens=1,2" %%a in (.env) do (
    set "%%a=%%b"
)

echo.
echo 🔍 Checking Environment Variables...
echo -----------------------------------

set missing_vars=0

if "!VITE_SUPABASE_URL!"=="" (
    echo ❌ VITE_SUPABASE_URL is not set
    set missing_vars=1
) else (
    echo ✅ VITE_SUPABASE_URL is configured
)

if "!VITE_SUPABASE_PUBLISHABLE_KEY!"=="" (
    echo ❌ VITE_SUPABASE_PUBLISHABLE_KEY is not set
    set missing_vars=1
) else (
    echo ✅ VITE_SUPABASE_PUBLISHABLE_KEY is configured
)

if "!VITE_SUPABASE_PROJECT_ID!"=="" (
    echo ❌ VITE_SUPABASE_PROJECT_ID is not set
    set missing_vars=1
) else (
    echo ✅ VITE_SUPABASE_PROJECT_ID is configured
)

if "!VITE_GOOGLE_AI_API_KEY!"=="" (
    echo ❌ VITE_GOOGLE_AI_API_KEY is not set
    set missing_vars=1
) else (
    echo ✅ VITE_GOOGLE_AI_API_KEY is configured
)

if %missing_vars%==1 (
    echo.
    echo ❌ Some required environment variables are missing
    echo Please configure these variables in your .env file
    echo See ENVIRONMENT_SETUP.md for detailed instructions
    pause
    exit /b 1
)

echo.
echo 📋 Setup Summary
echo ----------------
echo ✅ All environment variables are configured
echo ✅ Ready to start development server
echo.
echo Next steps:
echo 1. Run 'npm install' to install dependencies
echo 2. Run 'npm run dev' to start the development server
echo 3. Visit the Settings page to verify API key status
echo 4. Add university data (departments, staff, etc.)
echo 5. Generate your first timetable!
echo.
echo 🔗 Helpful Links:
echo - Google AI Studio: https://makersuite.google.com/app/apikey
echo - Supabase Dashboard: https://supabase.com/dashboard
echo - Setup Guide: ./ENVIRONMENT_SETUP.md

pause
