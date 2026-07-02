'use client'
import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, Clock, Flag, CheckCircle2, Circle, Zap, Trash2, Calendar as CalendarIcon, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5) // 5am to 10pm

const typeConfig: Record<string, { color: string; bg: string }> = {
  gym: { color: '#1a6fff', bg: 'rgba(26,111,255,0.15)' },
  work: { color: '#ffb800', bg: 'rgba(255,184,0,0.1)' },
  meal: { color: '#00ff88', bg: 'rgba(0,255,136,0.1)' },
  recovery: { color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  sleep: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  routine: { color: '#00d4ff', bg: 'rgba(0,212,255,0.1)' },
}

const priorityColors = { high: '#ff3366', medium: '#ffb800', low: '#00d4ff' }

export default function SchedulePage() {
  const [view, setView] = useState<'week' | 'day'>('week')
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'work',
    priority: 'medium',
    scheduled_date: new Date().toLocaleDateString('en-CA'),
    scheduled_time: '09:00',
    duration_minutes: 60
  })

  const supabase = createClient()
  const CELL_H = 50

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })
      
      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('tasks')
        .insert({
          ...newTask,
          user_id: user.id,
          scheduled_time: `${newTask.scheduled_time}:00`
        })
      
      if (error) throw error
      setShowAddModal(false)
      setNewTask({ ...newTask, title: '' })
      fetchTasks()
    } catch (err) {
      console.error('Error adding task:', err)
    }
  }

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: !currentStatus, completed_at: !currentStatus ? new Date().toISOString() : null })
        .eq('id', id)
      
      if (error) throw error
      fetchTasks()
    } catch (err) {
      console.error('Error toggling task:', err)
    }
  }

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      fetchTasks()
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  const today = new Date().toLocaleDateString('en-CA')
  const todayTasks = tasks.filter(t => t.scheduled_date === today)

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>LIFE SCHEDULING SYSTEM</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>Schedule</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ fontSize: 13 }}
          >
            <Plus size={14} />
            Add Entry
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Main List */}
        <div className="glass-card" style={{ padding: 24 }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, color: '#e8f4ff' }}>TIMELINE</h2>
             <span style={{ fontSize: 12, color: '#4a6580' }}>Showing all active schedules</span>
           </div>

           {loading ? (
             <div style={{ padding: '40px 0', textAlign: 'center', color: '#4a6580' }}>Initializing systems...</div>
           ) : tasks.length === 0 ? (
             <div style={{ padding: '40px 0', textAlign: 'center', color: '#4a6580' }}>
               <CalendarIcon size={40} style={{ opacity: 0.1, marginBottom: 12 }} />
               <p>No active schedules. Start by adding a task.</p>
             </div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               {tasks.map(task => (
                 <div key={task.id} style={{ 
                   display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', 
                   background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)',
                   borderRadius: 12, opacity: task.is_completed ? 0.6 : 1
                 }}>
                   <div style={{ width: 4, height: 32, background: typeConfig[task.category]?.color || '#00d4ff', borderRadius: 2 }} />
                   <div style={{ flex: 1 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e8f4ff', textDecoration: task.is_completed ? 'line-through' : 'none' }}>{task.title}</span>
                        <span style={{ fontSize: 10, padding: '2px 6px', background: `${priorityColors[task.priority as keyof typeof priorityColors]}20`, color: priorityColors[task.priority as keyof typeof priorityColors], borderRadius: 4, textTransform: 'uppercase' }}>
                          {task.priority}
                        </span>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4a6580' }}>
                          <Clock size={12} />
                          {task.scheduled_time?.slice(0, 5)} · {task.duration_minutes}m
                        </div>
                        <div style={{ fontSize: 11, color: '#4a6580' }}>
                          {task.scheduled_date}
                        </div>
                     </div>
                   </div>
                   <div style={{ display: 'flex', gap: 8 }}>
                     <button 
                        onClick={() => toggleComplete(task.id, task.is_completed)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                      >
                       {task.is_completed 
                         ? <CheckCircle2 size={18} style={{ color: '#00ff88' }} /> 
                         : <Circle size={18} style={{ color: '#4a6580' }} />
                       }
                     </button>
                     <button 
                        onClick={() => deleteTask(task.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#4a6580' }}
                      >
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, color: '#e8f4ff', marginBottom: 16 }}>TODAY'S SUMMARY</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#8bacc8' }}>Total Tasks</span>
                  <span style={{ color: '#00d4ff', fontWeight: 600 }}>{todayTasks.length}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#8bacc8' }}>Completed</span>
                  <span style={{ color: '#00ff88', fontWeight: 600 }}>{todayTasks.filter(t => t.is_completed).length}</span>
               </div>
               <div className="progress-bar" style={{ marginTop: 8 }}>
                 <div className="progress-fill" style={{ width: `${(todayTasks.filter(t => t.is_completed).length / (todayTasks.length || 1)) * 100}%` }} />
               </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(0,212,255,0.05), transparent)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
               <Zap size={16} style={{ color: '#00d4ff' }} />
               <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, color: '#e8f4ff' }}>AI OPTIMIZER</h3>
             </div>
             <p style={{ fontSize: 12, color: '#8bacc8', lineHeight: 1.6 }}>
               {todayTasks.length > 0 
                 ? "Analyzing your schedule... Productivity peak detected between 09:00 and 12:00."
                 : "No schedule data for today. Initialize tasks to receive optimization insights."
               }
             </p>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddModal(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 450, padding: 32, position: 'relative' }}>
             <button 
               onClick={() => setShowAddModal(false)}
               style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}
             >
               <X size={20} />
             </button>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff', marginBottom: 24 }}>NEW SCHEDULE ENTRY</h2>
             <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>TITLE</label>
                 <input 
                   className="danvers-input"
                   value={newTask.title}
                   onChange={e => setNewTask({...newTask, title: e.target.value})}
                   placeholder="e.g. Deep Work Sprint"
                   required
                 />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>CATEGORY</label>
                   <select 
                     className="danvers-input"
                     value={newTask.category}
                     onChange={e => setNewTask({...newTask, category: e.target.value})}
                     style={{ appearance: 'none' }}
                   >
                     {Object.keys(typeConfig).map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                   </select>
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>PRIORITY</label>
                   <select 
                     className="danvers-input"
                     value={newTask.priority}
                     onChange={e => setNewTask({...newTask, priority: e.target.value})}
                   >
                     <option value="low">LOW</option>
                     <option value="medium">MEDIUM</option>
                     <option value="high">HIGH</option>
                   </select>
                 </div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>DATE</label>
                   <input 
                     type="date"
                     className="danvers-input"
                     value={newTask.scheduled_date}
                     onChange={e => setNewTask({...newTask, scheduled_date: e.target.value})}
                     required
                   />
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>TIME</label>
                   <input 
                     type="time"
                     className="danvers-input"
                     value={newTask.scheduled_time}
                     onChange={e => setNewTask({...newTask, scheduled_time: e.target.value})}
                     required
                   />
                 </div>
               </div>
               <button type="submit" className="btn-primary" style={{ marginTop: 12, justifyContent: 'center', padding: 12 }}>
                 INITIALIZE ENTRY
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
