import React from 'react';
import {
  Sparkles,
  Terminal,
  FolderGit2,
  FileCode2,
  ListTodo,
  ShieldAlert,
  Server,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  Monitor,
  Laptop
} from 'lucide-react';
import { Project } from '@/lib/jarvis/types';

interface SidebarNavigationProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeNav: string;
  setActiveNav: (nav: any) => void;
  tasksCount: number;
  pendingApprovalsCount: number;
  workersCount: number;
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  activeProject?: Project | null;
  onOpenAddProjectModal: () => void;
  windowsWorkerStatus?: 'online' | 'stale' | 'offline' | 'revoked';
  windowsWorkerId?: string;
  vpsWorkerCount?: number;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  sidebarOpen,
  setSidebarOpen,
  activeNav,
  setActiveNav,
  tasksCount,
  pendingApprovalsCount,
  workersCount,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  activeProject,
  windowsWorkerStatus = 'offline',
  windowsWorkerId,
  vpsWorkerCount = 1
}) => {
  const navItems = [
    {
      id: 'workspace',
      label: 'Agent Workspace',
      desc: 'Plan, code, test, and ship',
      icon: Sparkles
    },
    {
      id: 'files',
      label: 'File Explorer',
      desc: 'Browse project files',
      icon: FileCode2
    },
    {
      id: 'tasks',
      label: `Directives (${tasksCount})`,
      desc: 'Saved instructions',
      icon: ListTodo
    },
    {
      id: 'approvals',
      label: `Approvals (${pendingApprovalsCount})`,
      desc: 'Review and merge',
      icon: ShieldAlert,
      badge: pendingApprovalsCount > 0
    },
    {
      id: 'workers',
      label: `Workers (${workersCount})`,
      desc: 'Manage workers',
      icon: Server
    },
    {
      id: 'projects',
      label: 'Sandbox Repos',
      desc: 'Isolated environments',
      icon: FolderGit2
    },
    {
      id: 'ops',
      label: 'Ops & Security Audit',
      desc: 'Monitor, diagnose, and secure',
      icon: ShieldCheck
    }
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between shrink-0 border-r border-[#152338] bg-[#070C16] text-[#A5B7CD] transition-all duration-200 z-30 select-none ${
        sidebarOpen ? 'w-[276px] min-w-[276px]' : 'w-16 min-w-16'
      }`}
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Brand & Collapse Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[#152338]/80 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0F223D] border border-[#1E4976] flex items-center justify-center text-[#22D3EE] shadow-inner shrink-0">
                <Terminal className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-white tracking-wide font-sans">
                    DANVERS JARVIS
                  </span>
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#0A2540] text-[#38BDF8] border border-[#164E63] font-semibold leading-tight">
                    v1.0
                  </span>
                </div>
                <span className="text-[11px] text-[#627D98] truncate leading-tight mt-0.5">
                  Personal AI Operating System
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-lg bg-[#0F223D] border border-[#1E4976] flex items-center justify-center text-[#22D3EE]">
              <Terminal className="w-4 h-4" />
            </div>
          )}

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded text-[#627D98] hover:text-white hover:bg-[#131F33] transition"
            title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            aria-label="Toggle Sidebar"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Project Context / Workspace Selector Card */}
        {sidebarOpen && (
          <div className="p-3">
            <div className="relative group">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0B1526] border border-[#1A2C46] hover:border-[#253E63] transition cursor-pointer">
                <div className="w-7 h-7 rounded-lg bg-[#10243E] border border-[#1D3E64] flex items-center justify-center text-[#38BDF8] shrink-0">
                  <FolderGit2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-white truncate">
                    {activeProject?.name || 'Disposable E2E Test Project'}
                  </span>
                  <span className="text-[10px] font-mono text-[#627D98] truncate" title={activeProject?.rootPath}>
                    {activeProject?.rootPath || 'D:\\Danvers\\workspaces\\dispo...'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#627D98] group-hover:text-[#9FB3C8] shrink-0" />
              </div>

              {/* Underlying select for accessibility and function */}
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Change active project workspace"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.rootPath} className="bg-[#0B1526] text-white">
                    {p.name} ({p.rootPath})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Main Navigation Items */}
        <nav className="px-2 py-1 space-y-1 flex-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition relative ${
                  isActive
                    ? 'bg-[#0E2038] text-white border border-[#1E4273] shadow-sm'
                    : 'text-[#829AB1] hover:text-white hover:bg-[#0B1424] border border-transparent'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <div
                  className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                    isActive ? 'text-[#38BDF8]' : 'text-[#627D98]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {sidebarOpen && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isActive ? 'font-semibold text-white' : 'font-medium'}`}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-2 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-[#486581] truncate leading-tight mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom System Status Section */}
      <div className="p-3 border-t border-[#152338]/80 bg-[#060A13] shrink-0">
        {sidebarOpen ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] font-medium text-[#829AB1]">System Status</span>
            </div>
            <div className="flex items-center gap-2 px-1 text-[11px] text-[#34D399]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="font-medium">All Systems Operational</span>
            </div>

            {/* Windows Local Status Card */}
            <div className="p-2.5 rounded-xl bg-[#091120] border border-[#152742] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-md bg-[#0F223D] border border-[#1E3A5F] flex items-center justify-center text-[#38BDF8] shrink-0">
                  <Laptop className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">Windows Local</span>
                  <span className="text-[10px] font-mono text-[#627D98] truncate" title={windowsWorkerId || 'Local worker'}>
                    {windowsWorkerId ? `${windowsWorkerId.slice(0, 14)}...` : 'pc_worker_local'}
                  </span>
                </div>
              </div>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded tracking-wide ${
                  windowsWorkerStatus === 'online'
                    ? 'bg-[#064E3B]/60 text-[#34D399] border border-[#059669]/60'
                    : 'bg-[#3F1219]/60 text-[#F87171] border border-[#DC2626]/40'
                }`}
              >
                {windowsWorkerStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* VPS Status Card */}
            <div className="p-2.5 rounded-xl bg-[#091120] border border-[#152742] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-md bg-[#0F223D] border border-[#1E3A5F] flex items-center justify-center text-[#38BDF8] shrink-0">
                  <Server className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">VPS (Contabo)</span>
                  <span className="text-[10px] font-mono text-[#627D98] truncate">
                    {vpsWorkerCount} server{vpsWorkerCount > 1 ? 's' : ''} active
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#064E3B]/60 text-[#34D399] border border-[#059669]/60 tracking-wide">
                ONLINE
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                windowsWorkerStatus === 'online' ? 'bg-[#10B981]' : 'bg-[#EF4444]'
              }`}
              title={`Windows Local: ${windowsWorkerStatus}`}
            />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" title="VPS: ONLINE" />
          </div>
        )}
      </div>
    </aside>
  );
};
