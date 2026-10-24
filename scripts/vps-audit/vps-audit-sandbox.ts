import { Client } from 'ssh2';

const conn = new Client();

const auditSandboxCmd = `
echo "=== 1. SYSTEMD SECURITY AUDIT ==="
systemd-analyze security jarvis-worker.service 2>/dev/null || echo "systemd-analyze not available"

echo -e "\n=== 2. JARVIS-WORKER DAEMON PROCESS & USER ==="
ps -u jarvis-worker -o user,pid,%cpu,%mem,comm,args

echo -e "\n=== 3. ATTEMPT SYNTHETIC CANARY READ OUTSIDE WORKSPACE ==="
# Create a synthetic canary secret file owned by root (chmod 0400)
mkdir -p /opt/canary-secrets
echo "SYNTHETIC_CANARY_SECRET_DO_NOT_EXPOSE" > /opt/canary-secrets/secret.env
chmod 0400 /opt/canary-secrets/secret.env

# Try reading as jarvis-worker
su -s /bin/bash jarvis-worker -c "cat /opt/canary-secrets/secret.env" 2>&1 || echo "Canary read blocked as expected"

echo -e "\n=== 4. ATTEMPT ACCESS TO PRODUCTION ENV FILES ==="
su -s /bin/bash jarvis-worker -c "cat /root/danvers/.env" 2>&1 || echo "Danvers .env blocked as expected"
su -s /bin/bash jarvis-worker -c "cat /root/danvers/.env.local" 2>&1 || echo "Danvers .env.local blocked as expected"
su -s /bin/bash jarvis-worker -c "cat /root/danvers/.env.production" 2>&1 || echo "Danvers .env.production blocked as expected"

echo -e "\n=== 5. ATTEMPT ACCESS TO DOCKER SOCKET ==="
su -s /bin/bash jarvis-worker -c "ls -la /var/run/docker.sock" 2>&1 || echo "Docker socket check finished"

echo -e "\n=== 6. CLEANUP CANARY ==="
rm -rf /opt/canary-secrets
echo "Canary cleaned up"
`;

conn.on('ready', () => {
  conn.exec(auditSandboxCmd, (err, stream) => {
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
