import { Client } from 'ssh2';

const conn = new Client();

const checkScript = `
echo "=== 1. VERIFY USER jarvis-worker ==="
id jarvis-worker 2>/dev/null || echo "User 'jarvis-worker' NOT FOUND"

echo "=== 2. VERIFY SYSTEMD SERVICE jarvis-worker ==="
systemctl status jarvis-worker --no-pager 2>/dev/null || echo "Service 'jarvis-worker' NOT FOUND"

echo "=== 3. VERIFY RUNNING PROCESSES FOR JARVIS WORKER ==="
ps -eo user,pid,%cpu,%mem,rss,comm,args | grep -E "jarvis-worker|daemon.mjs" | grep -v grep || echo "No worker daemon process running"

echo "=== 4. VERIFY /var/lib/jarvis-worker OR /etc/jarvis-worker ==="
ls -la /var/lib/jarvis-worker /etc/jarvis-worker 2>/dev/null || echo "Worker directories not present"

echo "=== 5. CHECK VPS PRODUCTION WORKLOAD BASELINE ==="
free -h
df -h /
pm2 jlist 2>/dev/null | node -e "
const d = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
d.forEach(p => console.log(p.name, 'pid:', p.pid, 'status:', p.pm2_env.status, 'mem:', Math.round(p.monit.memory/1024/1024) + 'MB'));
"
`;

conn.on('ready', () => {
  conn.exec(checkScript, (err, stream) => {
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
