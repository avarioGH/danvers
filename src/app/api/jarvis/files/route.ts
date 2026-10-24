import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthenticatedUser } from '@/lib/jarvis/auth-helper';
import { PermissionPolicyService } from '@/lib/jarvis/permission-policy';

export interface FileTreeItem {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  sizeBytes?: number;
  modifiedAt?: string;
  extension?: string;
  children?: FileTreeItem[];
}

const FORBIDDEN_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.gemini',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '.venv',
  'venv'
]);

const FORBIDDEN_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'id_rsa',
  'id_ed25519',
  'id_ecdsa'
]);

function buildFileTree(dirPath: string, rootDir: string, maxDepth = 3, currentDepth = 0): FileTreeItem[] {
  if (currentDepth > maxDepth) return [];
  if (!fs.existsSync(dirPath)) return [];

  const items: FileTreeItem[] = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.gitignore' && entry.name !== '.eslintrc.json') {
        continue;
      }
      if (FORBIDDEN_DIRS.has(entry.name.toLowerCase())) {
        continue;
      }
      if (FORBIDDEN_FILES.has(entry.name.toLowerCase())) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          relativePath,
          isDirectory: true,
          children: buildFileTree(fullPath, rootDir, maxDepth, currentDepth + 1)
        });
      } else if (entry.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          items.push({
            name: entry.name,
            relativePath,
            isDirectory: false,
            sizeBytes: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            extension: path.extname(entry.name).toLowerCase()
          });
        } catch {
          // Skip inaccessible file
        }
      }
    }
  } catch (err) {
    console.warn(`[FileTree] Error reading directory ${dirPath}:`, err);
  }

  // Sort directories first, then alphabetically
  return items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceRoot = searchParams.get('root');
  const targetFile = searchParams.get('file');

  if (!workspaceRoot) {
    return NextResponse.json({ error: 'Query parameter `root` is required.' }, { status: 400 });
  }

  const canonicalRoot = path.resolve(workspaceRoot);
  if (!fs.existsSync(canonicalRoot)) {
    return NextResponse.json({ error: `Workspace root does not exist: ${workspaceRoot}` }, { status: 404 });
  }

  // 1. If `file` is provided, return file content with traversal security check
  if (targetFile) {
    const canonicalTarget = path.resolve(canonicalRoot, targetFile);

    // Path traversal check
    if (!canonicalTarget.toLowerCase().startsWith(canonicalRoot.toLowerCase())) {
      return NextResponse.json({ error: 'Security violation: Path traversal detected.' }, { status: 403 });
    }

    const baseName = path.basename(canonicalTarget).toLowerCase();
    if (FORBIDDEN_FILES.has(baseName) || baseName.startsWith('.env')) {
      return NextResponse.json({ error: 'Security restriction: Access to environment and secret files is denied.' }, { status: 403 });
    }

    if (!fs.existsSync(canonicalTarget) || !fs.statSync(canonicalTarget).isFile()) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    // Limit read size to 1MB
    const stats = fs.statSync(canonicalTarget);
    if (stats.size > 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 1MB preview limit.' }, { status: 413 });
    }

    try {
      const rawContent = fs.readFileSync(canonicalTarget, 'utf-8');
      const sanitizedContent = PermissionPolicyService.redactSecrets(rawContent);
      return NextResponse.json({
        file: targetFile,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        content: sanitizedContent
      });
    } catch (err: unknown) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  // 2. Otherwise return directory tree
  const tree = buildFileTree(canonicalRoot, canonicalRoot, 3, 0);
  return NextResponse.json({
    workspaceRoot: canonicalRoot,
    items: tree
  });
}
