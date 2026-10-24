import { NextRequest, NextResponse } from 'next/server';
import { TaskStore } from '@/lib/jarvis/task-store';
import { JarvisTask, TaskStatus } from '@/lib/jarvis/types';
import { getAuthenticatedUser } from '@/lib/jarvis/auth-helper';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as TaskStatus | null;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

  const tasks = await TaskStore.listTasks({
    status: status || undefined,
    limit,
    userId: user.id
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.title || !body.type || !body.scope?.workspaceRoot) {
      return NextResponse.json(
        { error: 'Missing required fields: title, type, scope.workspaceRoot' },
        { status: 400 }
      );
    }

    const newTask: Omit<JarvisTask, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'attempts' | 'logs'> & { userId?: string } = {
      title: body.title,
      description: body.description || '',
      type: body.type,
      permissionLevel: body.permissionLevel || 1,
      scope: {
        workspaceRoot: body.scope.workspaceRoot,
        allowedPaths: body.scope.allowedPaths || [],
        readOnly: body.scope.readOnly ?? false
      },
      maxAttempts: body.maxAttempts || 3,
      workerId: body.workerId || 'pc_worker_local',
      userId: user.id
    };

    const task = await TaskStore.createTask(newTask);

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
