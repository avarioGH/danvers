import { NextRequest, NextResponse } from 'next/server';
import { WorkerRegistry } from '@/lib/jarvis/worker-registry';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Admin endpoint to sync/replace workers from a remote push.
 * Authenticated with a deploy secret rather than user session.
 *
 * POST /api/jarvis/admin/sync-workers
 * Headers: X-Deploy-Secret: <secret>
 * Body: { workers: RemoteWorker[] }
 */

const DEPLOY_SECRET = process.env.JARVIS_DEPLOY_SECRET || 'danvers_deploy_2026_secure';

function verifyDeploySecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-deploy-secret') || '';
  if (!secret || !DEPLOY_SECRET) return false;
  return crypto.timingSafeEqual(
    Buffer.from(secret, 'utf-8'),
    Buffer.from(DEPLOY_SECRET, 'utf-8')
  );
}

export async function POST(req: NextRequest) {
  if (!verifyDeploySecret(req)) {
    return NextResponse.json({ error: 'Forbidden: Invalid deploy secret.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    if (!body.workers || !Array.isArray(body.workers)) {
      return NextResponse.json({ error: 'Body must contain a "workers" array.' }, { status: 400 });
    }

    // Write workers directly to the data file
    const DB_DIR = path.resolve(process.cwd(), 'data', 'jarvis');
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    
    const workersPath = path.join(DB_DIR, 'workers.json');
    fs.writeFileSync(workersPath, JSON.stringify(body.workers, null, 2), 'utf-8');

    // Force WorkerRegistry to reload
    const reloaded = WorkerRegistry.listWorkers();

    WorkerRegistry.logAudit({
      eventType: 'WORKER_REGISTERED',
      actorId: 'admin-deploy',
      details: { 
        action: 'sync-workers',
        workerCount: body.workers.length,
        workerIds: body.workers.map((w: { id: string }) => w.id)
      }
    });

    return NextResponse.json({
      success: true,
      message: `Synced ${body.workers.length} workers successfully.`,
      workers: reloaded.map(w => ({
        id: w.id,
        name: w.name,
        status: w.status,
        lastHeartbeat: w.lastHeartbeat
      }))
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!verifyDeploySecret(req)) {
    return NextResponse.json({ error: 'Forbidden: Invalid deploy secret.' }, { status: 403 });
  }

  const workers = WorkerRegistry.listWorkers();
  return NextResponse.json({
    count: workers.length,
    workers: workers.map(w => ({
      id: w.id,
      name: w.name,
      status: w.status,
      capabilities: w.capabilities,
      lastHeartbeat: w.lastHeartbeat
    }))
  });
}
