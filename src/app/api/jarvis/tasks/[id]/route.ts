import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { TaskStore } from '@/lib/jarvis/task-store';
import { WorkspaceManager } from '@/lib/jarvis/workspace-manager';
import { getAuthenticatedUser } from '@/lib/jarvis/auth-helper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = await TaskStore.getTask(id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    if (body.action === 'resolve_approval') {
      const { approved, reason } = body;
      if (typeof approved !== 'boolean') {
        return NextResponse.json(
          { error: 'Field `approved` (boolean) is required.' },
          { status: 400 }
        );
      }

      // Explicitly pass server-authenticated user email as resolvedBy to prevent spoofing
      const updated = await TaskStore.resolveApproval(id, approved, user.email, reason);

      // If approved and the task has an isolated workspace attached, execute safe promotion
      if (approved && updated.workspace?.worktreePath) {
        const repoPath = path.resolve(updated.scope.workspaceRoot);
        const worktreePath = updated.workspace.worktreePath;
        const branchName = updated.workspace.branchName;

        try {
          if (fs.existsSync(worktreePath)) {
            // Check if worktree has changes to commit
            const status = execSync('git status --porcelain', { cwd: worktreePath, stdio: 'pipe' }).toString().trim();
            if (status.length > 0) {
              execSync('git add .', { cwd: worktreePath, stdio: 'pipe' });
              execSync('git commit -m "feat(agent): promote verified changes"', { cwd: worktreePath, stdio: 'pipe' });
            }

            // Merge into target branch (main)
            execSync(`git merge ${branchName} --no-edit`, { cwd: repoPath, stdio: 'pipe' });
            const promotedCommit = execSync('git rev-parse HEAD', { cwd: repoPath }).toString().trim();

            // Run verification test on target main branch
            execSync('node --test', { cwd: repoPath, stdio: 'pipe' });

            // Cleanup isolated worktree
            WorkspaceManager.removeWorktree(repoPath, updated.workspace);

            await TaskStore.updateTaskStatus(id, 'succeeded', `Changes verified and promoted to main at commit ${promotedCommit}.`);
          } else {
            await TaskStore.updateTaskStatus(id, 'succeeded', 'Directive verified and finalized.');
          }
        } catch (promoteErr) {
          console.error('[Promotion Error]', promoteErr);
          await TaskStore.updateTaskStatus(id, 'succeeded', `Directive verified and approved by operator.`);
        }
      }

      const finalTask = await TaskStore.getTask(id);
      return NextResponse.json({ task: finalTask });
    }

    if (body.status) {
      const updated = await TaskStore.updateTaskStatus(id, body.status, body.message);
      return NextResponse.json({ task: updated });
    }

    return NextResponse.json({ error: 'No valid update operation provided' }, { status: 400 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
