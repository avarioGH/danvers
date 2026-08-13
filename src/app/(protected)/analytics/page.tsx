'use client'
import { useState, useEffect } from 'react'
import { TrendingUp, Brain, Target, Zap, Activity, BarChart3, Loader2 } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line
} from 'recharts'
import { createClient } from '@/lib/supabase/client'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    productivity: 0,
    sleep: 0,
    fitness: 0,
    habits: 85, // Default baseline
    focus: 0,
    nutrition: 0,
    recovery: 0,
    mindset: 0,
  })

  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([])
  const [hourlyProductivity, setHourlyProductivity] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setDate(1)
      const sixMonthsAgoStr = sixMonthsAgo.toLocaleDateString('en-CA')

      // Fetch Data
      const [
        { data: dLogs },
        { data: sLogs },
        { data: wLogs },
        { data: mLogs },
        { data: hLogs },
        { data: tasks }
      ] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', user.id).gte('date', sixMonthsAgoStr),
        supabase.from('sleep_logs').select('*').eq('user_id', user.id).gte('sleep_date', sixMonthsAgoStr),
        supabase.from('workouts').select('*').eq('user_id', user.id).gte('workout_date', sixMonthsAgoStr),
        supabase.from('meal_logs').select('*').eq('user_id', user.id).gte('log_date', sixMonthsAgoStr),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).gte('completed_date', sixMonthsAgoStr),
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('is_completed', true).gte('scheduled_date', sixMonthsAgoStr)
      ])

      // Generate 6 months names dynamically
      const months = []
      const monthIndexes = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        months.push(d.toLocaleString('default', { month: 'short' }))
        monthIndexes.push(d.getMonth())
      }

      const trends = months.map((month, i) => {
        const targetMonth = monthIndexes[i]
        
        const monthDLogs = dLogs?.filter(d => new Date(d.date).getMonth() === targetMonth) || []
        const monthSLogs = sLogs?.filter(d => new Date(d.sleep_date).getMonth() === targetMonth) || []
        const monthWLogs = wLogs?.filter(d => new Date(d.workout_date).getMonth() === targetMonth) || []
        const monthHLogs = hLogs?.filter(d => new Date(d.completed_date).getMonth() === targetMonth) || []
        const monthMLogs = mLogs?.filter(d => new Date(d.log_date).getMonth() === targetMonth) || []

        const dLen = monthDLogs.length || 1
        const sLen = monthSLogs.length || 1
        
        const prod = Math.round((monthDLogs.reduce((acc, curr) => acc + (curr.energy_score || 0) + (curr.focus_score || 0), 0) / 2) / dLen)
        const sleep = Math.round(monthSLogs.reduce((acc, curr) => acc + (curr.quality_score || 0), 0) / sLen)
        const fitness = Math.min(100, Math.round((monthWLogs.length / 16) * 100))
        const habitsScore = Math.min(100, Math.round((monthHLogs.length / 30) * 100))
        const nutritionScore = Math.min(100, Math.round((monthMLogs.length / 90) * 100))

        return {
          month,
          productivity: prod || 0,
          sleep: sleep || 0,
          fitness: fitness || 0,
          habits: habitsScore || 0,
          nutrition: nutritionScore || 0
        }
      })
      setMonthlyTrends(trends)

      // Calculate Overall Averages
      const dLogLen = dLogs && dLogs.length > 0 ? dLogs.length : 1
      const avgEnergy = (dLogs?.reduce((acc, curr) => acc + (curr.energy_score || 0), 0) || 0) / dLogLen
      const avgFocus = (dLogs?.reduce((acc, curr) => acc + (curr.focus_score || 0), 0) || 0) / dLogLen
      const avgMood = (dLogs?.reduce((acc, curr) => acc + (curr.mood_score || 0), 0) / dLogLen) || 0

      const sLogLen = sLogs && sLogs.length > 0 ? sLogs.length : 1
      const avgSleepQuality = (sLogs?.reduce((acc, curr) => acc + (curr.quality_score || 0), 0) || 0) / sLogLen

      // For overall metrics, we look at average of recent months
      const currentMonthIndex = new Date().getMonth()
      const currentMonthWLogs = wLogs?.filter(d => new Date(d.workout_date).getMonth() === currentMonthIndex) || []
      const currentMonthMLogs = mLogs?.filter(d => new Date(d.log_date).getMonth() === currentMonthIndex) || []
      const currentMonthHLogs = hLogs?.filter(d => new Date(d.completed_date).getMonth() === currentMonthIndex) || []

      const fitnessScore = Math.min(100, Math.round((currentMonthWLogs.length / 16) * 100)) || 0
      const nutritionScore = Math.min(100, Math.round((currentMonthMLogs.length / 90) * 100)) || 0
      const habitsOverall = Math.min(100, Math.round((currentMonthHLogs.length / 30) * 100)) || 0

      const prodScore = Math.round(avgEnergy) || 0
      const focusScore = Math.round(avgFocus) || 0
      const sleepScore = Math.round(avgSleepQuality) || 0
      const recoveryScore = Math.round((sleepScore + fitnessScore) / 2)

      setMetrics({
        productivity: prodScore,
        sleep: sleepScore,
        fitness: fitnessScore,
        habits: habitsOverall,
        focus: focusScore,
        nutrition: nutritionScore,
        recovery: recoveryScore,
        mindset: Math.round(avgMood)
      })

      // Calculate Hourly Productivity from Tasks
      const hourCounts: Record<string, number> = {}
      const defaultHours = ['6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm']
      defaultHours.forEach(h => hourCounts[h] = 0)

      if (tasks && tasks.length > 0) {
        tasks.forEach((t: any) => {
           if (t.scheduled_time) {
             const hourInt = parseInt(t.scheduled_time.split(':')[0])
             let ampm = hourInt >= 12 ? 'pm' : 'am'
             let hour12 = hourInt % 12
             if (hour12 === 0) hour12 = 12
             const key = `${hour12}${ampm}`
             if (hourCounts[key] !== undefined) {
               hourCounts[key] += 1
             }
           }
        })
        
        // Normalize to 0-100 scale based on max tasks in an hour
        const maxTasks = Math.max(...Object.values(hourCounts), 1)
        const hourlyData = defaultHours.map(h => ({
           hour: h,
           score: Math.round((hourCounts[h] / maxTasks) * 100)
        }))
        setHourlyProductivity(hourlyData)
      } else {
        // Fallback to empty if no completed scheduled tasks
        setHourlyProductivity(defaultHours.map(h => ({ hour: h, score: 0 })))
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const radarData = [
    { subject: 'Productivity', A: metrics.productivity || 10 },
    { subject: 'Sleep Quality', A: metrics.sleep || 10 },
    { subject: 'Fitness', A: metrics.fitness || 10 },
    { subject: 'Habits', A: metrics.habits || 10 },
    { subject: 'Nutrition', A: metrics.nutrition || 10 },
    { subject: 'Focus', A: metrics.focus || 10 },
    { subject: 'Recovery', A: metrics.recovery || 10 },
    { subject: 'Mindset', A: metrics.mindset || 10 },
  ]

  const overallScore = Math.round(radarData.reduce((s, d) => s + d.A, 0) / radarData.length)

  const insights = [
    { title: 'Peak Performance Window', value: 'Dynamic', trend: 'Live', color: '#00d4ff', desc: 'Your cognitive performance peaks consistently during specific hours based on your completed tasks.' },
    { title: 'Sleep-Productivity Correlation', value: metrics.sleep > 70 ? 'High' : 'Moderate', trend: 'Live', color: '#6366f1', desc: 'Sleep quality directly correlates with next-day productivity scores. Ensure consistent rest.' },
    { title: 'Habit Consistency Streak', value: 'Active', trend: '+15%', color: '#00ff88', desc: 'Consistency compound effect: performance is better than baseline.' },
    { title: 'Burnout Risk', value: metrics.recovery < 50 ? 'High' : 'Low', trend: 'Live Data', color: metrics.recovery < 50 ? '#ff3366' : '#ffb800', desc: 'Recovery metrics indicate your current deep work balance with adequate rest.' },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>LIFE INTELLIGENCE SYSTEM</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>Analytics Engine</h1>
        </div>
        {loading ? (
           <Loader2 className="animate-spin text-blue-500" size={24} />
        ) : (
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 36, fontWeight: 800, color: '#00d4ff', textShadow: '0 0 20px rgba(0,212,255,0.5)' }}>
            {overallScore}<span style={{ fontSize: 14, color: '#4a6580' }}>/100</span>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Productivity', value: `${metrics.productivity}%`, icon: Brain, color: '#00d4ff', trend: 'live' },
          { label: 'Sleep Quality', value: `${metrics.sleep}%`, icon: Activity, color: '#6366f1', trend: 'live' },
          { label: 'Fitness Score', value: `${metrics.fitness}%`, icon: Zap, color: '#1a6fff', trend: 'live' },
          { label: 'Habits Score', value: `${metrics.habits}%`, icon: Target, color: '#00ff88', trend: 'live' },
          { label: 'Focus Score', value: `${metrics.focus}%`, icon: TrendingUp, color: '#ffb800', trend: 'live' },
        ].map((s, i) => (
          <div key={i} className="glass-card animate-fade-up" style={{ padding: 16, animationDelay: `${i * 50}ms` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <s.icon size={14} style={{ color: s.color }} />
              <span style={{ fontSize: 11, color: '#00ff88', fontWeight: 600 }}>{s.trend}</span>
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#8bacc8', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Monthly trends */}
        <div className="glass-card animate-fade-up" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 16, letterSpacing: '0.05em' }}>6-MONTH PERFORMANCE TRENDS</h2>
          <ResponsiveContainer width="100%" height={220}>
            {monthlyTrends.length > 0 ? (
              <LineChart data={monthlyTrends}>
                <XAxis dataKey="month" tick={{ fill: '#4a6580', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#4a6580', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(4,15,30,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10 }} />
                <Line type="monotone" dataKey="productivity" stroke="#00d4ff" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sleep" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="fitness" stroke="#1a6fff" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="habits" stroke="#00ff88" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="nutrition" stroke="#ffb800" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6580' }}>Loading trends...</div>
            )}
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            {[['#00d4ff', 'Productivity'], ['#6366f1', 'Sleep'], ['#1a6fff', 'Fitness'], ['#00ff88', 'Habits'], ['#ffb800', 'Nutrition']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 16, height: 2, background: c, borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: '#4a6580' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Radar */}
        <div className="glass-card animate-fade-up" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 8, letterSpacing: '0.05em' }}>LIFE BALANCE RADAR</h2>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(0,212,255,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#8bacc8', fontSize: 10 }} />
              <Radar name="Score" dataKey="A" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.12} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Productivity by hour */}
      <div className="glass-card animate-fade-up" style={{ padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 16, letterSpacing: '0.05em' }}>PRODUCTIVITY BY HOUR · CHRONOTYPE ANALYSIS</h2>
        {hourlyProductivity.length > 0 && hourlyProductivity.some(d => d.score > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={hourlyProductivity}>
              <defs>
                <linearGradient id="phGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffb800" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ffb800" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: '#4a6580', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#4a6580', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(4,15,30,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10 }} />
              <Area type="monotone" dataKey="score" stroke="#ffb800" strokeWidth={2} fill="url(#phGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6580', fontSize: 13 }}>
            No scheduled tasks completed yet. Complete tasks to map your chronotype.
          </div>
        )}
      </div>

      {/* AI Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {insights.map((ins, i) => (
          <div key={i} className="glass-card animate-fade-up" style={{ padding: 20, borderTop: `2px solid ${ins.color}`, animationDelay: `${i * 100}ms` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: ins.color, letterSpacing: '0.03em' }}>{ins.title}</div>
              <span style={{ fontSize: 11, color: '#00ff88' }}>{ins.trend}</span>
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 800, color: ins.color, marginBottom: 8 }}>{ins.value}</div>
            <p style={{ fontSize: 12, color: '#8bacc8', lineHeight: 1.5 }}>{ins.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
