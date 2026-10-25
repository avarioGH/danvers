import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TaskStore } from '@/lib/jarvis/task-store';
import { WorkerRegistry } from '@/lib/jarvis/worker-registry';
import { JarvisTask, TaskStatus } from '@/lib/jarvis/types';
import { getAuthenticatedUser } from '@/lib/jarvis/auth-helper';

function isRegisteredWorkspace(targetRoot: string): boolean {
  try {
    const defaultRoots = [
      'd:/danvers/workspaces/disposable-e2e-project',
      'd:\\danvers\\workspaces\\disposable-e2e-project',
      '/root/workspaces/disposable-e2e-project',
      path.resolve(process.cwd()).toLowerCase().replace(/\\/g, '/')
    ];

    const customStore = path.resolve(process.cwd(), 'data', 'jarvis', 'custom_workspaces.json');
    let customRoots: string[] = [];
    if (fs.existsSync(customStore)) {
      const list = JSON.parse(fs.readFileSync(customStore, 'utf-8'));
      customRoots = list.map((item: any) => (item.rootPath || '').toLowerCase().replace(/\\/g, '/'));
    }

    const normalizedTarget = targetRoot.trim().toLowerCase().replace(/\\/g, '/');
    return defaultRoots.some(r => r.replace(/\\/g, '/') === normalizedTarget) ||
      customRoots.some(r => r === normalizedTarget);
  } catch {
    return false;
  }
}

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

    const workspaceRoot = body.scope.workspaceRoot;
    const isWindowsPath = /^[a-zA-Z]:[/\\]/.test(workspaceRoot);
    const isLinuxPath = workspaceRoot.startsWith('/');
    const workerTarget = body.workerId || 'pc_worker_local';

    // 1. Verify workspace is recognized in trusted registry
    if (!isRegisteredWorkspace(workspaceRoot)) {
      return NextResponse.json(
        { error: `Unauthorized Workspace: Directory '${workspaceRoot}' is not registered in Jarvis projects.` },
        { status: 403 }
      );
    }

    // 2. Strict OS & Worker Architecture Enforcement
    if (isWindowsPath && workerTarget.includes('vps')) {
      return NextResponse.json(
        { error: `Routing Conflict: Windows path '${workspaceRoot}' cannot be assigned to Linux VPS worker '${workerTarget}'. Must use a Windows worker.` },
        { status: 400 }
      );
    }

    if (isLinuxPath && (workerTarget === 'pc_worker_local' || workerTarget.includes('windows'))) {
      return NextResponse.json(
        { error: `Routing Conflict: Linux path '${workspaceRoot}' cannot be processed by Windows local worker '${workerTarget}'. Must use an authorized Linux worker.` },
        { status: 400 }
      );
    }

    // 3. Worker Eligibility & Revocation Check if workerTarget matches a registered worker ID
    if (workerTarget.startsWith('wkr_')) {
      const registeredWorkers = WorkerRegistry.listWorkers();
      const targetWorker = registeredWorkers.find(w => w.id === workerTarget);
      if (!targetWorker) {
        return NextResponse.json(
          { error: `Invalid Worker: Worker ID '${workerTarget}' is not registered.` },
          { status: 400 }
        );
      }
      if (targetWorker.status === 'revoked') {
        return NextResponse.json(
          { error: `Security Violation: Worker '${targetWorker.name}' (${workerTarget}) is revoked and cannot accept tasks.` },
          { status: 403 }
        );
      }
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
      workerId: workerTarget,
      userId: user.id
    };

    const task = await TaskStore.createTask(newTask);

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
