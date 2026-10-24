import { Client } from 'ssh2';

const conn = new Client();

const buildScript = `
set -e
cd /root/danvers
echo "=== STEP 1: NPM RUN BUILD ON VPS ==="
npm run build
echo "=== STEP 2: PM2 RELOAD DANVERS ==="
pm2 reload danvers
echo "=== STEP 3: PM2 STATUS ==="
pm2 status danvers
`;

conn.on('ready', () => {
  console.log('[SSH] Connected to VPS. Running npm run build and pm2 reload...');
  conn.exec(buildScript, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', (code: number) => {
      console.log(`[SSH] Remote build and reload finished with code ${code}`);
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
