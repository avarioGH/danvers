# DANVERS OS — Personal AI Operating System

**A fully personalized AI-powered life operating system inspired by Tony Stark's Jarvis.**

---

## 🚀 Quick Start

```bash
cd jarvis-os
npm install
npm run dev
# → http://localhost:3000
```

---

## ⚙️ Configuration

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run `supabase/schema.sql` to create all tables
3. Go to **Project Settings → API** and copy:
   - Project URL
   - Anon/Public Key
   - Service Role Key (secret)

### 2. Environment Variables

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-key  # optional

NEXT_PUBLIC_APP_URL=http://localhost:3000

# WHITELIST — only these emails can log in
ALLOWED_EMAILS=your@email.com
```

### 3. Supabase Auth Setup

In Supabase Dashboard → Authentication:
- Enable **Google OAuth** (add Client ID + Secret)
- Add redirect URL: `http://localhost:3000/auth/callback`
- For production: `https://yourdomain.com/auth/callback`

### 4. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create an API key
3. Add to `.env.local` as `GEMINI_API_KEY`

---

## 📂 Project Structure

```
jarvis-os/
├── src/
│   ├── app/
│   │   ├── (protected)/          # Auth-protected pages
│   │   │   ├── dashboard/        # Command Center
│   │   │   ├── assistant/        # AI Chat
│   │   │   ├── schedule/         # Life Scheduling
│   │   │   ├── workout/          # Workout Engine
│   │   │   ├── nutrition/        # Nutrition Matrix
│   │   │   ├── habits/           # Habit Tracker
│   │   │   ├── sleep/            # Sleep System
│   │   │   ├── analytics/        # Life Analytics
│   │   │   ├── goals/            # Goal Engine
│   │   │   ├── memory/           # AI Memory Bank
│   │   │   └── settings/         # Configuration
│   │   ├── api/
│   │   │   └── assistant/        # Gemini AI API route
│   │   ├── auth/callback/        # OAuth callback
│   │   ├── login/                # Auth page
│   │   └── unauthorized/         # Access denied page
│   ├── components/
│   │   └── layout/
│   │       ├── Sidebar.tsx       # Navigation sidebar
│   │       └── AppShell.tsx      # Main app wrapper
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts         # Browser Supabase client
│   │       └── server.ts         # Server Supabase client
│   └── proxy.ts                  # Auth middleware (Next.js 16)
├── supabase/
│   └── schema.sql                # Full DB schema + RLS
└── .env.local                    # Environment config
```

---

## 🔐 Security

- **Email Whitelist**: Only `ALLOWED_EMAILS` can access the system
- **Row Level Security**: All Supabase tables have RLS enabled
- **Route Protection**: All protected routes require authentication
- **OAuth**: Google login supported with redirect validation

---

## 🗄️ Database Schema

Tables created by `supabase/schema.sql`:

| Table | Purpose |
|-------|---------|
| `user_profiles` | Extended user data |
| `daily_logs` | Daily energy/mood scores |
| `tasks` | Schedule & task management |
| `workouts` | Workout sessions |
| `exercise_logs` | Individual exercise tracking |
| `meal_logs` | Food & nutrition logging |
| `habits` | Habit definitions |
| `habit_logs` | Daily habit completions |
| `sleep_logs` | Sleep quality tracking |
| `goals` | Goal management |
| `goal_milestones` | Goal milestone tracking |
| `ai_memories` | Vector memory (pgvector) |
| `notifications` | System notifications |
| `analytics` | Performance snapshots |

---

## 🤖 AI System

The DANVERS AI assistant uses:
- **Primary**: Google Gemini 1.5 Flash (fast, capable)
- **System Prompt**: Sophisticated Jarvis personality with life coaching context
- **Memory**: pgvector for semantic memory retrieval (requires implementation)
- **Context**: Life data fed into AI for personalized responses

---

## 🚀 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard
# or use: vercel env add
```

Add all `.env.local` variables to Vercel project settings.

---

## 📱 Pages Overview

| Page | URL | Description |
|------|-----|-------------|
| Command Center | `/dashboard` | Main HUD with all metrics |
| AI Assistant | `/assistant` | JARVIS chat interface |
| Schedule | `/schedule` | Weekly calendar planner |
| Workout | `/workout` | PPL split + PR tracking |
| Nutrition | `/nutrition` | Macros + meal logging |
| Habits | `/habits` | Streak tracking system |
| Sleep | `/sleep` | Sleep quality analytics |
| Analytics | `/analytics` | Life performance radar |
| Goals | `/goals` | Goal milestone tracking |
| AI Memory | `/memory` | Vector memory bank |
| Settings | `/settings` | System configuration |

---

*DANVERS OS — Private · Classified · Authorized Personnel Only*
