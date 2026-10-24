import { Client } from 'ssh2';

const conn = new Client();

const checkStatusScript = `
echo "=== PM2 STATUS ==="
pm2 jlist 2>/dev/null | node -e "
const d = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
d.forEach(p => console.log(p.name, 'pid:', p.pid, 'status:', p.pm2_env.status, 'mem:', Math.round(p.monit.memory/1024/1024) + 'MB', 'cpu:', p.monit.cpu + '%'));
"

echo "=== GIT COMMIT IN /root/danvers ==="
cd /root/danvers && git log -n 1 --oneline

echo "=== ACTIVE WORKERS IN /root/danvers/data/jarvis/workers.json ==="
cat /root/danvers/data/jarvis/workers.json 2>/dev/null | node -e "
const workers = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
console.log('Total registered workers:', workers.length);
workers.slice(-3).forEach(w => {
  console.log('Worker:', w.id, 'name:', typeof w.name === 'string' ? w.name : JSON.stringify(w.name), 'status:', w.status, 'lastHeartbeat:', w.lastHeartbeat);
});
"
`;

conn.on('ready', () => {
  conn.exec(checkStatusScript, (err, stream) => {
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
