export type TaskStatus =
  | 'queued'
  | 'assigned'
  | 'running'
  | 'reviewing_changes'
  | 'testing'
  | 'awaiting_approval'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type PermissionLevel = 1 | 2 | 3;

export interface TaskScope {
  workspaceRoot: string;
  allowedPaths: string[];
  readOnly?: boolean;
}

export interface TaskLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  action: string;
  target: string;
  description: string;
  details?: Record<string, unknown>;
  diffSnapshot?: string;
  diffHash?: string;
  baseCommit?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt?: string;
  resolvedBy?: string;
  rejectionReason?: string;
}

export interface TaskWorkspaceInfo {
  worktreePath: string;
  branchName: string;
  baseCommit: string;
  createdAt: string;
  clean: boolean;
}

export interface JarvisTask {
  id: string;
  title: string;
  description?: string;
  type: 'code_read' | 'code_edit' | 'test_run' | 'security_audit' | 'cleanup_proposal' | 'deployment';
  status: TaskStatus;
  permissionLevel: PermissionLevel;
  scope: TaskScope;
  workerId?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  attempts: number;
  maxAttempts: number;
  logs: TaskLogEntry[];
  approvalRequest?: ApprovalRequest;
  workspace?: TaskWorkspaceInfo;
  result?: {
    success: boolean;
    summary: string;
    diff?: string;
    artifacts?: string[];
    changedFiles?: string[];
    testResults?: {
      command: string;
      exitCode: number;
      passed: boolean;
      output: string;
      durationMs: number;
    }[];
    error?: string;
  };
}

export interface PermissionCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
  level: PermissionLevel;
}
