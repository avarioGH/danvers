import React from 'react';
import {
  Layers, FileCode2, ListTodo, ShieldAlert,
  Server, FolderGit2, ShieldCheck, PanelLeftClose,
  PanelLeft, Terminal, FolderPlus, GitBranch,
  ChevronDown
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
  onOpenAddProjectModal
}) => {
  const navItems = [
    { id: 'workspace', label: 'Agent Workspace', icon: Layers, desc: 'Plan, code, and execute' },
    { id: 'files', label: 'File Explorer', icon: FileCode2, desc: 'Browse project workspace' },
    { id: 'tasks', label: `Directives (${tasksCount})`, icon: ListTodo, desc: 'Queue & task history' },
    {
      id: 'approvals',
      label: `Approvals (${pendingApprovalsCount})`,
      icon: ShieldAlert,
      badge: pendingApprovalsCount > 0,
      desc: 'Level 3 operator signoff'
    },
    { id: 'workers', label: `Workers (${workersCount})`, icon: Server, desc: 'Active execution nodes' },
    { id: 'projects', label: 'Sandbox Repos', icon: FolderGit2, desc: 'Registered workspaces' },
    { id: 'ops', label: 'Ops & Security Audit', icon: ShieldCheck, desc: 'VPS & infrastructure health' }
  ];

  return (
    <div className="flex flex-col flex-1">
      {/* Brand & Collapse Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-neutral-800/80">
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950/50">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs tracking-wide text-neutral-100">
                  DANVERS JARVIS
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-cyan-950/90 text-cyan-400 border border-cyan-800/60 font-semibold">
                  v1.0
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 font-sans tracking-tight truncate">
                Personal AI Operating System
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-7 h-7 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Terminal className="w-4 h-4" />
          </div>
        )}

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition"
          title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          aria-label="Toggle Sidebar"
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Project Switcher in Sidebar */}
      {sidebarOpen && (
        <div className="p-3 border-b border-neutral-800/50 bg-[#070b13]/40">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <label className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase font-mono">
              Workspace
            </label>
            <button
              onClick={onOpenAddProjectModal}
              className="p-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded transition"
              title="Register new local workspace folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative group">
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-[#0a0f1d] hover:bg-[#0c1324] border border-neutral-800 hover:border-neutral-700 rounded-lg text-xs font-medium text-neutral-200 focus:outline-none focus:border-cyan-500/80 appearance-none transition cursor-pointer truncate"
            >
              {projects.map(p => (
                <option key={p.id} value={p.rootPath} className="bg-[#0a0f1d] text-neutral-200">
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-neutral-500 pointer-events-none group-hover:text-neutral-400 transition" />
          </div>

          {activeProject && (
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-neutral-400 px-1">
              <span className="flex items-center gap-1.5 truncate max-w-[140px]" title={activeProject.git?.branch || 'main'}>
                <GitBranch className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{activeProject.git?.branch || 'main'}</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                activeProject.git?.clean
                  ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                  : 'bg-amber-950/50 text-amber-400 border border-amber-800/40'
              }`}>
                {activeProject.git?.clean ? 'clean' : 'modified'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Navigation Items */}
      <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition group text-left ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 border border-transparent'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-neutral-500 group-hover:text-neutral-300'
                }`}
              />
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <div className="truncate flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-2 shrink-0" />
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
