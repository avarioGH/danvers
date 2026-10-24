import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { TaskStateMachine, InvalidStateTransitionError } from '../src/lib/jarvis/state-machine.js';
import { PermissionPolicyService } from '../src/lib/jarvis/permission-policy.js';
import { TaskStore } from '../src/lib/jarvis/task-store.js';

async function runSecuritySuite() {
  console.log('--- RUNNING DANVERS JARVIS PHASE 2 SECURITY & DATA INTEGRITY SUITE ---');

  const testRoot = path.resolve('D:/Danvers/workspaces/test-sec-project');
  const scope = { workspaceRoot: testRoot, allowedPaths: [] };

  // 1. Task State Machine Comprehensive Validation
  console.log('1. Validating Explicit State Machine Rules...');
  assert.strictEqual(TaskStateMachine.canTransition('queued', 'assigned'), true);
  assert.strictEqual(TaskStateMachine.canTransition('assigned', 'running'), true);
  assert.strictEqual(TaskStateMachine.canTransition('running', 'awaiting_approval'), true);
  assert.strictEqual(TaskStateMachine.canTransition('awaiting_approval', 'running'), true);
  assert.strictEqual(TaskStateMachine.canTransition('running', 'succeeded'), true);

  // Illegal transitions
  assert.strictEqual(TaskStateMachine.canTransition('queued', 'succeeded'), false);
  assert.strictEqual(TaskStateMachine.canTransition('queued', 'awaiting_approval'), false);
  assert.strictEqual(TaskStateMachine.canTransition('succeeded', 'running'), false);
  assert.strictEqual(TaskStateMachine.canTransition('cancelled', 'running'), false);
  assert.throws(
    () => TaskStateMachine.validateTransition('succeeded', 'running'),
    InvalidStateTransitionError
  );

  // 2. Symlink, Traversal and Drive Escape Tests
  console.log('2. Validating Path Traversal and Workspace Boundary Enforcement...');
  const insidePath = path.join(testRoot, 'src', 'index.ts');
  const outsidePath = path.join(testRoot, '..', '..', 'Windows', 'System32', 'cmd.exe');
  const driveEscapePath = 'C:\\Windows\\System32\\cmd.exe';

  const insideCheck = PermissionPolicyService.evaluateAction('read_file', insidePath, scope);
  assert.strictEqual(insideCheck.allowed, true);

  const outsideCheck = PermissionPolicyService.evaluateAction('read_file', outsidePath, scope);
  assert.strictEqual(outsideCheck.allowed, false);
  assert.match(outsideCheck.reason || '', /Security violation: Path.*attempts to escape workspace sandbox/);

  const driveCheck = PermissionPolicyService.evaluateAction('read_file', driveEscapePath, scope);
  assert.strictEqual(driveCheck.allowed, false);
  assert.match(driveCheck.reason || '', /Security violation: Path.*attempts to escape workspace sandbox/);

  // 3. Secret Redaction Pipeline
  console.log('3. Validating Secret Redaction Pipeline...');
  const testLogWithSecret = 'User logged in with key sk-1234567890abcdef12345678 and token Bearer eyJhbGciOiJIUzI1Ni.abc.xyz and password: "SuperSecretPassword123!"';
  const redacted = PermissionPolicyService.redactSecrets(testLogWithSecret);
  assert.strictEqual(redacted.includes('sk-1234567890abcdef12345678'), false);
  assert.strictEqual(redacted.includes('sk-[REDACTED_KEY]'), true);
  assert.strictEqual(redacted.includes('SuperSecretPassword123!'), false);
  assert.strictEqual(redacted.includes('[REDACTED_PASSWORD]'), true);
  assert.strictEqual(redacted.includes('Bearer [REDACTED_JWT]'), true);

  // 4. Durable Persistence Across Re-initialization
  console.log('4. Validating Durable Persistence & Storage Integrity...');
  const taskA = await TaskStore.createTask({
    title: 'Audit DB Migrations',
    type: 'security_audit',
    permissionLevel: 1,
    scope: { workspaceRoot: path.resolve('.'), allowedPaths: [] },
    maxAttempts: 3
  });

  assert.strictEqual(taskA.status, 'queued');
  assert.strictEqual(taskA.id.startsWith('task_'), true);

  // Read back to confirm persisted on disk
  const taskARetrieved = await TaskStore.getTask(taskA.id);
  assert.notStrictEqual(taskARetrieved, null);
  assert.strictEqual(taskARetrieved?.title, 'Audit DB Migrations');

  // Verify file on disk exists
  const dbFile = path.resolve('data/jarvis/tasks.json');
  assert.strictEqual(fs.existsSync(dbFile), true);
  const diskData = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  const foundOnDisk = diskData.some((t) => t.id === taskA.id);
  assert.strictEqual(foundOnDisk, true);

  // 5. Approval Rejection & Resolution Safeguards
  console.log('5. Validating Human Approval Security Rules...');
  // Move task to running
  await TaskStore.updateTaskStatus(taskA.id, 'assigned');
  await TaskStore.updateTaskStatus(taskA.id, 'running');

  // Attach Level 3 sensitive approval
  await TaskStore.attachApprovalRequest(taskA.id, {
    taskId: taskA.id,
    action: 'deploy_production',
    target: 'prod-cluster-01',
    description: 'Deploying release v2.0 to production'
  });

  const pendingTask = await TaskStore.getTask(taskA.id);
  assert.strictEqual(pendingTask?.status, 'awaiting_approval');
  assert.strictEqual(pendingTask?.approvalRequest?.status, 'pending');

  // Cannot transition directly out of awaiting_approval to succeeded
  assert.throws(() => TaskStateMachine.validateTransition('awaiting_approval', 'succeeded'));

  // Reject approval
  await TaskStore.resolveApproval(taskA.id, false, 'SecurityAdmin@danvers.jarvis', 'Missing vulnerability scan');
  const rejectedTask = await TaskStore.getTask(taskA.id);
  assert.strictEqual(rejectedTask?.status, 'cancelled');
  assert.strictEqual(rejectedTask?.approvalRequest?.status, 'rejected');

  // Stale approval attack: Attempting to resolve an already resolved approval request must throw
  await assert.rejects(
    async () => {
      await TaskStore.resolveApproval(taskA.id, true, 'Attacker@danvers.jarvis');
    },
    /is already resolved with status 'rejected'/
  );

  console.log('--- ALL PHASE 2 SECURITY & DATA INTEGRITY TESTS PASSED! ---');
}

runSecuritySuite().catch(err => {
  console.error('Security Suite Failed:', err);
  process.exit(1);
});
