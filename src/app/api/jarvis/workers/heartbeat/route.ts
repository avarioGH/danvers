import { NextRequest, NextResponse } from 'next/server';
import { WorkerRegistry } from '@/lib/jarvis/worker-registry';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const worker = await WorkerRegistry.authenticateWorker(authHeader);

  if (!worker) {
    return NextResponse.json({ error: 'Unauthorized: Invalid or revoked worker credentials.' }, { status: 401 });
  }

  const result = await WorkerRegistry.recordHeartbeat(worker.id);
  return NextResponse.json({
    status: 'ok',
    workerId: worker.id,
    timestamp: new Date().toISOString(),
    leaseExtended: result.leaseExtended
  });
}
