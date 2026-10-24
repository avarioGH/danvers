import { NextRequest, NextResponse } from 'next/server';
import { WindowsWorkerDaemon } from '@/lib/jarvis/windows-worker-daemon';
import { WorkerRegistry } from '@/lib/jarvis/worker-registry';
import { getAuthenticatedUser } from '@/lib/jarvis/auth-helper';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isRunning = WindowsWorkerDaemon.isRunning();
  const config = WindowsWorkerDaemon.loadConfig();

  return NextResponse.json({
    running: isRunning,
    workerId: config?.workerId || null,
    controlUrl: config?.controlUrl || null
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'start') {
      let cfg = WindowsWorkerDaemon.loadConfig();
      // If no config exists, register a local worker dynamically
      if (!cfg || !cfg.workerId || !cfg.workerToken) {
        const reg = await WorkerRegistry.registerWorker(
          'windows-pc-local-worker',
          ['code_read', 'code_edit', 'test_run', 'security_audit'],
          ['*']
        );
        cfg = {
          controlUrl: process.env.JARVIS_CONTROL_URL || 'https://avariodanvers.my.id',
          workerId: reg.worker.id,
          workerToken: reg.rawToken,
          heartbeatIntervalMs: 20000
        };
        WindowsWorkerDaemon.saveConfig(cfg);
      }

      const res = await WindowsWorkerDaemon.start();
      return NextResponse.json(res);
    }

    if (action === 'stop') {
      WindowsWorkerDaemon.stop();
      return NextResponse.json({ success: true, message: 'Windows Worker Daemon stopped.' });
    }

    return NextResponse.json({ error: 'Unknown action. Valid actions: start, stop.' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
