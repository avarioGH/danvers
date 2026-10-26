import React, { useState } from 'react';
import {
  FolderGit2,
  GitBranch,
  Monitor,
  Laptop,
  Server,
  AlertTriangle,
  Cpu,
  Edit2,
  FileText,
  FileCode2,
  Clock,
  ChevronRight,
  ListTodo,
  Activity,
  CheckCircle2,
  Radio,
  Copy,
  Check
} from 'lucide-react';
import { Project, Task, WorkerTelemetry } from '@/lib/jarvis/types';

interface ProjectContextInspectorProps {
  activeProject?: Project | null;
  selectedTask?: Task | null;
  workers: WorkerTelemetry[];
  selectedModel: string;
  onClose: () => void;
  recentFiles?: { name: string; path: string; ext: string; time: string }[];
  onSelectFile?: (file: string) => void;
  onViewAllFiles?: () => void;
  onViewAllActivity?: () => void;
  activities?: { id: string; type: 'task' | 'worker' | 'file' | 'project'; title: string; subtitle: string; time: string }[];
}

export const ProjectContextInspector: React.FC<ProjectContextInspectorProps> = ({
  activeProject,
  selectedTask,
  workers,
  selectedModel,
  onClose,
  recentFiles = [
    { name: 'validator.js', path: 'src/utils', ext: 'JS', time: '2m ago' },
    { name: 'validator.test.js', path: 'tests', ext: 'JS', time: '5m ago' },
    { name: 'package.json', path: '/', ext: '{}', time: '1h ago' },
    { name: 'README.md', path: '/', ext: 'M+', time: '1h ago' },
    { name: 'index.js', path: 'src', ext: 'JS', time: '2h ago' }
  ],
  onSelectFile,
  onViewAllFiles,
  onViewAllActivity,
  activities = [
    { id: '1', type: 'task', title: 'Task queued', subtitle: 'Improve validator.js email validation', time: '12:44 PM' },
    { id: '2', type: 'worker', title: 'Worker heartbeat', subtitle: 'Windows PC online', time: '12:43 PM' },
    { id: '3', type: 'file', title: 'File accessed', subtitle: 'validator.js', time: '12:41 PM' },
    { id: '4', type: 'project', title: 'Project opened', subtitle: 'Disposable E2E Test Project', time: '12:40 PM' }
  ]
}) => {
  const [copiedPath, setCopiedPath] = useState(false);

  // 1. Resolve canonical workspace root path (no hardcoding)
  const canonicalPath = selectedTask?.scope?.workspaceRoot || activeProject?.rootPath || '';
  const isWindowsPath = /^[a-zA-Z]:\\/.test(canonicalPath);
  const isLinuxPath = canonicalPath.startsWith('/');

  // 2. Resolve assigned worker and target telemetry
  const assignedWorkerId = selectedTask?.workerId;
  const assignedWorker = assignedWorkerId
    ? workers.find(w => w.id === assignedWorkerId) || null
    : null;

  // Derive target label, icon, and status dynamically
  let targetLabel = 'Unassigned';
  let targetIcon = Monitor;
  let targetStatusText = 'No worker assigned';
  let targetStatusColor = 'text-[#627D98]';
  let targetBorderColor = 'border-[#1E385C]';
  let isRoutingConflict = false;

  if (assignedWorkerId) {
    if (assignedWorker) {
      const isWinWorker = assignedWorker.name.toLowerCase().includes('windows') || assignedWorker.id.includes('win');
      targetIcon = isWinWorker ? Laptop : Server;
      targetLabel = assignedWorker.name || assignedWorker.id;

      // Check for path routing conflict: Windows path on Linux worker or Linux path on Windows worker
      if ((isWindowsPath && !isWinWorker) || (isLinuxPath && isWinWorker)) {
        isRoutingConflict = true;
        targetStatusText = 'Routing Conflict';
        targetStatusColor = 'text-amber-400';
        targetBorderColor = 'border-amber-600/50';
      } else {
        // Evaluate actual connectivity
        const hbAge = assignedWorker.lastHeartbeat
          ? Date.now() - new Date(assignedWorker.lastHeartbeat).getTime()
          : Infinity;
        if (assignedWorker.status === 'revoked') {
          targetStatusText = 'Revoked';
          targetStatusColor = 'text-red-400';
        } else if (hbAge <= 60000) {
          targetStatusText = 'Online';
          targetStatusColor = 'text-emerald-400';
        } else if (hbAge <= 300000) {
          targetStatusText = 'Stale';
          targetStatusColor = 'text-amber-400';
        } else {
          targetStatusText = 'Offline';
          targetStatusColor = 'text-neutral-400';
        }
      }
    } else {
      // Worker ID was specified on task but worker record not found
      targetLabel = `Worker ${assignedWorkerId.slice(0, 12)}...`;
      targetIcon = isWindowsPath ? Laptop : Server;
      targetStatusText = 'Unknown Worker';
      targetStatusColor = 'text-neutral-400';
    }
  } else if (canonicalPath) {
    // No task or task unassigned: derive expected platform from project canonical root
    if (isWindowsPath) {
      targetIcon = Laptop;
      targetLabel = 'Windows Local Worker';
      // Find latest active Windows worker to show its actual status
      const winWorkers = workers.filter(w => w.status === 'active' && w.name.toLowerCase().includes('windows'));
      const activeWinWorker = winWorkers.sort((a, b) => {
        const tA = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
        const tB = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
        return tB - tA;
      })[0];
      const hbAge = activeWinWorker?.lastHeartbeat ? Date.now() - new Date(activeWinWorker.lastHeartbeat).getTime() : Infinity;
      if (activeWinWorker && hbAge <= 60000) {
        targetStatusText = 'Online';
        targetStatusColor = 'text-emerald-400';
      } else {
        targetStatusText = 'Offline';
        targetStatusColor = 'text-neutral-400';
      }
    } else if (isLinuxPath) {
      targetIcon = Server;
      targetLabel = 'Contabo Linux VPS';
      const linuxWorkers = workers.filter(w => w.status === 'active' && (w.name.toLowerCase().includes('vps') || w.name.toLowerCase().includes('linux')));
      const activeLnxWorker = linuxWorkers[0];
      const hbAge = activeLnxWorker?.lastHeartbeat ? Date.now() - new Date(activeLnxWorker.lastHeartbeat).getTime() : Infinity;
      if (activeLnxWorker && hbAge <= 60000) {
        targetStatusText = 'Online';
        targetStatusColor = 'text-emerald-400';
      } else {
        targetStatusText = 'Offline';
        targetStatusColor = 'text-neutral-400';
      }
    } else {
      targetIcon = Monitor;
      targetLabel = 'Unassigned';
      targetStatusText = 'No workspace path';
      targetStatusColor = 'text-neutral-500';
    }
  }

  const handleCopyPath = () => {
    if (!canonicalPath) return;
    navigator.clipboard.writeText(canonicalPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const TargetIcon = targetIcon;

  return (
    <aside className="w-[340px] min-w-[340px] bg-[#070C16] border-l border-[#152338] flex flex-col h-full overflow-y-auto text-[#9FB3C8] select-none p-3 space-y-4">
      {/* 1. Project Context Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
            <span>Project context</span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] text-[#627D98] hover:text-[#9FB3C8] transition px-2 py-0.5 rounded border border-[#172A45] bg-[#0B1526]"
          >
            <Edit2 className="w-2.5 h-2.5" />
            <span>Edit</span>
          </button>
        </div>

        {/* Project Context Metadata Card */}
        <div className="rounded-xl bg-[#0B1424] border border-[#162942] p-3 space-y-3 text-xs">
          {/* Project Name */}
          <div className="flex flex-col space-y-0.5">
            <span className="text-[10px] text-[#627D98]">Project name</span>
            <span className="font-semibold text-white truncate" title={activeProject?.name || 'Disposable E2E Test Project'}>
              {activeProject?.name || 'Disposable E2E Test Project'}
            </span>
          </div>

          {/* Workspace Path */}
          <div className="flex flex-col space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#627D98]">Workspace path</span>
              {canonicalPath && (
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className="flex items-center gap-1 text-[10px] text-[#38BDF8] hover:text-white transition font-mono"
                  title="Copy canonical path"
                >
                  {copiedPath ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  <span>{copiedPath ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
            <div
              className="text-[11px] font-mono text-[#CBD5E1] break-all select-all bg-[#070D18] p-1.5 rounded border border-[#142339] max-h-16 overflow-y-auto leading-relaxed"
              title={canonicalPath || 'No workspace path registered'}
            >
              {canonicalPath || <span className="text-neutral-500 italic">No workspace path registered</span>}
            </div>
          </div>

          {/* Git Branch */}
          <div className="flex flex-col space-y-0.5">
            <span className="text-[10px] text-[#627D98]">Git branch</span>
            <div className="flex items-center gap-1.5 text-[#38BDF8] font-mono text-xs font-medium">
              <GitBranch className="w-3.5 h-3.5" />
              <span>{activeProject?.git?.branch || 'main'}</span>
            </div>
          </div>

          {/* Target */}
          <div className="flex flex-col space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#627D98]">Target</span>
              <span className={`text-[10px] font-mono font-medium ${targetStatusColor}`}>
                {targetStatusText}
              </span>
            </div>
            <div className={`flex items-center justify-between gap-1.5 text-white text-xs p-1.5 rounded bg-[#070D18] border ${targetBorderColor}`}>
              <div className="flex items-center gap-2 min-w-0">
                <TargetIcon className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                <span className="truncate font-sans">{targetLabel}</span>
              </div>
              {isRoutingConflict && (
                <span title="The selected worker OS cannot access this workspace root" className="text-amber-400 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </div>

          {/* Default Model */}
          <div className="flex flex-col space-y-0.5">
            <span className="text-[10px] text-[#627D98]">Default model</span>
            <div className="flex items-center gap-1.5 text-white text-xs">
              <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="truncate">{selectedModel || 'Qwen 2.5 Coder 3B'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recent Files Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wide">
            <FileCode2 className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Recent files</span>
          </div>
          <button
            type="button"
            onClick={onViewAllFiles}
            className="text-[11px] text-[#38BDF8] hover:text-[#7DD3FC] transition font-medium"
          >
            View all
          </button>
        </div>

        <div className="space-y-1">
          {recentFiles.map((file, idx) => (
            <div
              key={idx}
              onClick={() => onSelectFile && onSelectFile(file.name)}
              className="flex items-center justify-between p-2 rounded-xl bg-[#091222] hover:bg-[#0E1D33] border border-[#14263F] hover:border-[#1E3A63] transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* File extension badge */}
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                    file.ext === 'JS'
                      ? 'bg-[#EAB308]/20 text-[#FACC15] border border-[#CA8A04]/40'
                      : file.ext === '{}'
                      ? 'bg-[#3B82F6]/20 text-[#60A5FA] border border-[#2563EB]/40'
                      : 'bg-[#A855F7]/20 text-[#C084FC] border border-[#9333EA]/40'
                  }`}
                >
                  {file.ext}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate font-sans">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-[#627D98] truncate font-mono">
                    {file.path}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-[#486581] font-mono shrink-0 pl-1">
                {file.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Latest Activity Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wide">
            <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Latest activity</span>
          </div>
          <button
            type="button"
            onClick={onViewAllActivity}
            className="text-[11px] text-[#38BDF8] hover:text-[#7DD3FC] transition font-medium"
          >
            View all
          </button>
        </div>

        <div className="space-y-1">
          {activities.map(act => (
            <div
              key={act.id}
              className="flex items-center justify-between p-2 rounded-xl bg-[#091222] border border-[#14263F]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    act.type === 'task'
                      ? 'bg-[#8B5CF6]/20 text-[#A78BFA]'
                      : act.type === 'worker'
                      ? 'bg-[#10B981]/20 text-[#34D399]'
                      : act.type === 'file'
                      ? 'bg-[#3B82F6]/20 text-[#60A5FA]'
                      : 'bg-[#06B6D4]/20 text-[#22D3EE]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">
                    {act.title}
                  </span>
                  <span className="text-[10px] text-[#627D98] truncate">
                    {act.subtitle}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-[#486581] font-mono shrink-0 pl-1">
                {act.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
