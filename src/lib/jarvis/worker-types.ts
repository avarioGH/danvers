import crypto from 'crypto';

export type WorkerStatus = 'active' | 'suspended' | 'revoked';

export type WorkerCapability =
  | 'code_read'
  | 'code_edit'
  | 'test_run'
  | 'security_audit'
  | 'cleanup_proposal';

export interface RemoteWorker {
  id: string;
  name: string;
  tokenHash: string; // SHA-256 of auth token
  status: WorkerStatus;
  capabilities: WorkerCapability[];
  allowedProjects: string[]; // project IDs or root prefixes
  registeredAt: string;
  lastHeartbeat: string;
  currentTaskId?: string;
  ipAddress?: string;
}

export interface TaskLease {
  taskId: string;
  workerId: string;
  acquiredAt: string;
  expiresAt: string;
  attemptNumber: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: 
    | 'WORKER_REGISTERED'
    | 'WORKER_REVOKED'
    | 'WORKER_HEARTBEAT'
    | 'TASK_LEASE_ACQUIRED'
    | 'TASK_LEASE_RENEWED'
    | 'TASK_LEASE_EXPIRED'
    | 'APPROVAL_REQUESTED'
    | 'APPROVAL_RESOLVED'
    | 'SECURITY_VIOLATION';
  actorId: string; // workerId or user email
  details: Record<string, unknown>;
}

export class WorkerCrypto {
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  public static generateSecureToken(prefix = 'jwt_wkr'): string {
    return `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
  }

  public static computeDiffHash(diffContent: string): string {
    return crypto.createHash('sha256').update(diffContent || '').digest('hex');
  }
}
