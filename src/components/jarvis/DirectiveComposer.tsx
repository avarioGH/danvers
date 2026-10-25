import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  FileCode2,
  Paperclip,
  FolderGit2,
  ChevronDown,
  Check,
  Plus
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
  onOpenProjectFiles?: () => void;
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
  isWindowsWorkspace,
  onOpenProjectFiles
}) => {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [contextDropdownOpen, setContextDropdownOpen] = useState(false);

  const isActionDisabled = isSubmitting || (!directiveTitle.trim() && !directiveDescription.trim());

  // Action button label & icon based on mode
  const getActionLabel = () => {
    if (isSubmitting) return 'Submitting...';
    switch (selectedTaskType) {
      case 'code_read':
        return 'Run analysis';
      case 'code_edit':
        return 'Start implementation';
      case 'security_audit':
        return 'Run security audit';
      case 'test_run':
        return 'Run verification tests';
      default:
        return 'Run directive';
    }
  };

  const handleApplyExample = (title: string, desc: string, type: Task['type']) => {
    setDirectiveTitle(title);
    setDirectiveDescription(desc);
    setSelectedTaskType(type);
    setExamplesOpen(false);
  };

  return (
    <div className="bg-[#0A1220] border border-[#162942] rounded-2xl p-5 shadow-2xl relative">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Composer Card Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white tracking-tight font-sans">
            What should we work on?
          </h2>
          {selectedFilePath && (
            <span className="text-[11px] font-mono text-[#38BDF8] bg-[#0E2442] border border-[#1E4575] px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
              <FileCode2 className="w-3 h-3 text-[#38BDF8]" />
              <span className="truncate max-w-[200px]">{selectedFilePath}</span>
            </span>
          )}
        </div>

        {/* Multiline Directive Input Area */}
        <div className="relative rounded-xl bg-[#060B14] border border-[#152742] focus-within:border-[#228BE6] transition-all p-3.5 shadow-inner">
          <input
            type="text"
            value={directiveTitle}
            onChange={e => setDirectiveTitle(e.target.value)}
            placeholder="Describe a bug, feature, or code audit..."
            className="w-full bg-transparent text-sm text-white placeholder-[#627D98] focus:outline-none font-medium mb-1.5"
            disabled={isSubmitting}
          />
          <textarea
            value={directiveDescription}
            onChange={e => setDirectiveDescription(e.target.value)}
            placeholder="Be specific and include files, error messages, or expected behavior."
            rows={2}
            className="w-full bg-transparent text-xs text-[#CBD5E1] placeholder-[#486581] focus:outline-none resize-none leading-relaxed"
            disabled={isSubmitting}
          />
        </div>

        {/* Mid-Row Context Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Add context button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setContextDropdownOpen(!contextDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1D33] hover:bg-[#162A49] border border-[#1B355B] text-xs font-medium text-[#CBD5E1] transition"
              >
                <Plus className="w-3.5 h-3.5 text-[#627D98]" />
                <span>Add context</span>
                <ChevronDown className="w-3 h-3 text-[#627D98]" />
              </button>
              {contextDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl bg-[#091322] border border-[#1E3A63] shadow-2xl p-1.5 z-40 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDirectiveDescription(directiveDescription ? `${directiveDescription}\n[Context: Enforce strict TypeScript types and zero eslint warnings]` : '[Context: Enforce strict TypeScript types and zero eslint warnings]');
                      setContextDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#CBD5E1] hover:text-white hover:bg-[#12243D] transition"
                  >
                    TypeScript strict mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectiveDescription(directiveDescription ? `${directiveDescription}\n[Context: Write comprehensive unit tests in Jest/Vitest]` : '[Context: Write comprehensive unit tests in Jest/Vitest]');
                      setContextDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#CBD5E1] hover:text-white hover:bg-[#12243D] transition"
                  >
                    Generate unit tests
                  </button>
                </div>
              )}
            </div>

            {/* Attach files button */}
            <button
              type="button"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = (e: any) => {
                  const file = e.target?.files?.[0];
                  if (file) {
                    setDirectiveDescription(directiveDescription ? `${directiveDescription}\n[Attached Context: ${file.name}]` : `[Attached Context: ${file.name}]`);
                  }
                };
                input.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1D33] hover:bg-[#162A49] border border-[#1B355B] text-xs font-medium text-[#CBD5E1] transition"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#627D98]" />
              <span>Attach files</span>
            </button>

            {/* Select from project button */}
            <button
              type="button"
              onClick={onOpenProjectFiles}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1D33] hover:bg-[#162A49] border border-[#1B355B] text-xs font-medium text-[#CBD5E1] transition"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-[#627D98]" />
              <span>Select from project</span>
            </button>
          </div>

          {/* Examples button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExamplesOpen(!examplesOpen)}
              className="flex items-center gap-1.5 text-xs text-[#38BDF8] hover:text-[#7DD3FC] transition py-1 px-2 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Examples</span>
            </button>
            {examplesOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 rounded-xl bg-[#091322] border border-[#1E3A63] shadow-2xl p-2 z-40 text-xs space-y-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleApplyExample(
                      'Improve validator.js email validation',
                      'Add strict email regex and test edge cases.',
                      'code_edit'
                    )
                  }
                  className="w-full text-left p-2 rounded-lg bg-[#0E1C31] hover:bg-[#152B4B] border border-[#193254] transition text-white"
                >
                  <div className="font-semibold text-xs">Email validator patch</div>
                  <div className="text-[10px] text-[#627D98]">Level 2 Code Edit</div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyExample(
                      'Audit dependencies for CVE vulnerabilities',
                      'Run comprehensive package security check.',
                      'security_audit'
                    )
                  }
                  className="w-full text-left p-2 rounded-lg bg-[#0E1C31] hover:bg-[#152B4B] border border-[#193254] transition text-white"
                >
                  <div className="font-semibold text-xs">Security audit check</div>
                  <div className="text-[10px] text-[#627D98]">Level 1 Read-Only</div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Parameter Controls & Primary Action Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#142339]">
          {/* 1. Execution mode dropdown */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-mono uppercase text-[#627D98] tracking-wider flex items-center gap-1">
              <span>Execution mode</span>
            </label>
            <div className="relative">
              <select
                value={selectedTaskType}
                onChange={e => setSelectedTaskType(e.target.value as Task['type'])}
                className="w-full bg-[#08101C] hover:bg-[#0D1829] border border-[#172D4B] hover:border-[#22436F] rounded-xl px-3 py-2 text-xs font-medium text-white appearance-none cursor-pointer focus:outline-none focus:border-[#2563EB] transition pr-8"
              >
                <option value="code_read">Read-only analysis</option>
                <option value="code_edit">Controlled code edit</option>
                <option value="security_audit">Security audit</option>
                <option value="test_run">Isolated test run</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#627D98] absolute right-2.5 top-3 pointer-events-none" />
            </div>
            <span className="text-[10px] text-[#486581] truncate">
              {selectedTaskType === 'code_read'
                ? 'Analyze code, find issues, and propose solutions'
                : selectedTaskType === 'code_edit'
                ? 'Make verified edits in isolated Git worktree'
                : selectedTaskType === 'security_audit'
                ? 'Audit dependencies, keys, and permissions'
                : 'Run sandbox verification suite'}
            </span>
          </div>

          {/* 2. Worker node dropdown */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-mono uppercase text-[#627D98] tracking-wider flex items-center gap-1">
              <span>Worker</span>
            </label>
            <div className="relative">
              <select
                value={selectedWorkerId}
                onChange={e => setSelectedWorkerId(e.target.value)}
                className="w-full bg-[#08101C] hover:bg-[#0D1829] border border-[#172D4B] hover:border-[#22436F] rounded-xl px-3 py-2 text-xs font-medium text-white appearance-none cursor-pointer focus:outline-none focus:border-[#2563EB] transition pr-8"
              >
                <option value="pc_worker_local">
                  {workerOnline ? '● ' : '○ '}Windows PC (Local Worker)
                </option>
                <option value="vps_worker_remote">
                  ● Linux VPS (Production Node)
                </option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#627D98] absolute right-2.5 top-3 pointer-events-none" />
            </div>
            <span className="text-[10px] text-[#486581] truncate">
              {selectedWorkerId === 'pc_worker_local'
                ? 'Access your local files and environment'
                : 'Isolated Hetzner/Contabo Linux sandbox'}
            </span>
          </div>

          {/* 3. Model selector dropdown */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-mono uppercase text-[#627D98] tracking-wider flex items-center gap-1">
              <span>Model</span>
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full bg-[#08101C] hover:bg-[#0D1829] border border-[#172D4B] hover:border-[#22436F] rounded-xl px-3 py-2 text-xs font-medium text-white appearance-none cursor-pointer focus:outline-none focus:border-[#2563EB] transition pr-8"
              >
                <option value="qwen2.5-coder:3b">Qwen 2.5 Coder 3B</option>
                <option value="qwen2.5-coder:7b">Qwen 2.5 Coder 7B</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#627D98] absolute right-2.5 top-3 pointer-events-none" />
            </div>
            <span className="text-[10px] text-[#486581] truncate">
              Local model via Ollama (fast & private)
            </span>
          </div>

          {/* 4. Primary Run Action Button */}
          <div className="flex flex-col justify-end">
            <button
              type="submit"
              disabled={isActionDisabled}
              className="w-full h-[38px] rounded-xl bg-[#1A73E8] hover:bg-[#1E88E5] active:bg-[#1565C0] text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-950/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{getActionLabel()}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
