'use client'
import { useState, useEffect } from 'react'
import { Settings, User, Key, Bell, Shield, Database, Palette, Brain, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Profile State (Supabase)
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    timezone: 'UTC+7 (Bangkok)',
  })

  // Local Settings State (localStorage)
  const [localConfig, setLocalConfig] = useState({
    geminiKey: '',
    openaiKey: '',
    briefingTime: '07:00',
    workoutReminders: true,
    sleepReminder: '21:30'
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch user & profile from Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setProfile(prev => ({ ...prev, email: user.email || '' }))
        
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('name, timezone')
          .eq('id', user.id)
          .single()
        
        if (profileData) {
          setProfile(prev => ({
            ...prev,
            name: profileData.name || '',
            timezone: profileData.timezone || 'UTC+7 (Bangkok)'
          }))
        } else {
          // Create profile if it doesn't exist
          await supabase.from('user_profiles').insert({
            id: user.id,
            email: user.email,
            name: user.email?.split('@')[0] || 'Commander'
          })
        }
      }

      // 2. Fetch local storage configs
      const savedConfig = localStorage.getItem('danvers_config')
      if (savedConfig) {
        setLocalConfig(JSON.parse(savedConfig))
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      // 1. Save Profile to Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('user_profiles').upsert({
          id: user.id,
          email: profile.email,
          name: profile.name,
          timezone: profile.timezone
        })
      }

      // 2. Save Local Config
      localStorage.setItem('danvers_config', JSON.stringify(localConfig))

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert("Failed to save settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>SYSTEM CONFIGURATION</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>Settings</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00ff88', fontSize: 13 }}><CheckCircle2 size={16} /> Saved</div>}
          <button onClick={handleSave} disabled={saving || loading} className="btn-primary" style={{ fontSize: 13, minWidth: 120, justifyContent: 'center' }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#4a6580' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#00d4ff' }} />
          Loading configuration...
        </div>
      ) : (
        <>
          {/* System info */}
          <div className="glass-card animate-fade-up" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {[
                ['Version', 'v2.0.0'],
                ['Status', 'Operational'],
                ['AI Engine', 'Gemini 1.5 Flash'],
                ['Database', 'Supabase PostgreSQL'],
                ['Memory', 'pgvector'],
              ].map(([k, v], i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, color: i === 1 ? '#00ff88' : '#c8d8e8', fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Profile Section */}
            <div className="glass-card animate-fade-up" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#00d4ff15', border: '1px solid #00d4ff25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} style={{ color: '#00d4ff' }} />
                </div>
                <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>Profile</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ fontSize: 13, color: '#8bacc8', minWidth: 180, fontWeight: 500 }}>Name</label>
                  <input className="danvers-input" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} style={{ flex: 1, maxWidth: 400 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ fontSize: 13, color: '#8bacc8', minWidth: 180, fontWeight: 500 }}>Email</label>
                  <input className="danvers-input" value={profile.email} disabled style={{ flex: 1, maxWidth: 400, opacity: 0.5, cursor: 'not-allowed' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ fontSize: 13, color: '#8bacc8', minWidth: 180, fontWeight: 500 }}>Timezone</label>
                  <input className="danvers-input" value={profile.timezone} onChange={e => setProfile({...profile, timezone: e.target.value})} style={{ flex: 1, maxWidth: 400 }} />
                </div>
              </div>
            </div>

            {/* API Keys Section */}
            <div className="glass-card animate-fade-up" style={{ padding: 24, animationDelay: '0.1s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ffb80015', border: '1px solid #ffb80025', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={16} style={{ color: '#ffb800' }} />
                </div>
                <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>API Keys</h2>
              </div>
              <p style={{ fontSize: 12, color: '#4a6580', marginBottom: 16 }}>Keys are stored securely in your browser's local storage.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ fontSize: 13, color: '#8bacc8', minWidth: 180, fontWeight: 500 }}>Gemini API Key</label>
                  <input className="danvers-input" type="password" placeholder="AIzaSy..." value={localConfig.geminiKey} onChange={e => setLocalConfig({...localConfig, geminiKey: e.target.value})} style={{ flex: 1, maxWidth: 400 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ fontSize: 13, color: '#8bacc8', minWidth: 180, fontWeight: 500 }}>OpenAI API Key</label>
                  <input className="danvers-input" type="password" placeholder="sk-..." value={localConfig.openaiKey} onChange={e => setLocalConfig({...localConfig, openaiKey: e.target.value})} style={{ flex: 1, maxWidth: 400 }} />
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="glass-card animate-fade-up" style={{ padding: 24, animationDelay: '0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#00ff8815', border: '1px solid #00ff8825', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={16} style={{ color: '#00ff88' }} />
                </div>
                <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>Notifications</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ fontSize: 13, color: '#8bacc8', minWidth: 180, fontWeight: 500 }}>Daily Briefing Time</label>
                  <input type="time" className="danvers-input" value={localConfig.briefingTime} onChange={e => setLocalConfig({...localConfig, briefingTime: e.target.value})} style={{ flex: 1, maxWidth: 400 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ fontSize: 13, color: '#8bacc8', minWidth: 180, fontWeight: 500 }}>Workout Reminders</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div onClick={() => setLocalConfig({...localConfig, workoutReminders: !localConfig.workoutReminders})} style={{ width: 44, height: 24, borderRadius: 12, background: localConfig.workoutReminders ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.1)', border: `1px solid ${localConfig.workoutReminders ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}`, padding: 2, cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: localConfig.workoutReminders ? '#00d4ff' : '#4a6580', marginLeft: localConfig.workoutReminders ? 20 : 0, boxShadow: localConfig.workoutReminders ? '0 0 8px rgba(0,212,255,0.6)' : 'none', transition: 'all 0.2s' }} />
                    </div>
                    <span style={{ fontSize: 12, color: localConfig.workoutReminders ? '#00d4ff' : '#4a6580' }}>{localConfig.workoutReminders ? 'enabled' : 'disabled'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ fontSize: 13, color: '#8bacc8', minWidth: 180, fontWeight: 500 }}>Sleep Reminder</label>
                  <input type="time" className="danvers-input" value={localConfig.sleepReminder} onChange={e => setLocalConfig({...localConfig, sleepReminder: e.target.value})} style={{ flex: 1, maxWidth: 400 }} />
                </div>
              </div>
            </div>

            {/* Access control */}
            <div className="glass-card animate-fade-up" style={{ padding: 24, animationDelay: '0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={16} style={{ color: '#ff3366' }} />
                </div>
                <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em' }}>ACCESS CONTROL</h2>
              </div>
              <div style={{ padding: 16, background: 'rgba(255,51,102,0.05)', border: '1px solid rgba(255,51,102,0.15)', borderRadius: 12 }}>
                <p style={{ fontSize: 13, color: '#8bacc8', lineHeight: 1.6 }}>
                  This system uses email whitelist authentication. Only approved email addresses can access DANVERS OS. Configure the <code style={{ background: 'rgba(0,212,255,0.1)', padding: '1px 6px', borderRadius: 4, color: '#00d4ff' }}>ALLOWED_EMAILS</code> environment variable to manage access.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
