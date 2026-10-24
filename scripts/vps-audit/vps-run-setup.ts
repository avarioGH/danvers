import { Client } from 'ssh2';

const conn = new Client();

const pullAndRun = `
cd /root/danvers
git reset --hard origin/main
git pull origin main
echo "=== EXECUTING SETUP VPS WORKER ENV ==="
npx tsx scripts/setup-vps-worker-env.ts
sleep 4
echo "=== SYSTEMCTL STATUS JARVIS-WORKER ==="
systemctl status jarvis-worker --no-pager
`;

conn.on('ready', () => {
  conn.exec(pullAndRun, (err, stream) => {
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
