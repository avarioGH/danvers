import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { TaskWorkspaceInfo } from './types';
import { PermissionPolicyService } from './permission-policy';

export class WorkspaceManager {
  private static readonly WORKSPACE_ROOT = path.resolve(process.cwd(), '..', 'workspaces');

  public static getWorkspacesRoot(): string {
    if (!fs.existsSync(this.WORKSPACE_ROOT)) {
      fs.mkdirSync(this.WORKSPACE_ROOT, { recursive: true });
    }
    return this.WORKSPACE_ROOT;
  }

  /**
   * Validates repository and creates an isolated Git worktree on a unique branch.
   */
  public static createWorktree(repoPath: string, taskId: string): TaskWorkspaceInfo {
    const canonicalRepo = path.resolve(repoPath);
    if (!fs.existsSync(canonicalRepo) || !fs.existsSync(path.join(canonicalRepo, '.git'))) {
      throw new Error(`Invalid repository path: '${repoPath}' is not a valid Git repository.`);
    }

    // Inspect repository Git state and get current HEAD commit
    const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: canonicalRepo })
      .toString()
      .trim();

    // Check if source repo has uncommitted changes - we warn but worktree isolates safely from baseCommit
    const worktreeDir = path.join(this.getWorkspacesRoot(), `task-${taskId}`);
    const branchName = `jarvis/task-${taskId}`;

    if (fs.existsSync(worktreeDir)) {
      throw new Error(`Workspace collision: Workspace path '${worktreeDir}' already exists.`);
    }

    // Create Git worktree detached or on a new task branch from baseCommit
    try {
      execFileSync('git', ['worktree', 'add', '-b', branchName, worktreeDir, baseCommit], {
        cwd: canonicalRepo,
        stdio: 'pipe'
      });
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(`Failed to create Git worktree: ${error.message}`);
    }

    const now = new Date().toISOString();
    return {
      worktreePath: worktreeDir,
      branchName,
      baseCommit,
      createdAt: now,
      clean: true
    };
  }

  /**
   * Removes disposable task worktree and cleans up the task branch safely.
   */
  public static removeWorktree(repoPath: string, workspace: TaskWorkspaceInfo): void {
    const canonicalRepo = path.resolve(repoPath);
    if (!fs.existsSync(workspace.worktreePath)) return;

    try {
      // Unlock and prune
      execFileSync('git', ['worktree', 'remove', '--force', workspace.worktreePath], {
        cwd: canonicalRepo,
        stdio: 'pipe'
      });
      execFileSync('git', ['branch', '-D', workspace.branchName], {
        cwd: canonicalRepo,
        stdio: 'pipe'
      });
    } catch (err) {
      console.warn(`[WorkspaceManager] Worktree cleanup warning: ${(err as Error).message}`);
    }
  }

  /**
   * Inspects current diff of the worktree against base commit.
   */
  public static getWorktreeDiff(worktreePath: string, baseCommit: string): string {
    const canonicalWorktree = path.resolve(worktreePath);
    if (!fs.existsSync(canonicalWorktree)) {
      return '';
    }

    try {
      const diff = execFileSync('git', ['diff', baseCommit], { cwd: canonicalWorktree }).toString();
      return PermissionPolicyService.redactSecrets(diff);
    } catch {
      return '';
    }
  }

  /**
   * Retrieves list of changed/added/deleted files in the worktree.
   */
  public static getChangedFiles(worktreePath: string, baseCommit: string): string[] {
    const canonicalWorktree = path.resolve(worktreePath);
    if (!fs.existsSync(canonicalWorktree)) return [];

    try {
      const output = execFileSync('git', ['diff', '--name-only', baseCommit], { cwd: canonicalWorktree }).toString();
      return output
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);
    } catch {
      return [];
    }
  }
}
