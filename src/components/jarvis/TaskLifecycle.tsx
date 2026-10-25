import React from 'react';
import {
  CheckCircle2, Clock, Play, FileCode2,
  AlertTriangle, ShieldCheck, ArrowRight
} from 'lucide-react';
import { Task } from '@/lib/jarvis/types';

interface TaskLifecycleProps {
  task: Task;
}

export const TaskLifecycle: React.FC<TaskLifecycleProps> = ({ task }) => {
  const steps = [
    { key: 'queued', label: 'Queued' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'running', label: 'Executing' },
    { key: 'testing', label: 'Testing' },
    { key: 'awaiting_approval', label: 'Awaiting Approval' },
    { key: 'succeeded', label: 'Completed' }
  ];

  // Helper to determine step status
  const getStepStatus = (stepKey: string) => {
    if (task.status === 'failed') {
      if (stepKey === task.status) return 'failed';
    }
    if (task.status === 'cancelled') {
      if (stepKey === 'queued') return 'done';
      return 'cancelled';
    }

    const stateOrder = ['queued', 'assigned', 'running', 'reviewing_changes', 'testing', 'awaiting_approval', 'succeeded'];
    const currentIdx = stateOrder.indexOf(task.status);
    const stepIdx = stateOrder.indexOf(stepKey);

    if (task.status === stepKey) return 'current';
    if (currentIdx > stepIdx) return 'done';
    return 'pending';
  };

  return (
    <div className="bg-[#070b13] border border-neutral-800/80 rounded-lg p-3">
      <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.key);
          return (
            <React.Fragment key={step.key}>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                    status === 'done'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : status === 'current'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500 animate-pulse'
                      : status === 'failed'
                      ? 'bg-red-950 text-red-400 border border-red-800'
                      : 'bg-neutral-900 text-neutral-600 border border-neutral-800'
                  }`}
                >
                  {status === 'done' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs font-sans whitespace-nowrap ${
                    status === 'current'
                      ? 'font-semibold text-cyan-300'
                      : status === 'done'
                      ? 'text-neutral-300'
                      : 'text-neutral-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 min-w-[12px] max-w-[32px] rounded ${
                    status === 'done' ? 'bg-emerald-600/50' : 'bg-neutral-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
