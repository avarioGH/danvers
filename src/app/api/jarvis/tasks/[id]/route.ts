import { NextRequest, NextResponse } from 'next/server';
import { TaskStore } from '@/lib/jarvis/task-store';
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
