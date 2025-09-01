#!/bin/bash

# Test script for Gemini Timetable Pro setup
# This script verifies that all required environment variables and services are properly configured

echo "🧪 Testing Gemini Timetable Pro Setup..."
echo "========================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "   Please copy .env.example to .env and configure your API keys"
    echo "   Run: cp .env.example .env"
    exit 1
else
    echo "✅ .env file found"
fi

# Source the .env file
set -o allexport
source .env
set +o allexport

# Check required environment variables
echo ""
echo "🔍 Checking Environment Variables..."
echo "-----------------------------------"

required_vars=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_PUBLISHABLE_KEY" 
    "VITE_SUPABASE_PROJECT_ID"
    "VITE_GOOGLE_AI_API_KEY"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ $var is not set"
        missing_vars+=("$var")
    else
        echo "✅ $var is configured"
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo ""
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${missing_vars[@]}"
    echo ""
    echo "Please configure these variables in your .env file"
    echo "See ENVIRONMENT_SETUP.md for detailed instructions"
    exit 1
fi

echo ""
echo "🔗 Testing API Connections..."
echo "-----------------------------"

# Test Google AI API
if [ -n "$VITE_GOOGLE_AI_API_KEY" ]; then
    echo "Testing Google AI API..."
    
    response=$(curl -s -X POST \
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=$VITE_GOOGLE_AI_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "contents": [{"parts": [{"text": "Hello"}]}],
            "generationConfig": {"maxOutputTokens": 10}
        }')
    
    if echo "$response" | grep -q "candidates"; then
        echo "✅ Google AI API is working correctly"
    else
        echo "❌ Google AI API test failed"
        echo "   Response: $response"
        echo "   Please check your API key and ensure you have access to Gemini models"
    fi
else
    echo "⚠️  Skipping Google AI API test (no API key configured)"
fi

# Test Supabase connection  
if [ -n "$VITE_SUPABASE_URL" ] && [ -n "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo "Testing Supabase connection..."
    
    response=$(curl -s -X GET \
        "$VITE_SUPABASE_URL/rest/v1/" \
        -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
        -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY")
    
    if echo "$response" | grep -q "swagger"; then
        echo "✅ Supabase connection is working correctly"
    else
        echo "❌ Supabase connection test failed"
        echo "   Please check your Supabase URL and API key"
    fi
else
    echo "⚠️  Skipping Supabase test (configuration incomplete)"
fi

echo ""
echo "📋 Setup Summary"
echo "----------------"

if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ All environment variables are configured"
    echo "✅ Ready to start development server"
    echo ""
    echo "Next steps:"
    echo "1. Run 'npm install' to install dependencies"
    echo "2. Run 'npm run dev' to start the development server"
    echo "3. Visit the Settings page to verify API key status"
    echo "4. Add university data (departments, staff, etc.)"
    echo "5. Generate your first timetable!"
else
    echo "❌ Setup incomplete - please configure missing environment variables"
    echo ""
    echo "See ENVIRONMENT_SETUP.md for detailed configuration instructions"
fi

echo ""
echo "🔗 Helpful Links:"
echo "- Google AI Studio: https://makersuite.google.com/app/apikey"
echo "- Supabase Dashboard: https://supabase.com/dashboard"
echo "- Setup Guide: ./ENVIRONMENT_SETUP.md"
