import React from 'react';
import {
  Sparkles, Play, ShieldAlert, Cpu, Laptop,
  FileCode2, Paperclip, ChevronDown, Check,
  AlertCircle
} from 'lucide-react';
import { Task, ProviderStatus } from '@/lib/jarvis/types';

interface DirectiveComposerProps {
  directiveTitle: string;
  setDirectiveTitle: (val: string) => void;
  directiveDescription: string;
  setDirectiveDescription: (val: string) => void;
  selectedTaskType: Task['type'];
  setSelectedTaskType: (val: Task['type']) => void;
  selectedWorkerId: string;
  setSelectedWorkerId: (val: string) => void;
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  providers: ProviderStatus | null;
  activeProjectName?: string;
  selectedFilePath?: string | null;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  workerOnline: boolean;
  modelOnline: boolean;
  isWindowsWorkspace: boolean;
}

export const DirectiveComposer: React.FC<DirectiveComposerProps> = ({
  directiveTitle,
  setDirectiveTitle,
  directiveDescription,
  setDirectiveDescription,
  selectedTaskType,
  setSelectedTaskType,
  selectedWorkerId,
  setSelectedWorkerId,
  selectedModel,
  setSelectedModel,
  providers,
  activeProjectName,
  selectedFilePath,
  onSubmit,
  isSubmitting,
  workerOnline,
  modelOnline,
  isWindowsWorkspace
}) => {
  const isActionDisabled = isSubmitting || !directiveTitle.trim();

  return (
    <div className="bg-[#0b101c] border border-neutral-800/90 hover:border-neutral-750 transition-colors rounded-xl p-5 shadow-2xl relative">
      {/* Composer Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-neutral-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">
              What should we work on?
            </h2>
            <p className="text-[11px] text-neutral-400">
              JARVIS will plan, write code, run verification tests, and stage a diff for approval.
            </p>
          </div>
        </div>

        {activeProjectName && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#070b13] border border-neutral-800 text-[11px] font-mono text-neutral-400">
            <span className="text-neutral-500">Target:</span>
            <span className="text-neutral-200 font-medium truncate max-w-[180px]">
              {activeProjectName}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Directive Title Input */}
        <div>
          <input
            type="text"
            required
            placeholder="Describe a feature, bug fix, or security analysis (e.g. Add strict email validator with unit tests)..."
            value={directiveTitle}
            onChange={e => setDirectiveTitle(e.target.value)}
            className="w-full px-4 py-3 bg-[#070b13] border border-neutral-800 focus:border-cyan-500/80 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none transition font-sans shadow-inner"
          />
        </div>

        {/* Context & Architectural constraints */}
        <div>
          <textarea
            rows={2}
            placeholder="Add context, target files, acceptance constraints, or verification guidelines..."
            value={directiveDescription}
            onChange={e => setDirectiveDescription(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#070b13] border border-neutral-800 focus:border-cyan-500/80 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none transition font-sans resize-none shadow-inner"
          />
        </div>

        {/* Selected file attachment pill if present */}
        {selectedFilePath && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs font-mono text-cyan-300">
            <Paperclip className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-neutral-400">Attached Context File:</span>
            <span className="font-semibold truncate">{selectedFilePath}</span>
          </div>
        )}

        {/* Target Parameters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Execution Mode */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
              Execution Mode
            </label>
            <div className="relative">
              <select
                value={selectedTaskType}
                onChange={e => setSelectedTaskType(e.target.value as Task['type'])}
                className="w-full pl-3 pr-8 py-2 bg-[#070b13] hover:bg-[#090e1a] border border-neutral-800 focus:border-cyan-500 rounded-lg text-xs text-neutral-200 focus:outline-none appearance-none transition cursor-pointer font-sans"
              >
                <option value="code_read">Level 1: Read-Only Analysis</option>
                <option value="code_edit">Level 2: Controlled Code Edit</option>
                <option value="security_audit">Level 1: Security Audit</option>
                <option value="test_run">Level 1: Isolated Test Run</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-neutral-500 pointer-events-none" />
            </div>
          </div>

          {/* Worker Node Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Assigned Worker
              </label>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                workerOnline ? 'text-emerald-400 bg-emerald-950/60' : 'text-amber-400 bg-amber-950/60'
              }`}>
                {workerOnline ? 'Online' : 'Pending/Offline'}
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedWorkerId}
                onChange={e => setSelectedWorkerId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-[#070b13] hover:bg-[#090e1a] border border-neutral-800 focus:border-cyan-500 rounded-lg text-xs text-neutral-200 focus:outline-none appearance-none transition cursor-pointer font-sans"
              >
                <option value="pc_worker_local">Windows PC (Local Worker)</option>
                <option value="vps_worker_remote">Linux VPS (Production Node)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-neutral-500 pointer-events-none" />
            </div>
          </div>

          {/* Model Gateway Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Inference Model
              </label>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                modelOnline ? 'text-emerald-400 bg-emerald-950/60' : 'text-neutral-400 bg-neutral-900'
              }`}>
                {modelOnline ? 'Ready' : 'Ollama Standby'}
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-[#070b13] hover:bg-[#090e1a] border border-neutral-800 focus:border-cyan-500 rounded-lg text-xs text-neutral-200 focus:outline-none appearance-none transition cursor-pointer font-sans"
              >
                {providers?.local_ollama?.models && providers.local_ollama.models.length > 0 ? (
                  providers.local_ollama.models.map((m: any) => (
                    <option key={m.name} value={m.name}>
                      Local: {m.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="qwen2.5-coder:3b">Local: Qwen 2.5 Coder 3B</option>
                    <option value="qwen3-coder:latest">Local: Qwen 3 Coder MoE</option>
                  </>
                )}
                <option value="gemini-1.5-pro">Cloud: Gemini 1.5 Pro</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-neutral-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Footer & Submit Trigger */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-neutral-800/60 gap-3">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
            <span>Isolated Git worktree staging & SHA-256 diff binding enforced</span>
          </div>

          <button
            type="submit"
            disabled={isActionDisabled}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition shadow-lg ${
              isActionDisabled
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
                : 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white shadow-cyan-950/60'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {isSubmitting
                ? 'Dispatching Directive...'
                : selectedTaskType === 'code_read'
                ? 'Run Analysis'
                : 'Dispatch Task'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
