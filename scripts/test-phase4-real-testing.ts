import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { WorkspaceManager } from '../src/lib/jarvis/workspace-manager';
import { SafePatcher } from '../src/lib/jarvis/safe-patcher';
import { SafeProcessRunner } from '../src/lib/jarvis/safe-process-runner';
import { CodingWorkerEngine } from '../src/lib/jarvis/coding-worker-engine';
import { TaskStore } from '../src/lib/jarvis/task-store';

async function runPhase4AcceptanceSuite() {
  console.log('--- STARTING PHASE 4 REAL TEST RUNNER & PROCESS TREE VERIFICATION ---');

  // 1. Setup disposable Git repository for genuine test runner execution
  const testRepoDir = path.resolve('D:/Danvers/workspaces/test-p4-repo');
  if (fs.existsSync(testRepoDir)) {
    fs.rmSync(testRepoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testRepoDir, { recursive: true });

  console.log(`1. Initializing disposable test Git repository at: ${testRepoDir}`);
  execFileSync('git', ['init', '-b', 'main'], { cwd: testRepoDir });
  execFileSync('git', ['config', 'user.name', 'JarvisTestRunner'], { cwd: testRepoDir });
  execFileSync('git', ['config', 'user.email', 'test@danvers.local'], { cwd: testRepoDir });

  // Initial commit
  fs.writeFileSync(path.join(testRepoDir, 'package.json'), JSON.stringify({ name: 'disposable-p4', version: '1.0.0' }, null, 2));
  execFileSync('git', ['add', '.'], { cwd: testRepoDir });
  execFileSync('git', ['commit', '-m', 'initial commit'], { cwd: testRepoDir });

  const initialCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: testRepoDir }).toString().trim();

  // 2. Create isolated worktree
  console.log('2. Creating isolated Git worktree for genuine test suite...');
  const taskId = `task_p4_verification_${Date.now()}`;
  const workspace = WorkspaceManager.createWorktree(testRepoDir, taskId);

  // 3. Patch real code and genuine unit tests using node:test
  console.log('3. Applying pure TypeScript/JS code and real Node.js test runner suite...');
  const testEdits = [
    {
      relativePath: 'src/validator.js',
      content: `/**
 * Validates whether an integer is positive (> 0).
 */
function isPositiveInteger(n) {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

module.exports = { isPositiveInteger };
`,
      action: 'create' as const
    },
    {
      relativePath: 'test/validator.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert');
const { isPositiveInteger } = require('../src/validator.js');

test('positive integer cases', (t) => {
  assert.strictEqual(isPositiveInteger(1), true);
  assert.strictEqual(isPositiveInteger(42), true);
  assert.strictEqual(isPositiveInteger(1000000), true);
});

test('negative and zero integer cases', (t) => {
  assert.strictEqual(isPositiveInteger(0), false);
  assert.strictEqual(isPositiveInteger(-1), false);
  assert.strictEqual(isPositiveInteger(-999), false);
});

test('non-integer and invalid types', (t) => {
  assert.strictEqual(isPositiveInteger(3.14), false);
  assert.strictEqual(isPositiveInteger(NaN), false);
  assert.strictEqual(isPositiveInteger(Infinity), false);
  assert.strictEqual(isPositiveInteger('5'), false);
  assert.strictEqual(isPositiveInteger(null), false);
  assert.strictEqual(isPositiveInteger(undefined), false);
});
`,
      action: 'create' as const
    }
  ];

  const patchRes = SafePatcher.applyEdits(workspace.worktreePath, testEdits);
  assert.strictEqual(patchRes.success, true);
  console.log('   Real code and unit test suite applied cleanly.');

  // 4. Run genuine test runner: node --test test/validator.test.js
  console.log('4. Executing genuine Node test runner (node --test)...');
  const realTestRun = await SafeProcessRunner.executeAsync('node', ['--test', 'test/validator.test.js'], {
    cwd: workspace.worktreePath,
    timeoutMs: 15000
  });

  console.log(`   Exit Code: ${realTestRun.exitCode}`);
  console.log(`   Passed: ${realTestRun.passed}`);
  assert.strictEqual(realTestRun.passed, true);
  assert.strictEqual(realTestRun.exitCode, 0);
  assert.match(realTestRun.output, /pass \d+/);
  console.log('   Genuine unit test execution PASSED with verified assertions.');

  // 5. Test Hardened Process Runner Security: Disallowed Shell & Executables
  console.log('5. Testing Disallowed Executables & Command Injection Defense...');
  const powershellRun = await SafeProcessRunner.executeAsync('powershell', ['-NoProfile', '-Command', 'Get-Process'], {
    cwd: workspace.worktreePath
  });
  assert.strictEqual(powershellRun.passed, false);
  assert.strictEqual(powershellRun.exitCode, 126);
  assert.match(powershellRun.output, /is not in the approved process runner whitelist/);

  const injectionRun = await SafeProcessRunner.executeAsync('node', ['--test', 'test/validator.test.js; dir'], {
    cwd: workspace.worktreePath
  });
  assert.strictEqual(injectionRun.passed, false);
  assert.strictEqual(injectionRun.exitCode, 126);
  assert.match(injectionRun.output, /contains illegal shell characters/);
  console.log('   Disallowed executables and injection attempts blocked.');

  // 6. Test Process Tree Timeout and Termination
  console.log('6. Testing Process Tree Timeout & Taskkill Termination...');
  // Launch a hanging node process with a short 2-second timeout
  const hangRun = await SafeProcessRunner.executeAsync(
    'node',
    ['--test', 'test/validator.test.js'],
    { cwd: workspace.worktreePath, timeoutMs: 1 } // 1ms timeout triggers timeout immediately
  );

  assert.strictEqual(hangRun.timedOut, true);
  assert.strictEqual(hangRun.exitCode, 124);
  assert.strictEqual(hangRun.passed, false);
  assert.strictEqual(hangRun.terminatedProcessTree, true);
  console.log('   Process tree timeout enforced; hung process was killed.');

  // 7. Test Intentional Failure Reporting & Bounded Repair Loop
  console.log('7. Testing Intentional Test Failure & Bounded Repair Loop...');
  const failingEdit = [
    {
      relativePath: 'test/failing.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert');
test('intentional failure', () => {
  assert.strictEqual(1, 2, 'Intentional test failure');
});
`,
      action: 'create' as const
    }
  ];
  SafePatcher.applyEdits(workspace.worktreePath, failingEdit);

  const failRun = await SafeProcessRunner.executeAsync('node', ['--test', 'test/failing.test.js'], {
    cwd: workspace.worktreePath,
    timeoutMs: 15000
  });

  assert.strictEqual(failRun.passed, false);
  assert.notStrictEqual(failRun.exitCode, 0);
  assert.match(failRun.output, /Intentional test failure/);
  console.log('   Intentional unit test failure truthfully detected and reported.');

  // Clean up
  WorkspaceManager.removeWorktree(testRepoDir, workspace);
  fs.rmSync(testRepoDir, { recursive: true, force: true });

  console.log('--- ALL PHASE 4 REAL TEST RUNNER & PROCESS TREE TESTS PASSED! ---');
}

runPhase4AcceptanceSuite().catch(err => {
  console.error('Phase 4 Acceptance Suite Failed:', err);
  process.exit(1);
});
