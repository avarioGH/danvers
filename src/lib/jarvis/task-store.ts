import type { JarvisTask, TaskStatus, TaskLogEntry, ApprovalRequest } from './types';
import { TaskStateMachine } from './state-machine';

export class TaskStore {
  // In-memory durable store with support for persistence hook
  private static tasks: Map<string, JarvisTask> = new Map();

  public static async createTask(task: Omit<JarvisTask, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'attempts' | 'logs'>): Promise<JarvisTask> {
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
          message: `Task created and entered 'queued' state.`
        }
      ]
    };

    this.tasks.set(id, newTask);
    return newTask;
  }

  public static async getTask(id: string): Promise<JarvisTask | null> {
    return this.tasks.get(id) || null;
  }

  public static async listTasks(filter?: { status?: TaskStatus; limit?: number }): Promise<JarvisTask[]> {
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
        message: logMessage
      });
    }

    this.tasks.set(id, task);
    return task;
  }

  public static async attachApprovalRequest(id: string, approval: Omit<ApprovalRequest, 'id' | 'requestedAt' | 'status'>): Promise<JarvisTask> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id '${id}' not found.`);
    }

    TaskStateMachine.validateTransition(task.status, 'awaiting_approval');
    const now = new Date().toISOString();

    const approvalRequest: ApprovalRequest = {
      ...approval,
      id: `appr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'pending',
      requestedAt: now
    };

    task.status = 'awaiting_approval';
    task.approvalRequest = approvalRequest;
    task.updatedAt = now;
    task.logs.push({
      timestamp: now,
      level: 'warn',
      message: `Task halted. Requires approval for action: '${approval.action}' on '${approval.target}'.`
    });

    this.tasks.set(id, task);
    return task;
  }

  public static async resolveApproval(taskId: string, approved: boolean, resolvedBy: string, reason?: string): Promise<JarvisTask> {
    const task = this.tasks.get(taskId);
    if (!task || !task.approvalRequest) {
      throw new Error(`Task or approval request not found for id '${taskId}'.`);
    }

    const now = new Date().toISOString();
    task.approvalRequest.status = approved ? 'approved' : 'rejected';
    task.approvalRequest.resolvedAt = now;
    task.approvalRequest.resolvedBy = resolvedBy;
    if (reason) task.approvalRequest.rejectionReason = reason;

    if (approved) {
      TaskStateMachine.validateTransition(task.status, 'running');
      task.status = 'running';
      task.logs.push({
        timestamp: now,
        level: 'info',
        message: `Approval granted by ${resolvedBy}. Resuming task execution.`
      });
    } else {
      TaskStateMachine.validateTransition(task.status, 'cancelled');
      task.status = 'cancelled';
      task.logs.push({
        timestamp: now,
        level: 'warn',
        message: `Approval rejected by ${resolvedBy}: ${reason || 'No reason provided'}. Task cancelled.`
      });
    }

    task.updatedAt = now;
    this.tasks.set(taskId, task);
    return task;
  }

  public static async appendLog(taskId: string, log: TaskLogEntry): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      task.logs.push(log);
      task.updatedAt = new Date().toISOString();
    }
  }
}
