import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Maximize2,
  Trash2,
  Check,
  Copy
} from 'lucide-react';
import { Task } from '@/lib/jarvis/types';

interface ExecutionLogPanelProps {
  task: Task;
}

export const ExecutionLogPanel: React.FC<ExecutionLogPanelProps> = ({ task }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const logs = task.logs || [];

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-[#14263F] bg-[#070D18] overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#091222] border-b border-[#14263F]">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-xs font-semibold text-[#CBD5E1] hover:text-white transition"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-[#627D98]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#627D98]" />}
          <span>Execution Log</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Live indicator badge */}
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#064E3B]/60 text-[#34D399] border border-[#059669]/60 text-[10px] font-mono font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span>Live</span>
          </span>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="px-2 py-0.5 rounded bg-[#0D1B2E] hover:bg-[#132742] border border-[#193356] text-[10px] font-medium text-[#CBD5E1] transition flex items-center gap-1"
            title="Copy logs"
          >
            {copied ? <Check className="w-3 h-3 text-[#34D399]" /> : <span>Clear</span>}
          </button>

          <button
            type="button"
            className="p-1 rounded text-[#627D98] hover:text-white transition"
            title="Expand viewer"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Content Body */}
      {!collapsed && (
        <div className="p-3 font-mono text-[11px] max-h-56 overflow-y-auto space-y-1.5 select-text bg-[#050A13]">
          {logs.length === 0 ? (
            <div className="text-[#486581] py-2 text-center font-sans text-xs">
              No logs recorded yet. Waiting in queue for worker pickup...
            </div>
          ) : (
            logs.map((log: any, idx: number) => {
              const time = new Date(log.timestamp).toLocaleTimeString();
              const isInfo = log.level === 'info';
              const isWarn = log.level === 'warn';
              const isError = log.level === 'error';

              return (
                <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="text-[#486581] shrink-0 select-none">{time}</span>
                  <span
                    className={`shrink-0 font-bold select-none text-[10px] ${
                      isInfo
                        ? 'text-[#38BDF8]'
                        : isWarn
                        ? 'text-[#FBBF24]'
                        : isError
                        ? 'text-[#F87171]'
                        : 'text-[#94A3B8]'
                    }`}
                  >
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="text-[#CBD5E1] break-all">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
