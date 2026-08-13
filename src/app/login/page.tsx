'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, AlertCircle, Eye, EyeOff, ShieldAlert, Terminal, Mic, MicOff } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isGhostMode, setIsGhostMode] = useState(true)
  const [inputBuffer, setInputBuffer] = useState('')
  const [mounted, setMounted] = useState(false)
  
  const { isListening, transcript, startListening, stopListening, error: speechError, setTranscript } = useSpeechRecognition()

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keyboard ghost mode bypass
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return
      const char = e.key.toLowerCase()
      if (char.length === 1) {
        const nextBuffer = (inputBuffer + char).slice(-7)
        setInputBuffer(nextBuffer)
        if (nextBuffer === 'danvers') {
          setIsGhostMode(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inputBuffer])

  // Voice ghost mode bypass & voice login
  useEffect(() => {
    // List of possible transcriptions for "Hi Danvers" in Indonesian locale
    const wakeWords = ['hi danvers', 'hai danvers', 'head first', 'hi denver', 'hai denver']
    
    if (wakeWords.some(word => transcript.includes(word))) {
      setIsGhostMode(false)
      
      // Auto-login easter egg if they say the full phrase
      if (transcript.includes('login') || transcript.includes('masuk')) {
        setTranscript('')
        stopListening()
      }
    }
  }, [transcript, setIsGhostMode, setTranscript, stopListening])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
           const { error: signUpError } = await supabase.auth.signUp({ email, password })
           if (signUpError) throw signUpError
           
           setError('Account Initialized. Please check your email to confirm your access, then try logging in again.')
           setLoading(false)
           return
        }
        throw signInError
      }
      
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      console.error('Auth error:', err)
      setError(err.message || 'Access Denied: Invalid signature.')
    } finally {
      setLoading(false)
    }
  }

  if (isGhostMode) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#020408', color: '#1a2a3a', fontFamily: 'JetBrains Mono, monospace', padding: 24, textAlign: 'center'
      }}>
        <div style={{ position: 'relative', marginBottom: 24 }}>
           <ShieldAlert size={64} style={{ opacity: 0.1, animation: 'pulse 4s infinite' }} />
        </div>
        <h2 style={{ fontSize: 14, letterSpacing: '0.2em', fontWeight: 400 }}>SYSTEM STATUS: OFFLINE</h2>
        <p style={{ fontSize: 11, marginTop: 12, opacity: 0.5 }}>UNAUTHORIZED ACCESS IS A FEDERAL OFFENSE</p>
        
        {/* Voice Activation for Mobile */}
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button 
            onClick={isListening ? stopListening : startListening}
            style={{
              background: 'transparent',
              border: `1px solid ${isListening ? '#00d4ff' : '#1a2a3a'}`,
              borderRadius: '50%',
              width: 60,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isListening ? '#00d4ff' : '#1a2a3a',
              transition: 'all 0.3s',
              boxShadow: isListening ? '0 0 15px rgba(0,212,255,0.3)' : 'none'
            }}
          >
            {isListening ? <Mic size={24} className="animate-pulse" /> : <MicOff size={24} />}
          </button>
          <p style={{ fontSize: 10, marginTop: 12, opacity: isListening ? 0.8 : 0.3, color: isListening ? '#00d4ff' : '#1a2a3a' }}>
            {isListening ? 'LISTENING FOR WAKE WORD...' : 'TAP MIC & SAY "HI DANVERS" TO OVERRIDE'}
          </p>
          {transcript && isListening && (
            <p style={{ fontSize: 10, marginTop: 8, color: '#4a6580' }}>"{transcript}"</p>
          )}
          {speechError && (
             <p style={{ fontSize: 10, marginTop: 8, color: '#ff3366' }}>Error: {speechError}</p>
          )}
        </div>

        <div style={{ position: 'fixed', bottom: 20, right: 20, fontSize: 10, opacity: 0.1 }}>
          TERMINAL_ID: {mounted ? Math.random().toString(36).substring(7).toUpperCase() : 'LOADING...'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(26,111,255,0.15) 0%, rgba(2,4,8,1) 60%)',
      padding: 24,
    }}>
      <div className="scan-line" />
      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }} className="animate-fade-scale">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
            <Terminal size={20} style={{ color: '#00d4ff' }} />
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 800, color: '#e8f4ff', letterSpacing: '0.1em' }}>
              DANVERS OS
            </span>
          </div>
          <div className="danvers-divider" />
        </div>

        <div className="glass-card" style={{ padding: 32, border: '1px solid rgba(0,212,255,0.2)' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.2)', borderRadius: 8, marginBottom: 16 }}>
              <AlertCircle size={14} style={{ color: '#ff3366', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#ff6688' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>IDENTIFIER</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#2a3a4a' }} />
                <input
                  className="danvers-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ID_SECURE"
                  style={{ paddingLeft: 36, fontSize: 13 }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>KEY_SIGNATURE</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#2a3a4a' }} />
                <input
                  className="danvers-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingLeft: 36, paddingRight: 40, fontSize: 13 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#2a3a4a' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ justifyContent: 'center', padding: '12px 20px', marginTop: 8, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'VERIFYING...' : 'INITIALIZE_AUTH'}
            </button>
          </form>
        </div>
        
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button 
                onClick={isListening ? stopListening : startListening}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: isListening ? '#00d4ff' : '#4a6580',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace'
                }}
            >
                {isListening ? <Mic size={14} className="animate-pulse" /> : <MicOff size={14} />}
                {isListening ? 'VOICE PROTOCOL ACTIVE' : 'ACTIVATE VOICE LOGIN'}
            </button>
            {transcript && isListening && (
                <p style={{ fontSize: 10, color: '#4a6580', marginTop: 4 }}>"{transcript}"</p>
            )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#1a2a3a', marginTop: 24, fontFamily: 'JetBrains Mono, monospace' }}>
          GHOST_PROTOCOL_ENABLED // ENCRYPTION_ACTIVE
        </p>
      </div>
    </div>
  )
}
