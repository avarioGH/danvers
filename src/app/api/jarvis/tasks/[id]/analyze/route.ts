import { NextRequest, NextResponse } from 'next/server';
import { TaskStore } from '@/lib/jarvis/task-store';
import { CodingWorkerEngine } from '@/lib/jarvis/coding-worker-engine';
import { ReadOnlyCodingAgent } from '@/lib/jarvis/read-only-agent';
import { getAuthenticatedUser } from '@/lib/jarvis/auth-helper';

export async function POST(
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

  if (task.status !== 'queued' && task.status !== 'assigned') {
    return NextResponse.json({ error: `Cannot execute task in '${task.status}' state.` }, { status: 400 });
  }

  try {
    // Branch on task type
    if (task.type === 'code_read' || task.type === 'security_audit') {
      await TaskStore.updateTaskStatus(task.id, 'assigned');
      await TaskStore.updateTaskStatus(task.id, 'running');
      const report = await ReadOnlyCodingAgent.analyze(task, 'qwen2.5-coder:3b');
      await TaskStore.updateTaskStatus(task.id, 'succeeded', 'Analysis plan generated successfully.');
      return NextResponse.json({ success: true, report });
    }

    // Code edit / Full coding workflow
    const edits = [
      {
        relativePath: 'validator.js',
        action: 'modify' as const,
        content: `/**
 * Validates that a value is a strictly positive integer.
 */
export function validatePositiveInt(val) {
  return typeof val === 'number' && Number.isInteger(val) && val > 0;
}
`
      }
    ];

    const testVerification = {
      executable: 'node',
      args: ['--test']
    };

    const result = await CodingWorkerEngine.executeTask(task, edits, testVerification);

    // Persist result onto task
    const current = await TaskStore.getTask(task.id);
    if (current) {
      current.result = {
        success: result.success,
        summary: result.success
          ? `Verification passed (${result.testResults.length} test run(s)). Diff generated on branch '${result.branchName}'.`
          : `Verification failed (${result.error || 'Test failure'}).`,
        diff: result.diff,
        changedFiles: result.changedFiles,
        testResults: result.testResults.map(tr => ({
          command: tr.command,
          exitCode: tr.exitCode,
          passed: tr.passed,
          output: tr.output,
          durationMs: tr.durationMs
        })),
        error: result.error
      };
      await TaskStore.appendLog(task.id, {
        timestamp: new Date().toISOString(),
        level: result.success ? 'info' : 'error',
        message: `Task execution finished. Status: ${current.status}. Approval required: ${result.approvalRequired}`
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const error = err as Error;
    await TaskStore.updateTaskStatus(task.id, 'failed', `Execution error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
