import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getAuthenticatedUser } from '@/lib/jarvis/auth-helper';

interface RegisteredWorkspace {
  id: string;
  name: string;
  rootPath: string;
  description?: string;
  custom?: boolean;
}

const WORKSPACES_STORE = path.resolve(process.cwd(), 'data', 'jarvis', 'custom_workspaces.json');

function loadCustomWorkspaces(): RegisteredWorkspace[] {
  try {
    if (fs.existsSync(WORKSPACES_STORE)) {
      return JSON.parse(fs.readFileSync(WORKSPACES_STORE, 'utf-8'));
    }
  } catch (err) {
    console.error('[ProjectsAPI] Error reading custom workspaces:', err);
  }
  return [];
}

function saveCustomWorkspaces(list: RegisteredWorkspace[]) {
  try {
    const dir = path.dirname(WORKSPACES_STORE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WORKSPACES_STORE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ProjectsAPI] Error saving custom workspaces:', err);
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Built-in base workspaces
  const isWindows = process.platform === 'win32';
  const defaultDisposablePath = isWindows
    ? path.resolve('D:/Danvers/workspaces/disposable-e2e-project')
    : path.resolve('/root/workspaces/disposable-e2e-project');

  const defaultRoots: RegisteredWorkspace[] = [
    {
      id: 'disposable-e2e-project',
      name: 'Disposable E2E Test Project',
      rootPath: defaultDisposablePath,
      description: 'Isolated test sandbox for automated agent coding and verification'
    },
    {
      id: 'jarvis-os-core',
      name: 'Danvers OS & Jarvis Core',
      rootPath: path.resolve(process.cwd()),
      description: 'Primary Jarvis OS application, control center and agent runtime'
    }
  ];

  const customRoots = loadCustomWorkspaces();
  const allRoots = [...defaultRoots, ...customRoots.filter(c => !defaultRoots.some(d => d.rootPath.toLowerCase() === c.rootPath.toLowerCase()))];

  const projects = allRoots.map(proj => {
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

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, rootPath, description } = body;

    if (!name || !rootPath) {
      return NextResponse.json({ error: 'Fields `name` and `rootPath` are required.' }, { status: 400 });
    }

    const canonicalPath = path.resolve(rootPath);
    if (!fs.existsSync(canonicalPath) || !fs.statSync(canonicalPath).isDirectory()) {
      return NextResponse.json({ error: `Path does not exist or is not a directory: ${rootPath}` }, { status: 400 });
    }

    const custom = loadCustomWorkspaces();
    const id = `ws_${Date.now()}`;
    const newWorkspace: RegisteredWorkspace = {
      id,
      name: name.trim(),
      rootPath: canonicalPath,
      description: description?.trim() || 'Custom registered project workspace',
      custom: true
    };

    custom.push(newWorkspace);
    saveCustomWorkspaces(custom);

    return NextResponse.json({ success: true, workspace: newWorkspace }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Query parameter `id` is required.' }, { status: 400 });
    }

    let custom = loadCustomWorkspaces();
    custom = custom.filter(c => c.id !== id);
    saveCustomWorkspaces(custom);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
