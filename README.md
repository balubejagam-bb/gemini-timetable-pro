# Gemini Timetable Pro

AI-powered university timetable management system using Google's Gemini AI for intelligent schedule generation.

## 🎓 NEP 2020 Alignment (Multidisciplinary Timetable Generation)

This project has been structured with the goals of India's National Education Policy (NEP) 2020 in mind, especially around flexibility, multidisciplinary learning, equitable workload distribution, and technology-enabled academic planning.

### ✅ Implemented NEP-Oriented Capabilities

| NEP 2020 Theme | Implemented Feature | Description |
| -------------- | ------------------ | ----------- |
| Multidisciplinary Integration | Unified model for departments, cross-listed staff capability (can_teach_across_departments), shared room pool | Foundation for inter-department scheduling and resource sharing |
| Flexible Curriculum Structure | Subject metadata (credits, hours_per_week, subject_type lab/theory, is_elective flag scaffold) | Supports differentiation of theory, lab, practical & elective scaffolding |
| Faculty Workload & Optimization | Conflict-free allocation + max weekly hour metadata + (planned) availability usage | Prevents double-booking and prepares for fair load balancing |
| Experiential / Lab Emphasis | Explicit lab vs classroom room-type mapping & lab scheduling rules | Ensures practical components are scheduled in proper facilities |
| Academic Efficiency & Engagement | Minimum daily instructional load (≥3 classes/section/day) post-processing | Reduces underutilized days and improves structured engagement |
| Data-Driven Governance | department_stats view, structured Supabase schema, AI-assisted generation logs | Provides analytical surface for future dashboards |
| Technology Integration & AI | Google Gemini powered draft + deterministic validation + filler logic | Combines AI creativity with rule-based correctness |
| Continuous Improvement Path | Migration adding elective + specialization fields | Schema already anticipates richer NEP constructs |

### 🧠 How AI Supports NEP Goals
1. Draft Generation: Gemini proposes a multi-section schedule across days & slots.
2. Policy Enforcement Layer: Post-processing removes conflicts (staff/room/section) and enforces minimum daily engagement.
3. Structural Readiness: Schema fields (is_elective, specializations, can_teach_across_departments, min_periods_per_week) allow expansion into elective baskets, interdisciplinary offerings, and faculty qualification logic.

### 🔍 Current Scope vs. Full NEP Vision
The system already covers core structural & operational foundations (conflict-free multi-department timetabling, lab/theory distinction, credit + hours metadata, AI augmentation). Some advanced NEP 2020 elements are intentionally staged for future iterations:

Planned Enhancements (Roadmap):
- Elective basket management (foundation/core/elective/skill/value-add categorization & credit range enforcement)
- Student-level preference & seat allocation for open electives
- Enforcement of staff availability & max_hours_per_week in generation step (schema prepared)
- Cross-department teaching qualification rules using specializations
- Credit load validation against semester/program bands
- Project / internship / multidisciplinary cluster slots
- Analytics: workload balance, room utilization, elective fill rates

### 🏁 Statement
Gemini Timetable Pro already satisfies the foundational requirements to operationalize NEP 2020-inspired multidisciplinary and flexible scheduling in a university context: it unifies academic entities, differentiates instructional modalities, embeds AI-driven generation with deterministic academic constraints, and provisions schema-level extensibility for elective and interdisciplinary expansion. Remaining advanced NEP constructs (elective seat allocation, program-level credit governance, personalized pathways) are supported by existing data model extensions and are enumerated in the roadmap above.

> If you require a formal compliance dossier or whitepaper, you can generate one using this README’s alignment matrix plus database migration history (see `supabase/migrations/`).

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
