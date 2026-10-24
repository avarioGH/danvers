import { Client } from 'ssh2';

const conn = new Client();

const testAuthScript = `
cd /root/danvers
npx tsx -e "
import { WorkerRegistry } from './src/lib/jarvis/worker-registry';
import fs from 'fs';
(async () => {
  const env = fs.readFileSync('/etc/jarvis-worker/worker.env', 'utf-8');
  const token = env.match(/JARVIS_WORKER_TOKEN=\\\"(.*)\\\"/)[1];
  console.log('Token length:', token.length);
  const auth = await WorkerRegistry.authenticateWorker('Bearer ' + token);
  console.log('Direct WorkerRegistry.authenticateWorker result:', auth ? auth.id : 'FAILED');
})();
"
`;

conn.on('ready', () => {
  conn.exec(testAuthScript, (err, stream) => {
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
