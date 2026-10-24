import { Client } from 'ssh2';

const conn = new Client();

const auditCommand = `
cat << 'EOF' | bash
echo "=== [A] HOST IDENTITY ==="
hostname && uname -a && uptime
cat /etc/os-release | grep -E "PRETTY_NAME|VERSION="

echo -e "\n=== [B] CPU & CORES ==="
nproc
grep -m1 "model name" /proc/cpuinfo

echo -e "\n=== [C] RAM & SWAP ==="
free -h
vmstat 1 2 | tail -n 1

echo -e "\n=== [D] DISK USAGE ==="
df -hT / /var /home 2>/dev/null || df -hT
df -i /

echo -e "\n=== [E] TOP 10 RAM CONSUMERS ==="
ps -eo user,pid,%cpu,%mem,rss,comm --sort=-rss | head -n 11

echo -e "\n=== [F] ACTIVE APPLICATION RUNTIMES & DOCKER ==="
if command -v docker >/dev/null 2>&1; then
  docker --version
  docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
  echo ""
  docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
else
  echo "Docker: Not installed"
fi

for svc in nginx apache2 caddy mysql mariadb postgresql redis-server mongod pm2; do
  systemctl is-active --quiet "$svc" 2>/dev/null && echo "Active service: $svc"
done

echo -e "\n=== [G] LISTENING PORTS ==="
ss -tulpn | grep LISTEN | awk '{printf "%-25s %-30s\\n", $5, $7}'

echo -e "\n=== [H] FIREWALL & TAILSCALE ==="
ufw status 2>/dev/null || iptables -L -n -v | head -n 10
ip link show tailscale0 2>/dev/null || echo "Tailscale: Not detected"

echo -e "\n=== [I] RECENT OOM / MEMORY PRESSURE ==="
dmesg -T 2>/dev/null | grep -i -E "oom|out of memory|killed process" | tail -n 10 || echo "No OOM events"
EOF
`;

conn.on('ready', () => {
  console.log('[SSH] Connected successfully. Executing read-only baseline audit...');
  conn.exec(auditCommand, (err, stream) => {
    if (err) {
      console.error('[SSH] Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code: number, signal: string) => {
      console.log(`[SSH] Audit finished with code ${code}`);
      conn.end();
    }).on('data', (data: Buffer) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data: Buffer) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('[SSH] Connection error:', err.message);
}).connect({
  host: '194.233.85.181',
  port: 22,
  username: 'root',
  password: process.env.VPS_SSH_PASSWORD || 'Avario050306',
  readyTimeout: 15000
});
