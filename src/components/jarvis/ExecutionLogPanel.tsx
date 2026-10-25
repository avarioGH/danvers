import React, { useState } from 'react';
import {
  Terminal, ShieldCheck, CheckCircle2, XCircle,
  FileText, Activity, AlertTriangle, Copy, Check,
  ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { Task } from '@/lib/jarvis/types';

interface ExecutionLogPanelProps {
  task: Task;
}

export const ExecutionLogPanel: React.FC<ExecutionLogPanelProps> = ({ task }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'diff' | 'tests' | 'meta'>('logs');
  const [copied, setCopied] = useState(false);

  const logs = task.logs || [];
  const diff = task.result?.diff || task.approvalRequest?.diffSnapshot || '';
  const testResults = task.result?.testResults || [];

  const handleCopyDiff = () => {
    if (!diff) return;
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0b101c] border border-neutral-800/90 rounded-xl overflow-hidden shadow-xl">
      {/* Sub-Tabs Navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#080d17] border-b border-neutral-800/80">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'logs'
                ? 'bg-neutral-800 text-cyan-300 border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Execution Logs ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'diff'
                ? 'bg-neutral-800 text-cyan-300 border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Diff & Changes {diff ? '•' : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'tests'
                ? 'bg-neutral-800 text-cyan-300 border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Test Results ({testResults.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'diff' && diff && (
            <button
              onClick={handleCopyDiff}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#070b13] hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono text-neutral-300 transition"
              title="Copy diff to clipboard"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Diff'}</span>
            </button>
          )}
          <span className="text-[10px] font-mono text-neutral-500">
            {task.workerId || 'pc_worker_local'}
          </span>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="p-4">
        {activeTab === 'logs' && (
          <div className="bg-[#050811] border border-neutral-900 rounded-lg p-3 font-mono text-xs max-h-72 overflow-y-auto space-y-1.5 text-neutral-300">
            {logs.length === 0 ? (
              <div className="text-neutral-500 py-4 text-center font-sans text-xs">
                No logs recorded yet. Execution waiting in queue.
              </div>
            ) : (
              logs.map((log: any, i: number) => (
                <div key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-neutral-500 text-[10px] shrink-0 select-none">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase shrink-0 px-1 py-0.2 rounded select-none ${
                      log.level === 'error'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : log.level === 'warn'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-neutral-900 text-cyan-400'
                    }`}
                  >
                    [{log.level}]
                  </span>
                  <span className="break-all font-mono">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="space-y-2">
            {!diff ? (
              <div className="p-6 bg-[#050811] rounded-lg border border-neutral-900 text-center text-xs text-neutral-500 font-sans">
                No code modifications generated for this task yet.
              </div>
            ) : (
              <pre className="p-3.5 bg-[#03060e] rounded-lg border border-neutral-800/80 text-[11px] font-mono text-cyan-200/90 overflow-x-auto max-h-80 leading-normal">
                {diff.split('\n').map((line: string, idx: number) => {
                  let colorClass = 'text-neutral-300';
                  if (line.startsWith('+') && !line.startsWith('+++')) colorClass = 'text-emerald-400 bg-emerald-950/20';
                  if (line.startsWith('-') && !line.startsWith('---')) colorClass = 'text-rose-400 bg-rose-950/20';
                  if (line.startsWith('@@')) colorClass = 'text-cyan-400 font-bold';
                  return (
                    <div key={idx} className={`${colorClass} px-1 rounded-sm`}>
                      {line}
                    </div>
                  );
                })}
              </pre>
            )}
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-3">
            {testResults.length === 0 ? (
              <div className="p-6 bg-[#050811] rounded-lg border border-neutral-900 text-center text-xs text-neutral-500 font-sans">
                No unit test execution results recorded for this directive.
              </div>
            ) : (
              testResults.map((tr: any, i: number) => (
                <div key={i} className="p-3 bg-[#070b13] rounded-lg border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-neutral-300 font-medium">
                      $ {tr.command} (exit code: {tr.exitCode})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        tr.passed
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {tr.passed ? 'PASSED' : 'FAILED'} ({tr.durationMs}ms)
                    </span>
                  </div>
                  <pre className="p-2.5 bg-[#03050b] rounded text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {tr.output}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
