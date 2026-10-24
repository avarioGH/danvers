import { Client } from 'ssh2';

const conn = new Client();

const deployWorkerScript = `
set -euo pipefail

echo "=== STEP 1: CREATE SYSTEM USER & GROUP ==="
if ! id "jarvis-worker" >/dev/null 2>&1; then
  groupadd --system jarvis-worker
  useradd --system --gid jarvis-worker --shell /usr/sbin/nologin --home-dir /var/lib/jarvis-worker --no-create-home jarvis-worker
  echo "User jarvis-worker created"
else
  echo "User jarvis-worker already exists"
fi

echo "=== STEP 2: CREATE DIRECTORIES ==="
mkdir -p /opt/jarvis-worker/bin
mkdir -p /etc/jarvis-worker
mkdir -p /var/lib/jarvis-worker/workspaces
mkdir -p /var/log/jarvis-worker

chown -R root:root /opt/jarvis-worker
chmod 0755 /opt/jarvis-worker

chown -R jarvis-worker:jarvis-worker /etc/jarvis-worker
chmod 0700 /etc/jarvis-worker

chown -R jarvis-worker:jarvis-worker /var/lib/jarvis-worker
chmod 0700 /var/lib/jarvis-worker

chown -R jarvis-worker:jarvis-worker /var/log/jarvis-worker
chmod 0700 /var/log/jarvis-worker

echo "=== STEP 3: COPY DAEMON IMPLEMENTATION ==="
cp /root/danvers/scripts/vps-bootstrap/daemon.mjs /opt/jarvis-worker/bin/daemon.mjs
chmod 0755 /opt/jarvis-worker/bin/daemon.mjs

echo "=== STEP 4: REGISTER VPS WORKER IN CONTROL PLANE ==="
cd /root/danvers
REG_OUT=$(npx tsx scripts/register-worker-cli.ts)
echo "$REG_OUT" | head -n 3
WORKER_ID=$(echo "$REG_OUT" | grep -o '"id": "[^"]*"' | head -n 1 | cut -d'"' -f4)
WORKER_TOKEN=$(echo "$REG_OUT" | grep -o '"rawToken": "[^"]*"' | head -n 1 | cut -d'"' -f4)

echo "=== STEP 5: WRITE RESTRICTED /etc/jarvis-worker/worker.env (0400) ==="
cat <<EOF > /etc/jarvis-worker/worker.env
JARVIS_CONTROL_URL="https://avariodanvers.my.id"
JARVIS_WORKER_ID="\${WORKER_ID}"
JARVIS_WORKER_TOKEN="\${WORKER_TOKEN}"
POLL_INTERVAL_MS="5000"
HEARTBEAT_INTERVAL_MS="30000"
WORKSPACES_DIR="/var/lib/jarvis-worker/workspaces"
EOF

chown jarvis-worker:jarvis-worker /etc/jarvis-worker/worker.env
chmod 0400 /etc/jarvis-worker/worker.env

echo "=== STEP 6: INSTALL SYSTEMD SERVICE ==="
cat <<EOF > /etc/systemd/system/jarvis-worker.service
[Unit]
Description=Danvers Jarvis Remote Linux Execution Worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=jarvis-worker
Group=jarvis-worker
WorkingDirectory=/var/lib/jarvis-worker
EnvironmentFile=/etc/jarvis-worker/worker.env
ExecStart=$(command -v node) /opt/jarvis-worker/bin/daemon.mjs
Restart=on-failure
RestartSec=10s

# Hardening Directives
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
ReadWritePaths=/var/lib/jarvis-worker /var/log/jarvis-worker
PrivateTmp=true
CapabilityBoundingSet=

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now jarvis-worker
sleep 3
systemctl status jarvis-worker --no-pager
`;

conn.on('ready', () => {
  conn.exec(deployWorkerScript, (err, stream) => {
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
