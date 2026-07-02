'use client'
import { useState, useEffect } from 'react'
import { Brain, Search, Plus, Tag, Clock, Sparkles, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const importanceColors: Record<string, string> = { high: '#ff3366', medium: '#ffb800', low: '#4a6580' }
const categories = ['all', 'goals', 'routines', 'workouts', 'productivity', 'habits', 'preferences', 'general']

export default function MemoryPage() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [memories, setMemories] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Add memory modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMemory, setNewMemory] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: '',
    importance: 'medium',
    color: '#00d4ff'
  })

  const supabase = createClient()

  useEffect(() => {
    fetchMemories()
  }, [])

  const fetchMemories = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('ai_memories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setMemories(data || [])
      if (data && data.length > 0 && !selected) {
        setSelected(data[0])
      }
    } catch (err) {
      console.error('Error fetching memories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tagsArray = newMemory.tags.split(',').map(t => t.trim()).filter(Boolean)

      const { error } = await supabase
        .from('ai_memories')
        .insert({
          user_id: user.id,
          title: newMemory.title,
          content: newMemory.content,
          category: newMemory.category,
          tags: tagsArray,
          importance: newMemory.importance,
          color: newMemory.color
        })

      if (error) throw error
      
      setShowAddModal(false)
      setNewMemory({ title: '', content: '', category: 'general', tags: '', importance: 'medium', color: '#00d4ff' })
      fetchMemories()
    } catch (err) {
      console.error('Error adding memory:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return
    try {
      await supabase.from('ai_memories').delete().eq('id', id)
      if (selected?.id === id) setSelected(null)
      fetchMemories()
    } catch (err) {
      console.error('Error deleting memory:', err)
    }
  }

  const filtered = memories
    .filter(m => filter === 'all' || m.category === filter)
    .filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>COGNITIVE MEMORY SYSTEM · VECTOR DB</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>AI Memory Bank</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '6px 12px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace' }}>{memories.length} memories</span>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: 13 }}><Plus size={14} />New Memory</button>
        </div>
      </div>

      {/* Status bar */}
      <div className="glass-card" style={{ padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="status-dot" />
          <span style={{ fontSize: 12, color: '#8bacc8' }}>Memory system online</span>
        </div>
        <span style={{ fontSize: 12, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace' }}>Vector embeddings: <span style={{ color: '#00d4ff' }}>active</span></span>
        <span style={{ fontSize: 12, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace' }}>Context retrieval: <span style={{ color: '#00d4ff' }}>enabled</span></span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Brain size={13} style={{ color: '#00d4ff' }} />
          <span style={{ fontSize: 11, color: '#4a6580' }}>Powered by pgvector</span>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4a6580' }} />
          <input className="danvers-input" placeholder="Search memories..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: 'none', background: filter === cat ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.05)', color: filter === cat ? '#00d4ff' : '#8bacc8', textTransform: 'capitalize', transition: 'all 0.2s', outline: filter === cat ? '1px solid rgba(0,212,255,0.3)' : 'none' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
         <div style={{ textAlign: 'center', padding: '40px 0', color: '#4a6580' }}><Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#00d4ff' }} /> Retrieving neural pathways...</div>
      ) : filtered.length === 0 ? (
         <div style={{ textAlign: 'center', padding: '40px 0', color: '#4a6580' }}>No memories found. Instruct DANVERS to save memories or click "New Memory".</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(mem => {
              const date = new Date(mem.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return (
                <div key={mem.id} onClick={() => setSelected(mem)} className="glass-card animate-fade-up" style={{ padding: 18, cursor: 'pointer', borderLeft: `3px solid ${selected?.id === mem.id ? mem.color : 'transparent'}`, background: selected?.id === mem.id ? `${mem.color}06` : undefined, transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${mem.color}15`, border: `1px solid ${mem.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Brain size={16} style={{ color: mem.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e8f4ff' }}>{mem.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: importanceColors[mem.importance] || '#4a6580' }} />
                          <span style={{ fontSize: 10, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace' }}>{date}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: '#8bacc8', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{mem.content}</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {mem.tags?.map((tag: string) => (
                          <span key={tag} style={{ padding: '2px 8px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 100, fontSize: 10, color: '#8bacc8' }}>#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${selected.color}15`, border: `1px solid ${selected.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Brain size={22} style={{ color: selected.color }} />
                  </div>
                  <button onClick={() => handleDelete(selected.id)} style={{ background: 'none', border: 'none', color: '#ff3366', cursor: 'pointer', opacity: 0.7 }}><X size={16} /></button>
                </div>
                
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8f4ff', marginBottom: 8 }}>{selected.title}</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <span style={{ padding: '2px 8px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 100, fontSize: 11, color: '#00d4ff', textTransform: 'capitalize' }}>{selected.category}</span>
                  <span style={{ padding: '2px 8px', background: `${importanceColors[selected.importance]}15`, border: `1px solid ${importanceColors[selected.importance]}25`, borderRadius: 100, fontSize: 11, color: importanceColors[selected.importance], textTransform: 'capitalize' }}>{selected.importance} priority</span>
                </div>
                <div className="danvers-divider" style={{ marginBottom: 14 }} />
                <p style={{ fontSize: 13, color: '#c8d8e8', lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{selected.content}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {selected.tags?.map((tag: string) => (
                    <span key={tag} style={{ padding: '3px 10px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 100, fontSize: 11, color: '#8bacc8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Tag size={9} />#{tag}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4a6580' }}>
                  <Clock size={11} />
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>Stored: {new Date(selected.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
              <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Sparkles size={13} style={{ color: '#00d4ff' }} />
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, color: '#e8f4ff', fontWeight: 700 }}>DANVERS CONTEXT</span>
                </div>
                <p style={{ fontSize: 12, color: '#8bacc8', lineHeight: 1.6 }}>This memory is actively used to personalize DANVERS responses. It contributes to your behavioral profile and informs scheduling, workout, and nutrition recommendations.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Memory Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddModal(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 500, padding: 32, position: 'relative' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}><X size={20} /></button>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff', marginBottom: 24 }}>INJECT CONTEXT MEMORY</h2>
             <form onSubmit={handleAddMemory} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>TITLE</label>
                 <input className="danvers-input" value={newMemory.title} onChange={e => setNewMemory({...newMemory, title: e.target.value})} placeholder="e.g. Current Fitness Goal" required />
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>MEMORY CONTENT / CONTEXT</label>
                 <textarea className="danvers-input" value={newMemory.content} onChange={e => setNewMemory({...newMemory, content: e.target.value})} placeholder="Detailed information for the AI to remember..." required style={{ minHeight: 100, padding: 12 }} />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>CATEGORY</label>
                   <select className="danvers-input" value={newMemory.category} onChange={e => setNewMemory({...newMemory, category: e.target.value})}>
                     <option value="general">GENERAL</option>
                     <option value="goals">GOALS</option>
                     <option value="routines">ROUTINES</option>
                     <option value="workouts">WORKOUTS</option>
                     <option value="productivity">PRODUCTIVITY</option>
                     <option value="habits">HABITS</option>
                     <option value="preferences">PREFERENCES</option>
                   </select>
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>IMPORTANCE</label>
                   <select className="danvers-input" value={newMemory.importance} onChange={e => setNewMemory({...newMemory, importance: e.target.value})}>
                     <option value="low">LOW</option>
                     <option value="medium">MEDIUM</option>
                     <option value="high">HIGH</option>
                   </select>
                 </div>
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>TAGS (comma separated)</label>
                 <input className="danvers-input" value={newMemory.tags} onChange={e => setNewMemory({...newMemory, tags: e.target.value})} placeholder="e.g. fitness, routine" />
               </div>
               <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>SYSTEM COLOR</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                     {['#00d4ff', '#1a6fff', '#00ff88', '#ffb800', '#ff3366', '#a855f7'].map(c => (
                        <div key={c} onClick={() => setNewMemory({...newMemory, color: c})} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: newMemory.color === c ? '2px solid white' : '2px solid transparent' }} />
                     ))}
                  </div>
               </div>
               <button type="submit" className="btn-primary" style={{ marginTop: 12, justifyContent: 'center', padding: 12 }}>STORE MEMORY</button>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
