'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Sparkles, Loader2, Calendar, User, Clock, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)

  // New task form
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assigneeId, setAssigneeId] = useState('')
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0])

  // AI form
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId])

  const fetchProjectData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch project details
      const pRes = await supabase.from('projects').select('*').eq('id', projectId).single()
      if (pRes.data) setProject(pRes.data)

      // Fetch users for assignment dropdown
      const uRes = await supabase.from('user_profiles').select('id, name, email')
      if (uRes.data) setUsers(uRes.data)

      // Fetch tasks for this project
      const tRes = await supabase.from('tasks').select('*, assigned_to_user:user_profiles!assigned_to(name, email)').eq('project_id', projectId).order('created_at', { ascending: false })
      if (tRes.data) setTasks(tRes.data)
      
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from('tasks').insert({
      user_id: user.id, // The creator
      project_id: projectId,
      title: title,
      description: desc,
      priority: priority,
      assigned_to: assigneeId || user.id, // Default to self
      scheduled_date: deadline || null
    }).select('*, assigned_to_user:user_profiles!assigned_to(name, email)').single()

    if (error) {
      alert('Failed to create task: ' + error.message)
      return
    }

    if (data) {
      setTasks([data, ...tasks])
      setShowTaskModal(false)
      setTitle('')
      setDesc('')
      setAssigneeId('')
      setDeadline('')
    }
  }

  const toggleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    if (!isCompleted) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime)
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.4)
      } catch (err) {}
    }

    const { error } = await supabase.from('tasks').update({ 
      is_completed: !isCompleted,
      completed_at: !isCompleted ? new Date().toISOString() : null
    }).eq('id', taskId)

    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, is_completed: !isCompleted } : t))
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskId))
    } else {
      alert('Cannot delete this task. You might not be the creator.')
    }
  }

  const handleAIGeneration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiPrompt.trim()) return

    setAiLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not logged in")

      const res = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          projectId,
          creatorId: user.id,
          users: users // Pass users so AI can assign them
        })
      })

      if (!res.ok) throw new Error('AI Generation failed')
      
      const newTasks = await res.json()
      // Insert tasks into DB
      const { data, error } = await supabase.from('tasks').insert(newTasks).select('*, assigned_to_user:user_profiles!assigned_to(name, email)')
      if (error) throw error

      if (data) {
        setTasks([...data, ...tasks])
        setShowAiModal(false)
        setAiPrompt('')
      }
    } catch (err: any) {
      console.error(err)
      alert('AI Task Generation failed: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Loader2 className="animate-spin text-blue-500" size={32} /></div>
  }

  if (!project) {
    return <div style={{ textAlign: 'center', padding: 100 }}>Project not found.</div>
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Link href="/workspace" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#8bacc8', textDecoration: 'none', marginBottom: 24, fontSize: 13 }}>
        <ArrowLeft size={16} /> Back to Workspace
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 700, color: '#00d4ff', marginBottom: 8 }}>{project.name}</h1>
          <p style={{ color: '#8bacc8', fontSize: 14 }}>{project.description || 'No description provided'}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowAiModal(true)} className="btn-secondary" style={{ background: 'rgba(255,51,102,0.1)', borderColor: 'rgba(255,51,102,0.3)', color: '#ff3366' }}>
            <Sparkles size={16} /> AI Auto-Generate
          </button>
          <button onClick={() => setShowTaskModal(true)} className="btn-primary">
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e8f4ff', marginBottom: 16 }}>Project To-Do List</h2>
        
        {tasks.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8bacc8' }}>
            <p>No tasks in this project yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px', background: t.is_completed ? 'rgba(0,255,136,0.05)' : 'rgba(4,15,30,0.5)', border: '1px solid', borderColor: t.is_completed ? 'rgba(0,255,136,0.2)' : 'rgba(0,212,255,0.1)', borderRadius: 12, transition: 'all 0.2s', opacity: t.is_completed ? 0.6 : 1 }}>
                <input 
                  type="checkbox" 
                  checked={t.is_completed}
                  onChange={() => toggleTaskCompletion(t.id, t.is_completed)}
                  style={{ width: 20, height: 20, cursor: 'pointer', marginTop: 4 }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: t.is_completed ? '#8bacc8' : '#e8f4ff', textDecoration: t.is_completed ? 'line-through' : 'none', marginBottom: 4 }}>{t.title}</h3>
                  {t.description && <p style={{ fontSize: 13, color: '#8bacc8', marginBottom: 12 }}>{t.description}</p>}
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace' }}>
                    {t.assigned_to_user && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00d4ff' }}>
                        <User size={14} /> Assigned to: {t.assigned_to_user.name || t.assigned_to_user.email}
                      </span>
                    )}
                    {t.scheduled_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ffb800' }}>
                        <Calendar size={14} /> Due: {t.scheduled_date}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.priority === 'high' ? '#ff3366' : t.priority === 'medium' ? '#ffb800' : '#8bacc8' }}>
                      Priority: {t.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', color: '#ff3366', opacity: 0.5, cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Task Modal */}
      {showTaskModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowTaskModal(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 500, padding: 32, position: 'relative' }}>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff', marginBottom: 24 }}>CREATE TASK</h2>
             <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>TASK TITLE</label>
                 <input type="text" className="danvers-input" value={title} onChange={e => setTitle(e.target.value)} required />
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>DESCRIPTION</label>
                 <textarea className="danvers-input" value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>ASSIGNEE</label>
                   <select className="danvers-input" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                     <option value="">-- Assign to User --</option>
                     {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                   </select>
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>PRIORITY</label>
                   <select className="danvers-input" value={priority} onChange={e => setPriority(e.target.value)}>
                     <option value="low">Low</option>
                     <option value="medium">Medium</option>
                     <option value="high">High</option>
                   </select>
                 </div>
               </div>

               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>DEADLINE</label>
                 <input type="date" className="danvers-input" value={deadline} onChange={e => setDeadline(e.target.value)} />
               </div>

               <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                 <button type="button" onClick={() => setShowTaskModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                 <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Create Task</button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {showAiModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAiModal(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 500, padding: 32, position: 'relative', border: '1px solid rgba(255,51,102,0.3)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
               <Sparkles style={{ color: '#ff3366' }} />
               <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff' }}>AI TASK GENERATOR</h2>
             </div>
             
             <p style={{ fontSize: 13, color: '#8bacc8', marginBottom: 24 }}>
               Tell the AI what this project is about, and it will automatically generate a structured to-do list and assign them.
             </p>

             <form onSubmit={handleAIGeneration} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>PROMPT</label>
                 <textarea 
                   className="danvers-input" 
                   value={aiPrompt} 
                   onChange={e => setAiPrompt(e.target.value)} 
                   rows={4} 
                   required
                   placeholder="e.g. Buatkan tugas untuk membuat sistem login, assign ke backend dev..." 
                 />
               </div>
               
               <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                 <button type="button" onClick={() => setShowAiModal(false)} className="btn-secondary" disabled={aiLoading} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                 <button type="submit" className="btn-primary" disabled={aiLoading} style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #ff3366, #ff8833)' }}>
                   {aiLoading ? <Loader2 className="animate-spin" size={16} /> : 'Generate Magic'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
