# Environment Setup Guide

This guide explains how to properly configure environment variables for the Gemini Timetable Pro application.

## Required Environment Variables

The application requires the following environment variables to function properly:

### Supabase Configuration
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/public key  
- `VITE_SUPABASE_PROJECT_ID`: Your Supabase project ID

### Google AI Configuration
- `VITE_GOOGLE_AI_API_KEY`: Your Google AI (Gemini) API key

## Setup Instructions

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Get Your Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 3. Configure Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project or create a new one
3. Go to Settings > API
4. Copy the following values:
   - Project URL → `VITE_SUPABASE_URL`
   - Project Reference ID → `VITE_SUPABASE_PROJECT_ID`
   - anon public key → `VITE_SUPABASE_PUBLISHABLE_KEY`

### 4. Update .env File
Edit your `.env` file with your actual values:

```env
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID="your_supabase_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
VITE_SUPABASE_URL="https://your_project_id.supabase.co"

# Google AI API Key for Gemini
VITE_GOOGLE_AI_API_KEY="your_google_ai_api_key_here"
```

### 5. Configure Supabase Edge Function Environment
For the AI timetable generation to work, you also need to set the Google AI API key in your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to Edge Functions > Settings
3. Add a new environment variable:
   - Name: `GOOGLE_AI_API_KEY`
   - Value: Your Google AI API key (same as above, but without the `VITE_` prefix)

## Security Best Practices

### ✅ DO:
- Keep your `.env` file in `.gitignore`
- Use different API keys for development and production
- Regularly rotate your API keys
- Monitor API usage in Google Cloud Console
- Use environment-specific configuration files

### ❌ DON'T:
- Commit API keys to version control
- Share API keys in plain text
- Use production keys in development
- Hard-code API keys in source code

## Verification

### Test Your Configuration
1. Start the development server: `npm run dev`
2. Go to Settings page in the application
3. The API key status should show as "valid" if properly configured
4. You can test the API key using the "Test" button

### Test Timetable Generation
1. Add some departments, sections, subjects, staff, and rooms
2. Go to Generate Timetable page
3. Select departments and semester
4. Click "Generate Timetables"
5. Check for success message and generated entries

## Troubleshooting

### Common Issues:

1. **"API key is invalid"**
   - Verify your Google AI API key is correct
   - Check if the API is enabled in Google Cloud Console
   - Ensure you have sufficient quota

2. **"Failed to fetch required data from database"**
   - Verify Supabase connection settings
   - Check if tables exist and have data
   - Verify RLS policies allow access

3. **"Environment variables not found"**
   - Ensure `.env` file exists in project root
   - Restart development server after changing `.env`
   - Check variable names match exactly (case-sensitive)

### Support
If you continue to have issues, check:
- [Supabase Documentation](https://supabase.com/docs)
- [Google AI Documentation](https://ai.google.dev/docs)
- Project issues on GitHub

## Production Deployment

For production deployment:

1. Set environment variables in your hosting platform
2. Use production Supabase project
3. Configure proper CORS settings
4. Monitor API usage and costs
5. Set up proper logging and error tracking
