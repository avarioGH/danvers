#!/usr/bin/env bash
# ==============================================================================
# DANVERS JARVIS — Worker Service Uninstall / Rollback Script
# ==============================================================================

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
   echo "[ERROR] This script must be run as root." >&2
   exit 1
fi

echo "=== UNINSTALLING DANVERS JARVIS WORKER ==="

# 1. Stop and disable systemd service
if systemctl is-active --quiet jarvis-worker 2>/dev/null; then
  echo "[INFO] Stopping jarvis-worker service..."
  systemctl stop jarvis-worker
fi

if systemctl is-enabled --quiet jarvis-worker 2>/dev/null; then
  echo "[INFO] Disabling jarvis-worker service..."
  systemctl disable jarvis-worker
fi

rm -f /etc/systemd/system/jarvis-worker.service
systemctl daemon-reload

# 2. Remove application files
echo "[INFO] Removing installed binaries..."
rm -rf /opt/jarvis-worker

# 3. Optional: purge data and secrets (Prompt for safety)
read -p "Do you want to delete worker configuration and workspaces in /etc and /var/lib? (y/N): " -r CONFIRM
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "[INFO] Removing /etc/jarvis-worker and /var/lib/jarvis-worker..."
  rm -rf /etc/jarvis-worker
  rm -rf /var/lib/jarvis-worker
  rm -rf /var/log/jarvis-worker
  userdel jarvis-worker 2>/dev/null || true
  groupdel jarvis-worker 2>/dev/null || true
  echo "[OK] All worker state purged."
else
  echo "[INFO] Preserved /etc/jarvis-worker and workspaces."
fi

echo "=== UNINSTALL COMPLETE ==="
