import { NextRequest, NextResponse } from 'next/server';
import { WorkerRegistry } from '@/lib/jarvis/worker-registry';
import { getAuthenticatedUser } from '@/lib/jarvis/auth-helper';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Operator session required.' }, { status: 401 });
  }

  const workers = WorkerRegistry.listWorkers().map(w => ({
    id: w.id,
    name: w.name,
    status: w.status,
    capabilities: w.capabilities,
    allowedProjects: w.allowedProjects,
    registeredAt: w.registeredAt,
    lastHeartbeat: w.lastHeartbeat,
    currentTaskId: w.currentTaskId
  }));

  return NextResponse.json({ workers });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Operator session required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.name || !body.capabilities || !Array.isArray(body.capabilities)) {
      return NextResponse.json({ error: 'Missing name or capabilities array.' }, { status: 400 });
    }

    const { worker, rawToken } = await WorkerRegistry.registerWorker(
      body.name,
      body.capabilities,
      body.allowedProjects || ['*']
    );

    return NextResponse.json({
      worker: {
        id: worker.id,
        name: worker.name,
        status: worker.status,
        capabilities: worker.capabilities,
        allowedProjects: worker.allowedProjects
      },
      token: rawToken // Returned strictly once upon creation
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
