import { spawnSync } from 'child_process';
import path from 'path';
import { PermissionPolicyService } from './permission-policy';

export interface ProcessExecutionOptions {
  cwd: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  env?: Record<string, string>;
}

export interface ProcessExecutionResult {
  command: string;
  args: string[];
  exitCode: number;
  passed: boolean;
  output: string;
  durationMs: number;
  timedOut: boolean;
}

export class SafeProcessRunner {
  private static readonly DEFAULT_TIMEOUT_MS = 60000; // 60s max per command
  private static readonly MAX_OUTPUT_BYTES = 200 * 1024; // 200 KB max output

  // Strictly whitelisted commands permitted for verification in Phase 3
  private static readonly ALLOWED_COMMANDS: Record<string, string[]> = {
    git: ['status', 'diff', 'rev-parse', 'add', 'commit', 'branch', 'log'],
    node: ['--version', '--test', '--check'],
    npx: ['tsc', 'eslint', 'vitest', 'jest', 'tsx']
  };

  /**
   * Executes an approved development command with strict argument vectors and timeouts.
   */
  public static execute(
    executable: string,
    args: string[],
    options: ProcessExecutionOptions
  ): ProcessExecutionResult {
    const start = Date.now();
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;

    // 1. Verify working directory exists and is canonical
    const canonicalCwd = path.resolve(options.cwd);

    // 2. Security validation: Verify executable is whitelisted
    const baseExe = path.basename(executable).replace(/\.exe$/i, '').toLowerCase();
    if (!this.ALLOWED_COMMANDS[baseExe]) {
      return {
        command: executable,
        args,
        exitCode: 126,
        passed: false,
        output: `Security violation: Executable '${executable}' is not in the approved process runner whitelist.`,
        durationMs: Date.now() - start,
        timedOut: false
      };
    }

    // 3. Security validation: Verify primary sub-command or argument
    const firstArg = args[0] || '';
    const allowedSubCommands = this.ALLOWED_COMMANDS[baseExe];
    if (allowedSubCommands.length > 0 && !allowedSubCommands.includes(firstArg)) {
      return {
        command: executable,
        args,
        exitCode: 126,
        passed: false,
        output: `Security violation: Argument '${firstArg}' for '${executable}' is not permitted by execution policy.`,
        durationMs: Date.now() - start,
        timedOut: false
      };
    }

    // 4. Argument security checks: Disallow shell injection characters & pipe operators
    for (const arg of args) {
      if (/[;&|`$><]/.test(arg)) {
        return {
          command: executable,
          args,
          exitCode: 126,
          passed: false,
          output: `Security violation: Argument '${arg}' contains illegal shell characters.`,
          durationMs: Date.now() - start,
          timedOut: false
        };
      }
    }

    // 5. Execute without ambient shell
    const spawnRes = spawnSync(executable, args, {
      cwd: canonicalCwd,
      timeout: timeoutMs,
      maxBuffer: this.MAX_OUTPUT_BYTES,
      shell: false, // Explicitly false: Direct argument-based execution
      env: {
        ...process.env,
        CI: 'true',
        NODE_ENV: 'test',
        ...options.env
      }
    });

    const durationMs = Date.now() - start;
    const timedOut = Boolean(spawnRes.error && (spawnRes.error as any).code === 'ETIMEDOUT');
    const stdout = spawnRes.stdout ? spawnRes.stdout.toString('utf8') : '';
    const stderr = spawnRes.stderr ? spawnRes.stderr.toString('utf8') : '';
    const rawOutput = (stdout + (stderr ? `\nSTDERR:\n${stderr}` : '')).trim();
    const cleanOutput = PermissionPolicyService.redactSecrets(rawOutput);

    const exitCode = timedOut ? 124 : (spawnRes.status ?? (spawnRes.error ? 1 : 0));
    const passed = exitCode === 0;

    return {
      command: executable,
      args,
      exitCode,
      passed,
      output: cleanOutput,
      durationMs,
      timedOut
    };
  }
}
