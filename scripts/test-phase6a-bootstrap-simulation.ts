import assert from 'node:assert';
import path from 'node:path';
import { WorkerRegistry } from '../src/lib/jarvis/worker-registry';
import { WorkerCrypto } from '../src/lib/jarvis/worker-types';
import { TaskStore } from '../src/lib/jarvis/task-store';

async function runPhase6aSimulationSuite() {
  console.log('--- STARTING PHASE 6A REMOTE WORKER BOOTSTRAP & PROTOCOL TEST SUITE ---');

  // 1. Worker Provisioning with Restricted Capabilities
  console.log('1. Provisioning Dedicated Remote Linux Worker...');
  const { worker, rawToken } = await WorkerRegistry.registerWorker(
    'Remote Ubuntu VPS Node 01',
    ['code_read', 'test_run'], // Has test_run and code_read, but NOT code_edit
    ['D:/Danvers/workspaces/authorized-vps-project']
  );

  assert.strictEqual(worker.status, 'active');
  assert.strictEqual(worker.name, 'Remote Ubuntu VPS Node 01');
  assert.strictEqual(rawToken.startsWith('jwt_wkr_'), true);
  console.log(`   Worker registered: ${worker.id}`);

  // 2. Authenticated Outbound Heartbeat
  console.log('2. Simulating Outbound Heartbeat over TLS...');
  const authed = await WorkerRegistry.authenticateWorker(`Bearer ${rawToken}`);
  assert.notStrictEqual(authed, null);
  assert.strictEqual(authed?.id, worker.id);

  const hb = await WorkerRegistry.recordHeartbeat(worker.id);
  assert.strictEqual(hb.success, true);
  console.log('   Worker heartbeat acknowledged.');

  // 3. Lease Acquisition on Eligible Task
  console.log('3. Testing Task Lease Claim by Remote Worker...');
  const eligibleTask = await TaskStore.createTask({
    title: 'Execute test suite on remote node',
    type: 'test_run',
    permissionLevel: 1,
    scope: { workspaceRoot: 'D:/Danvers/workspaces/authorized-vps-project', allowedPaths: [] },
    maxAttempts: 2
  });

  const claimRes = await WorkerRegistry.claimTaskLease(worker, eligibleTask.id);
  assert.strictEqual(claimRes.task?.status, 'assigned');
  console.log(`   Task ${eligibleTask.id} successfully leased to ${worker.id}.`);

  // 4. Concurrency Protection: Re-claiming leased task fails
  console.log('4. Verifying Concurrency Lock: Re-claim attempt blocked...');
  const secondClaim = await WorkerRegistry.claimTaskLease(worker, eligibleTask.id);
  assert.strictEqual(secondClaim.task, null);
  assert.match(secondClaim.error || '', /Task is in state 'assigned' and cannot be claimed/);
  console.log('   Lock verified: Task cannot be double-assigned.');

  // 5. Capability Gate: Unauthorized task type is rejected
  console.log('5. Verifying Capability Gate for Remote Worker...');
  const unauthorizedTask = await TaskStore.createTask({
    title: 'Edit code (unsupported by this worker)',
    type: 'code_edit',
    permissionLevel: 2,
    scope: { workspaceRoot: 'D:/Danvers/workspaces/authorized-vps-project', allowedPaths: [] },
    maxAttempts: 2
  });

  const claimBlocked = await WorkerRegistry.claimTaskLease(worker, unauthorizedTask.id);
  assert.strictEqual(claimBlocked.task, null);
  assert.match(claimBlocked.error || '', /Worker lacks capability for task type 'code_edit'/);
  console.log('   Capability barrier verified: Worker denied code_edit task.');

  // 6. Clean up lease
  WorkerRegistry.releaseLease(eligibleTask.id, worker.id);

  console.log('--- ALL PHASE 6A REMOTE WORKER SIMULATION TESTS PASSED! ---');
}

runPhase6aSimulationSuite().catch(err => {
  console.error('Phase 6A Simulation Suite Failed:', err);
  process.exit(1);
});
