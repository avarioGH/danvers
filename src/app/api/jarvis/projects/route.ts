import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getAuthenticatedUser } from '@/lib/jarvis/auth-helper';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pre-registered safe workspaces
  const registeredRoots = [
    {
      id: 'jarvis-os-core',
      name: 'Danvers OS & Jarvis Core',
      rootPath: path.resolve(process.cwd()),
      description: 'Primary Jarvis OS application, control center and agent runtime'
    }
  ];

  const projects = registeredRoots.map(proj => {
    let gitInfo = { branch: 'unknown', clean: true, error: undefined as string | undefined };
    try {
      if (fs.existsSync(path.join(proj.rootPath, '.git'))) {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: proj.rootPath }).toString().trim();
        const status = execSync('git status --porcelain', { cwd: proj.rootPath }).toString().trim();
        gitInfo = { branch, clean: status.length === 0, error: undefined };
      }
    } catch (e: unknown) {
      gitInfo.error = (e as Error).message;
    }

    return {
      ...proj,
      git: gitInfo
    };
  });

  return NextResponse.json({ projects });
}
