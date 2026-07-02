'use client'
import { useState, useEffect } from 'react'
import { Moon, Star, Clock, TrendingUp, Plus, Brain, X } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { createClient } from '@/lib/supabase/client'

const sleepStages = [
  { name: 'Awake', duration: '0:15', percent: 3, color: '#ff3366' },
  { name: 'Light', duration: '2:45', percent: 38, color: '#8bacc8' },
  { name: 'Deep', duration: '2:00', percent: 27, color: '#1a6fff' },
  { name: 'REM', duration: '1:36', percent: 22, color: '#a855f7' },
  { name: 'Core', duration: '0:44', percent: 10, color: '#00d4ff' },
]

const tips = [
  'Your deep sleep peaks when you maintain a consistent 10 PM bedtime.',
  'REM sleep supports memory consolidation and creativity.',
  'Consider reducing screen time 90min before sleep to push quality score above 90.',
]

export default function SleepPage() {
  const [loading, setLoading] = useState(true)
  const [sleepData, setSleepData] = useState<any[]>([])
  const [metrics, setMetrics] = useState({
    avgDuration: 0,
    avgQuality: 0,
    lastNightStr: '--',
    lastNightScore: 0,
    trend: 0
  })
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [quickLogData, setQuickLogData] = useState({
    bedtime: '22:00',
    wake_time: '06:00',
    sleep_hours: 8,
    sleep_quality: 80,
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  // Auto calculate duration when times change
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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch last 7 days of sleep logs
      const { data: logs } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('sleep_date', { ascending: true })
        .limit(7)

      if (logs && logs.length > 0) {
        // Format for charts
        const formatted = logs.map(log => {
          const date = new Date(log.sleep_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return {
            date,
            hours: log.duration_hours,
            quality: log.quality_score,
            deep: (log.duration_hours * 0.25).toFixed(1), // Mocking deep/rem split based on duration
            rem: (log.duration_hours * 0.20).toFixed(1)
          }
        })
        setSleepData(formatted)

        // Calculate averages
        const totalH = logs.reduce((acc, curr) => acc + (curr.duration_hours || 0), 0)
        const totalQ = logs.reduce((acc, curr) => acc + (curr.quality_score || 0), 0)
        const avgD = totalH / logs.length
        const avgQ = totalQ / logs.length

        const last = logs[logs.length - 1]
        const hours = Math.floor(last.duration_hours || 0)
        const mins = Math.round(((last.duration_hours || 0) % 1) * 60)

        // Trend (mock logic: last night vs avg)
        const trendVal = last.quality_score ? Math.round(((last.quality_score - avgQ) / avgQ) * 100) : 0

        setMetrics({
          avgDuration: avgD,
          avgQuality: avgQ,
          lastNightStr: `${hours}h ${mins}m`,
          lastNightScore: last.quality_score || 0,
          trend: trendVal
        })
      }
    } catch (err) {
      console.error(err)
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

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>SLEEP OPTIMIZATION SYSTEM</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>Sleep Matrix</h1>
        </div>
        <button onClick={() => setShowQuickLog(true)} className="btn-primary" style={{ fontSize: 13 }}><Plus size={14} />Log Sleep</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { icon: Moon, label: 'Last Night', value: metrics.lastNightStr, sub: `Score: ${metrics.lastNightScore}%`, color: '#6366f1' },
          { icon: Star, label: 'Quality Score', value: `${Math.round(metrics.avgQuality)}%`, sub: '7-day avg', color: '#00d4ff' },
          { icon: Clock, label: 'Avg Duration', value: `${metrics.avgDuration.toFixed(1)}h`, sub: 'Goal: 8h', color: '#a855f7' },
          { icon: TrendingUp, label: 'Trend', value: `${metrics.trend > 0 ? '+' : ''}${metrics.trend}%`, sub: 'vs avg', color: metrics.trend >= 0 ? '#00ff88' : '#ff3366' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: 18 }}>
            <s.icon size={16} style={{ color: s.color, marginBottom: 8 }} />
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#8bacc8', marginTop: 2 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#4a6580', marginTop: 1 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Quality chart */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 16, letterSpacing: '0.05em' }}>SLEEP QUALITY TREND</h2>
          <ResponsiveContainer width="100%" height={200}>
            {sleepData.length > 0 ? (
              <AreaChart data={sleepData}>
                <defs>
                  <linearGradient id="sqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#4a6580', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#4a6580', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(4,15,30,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10 }} />
                <Area type="monotone" dataKey="quality" stroke="#6366f1" strokeWidth={2} fill="url(#sqGrad)" dot={{ fill: '#6366f1', r: 3 }} />
              </AreaChart>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#4a6580', fontSize: 13 }}>No data available. Log your sleep.</div>
            )}
          </ResponsiveContainer>
        </div>

        {/* Sleep stages */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 16, letterSpacing: '0.05em' }}>LAST NIGHT STAGES</h2>
          {/* Timeline bar */}
          <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
            {sleepStages.map((s, i) => (
              <div key={i} style={{ width: `${s.percent}%`, background: s.color, transition: 'width 0.5s' }} title={s.name} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sleepStages.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                  <span style={{ fontSize: 13, color: '#c8d8e8' }}>{s.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, color: s.color }}>{s.duration}</span>
                  <span style={{ fontSize: 11, color: '#4a6580' }}>{s.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hours chart */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 16, letterSpacing: '0.05em' }}>SLEEP ARCHITECTURE · 7 DAYS</h2>
        <ResponsiveContainer width="100%" height={200}>
          {sleepData.length > 0 ? (
            <BarChart data={sleepData} barSize={24} barGap={4}>
              <XAxis dataKey="date" tick={{ fill: '#4a6580', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a6580', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(4,15,30,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10 }} />
              <Bar dataKey="deep" fill="#1a6fff" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="rem" fill="#a855f7" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="hours" fill="rgba(0,212,255,0.1)" stackId="b" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#4a6580', fontSize: 13 }}>No data available. Log your sleep.</div>
          )}
        </ResponsiveContainer>
      </div>

      {/* AI Sleep insights */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Brain size={16} style={{ color: '#6366f1' }} />
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>SLEEP INTELLIGENCE</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10 }}>
              <Star size={13} style={{ color: '#6366f1', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: '#c8d8e8', lineHeight: 1.5 }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Log Modal */}
      {showQuickLog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowQuickLog(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 450, padding: 32, position: 'relative' }}>
             <button onClick={() => setShowQuickLog(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}><X size={20} /></button>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff', marginBottom: 24 }}>LOG SLEEP MATRIX</h2>
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
               
               <button type="submit" className="btn-primary" style={{ marginTop: 12, justifyContent: 'center', padding: 12 }}>SYNC DATA</button>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
