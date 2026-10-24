import assert from 'node:assert';
import { TaskStateMachine, InvalidStateTransitionError } from '../src/lib/jarvis/state-machine.ts';
import { PermissionPolicyService } from '../src/lib/jarvis/permission-policy.ts';
import { TaskStore } from '../src/lib/jarvis/task-store.ts';

async function runTests() {
  console.log('--- RUNNING JARVIS CORE VALIDATION SUITE ---');

  // Test 1: Task State Machine Transitions
  console.log('Test 1: State Machine Valid Transitions');
  assert.strictEqual(TaskStateMachine.canTransition('queued', 'assigned'), true);
  assert.strictEqual(TaskStateMachine.canTransition('assigned', 'running'), true);
  assert.strictEqual(TaskStateMachine.canTransition('running', 'awaiting_approval'), true);
  assert.strictEqual(TaskStateMachine.canTransition('awaiting_approval', 'running'), true);
  assert.strictEqual(TaskStateMachine.canTransition('running', 'succeeded'), true);

  console.log('Test 2: State Machine Invalid Transitions');
  assert.strictEqual(TaskStateMachine.canTransition('queued', 'succeeded'), false);
  assert.strictEqual(TaskStateMachine.canTransition('succeeded', 'running'), false);
  assert.throws(
    () => TaskStateMachine.validateTransition('queued', 'succeeded'),
    InvalidStateTransitionError
  );

  // Test 3: Permission Policy Service - Level 1 (Read & Analyze)
  console.log('Test 3: Permission Level 1 (Read Only)');
  const scope = { workspaceRoot: 'D:/Danvers/workspaces/test-project', allowedPaths: [] };
  const readCheck = PermissionPolicyService.evaluateAction('read_file', 'D:/Danvers/workspaces/test-project/src/index.ts', scope);
  assert.strictEqual(readCheck.allowed, true);
  assert.strictEqual(readCheck.requiresApproval, false);
  assert.strictEqual(readCheck.level, 1);

  // Test 4: Permission Policy Service - Level 2 (Controlled Write in Workspace)
  console.log('Test 4: Permission Level 2 (Controlled Write)');
  const writeCheck = PermissionPolicyService.evaluateAction('write_file', 'D:/Danvers/workspaces/test-project/src/index.ts', scope);
  assert.strictEqual(writeCheck.allowed, true);
  assert.strictEqual(writeCheck.requiresApproval, false);
  assert.strictEqual(writeCheck.level, 2);

  // Test 5: Sandbox Violation / Path Traversal Rejection
  console.log('Test 5: Path Traversal Rejection');
  const traversalCheck = PermissionPolicyService.evaluateAction('read_file', 'D:/Danvers/other-private-dir/secret.txt', scope);
  assert.strictEqual(traversalCheck.allowed, false);
  assert.strictEqual(traversalCheck.requiresApproval, false);
  assert.match(traversalCheck.reason || '', /Security violation: Path.*attempts to escape workspace sandbox/);

  // Test 6: Permission Policy Service - Level 3 (Sensitive Actions Require Approval)
  console.log('Test 6: Level 3 Sensitive Actions');
  const deployCheck = PermissionPolicyService.evaluateAction('deploy_production', 'production-cluster', scope);
  assert.strictEqual(deployCheck.allowed, false);
  assert.strictEqual(deployCheck.requiresApproval, true);
  assert.strictEqual(deployCheck.level, 3);

  const deleteCheck = PermissionPolicyService.evaluateAction('delete_file', 'D:/Danvers/workspaces/test-project/src/index.ts', scope);
  assert.strictEqual(deleteCheck.allowed, false);
  assert.strictEqual(deleteCheck.requiresApproval, true);
  assert.strictEqual(deleteCheck.level, 3);

  // Test 7: Task Lifecycle & Approval Workflow in TaskStore
  console.log('Test 7: TaskStore Lifecycle & Approval Flow');
  const task = await TaskStore.createTask({
    title: 'Deploy to Production App',
    type: 'deployment',
    permissionLevel: 3,
    scope,
    maxAttempts: 2
  });

  assert.strictEqual(task.status, 'queued');
  assert.strictEqual(task.logs.length, 1);

  // Assign and Run
  await TaskStore.updateTaskStatus(task.id, 'assigned');
  await TaskStore.updateTaskStatus(task.id, 'running');

  // Trigger Approval Request
  await TaskStore.attachApprovalRequest(task.id, {
    taskId: task.id,
    action: 'deploy_production',
    target: 'production-vps-01',
    description: 'Deploying release v1.0.0 to live production environment'
  });

  const awaitingTask = await TaskStore.getTask(task.id);
  assert.strictEqual(awaitingTask?.status, 'awaiting_approval');
  assert.strictEqual(awaitingTask?.approvalRequest?.status, 'pending');

  // Reject approval
  await TaskStore.resolveApproval(task.id, false, 'SecurityOfficer', 'Rollback plan missing');
  const rejectedTask = await TaskStore.getTask(task.id);
  assert.strictEqual(rejectedTask?.status, 'cancelled');
  assert.strictEqual(rejectedTask?.approvalRequest?.status, 'rejected');

  console.log('--- ALL JARVIS CORE TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
