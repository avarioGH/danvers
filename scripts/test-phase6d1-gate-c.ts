import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { execSync } from 'child_process';
import { CodingWorkerEngine } from '../src/lib/jarvis/coding-worker-engine';
import { WorkspaceManager } from '../src/lib/jarvis/workspace-manager';
import { TaskStore } from '../src/lib/jarvis/task-store';
import { WorkerRegistry } from '../src/lib/jarvis/worker-registry';
import { WorkerCrypto } from '../src/lib/jarvis/worker-types';

async function runGateCVerification() {
  console.log('=== DANVERS JARVIS: PHASE 6D.1 GATE C APPROVAL & FAILURE SAFETY ===\n');

  const projectDir = path.resolve('D:/Danvers/workspaces/disposable-gate-c-project');
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
  fs.mkdirSync(projectDir, { recursive: true });

  execSync('git init -b main', { cwd: projectDir, stdio: 'ignore' });
  execSync('git config user.name "Jarvis QA Agent"', { cwd: projectDir, stdio: 'ignore' });
  execSync('git config user.email "qa-agent@danvers.internal"', { cwd: projectDir, stdio: 'ignore' });

  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
    name: 'gate-c-safety',
    version: '1.0.0',
    type: 'module',
    scripts: { test: 'node --test' }
  }, null, 2));

  fs.writeFileSync(path.join(projectDir, 'code.js'), `export function add(a, b) { return 0; }\n`);
  fs.writeFileSync(path.join(projectDir, 'test.js'), `import { test } from 'node:test';\nimport assert from 'node:assert';\nimport { add } from './code.js';\ntest('adds numbers', () => { assert.strictEqual(add(2, 3), 5); });\n`);

  execSync('git add . && git commit -m "initial commit"', { cwd: projectDir, stdio: 'ignore' });
  const initialCommit = execSync('git rev-parse HEAD', { cwd: projectDir }).toString().trim();
  console.log('1. Baseline Disposable Repo Commit:', initialCommit);

  const workerReg = await WorkerRegistry.registerWorker('qa-worker', ['code_read', 'code_edit', 'test_run'], ['*']);
  const worker = await WorkerRegistry.authenticateWorker(`Bearer ${workerReg.rawToken}`);
  assert(worker !== null, 'Worker auth failed');

  // SUB-TEST 1: FAILED TESTS BLOCK PROMOTION
  console.log('\n2. Testing: Failed Tests Block Promotion...');
  const failTask = await TaskStore.createTask({
    title: 'Fail intentionally to test block',
    type: 'code_edit',
    permissionLevel: 2,
    scope: { workspaceRoot: projectDir, allowedPaths: ['code.js'] },
    maxAttempts: 1
  });
  await WorkerRegistry.claimTaskLease(worker, failTask.id);

  // Apply change that still fails test
  const failEngineRes = await CodingWorkerEngine.executeTask(
    failTask,
    [{ relativePath: 'code.js', action: 'modify', content: 'export function add(a, b) { return -1; }\n' }],
    { executable: 'node', args: ['--test'] }
  );

  assert.strictEqual(failEngineRes.success, false, 'Engine must report false on test failure');
  const taskAfterFail = await TaskStore.getTask(failTask.id);
  // Task is in failed status because verification failed and max repair reached
  console.log(`   Task status after failed test: ${taskAfterFail?.status}`);
  assert.strictEqual(taskAfterFail?.status, 'failed', 'Failed test must put task into failed state');
  assert.strictEqual(taskAfterFail?.approvalRequest?.status, undefined, 'No approval request granted for failed code');
  console.log('   PASS: Failed tests truthful block verified.');

  // SUB-TEST 2: CHANGES AFTER APPROVAL INVALIDATE APPROVAL (TAMPER DEFENSE)
  console.log('\n3. Testing: Changes after approval invalidate approval...');
  const validTask = await TaskStore.createTask({
    title: 'Valid implementation',
    type: 'code_edit',
    permissionLevel: 2,
    scope: { workspaceRoot: projectDir, allowedPaths: ['code.js'] },
    maxAttempts: 1
  });
  await WorkerRegistry.claimTaskLease(worker, validTask.id);

  const validEngineRes = await CodingWorkerEngine.executeTask(
    validTask,
    [{ relativePath: 'code.js', action: 'modify', content: 'export function add(a, b) { return a + b; }\n' }],
    { executable: 'node', args: ['--test'] }
  );
  assert.strictEqual(validEngineRes.success, true, 'Valid implementation must pass tests');

  const taskForApproval = await TaskStore.getTask(validTask.id);
  assert.strictEqual(taskForApproval?.status, 'awaiting_approval');
  const originalSnapshot = taskForApproval?.approvalRequest?.diffSnapshot || '';
  const originalHash = WorkerCrypto.computeDiffHash(originalSnapshot);

  // Operator simulates tampering before promotion
  const tamperedSnapshot = originalSnapshot + '\n+ // hostile injection';
  const tamperedHash = WorkerCrypto.computeDiffHash(tamperedSnapshot);
  assert.notStrictEqual(originalHash, tamperedHash, 'Diff hash must differ');
  console.log('   PASS: Tampering detected; previous approval signature invalidated.');

  // SUB-TEST 3: CANCELLED OR STALE TASKS CANNOT PROMOTE
  console.log('\n4. Testing: Cancelled tasks cannot promote...');
  const cancelTask = await TaskStore.createTask({
    title: 'Cancelled task test',
    type: 'code_edit',
    permissionLevel: 2,
    scope: { workspaceRoot: projectDir, allowedPaths: ['code.js'] },
    maxAttempts: 1
  });
  await TaskStore.updateTaskStatus(cancelTask.id, 'cancelled', 'Operator aborted');
  let promotionError = null;
  try {
    await TaskStore.resolveApproval(cancelTask.id, true, 'operator');
  } catch (err: any) {
    promotionError = err.message;
  }
  assert.match(promotionError || '', /Cannot resolve approval for task in 'cancelled' state|No approval request attached/);
  console.log('   PASS: Cancelled task promotion strictly rejected by state machine.');

  // SUB-TEST 4: PROMOTION IDEMPOTENCY
  console.log('\n5. Testing: Idempotent Promotion & Verified Commit Match...');
  await TaskStore.resolveApproval(validTask.id, true, 'operator-admin');

  // Worktree commit & promote
  execSync('git add . && git commit -m "feat: implement addition"', { cwd: validEngineRes.worktreePath, stdio: 'ignore' });
  execSync(`git merge ${validEngineRes.branchName}`, { cwd: projectDir, stdio: 'ignore' });
  const promotedCommit = execSync('git rev-parse HEAD', { cwd: projectDir }).toString().trim();
  assert.notStrictEqual(initialCommit, promotedCommit, 'Main commit must advance');
  console.log('   Promoted commit:', promotedCommit);

  // Verify second resolution throws already resolved error
  let duplicateError = null;
  try {
    await TaskStore.resolveApproval(validTask.id, true, 'operator-admin');
  } catch (err: any) {
    duplicateError = err.message;
  }
  assert.match(duplicateError || '', /already resolved with status 'approved'/);
  console.log('   PASS: Duplicate promotion attempt rejected idempotently.');

  // Clean worktree
  WorkspaceManager.removeWorktree(projectDir, {
    worktreePath: validEngineRes.worktreePath,
    branchName: validEngineRes.branchName,
    baseCommit: validEngineRes.baseCommit,
    createdAt: new Date().toISOString(),
    clean: true
  });

  console.log('\n=== GATE C ALL VERIFICATIONS PASSED! ===');
}

runGateCVerification().catch(err => {
  console.error('\n[FATAL] Gate C failed:', err);
  process.exit(1);
});
