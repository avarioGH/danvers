import { NextRequest, NextResponse } from 'next/server';
import { TaskStore } from '@/lib/jarvis/task-store';
import { CodingWorkerEngine } from '@/lib/jarvis/coding-worker-engine';
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

  try {
    const body = await req.json();
    const edits = body.edits || [];
    const testVerification = body.testVerification;

    const result = await CodingWorkerEngine.executeTask(task, edits, testVerification);
    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
