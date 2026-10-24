#!/usr/bin/env bash
# ==============================================================================
# DANVERS JARVIS — Secure Linux Worker Bootstrap Script (v1.0)
# Target OS: Ubuntu 24.04 / 22.04 LTS
# Role: Creates unprivileged service account, restricts filesystem, installs systemd unit
# NOTE: Review and approve all commands before executing on a real Linux server.
# ==============================================================================

set -euo pipefail

# 1. Environment and Privilege Checks
if [[ $EUID -ne 0 ]]; then
   echo "[ERROR] This bootstrap script must be run as root (or via sudo)." >&2
   exit 1
fi

echo "=== DANVERS JARVIS WORKER BOOTSTRAP ==="

# 2. Check Prerequisites
command -v curl >/dev/null 2>&1 || { echo "[ERROR] curl is required. Install with: apt install -y curl" >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "[ERROR] git is required. Install with: apt install -y git" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "[ERROR] Node.js is required (v20+ or v22+). Install via NodeSource." >&2; exit 1; }

NODE_VER=$(node -v | tr -d 'v' | cut -d. -f1)
if [[ "$NODE_VER" -lt 20 ]]; then
  echo "[ERROR] Node.js version must be 20 or higher. Found: $(node -v)" >&2
  exit 1
fi
echo "[OK] Node.js $(node -v) detected."

# 3. Create Dedicated Unprivileged System Account
WORKER_USER="jarvis-worker"
WORKER_GROUP="jarvis-worker"

if ! id "$WORKER_USER" >/dev/null 2>&1; then
  echo "[INFO] Creating system user '$WORKER_USER'..."
  groupadd --system "$WORKER_GROUP"
  useradd --system --gid "$WORKER_GROUP" --shell /usr/sbin/nologin --home-dir /var/lib/jarvis-worker --no-create-home "$WORKER_USER"
  echo "[OK] User '$WORKER_USER' created."
else
  echo "[OK] User '$WORKER_USER' already exists."
fi

# 4. Create Restricted Filesystem Layout
INSTALL_DIR="/opt/jarvis-worker"
CONFIG_DIR="/etc/jarvis-worker"
DATA_DIR="/var/lib/jarvis-worker"
WORKSPACES_DIR="/var/lib/jarvis-worker/workspaces"
LOG_DIR="/var/log/jarvis-worker"

echo "[INFO] Setting up restricted directories..."
mkdir -p "$INSTALL_DIR/bin"
mkdir -p "$CONFIG_DIR"
mkdir -p "$WORKSPACES_DIR"
mkdir -p "$LOG_DIR"

chown -R root:root "$INSTALL_DIR"
chmod 0755 "$INSTALL_DIR"

chown -R "$WORKER_USER:$WORKER_GROUP" "$CONFIG_DIR"
chmod 0700 "$CONFIG_DIR"

chown -R "$WORKER_USER:$WORKER_GROUP" "$DATA_DIR"
chmod 0700 "$DATA_DIR"

chown -R "$WORKER_USER:$WORKER_GROUP" "$LOG_DIR"
chmod 0700 "$LOG_DIR"

# 5. Copy Daemon Implementation
cp "$(dirname "$0")/daemon.mjs" "$INSTALL_DIR/bin/daemon.mjs"
chmod 0755 "$INSTALL_DIR/bin/daemon.mjs"

# 6. Template Configuration File (chmod 0400)
ENV_FILE="$CONFIG_DIR/worker.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[INFO] Creating placeholder config at '$ENV_FILE'..."
  cat <<'EOF' > "$ENV_FILE"
# ==============================================================================
# DANVERS JARVIS — Remote Worker Environment Secrets
# File Permissions: chmod 0400 jarvis-worker:jarvis-worker
# ==============================================================================
JARVIS_CONTROL_URL="https://your-control-plane-host:3000"
JARVIS_WORKER_ID="wkr_placeholder_id"
JARVIS_WORKER_TOKEN="jwt_wkr_placeholder_secret_token"
POLL_INTERVAL_MS="5000"
HEARTBEAT_INTERVAL_MS="30000"
WORKSPACES_DIR="/var/lib/jarvis-worker/workspaces"
EOF
  chown "$WORKER_USER:$WORKER_GROUP" "$ENV_FILE"
  chmod 0400 "$ENV_FILE"
  echo "[NOTICE] Edit '$ENV_FILE' and supply the control URL, worker ID, and token generated from the dashboard."
fi

# 7. Install and Register systemd Service Unit
SERVICE_FILE="/etc/systemd/system/jarvis-worker.service"
echo "[INFO] Installing systemd unit: $SERVICE_FILE..."
cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Danvers Jarvis Remote Linux Execution Worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${WORKER_USER}
Group=${WORKER_GROUP}
WorkingDirectory=${DATA_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=$(command -v node) ${INSTALL_DIR}/bin/daemon.mjs
Restart=on-failure
RestartSec=10s

# Security Hardening Directives
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
ReadWritePaths=${DATA_DIR} ${LOG_DIR}
PrivateTmp=true
CapabilityBoundingSet=

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo "[OK] Systemd unit installed."
echo "=== BOOTSTRAP COMPLETE ==="
echo "To start the worker: systemctl enable --now jarvis-worker"
echo "To check status:     systemctl status jarvis-worker"
