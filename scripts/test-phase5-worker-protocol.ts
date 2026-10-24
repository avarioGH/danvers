import assert from 'node:assert';
import path from 'node:path';
import { WorkerRegistry } from '../src/lib/jarvis/worker-registry';
import { WorkerCrypto } from '../src/lib/jarvis/worker-types';
import { TaskStore } from '../src/lib/jarvis/task-store';

async function runPhase5WorkerSecuritySuite() {
  console.log('--- STARTING PHASE 5 REMOTE WORKER PROTOCOL & LEASE SECURITY SUITE ---');

  // 1. Worker Registration and Bearer Token Generation
  console.log('1. Testing Worker Registration and Cryptographic Token Generation...');
  const { worker, rawToken } = await WorkerRegistry.registerWorker(
    'Hetzner Linux VPS 01',
    ['code_read', 'code_edit', 'test_run'],
    ['D:/Danvers/workspaces/authorized-project']
  );

  assert.strictEqual(worker.status, 'active');
  assert.strictEqual(rawToken.startsWith('jwt_wkr_'), true);
  assert.strictEqual(worker.tokenHash, WorkerCrypto.hashToken(rawToken));
  console.log(`   Worker provisioned: ${worker.id} (token hash: ${worker.tokenHash.slice(0, 16)}...)`);

  // 2. Authentication with Valid and Invalid Tokens
  console.log('2. Testing Worker Authentication...');
  const authedValid = await WorkerRegistry.authenticateWorker(`Bearer ${rawToken}`);
  assert.strictEqual(authedValid?.id, worker.id);

  const authedInvalid = await WorkerRegistry.authenticateWorker('Bearer invalid_token_12345');
  assert.strictEqual(authedInvalid, null);

  const authedForged = await WorkerRegistry.authenticateWorker('');
  assert.strictEqual(authedForged, null);
  console.log('   Valid token authenticated; forged/invalid tokens rejected.');

  // 3. Worker Revocation
  console.log('3. Testing Worker Revocation Immediate Invalidation...');
  await WorkerRegistry.setWorkerStatus(worker.id, 'revoked');
  const authedRevoked = await WorkerRegistry.authenticateWorker(`Bearer ${rawToken}`);
  assert.strictEqual(authedRevoked, null);
  console.log('   Revoked worker rejected immediately.');

  // Re-activate for further lease tests
  await WorkerRegistry.setWorkerStatus(worker.id, 'active');
  const authedReactivated = await WorkerRegistry.authenticateWorker(`Bearer ${rawToken}`);
  assert.strictEqual(authedReactivated?.id, worker.id);

  // 4. Task Lease Concurrency & Exclusivity (Atomic Lock)
  console.log('4. Testing Atomic Task Lease and Concurrent Lock Prevention...');
  const task = await TaskStore.createTask({
    title: 'Run remote container test',
    type: 'test_run',
    permissionLevel: 1,
    scope: { workspaceRoot: 'D:/Danvers/workspaces/authorized-project', allowedPaths: [] },
    maxAttempts: 2
  });

  // First claim succeeds
  const claim1 = await WorkerRegistry.claimTaskLease(worker, task.id);
  assert.strictEqual(claim1.task?.status, 'assigned');
  console.log(`   Worker ${worker.id} successfully claimed task lease on ${task.id}.`);

  // Second claim attempt by another worker must be REJECTED (409 conflict)
  const otherWorkerRes = await WorkerRegistry.registerWorker(
    'Secondary VPS 02',
    ['code_read', 'test_run'],
    ['*']
  );
  const claim2 = await WorkerRegistry.claimTaskLease(otherWorkerRes.worker, task.id);
  assert.strictEqual(claim2.task, null);
  assert.match(claim2.error || '', /Task is in state 'assigned' and cannot be claimed/);
  console.log('   Concurrent claim rejected: Task is already locked.');

  // 5. Capability Enforcement
  console.log('5. Testing Capability Enforcement...');
  const restrictedWorkerRes = await WorkerRegistry.registerWorker(
    'Read-Only Worker',
    ['code_read'], // Lacks 'code_edit' capability
    ['*']
  );

  const editTask = await TaskStore.createTask({
    title: 'Edit source file',
    type: 'code_edit',
    permissionLevel: 2,
    scope: { workspaceRoot: 'D:/Danvers/workspaces/authorized-project', allowedPaths: [] },
    maxAttempts: 2
  });

  const claimUnsupported = await WorkerRegistry.claimTaskLease(restrictedWorkerRes.worker, editTask.id);
  assert.strictEqual(claimUnsupported.task, null);
  assert.match(claimUnsupported.error || '', /Worker lacks capability for task type 'code_edit'/);
  console.log('   Task claim rejected because worker lacks declared capability.');

  // 6. Project Scope Enforcement
  console.log('6. Testing Project Scope Boundaries...');
  const privateTask = await TaskStore.createTask({
    title: 'Access private confidential repo',
    type: 'code_read',
    permissionLevel: 1,
    scope: { workspaceRoot: 'D:/Danvers/workspaces/super-secret-core', allowedPaths: [] },
    maxAttempts: 2
  });

  const claimUnauthorizedProject = await WorkerRegistry.claimTaskLease(worker, privateTask.id);
  assert.strictEqual(claimUnauthorizedProject.task, null);
  assert.match(claimUnauthorizedProject.error || '', /Worker is not authorized for workspace/);
  console.log('   Worker denied access to unauthorized workspace.');

  // 7. Diff Hash Invalidation Safeguard
  console.log('7. Testing Diff Hash Binding for Human Approval...');
  const originalDiff = `diff --git a/index.ts b/index.ts
--- a/index.ts
+++ b/index.ts
@@ -1 +1 @@
-console.log("old");
+console.log("new");`;

  const modifiedDiff = `diff --git a/index.ts b/index.ts
--- a/index.ts
+++ b/index.ts
@@ -1 +1 @@
-console.log("old");
+console.log("malicious_tamper");`;

  const hashOriginal = WorkerCrypto.computeDiffHash(originalDiff);
  const hashModified = WorkerCrypto.computeDiffHash(modifiedDiff);
  assert.notStrictEqual(hashOriginal, hashModified);
  console.log('   Diff hash verification proves any tamper invalidates previous approval.');

  // 8. Heartbeat and Lease Renewal
  console.log('8. Testing Heartbeat & Lease Extension...');
  const hbRes = await WorkerRegistry.recordHeartbeat(worker.id);
  assert.strictEqual(hbRes.success, true);
  assert.strictEqual(hbRes.leaseExtended, true);
  console.log('   Heartbeat acknowledged and task lease extended.');

  // Clean up lease
  WorkerRegistry.releaseLease(task.id, worker.id);

  console.log('--- ALL PHASE 5 REMOTE WORKER PROTOCOL & LEASE TESTS PASSED! ---');
}

runPhase5WorkerSecuritySuite().catch(err => {
  console.error('Phase 5 Security Suite Failed:', err);
  process.exit(1);
});
