import { NextRequest, NextResponse } from 'next/server';
import { TaskStore } from '@/lib/jarvis/task-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.action === 'resolve_approval') {
      const { approved, resolvedBy, reason } = body;
      if (typeof approved !== 'boolean' || !resolvedBy) {
        return NextResponse.json(
          { error: 'Fields approved (boolean) and resolvedBy (string) are required.' },
          { status: 400 }
        );
      }

      const updated = await TaskStore.resolveApproval(id, approved, resolvedBy, reason);
      return NextResponse.json({ task: updated });
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
