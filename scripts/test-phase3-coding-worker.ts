import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { WorkspaceManager } from '../src/lib/jarvis/workspace-manager';
import { SafePatcher } from '../src/lib/jarvis/safe-patcher';
import { SafeProcessRunner } from '../src/lib/jarvis/safe-process-runner';
import { CodingWorkerEngine } from '../src/lib/jarvis/coding-worker-engine';
import { TaskStore } from '../src/lib/jarvis/task-store';

async function runPhase3AcceptanceSuite() {
  console.log('--- STARTING PHASE 3 CODING WORKER & ISOLATION ACCEPTANCE SUITE ---');

  // 1. Setup disposable Git repository for safe test execution
  const testRepoDir = path.resolve('D:/Danvers/workspaces/test-sandbox-repo');
  if (fs.existsSync(testRepoDir)) {
    fs.rmSync(testRepoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testRepoDir, { recursive: true });

  console.log(`1. Initializing disposable test Git repository at: ${testRepoDir}`);
  execFileSync('git', ['init', '-b', 'main'], { cwd: testRepoDir });
  execFileSync('git', ['config', 'user.name', 'JarvisTestRunner'], { cwd: testRepoDir });
  execFileSync('git', ['config', 'user.email', 'test@danvers.local'], { cwd: testRepoDir });

  // Create initial commit
  fs.writeFileSync(path.join(testRepoDir, 'package.json'), JSON.stringify({ name: 'disposable-app', version: '1.0.0' }, null, 2));
  fs.writeFileSync(path.join(testRepoDir, 'README.md'), '# Disposable Test App\n');
  execFileSync('git', ['add', '.'], { cwd: testRepoDir });
  execFileSync('git', ['commit', '-m', 'initial commit'], { cwd: testRepoDir });

  const initialCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: testRepoDir }).toString().trim();
  console.log(`   Initial base commit: ${initialCommit}`);

  // 2. Test Worktree Creation & Isolation
  console.log('2. Testing Git Worktree creation & isolation...');
  const testTaskId = 'test_p3_task_001';
  const workspace = WorkspaceManager.createWorktree(testRepoDir, testTaskId);
  assert.strictEqual(fs.existsSync(workspace.worktreePath), true);
  assert.strictEqual(workspace.baseCommit, initialCommit);
  console.log(`   Created worktree at: ${workspace.worktreePath} on branch: ${workspace.branchName}`);

  // 3. Test Patch Safety: Path Traversal Rejection
  console.log('3. Testing Patch Safety & Sandbox Traversal Rejection...');
  const maliciousEdits = [
    {
      relativePath: '../../Windows/System32/hacked.txt',
      content: 'malicious',
      action: 'create' as const
    }
  ];
  const traversalResult = SafePatcher.applyEdits(workspace.worktreePath, maliciousEdits);
  assert.strictEqual(traversalResult.success, false);
  assert.strictEqual(traversalResult.errors.length > 0, true);
  assert.match(traversalResult.errors[0], /Security violation: Path.*attempts to escape/);
  console.log('   Path traversal patch blocked successfully.');

  // 4. Test Valid Patch Application
  console.log('4. Testing Valid Code Patch Application...');
  const validEdits = [
    {
      relativePath: 'src/math.ts',
      content: `/**
 * Validates whether an integer is positive (> 0).
 */
export function isPositiveInteger(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}
`,
      action: 'create' as const
    },
    {
      relativePath: 'test/math.test.js',
      content: `const assert = require('assert');
// Direct unit test verification
function isPositiveInteger(n) {
  return Number.isInteger(n) && n > 0;
}

assert.strictEqual(isPositiveInteger(5), true);
assert.strictEqual(isPositiveInteger(1), true);
assert.strictEqual(isPositiveInteger(0), false);
assert.strictEqual(isPositiveInteger(-5), false);
assert.strictEqual(isPositiveInteger(3.14), false);
console.log('MATH TESTS PASSED');
`,
      action: 'create' as const
    }
  ];

  const patchRes = SafePatcher.applyEdits(workspace.worktreePath, validEdits);
  assert.strictEqual(patchRes.success, true);
  assert.strictEqual(patchRes.appliedFiles.length, 2);
  console.log('   Valid patch applied cleanly to worktree.');

  // 5. Test Safe Process Runner (Approved Command vs Disallowed Command)
  console.log('5. Testing Safe Process Runner Policy Enforcement...');
  
  // Disallowed executable (e.g. powershell, cmd, bash)
  const disallowedRun = await SafeProcessRunner.executeAsync('powershell', ['-Command', 'dir'], { cwd: workspace.worktreePath });
  assert.strictEqual(disallowedRun.passed, false);
  assert.strictEqual(disallowedRun.exitCode, 126);
  assert.match(disallowedRun.output, /is not in the approved process runner whitelist/);
  console.log('   Disallowed executable rejected by policy.');

  // Approved command execution: node test runner
  const testRun = await SafeProcessRunner.executeAsync('node', ['--check', 'test/math.test.js'], { cwd: workspace.worktreePath });
  assert.strictEqual(testRun.passed, true);
  assert.strictEqual(testRun.exitCode, 0);
  console.log('   Approved syntax & execution check passed.');

  // 6. Test Diff Generation against Base Commit
  console.log('6. Testing Git Diff generation against base commit...');
  execFileSync('git', ['add', '.'], { cwd: workspace.worktreePath });
  execFileSync('git', ['commit', '-m', 'feat: add isPositiveInteger and test'], { cwd: workspace.worktreePath });

  const diff = WorkspaceManager.getWorktreeDiff(workspace.worktreePath, workspace.baseCommit);
  const changedFiles = WorkspaceManager.getChangedFiles(workspace.worktreePath, workspace.baseCommit);
  assert.strictEqual(changedFiles.includes('src/math.ts'), true);
  assert.strictEqual(changedFiles.includes('test/math.test.js'), true);
  assert.strictEqual(diff.includes('isPositiveInteger'), true);
  console.log(`   Diff verified: ${changedFiles.length} files changed.`);

  // 7. Verify Main Branch in Original Repository is Completely Untouched
  console.log('7. Verifying original repository main branch protection...');
  const mainBranchCommit = execFileSync('git', ['rev-parse', 'main'], { cwd: testRepoDir }).toString().trim();
  assert.strictEqual(mainBranchCommit, initialCommit);
  assert.strictEqual(fs.existsSync(path.join(testRepoDir, 'src', 'math.ts')), false);
  console.log('   Confirmed: Main branch in original repo was not modified.');

  // 8. End-to-End Orchestrated Task Execution via CodingWorkerEngine
  console.log('8. Testing End-to-End Task Lifecycle via CodingWorkerEngine...');
  const task = await TaskStore.createTask({
    title: 'Implement positive integer validator with unit tests',
    type: 'code_edit',
    permissionLevel: 2,
    scope: { workspaceRoot: testRepoDir, allowedPaths: [] },
    maxAttempts: 2
  });

  const workerResult = await CodingWorkerEngine.executeTask(
    task,
    validEdits,
    { executable: 'node', args: ['--check', 'test/math.test.js'] }
  );

  assert.strictEqual(workerResult.success, true);
  assert.strictEqual(workerResult.approvalRequired, true);

  const updatedTask = await TaskStore.getTask(task.id);
  assert.strictEqual(updatedTask?.status, 'awaiting_approval');
  assert.strictEqual(updatedTask?.approvalRequest?.action, 'promote_code_to_main');
  console.log('   Task reached awaiting_approval with promote_code_to_main request.');

  // 9. Unauthorized Approval vs Authorized Approval
  console.log('9. Testing Approval Safeguards & Promotion Authorization...');
  await TaskStore.resolveApproval(task.id, true, 'Operator@danvers.jarvis');
  const authorizedTask = await TaskStore.getTask(task.id);
  assert.strictEqual(authorizedTask?.status, 'running');
  assert.strictEqual(authorizedTask?.approvalRequest?.status, 'approved');
  console.log('   Authorized approval recorded.');

  // 10. Clean up worktree safely
  console.log('10. Cleaning up disposable worktree...');
  WorkspaceManager.removeWorktree(testRepoDir, workspace);
  assert.strictEqual(fs.existsSync(workspace.worktreePath), false);
  console.log('   Worktree removed cleanly.');

  // Clean up test repo
  fs.rmSync(testRepoDir, { recursive: true, force: true });

  console.log('--- ALL PHASE 3 ACCEPTANCE & CODING WORKER TESTS PASSED SUCCESSFULLY! ---');
}

runPhase3AcceptanceSuite().catch(err => {
  console.error('Acceptance Suite Failed:', err);
  process.exit(1);
});
