import assert from 'node:assert';
import path from 'node:path';
import { TaskStore } from '../src/lib/jarvis/task-store';
import { ReadOnlyCodingAgent } from '../src/lib/jarvis/read-only-agent';

async function testLiveAgent() {
  console.log('--- RUNNING LIVE READ-ONLY AGENT INTEGRATION TEST ---');

  const task = await TaskStore.createTask({
    title: 'Analyze codebase for security hardening and rate limiting',
    description: 'Perform read-only review of API routes and suggest security controls',
    type: 'code_read',
    permissionLevel: 1,
    scope: {
      workspaceRoot: path.resolve('.'),
      allowedPaths: [],
      readOnly: true
    },
    maxAttempts: 2
  });

  assert.strictEqual(task.status, 'queued');

  console.log(`Task created: ${task.id}. Invoking ReadOnlyCodingAgent with qwen2.5-coder:3b...`);
  const report = await ReadOnlyCodingAgent.analyze(task, 'qwen2.5-coder:3b');

  console.log('Report received:');
  console.log(`- Model Used: ${report.modelUsed}`);
  console.log(`- Latency: ${report.durationMs}ms`);
  console.log(`- Files Scanned: ${report.structure.length}`);
  console.log(`- Plan lines: ${report.proposedPlan.length}`);

  assert.strictEqual(report.modelUsed, 'qwen2.5-coder:3b');
  assert.strictEqual(report.proposedPlan.length > 0, true);
  assert.strictEqual(report.structure.length > 0, true);

  console.log('--- LIVE READ-ONLY AGENT TEST PASSED SUCCESSFULLY! ---');
}

testLiveAgent().catch(err => {
  console.error('Agent Test Failed:', err);
  process.exit(1);
});
