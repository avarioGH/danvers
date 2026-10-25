import React from 'react';
import {
  X, Layers, FileCode2, ListTodo, ShieldAlert,
  Server, FolderGit2, ShieldCheck, ArrowLeft,
  Terminal, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { Project } from '@/lib/jarvis/types';

interface ResponsiveNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeNav: string;
  setActiveNav: (nav: any) => void;
  tasksCount: number;
  pendingApprovalsCount: number;
  workersCount: number;
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
}

export const ResponsiveNavigationDrawer: React.FC<ResponsiveNavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeNav,
  setActiveNav,
  tasksCount,
  pendingApprovalsCount,
  workersCount,
  projects,
  selectedProjectId,
  setSelectedProjectId
}) => {
  if (!isOpen) return null;

  const navItems = [
    { id: 'workspace', label: 'Agent Workspace', icon: Layers },
    { id: 'files', label: 'File Explorer', icon: FileCode2 },
    { id: 'tasks', label: `Directives (${tasksCount})`, icon: ListTodo },
    {
      id: 'approvals',
      label: `Approvals (${pendingApprovalsCount})`,
      icon: ShieldAlert,
      badge: pendingApprovalsCount > 0
    },
    { id: 'workers', label: `Workers (${workersCount})`, icon: Server },
    { id: 'projects', label: 'Sandbox Repos', icon: FolderGit2 },
    { id: 'ops', label: 'Ops & Security Audit', icon: ShieldCheck }
  ];

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className="relative w-72 max-w-[80vw] bg-[#090d18] border-r border-neutral-800 h-full flex flex-col justify-between z-10 p-4 shadow-2xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs tracking-wide text-white">DANVERS JARVIS</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-neutral-400 hover:text-white transition"
              aria-label="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Workspace Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold">
              Active Workspace
            </label>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={e => {
                  setSelectedProjectId(e.target.value);
                  onClose();
                }}
                className="w-full pl-3 pr-8 py-2 bg-[#050811] border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono truncate"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.rootPath}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-neutral-500 pointer-events-none" />
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 pt-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-neutral-500'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-neutral-800/80 space-y-2">
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-mono bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Main OS
          </Link>
        </div>
      </div>
    </div>
  );
};
