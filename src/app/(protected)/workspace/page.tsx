'use client'
import { useState, useEffect } from 'react'
import { Plus, Users, FolderKanban, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function WorkspacePage() {
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [resUsers, resProjects] = await Promise.all([
        supabase.from('user_profiles').select('id, name, email, avatar_url'),
        supabase.from('projects').select('*, created_by_user:user_profiles!created_by(name)').order('created_at', { ascending: false })
      ])

      if (resUsers.data) setUsers(resUsers.data)
      if (resProjects.data) setProjects(resProjects.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from('projects').insert({
      name: newProjectName,
      description: newProjectDesc,
      created_by: user.id
    }).select().single()

    if (error) {
      console.error(error)
      alert('Failed to create project. Have you run the SQL migration script?')
      return
    }

    if (data) {
      setProjects([data, ...projects])
      setShowNewProject(false)
      setNewProjectName('')
      setNewProjectDesc('')
      router.push(`/workspace/${data.id}`)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>TEAM COLLABORATION</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>Workspace</h1>
        </div>
        <button onClick={() => setShowNewProject(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
          <Plus size={16} /> New Project
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        
        {/* Main: Projects */}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#8bacc8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderKanban size={16} /> ACTIVE PROJECTS
          </h2>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="animate-spin text-blue-500" /></div>
          ) : projects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {projects.map(p => (
                <Link key={p.id} href={`/workspace/${p.id}`} className="glass-card animate-fade-up" style={{ padding: 20, display: 'block', textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#00d4ff', marginBottom: 4 }}>{p.name}</h3>
                      <p style={{ fontSize: 13, color: '#8bacc8', marginBottom: 12 }}>{p.description || 'No description'}</p>
                      <div style={{ fontSize: 11, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace' }}>
                        Created by {p.created_by_user?.name || 'Unknown'} · {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <ChevronRight size={20} style={{ color: '#4a6580' }} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: '#8bacc8' }}>
              <FolderKanban size={32} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>No projects found in this workspace.</p>
              <button onClick={() => setShowNewProject(true)} className="btn-secondary" style={{ marginTop: 16 }}>Create First Project</button>
            </div>
          )}
        </div>

        {/* Sidebar: Users */}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#8bacc8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} /> TEAM MEMBERS
          </h2>
          <div className="glass-card" style={{ padding: 16 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 20 }}><Loader2 size={16} className="animate-spin text-blue-500 mx-auto" /></div>
            ) : users.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {users.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(0,212,255,0.05)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(26,111,255,0.4), rgba(0,212,255,0.2))', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', fontSize: 12, fontWeight: 600 }}>
                      {u.name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#e8f4ff', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.name || 'Unnamed User'}</div>
                      <div style={{ fontSize: 11, color: '#4a6580', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: '#4a6580' }}>No members found.</p>
            )}
          </div>
        </div>

      </div>

      {showNewProject && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowNewProject(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 450, padding: 32, position: 'relative' }}>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff', marginBottom: 24 }}>NEW PROJECT</h2>
             <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>PROJECT NAME</label>
                 <input type="text" className="danvers-input" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} required placeholder="e.g. Mobile App Redesign" />
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 8 }}>DESCRIPTION (OPTIONAL)</label>
                 <textarea className="danvers-input" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} rows={3} placeholder="Project objectives..." />
               </div>
               <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                 <button type="button" onClick={() => setShowNewProject(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                 <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Create Project</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
