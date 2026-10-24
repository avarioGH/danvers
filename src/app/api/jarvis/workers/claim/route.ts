import { NextRequest, NextResponse } from 'next/server';
import { WorkerRegistry } from '@/lib/jarvis/worker-registry';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const worker = await WorkerRegistry.authenticateWorker(authHeader);

  if (!worker) {
    return NextResponse.json({ error: 'Unauthorized: Invalid or revoked worker credentials.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const taskId = body.taskId;
    if (!taskId) {
      return NextResponse.json({ error: 'Field taskId is required.' }, { status: 400 });
    }

    const claimRes = await WorkerRegistry.claimTaskLease(worker, taskId);
    if (!claimRes.task) {
      return NextResponse.json({ error: claimRes.error || 'Failed to claim task lease' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      task: claimRes.task
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
