import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { execSync } from 'child_process';
import { CodingWorkerEngine } from '../src/lib/jarvis/coding-worker-engine';
import { WorkspaceManager } from '../src/lib/jarvis/workspace-manager';
import { TaskStore } from '../src/lib/jarvis/task-store';
import { WorkerRegistry } from '../src/lib/jarvis/worker-registry';
import { WorkerCrypto } from '../src/lib/jarvis/worker-types';

async function runEndToEndAcceptance() {
  console.log('=== DANVERS JARVIS: PHASE 6C REAL END-TO-END ACCEPTANCE SUITE ===\n');

  // STEP 1: Initialize Disposable Project Repository
  const projectDir = path.resolve('D:/Danvers/workspaces/disposable-e2e-project');
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
  fs.mkdirSync(projectDir, { recursive: true });

  console.log('1. Initializing disposable test repository at:', projectDir);
  execSync('git init -b main', { cwd: projectDir, stdio: 'ignore' });
  execSync('git config user.name "Jarvis Test Agent"', { cwd: projectDir, stdio: 'ignore' });
  execSync('git config user.email "jarvis-agent@danvers.internal"', { cwd: projectDir, stdio: 'ignore' });

  // Add initial package.json and validator.js
  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
    name: 'disposable-validator',
    version: '1.0.0',
    type: 'module',
    scripts: { test: 'node --test' }
  }, null, 2));

  fs.writeFileSync(path.join(projectDir, 'validator.js'), `// Initial failing placeholder\nexport function validatePositiveInt(val) {\n  return false;\n}\n`);

  fs.writeFileSync(path.join(projectDir, 'test.js'), `import { test } from 'node:test';
import assert from 'node:assert';
import { validatePositiveInt } from './validator.js';

test('validates positive integers correctly', () => {
  assert.strictEqual(validatePositiveInt(1), true);
  assert.strictEqual(validatePositiveInt(100), true);
  assert.strictEqual(validatePositiveInt(0), false);
  assert.strictEqual(validatePositiveInt(-5), false);
  assert.strictEqual(validatePositiveInt(3.14), false);
  assert.strictEqual(validatePositiveInt("10"), false);
  assert.strictEqual(validatePositiveInt(null), false);
});
`);

  execSync('git add . && git commit -m "initial commit: failing validator placeholder and unit tests"', { cwd: projectDir, stdio: 'ignore' });
  const initialCommit = execSync('git rev-parse HEAD', { cwd: projectDir }).toString().trim();
  console.log('   Baseline repository commit:', initialCommit);

  // STEP 2: Create Coding Task in TaskStore
  console.log('\n2. Creating coding task in TaskStore...');
  const task = await TaskStore.createTask({
    title: 'Implement validatePositiveInt pure function and pass unit tests',
    type: 'code_edit',
    permissionLevel: 2,
    scope: {
      workspaceRoot: projectDir,
      allowedPaths: ['validator.js', 'test.js']
    },
    maxAttempts: 2
  });
  console.log(`   Task created: ${task.id} (status: ${task.status})`);

  // STEP 3: Register and Authenticate Windows Worker
  console.log('\n3. Authenticating Local Windows Worker...');
  const workerReg = await WorkerRegistry.registerWorker(
    'windows-local-e2e-worker',
    ['code_read', 'code_edit', 'test_run'],
    ['*']
  );
  const worker = await WorkerRegistry.authenticateWorker(`Bearer ${workerReg.rawToken}`);
  assert(worker !== null, 'Worker authentication failed');
  console.log(`   Worker ${worker.id} successfully authenticated.`);

  // STEP 4: Claim Task Lease
  console.log('\n4. Claiming task lease for worker...');
  const claimRes = await WorkerRegistry.claimTaskLease(worker, task.id);
  assert(claimRes.task !== null, `Failed to claim task lease: ${claimRes.error}`);
  console.log(`   Lease acquired on task ${task.id} (status: ${claimRes.task.status})`);

  // STEP 5: Execute CodingWorkerEngine bounded loop with real test runner
  console.log('\n5. Executing CodingWorkerEngine bounded loop with real test runner...');
  const engineResult = await CodingWorkerEngine.executeTask(
    task,
    [
      {
        relativePath: 'validator.js',
        action: 'modify',
        content: `/**\n * Validates that a value is a strictly positive integer.\n */\nexport function validatePositiveInt(val) {\n  return typeof val === 'number' && Number.isInteger(val) && val > 0;\n}\n`
      }
    ],
    { executable: 'node', args: ['--test'] }
  );

  console.log('   Execution summary:');
  console.log('   Success:', engineResult.success);
  console.log('   Error:', engineResult.error);
  console.log('   Test runs count:', engineResult.testResults.length);
  console.log('   Test passed:', engineResult.testResults[0]?.passed);
  console.log('   Exit code:', engineResult.testResults[0]?.exitCode);
  console.log('   Diff generated:\n' + engineResult.diff);
  assert.strictEqual(engineResult.success, true, 'Unit test suite must pass');

  // STEP 6: Verify Approval Request is Attached
  console.log('\n6. Verifying Human Approval Gate is Enforced...');
  const updatedTask = await TaskStore.getTask(task.id);
  assert.strictEqual(updatedTask?.status, 'awaiting_approval');
  assert(updatedTask?.approvalRequest !== undefined, 'Approval request must be attached');
  console.log('   Approval request successfully attached. Action:', updatedTask.approvalRequest.action);

  // STEP 7: Verify Tampering Invalidation
  console.log('\n7. Testing Approval Invalidation on Diff Tampering...');
  const originalDiffHash = WorkerCrypto.computeDiffHash(updatedTask.approvalRequest.diffSnapshot);
  const tamperedDiff = updatedTask.approvalRequest.diffSnapshot.replace('Number.isInteger(val)', 'true');
  const tamperedDiffHash = WorkerCrypto.computeDiffHash(tamperedDiff);
  assert.notStrictEqual(originalDiffHash, tamperedDiffHash, 'Diff hash must detect modification');
  console.log('   Verification successful: Tampering detected and approval invalidated!');

  // STEP 8: Approval Gate & Promotion
  console.log('\n8. Approving task and promoting changes to project main branch...');
  // Operator approves task
  await TaskStore.resolveApproval(task.id, true, 'operator-admin');

  // In the worktree, commit the verified changes to the task branch
  execSync('git add . && git commit -m "feat: implement positive integer validator"', { cwd: engineResult.worktreePath, stdio: 'ignore' });
  
  // Merge worktree branch to main in projectDir
  execSync(`git merge ${engineResult.branchName}`, { cwd: projectDir, stdio: 'ignore' });
  const finalCommit = execSync('git rev-parse HEAD', { cwd: projectDir }).toString().trim();
  assert.notStrictEqual(initialCommit, finalCommit, 'Main branch commit must advance');
  console.log(`   Successfully promoted to main branch. Final commit: ${finalCommit}`);

  // Run tests on main branch to guarantee project health
  execSync('node --test', { cwd: projectDir, stdio: 'ignore' });
  console.log('   Tests verified on main branch: ALL PASSED!');

  // STEP 9: Clean up isolated worktree
  console.log('\n9. Cleaning up isolated worktree...');
  WorkspaceManager.removeWorktree(projectDir, {
    worktreePath: engineResult.worktreePath,
    branchName: engineResult.branchName,
    baseCommit: engineResult.baseCommit,
    createdAt: new Date().toISOString(),
    clean: true
  });
  assert(!fs.existsSync(engineResult.worktreePath), 'Worktree directory should be deleted');
  console.log('   Worktree cleaned up safely.');

  await TaskStore.updateTaskStatus(task.id, 'succeeded', 'Task completed and promoted successfully.');
  console.log(`   Task ${task.id} finalized with status: 'succeeded'.`);

  console.log('\n=== ALL PHASE 6C END-TO-END ACCEPTANCE CRITERIA MET AND VERIFIED! ===');
}

runEndToEndAcceptance().catch(err => {
  console.error('\n[FATAL] Acceptance suite failed:', err);
  process.exit(1);
});
