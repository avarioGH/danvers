'use client'
import { useState, useEffect } from 'react'
import { Dumbbell, TrendingUp, Plus, CheckCircle2, Zap, Activity, BarChart3, Target, X, Trash2, Brain, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

const typeColors: Record<string, string> = {
  Pull: '#1a6fff', Push: '#00d4ff', Legs: '#00ff88', Rest: '#4a6580', Gym: '#00d4ff', Calisthenics: '#ffb800', Other: '#a855f7'
}

export default function WorkoutPage() {
  const [workouts, setWorkouts] = useState<any[]>([])
  const [prs, setPrs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newWorkout, setNewWorkout] = useState({
    name: '',
    workout_type: 'Pull',
    duration_minutes: 60,
    notes: ''
  })

  // AI Workout state
  const [showGenModal, setShowGenModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genParams, setGenParams] = useState({ intensity: 'Medium', type: 'Gym' })
  const [aiWorkout, setAiWorkout] = useState<any>(null)

  const supabase = createClient()
  const today = new Date().toLocaleDateString('en-CA')

  useEffect(() => {
    fetchWorkouts()
    fetchPRs()
  }, [])

  const fetchWorkouts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*, exercise_logs(*)')
        .order('workout_date', { ascending: false })
        .limit(10)
      
      if (error) throw error
      setWorkouts(data || [])
    } catch (err) {
      console.error('Error fetching workouts:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPRs = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('is_pr', true)
        .order('weight_kg', { ascending: false })
      
      if (error) throw error
      setPrs(data || [])
    } catch (err) {
      console.error('Error fetching PRs:', err)
    }
  }

  const handleAddWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('workouts')
        .insert({
          ...newWorkout,
          user_id: user.id,
          workout_date: today
        })
        .select()
      
      if (error) throw error
      setShowAddModal(false)
      setNewWorkout({ name: '', workout_type: 'Pull', duration_minutes: 60, notes: '' })
      fetchWorkouts()
    } catch (err) {
      console.error('Error adding workout:', err)
    }
  }

  const handleGenerateWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    try {
      let apiKey = ''
      try {
        const savedConfig = localStorage.getItem('danvers_config')
        if (savedConfig) apiKey = JSON.parse(savedConfig).geminiKey || ''
      } catch (e) {}

      const response = await fetch('/api/workout/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...genParams, apiKey })
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to generate')
      }
      const data = await response.json()
      setAiWorkout(data)
      setShowGenModal(false)
    } catch (err: any) {
      console.error('Generation error', err)
      alert(err.message || 'Failed to generate workout.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>PHYSICAL OPTIMIZATION SYSTEM</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>Workout Engine</h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowGenModal(true)} className="btn-secondary" style={{ fontSize: 13, borderColor: 'rgba(0,212,255,0.4)', color: '#00d4ff' }}>
            <Brain size={14} />AI Schedule
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: 13 }}>
            <Plus size={14} />Log Workout
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Workouts Logged', value: workouts.length, unit: '', color: '#00d4ff', icon: Activity },
          { label: 'PRs Achieved', value: prs.length, unit: '', color: '#00ff88', icon: TrendingUp },
          { label: 'Active Streak', value: '0', unit: 'days', color: '#ffb800', icon: Zap },
          { label: 'Volume Index', value: 'STABLE', unit: '', color: '#a855f7', icon: Dumbbell },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: 16 }}>
            <s.icon size={16} style={{ color: s.color, marginBottom: 8 }} />
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}<span style={{ fontSize: 11, color: '#4a6580', marginLeft: 3 }}>{s.unit}</span></div>
            <div style={{ fontSize: 12, color: '#8bacc8', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI Recommended Workout */}
      {aiWorkout && (
        <div className="glass-card animate-fade-down" style={{ padding: 24, marginBottom: 24, border: '1px solid rgba(0,212,255,0.3)', background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(26,111,255,0.05))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Brain size={20} style={{ color: '#00d4ff' }} />
                <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 700, color: '#e8f4ff' }}>{aiWorkout.title}</h2>
             </div>
             <div style={{ fontSize: 12, color: '#00d4ff', background: 'rgba(0,212,255,0.1)', padding: '4px 10px', borderRadius: 20 }}>
               {aiWorkout.estimated_minutes} MINS EST.
             </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {aiWorkout.routine?.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                 <div>
                   <div style={{ fontSize: 14, color: '#e8f4ff', fontWeight: 600, marginBottom: 4 }}>{item.exercise}</div>
                   <div style={{ fontSize: 11, color: '#8bacc8' }}>{item.notes}</div>
                 </div>
                 <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#00ff88' }}>
                   {item.sets} x {item.reps}
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Recent workouts */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 16, letterSpacing: '0.05em' }}>RECENT MISSIONS</h2>
          {loading ? (
             <p style={{ color: '#4a6580', textAlign: 'center' }}>Scanning logs...</p>
          ) : workouts.length === 0 ? (
             <p style={{ color: '#4a6580', textAlign: 'center' }}>No workouts recorded. Initialize first session.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {workouts.map(w => (
                <div key={w.id} style={{ padding: '12px 16px', background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)', borderRadius: 12 }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <div style={{ width: 8, height: 8, borderRadius: 2, background: typeColors[w.workout_type] || '#00d4ff' }} />
                       <span style={{ fontWeight: 600, color: '#e8f4ff', fontSize: 14 }}>{w.name}</span>
                     </div>
                     <span style={{ fontSize: 11, color: '#4a6580' }}>{w.workout_date}</span>
                   </div>
                   <div style={{ fontSize: 12, color: '#8bacc8', marginBottom: 8 }}>{w.notes || 'No mission notes recorded.'}</div>
                   <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: 10, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{w.duration_minutes} MINS</span>
                      <span style={{ fontSize: 10, color: '#4a6580' }}>{w.exercise_logs?.length || 0} EXERCISES</span>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PR Tracker */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 16, letterSpacing: '0.05em' }}>PERSONAL RECORDS</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {prs.length > 0 ? prs.map((pr, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={13} style={{ color: '#00ff88' }} />
                    <span style={{ fontSize: 13, color: '#c8d8e8', fontWeight: 500 }}>{pr.exercise_name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#00ff88' }}>
                       {pr.weight_kg ? `${pr.weight_kg}kg` : `${pr.reps} reps`}
                    </span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '100%', background: '#00ff8830' }} />
                </div>
              </div>
            )) : (
              <p style={{ color: '#4a6580', fontSize: 12, textAlign: 'center' }}>No PRs established yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Generate AI Workout Modal */}
      {showGenModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => !generating && setShowGenModal(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 450, padding: 32, position: 'relative' }}>
             {!generating && <button onClick={() => setShowGenModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}><X size={20} /></button>}
             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Brain size={24} style={{ color: '#00d4ff' }} />
                <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff' }}>DANVERS AI SCHEDULE</h2>
             </div>
             
             {generating ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                   <Loader2 size={32} className="animate-spin" style={{ color: '#00d4ff', margin: '0 auto 16px' }} />
                   <p style={{ color: '#8bacc8', fontSize: 14 }}>Synthesizing optimal training protocol...</p>
                </div>
             ) : (
               <form onSubmit={handleGenerateWorkout} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 
                 <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>INTENSITY LEVEL</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                       {['Easy', 'Medium', 'Hard'].map(level => (
                         <div 
                           key={level}
                           onClick={() => setGenParams({...genParams, intensity: level})}
                           style={{ 
                             padding: '10px', textAlign: 'center', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                             background: genParams.intensity === level ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
                             border: `1px solid ${genParams.intensity === level ? '#00d4ff' : 'transparent'}`,
                             color: genParams.intensity === level ? '#00d4ff' : '#8bacc8'
                           }}
                         >
                           {level}
                         </div>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>TRAINING MODALITY</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                       {['Gym', 'Calisthenics', 'Other'].map(type => (
                         <div 
                           key={type}
                           onClick={() => setGenParams({...genParams, type: type})}
                           style={{ 
                             padding: '10px', textAlign: 'center', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                             background: genParams.type === type ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.03)',
                             border: `1px solid ${genParams.type === type ? '#00ff88' : 'transparent'}`,
                             color: genParams.type === type ? '#00ff88' : '#8bacc8'
                           }}
                         >
                           {type}
                         </div>
                       ))}
                    </div>
                 </div>

                 <button type="submit" className="btn-primary" style={{ marginTop: 12, justifyContent: 'center', padding: 12 }}>GENERATE MISSION</button>
               </form>
             )}
          </div>
        </div>
      )}

      {/* Add Workout Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddModal(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 450, padding: 32, position: 'relative' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}><X size={20} /></button>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff', marginBottom: 24 }}>LOG TRAINING SESSION</h2>
             <form onSubmit={handleAddWorkout} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>SESSION NAME</label>
                 <input className="danvers-input" value={newWorkout.name} onChange={e => setNewWorkout({...newWorkout, name: e.target.value})} placeholder="e.g. Morning Pull Day" required />
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>TRAINING FOCUS</label>
                 <select className="danvers-input" value={newWorkout.workout_type} onChange={e => setNewWorkout({...newWorkout, workout_type: e.target.value})}>
                   <option value="Pull">PULL</option>
                   <option value="Push">PUSH</option>
                   <option value="Legs">LEGS</option>
                   <option value="Full Body">FULL BODY</option>
                   <option value="Skill">SKILL / MOBILITY</option>
                 </select>
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>DURATION (MINS)</label>
                 <input type="number" className="danvers-input" value={newWorkout.duration_minutes} onChange={e => setNewWorkout({...newWorkout, duration_minutes: parseInt(e.target.value) || 0})} />
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>SESSION NOTES</label>
                 <textarea className="danvers-input" style={{ minHeight: 80, padding: 12 }} value={newWorkout.notes} onChange={e => setNewWorkout({...newWorkout, notes: e.target.value})} placeholder="How was the energy? Any fatigue?" />
               </div>
               <button type="submit" className="btn-primary" style={{ marginTop: 12, justifyContent: 'center', padding: 12 }}>INITIALIZE LOGGING</button>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
