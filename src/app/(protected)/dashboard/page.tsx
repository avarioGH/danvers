'use client'
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import {
  Zap, Moon, Dumbbell, Brain, Target, TrendingUp, Coffee,
  Droplets, Flame, Activity, ChevronRight, Plus, CheckCircle2, Circle,
  Loader2, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const typeColors: Record<string, string> = {
  routine: '#00d4ff', gym: '#1a6fff', meal: '#00ff88', work: '#ffb800',
  recovery: '#a855f7', sleep: '#6366f1', content: '#f43f5e',
}

function MetricCard({ icon: Icon, label, value, unit, sub, color = '#00d4ff', trend }: {
  icon: React.ElementType; label: string; value: string | number; unit?: string; sub?: string; color?: string; trend?: number
}) {
  return (
    <div className="glass-card" style={{ padding: 20, flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: 11, color: trend >= 0 ? '#00ff88' : '#ff3366', fontWeight: 600 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 12, color: '#4a6580', marginLeft: 3 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 12, color: '#8bacc8', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#4a6580', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function AIInsightCard({ message, priority = 'info' }: { message: string; priority?: 'info' | 'warning' | 'tip' }) {
  const colors = { info: '#00d4ff', warning: '#ffb800', tip: '#00ff88' }
  const color = colors[priority]
  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 10, marginBottom: 8 }}>
      <Brain size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <p style={{ fontSize: 13, color: '#c8d8e8', lineHeight: 1.5 }}>{message}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('')
  const [time, setTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    sleep: { score: 0, duration: '0h 0m', status: 'No data' },
    energy: 0,
    focus: 0,
    calories: 0,
    water: 0,
    workoutDone: false,
    habitsCompleted: 0,
    totalHabits: 0
  })
  
  // Live dynamic states
  const [chartData, setChartData] = useState<any[]>([])
  const [lifeScoreData, setLifeScoreData] = useState<any[]>([])
  const [nutrition, setNutrition] = useState({ protein: 0, carbs: 0, fats: 0, list: [] as any[] })
  const [habits, setHabits] = useState<any[]>([])
  const [todaySchedule, setTodaySchedule] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [quickLogData, setQuickLogData] = useState({
    bedtime: '22:00',
    wake_time: '06:00',
    sleep_hours: 8,
    sleep_quality: 80,
    energy_score: 80,
    focus_score: 80,
  })

  const supabase = createClient()

  useEffect(() => {
    const updateGreeting = () => {
      const h = new Date().getHours()
      if (h < 12) setGreeting('Good Morning')
      else if (h < 17) setGreeting('Good Afternoon')
      else setGreeting('Good Evening')
      setTime(new Date())
    }
    updateGreeting()
    const t = setInterval(updateGreeting, 60000)
    
    fetchData()
    
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const start = new Date(`1970-01-01T${quickLogData.bedtime}:00`)
    const end = new Date(`1970-01-01T${quickLogData.wake_time}:00`)
    
    if (end < start) {
      end.setDate(end.getDate() + 1)
    }
    
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    setQuickLogData(prev => ({ ...prev, sleep_hours: Number(diffHours.toFixed(1)) }))
  }, [quickLogData.bedtime, quickLogData.wake_time])

  const fetchData = async () => {
    setLoading(true)
    const today = new Date().toLocaleDateString('en-CA')
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 6)
    const lastWeekStr = lastWeek.toLocaleDateString('en-CA')
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: dailyLog } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('date', today)
        .eq('user_id', user.id)
        .single()

      const { data: sleepLog } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('sleep_date', today)
        .eq('user_id', user.id)
        .single()

      // Fetch Nutrition Data
      const { data: mealLogs } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('log_date', today)
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true })
      
      const totalCalories = mealLogs?.reduce((acc, curr) => acc + (curr.calories || 0), 0) || 0
      const totalProtein = mealLogs?.reduce((acc, curr) => acc + (curr.protein_g || 0), 0) || 0
      const totalCarbs = mealLogs?.reduce((acc, curr) => acc + (curr.carbs_g || 0), 0) || 0
      const totalFats = mealLogs?.reduce((acc, curr) => acc + (curr.fats_g || 0), 0) || 0

      setNutrition({
        protein: totalProtein,
        carbs: totalCarbs,
        fats: totalFats,
        list: mealLogs || []
      })

      // Fetch Performance Data (last 7 days)
      const { data: weekDailyLogs } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', lastWeekStr)
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const perfData = weekDailyLogs?.map(log => ({
        day: daysOfWeek[new Date(log.date).getDay()],
        score: Math.round(((log.energy_score || 0) + (log.focus_score || 0)) / 2),
        focus: log.focus_score || 0,
        energy: log.energy_score || 0
      })) || []
      setChartData(perfData)

      // Fetch Habits
      const { data: habitsList } = await supabase
        .from('habits')
        .select('*, habit_logs(id)')
        .eq('is_active', true)
        .eq('user_id', user.id)
      
      const habitsWithStatus = habitsList?.map(h => ({
        ...h,
        label: h.name,
        done: h.habit_logs?.length > 0,
        streak: h.habit_logs?.length || 0 // Simplified streak
      })) || []

      // Fetch Tasks
      const { data: taskList } = await supabase
        .from('tasks')
        .select('*')
        .eq('scheduled_date', today)
        .eq('user_id', user.id)
        .order('scheduled_time', { ascending: true })

      // Fetch Goals
      const { data: goalsList } = await supabase
        .from('goals')
        .select('*')
        .eq('status', 'active')
        .eq('user_id', user.id)
        .limit(4)

      setMetrics({
        sleep: { 
          score: sleepLog?.quality_score || 0, 
          duration: `${Math.floor(sleepLog?.duration_hours || 0)}h ${Math.round(((sleepLog?.duration_hours || 0) % 1) * 60)}m`,
          status: sleepLog ? 'Logged' : 'No data'
        },
        energy: dailyLog?.energy_score || 0,
        focus: dailyLog?.focus_score || 0,
        calories: totalCalories,
        water: 0,
        workoutDone: false, // Could be derived from workouts table today
        habitsCompleted: habitsWithStatus.filter(h => h.done).length,
        totalHabits: habitsWithStatus.length
      })

      // Calculate Life Score
      const avgFocus = dailyLog?.focus_score || 0
      const avgEnergy = dailyLog?.energy_score || 0
      const sleepQuality = sleepLog?.quality_score || 0
      const nutritionScore = Math.min((totalCalories / 2400) * 100, 100)
      const habitsScore = habitsWithStatus.length > 0 ? (habitsWithStatus.filter(h => h.done).length / habitsWithStatus.length) * 100 : 0
      
      setLifeScoreData([
        { subject: 'Sleep', A: sleepQuality || 10 },
        { subject: 'Fitness', A: 50 }, // Default if no workout table scan
        { subject: 'Nutrition', A: Math.round(nutritionScore) || 10 },
        { subject: 'Focus', A: avgFocus || 10 },
        { subject: 'Habits', A: Math.round(habitsScore) || 10 },
        { subject: 'Energy', A: avgEnergy || 10 },
      ])

      setHabits(habitsWithStatus)
      setTodaySchedule(taskList?.map(t => ({
        time: t.scheduled_time?.slice(0, 5) || '--:--',
        label: t.title,
        type: t.category,
        done: t.is_completed
      })) || [])
      setGoals(goalsList || [])

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = new Date().toLocaleDateString('en-CA')

      await supabase.from('daily_logs').upsert({
        user_id: user.id,
        date: today,
        energy_score: quickLogData.energy_score,
        focus_score: quickLogData.focus_score
      })

      const now = new Date()
      let bedDate = new Date()
      if (quickLogData.bedtime > quickLogData.wake_time) {
        bedDate.setDate(bedDate.getDate() - 1)
      }
      const bedtimeStr = `${bedDate.toLocaleDateString('en-CA')}T${quickLogData.bedtime}:00.000Z`
      const wakeTimeStr = `${today}T${quickLogData.wake_time}:00.000Z`

      await supabase.from('sleep_logs').upsert({
        user_id: user.id,
        sleep_date: today,
        bedtime: bedtimeStr,
        wake_time: wakeTimeStr,
        duration_hours: quickLogData.sleep_hours,
        quality_score: quickLogData.sleep_quality
      })

      setShowQuickLog(false)
      fetchData()
    } catch (err) {
      console.error('Quick log error:', err)
    }
  }

  const completedHabits = habits.filter(h => h.done).length
  const lifeScoreAverage = lifeScoreData.length > 0 ? Math.round(lifeScoreData.reduce((acc, curr) => acc + curr.A, 0) / lifeScoreData.length) : 0

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }} className="animate-fade-up">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>
              COMMAND CENTER · {time ? time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '...'}
            </div>
            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 700, color: '#e8f4ff', lineHeight: 1.2 }}>
              {greeting}, Commander
            </h1>
            <p style={{ color: '#8bacc8', fontSize: 14, marginTop: 6 }}>
              Your mission today: <span style={{ color: '#00d4ff', fontWeight: 600 }}>Deep Work Sprint + Pull Day</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowQuickLog(true)} className="btn-secondary" style={{ fontSize: 13 }}>
              <Plus size={14} />
              Quick Log
            </button>
            <button onClick={() => window.location.href = '/assistant'} className="btn-primary" style={{ fontSize: 13 }}>
              <Brain size={14} />
              Ask DANVERS
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }} className="stagger-children">
        <div className="animate-fade-up" style={{ flex: '1 1 140px' }}>
          <MetricCard icon={Moon} label="Sleep Score" value={metrics.sleep.score} unit="%" sub={`${metrics.sleep.duration} · ${metrics.sleep.status}`} color="#6366f1" />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '60ms', flex: '1 1 140px' }}>
          <MetricCard icon={Zap} label="Energy Level" value={metrics.energy} unit="%" sub={metrics.energy > 0 ? 'Logged' : 'No data today'} color="#00d4ff" />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '120ms', flex: '1 1 140px' }}>
          <MetricCard icon={Brain} label="Focus Score" value={metrics.focus} unit="%" sub={metrics.focus > 0 ? 'Peak state' : 'No data'} color="#00ff88" />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '180ms', flex: '1 1 140px' }}>
          <MetricCard icon={Flame} label="Calories" value={metrics.calories.toLocaleString()} unit="kcal" sub="Goal: 2,400" color="#ffb800" />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '240ms', flex: '1 1 140px' }}>
          <MetricCard icon={Droplets} label="Hydration" value={metrics.water} unit="L" sub="Goal: 3.5L" color="#1a6fff" />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '300ms', flex: '1 1 140px' }}>
          <MetricCard icon={Dumbbell} label="Workout" value={metrics.workoutDone ? '✓' : '--'} unit="" sub={metrics.workoutDone ? 'Complete' : 'Pending'} color="#a855f7" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="glass-card animate-fade-up" style={{ padding: 24, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>PERFORMANCE MATRIX</h2>
              <p style={{ fontSize: 12, color: '#4a6580', marginTop: 2 }}>7-day productivity, focus & energy analysis</p>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[['#00d4ff', 'Score'], ['#1a6fff', 'Focus'], ['#00ff88', 'Energy']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                  <span style={{ fontSize: 11, color: '#8bacc8' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {chartData.length > 0 ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFocus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a6fff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a6fff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: '#4a6580', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#4a6580', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(4,15,30,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, color: '#e8f4ff' }}
                  labelStyle={{ color: '#00d4ff', fontFamily: 'Orbitron, monospace', fontSize: 11 }}
                />
                <Area type="monotone" dataKey="score" stroke="#00d4ff" strokeWidth={2} fill="url(#gScore)" dot={false} />
                <Area type="monotone" dataKey="focus" stroke="#1a6fff" strokeWidth={2} fill="url(#gFocus)" dot={false} />
                <Area type="monotone" dataKey="energy" stroke="#00ff88" strokeWidth={2} fill="url(#gEnergy)" dot={false} />
              </AreaChart>
            ) : (
               <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6580', fontSize: 13 }}>
                 Not enough data yet. Log your performance today.
               </div>
            )}
          </ResponsiveContainer>
        </div>

        <div className="glass-card animate-fade-up" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em', marginBottom: 4 }}>LIFE SCORE</h2>
          <p style={{ fontSize: 12, color: '#4a6580', marginBottom: 12 }}>Holistic performance index</p>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 36, fontWeight: 800, color: '#00d4ff', textShadow: '0 0 20px rgba(0,212,255,0.5)' }}>{lifeScoreAverage}</span>
            <span style={{ fontSize: 14, color: '#4a6580', marginLeft: 4 }}>/100</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={lifeScoreData}>
              <PolarGrid stroke="rgba(0,212,255,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#8bacc8', fontSize: 11 }} />
              <Radar name="Score" dataKey="A" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.1} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

        <div className="glass-card animate-fade-up" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>TODAY'S MISSION</h2>
              <p style={{ fontSize: 12, color: '#4a6580', marginTop: 2 }}>
                {todaySchedule.filter(t => t.done).length}/{todaySchedule.length} completed
              </p>
            </div>
            <a href="/schedule" style={{ fontSize: 12, color: '#00d4ff', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              View All <ChevronRight size={12} />
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todaySchedule.length > 0 ? todaySchedule.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                background: item.done ? 'rgba(0,255,136,0.04)' : 'rgba(0,212,255,0.03)',
                border: `1px solid ${item.done ? 'rgba(0,255,136,0.12)' : 'rgba(0,212,255,0.08)'}`,
                borderRadius: 10, opacity: item.done ? 0.7 : 1,
              }}>
                <div style={{ width: 3, height: 28, borderRadius: 2, background: typeColors[item.type] || '#00d4ff', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: item.done ? '#4a6580' : '#c8d8e8', textDecoration: item.done ? 'line-through' : 'none' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace' }}>{item.time}</div>
                </div>
                {item.done
                  ? <CheckCircle2 size={16} style={{ color: '#00ff88', flexShrink: 0 }} />
                  : <Circle size={16} style={{ color: '#4a6580', flexShrink: 0 }} />
                }
              </div>
            )) : (
              <p style={{ fontSize: 13, color: '#4a6580', textAlign: 'center', padding: '10px 0' }}>No tasks for today</p>
            )}
          </div>
        </div>

        <div className="glass-card animate-fade-up" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>HABIT MATRIX</h2>
              <p style={{ fontSize: 12, color: '#4a6580', marginTop: 2 }}>{completedHabits}/{habits.length} completed today</p>
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: '#00d4ff' }}>
              {habits.length > 0 ? Math.round(completedHabits / habits.length * 100) : 0}%
            </div>
          </div>

          <div className="progress-bar" style={{ marginBottom: 16 }}>
            <div className="progress-fill" style={{ width: `${habits.length > 0 ? (completedHabits / habits.length) * 100 : 0}%` }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {habits.length > 0 ? habits.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {h.done
                  ? <CheckCircle2 size={16} style={{ color: '#00ff88', flexShrink: 0 }} />
                  : <Circle size={16} style={{ color: '#4a6580', flexShrink: 0 }} />
                }
                <span style={{ flex: 1, fontSize: 13, color: h.done ? '#c8d8e8' : '#8bacc8' }}>{h.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Flame size={11} style={{ color: '#ffb800' }} />
                  <span style={{ fontSize: 11, color: '#ffb800', fontFamily: 'JetBrains Mono, monospace' }}>{h.streak}</span>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: 13, color: '#4a6580', textAlign: 'center' }}>No habits tracked</p>
            )}
          </div>
        </div>

        <div className="glass-card animate-fade-up" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Brain size={16} style={{ color: '#00d4ff' }} />
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>DANVERS INSIGHTS</h2>
          </div>

          <AIInsightCard
            message="Your focus score is strong today. Best time for deep work: 09:00–13:00. Block this window."
            priority="info"
          />
          {metrics.water < 3.5 && (
            <AIInsightCard
              message={`Hydration is below optimal. Drink ${Math.max(0, 3.5 - metrics.water).toFixed(1)}L more today to support cognitive performance.`}
              priority="warning"
            />
          )}
          {metrics.sleep.score > 80 && (
            <AIInsightCard
              message="Excellent recovery recorded. Consistency compound effect: +23% productivity vs last week."
              priority="tip"
            />
          )}

          <div style={{ marginTop: 16, padding: 12, background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>DAILY BRIEFING</div>
            <p style={{ fontSize: 13, color: '#8bacc8', lineHeight: 1.6 }}>
              Today is a solid performance day. Your sleep quality ({metrics.sleep.score}%) and energy levels are good. Prioritize your most cognitively demanding tasks in the morning.
            </p>
          </div>
        </div>

        <div className="glass-card animate-fade-up" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>NUTRITION MATRIX</h2>
            <span style={{ fontSize: 11, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace' }}>{nutrition.list.reduce((acc, curr) => acc + curr.calories, 0)} kcal / 2400</span>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#00d4ff' }}>{Math.round(nutrition.protein)}g</div>
              <div style={{ fontSize: 11, color: '#4a6580' }}>Protein</div>
              <div className="progress-bar" style={{ marginTop: 6 }}>
                <div className="progress-fill" style={{ width: `${Math.min((nutrition.protein / 200) * 100, 100)}%`, background: 'linear-gradient(90deg, #1a6fff, #00d4ff)' }} />
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#ffb800' }}>{Math.round(nutrition.carbs)}g</div>
              <div style={{ fontSize: 11, color: '#4a6580' }}>Carbs</div>
              <div className="progress-bar" style={{ marginTop: 6 }}>
                <div className="progress-fill" style={{ width: `${Math.min((nutrition.carbs / 250) * 100, 100)}%`, background: 'linear-gradient(90deg, #ffb800, #ffd700)' }} />
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#a855f7' }}>{Math.round(nutrition.fats)}g</div>
              <div style={{ fontSize: 11, color: '#4a6580' }}>Fats</div>
              <div className="progress-bar" style={{ marginTop: 6 }}>
                <div className="progress-fill" style={{ width: `${Math.min((nutrition.fats / 80) * 100, 100)}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nutrition.list.length > 0 ? nutrition.list.map((m, i) => {
              const d = new Date(m.logged_at)
              const timeString = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(0,212,255,0.03)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Coffee size={13} style={{ color: '#00d4ff' }} />
                    <span style={{ fontSize: 13, color: '#c8d8e8' }}>{m.meal_type || m.food_name || 'Meal'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace' }}>{timeString}</div>
                  <div style={{ fontSize: 12, color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace' }}>{m.calories} kcal</div>
                </div>
              )
            }) : (
              <p style={{ fontSize: 13, color: '#4a6580', textAlign: 'center' }}>No meals logged today</p>
            )}
          </div>
        </div>

        <div className="glass-card animate-fade-up" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>ACTIVE GOALS</h2>
            <a href="/goals" style={{ fontSize: 12, color: '#00d4ff', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              Manage <ChevronRight size={12} />
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {goals.length > 0 ? goals.map((g, i) => {
              const progress = Math.round((g.current_value / g.target_value) * 100) || 0
              return (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Target size={13} style={{ color: g.color || '#00d4ff' }} />
                      <span style={{ fontSize: 13, color: '#c8d8e8', fontWeight: 500 }}>{g.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#4a6580' }}>{g.target_value} {g.unit}</span>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: g.color || '#00d4ff' }}>{progress}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${(g.color || '#00d4ff')}99, ${g.color || '#00d4ff'})` }} />
                  </div>
                </div>
              )
            }) : (
              <p style={{ fontSize: 13, color: '#4a6580', textAlign: 'center' }}>No active goals</p>
            )}
          </div>
        </div>
      </div>

      {showQuickLog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowQuickLog(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 450, padding: 32, position: 'relative' }}>
             <button onClick={() => setShowQuickLog(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}><X size={20} /></button>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff', marginBottom: 24 }}>QUICK SYSTEM LOG</h2>
             <form onSubmit={handleQuickLog} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                 <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>BEDTIME</label>
                    <input type="time" className="danvers-input" value={quickLogData.bedtime} onChange={e => setQuickLogData({...quickLogData, bedtime: e.target.value})} required />
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>WAKE TIME</label>
                    <input type="time" className="danvers-input" value={quickLogData.wake_time} onChange={e => setQuickLogData({...quickLogData, wake_time: e.target.value})} required />
                 </div>
               </div>

               <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: '#4a6580' }}>SLEEP QUALITY</label>
                    <span style={{ fontSize: 12, color: '#00d4ff', fontFamily: 'Orbitron' }}>{quickLogData.sleep_quality}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={quickLogData.sleep_quality} onChange={e => setQuickLogData({...quickLogData, sleep_quality: parseInt(e.target.value)})} style={{ width: '100%', accentColor: '#6366f1' }} />
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#4a6580', marginTop: 4 }}>Auto-calculated Duration: {quickLogData.sleep_hours}h</div>
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                 <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>ENERGY LEVEL (0-100)</label>
                    <input type="number" className="danvers-input" min="0" max="100" value={quickLogData.energy_score} onChange={e => setQuickLogData({...quickLogData, energy_score: parseInt(e.target.value) || 0})} />
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>FOCUS SCORE (0-100)</label>
                    <input type="number" className="danvers-input" min="0" max="100" value={quickLogData.focus_score} onChange={e => setQuickLogData({...quickLogData, focus_score: parseInt(e.target.value) || 0})} />
                 </div>
               </div>
               <button type="submit" className="btn-primary" style={{ marginTop: 12, justifyContent: 'center', padding: 12 }}>SYNC DATA</button>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
