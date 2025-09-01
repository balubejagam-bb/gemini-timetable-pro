# 🔧 Edge Function Debug & Fix Guide

## Current Status: 500 Internal Server Error

Your edge function is returning a **500 error** which means there's an issue inside the function code, not with the infrastructure.

## 🚨 API Key Naming Consistency ✅ FIXED

Good news! I've confirmed that all API key references are now consistent:

- ✅ Edge function uses: `GOOGLE_AI_API_KEY`
- ✅ Environment files use: `GOOGLE_AI_API_KEY` 
- ✅ Documentation uses: `GOOGLE_AI_API_KEY`
- ✅ No more `GEMINI_API_KEY` confusion

## 🔍 Debugging Steps

### Step 1: Set Environment Variable in Supabase Dashboard

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select Project**: `cjvoiyjpyjagfrxtispo`
3. **Navigate**: Edge Functions → Settings → Environment Variables
4. **Add Variable**:
   ```
   Name: GOOGLE_AI_API_KEY
   Value: AIzaSyDVGpwtC69A_xp58jGbvW3VWInG2FV_PQY
   ```
5. **Save** the environment variable

### Step 2: Test the Function Again

After setting the environment variable, try generating a timetable again from your app.

### Step 3: Check Logs (if still failing)

#### Option A: Supabase Dashboard
1. Go to **Supabase Dashboard** → **Edge Functions** → **Logs**
2. Look for recent entries from `generate-timetable-ai`
3. Check for specific error messages

#### Option B: Install Supabase CLI (recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Get real-time logs
supabase functions logs generate-timetable-ai --project-ref cjvoiyjpyjagfrxtispo
```

## 🧪 Local Testing (Alternative)

If you want to test the function locally:

```bash
# Install Supabase CLI first
npm install -g supabase

# Start local Supabase
supabase start

# Serve the function locally
supabase functions serve generate-timetable-ai

# Test with curl (in another terminal)
curl -X POST http://localhost:54321/functions/v1/generate-timetable-ai \
  -H "Content-Type: application/json" \
  -d '{"selectedDepartments":["dept-id-here"],"selectedSemester":1}'
```

## 🔍 Most Likely Issues

Based on the 500 error, here are the most probable causes:

### 1. Missing Environment Variable ⭐ MOST LIKELY
- **Issue**: `GOOGLE_AI_API_KEY` not set in Supabase project
- **Solution**: Set it in Supabase Dashboard (Step 1 above)

### 2. Invalid JSON in Request
- **Issue**: Request body isn't valid JSON
- **Check**: Make sure your frontend is sending proper JSON

### 3. Database Connection Issues
- **Issue**: Supabase client configuration problem
- **Check**: Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are available

### 4. Google AI API Issues
- **Issue**: API key is invalid or quota exceeded
- **Check**: Test the API key in Google AI Studio

## 🛠️ Quick Verification Commands

### Test Environment Variable Availability
You can add this temporary debug endpoint to your edge function to check environment variables:

```typescript
// Add this to your edge function for debugging
if (req.url.includes('/debug')) {
  return new Response(JSON.stringify({
    hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
    hasSupabaseKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
    hasGoogleKey: !!Deno.env.get('GOOGLE_AI_API_KEY'),
    supabaseUrl: Deno.env.get('SUPABASE_URL')?.substring(0, 20) + '...',
  }), { headers: corsHeaders });
}
```

Then test: `POST https://cjvoiyjpyjagfrxtispo.supabase.co/functions/v1/generate-timetable-ai/debug`

## ⚡ Quick Fix Checklist

- [ ] Set `GOOGLE_AI_API_KEY` in Supabase Dashboard
- [ ] Verify API key is correct: `AIzaSyDVGpwtC69A_xp58jGbvW3VWInG2FV_PQY`
- [ ] Test timetable generation again
- [ ] Check edge function logs for any remaining errors
- [ ] Verify request format matches expected structure

## 📞 If Still Not Working

If the function still returns 500 after setting the environment variable:

1. **Check Browser Network Tab**: Look at the exact request/response
2. **Check Supabase Logs**: Get the specific error message
3. **Test API Key**: Verify it works in Google AI Studio
4. **Check Database**: Ensure you have test data (departments, subjects, etc.)

The environment variable is the most likely culprit - fix that first! 🎯
