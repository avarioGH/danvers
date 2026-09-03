'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Brain, Zap, RefreshCw, Trash2, ChevronDown, Loader2, Paperclip, FileText, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const suggestedPrompts = [
  "Analyze my productivity this week",
  "Adjust my workout because I slept badly",
  "Create tomorrow's optimized schedule",
  "Suggest high protein meals for muscle gain",
  "What should I focus on today?",
  "Track my dopamine habits",
  "Give me a weekly performance review",
  "How can I optimize my sleep?",
]

const welcomeMessageContent = `Online. All systems operational.

I'm DANVERS — your personal AI operating system. I have access to your schedule, workout data, nutrition logs, habits, sleep metrics, and long-term goals.

How can I optimize your performance today, Commander?`

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachment, setAttachment] = useState<{file: File, base64: string, type: string} | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Voice State
  const [voiceMode, setVoiceMode] = useState(false)
  const [listening, setListening] = useState(false)
  const voiceModeRef = useRef(false)
  const recognitionRef = useRef<any>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase.from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      
      if (!error && data && data.length > 0) {
        const formatted = data.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at)
        }))
        setMessages(formatted)
      } else {
        setMessages([{
          id: '0',
          role: 'assistant',
          content: welcomeMessageContent,
          timestamp: new Date(),
        }])
      }
    }
    
    fetchHistory()
    
    // Load voices early
    if (typeof window !== 'undefined' && window.speechSynthesis) {
       window.speechSynthesis.getVoices()
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      alert("File size must be less than 15MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      setAttachment({ file, base64, type: file.type })
    }
    reader.readAsDataURL(file)
  }

  const speakResponse = (text: string, onEndCallback?: () => void) => {
    const synth = window.speechSynthesis
    if (!synth) {
      if (onEndCallback) onEndCallback()
      return
    }

    synth.cancel() // Stop any ongoing speech
    
    // Clean up text for TTS (remove markdown, save tags, etc)
    const cleanText = text
       .replace(/\[.*?\]/g, '')
       .replace(/[*#_]/g, '')
       .replace(/[\u{1F600}-\u{1F6FF}]/gu, '')
       .trim()
    
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'en-US'
    utterance.pitch = 0.95
    utterance.rate = 1.05
    
    // Find a premium female voice for Danvers
    const voices = synth.getVoices()
    const preferredVoice = voices.find(v => 
      v.name.includes('Samantha') || 
      v.name.includes('Siri') || 
      v.name.includes('Google UK English Female') || 
      v.name.includes('Karen')
    )
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onend = () => {
       if (onEndCallback) onEndCallback()
    }
    utterance.onerror = () => {
       if (onEndCallback) onEndCallback()
    }

    synth.speak(utterance)
  }

  const toggleVoiceMode = () => {
    if (voiceMode) {
       // Turn off
       voiceModeRef.current = false
       setVoiceMode(false)
       setListening(false)
       recognitionRef.current?.stop()
       window.speechSynthesis?.cancel()
    } else {
       // Turn on
       if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
         alert("Voice recognition is not supported in this browser/device.")
         return
       }

       // iOS Audio Unlock: Play a silent utterance immediately on user interaction
       if (window.speechSynthesis) {
         const unlockUtterance = new SpeechSynthesisUtterance('')
         unlockUtterance.volume = 0
         window.speechSynthesis.speak(unlockUtterance)
       }

       voiceModeRef.current = true
       setVoiceMode(true)
       initSpeechRecognition()
    }
  }

  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
       setListening(true)
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        } else {
          interimTranscript += event.results[i][0].transcript
        }
      }

      const activeText = finalTranscript || interimTranscript
      if (activeText) setInput(activeText)

      // Wake Word Detection
      if (finalTranscript) {
         const lower = finalTranscript.toLowerCase()
         if (lower.includes('danvers')) {
            const parts = lower.split('danvers')
            const command = parts[parts.length - 1].trim()
            
            if (!command) {
               // Pause listening while speaking to prevent feedback loop
               recognition.stop()
               speakResponse("Listening, Commander.", () => {
                  if (voiceModeRef.current) {
                     try { recognition.start() } catch (e) {}
                  }
               })
               setInput('')
            } else {
               setInput(command)
               sendMessage(command)
            }
         }
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      if (event.error === 'not-allowed') {
        setVoiceMode(false)
        voiceModeRef.current = false
        setListening(false)
        alert('Microphone access denied. Please allow microphone permissions in your browser/iOS settings.')
      }
    }

    recognition.onend = () => {
      // Auto-restart if voice mode is still active (prevents iOS from killing it too early)
      if (voiceModeRef.current) {
         setTimeout(() => {
            if (voiceModeRef.current) {
               try { recognition.start() } catch (e) {}
            }
         }, 500)
      } else {
         setListening(false)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (e) {
      console.error(e)
    }
  }

  const sendMessage = async (text: string = input) => {
    if ((!text.trim() && !attachment) || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim() || (attachment ? `[Attached File: ${attachment.file.name}]` : ''),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setAttachment(null)
    setLoading(true)

    // Stop listening temporarily so the mic doesn't hear the TTS output
    if (voiceModeRef.current && recognitionRef.current) {
       recognitionRef.current.stop()
    }

    let apiKey = ''
    try {
      const savedConfig = localStorage.getItem('danvers_config')
      if (savedConfig) apiKey = JSON.parse(savedConfig).geminiKey || ''
    } catch (e) {}

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })).map((m, i, arr) => {
            // Attach the file only to the latest user message
            if (i === arr.length - 1 && attachment) {
              return { ...m, attachment: { base64: attachment.base64, type: attachment.type } }
            }
            return m
          }),
          apiKey
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.content || 'API error')
      }

      const data = await response.json()
      const aiContent = data.content || 'I encountered an issue processing your request.'

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMsg])

      // Voice Output & Restart listening
      if (voiceModeRef.current) {
         speakResponse(aiContent, () => {
            if (voiceModeRef.current && recognitionRef.current) {
               try { recognitionRef.current.start() } catch (e) {}
            }
         })
      }

    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ ${err.message || 'API connection required. Please configure your Gemini API key in Settings.'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
      
      if (voiceModeRef.current && recognitionRef.current) {
         try { recognitionRef.current.start() } catch (e) {}
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => setMessages([{
    id: '0',
    role: 'assistant',
    content: welcomeMessageContent,
    timestamp: new Date(),
  }])

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>AI COMPANION</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>
            DANVERS Assistant
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          
          <button 
            onClick={toggleVoiceMode} 
            className="btn-secondary" 
            style={{ 
              padding: '8px 12px', 
              borderColor: voiceMode ? 'rgba(0,212,255,0.5)' : undefined,
              background: voiceMode ? 'rgba(0,212,255,0.1)' : undefined,
              color: voiceMode ? '#00d4ff' : '#8bacc8',
              boxShadow: voiceMode ? '0 0 15px rgba(0,212,255,0.2)' : 'none'
            }}
          >
            {voiceMode ? (
              <><Mic size={14} className={listening ? "animate-pulse" : ""} /> {listening ? 'Listening...' : 'Voice Mode On'}</>
            ) : (
              <><MicOff size={14} /> Enable Voice</>
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 8 }}>
            <div className="status-dot" style={{ width: 6, height: 6 }} />
            <span style={{ fontSize: 11, color: '#00ff88', fontFamily: 'JetBrains Mono, monospace' }}>ONLINE</span>
          </div>
          <button onClick={clearChat} className="btn-secondary" style={{ padding: 8 }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {voiceMode && (
         <div className="glass-card animate-fade-down" style={{ padding: '12px 16px', marginBottom: 16, background: 'linear-gradient(90deg, rgba(0,212,255,0.05), transparent)', borderLeft: '3px solid #00d4ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic size={16} style={{ color: '#00d4ff' }} className={listening ? "animate-pulse" : ""} />
               </div>
               <div>
                  <div style={{ fontSize: 13, color: '#e8f4ff', fontWeight: 600 }}>Voice Link Active</div>
                  <div style={{ fontSize: 11, color: '#00d4ff' }}>Say "Hello Danvers" to issue a command.</div>
               </div>
            </div>
         </div>
      )}

      {/* Suggestions */}
      {!voiceMode && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {suggestedPrompts.slice(0, 4).map((p, i) => (
            <button
              key={i}
              onClick={() => sendMessage(p)}
              style={{
                padding: '6px 12px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)',
                borderRadius: 8, fontSize: 12, color: '#8bacc8', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(0,212,255,0.1)'; (e.target as HTMLElement).style.color = '#00d4ff' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(0,212,255,0.05)'; (e.target as HTMLElement).style.color = '#8bacc8' }}
            >
              {p}
            </button>
          ))}
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
            <ChevronDown size={12} /> More
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4, marginBottom: 16 }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
            className="animate-fade-up"
          >
            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {msg.role === 'assistant' && (
                <>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'radial-gradient(circle, #00d4ff, #1a6fff)', boxShadow: '0 0 8px rgba(0,212,255,0.5)' }} />
                  <span style={{ fontSize: 11, color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>DANVERS</span>
                </>
              )}
              {msg.role === 'user' && (
                <>
                  <span style={{ fontSize: 11, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace' }}>COMMANDER</span>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(26,111,255,0.8), rgba(0,212,255,0.6))', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>C</div>
                </>
              )}
              <span style={{ fontSize: 10, color: '#2a3a4a', fontFamily: 'JetBrains Mono, monospace' }}>{formatTime(msg.timestamp)}</span>
            </div>

            {/* Bubble */}
            <div
              className={msg.role === 'user' ? 'chat-user' : 'chat-ai'}
              style={{
                maxWidth: '80%',
                padding: '14px 18px',
                fontSize: 14,
                lineHeight: 1.7,
                color: '#e8f4ff',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'radial-gradient(circle, #00d4ff, #1a6fff)', boxShadow: '0 0 8px rgba(0,212,255,0.5)' }} />
            <div className="chat-ai" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#00d4ff',
                    animation: 'pulse 1.2s infinite', animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>


      {/* Input */}
      <div className="glass-card" style={{ padding: 16, flexShrink: 0 }}>
        {attachment && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,212,255,0.1)', borderRadius: 8, width: 'fit-content', marginBottom: 10, border: '1px solid rgba(0,212,255,0.3)' }}>
            {attachment.type.startsWith('image/') ? <ImageIcon size={14} color="#00d4ff" /> : <FileText size={14} color="#00d4ff" />}
            <span style={{ fontSize: 12, color: '#e8f4ff', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.file.name}</span>
            <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', color: '#ff3366', cursor: 'pointer', marginLeft: 8 }}><Trash2 size={12} /></button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,audio/*,video/*,application/pdf,text/plain" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary" style={{ padding: 10, flexShrink: 0 }} title="Attach File">
            <Paperclip size={16} />
          </button>

          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={voiceMode ? "Listening for 'Hello Danvers'..." : "Ask DANVERS anything... (Shift+Enter for new line)"}
              className="danvers-input"
              style={{ 
                 resize: 'none', minHeight: 44, maxHeight: 120, lineHeight: 1.5, paddingRight: 16,
                 borderColor: (voiceMode && listening) ? '#00d4ff' : undefined,
                 boxShadow: (voiceMode && listening) ? '0 0 10px rgba(0,212,255,0.1) inset' : undefined
              }}
              rows={1}
            />
          </div>
          <button onClick={toggleVoiceMode} className="btn-secondary" style={{ padding: 10, flexShrink: 0, color: voiceMode ? '#00d4ff' : undefined, borderColor: voiceMode ? 'rgba(0,212,255,0.5)' : undefined }}>
            {voiceMode ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
          </button>
          <button
            onClick={() => sendMessage()}
            disabled={loading || (!input.trim() && !attachment)}
            className="btn-primary"
            style={{ padding: '10px 16px', flexShrink: 0, opacity: loading || (!input.trim() && !attachment) ? 0.5 : 1 }}
          >
            <Send size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Brain size={11} style={{ color: '#4a6580' }} />
          <span style={{ fontSize: 11, color: '#2a3a4a', fontFamily: 'JetBrains Mono, monospace' }}>
            DANVERS · Memory-aware · Context-retrieval · Life-optimized
          </span>
        </div>
      </div>
    </div>
  )
}
