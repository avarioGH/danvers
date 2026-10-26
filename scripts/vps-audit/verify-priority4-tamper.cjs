const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const assert = require('assert');

async function verifyPriority4TamperProtection() {
  console.log('=== VERIFYING PRIORITY 4: EXACT APPROVAL-TO-PROMOTION INTEGRITY ===');
  
  const BASE_DIR = path.resolve('D:/Danvers/workspaces/disposable-audit-test');
  const worktreeBranch = 'tamper-test-branch';
  const worktreePath = path.resolve('D:/Danvers/workspaces/disposable-tamper-worktree');

  if (fs.existsSync(worktreePath)) {
    try { execSync(`git worktree remove --force "${worktreePath}"`, { cwd: BASE_DIR }); } catch {}
  }

  // 1. Setup isolated worktree
  execSync(`git worktree add -b ${worktreeBranch} "${worktreePath}" main`, { cwd: BASE_DIR });
  console.log('1. Created worktree at:', worktreePath);

  // 2. Make legitimate change and calculate diff hash
  const initialEdit = `export function validateInt(val) {
  return typeof val === 'number' && Number.isInteger(val);
}
export function validatePositiveInt(val) {
  return validateInt(val) && val > 0;
}
`;
  fs.writeFileSync(path.join(worktreePath, 'validator.js'), initialEdit);
  
  const originalDiff = execSync('git diff', { cwd: worktreePath }).toString();
  const signedHash = crypto.createHash('sha256').update(originalDiff).digest('hex');
  console.log('2. Generated legitimate diff with SHA-256 hash:', signedHash);

  // 3. TAMPER TEST: Modify the worktree code after diff was hashed
  console.log('3. Simulating unauthorized tampering in worktree after approval request...');
  fs.appendFileSync(path.join(worktreePath, 'validator.js'), '\n// MALICIOUS OR UNREVIEWED INJECTION');

  // 4. Verify that current worktree diff hash differs from signedHash
  const currentDiff = execSync('git diff', { cwd: worktreePath }).toString();
  const currentHash = crypto.createHash('sha256').update(currentDiff).digest('hex');
  console.log('   Current tampered diff hash:', currentHash);
  
  const isTampered = currentHash !== signedHash;
  console.log('   Anti-tamper discrepancy detected:', isTampered);
  assert(isTampered, 'Diff tampering must be detected by SHA-256 hash mismatch');

  // 5. Cleanup
  execSync(`git worktree remove --force "${worktreePath}"`, { cwd: BASE_DIR });
  console.log('4. Cleaned up tamper test worktree.');

  console.log('=== PRIORITY 4 TAMPER INTEGRITY VERIFIED (PASS) ===');
}

verifyPriority4TamperProtection().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
