import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import assert from 'assert';

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('DANVERS JARVIS — RIGOROUS VERIFICATION & AUDIT SUITE');
  console.log('================================================================\n');

  const BASE_DIR = path.resolve('D:/Danvers/workspaces/disposable-audit-test');
  
  // 1. Setup disposable repository on Windows PC
  console.log('--- SECTION 1: WINDOWS DISPOSABLE REPOSITORY SETUP ---');
  if (fs.existsSync(BASE_DIR)) {
    fs.rmSync(BASE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BASE_DIR, { recursive: true });

  execSync('git init -b main', { cwd: BASE_DIR });
  execSync('git config user.email "audit@danvers.test"', { cwd: BASE_DIR });
  execSync('git config user.name "Danvers Auditor"', { cwd: BASE_DIR });

  const initialCode = `/**
 * Validator module
 */
export function validateInt(val) {
  return typeof val === 'number' && Number.isInteger(val);
}
`;
  const initialTest = `import test from 'node:test';
import assert from 'node:assert';
import { validateInt } from './validator.js';

test('validates integers', () => {
  assert.strictEqual(validateInt(10), true);
  assert.strictEqual(validateInt(0), true);
  assert.strictEqual(validateInt(-5), true);
  assert.strictEqual(validateInt('10'), false);
});
`;
  const packageJson = `{
  "name": "disposable-audit-test",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "test": "node --test" }
}`;

  fs.writeFileSync(path.join(BASE_DIR, 'validator.js'), initialCode);
  fs.writeFileSync(path.join(BASE_DIR, 'test.js'), initialTest);
  fs.writeFileSync(path.join(BASE_DIR, 'package.json'), packageJson);
  fs.writeFileSync(path.join(BASE_DIR, '.env.secret'), 'SUPER_SECRET_KEY=123456789');

  execSync('git add .', { cwd: BASE_DIR });
  execSync('git commit -m "initial commit"', { cwd: BASE_DIR });
  console.log(`[PASS] Disposable test repo created at ${BASE_DIR}`);

  // Test 1: File reading & exclusion tests
  console.log('\n--- SECTION 2: PATH TRAVERSAL & SECRET EXCLUSION TESTS ---');
  const { GET: filesRoute } = await import('../../src/app/api/jarvis/files/route');
  const { NextRequest } = await import('next/server');

  // Helper for mock request with auth
  const createMockReq = (url: string) => {
    return new NextRequest(url, {
      headers: {
        'x-mock-auth': 'audit@danvers.test'
      }
    });
  };

  // 1a. Traversal test: attempting to read outside workspace root
  console.log('1. Testing path traversal attack (../../windows)...');
  const traversalReq = createMockReq(`http://localhost:3000/api/jarvis/files?root=${encodeURIComponent(BASE_DIR)}&file=${encodeURIComponent('../../../Windows/System32/drivers/etc/hosts')}`);
  const traversalRes = await filesRoute(traversalReq);
  const traversalJson = await traversalRes.json();
  console.log(`   Traversal Response Status: ${traversalRes.status}`, traversalJson);
  assert.strictEqual(traversalRes.status, 403, 'Path traversal must return 403 Forbidden');
  console.log('   [PASS] Path traversal attempt correctly rejected with 403.');

  // 1b. Secret file exclusion test: attempting to read .env
  console.log('2. Testing secret file exclusion (.env.secret)...');
  const secretReq = createMockReq(`http://localhost:3000/api/jarvis/files?root=${encodeURIComponent(BASE_DIR)}&file=.env.secret`);
  const secretRes = await filesRoute(secretReq);
  const secretJson = await secretRes.json();
  console.log(`   Secret File Response Status: ${secretRes.status}`, secretJson);
  assert.strictEqual(secretRes.status, 403, 'Secret file must return 403 Forbidden');
  console.log('   [PASS] Secret file access correctly blocked with 403.');

  // 1c. Valid file read test
  console.log('3. Testing valid file read (validator.js)...');
  const validReq = createMockReq(`http://localhost:3000/api/jarvis/files?root=${encodeURIComponent(BASE_DIR)}&file=validator.js`);
  const validRes = await filesRoute(validReq);
  const validJson = await validRes.json();
  console.log(`   Valid File Response Status: ${validRes.status}, file length: ${validJson.content?.length}`);
  assert.strictEqual(validRes.status, 200);
  assert(validJson.content.includes('validateInt'), 'Returned content must match real file');
  console.log('   [PASS] Valid file returned actual file content.');

  // Test 2: Complete Coding Lifecycle Verification
  console.log('\n--- SECTION 3: CODING LIFECYCLE & APPROVAL GATE VERIFICATION ---');
  const { TaskStore } = await import('../../src/lib/jarvis/task-store');
  const { CodingWorkerEngine } = await import('../../src/lib/jarvis/coding-worker-engine');

  // 2a. Task creation
  console.log('1. Creating disposable coding task...');
  const task = await TaskStore.createTask({
    title: 'Audit Test: Add positive integer validation',
    description: 'Update validator.js to also check that integer is > 0',
    type: 'code_edit',
    permissionLevel: 2,
    maxAttempts: 3,
    scope: {
      workspaceRoot: BASE_DIR,
      allowedPaths: ['validator.js']
    }
  });
  console.log(`   Task created: ${task.id}, status: ${task.status}`);
  assert.strictEqual(task.status, 'queued');

  // 2b. Test Failure Prevention Gate: Submit bad patch that fails tests
  console.log('2. Testing gate: Failure prevention when tests fail...');
  const failingEdit = [{
    relativePath: 'validator.js',
    action: 'modify' as const,
    content: 'export function validateInt(val) { return false; } // Intentionally broken'
  }];
  const failExecution = await CodingWorkerEngine.executeTask(task, failingEdit, {
    executable: 'node',
    args: ['--test']
  });
  console.log(`   Failing Execution Result: success=${failExecution.success}, approvalRequired=${failExecution.approvalRequired}`);
  assert.strictEqual(failExecution.success, false, 'Execution must fail when tests do not pass');
  assert.strictEqual(failExecution.approvalRequired, false, 'No approval request should be created for failing test');
  console.log('   [PASS] Test failure prevented approval request.');

  // 2c. Successful Patch & Diff Verification
  console.log('3. Applying working patch that passes test suite...');
  const workingEdit = [{
    relativePath: 'validator.js',
    action: 'modify' as const,
    content: `export function validateInt(val) {
  return typeof val === 'number' && Number.isInteger(val);
}
export function validatePositiveInt(val) {
  return validateInt(val) && val > 0;
}
`
  }];
  // Update test.js to also test new function
  fs.writeFileSync(path.join(BASE_DIR, 'test.js'), `import test from 'node:test';
import assert from 'node:assert';
import { validateInt, validatePositiveInt } from './validator.js';

test('validates integers', () => {
  assert.strictEqual(validateInt(10), true);
  assert.strictEqual(validatePositiveInt(10), true);
  assert.strictEqual(validatePositiveInt(-5), false);
});
`);
  execSync('git add test.js && git commit -m "update test for positive int"', { cwd: BASE_DIR });

  // Reset task status for re-execution
  await TaskStore.updateTaskStatus(task.id, 'queued');
  const workingExecution = await CodingWorkerEngine.executeTask(task, workingEdit, {
    executable: 'node',
    args: ['--test']
  });
  console.log(`   Working Execution Result: success=${workingExecution.success}, approvalRequired=${workingExecution.approvalRequired}`);
  assert.strictEqual(workingExecution.success, true);
  assert.strictEqual(workingExecution.approvalRequired, true);
  console.log('   Diff generated in worktree:\n' + workingExecution.diff);
  assert(workingExecution.diff.includes('+export function validatePositiveInt'), 'Diff must contain new function');
  console.log('   [PASS] Working patch passed tests and created pending approval gate.');

  // 2d. Rejection test on separate task
  console.log('4. Testing rejection flow...');
  const rejectedTask = await TaskStore.createTask({
    title: 'Audit Test: Rejection flow',
    type: 'code_edit',
    permissionLevel: 2,
    maxAttempts: 3,
    scope: { workspaceRoot: BASE_DIR, allowedPaths: ['validator.js'] }
  });
  await TaskStore.attachApprovalRequest(rejectedTask.id, {
    taskId: rejectedTask.id,
    action: 'promote_code_to_main',
    target: 'Branch audit-test -> Main',
    description: 'To be rejected'
  });
  const afterReject = await TaskStore.resolveApproval(rejectedTask.id, false, 'audit@danvers.test', 'Rejected by operator audit');
  console.log(`   Rejected Task Status: ${afterReject.status}, Approval Status: ${afterReject.approvalRequest?.status}`);
  assert.strictEqual(afterReject.status, 'cancelled');
  assert.strictEqual(afterReject.approvalRequest?.status, 'rejected');
  console.log('   [PASS] Task rejection cancelled task without promotion.');

  // 2e. Approval & Promotion Test
  console.log('5. Testing approval & promotion to main...');
  const afterApproval = await TaskStore.resolveApproval(task.id, true, 'audit@danvers.test');
  console.log(`   Task Status after Approval: ${afterApproval.status}, Approval Status: ${afterApproval.approvalRequest?.status}`);
  assert.strictEqual(afterApproval.status, 'running');
  assert.strictEqual(afterApproval.approvalRequest?.status, 'approved');

  // Promote via git merge
  const worktreePath = workingExecution.worktreePath;
  const branchName = workingExecution.branchName;
  execSync('git add .', { cwd: worktreePath });
  execSync('git commit -m "feat(agent): add validatePositiveInt"', { cwd: worktreePath });
  execSync(`git merge ${branchName} --no-edit`, { cwd: BASE_DIR });
  const finalCommit = execSync('git rev-parse HEAD', { cwd: BASE_DIR }).toString().trim();
  const promotedCode = fs.readFileSync(path.join(BASE_DIR, 'validator.js'), 'utf-8');
  console.log(`   Promoted code on Main commit ${finalCommit}:\n` + promotedCode);
  assert(promotedCode.includes('validatePositiveInt'), 'Target repo main branch must contain promoted changes');
  console.log('   [PASS] Verified changes promoted cleanly to Main branch.');

  // Cleanup worktree
  const { WorkspaceManager } = await import('../../src/lib/jarvis/workspace-manager');
  WorkspaceManager.removeWorktree(BASE_DIR, {
    worktreePath: workingExecution.worktreePath,
    branchName: workingExecution.branchName,
    baseCommit: workingExecution.baseCommit,
    clean: true,
    createdAt: new Date().toISOString()
  });
  console.log('   [PASS] Isolated worktree cleaned up.');

  console.log('\n================================================================');
  console.log('ALL RIGOROUS AUDIT CHECKS PASSED');
  console.log('================================================================');
}

runComprehensiveAudit().catch(err => {
  console.error('\nAUDIT FAILED:', err);
  process.exit(1);
});
