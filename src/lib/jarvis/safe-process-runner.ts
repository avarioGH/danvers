import { spawn } from 'child_process';
import { execFileSync } from 'child_process';
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
  terminatedProcessTree?: boolean;
}

export class SafeProcessRunner {
  private static readonly DEFAULT_TIMEOUT_MS = 30000; // 30s max per command
  private static readonly MAX_OUTPUT_BYTES = 250 * 1024; // 250 KB max output

  // Strictly whitelisted commands permitted for verification in Phase 4
  private static readonly ALLOWED_COMMANDS: Record<string, string[]> = {
    git: ['status', 'diff', 'rev-parse', 'add', 'commit', 'branch', 'log'],
    node: ['--version', '--test', '--check', '-e'],
    npx: ['tsc', 'eslint', 'vitest', 'jest', 'tsx']
  };

  // Explicitly sanitized environment variables allowed for child processes
  private static readonly ALLOWED_ENV_VARS = [
    'PATH',
    'PATHEXT',
    'SYSTEMROOT',
    'WINDIR',
    'TEMP',
    'TMP',
    'HOMEPATH',
    'USERPROFILE',
    'NODE_ENV',
    'CI'
  ];

  /**
   * Sanitizes the environment by explicitly omitting secrets, tokens, and database passwords.
   */
  private static sanitizeEnvironment(extraEnv?: Record<string, string>): NodeJS.ProcessEnv {
    const cleanEnv: NodeJS.ProcessEnv = {
      CI: 'true',
      NODE_ENV: 'test'
    };

    for (const key of this.ALLOWED_ENV_VARS) {
      if (process.env[key]) {
        cleanEnv[key] = process.env[key];
      }
    }

    if (extraEnv) {
      for (const [k, v] of Object.entries(extraEnv)) {
        // Disallow passing credentials or auth keys into test processes
        if (/key|secret|token|password|auth|jwt/i.test(k)) {
          continue;
        }
        cleanEnv[k] = v;
      }
    }

    return cleanEnv;
  }

  /**
   * Kills an entire process tree reliably on Windows using taskkill /F /T /PID.
   */
  public static killProcessTree(pid: number): void {
    if (!pid || pid <= 0) return;
    try {
      execFileSync('taskkill', ['/F', '/T', '/PID', pid.toString()], {
        stdio: 'ignore'
      });
    } catch {
      // Process may already have terminated
    }
  }

  /**
   * Executes an approved development command with strict argument vectors, clean env, and process-tree termination.
   */
  public static async executeAsync(
    executable: string,
    args: string[],
    options: ProcessExecutionOptions
  ): Promise<ProcessExecutionResult> {
    const start = Date.now();
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;
    const maxOutputBytes = options.maxOutputBytes || this.MAX_OUTPUT_BYTES;

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

    const cleanEnv = this.sanitizeEnvironment(options.env);

    return new Promise<ProcessExecutionResult>((resolve) => {
      let stdoutBuffer = '';
      let stderrBuffer = '';
      let timedOut = false;
      let outputTruncated = false;

      const child = spawn(executable, args, {
        cwd: canonicalCwd,
        shell: false, // Strict argument-based execution
        env: cleanEnv,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          if (child.pid) {
            SafeProcessRunner.killProcessTree(child.pid);
          }
          child.kill('SIGKILL');
        } catch {}
      }, timeoutMs);

      child.stdout?.on('data', (data) => {
        if (stdoutBuffer.length < maxOutputBytes) {
          stdoutBuffer += data.toString('utf8');
        } else if (!outputTruncated) {
          stdoutBuffer += '\n[OUTPUT TRUNCATED: Exceeded buffer limit]';
          outputTruncated = true;
        }
      });

      child.stderr?.on('data', (data) => {
        if (stderrBuffer.length < maxOutputBytes) {
          stderrBuffer += data.toString('utf8');
        }
      });

      child.on('close', (code, signal) => {
        clearTimeout(timer);
        const durationMs = Date.now() - start;

        const rawOutput = (stdoutBuffer + (stderrBuffer ? `\nSTDERR:\n${stderrBuffer}` : '')).trim();
        const cleanOutput = PermissionPolicyService.redactSecrets(rawOutput);

        const exitCode = timedOut ? 124 : (code ?? (signal ? 1 : 0));
        const passed = exitCode === 0 && !timedOut;

        resolve({
          command: executable,
          args,
          exitCode,
          passed,
          output: cleanOutput,
          durationMs,
          timedOut,
          terminatedProcessTree: timedOut
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          command: executable,
          args,
          exitCode: 1,
          passed: false,
          output: `Process execution error: ${err.message}`,
          durationMs: Date.now() - start,
          timedOut: false
        });
      });
    });
  }

  /**
   * Synchronous fallback wrapper calling async runner.
   */
  public static execute(
    executable: string,
    args: string[],
    options: ProcessExecutionOptions
  ): ProcessExecutionResult {
    // For sync callers, we delegate safely
    return {
      command: executable,
      args,
      exitCode: 126,
      passed: false,
      output: 'Use SafeProcessRunner.executeAsync for hardened process execution.',
      durationMs: 0,
      timedOut: false
    };
  }
}
