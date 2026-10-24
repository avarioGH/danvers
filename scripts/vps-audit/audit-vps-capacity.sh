#!/usr/bin/env bash
# ==============================================================================
# DANVERS JARVIS — Phase 6B.0 Read-Only VPS Capacity & Security Audit Script
# Provider: Contabo (4 vCPU, 8 GB RAM target)
# Usage: Run on the target VPS via SSH. Does NOT modify any file, service, or setting.
# Output: Formatted read-only audit report for paste-back.
# ==============================================================================

set -u

echo "=============================================================================="
echo "          DANVERS JARVIS — READ-ONLY VPS CAPACITY & WORKLOAD AUDIT             "
echo "=============================================================================="
echo "Audit Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# ------------------------------------------------------------------------------
# SECTION A: HOST IDENTITY & KERNEL
# ------------------------------------------------------------------------------
echo "--- [A] HOST IDENTITY & ARCHITECTURE ---"
echo "Hostname:         $(hostname 2>/dev/null || cat /etc/hostname)"
echo "Kernel:           $(uname -r)"
echo "Architecture:     $(uname -m)"
echo "Uptime:           $(uptime -p 2>/dev/null || uptime)"
echo "Load Average:     $(uptime | awk -F'load average:' '{ print $2 }' | xargs)"
echo "Timezone:         $(cat /etc/timezone 2>/dev/null || date +"%Z (UTC%z)")"
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo "Distribution:     $PRETTY_NAME"
fi
echo ""

# ------------------------------------------------------------------------------
# SECTION B: CPU & HARDWARE SPECIFICATIONS
# ------------------------------------------------------------------------------
echo "--- [B] CPU & CORES ---"
echo "Logical vCPUs:    $(nproc)"
CPU_MODEL=$(grep -m1 "model name" /proc/cpuinfo | awk -F': ' '{print $2}' || true)
echo "CPU Model:        ${CPU_MODEL:-Unknown}"
grep -m1 "cpu MHz" /proc/cpuinfo || true
echo ""

# ------------------------------------------------------------------------------
# SECTION C: RAM & SWAP UTILIZATION
# ------------------------------------------------------------------------------
echo "--- [C] RAM & SWAP METRICS ---"
free -h
echo ""
echo "Virtual Memory Stats:"
vmstat 1 2 | tail -n 1 | awk '{printf "Run-queue: %s | Blocked IO: %s | Free Mem: %s KB | Buffers: %s KB | Cached: %s KB | Swap-in: %s | Swap-out: %s | User CPU: %s%% | Sys CPU: %s%% | Idle CPU: %s%%\n", $1, $2, $4, $5, $6, $7, $8, $13, $14, $15}'
echo ""

# ------------------------------------------------------------------------------
# SECTION D: FILESYSTEM & STORAGE CAPACITY
# ------------------------------------------------------------------------------
echo "--- [D] DISK CAPACITY & MOUNT POINTS ---"
df -hT / /var /home 2>/dev/null || df -hT
echo ""
echo "Inode Utilization:"
df -i / /var /home 2>/dev/null || df -i
echo ""

# ------------------------------------------------------------------------------
# SECTION E: RUNNING PROCESSES (TOP MEMORY & CPU CONSUMERS)
# ------------------------------------------------------------------------------
echo "--- [E] TOP 10 PROCESSES BY RAM USAGE ---"
ps -eo user,pid,%cpu,%mem,vsz,rss,comm --sort=-%mem | head -n 11
echo ""

echo "--- TOP 10 PROCESSES BY CPU USAGE ---"
ps -eo user,pid,%cpu,%mem,vsz,rss,comm --sort=-%cpu | head -n 11
echo ""

# ------------------------------------------------------------------------------
# SECTION F: RUNNING SERVICES & CONTAINERS
# ------------------------------------------------------------------------------
echo "--- [F] ACTIVE APPLICATION RUNTIMES & DATABASES ---"
# Check Docker
if command -v docker >/dev/null 2>&1; then
  echo "Docker Engine: Installed ($(docker --version 2>/dev/null || true))"
  echo "Active Containers:"
  docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker daemon not running or access restricted."
  echo ""
  echo "Container Resource Utilization (Snapshot):"
  docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || true
else
  echo "Docker Engine: NOT installed"
fi
echo ""

# Check common database and proxy services
echo "Service Status Checks:"
for svc in nginx apache2 caddy mysql mariadb postgresql redis-server mongod pm2; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    echo "  - $svc: ACTIVE (running)"
  fi
done
echo ""

# ------------------------------------------------------------------------------
# SECTION G: NETWORK LISTENERS & PORTS
# ------------------------------------------------------------------------------
echo "--- [G] LISTENING NETWORK PORTS (Process Names Only) ---"
if command -v ss >/dev/null 2>&1; then
  ss -tulpn | grep LISTEN | awk '{printf "%-25s %-30s\n", $5, $7}' || true
elif command -v netstat >/dev/null 2>&1; then
  netstat -tulpn 2>/dev/null | grep LISTEN | awk '{printf "%-25s %-30s\n", $4, $7}' || true
fi
echo ""

# ------------------------------------------------------------------------------
# SECTION H: FIREWALL & TAILSCALE STATUS
# ------------------------------------------------------------------------------
echo "--- [H] FIREWALL & NETWORK POSTURE ---"
if command -v ufw >/dev/null 2>&1; then
  echo "UFW Firewall Status:"
  ufw status 2>/dev/null || echo "UFW present (root required for status)"
fi
echo ""
echo "Tailscale Network Interface:"
if ip link show tailscale0 >/dev/null 2>&1; then
  echo "  - tailscale0 interface: DETECTED (Tailscale active)"
else
  echo "  - tailscale0 interface: NOT FOUND"
fi
echo ""

# ------------------------------------------------------------------------------
# SECTION I: RECENT MEMORY PRESSURE & OOM EVENTS
# ------------------------------------------------------------------------------
echo "--- [I] OOM / MEMORY PRESSURE CHECK (Recent System Logs) ---"
if command -v dmesg >/dev/null 2>&1; then
  dmesg -T 2>/dev/null | grep -i -E "oom|out of memory|killed process" | tail -n 10 || echo "No recent OOM events in dmesg."
else
  echo "dmesg restricted."
fi
echo ""
echo "=============================================================================="
echo "                            END OF AUDIT REPORT                               "
echo "=============================================================================="
