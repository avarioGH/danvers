import { Client } from 'ssh2';

const conn = new Client();

const setupScript = `
set -e
mkdir -p /root/workspaces/disposable-e2e-project
cd /root/workspaces/disposable-e2e-project
if [ ! -d .git ]; then
  git init -b main
  git config user.name "Jarvis QA Worker"
  git config user.email "qa-worker@danvers.jarvis"
fi

cat << 'EOF' > package.json
{
  "name": "disposable-e2e-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
EOF

cat << 'EOF' > validator.js
/**
 * Validates that a value is a strictly positive integer.
 */
export function validatePositiveInt(val) {
  return typeof val === 'number' && Number.isInteger(val) && val > 0;
}
EOF

cat << 'EOF' > test.js
import { test } from 'node:test';
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
EOF

git add .
if ! git diff --cached --quiet; then
  git commit -m "baseline: initialize disposable e2e project"
fi
git log -1 --oneline
pwd
ls -la
`;

conn.on('ready', () => {
  console.log('[SSH] Connected to VPS. Initializing disposable e2e project...');
  conn.exec(setupScript, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', (code: number) => {
      console.log(`[SSH] Remote setup finished with exit code ${code}`);
      conn.end();
    })
    .on('data', (d: Buffer) => process.stdout.write(d.toString()))
    .stderr.on('data', (d: Buffer) => process.stderr.write(d.toString()));
  });
}).connect({
  host: '194.233.85.181',
  port: 22,
  username: 'root',
  password: process.env.VPS_SSH_PASSWORD || 'Avario050306'
});
