import type { TaskStatus } from './types';

export class InvalidStateTransitionError extends Error {
  public from: TaskStatus;
  public to: TaskStatus;

  constructor(from: TaskStatus, to: TaskStatus) {
    super(`Illegal state transition from '${from}' to '${to}'.`);
    this.name = 'InvalidStateTransitionError';
    this.from = from;
    this.to = to;
  }
}

export class TaskStateMachine {
  private static readonly VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    queued: ['assigned', 'cancelled'],
    assigned: ['running', 'cancelled', 'failed'],
    running: ['awaiting_approval', 'succeeded', 'failed', 'cancelled'],
    awaiting_approval: ['running', 'cancelled', 'failed'],
    succeeded: [], // terminal
    failed: ['queued'], // can retry if maxAttempts not exceeded
    cancelled: [] // terminal
  };

  public static canTransition(from: TaskStatus, to: TaskStatus): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  public static validateTransition(from: TaskStatus, to: TaskStatus): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidStateTransitionError(from, to);
    }
  }
}
