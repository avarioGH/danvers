import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    system: 'Danvers Jarvis Control Core',
    version: '1.0.0-phase1',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform
  });
}
