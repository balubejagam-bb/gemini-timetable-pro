#!/bin/bash

echo "🚀 Deploying Gemini Timetable Pro Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g @supabase/cli
fi

# Check if logged in
echo "🔐 Checking Supabase authentication..."
supabase projects list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "🔑 Please log in to Supabase:"
    supabase login
fi

# Link project if not already linked
echo "🔗 Linking to Supabase project..."
supabase link --project-ref cjvoiyjpyjagfrxtispo

# Deploy edge function
echo "📦 Deploying generate-timetable-ai edge function..."
supabase functions deploy generate-timetable-ai

# Check deployment status
if [ $? -eq 0 ]; then
    echo "✅ Edge function deployed successfully!"
    echo "🔧 Don't forget to set your GOOGLE_AI_API_KEY environment variable in the Supabase dashboard."
    echo "   Go to: Dashboard > Edge Functions > Environment Variables"
    echo "   Add: GOOGLE_AI_API_KEY = your_google_ai_api_key"
    echo ""
    echo "🌐 Your edge function is now available at:"
    echo "   https://cjvoiyjpyjagfrxtispo.supabase.co/functions/v1/generate-timetable-ai"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
