import fs from 'fs';
import path from 'path';
import { RemoteWorker, WorkerCrypto, WorkerStatus, TaskLease, AuditEvent } from './worker-types';
import { TaskStore } from './task-store';
import { JarvisTask } from './types';
import { PermissionPolicyService } from './permission-policy';

export class WorkerRegistry {
  private static readonly DB_DIR = path.resolve(process.cwd(), 'data', 'jarvis');
  private static readonly WORKERS_FILE = path.join(WorkerRegistry.DB_DIR, 'workers.json');
  private static readonly AUDIT_FILE = path.join(WorkerRegistry.DB_DIR, 'audit_log.json');
  private static workers: Map<string, RemoteWorker> = new Map();
  private static activeLeases: Map<string, TaskLease> = new Map(); // taskId -> Lease
  private static lastAuditHash = '0000000000000000000000000000000000000000000000000000000000000000';
  private static initialized = false;

  private static ensureInitialized() {
    try {
      if (!fs.existsSync(this.DB_DIR)) {
        fs.mkdirSync(this.DB_DIR, { recursive: true });
      }
      if (fs.existsSync(this.WORKERS_FILE)) {
        const raw = fs.readFileSync(this.WORKERS_FILE, 'utf-8');
        const list: RemoteWorker[] = JSON.parse(raw);
        this.workers.clear();
        for (const w of list) {
          this.workers.set(w.id, w);
        }
      }
      // Read last line of audit file to obtain lastAuditHash
      if (fs.existsSync(this.AUDIT_FILE)) {
        const lines = fs.readFileSync(this.AUDIT_FILE, 'utf-8').trim().split('\n');
        if (lines.length > 0 && lines[lines.length - 1].length > 0) {
          try {
            const lastEntry: AuditEvent = JSON.parse(lines[lines.length - 1]);
            if (lastEntry.eventHash) {
              this.lastAuditHash = lastEntry.eventHash;
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('[WorkerRegistry] Init error:', err);
    }
    this.initialized = true;
  }

  private static persist() {
    try {
      this.ensureInitialized();
      const list = Array.from(this.workers.values());
      const tmp = `${this.WORKERS_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf-8');
      fs.renameSync(tmp, this.WORKERS_FILE);
    } catch (err) {
      console.error('[WorkerRegistry] Persist error:', err);
    }
  }

  public static logAudit(event: Omit<AuditEvent, 'id' | 'timestamp' | 'prevHash' | 'eventHash'>): AuditEvent {
    this.ensureInitialized();
    const timestamp = new Date().toISOString();
    const prevHash = this.lastAuditHash;
    const eventHash = WorkerCrypto.computeAuditHash(prevHash, event.eventType, event.actorId, timestamp, event.details);

    const entry: AuditEvent = {
      ...event,
      id: PermissionPolicyService.generateSecureId('audit'),
      timestamp,
      prevHash,
      eventHash
    };

    this.lastAuditHash = eventHash;
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.AUDIT_FILE, line, 'utf-8');
    return entry;
  }

  /**
   * Registers a new worker node and returns the raw secret token once.
   */
  public static async registerWorker(
    name: string,
    capabilities: import('./worker-types').WorkerCapability[],
    allowedProjects: string[]
  ): Promise<{ worker: RemoteWorker; rawToken: string }> {
    this.ensureInitialized();
    const id = PermissionPolicyService.generateSecureId('wkr');
    const rawToken = WorkerCrypto.generateSecureToken();
    const tokenHash = WorkerCrypto.hashToken(rawToken);
    const now = new Date().toISOString();

    const worker: RemoteWorker = {
      id,
      name,
      tokenHash,
      status: 'active',
      capabilities,
      allowedProjects,
      registeredAt: now,
      lastHeartbeat: now
    };

    // Save to in-memory map then persist directly
    this.workers.set(id, worker);
    const list = Array.from(this.workers.values());
    const tmp = `${this.WORKERS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf-8');
    fs.renameSync(tmp, this.WORKERS_FILE);

    this.logAudit({
      eventType: 'WORKER_REGISTERED',
      actorId: id,
      details: { name, capabilities, allowedProjects }
    });

    return { worker, rawToken };
  }

  /**
   * Authenticates an incoming worker request via bearer token using constant-time comparison.
   */
  public static async authenticateWorker(bearerToken: string): Promise<RemoteWorker | null> {
    if (!bearerToken || typeof bearerToken !== 'string') return null;
    this.ensureInitialized();
    const token = bearerToken.replace(/^Bearer\s+/i, '').trim();
    if (token.length < 32) return null;

    const incomingHash = WorkerCrypto.hashToken(token);

    for (const worker of this.workers.values()) {
      if (WorkerCrypto.constantTimeCompare(worker.tokenHash, incomingHash)) {
        if (worker.status !== 'active') {
          this.logAudit({
            eventType: 'SECURITY_VIOLATION',
            actorId: worker.id,
            details: { reason: `Worker status is '${worker.status}' (not active).` }
          });
          return null;
        }
        return worker;
      }
    }
    return null;
  }

  /**
   * Revokes a worker immediately.
   */
  public static async setWorkerStatus(workerId: string, status: WorkerStatus, actor = 'admin'): Promise<boolean> {
    this.ensureInitialized();
    const worker = this.workers.get(workerId);
    if (!worker) return false;

    worker.status = status;
    this.workers.set(workerId, worker);
    this.persist();

    this.logAudit({
      eventType: status === 'revoked' ? 'WORKER_REVOKED' : 'SECURITY_VIOLATION',
      actorId: actor,
      details: { workerId, newStatus: status }
    });

    return true;
  }

  /**
   * Records a heartbeat and extends active lease if the worker is executing a task.
   */
  public static async recordHeartbeat(workerId: string): Promise<{ success: boolean; leaseExtended?: boolean }> {
    this.ensureInitialized();
    const worker = this.workers.get(workerId);
    if (!worker || worker.status !== 'active') {
      return { success: false };
    }

    const now = new Date().toISOString();
    worker.lastHeartbeat = now;
    this.workers.set(workerId, worker);
    this.persist();

    // Check if worker has an active lease to extend
    let leaseExtended = false;
    if (worker.currentTaskId) {
      const lease = this.activeLeases.get(worker.currentTaskId);
      if (lease && lease.workerId === workerId) {
        const newExpires = new Date(Date.now() + 90000).toISOString(); // +90 seconds
        lease.expiresAt = newExpires;
        this.activeLeases.set(worker.currentTaskId, lease);
        leaseExtended = true;
      }
    }

    return { success: true, leaseExtended };
  }

  /**
   * Atomically acquires an exclusive execution lease on a queued task.
   */
  public static async claimTaskLease(worker: RemoteWorker, taskId: string): Promise<{ task: JarvisTask | null; error?: string }> {
    this.ensureInitialized();

    if (worker.status !== 'active') {
      return { task: null, error: `Worker '${worker.id}' is not active.` };
    }

    const task = await TaskStore.getTask(taskId);
    if (!task) {
      return { task: null, error: `Task '${taskId}' not found.` };
    }

    // 1. Task must be in 'queued' state
    if (task.status !== 'queued') {
      return { task: null, error: `Task is in state '${task.status}' and cannot be claimed.` };
    }

    // 2. Capability check: Worker must support task.type
    if (!worker.capabilities.includes(task.type as any)) {
      this.logAudit({
        eventType: 'SECURITY_VIOLATION',
        actorId: worker.id,
        details: { taskId, reason: `Worker lacks capability '${task.type}'` }
      });
      return { task: null, error: `Worker lacks capability for task type '${task.type}'.` };
    }

    // 3. Project scope check: Worker must be authorized for this workspace root
    const workspaceRoot = task.scope.workspaceRoot;
    const isAllowedProject = worker.allowedProjects.some(allowed => 
      allowed === '*' || workspaceRoot.includes(allowed) || path.resolve(workspaceRoot) === path.resolve(allowed)
    );

    if (!isAllowedProject) {
      this.logAudit({
        eventType: 'SECURITY_VIOLATION',
        actorId: worker.id,
        details: { taskId, workspaceRoot, reason: 'Worker unauthorized for project scope' }
      });
      return { task: null, error: `Worker is not authorized for workspace '${workspaceRoot}'.` };
    }

    // 4. Concurrency lock: Check if lease already exists
    const existingLease = this.activeLeases.get(taskId);
    if (existingLease && new Date(existingLease.expiresAt).getTime() > Date.now()) {
      return { task: null, error: `Task is already locked under an active lease by worker '${existingLease.workerId}'.` };
    }

    // 5. Grant Lease
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 90000).toISOString(); // 90 seconds
    const lease: TaskLease = {
      taskId,
      workerId: worker.id,
      acquiredAt: now,
      expiresAt,
      attemptNumber: task.attempts + 1
    };

    this.activeLeases.set(taskId, lease);
    worker.currentTaskId = taskId;
    this.workers.set(worker.id, worker);
    this.persist();

    // Transition task state to 'assigned'
    await TaskStore.updateTaskStatus(taskId, 'assigned', `Task claimed by remote worker '${worker.name}' (${worker.id}).`);

    this.logAudit({
      eventType: 'TASK_LEASE_ACQUIRED',
      actorId: worker.id,
      details: { taskId, leaseExpiresAt: expiresAt }
    });

    const updatedTask = await TaskStore.getTask(taskId);
    return { task: updatedTask };
  }

  /**
   * Releases lease when task finishes or fails.
   */
  public static releaseLease(taskId: string, workerId: string): void {
    const lease = this.activeLeases.get(taskId);
    if (lease && lease.workerId === workerId) {
      this.activeLeases.delete(taskId);
    }
    const worker = this.workers.get(workerId);
    if (worker && worker.currentTaskId === taskId) {
      delete worker.currentTaskId;
      this.workers.set(workerId, worker);
      this.persist();
    }
  }

  public static listWorkers(): RemoteWorker[] {
    this.ensureInitialized();
    return Array.from(this.workers.values());
  }

  public static getLease(taskId: string): TaskLease | null {
    return this.activeLeases.get(taskId) || null;
  }

  /**
   * Verifies the cryptographic integrity of the entire audit chain.
   */
  public static verifyAuditChain(): { valid: boolean; totalEntries: number; tamperedIndex?: number } {
    this.ensureInitialized();
    if (!fs.existsSync(this.AUDIT_FILE)) {
      return { valid: true, totalEntries: 0 };
    }

    const lines = fs.readFileSync(this.AUDIT_FILE, 'utf-8').trim().split('\n').filter(l => l.length > 0);
    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < lines.length; i++) {
      try {
        const entry: AuditEvent = JSON.parse(lines[i]);
        if (entry.prevHash !== expectedPrevHash) {
          return { valid: false, totalEntries: lines.length, tamperedIndex: i };
        }
        const recomputed = WorkerCrypto.computeAuditHash(entry.prevHash, entry.eventType, entry.actorId, entry.timestamp, entry.details);
        if (recomputed !== entry.eventHash) {
          return { valid: false, totalEntries: lines.length, tamperedIndex: i };
        }
        expectedPrevHash = entry.eventHash;
      } catch {
        return { valid: false, totalEntries: lines.length, tamperedIndex: i };
      }
    }

    return { valid: true, totalEntries: lines.length };
  }
}
