'use client'
import { useState, useEffect } from 'react'
import { Plus, Trophy, Calendar as CalendarIcon, Star, Medal, Crown, Shield, X, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const categoryIcons: Record<string, React.ReactNode> = {
  career: <Crown size={20} color="#ffb800" />,
  finance: <Shield size={20} color="#00ff88" />,
  health: <Medal size={20} color="#ff3366" />,
  education: <Star size={20} color="#00d4ff" />,
  personal: <Trophy size={20} color="#a855f7" />,
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    category: 'career',
    achieved_date: new Date().toLocaleDateString('en-CA'),
    age_at_achievement: 20
  })

  const supabase = createClient()

  useEffect(() => {
    fetchAchievements()
  }, [])

  const fetchAchievements = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('achieved_date', { ascending: false }) // Newest first
      
      if (error && error.code !== '42P01') throw error // Ignore missing table error temporarily
      setAchievements(data || [])
    } catch (err) {
      console.error('Error fetching achievements:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('achievements')
        .insert({
          ...newAchievement,
          user_id: user.id
        })
      
      if (error) throw error
      setShowAddModal(false)
      setNewAchievement({ ...newAchievement, title: '', description: '' })
      fetchAchievements()
    } catch (err) {
      console.error('Error adding achievement:', err)
      alert("Pastikan Anda sudah menjalankan SQL CREATE TABLE achievements di Supabase!")
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>HALL OF FAME</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 700, color: '#e8f4ff' }}>
            Life Achievements
          </h1>
          <p style={{ color: '#4a6580', fontSize: 13, marginTop: 4 }}>Documenting your legacy, one milestone at a time.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ fontSize: 14, padding: '12px 20px', boxShadow: '0 0 20px rgba(255,184,0,0.2)' }}
        >
          <Plus size={16} />
          Record Milestone
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#4a6580' }}>Accessing historical records...</div>
      ) : achievements.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', color: '#4a6580' }}>
          <Award size={64} style={{ opacity: 0.1, margin: '0 auto 16px', color: '#ffb800' }} />
          <h3 style={{ color: '#e8f4ff', fontSize: 18, marginBottom: 8, fontFamily: 'Orbitron, monospace' }}>No records found</h3>
          <p style={{ maxWidth: 400, margin: '0 auto 24px' }}>Your Hall of Fame is currently empty. Start recording your life's greatest moments and milestones.</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ margin: '0 auto' }}>
            <Plus size={14} /> Add First Achievement
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 40 }}>
          {/* Vertical Timeline Line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 16, width: 2, background: 'linear-gradient(to bottom, rgba(0,212,255,0.4), rgba(0,212,255,0.05))', borderRadius: 2 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {achievements.map((item, index) => (
              <div key={item.id} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                
                {/* Timeline Dot with Icon */}
                <div style={{ 
                  position: 'absolute', left: -40, top: 0, width: 34, height: 34, 
                  borderRadius: '50%', background: '#020408', border: '2px solid rgba(0,212,255,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(0,212,255,0.2)', zIndex: 2
                }}>
                  {categoryIcons[item.category] || <Trophy size={16} color="#00d4ff" />}
                </div>

                {/* Content Card */}
                <div className="glass-card" style={{ 
                  flex: 1, padding: 24, 
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.03), transparent)',
                  border: '1px solid rgba(0,212,255,0.1)',
                  transition: 'transform 0.3s, box-shadow 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(8px)'
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,212,255,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 18, color: '#e8f4ff', fontWeight: 600, letterSpacing: '0.02em' }}>{item.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: '#00d4ff', fontFamily: 'Orbitron, monospace', padding: '2px 8px', background: 'rgba(0,212,255,0.1)', borderRadius: 4 }}>
                          Age {item.age_at_achievement}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#4a6580' }}>
                          <CalendarIcon size={12} />
                          {new Date(item.achieved_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.description && (
                    <p style={{ fontSize: 13, color: '#8bacc8', lineHeight: 1.6 }}>
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Achievement Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddModal(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 500, padding: 32, position: 'relative' }}>
             <button 
               onClick={() => setShowAddModal(false)}
               style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}
             >
               <X size={20} />
             </button>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <Trophy size={24} color="#ffb800" />
                <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff' }}>RECORD MILESTONE</h2>
             </div>

             <form onSubmit={handleAddAchievement} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>ACHIEVEMENT TITLE</label>
                 <input 
                   className="danvers-input"
                   value={newAchievement.title}
                   onChange={e => setNewAchievement({...newAchievement, title: e.target.value})}
                   placeholder="e.g. Graduated University, Founded first startup..."
                   required
                 />
               </div>
               
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>DESCRIPTION / STORY</label>
                 <textarea 
                   className="danvers-input"
                   value={newAchievement.description}
                   onChange={e => setNewAchievement({...newAchievement, description: e.target.value})}
                   placeholder="Write a brief story or impact of this milestone..."
                   style={{ height: 80, resize: 'none' }}
                 />
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>CATEGORY</label>
                   <select 
                     className="danvers-input"
                     value={newAchievement.category}
                     onChange={e => setNewAchievement({...newAchievement, category: e.target.value})}
                     style={{ appearance: 'none' }}
                   >
                     <option value="career">Career / Business</option>
                     <option value="finance">Financial</option>
                     <option value="health">Health / Fitness</option>
                     <option value="education">Education / Skill</option>
                     <option value="personal">Personal / Life</option>
                   </select>
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>AGE AT ACHIEVEMENT</label>
                   <input 
                     type="number"
                     className="danvers-input"
                     value={newAchievement.age_at_achievement}
                     onChange={e => setNewAchievement({...newAchievement, age_at_achievement: parseInt(e.target.value) || 0})}
                     min={1} max={120}
                     required
                   />
                 </div>
               </div>

               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>DATE ACHIEVED</label>
                 <input 
                   type="date"
                   className="danvers-input"
                   value={newAchievement.achieved_date}
                   onChange={e => setNewAchievement({...newAchievement, achieved_date: e.target.value})}
                   required
                 />
               </div>

               <button type="submit" className="btn-primary" style={{ marginTop: 12, justifyContent: 'center', padding: 12, background: 'linear-gradient(90deg, #ffb800, #ff3366)', border: 'none', color: '#fff' }}>
                 ETCH INTO HISTORY
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
