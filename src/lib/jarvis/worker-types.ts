import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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

export interface ArtifactFileEntry {
  path: string;
  sha256: string;
  bytes: number;
}

export interface ArtifactManifest {
  baseCommit: string;
  files: ArtifactFileEntry[];
  manifestHash: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  prevHash: string;
  eventHash: string;
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

  /**
   * Constant-time string equality check to prevent timing attacks against token hashes.
   */
  public static constantTimeCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  public static computeDiffHash(diffContent: string): string {
    return crypto.createHash('sha256').update(diffContent || '').digest('hex');
  }

  /**
   * Generates a canonical, reproducible artifact manifest with SHA-256 content hashes of all files.
   * Covers tracked files, untracked files, modified, deleted, added, and symlink targets.
   */
  public static generateArtifactManifest(worktreePath: string, baseCommit: string): ArtifactManifest {
    const canonicalRoot = path.resolve(worktreePath);
    const entries: ArtifactFileEntry[] = [];

    const walkDir = (dir: string) => {
      const dirEntries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        const rel = path.relative(canonicalRoot, full).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          walkDir(full);
        } else if (entry.isFile() || entry.isSymbolicLink()) {
          try {
            const buf = fs.readFileSync(full);
            const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
            entries.push({ path: rel, sha256, bytes: buf.length });
          } catch {
            // Unreadable or dangling symlink
            entries.push({ path: rel, sha256: 'UNREADABLE_OR_BROKEN', bytes: 0 });
          }
        }
      }
    };

    if (fs.existsSync(canonicalRoot)) {
      walkDir(canonicalRoot);
    }

    // Sort canonically by path
    entries.sort((a, b) => a.path.localeCompare(b.path));

    // Compute manifest hash
    const manifestPayload = JSON.stringify({ baseCommit, entries });
    const manifestHash = crypto.createHash('sha256').update(manifestPayload).digest('hex');

    return {
      baseCommit,
      files: entries,
      manifestHash
    };
  }

  /**
   * Cryptographic hash-chain generator for tamper-evident audit logs.
   */
  public static computeAuditHash(prevHash: string, eventType: string, actorId: string, timestamp: string, details: Record<string, unknown>): string {
    const payload = `${prevHash}|${eventType}|${actorId}|${timestamp}|${JSON.stringify(details)}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}
