'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, Calendar, Dumbbell,
  UtensilsCrossed, Target, Moon, BarChart3, Brain,
  Settings, Zap, ChevronRight, LogOut, Trophy
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Command Center', group: 'main' },
  { href: '/assistant', icon: MessageSquare, label: 'AI Assistant', group: 'main' },
  { href: '/schedule', icon: Calendar, label: 'Schedule', group: 'systems' },
  { href: '/workout', icon: Dumbbell, label: 'Workout', group: 'systems' },
  { href: '/nutrition', icon: UtensilsCrossed, label: 'Nutrition', group: 'systems' },
  { href: '/habits', icon: Target, label: 'Habits', group: 'systems' },
  { href: '/sleep', icon: Moon, label: 'Sleep', group: 'systems' },
  { href: '/achievements', icon: Trophy, label: 'Achievements', group: 'systems' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics', group: 'intelligence' },
  { href: '/goals', icon: Zap, label: 'Goals', group: 'intelligence' },
  { href: '/memory', icon: Brain, label: 'AI Memory', group: 'intelligence' },
  // AI Tools Group
  { href: '/ai-tools/product-intelligence', icon: LayoutDashboard, label: 'Product Intelligence', group: 'ai_tools' },
  { href: '/ai-tools/product-photo', icon: LayoutDashboard, label: 'AI Product Photo', group: 'ai_tools' },
  { href: '/ai-tools/video-ads', icon: LayoutDashboard, label: 'AI Video Ads', group: 'ai_tools' },
  { href: '/content-analyzer', icon: LayoutDashboard, label: 'Content Analyzer', group: 'ai_tools' },
  // System
  { href: '/settings', icon: Settings, label: 'Settings', group: 'system' },
]

const groups = [
  { key: 'main', label: 'Core' },
  { key: 'systems', label: 'Life Systems' },
  { key: 'intelligence', label: 'Intelligence' },
  { key: 'ai_tools', label: 'AI Tools' },
  { key: 'system', label: 'System' },
]

export default function Sidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className={`sidebar ${mobile ? 'open' : ''}`} style={{ width: mobile ? '100%' : '240px' }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Arc reactor logo */}
          <div style={{ position: 'relative', width: 36, height: 36 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,212,255,0.3) 0%, rgba(26,111,255,0.1) 60%, transparent 100%)',
              border: '1px solid rgba(0,212,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0,212,255,0.3)',
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: 'radial-gradient(circle, #00d4ff, #1a6fff)',
                boxShadow: '0 0 10px rgba(0,212,255,0.8)',
              }} />
            </div>
            <div style={{
              position: 'absolute', inset: -2, borderRadius: '50%',
              border: '1px solid rgba(0,212,255,0.2)',
              animation: 'arc-spin 6s linear infinite',
              borderTopColor: 'rgba(0,212,255,0.6)',
            }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#00d4ff', letterSpacing: '0.1em' }}>
              DANVERS OS
            </div>
            <div style={{ fontSize: 10, color: '#4a6580', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
              v2.0 · ONLINE
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '8px 12px', background: 'rgba(0,255,136,0.05)', borderRadius: 8, border: '1px solid rgba(0,255,136,0.1)' }}>
          <div className="status-dot" />
          <span style={{ fontSize: 11, color: '#8bacc8', fontFamily: 'JetBrains Mono, monospace' }}>All systems operational</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {groups.map(group => {
          const items = navItems.filter(i => i.group === group.key)
          return (
            <div key={group.key} style={{ marginBottom: 8 }}>
              <div className="section-label" style={{ padding: '8px 8px 4px' }}>{group.label}</div>
              {items.map(item => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon size={16} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {active && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(0,212,255,0.08)' }}>
        <button
          onClick={handleSignOut}
          className="nav-item"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#4a6580' }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
