# Vercel Deployment Guide

This guide will help you deploy your Gemini Timetable Pro to Vercel.

## 🚀 Quick Deployment

### Option 1: Deploy with Vercel CLI
```bash
# Install Vercel CLI if you haven't already
npm install -g vercel

# Login to Vercel
vercel login

# Deploy the project
vercel

# Follow the prompts and configure environment variables
```

### Option 2: Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Deploy!

## 🔧 Environment Variables Setup

In your Vercel project settings, add these environment variables:

### Required Environment Variables:
```
SUPABASE_URL=https://cjvoiyjpyjagfrxtispo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqdm9peWpweWphZ2ZyeHRpc3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjE0NTcsImV4cCI6MjA3MjEzNzQ1N30.9eWugE3yXiqnZINFeZPBllBujaHVYkPWJrpNr4TQPZQ
SUPABASE_PROJECT_ID=cjvoiyjpyjagfrxtispo
GOOGLE_AI_API_KEY=AIzaSyDVGpwtC69A_xp58jGbvW3VWInG2FV_PQY
```

### How to add environment variables in Vercel:
1. Go to your project dashboard on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with its corresponding value
4. Set the environment to "Production" (and optionally Preview/Development)
5. Click "Save"

## 🛠️ Pre-deployment Checklist

### 1. Fix Supabase Edge Function (CRITICAL!)
The timetable generation won't work until you set the Google AI API key in Supabase:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `cjvoiyjpyjagfrxtispo`
3. Navigate to **Edge Functions** → **Settings**
4. Add environment variable:
   - **Name**: `GOOGLE_AI_API_KEY`
   - **Value**: `AIzaSyDVGpwtC69A_xp58jGbvW3VWInG2FV_PQY`

### 2. Install Dependencies
```bash
npm install
```

### 3. Test Locally
```bash
npm run build
npm run preview
```

### 4. Verify Environment Configuration
```bash
# Run the test script
.\test-setup.bat
```

## 🚦 Deployment Steps

### Step 1: Prepare the Repository
```bash
# Ensure everything is committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Connect to Vercel
If using GitHub:
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect it's a Vite project
3. Configure build settings (should be automatic)

### Step 3: Configure Build Settings
Vercel should auto-detect these, but verify:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Set Environment Variables
Add all the environment variables listed above in your Vercel project settings.

### Step 5: Deploy
Click "Deploy" and wait for the build to complete.

## 🔍 Testing Your Deployment

After deployment:

1. **Test the website loads**: Visit your Vercel URL
2. **Check Settings page**: Verify API keys are detected
3. **Test database connection**: Try adding a department
4. **Test AI generation**: Create some data and generate a timetable

## 🚨 Troubleshooting

### Common Issues:

1. **"API key not found" errors**
   - Check environment variables in Vercel dashboard
   - Ensure variable names match exactly (case-sensitive)

2. **Build fails**
   - Check the build logs in Vercel
   - Ensure all dependencies are in package.json
   - Try building locally first

3. **Edge function still failing**
   - Go to Supabase Dashboard
   - Set `GOOGLE_AI_API_KEY` in Edge Functions environment
   - Redeploy the edge function if needed

4. **Database connection issues**
   - Verify Supabase environment variables
   - Check Supabase project status
   - Verify RLS policies

### Build Logs
If deployment fails, check the build logs in Vercel dashboard for specific error messages.

## 🌐 Custom Domain (Optional)

After successful deployment:
1. Go to your project in Vercel
2. Navigate to **Settings** → **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions

## 🔐 Security Notes

- Environment variables are automatically encrypted in Vercel
- Never commit sensitive keys to your repository
- Use different API keys for different environments if needed
- Monitor your API usage in Google Cloud Console

## 📱 Performance Optimization

Your Vercel deployment includes:
- ✅ Automatic CDN distribution
- ✅ Serverless functions for optimal performance
- ✅ Automatic HTTPS
- ✅ Global edge network

Your Gemini Timetable Pro will be available worldwide with optimal performance!
