# Supabase Edge Function Environment Setup

## The Issue
Your edge function is failing with: "Google AI API key not configured"

This means the `GOOGLE_AI_API_KEY` environment variable is not set in your Supabase project's edge function environment.

## Quick Fix Steps:

### 1. Set the Environment Variable in Supabase Dashboard
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (cjvoiyjpyjagfrxtispo)
3. Navigate to **Edge Functions** (in the left sidebar)
4. Click on **Settings** or **Environment Variables**
5. Add a new environment variable:
   - **Name**: `GOOGLE_AI_API_KEY`
   - **Value**: `AIzaSyDVGpwtC69A_xp58jGbvW3VWInG2FV_PQY`

### 2. Alternative: Use Supabase CLI
If you have Supabase CLI installed:

```bash
# Set the environment variable
supabase secrets set GOOGLE_AI_API_KEY=AIzaSyDVGpwtC69A_xp58jGbvW3VWInG2FV_PQY

# Redeploy the function
supabase functions deploy generate-timetable-ai
```

### 3. Verify the Setup
After setting the environment variable:
1. Try generating a timetable again
2. Check the edge function logs for any other errors
3. The function should now work correctly

## Important Notes:
- The edge function runs in Supabase's environment, not your local environment
- It needs its own separate environment variables
- Make sure to restart/redeploy the function after setting environment variables

## Environment Variables Needed in Supabase:
- `GOOGLE_AI_API_KEY`: Your Google AI API key
- `SUPABASE_URL`: Automatically available
- `SUPABASE_ANON_KEY`: Automatically available
