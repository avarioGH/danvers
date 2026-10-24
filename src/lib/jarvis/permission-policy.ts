import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { PermissionLevel, PermissionCheckResult, TaskScope } from './types';

export class PermissionPolicyService {
  /**
   * Evaluates an intended action against workspace boundaries and permission levels.
   */
  public static evaluateAction(
    actionType: string,
    targetPathOrEntity: string,
    scope: TaskScope,
    isDestructive = false
  ): PermissionCheckResult {
    // 1. Level 3 Sensitive Actions:
    // Destructive operations, deployments, deletions, administrative commands
    const sensitiveActions = [
      'deploy_production',
      'deploy_staging',
      'delete_file',
      'delete_directory',
      'destructive_migration',
      'system_admin_command',
      'modify_firewall',
      'git_force_push',
      'kill_system_process'
    ];

    if (isDestructive || sensitiveActions.includes(actionType)) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: `Action '${actionType}' is classified as Level 3 (Sensitive) and requires authenticated human authorization.`,
        level: 3
      };
    }

    // 2. Strict Workspace Sandbox & Canonical Path Traversal Defense
    if (targetPathOrEntity && (targetPathOrEntity.includes('/') || targetPathOrEntity.includes('\\'))) {
      const normalizedRoot = path.normalize(path.resolve(scope.workspaceRoot)).toLowerCase();
      const normalizedTarget = path.normalize(path.resolve(targetPathOrEntity)).toLowerCase();

      // Check if path tries to escape using .. or drive boundary
      if (!normalizedTarget.startsWith(normalizedRoot)) {
        return {
          allowed: false,
          requiresApproval: false,
          reason: `Security violation: Path '${targetPathOrEntity}' attempts to escape workspace sandbox '${scope.workspaceRoot}'.`,
          level: 3
        };
      }

      // Check if path physically exists on disk and resolves via realpath (symlink/junction escape defense)
      try {
        if (fs.existsSync(targetPathOrEntity)) {
          const realTarget = fs.realpathSync(targetPathOrEntity).toLowerCase();
          let realRoot = normalizedRoot;
          if (fs.existsSync(scope.workspaceRoot)) {
            realRoot = fs.realpathSync(scope.workspaceRoot).toLowerCase();
          }
          if (!realTarget.startsWith(realRoot)) {
            return {
              allowed: false,
              requiresApproval: false,
              reason: `Security violation: Path '${targetPathOrEntity}' resolves via symlink/junction outside workspace sandbox.`,
              level: 3
            };
          }
        }
      } catch {
        // Fall back to normalized check if realpath fails
      }

      // Check against readOnly flag if writing
      const writeActions = ['write_file', 'edit_file', 'create_file', 'patch_file'];
      if (writeActions.includes(actionType) && scope.readOnly) {
        return {
          allowed: false,
          requiresApproval: false,
          reason: `Task scope is read-only. Modification of '${targetPathOrEntity}' is prohibited.`,
          level: 2
        };
      }
    }

    // 3. Level 2 Controlled Actions
    const controlledActions = [
      'write_file',
      'edit_file',
      'create_file',
      'patch_file',
      'run_test',
      'run_build',
      'install_dependencies',
      'git_branch',
      'git_commit',
      'git_checkout'
    ];

    if (controlledActions.includes(actionType)) {
      return {
        allowed: true,
        requiresApproval: false,
        level: 2
      };
    }

    // 4. Level 1 Read & Analyze Actions (Default)
    return {
      allowed: true,
      requiresApproval: false,
      level: 1
    };
  }

  /**
   * Redacts sensitive strings (API keys, tokens, auth headers, passwords) from text and logs.
   */
  public static redactSecrets(content: string): string {
    if (!content || typeof content !== 'string') return content;
    return content
      // Bearer tokens and JWTs
      .replace(/Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*/gi, 'Bearer [REDACTED_JWT]')
      // OpenAI / Anthropic / Gemini API Keys
      .replace(/sk-[A-Za-z0-9]{20,}/g, 'sk-[REDACTED_KEY]')
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, 'AIzaSy[REDACTED_GEMINI_KEY]')
      // Password patterns
      .replace(/(password\s*[:=]\s*['"]?)[^'"\s\n]+/gi, '$1[REDACTED_PASSWORD]')
      // Generic secrets and private keys
      .replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]');
  }

  /**
   * Generates a cryptographically secure identifier.
   */
  public static generateSecureId(prefix = 'id'): string {
    return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
  }
}
