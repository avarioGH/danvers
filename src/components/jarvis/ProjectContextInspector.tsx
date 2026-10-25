import React from 'react';
import {
  FolderGit2, GitBranch, Laptop, Cpu,
  FileCode2, CheckCircle2, ShieldCheck,
  PanelRightClose, Activity, ExternalLink,
  Info
} from 'lucide-react';
import { Project, Task, WorkerTelemetry } from '@/lib/jarvis/types';

interface ProjectContextInspectorProps {
  activeProject?: Project | null;
  selectedTask?: Task | null;
  workers: WorkerTelemetry[];
  selectedModel: string;
  onClose: () => void;
  recentFiles?: string[];
  onSelectFile?: (file: string) => void;
}

export const ProjectContextInspector: React.FC<ProjectContextInspectorProps> = ({
  activeProject,
  selectedTask,
  workers,
  selectedModel,
  onClose,
  recentFiles = [],
  onSelectFile
}) => {
  const isWindowsPath = activeProject?.rootPath ? /^[a-zA-Z]:\\/.test(activeProject.rootPath) : false;

  return (
    <div className="flex flex-col h-full bg-[#0a0e19] text-neutral-200">
      {/* Inspector Header */}
      <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-neutral-200">
            Workspace Context
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition"
          title="Close Inspector"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto flex-1 font-sans text-xs">
        {/* Active Project Card */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-2 font-medium">
            Active Workspace
          </span>
          <div className="bg-[#070b14] p-3.5 rounded-xl border border-neutral-800/90 space-y-2.5">
            <div>
              <div className="font-semibold text-neutral-100 flex items-center justify-between">
                <span>{activeProject?.name || 'Workspace Root'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                  {isWindowsPath ? 'Windows' : 'Linux'}
                </span>
              </div>
              <div
                className="text-[11px] font-mono text-neutral-400 break-all mt-1 bg-[#04060c] p-2 rounded border border-neutral-850"
                title={activeProject?.rootPath}
              >
                {activeProject?.rootPath || 'Not configured'}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-850">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" /> Git Branch:
              </span>
              <span className="font-mono text-neutral-200 font-medium">
                {activeProject?.git?.branch || 'main'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Working Tree:</span>
              <span className={`font-mono text-[10px] font-semibold ${
                activeProject?.git?.clean ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {activeProject?.git?.clean ? 'CLEAN' : 'MODIFIED'}
              </span>
            </div>
          </div>
        </div>

        {/* Worker & Model Assignment */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-2 font-medium">
            Target Execution Node
          </span>
          <div className="bg-[#070b14] p-3.5 rounded-xl border border-neutral-800/90 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Worker Node:</span>
              <span className="font-mono text-neutral-200 font-medium">
                {isWindowsPath ? 'Windows Local' : 'Contabo VPS'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Inference Gateway:</span>
              <span className="font-mono text-cyan-300 font-medium truncate max-w-[140px]">
                {selectedModel}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Isolation Sandbox:</span>
              <span className="font-mono text-emerald-400 text-[10px]">Git Worktree</span>
            </div>
          </div>
        </div>

        {/* Selected Task Details if active */}
        {selectedTask && (
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-2 font-medium">
              Selected Directive Detail
            </span>
            <div className="bg-[#070b14] p-3.5 rounded-xl border border-neutral-800/90 space-y-2.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-500">Task ID:</span>
                <span className="font-mono text-neutral-300 text-[10px] truncate max-w-[150px]">
                  {selectedTask.id}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-500">Permission:</span>
                <span className="font-mono text-amber-400 font-semibold">
                  Level {selectedTask.permissionLevel}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-500">Created:</span>
                <span className="font-mono text-neutral-400 text-[10px]">
                  {new Date(selectedTask.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Security & Verification Manifest */}
        <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-[11px] space-y-1.5">
          <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Anti-Tamper Binding Active</span>
          </div>
          <p className="text-neutral-400 text-[10px] leading-relaxed">
            All code modifications are locked via SHA-256 diff hash before promotion to protected branches.
          </p>
        </div>
      </div>
    </div>
  );
};
