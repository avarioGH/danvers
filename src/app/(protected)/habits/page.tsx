'use client'
import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Flame, Plus, X, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

const categories = ['all', 'routine', 'fitness', 'mindset', 'dopamine', 'productivity', 'nutrition', 'sleep']

export default function HabitsPage() {
  const [filter, setFilter] = useState('all')
  const [habitList, setHabitList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newHabit, setNewHabit] = useState({ name: '', category: 'routine', color: '#00d4ff' })

  const supabase = createClient()
  const today = new Date().toLocaleDateString('en-CA')

  useEffect(() => {
    fetchHabits()
  }, [])

  const fetchHabits = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*, habit_logs(id)')
        .eq('is_active', true)
        .eq('habit_logs.completed_date', today)
      
      if (error) throw error
      
      setHabitList(data?.map(h => ({
        ...h,
        done: h.habit_logs?.length > 0
      })) || [])
    } catch (err) {
      console.error('Error fetching habits:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleHabit = async (habitId: string, currentStatus: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!currentStatus) {
        // Mark as done
        await supabase.from('habit_logs').insert({
          habit_id: habitId,
          user_id: user.id,
          completed_date: today
        })
      } else {
        // Mark as undone
        await supabase.from('habit_logs').delete()
          .eq('habit_id', habitId)
          .eq('completed_date', today)
      }
      fetchHabits()
    } catch (err) {
      console.error('Error toggling habit:', err)
    }
  }

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('habits').insert({
        ...newHabit,
        user_id: user.id
      })
      setShowAddModal(false)
      setNewHabit({ name: '', category: 'routine', color: '#00d4ff' })
      fetchHabits()
    } catch (err) {
      console.error('Error adding habit:', err)
    }
  }

  const deleteHabit = async (id: string) => {
    try {
      await supabase.from('habits').update({ is_active: false }).eq('id', id)
      fetchHabits()
    } catch (err) {
      console.error('Error deleting habit:', err)
    }
  }

  const filtered = filter === 'all' ? habitList : habitList.filter(h => h.category === filter)
  const completed = habitList.filter(h => h.done).length
  const score = habitList.length > 0 ? Math.round((completed / habitList.length) * 100) : 0

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>HABIT OPTIMIZATION SYSTEM</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>Habit Matrix</h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: 13 }}><Plus size={14} />Add Habit</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Today Score', value: `${score}%`, color: score >= 80 ? '#00ff88' : score >= 60 ? '#ffb800' : '#ff3366' },
          { label: 'Completed', value: `${completed}/${habitList.length}`, color: '#00d4ff' },
          { label: 'Active Habits', value: habitList.length, color: '#ffb800' },
          { label: 'System Health', value: 'OPTIMAL', color: '#a855f7' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#8bacc8', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: 'none',
                background: filter === cat ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.05)',
                color: filter === cat ? '#00d4ff' : '#8bacc8',
                textTransform: 'capitalize', transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#4a6580' }}>Loading habit circuits...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#4a6580' }}>No habits found in this category.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtered.map(h => (
              <div
                key={h.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: h.done ? 'rgba(0,255,136,0.04)' : 'rgba(0,212,255,0.03)',
                  border: `1px solid ${h.done ? 'rgba(0,255,136,0.15)' : 'rgba(0,212,255,0.08)'}`,
                  borderRadius: 12, cursor: 'default', transition: 'all 0.2s',
                }}
              >
                <button 
                  onClick={() => toggleHabit(h.id, h.done)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {h.done
                    ? <CheckCircle2 size={20} style={{ color: '#00ff88', flexShrink: 0 }} />
                    : <Circle size={20} style={{ color: '#4a6580', flexShrink: 0 }} />
                  }
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: h.done ? '#c8d8e8' : '#e8f4ff' }}>{h.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: h.color || '#00d4ff' }} />
                    <span style={{ fontSize: 10, color: '#4a6580', textTransform: 'capitalize' }}>{h.category}</span>
                  </div>
                </div>
                <button onClick={() => deleteHabit(h.id)} style={{ background: 'none', border: 'none', color: '#2a3a4a', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddModal(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 400, padding: 32, position: 'relative' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}><X size={20} /></button>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff', marginBottom: 24 }}>INITIALIZE NEW HABIT</h2>
             <form onSubmit={handleAddHabit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>HABIT NAME</label>
                 <input className="danvers-input" value={newHabit.name} onChange={e => setNewHabit({...newHabit, name: e.target.value})} placeholder="e.g. Read 30 mins" required />
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>CATEGORY</label>
                 <select className="danvers-input" value={newHabit.category} onChange={e => setNewHabit({...newHabit, category: e.target.value})}>
                   {categories.slice(1).map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                 </select>
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>THEME COLOR</label>
                 <input type="color" className="danvers-input" value={newHabit.color} onChange={e => setNewHabit({...newHabit, color: e.target.value})} style={{ height: 40, padding: 4 }} />
               </div>
               <button type="submit" className="btn-primary" style={{ marginTop: 12, justifyContent: 'center', padding: 12 }}>CREATE HABIT CIRCUIT</button>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
