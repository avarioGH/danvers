import path from 'path';
import type { PermissionLevel, PermissionCheckResult, TaskScope } from './types';

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
      'delete_file',
      'delete_directory',
      'destructive_migration',
      'system_admin_command',
      'modify_firewall',
      'git_force_push'
    ];

    if (isDestructive || sensitiveActions.includes(actionType)) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: `Action '${actionType}' is classified as Level 3 (Sensitive) and requires human authorization.`,
        level: 3
      };
    }

    // 2. Path Traversal & Workspace Sandbox Checks for file-based actions
    if (targetPathOrEntity && (targetPathOrEntity.includes('/') || targetPathOrEntity.includes('\\'))) {
      const normalizedRoot = path.resolve(scope.workspaceRoot);
      const normalizedTarget = path.resolve(targetPathOrEntity);

      // Verify that normalized target is within normalized workspaceRoot
      if (!normalizedTarget.startsWith(normalizedRoot)) {
        return {
          allowed: false,
          requiresApproval: false,
          reason: `Security violation: Path '${targetPathOrEntity}' attempts to escape workspace sandbox '${scope.workspaceRoot}'.`,
          level: 3
        };
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
      'git_commit'
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
}
