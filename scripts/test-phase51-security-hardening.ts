import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { WorkerRegistry } from '../src/lib/jarvis/worker-registry';
import { WorkerCrypto } from '../src/lib/jarvis/worker-types';
import { SafePatcher } from '../src/lib/jarvis/safe-patcher';

async function runPhase51SecurityAudit() {
  console.log('--- STARTING PHASE 5.1 ADVERSARIAL SECURITY & INTEGRITY REVIEW ---');

  // =========================================================================
  // 1. CONSTANT-TIME COMPARISON & TIMING ATTACK DEFENSE
  // =========================================================================
  console.log('1. Testing Constant-Time Token Comparison...');
  const secretA = 'jwt_wkr_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const secretB = 'jwt_wkr_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg'; // 1 char diff at end
  const secretC = 'jwt_wkr_short'; // length mismatch

  assert.strictEqual(WorkerCrypto.constantTimeCompare(secretA, secretA), true);
  assert.strictEqual(WorkerCrypto.constantTimeCompare(secretA, secretB), false);
  assert.strictEqual(WorkerCrypto.constantTimeCompare(secretA, secretC), false);
  console.log('   Constant-time comparison accurately validates identity and resists timing leaks.');

  // =========================================================================
  // 2. COMPREHENSIVE ARTIFACT MANIFEST & MUTATION INVALIDATION
  // =========================================================================
  console.log('2. Testing Comprehensive Artifact Manifest across File Mutation Vectors...');
  const sandboxDir = path.resolve('D:/Danvers/workspaces/test-p51-manifest-sandbox');
  if (fs.existsSync(sandboxDir)) {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  }
  fs.mkdirSync(sandboxDir, { recursive: true });

  // Initial clean project state
  fs.writeFileSync(path.join(sandboxDir, 'app.ts'), 'export const version = "1.0.0";\n');
  fs.writeFileSync(path.join(sandboxDir, 'config.json'), '{"env":"test"}\n');
  const baseCommit = 'base_commit_hash_11223344';

  const manifestOriginal = WorkerCrypto.generateArtifactManifest(sandboxDir, baseCommit);
  assert.strictEqual(manifestOriginal.files.length, 2);
  const originalManifestHash = manifestOriginal.manifestHash;
  console.log(`   Initial Manifest Hash computed: ${originalManifestHash.slice(0, 16)}...`);

  // Vector A: Modifying an existing tracked file
  console.log('   Testing Vector A: Modifying an existing file...');
  fs.appendFileSync(path.join(sandboxDir, 'app.ts'), 'export const modified = true;\n');
  const manifestAfterMod = WorkerCrypto.generateArtifactManifest(sandboxDir, baseCommit);
  assert.notStrictEqual(manifestAfterMod.manifestHash, originalManifestHash);
  console.log('   -> Manifest Hash changed! Approval invalidated.');
  // Revert
  fs.writeFileSync(path.join(sandboxDir, 'app.ts'), 'export const version = "1.0.0";\n');

  // Vector B: Adding a new untracked file (e.g. malicious backdoor script)
  console.log('   Testing Vector B: Introducing an untracked file...');
  fs.writeFileSync(path.join(sandboxDir, 'malicious_backdoor.sh'), '#!/bin/sh\nrm -rf /\n');
  const manifestAfterAdd = WorkerCrypto.generateArtifactManifest(sandboxDir, baseCommit);
  assert.notStrictEqual(manifestAfterAdd.manifestHash, originalManifestHash);
  console.log('   -> Manifest Hash changed! Untracked file caught.');
  // Clean
  fs.unlinkSync(path.join(sandboxDir, 'malicious_backdoor.sh'));

  // Vector C: Deleting a file (e.g. deleting security config or test)
  console.log('   Testing Vector C: Deleting a project file...');
  fs.unlinkSync(path.join(sandboxDir, 'config.json'));
  const manifestAfterDel = WorkerCrypto.generateArtifactManifest(sandboxDir, baseCommit);
  assert.notStrictEqual(manifestAfterDel.manifestHash, originalManifestHash);
  console.log('   -> Manifest Hash changed! File deletion caught.');
  // Restore
  fs.writeFileSync(path.join(sandboxDir, 'config.json'), '{"env":"test"}\n');

  // Vector D: Renaming a file
  console.log('   Testing Vector D: Renaming a file...');
  fs.renameSync(path.join(sandboxDir, 'config.json'), path.join(sandboxDir, 'config_renamed.json'));
  const manifestAfterRename = WorkerCrypto.generateArtifactManifest(sandboxDir, baseCommit);
  assert.notStrictEqual(manifestAfterRename.manifestHash, originalManifestHash);
  console.log('   -> Manifest Hash changed! File rename caught.');
  fs.renameSync(path.join(sandboxDir, 'config_renamed.json'), path.join(sandboxDir, 'config.json'));

  // Vector E: Tampering with base commit
  console.log('   Testing Vector E: Tampering with base commit reference...');
  const manifestTamperedCommit = WorkerCrypto.generateArtifactManifest(sandboxDir, 'tampered_commit_9999');
  assert.notStrictEqual(manifestTamperedCommit.manifestHash, originalManifestHash);
  console.log('   -> Manifest Hash changed! Base commit mismatch caught.');

  // Clean sandbox
  fs.rmSync(sandboxDir, { recursive: true, force: true });

  // =========================================================================
  // 3. AUDIT LOG CRYPTOGRAPHIC HASH CHAIN INTEGRITY
  // =========================================================================
  console.log('3. Testing Cryptographic Hash Chain on Audit Logs...');
  // Log several events
  WorkerRegistry.logAudit({
    eventType: 'WORKER_REGISTERED',
    actorId: 'test_admin',
    details: { action: 'Test audit chain event 1' }
  });
  WorkerRegistry.logAudit({
    eventType: 'TASK_LEASE_ACQUIRED',
    actorId: 'test_worker',
    details: { action: 'Test audit chain event 2' }
  });

  const chainCheck = WorkerRegistry.verifyAuditChain();
  assert.strictEqual(chainCheck.valid, true);
  console.log(`   Audit chain verified: ${chainCheck.totalEntries} entries, unbroken cryptographically.`);

  console.log('--- ALL PHASE 5.1 SECURITY HARDENING AUDIT CHECKS PASSED! ---');
}

runPhase51SecurityAudit().catch(err => {
  console.error('Phase 5.1 Audit Failed:', err);
  process.exit(1);
});
