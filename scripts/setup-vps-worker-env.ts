import fs from 'fs';
import { execSync } from 'child_process';
import { WorkerRegistry } from './src/lib/jarvis/worker-registry';

async function main() {
  const reg = await WorkerRegistry.registerWorker(
    'vps-production-worker-daemon',
    ['code_read', 'code_edit', 'test_run'],
    ['*']
  );
  console.log('Registered worker ID:', reg.worker.id);

  const envContent = [
    'JARVIS_CONTROL_URL="https://avariodanvers.my.id"',
    `JARVIS_WORKER_ID="${reg.worker.id}"`,
    `JARVIS_WORKER_TOKEN="${reg.rawToken}"`,
    'POLL_INTERVAL_MS="5000"',
    'HEARTBEAT_INTERVAL_MS="30000"',
    'WORKSPACES_DIR="/var/lib/jarvis-worker/workspaces"'
  ].join('\n') + '\n';

  fs.writeFileSync('/etc/jarvis-worker/worker.env', envContent, { mode: 0o400 });
  execSync('chown jarvis-worker:jarvis-worker /etc/jarvis-worker/worker.env');
  execSync('systemctl restart jarvis-worker');
  console.log('Worker env updated and systemd service restarted.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
