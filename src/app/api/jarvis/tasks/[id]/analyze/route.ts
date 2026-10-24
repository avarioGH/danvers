import { NextRequest, NextResponse } from 'next/server';
import { TaskStore } from '@/lib/jarvis/task-store';
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
    return NextResponse.json({ error: `Cannot run analysis on task in '${task.status}' state.` }, { status: 400 });
  }

  try {
    await TaskStore.updateTaskStatus(task.id, 'assigned');
    await TaskStore.updateTaskStatus(task.id, 'running');

    const report = await ReadOnlyCodingAgent.analyze(task, 'qwen2.5-coder:3b');

    await TaskStore.updateTaskStatus(task.id, 'succeeded', 'Analysis plan generated successfully.');

    return NextResponse.json({ success: true, report });
  } catch (err: unknown) {
    const error = err as Error;
    await TaskStore.updateTaskStatus(task.id, 'failed', `Analysis error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
