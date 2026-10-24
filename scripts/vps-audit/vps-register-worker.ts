import { Client } from 'ssh2';

const conn = new Client();

const registerCmd = `
node -e "
const { WorkerRegistry } = require('./src/lib/jarvis/worker-registry');
(async () => {
  const result = await WorkerRegistry.registerWorker({
    name: 'vps-worker-01',
    capabilities: ['code_read', 'code_edit', 'test_run'],
    allowedProjects: ['*']
  }, 'admin-vps-bootstrap');
  console.log(JSON.stringify(result));
})();
"
`;

conn.on('ready', () => {
  conn.exec(`cd /root/danvers && ${registerCmd}`, (err, stream) => {
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
