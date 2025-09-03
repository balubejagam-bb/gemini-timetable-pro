# Gemini Timetable Pro

AI-powered university timetable management system using Google's Gemini AI for intelligent schedule generation.

## 🚀 Features

- **AI-Powered Timetable Generation**: Uses Google Gemini 1.5 Pro for intelligent scheduling
- **Conflict Resolution**: Automatically resolves staff, room, and time conflicts  
- **University Management**: Complete management of departments, sections, subjects, staff, and rooms
- **Real-time Database**: Powered by Supabase for real-time data synchronization
- **Modern UI**: Built with React, TypeScript, and shadcn/ui components
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠️ Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google AI API key

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd gemini-timetable-pro

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys (see Environment Setup below)

# Start development server
npm run dev
```

## 🔧 Environment Setup

**⚠️ Important**: You must configure environment variables before the application will work properly.

### Required Environment Variables

1. **Copy the environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Get your Google AI API key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create an API key
   - Copy the key to your `.env` file

3. **Configure Supabase**:
   - Create a project at [Supabase](https://supabase.com)
   - Copy your project URL, project ID, and anon key to `.env`

4. **Set up Supabase Edge Functions**:
   - In your Supabase dashboard, go to Edge Functions > Settings
   - Add environment variable: `GOOGLE_AI_API_KEY` with your Google AI key

### Example .env file:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_GOOGLE_AI_API_KEY="your_google_ai_api_key"
```

📖 **For detailed setup instructions, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)**

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Application pages
├── integrations/       # Third-party integrations (Supabase)
├── lib/                # Utility functions and configurations
└── hooks/              # Custom React hooks

supabase/
├── functions/          # Edge functions (AI generation)
├── migrations/         # Database migrations
└── config.toml        # Supabase configuration
```

## 🎯 Usage

1. **Configure Settings**: Go to Settings page and verify your API keys
2. **Add University Data**: 
   - Add departments in the Departments page
   - Add sections, subjects, staff, and rooms
3. **Generate Timetables**:
   - Go to Generate Timetable page
   - Select departments and semester
   - Click "Generate Timetables" 
4. **View Results**: Check the Timetable View page for generated schedules

## 🤖 AI Features

- **Smart Conflict Resolution**: Prevents scheduling conflicts automatically
- **Load Balancing**: Distributes faculty workload evenly
- **Room Optimization**: Matches room types with subject requirements
- **Schedule Optimization**: Creates efficient, gap-free schedules

## 🔒 Security

- Environment variables are properly configured and not committed to version control
- API keys are stored securely and accessed through environment configuration
- Supabase handles authentication and database security
- All sensitive data is protected with appropriate access controls

## 📱 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **AI**: Google Gemini 1.5 Pro
- **Deployment**: Ready for Vercel, Netlify, or other platforms

## 🚀 Deployment

### Using Lovable (Recommended)
1. Open [Lovable](https://lovable.dev/projects/f7ddfa8c-aa4b-4b2d-a937-d0dde0131350)
2. Click Share → Publish
3. Configure your environment variables in the deployment settings

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting platform
3. Configure environment variables in your hosting provider
4. Deploy Supabase edge functions: `supabase functions deploy`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for configuration help
- Review the [Supabase Documentation](https://supabase.com/docs)
- Consult [Google AI Documentation](https://ai.google.dev/docs)

## Project Links

**Lovable Project**: https://lovable.dev/projects/f7ddfa8c-aa4b-4b2d-a937-d0dde0131350
