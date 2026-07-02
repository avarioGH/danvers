'use client'
import { useState, useEffect } from 'react'
import { Target, Plus, TrendingUp, CheckCircle2, Circle, Zap, Calendar, X, Trash2, Edit3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const categories = ['all', 'fitness', 'productivity', 'mindset', 'finance', 'health']
const priorityColors = { high: '#ff3366', medium: '#ffb800', low: '#00d4ff' }

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  
  // Progress updating
  const [progressInput, setProgressInput] = useState<string>('')
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    category: 'fitness',
    priority: 'medium',
    target_value: 100,
    current_value: 0,
    unit: '%',
    deadline: '',
    color: '#00d4ff'
  })

  const supabase = createClient()

  useEffect(() => {
    fetchGoals()
  }, [])

  // Sync progress input when selected changes
  useEffect(() => {
    if (selected) {
      setProgressInput(selected.current_value.toString())
    }
  }, [selected])

  const fetchGoals = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('status', 'active')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
      
      if (error) throw error
      setGoals(data || [])
      
      // If we have data and no selected item, pick the first one
      if (data && data.length > 0) {
        if (!selected || !data.find(g => g.id === selected.id)) {
          setSelected(data[0])
        } else {
          // Refresh selected goal data
          setSelected(data.find(g => g.id === selected.id))
        }
      } else {
        setSelected(null)
      }
    } catch (err) {
      console.error('Error fetching goals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('goals').insert({
        ...newGoal,
        user_id: user.id,
        status: 'active'
      })
      
      if (error) throw error
      
      setShowAddModal(false)
      setNewGoal({ title: '', category: 'fitness', priority: 'medium', target_value: 100, current_value: 0, unit: '%', deadline: '', color: '#00d4ff' })
      fetchGoals()
    } catch (err) {
      console.error('Error adding goal:', err)
      alert("Failed to add goal.")
    }
  }

  const updateProgress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const val = parseFloat(progressInput)
    if (isNaN(val)) return

    try {
      const { error } = await supabase
        .from('goals')
        .update({ current_value: val })
        .eq('id', selected.id)

      if (error) throw error
      
      // Optimistic update
      setSelected({ ...selected, current_value: val })
      fetchGoals()
    } catch (err) {
      console.error('Error updating progress:', err)
      alert("Failed to update progress.")
    }
  }

  const archiveGoal = async (id: string) => {
    if (!confirm('Are you sure you want to archive this goal?')) return
    try {
      const { error } = await supabase.from('goals').update({ status: 'archived' }).eq('id', id)
      if (error) throw error
      
      if (selected?.id === id) setSelected(null)
      fetchGoals()
    } catch (err) {
      console.error('Error archiving goal:', err)
      alert("Failed to archive goal.")
    }
  }

  const filtered = filter === 'all' ? goals : goals.filter(g => g.category === filter)
  const avgProgress = goals.length > 0 
    ? Math.round(goals.reduce((s, g) => s + (g.current_value / g.target_value * 100), 0) / goals.length) 
    : 0

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>GOAL MANAGEMENT SYSTEM</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>Goal Engine</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 800, color: '#00d4ff' }}>
            {avgProgress}<span style={{ fontSize: 12, color: '#4a6580' }}>% avg</span>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: 13 }}><Plus size={14} />New Goal</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: 'none',
              background: filter === cat ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.05)',
              color: filter === cat ? '#00d4ff' : '#8bacc8',
              textTransform: 'capitalize', transition: 'all 0.2s',
              outline: filter === cat ? '1px solid rgba(0,212,255,0.3)' : 'none',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Goal cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
             <p style={{ color: '#4a6580', textAlign: 'center', padding: 20 }}>Scanning mission objectives...</p>
          ) : filtered.length === 0 ? (
             <p style={{ color: '#4a6580', textAlign: 'center', padding: 20 }}>No active objectives found.</p>
          ) : (
            filtered.map(goal => {
              const progress = Math.round((goal.current_value / goal.target_value) * 100) || 0
              return (
                <div
                  key={goal.id}
                  onClick={() => setSelected(goal)}
                  className="glass-card"
                  style={{
                    padding: 20, cursor: 'pointer',
                    borderLeft: `3px solid ${selected?.id === goal.id ? (goal.color || '#00d4ff') : 'transparent'}`,
                    background: selected?.id === goal.id ? `${goal.color || '#00d4ff'}08` : undefined,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <h3 style={{ fontWeight: 700, color: '#e8f4ff', fontSize: 15 }}>{goal.title}</h3>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: `${priorityColors[goal.priority as keyof typeof priorityColors] || '#00d4ff'}15`, color: priorityColors[goal.priority as keyof typeof priorityColors] || '#00d4ff', border: `1px solid ${priorityColors[goal.priority as keyof typeof priorityColors] || '#00d4ff'}30`, textTransform: 'capitalize' }}>
                          {goal.priority}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: '#8bacc8' }}>
                          <Target size={11} style={{ display: 'inline', marginRight: 4, color: goal.color || '#00d4ff' }} />
                          {goal.target_value} {goal.unit}
                        </div>
                        <div style={{ fontSize: 12, color: '#8bacc8' }}>
                          <Calendar size={11} style={{ display: 'inline', marginRight: 4, color: '#4a6580' }} />
                          {goal.deadline || 'No deadline'}
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${(goal.color || '#00d4ff')}88, ${goal.color || '#00d4ff'})` }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 800, color: goal.color || '#00d4ff', flexShrink: 0 }}>
                      {progress}%
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Goal detail */}
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 16, letterSpacing: '0.05em' }}>GOAL DETAIL</h3>

              <div style={{ width: 120, height: 120, margin: '0 auto 20px', position: 'relative' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 800, color: selected.color || '#00d4ff' }}>
                        {Math.round((selected.current_value / selected.target_value) * 100)}%
                     </span>
                  </div>
              </div>

              <h4 style={{ fontWeight: 700, color: '#e8f4ff', fontSize: 15, textAlign: 'center', marginBottom: 6 }}>{selected.title}</h4>
              <p style={{ fontSize: 12, color: '#4a6580', textAlign: 'center', marginBottom: 16 }}>{selected.current_value}/{selected.target_value} {selected.unit} · {selected.deadline || 'Ongoing'}</p>

              <div className="danvers-divider" style={{ marginBottom: 16 }} />

              <form onSubmit={updateProgress} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                 <input 
                   type="number" 
                   className="danvers-input" 
                   value={progressInput}
                   onChange={(e) => setProgressInput(e.target.value)}
                   style={{ flex: 1, padding: '8px 12px' }}
                   placeholder={`Current ${selected.unit}`}
                   step="any"
                 />
                 <button type="submit" className="btn-primary" style={{ padding: '8px 14px' }}>
                    <Edit3 size={14} /> Update
                 </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                 <button onClick={() => archiveGoal(selected.id)} className="btn-secondary" style={{ color: '#ff3366', borderColor: '#ff336620' }}>
                    <Trash2 size={14} /> Archive Goal
                 </button>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Zap size={13} style={{ color: '#00d4ff' }} />
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, color: '#e8f4ff', fontWeight: 700 }}>DANVERS ANALYSIS</span>
              </div>
              <p style={{ fontSize: 12, color: '#8bacc8', lineHeight: 1.6 }}>
                Probability of achievement remains high. System recommends maintaining current focus levels on {selected.category} protocols.
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: '#4a6580' }}>
             Select an objective for deep analysis.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddModal(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 450, padding: 32, position: 'relative' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}><X size={20} /></button>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff', marginBottom: 24 }}>NEW MISSION OBJECTIVE</h2>
             <form onSubmit={handleAddGoal} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>TITLE</label>
                 <input className="danvers-input" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} placeholder="e.g. Muscle Up Mastery" required />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>CATEGORY</label>
                   <select className="danvers-input" value={newGoal.category} onChange={e => setNewGoal({...newGoal, category: e.target.value})}>
                     {categories.slice(1).map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                   </select>
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>PRIORITY</label>
                   <select className="danvers-input" value={newGoal.priority} onChange={e => setNewGoal({...newGoal, priority: e.target.value})}>
                     <option value="low">LOW</option>
                     <option value="medium">MEDIUM</option>
                     <option value="high">HIGH</option>
                   </select>
                 </div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>TARGET VALUE</label>
                   <input type="number" className="danvers-input" value={newGoal.target_value} onChange={e => setNewGoal({...newGoal, target_value: parseInt(e.target.value) || 0})} />
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>UNIT</label>
                   <input className="danvers-input" value={newGoal.unit} onChange={e => setNewGoal({...newGoal, unit: e.target.value})} placeholder="e.g. reps, kg, %" />
                 </div>
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>DEADLINE</label>
                 <input type="date" className="danvers-input" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} />
               </div>
               <button type="submit" className="btn-primary" style={{ marginTop: 12, justifyContent: 'center', padding: 12 }}>INITIALIZE OBJECTIVE</button>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
