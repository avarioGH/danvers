-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  daily_calorie_goal INT DEFAULT 2400,
  daily_protein_goal INT DEFAULT 200,
  daily_water_goal DECIMAL DEFAULT 3.5,
  sleep_goal DECIMAL DEFAULT 8.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily logs
CREATE TABLE public.daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  energy_score INT CHECK (energy_score >= 0 AND energy_score <= 100),
  focus_score INT CHECK (focus_score >= 0 AND focus_score <= 100),
  mood_score INT CHECK (mood_score >= 0 AND mood_score <= 100),
  productivity_score INT CHECK (productivity_score >= 0 AND productivity_score <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Schedules / tasks
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'work',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  scheduled_date DATE,
  scheduled_time TIME,
  duration_minutes INT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts
CREATE TABLE public.workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_date DATE NOT NULL,
  workout_type TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INT,
  notes TEXT,
  recovery_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise logs
CREATE TABLE public.exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  sets INT,
  reps INT,
  weight_kg DECIMAL,
  duration_seconds INT,
  notes TEXT,
  is_pr BOOLEAN DEFAULT FALSE
);

-- Meal logs
CREATE TABLE public.meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT NOT NULL,
  quantity DECIMAL,
  unit TEXT,
  calories INT,
  protein_g DECIMAL,
  carbs_g DECIMAL,
  fats_g DECIMAL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits
CREATE TABLE public.habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'routine',
  color TEXT DEFAULT '#00d4ff',
  target_frequency TEXT DEFAULT 'daily',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit logs
CREATE TABLE public.habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, completed_date)
);

-- Sleep logs
CREATE TABLE public.sleep_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sleep_date DATE NOT NULL,
  bedtime TIMESTAMPTZ,
  wake_time TIMESTAMPTZ,
  duration_hours DECIMAL,
  quality_score INT CHECK (quality_score >= 0 AND quality_score <= 100),
  deep_sleep_hours DECIMAL,
  rem_hours DECIMAL,
  notes TEXT,
  UNIQUE(user_id, sleep_date)
);

-- Goals
CREATE TABLE public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  target_value DECIMAL,
  current_value DECIMAL DEFAULT 0,
  unit TEXT,
  deadline DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  color TEXT DEFAULT '#00d4ff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal milestones
CREATE TABLE public.goal_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INT DEFAULT 0
);

-- AI Memory (vector embeddings)
CREATE TABLE public.ai_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  tags TEXT[],
  importance TEXT DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high')),
  embedding vector(768),
  color TEXT DEFAULT '#00d4ff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics snapshots
CREATE TABLE public.analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  productivity_score INT,
  sleep_score INT,
  fitness_score INT,
  habit_score INT,
  nutrition_score INT,
  focus_score INT,
  life_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- Content Analysis History
CREATE TABLE public.content_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  analysis_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Background Jobs for Analyzer
CREATE TABLE public.analysis_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress_message TEXT DEFAULT 'Queueing...',
  error_message TEXT,
  result_id UUID REFERENCES public.content_analysis(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_user_date ON public.tasks(user_id, scheduled_date);
CREATE INDEX idx_workouts_user_date ON public.workouts(user_id, workout_date);
CREATE INDEX idx_meal_logs_user_date ON public.meal_logs(user_id, log_date);
CREATE INDEX idx_habit_logs_user_date ON public.habit_logs(user_id, completed_date);
CREATE INDEX idx_sleep_logs_user_date ON public.sleep_logs(user_id, sleep_date);
CREATE INDEX idx_ai_memories_embedding ON public.ai_memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_content_analysis_user ON public.content_analysis(user_id);
CREATE INDEX idx_analysis_jobs_user ON public.analysis_jobs(user_id);
CREATE INDEX idx_analysis_jobs_status ON public.analysis_jobs(status);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (user can only access own data)
CREATE POLICY "Users can manage own profile" ON public.user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own daily logs" ON public.daily_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own meals" ON public.meal_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own habits" ON public.habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own habit logs" ON public.habit_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sleep" ON public.sleep_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own memories" ON public.ai_memories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own analytics" ON public.analytics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own content analysis" ON public.content_analysis FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own analysis jobs" ON public.analysis_jobs FOR ALL USING (auth.uid() = user_id);
