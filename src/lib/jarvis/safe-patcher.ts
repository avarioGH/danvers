import fs from 'fs';
import path from 'path';
import { PermissionPolicyService } from './permission-policy';

export interface FileEditOperation {
  relativePath: string;
  content: string; // complete new content or replacement
  action: 'create' | 'modify' | 'delete';
}

export interface PatchResult {
  success: boolean;
  appliedFiles: string[];
  errors: string[];
}

export class SafePatcher {
  private static readonly MAX_PATCH_FILES = 15;
  private static readonly MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB limit per file

  /**
   * Validates and applies a batch of file edits within an isolated worktree.
   */
  public static applyEdits(worktreeRoot: string, edits: FileEditOperation[]): PatchResult {
    const canonicalRoot = path.resolve(worktreeRoot).toLowerCase();
    const result: PatchResult = { success: true, appliedFiles: [], errors: [] };

    if (!fs.existsSync(canonicalRoot)) {
      return { success: false, appliedFiles: [], errors: [`Worktree root does not exist: ${worktreeRoot}`] };
    }

    if (edits.length > this.MAX_PATCH_FILES) {
      return {
        success: false,
        appliedFiles: [],
        errors: [`Patch rejected: File count (${edits.length}) exceeds maximum limit (${this.MAX_PATCH_FILES}).`]
      };
    }

    // Phase 1: Pre-validation of all edit paths
    for (const edit of edits) {
      if (!edit.relativePath || edit.relativePath.trim() === '') {
        result.errors.push('Edit contains empty relativePath.');
        continue;
      }

      // Check for absolute path or traversal characters
      if (path.isAbsolute(edit.relativePath)) {
        result.errors.push(`Patch rejected: Absolute path '${edit.relativePath}' is not permitted.`);
        continue;
      }

      const targetPath = path.resolve(worktreeRoot, edit.relativePath);
      const canonicalTarget = targetPath.toLowerCase();

      // Sandbox traversal defense
      if (!canonicalTarget.startsWith(canonicalRoot)) {
        result.errors.push(`Security violation: Path '${edit.relativePath}' attempts to escape worktree sandbox.`);
        continue;
      }

      // Symlink / Junction check if target or parent exists
      if (fs.existsSync(targetPath)) {
        const real = fs.realpathSync(targetPath).toLowerCase();
        let realRoot = canonicalRoot;
        if (fs.existsSync(worktreeRoot)) {
          realRoot = fs.realpathSync(worktreeRoot).toLowerCase();
        }
        if (!real.startsWith(realRoot)) {
          result.errors.push(`Security violation: Path '${edit.relativePath}' resolves via symlink outside worktree.`);
          continue;
        }
      }

      // Size limit
      if (edit.content && Buffer.byteLength(edit.content, 'utf8') > this.MAX_FILE_SIZE_BYTES) {
        result.errors.push(`Patch rejected: Content size for '${edit.relativePath}' exceeds 500KB limit.`);
        continue;
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
      return result;
    }

    // Phase 2: Application
    for (const edit of edits) {
      const targetPath = path.resolve(worktreeRoot, edit.relativePath);
      try {
        if (edit.action === 'delete') {
          if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
            result.appliedFiles.push(edit.relativePath);
          }
        } else {
          // create or modify
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(targetPath, edit.content, 'utf8');
          result.appliedFiles.push(edit.relativePath);
        }
      } catch (err: unknown) {
        const error = err as Error;
        result.errors.push(`Failed to apply edit to '${edit.relativePath}': ${error.message}`);
        result.success = false;
      }
    }

    return result;
  }
}
