import { Client } from 'ssh2';

const conn = new Client();

const debugTokenScript = `
cd /root/danvers
npx tsx -e "
import { WorkerRegistry } from './src/lib/jarvis/worker-registry';
import { WorkerCrypto } from './src/lib/jarvis/worker-types';
import fs from 'fs';
(async () => {
  const env = fs.readFileSync('/etc/jarvis-worker/worker.env', 'utf-8');
  const token = env.match(/JARVIS_WORKER_TOKEN=\\\"(.*)\\\"/)[1];
  const hash = WorkerCrypto.hashToken(token);
  console.log('Computed hash:', hash);

  const workers = JSON.parse(fs.readFileSync('/root/danvers/data/jarvis/workers.json', 'utf-8'));
  console.log('Workers file count:', workers.length);
  const match = workers.find(w => w.tokenHash === hash);
  console.log('Match in file:', match ? match.id : 'NO MATCH');
})();
"
`;

conn.on('ready', () => {
  conn.exec(debugTokenScript, (err, stream) => {
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
