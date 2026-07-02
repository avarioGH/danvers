'use client'
import { useState, useEffect } from 'react'
import { Menu, Bell, Search, X } from 'lucide-react'
import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (d: Date | null) =>
    d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--:--:--'

  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '...'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 280, zIndex: 101 }}>
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'white', zIndex: 102 }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main area */}
      <div className="main-content" style={{ flex: 1 }}>
        {/* Top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, padding: '12px 0',
          borderBottom: '1px solid rgba(0,212,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="md:hidden btn-secondary"
              style={{ padding: 8 }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 600, color: '#00d4ff', letterSpacing: '0.05em' }}>
                {formatTime(time)}
              </div>
              <div style={{ fontSize: 11, color: '#4a6580', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatDate(time)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Search */}
            <div style={{ position: 'relative', display: 'none' }} className="md:block">
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4a6580' }} />
              <input
                className="danvers-input"
                placeholder="Search..."
                style={{ width: 200, paddingLeft: 32, fontSize: 13, padding: '8px 12px 8px 32px' }}
              />
            </div>

            {/* Notifications */}
            <button className="btn-secondary" style={{ padding: 8, position: 'relative' }}>
              <Bell size={16} />
              <span style={{
                position: 'absolute', top: 4, right: 4, width: 6, height: 6,
                background: '#ff3366', borderRadius: '50%', boxShadow: '0 0 6px rgba(255,51,102,0.8)'
              }} />
            </button>

            {/* User avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(26,111,255,0.6), rgba(0,212,255,0.4))',
              border: '1px solid rgba(0,212,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#00d4ff',
              boxShadow: '0 0 12px rgba(0,212,255,0.2)',
              cursor: 'pointer',
            }}>
              J
            </div>
          </div>
        </header>

        {/* Page content */}
        <main>{children}</main>
      </div>
    </div>
  )
}
