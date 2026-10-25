import React from 'react';
import { Task } from '@/lib/jarvis/types';

interface TaskLifecycleProps {
  task: Task;
}

export const TaskLifecycle: React.FC<TaskLifecycleProps> = ({ task }) => {
  const steps = [
    { key: 'queued', label: 'Queued', time: new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { key: 'planning', label: 'Planning', time: '—' },
    { key: 'executing', label: 'Executing', time: '—' },
    { key: 'testing', label: 'Testing', time: '—' },
    { key: 'awaiting_approval', label: 'Awaiting Approval', time: '—' },
    { key: 'completed', label: 'Completed', time: '—' }
  ];

  // Helper to map status to step state
  const getStepState = (stepKey: string) => {
    if (task.status === 'failed') {
      if (stepKey === 'queued') return 'done';
      return 'failed';
    }

    const stateMap: Record<string, number> = {
      queued: 0,
      assigned: 1,
      running: 2,
      reviewing_changes: 2,
      testing: 3,
      awaiting_approval: 4,
      succeeded: 5
    };

    const currentIdx = stateMap[task.status] ?? 0;
    const stepIdx = steps.findIndex(s => s.key === stepKey);

    if (currentIdx === stepIdx) return 'active';
    if (currentIdx > stepIdx) return 'done';
    return 'inactive';
  };

  return (
    <div className="py-2 overflow-x-auto">
      <div className="flex items-center min-w-[620px] justify-between">
        {steps.map((step, idx) => {
          const state = getStepState(step.key);
          const isDone = state === 'done';
          const isActive = state === 'active';
          const isFailed = state === 'failed';

          return (
            <React.Fragment key={step.key}>
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Circle step indicator */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'border-2 border-[#38BDF8] bg-[#0C2442] shadow-sm shadow-cyan-500/30'
                      : isDone
                      ? 'border border-[#059669] bg-[#064E3B] text-[#34D399]'
                      : isFailed
                      ? 'border border-[#DC2626] bg-[#450A0A] text-[#F87171]'
                      : 'border border-[#1E385C] bg-[#0A1628]'
                  }`}
                >
                  {isDone ? (
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
                  ) : null}
                </div>

                {/* Step label and metadata */}
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-medium font-sans ${
                      isActive ? 'text-[#38BDF8] font-semibold' : isDone ? 'text-white' : 'text-[#627D98]'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] font-mono text-[#486581]">
                    {isActive || isDone ? step.time : '—'}
                  </span>
                </div>
              </div>

              {/* Connecting line between stages */}
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-[1px] mx-3 ${
                    isDone ? 'bg-[#059669]/60' : 'bg-[#152B47]'
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
