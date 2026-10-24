import { Client } from 'ssh2';

const conn = new Client();

const registerFreshWorkerScript = `
cd /root/danvers
npx tsx -e "
import { WorkerRegistry } from './src/lib/jarvis/worker-registry';
import fs from 'fs';
(async () => {
  const reg = await WorkerRegistry.registerWorker(
    'vps-production-worker-daemon',
    ['code_read', 'code_edit', 'test_run'],
    ['*']
  );
  console.log('Registered worker ID:', reg.worker.id);

  const envContent = \`JARVIS_CONTROL_URL=\"https://avariodanvers.my.id\"
JARVIS_WORKER_ID=\"\${reg.worker.id}\"
JARVIS_WORKER_TOKEN=\"\${reg.rawToken}\"
POLL_INTERVAL_MS=\"5000\"
HEARTBEAT_INTERVAL_MS=\"30000\"
WORKSPACES_DIR=\"/var/lib/jarvis-worker/workspaces\"
\`;
  fs.writeFileSync('/etc/jarvis-worker/worker.env', envContent, { mode: 0o400 });
  const { execSync } = require('child_process');
  execSync('chown jarvis-worker:jarvis-worker /etc/jarvis-worker/worker.env');
  execSync('systemctl restart jarvis-worker');
  console.log('Worker env updated and systemd service restarted.');
})();
"
sleep 4
systemctl status jarvis-worker --no-pager
`;

conn.on('ready', () => {
  conn.exec(registerFreshWorkerScript, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => process.stdout.write(d.toString()))
      .stderr.on('data', (d: Buffer) => process.stderr.write(d.toString()));
  });
}).connect({
  host: '194.233.85.181',
  port: 22,
  username: 'root',
  password: process.env.VPS_SSH_PASSWORD || 'Avario050306'
});
