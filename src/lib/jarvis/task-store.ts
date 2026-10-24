import fs from 'fs';
import path from 'path';
import { JarvisTask, TaskStatus, TaskLogEntry, ApprovalRequest } from './types';
import { TaskStateMachine } from './state-machine';
import { PermissionPolicyService } from './permission-policy';

export class TaskStore {
  private static readonly DB_DIR = path.resolve(process.cwd(), 'data', 'jarvis');
  private static readonly DB_FILE = path.join(TaskStore.DB_DIR, 'tasks.json');
  private static tasks: Map<string, JarvisTask> = new Map();
  private static initialized = false;

  private static ensureInitialized() {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(this.DB_DIR)) {
        fs.mkdirSync(this.DB_DIR, { recursive: true });
      }
      if (fs.existsSync(this.DB_FILE)) {
        const raw = fs.readFileSync(this.DB_FILE, 'utf-8');
        const list: JarvisTask[] = JSON.parse(raw);
        this.tasks.clear();
        for (const t of list) {
          this.tasks.set(t.id, t);
        }
      }
    } catch (err) {
      console.error('[TaskStore] Error loading durable store:', err);
    }
    this.initialized = true;
  }

  private static persist() {
    try {
      this.ensureInitialized();
      const list = Array.from(this.tasks.values());
      const tempPath = `${this.DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.DB_FILE);
    } catch (err) {
      console.error('[TaskStore] Persistence error:', err);
    }
  }

  public static async createTask(task: Omit<JarvisTask, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'attempts' | 'logs'> & { userId?: string }): Promise<JarvisTask> {
    this.ensureInitialized();
    const id = PermissionPolicyService.generateSecureId('task');
    const now = new Date().toISOString();
    
    const newTask: JarvisTask = {
      ...task,
      id,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      logs: [
        {
          timestamp: now,
          level: 'info',
          message: PermissionPolicyService.redactSecrets(`Task created and entered 'queued' state for project '${task.scope.workspaceRoot}'.`)
        }
      ]
    };

    this.tasks.set(id, newTask);
    this.persist();
    return newTask;
  }

  public static async getTask(id: string): Promise<JarvisTask | null> {
    this.ensureInitialized();
    return this.tasks.get(id) || null;
  }

  public static async listTasks(filter?: { status?: TaskStatus; limit?: number; userId?: string }): Promise<JarvisTask[]> {
    this.ensureInitialized();
    let result = Array.from(this.tasks.values());
    if (filter?.status) {
      result = result.filter(t => t.status === filter.status);
    }
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }
    return result;
  }

  public static async updateTaskStatus(id: string, newStatus: TaskStatus, logMessage?: string): Promise<JarvisTask> {
    this.ensureInitialized();
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id '${id}' not found.`);
    }

    TaskStateMachine.validateTransition(task.status, newStatus);
    const now = new Date().toISOString();

    task.status = newStatus;
    task.updatedAt = now;

    if (newStatus === 'running' && !task.startedAt) {
      task.startedAt = now;
      task.attempts += 1;
    }

    if (newStatus === 'succeeded' || newStatus === 'failed' || newStatus === 'cancelled') {
      task.completedAt = now;
    }

    if (logMessage) {
      task.logs.push({
        timestamp: now,
        level: newStatus === 'failed' ? 'error' : 'info',
        message: PermissionPolicyService.redactSecrets(logMessage)
      });
    }

    this.tasks.set(id, task);
    this.persist();
    return task;
  }

  public static async attachWorkspaceInfo(id: string, workspace: import('./types').TaskWorkspaceInfo): Promise<JarvisTask> {
    this.ensureInitialized();
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id '${id}' not found.`);
    }
    task.workspace = workspace;
    task.updatedAt = new Date().toISOString();
    this.tasks.set(id, task);
    this.persist();
    return task;
  }

  public static async attachApprovalRequest(id: string, approval: Omit<ApprovalRequest, 'id' | 'requestedAt' | 'status'>): Promise<JarvisTask> {
    this.ensureInitialized();
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id '${id}' not found.`);
    }

    TaskStateMachine.validateTransition(task.status, 'awaiting_approval');
    const now = new Date().toISOString();

    const approvalRequest: ApprovalRequest = {
      ...approval,
      id: PermissionPolicyService.generateSecureId('appr'),
      status: 'pending',
      requestedAt: now
    };

    task.status = 'awaiting_approval';
    task.approvalRequest = approvalRequest;
    task.updatedAt = now;
    task.logs.push({
      timestamp: now,
      level: 'warn',
      message: PermissionPolicyService.redactSecrets(`Action requires authorization: '${approval.action}' on '${approval.target}'.`)
    });

    this.tasks.set(id, task);
    this.persist();
    return task;
  }

  public static async resolveApproval(
    taskId: string,
    approved: boolean,
    resolvedBy: string,
    reason?: string
  ): Promise<JarvisTask> {
    this.ensureInitialized();
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task '${taskId}' not found.`);
    }

    if (!task.approvalRequest) {
      throw new Error(`No approval request attached to task '${taskId}'.`);
    }

    if (task.approvalRequest.status !== 'pending') {
      throw new Error(`Approval request '${task.approvalRequest.id}' is already resolved with status '${task.approvalRequest.status}'.`);
    }

    if (task.status !== 'awaiting_approval') {
      throw new Error(`Cannot resolve approval for task in '${task.status}' state.`);
    }

    const now = new Date().toISOString();
    task.approvalRequest.status = approved ? 'approved' : 'rejected';
    task.approvalRequest.resolvedAt = now;
    task.approvalRequest.resolvedBy = resolvedBy;
    if (reason) task.approvalRequest.rejectionReason = PermissionPolicyService.redactSecrets(reason);

    if (approved) {
      TaskStateMachine.validateTransition(task.status, 'running');
      task.status = 'running';
      task.logs.push({
        timestamp: now,
        level: 'info',
        message: `Approval GRANTED by ${resolvedBy}. Resuming task execution.`
      });
    } else {
      TaskStateMachine.validateTransition(task.status, 'cancelled');
      task.status = 'cancelled';
      task.logs.push({
        timestamp: now,
        level: 'warn',
        message: `Approval REJECTED by ${resolvedBy}: ${reason || 'No justification provided'}. Task cancelled.`
      });
    }

    task.updatedAt = now;
    this.tasks.set(taskId, task);
    this.persist();
    return task;
  }

  public static async appendLog(taskId: string, log: TaskLogEntry): Promise<void> {
    this.ensureInitialized();
    const task = this.tasks.get(taskId);
    if (task) {
      task.logs.push({
        ...log,
        message: PermissionPolicyService.redactSecrets(log.message)
      });
      task.updatedAt = new Date().toISOString();
      this.persist();
    }
  }

  public static async listApprovals(): Promise<ApprovalRequest[]> {
    this.ensureInitialized();
    const list: ApprovalRequest[] = [];
    for (const task of this.tasks.values()) {
      if (task.approvalRequest) {
        list.push(task.approvalRequest);
      }
    }
    return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }
}
