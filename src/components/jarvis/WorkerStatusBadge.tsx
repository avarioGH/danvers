import React from 'react';
import { Laptop, Server, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { WorkerTelemetry } from '@/lib/jarvis/types';

interface WorkerStatusBadgeProps {
  worker?: WorkerTelemetry;
  status?: string;
  isWindows?: boolean;
  name?: string;
  lastHeartbeat?: string;
  freshnessThresholdMs?: number; // default 60000 (1 min)
  compact?: boolean;
}

export type WorkerState = 'online' | 'stale' | 'offline' | 'revoked';

export function getWorkerState(
  status?: string,
  lastHeartbeat?: string,
  freshnessThresholdMs = 60000
): { state: WorkerState; label: string; ageMs: number } {
  if (!status || status === 'revoked') {
    return { state: 'revoked', label: 'Revoked', ageMs: Infinity };
  }

  if (!lastHeartbeat) {
    return { state: 'offline', label: 'Offline (No heartbeat)', ageMs: Infinity };
  }

  const ageMs = Date.now() - new Date(lastHeartbeat).getTime();

  if (ageMs <= freshnessThresholdMs) {
    return { state: 'online', label: 'Online', ageMs };
  } else if (ageMs <= freshnessThresholdMs * 5) {
    const mins = Math.floor(ageMs / 60000);
    return { state: 'stale', label: `Stale (${mins}m ago)`, ageMs };
  } else {
    return { state: 'offline', label: 'Offline', ageMs };
  }
}

export const WorkerStatusBadge: React.FC<WorkerStatusBadgeProps> = ({
  worker,
  isWindows,
  name,
  lastHeartbeat,
  freshnessThresholdMs = 60000,
  compact = false
}) => {
  const effectiveStatus = worker?.status || 'active';
  const effectiveHeartbeat = lastHeartbeat || worker?.lastHeartbeat;
  const displayName = name || worker?.name || (isWindows ? 'Windows Local' : 'Linux VPS');

  const { state, label } = getWorkerState(effectiveStatus, effectiveHeartbeat, freshnessThresholdMs);

  const colors = {
    online: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    stale: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    offline: 'bg-neutral-800/60 text-neutral-400 border-neutral-700/50',
    revoked: 'bg-red-500/10 text-red-400 border-red-500/30'
  }[state];

  const dotColors = {
    online: 'bg-emerald-400 animate-pulse',
    stale: 'bg-amber-400',
    offline: 'bg-neutral-500',
    revoked: 'bg-red-400'
  }[state];

  const Icon = isWindows || displayName.toLowerCase().includes('windows') ? Laptop : Server;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-medium ${colors}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />
        <span>{displayName}</span>
        <span className="opacity-75 font-normal">• {label}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border bg-[#0a0f1d]/60 ${colors}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs font-medium text-neutral-200">{displayName}</span>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[10px]">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />
        <span className="font-semibold uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
};
