# DANVERS JARVIS — Remote Linux Worker Deployment Contract & Bootstrap Specification

## 1. System Architecture & Topology

```
+---------------------------------------------------------------------------------------+
|                              CONTROL PLANE (Next.js 16)                               |
|                Private Overlay Network (Tailscale IP: 100.x.y.z:3000)                 |
|                                                                                       |
|  - Worker Registry & Token Validator (Constant-time token authentication)             |
|  - Atomic Task Lease Manager (90s TTL, heartbeat renewals)                            |
|  - Artifact Manifest & Diff Hash Validator (SHA-256 canonical manifests)             |
|  - Cryptographic Append-Only Audit Chain (audit_log.json)                             |
|  - Human Approval Gateway (Mandatory review before code promotion)                   |
+---------------------------------------------------------------------------------------+
                                        ^
                                        | Outbound HTTPS Polling over Private Network
                                        | (Zero inbound open ports on Linux VPS)
                                        v
+---------------------------------------------------------------------------------------+
|                                REMOTE LINUX VPS WORKER                                |
|                              (Ubuntu 24.04 LTS x86_64)                                |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  | HOST OS LAYER (Managed by systemd: jarvis-worker.service)                       |  |
|  | - Dedicated unprivileged user: 'jarvis-worker' (UID/GID 1500:1500)             |  |
|  | - Restricted directories: /opt/jarvis-worker/, /var/lib/jarvis-worker/workspaces|  |
|  | - Outbound polling client: node daemon.mjs                                      |  |
|  | - Read-only secrets: /etc/jarvis-worker/worker.env (chmod 0400)                  |  |
|  | - No production credentials, no private SSH keys, no Docker socket shared       |  |
|  +---------------------------------------------------------------------------------+  |
|                                        |                                              |
|                                        v Launches Disposable Task Container           |
|  +---------------------------------------------------------------------------------+  |
|  | HARDENED DISPOSABLE TASK CONTAINER (Docker engine / rootless podman)             |  |
|  | - Non-root user inside container (UID 10001)                                    |  |
|  | - Read-only root filesystem (--read-only)                                        |  |
|  | - Explicitly scoped tmpfs mounts (/tmp, /run: size=64m)                         |  |
|  | - Writable mount: ONLY the isolated task worktree (/workspace)                   |  |
|  | - Resource caps: --cpus=2 --memory=2g --pids-limit=64 --ulimit nofile=1024       |  |
|  | - Security flags: --cap-drop=ALL --security-opt=no-new-privileges:true          |  |
|  | - Default-deny network egress: --network=none (for untrusted test/build jobs)    |  |
|  | - Dropped metadata access: Blocked 169.254.169.254 (Cloud metadata service)      |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

## 2. Minimum Supported Linux Environment Contract
* **Operating System**: Ubuntu 24.04 LTS (Noble Numbat) or Ubuntu 22.04 LTS, x86_64 / arm64.
* **Kernel**: Linux 6.8+ (supports modern cgroups v2, AppArmor 4, rootless containers).
* **System Packages**:
  * `curl`, `ca-certificates`, `git` (2.40+), `systemd`.
  * Node.js runtime: v22.x or v24.x LTS (pinned from official NodeSource).
  * Container Runtime: Docker Engine (Community Edition) 26.0+ or Podman 4.9+.

---

## 3. Host Hardening & Filesystem Layout
* **Service Account**: `jarvis-worker` (System user, no login shell `/usr/sbin/nologin`, no sudo rights).
* **Directory Structure**:
  * `/opt/jarvis-worker/bin/` — Read-only daemon code and dependencies (`chmod 0755 root:root`).
  * `/etc/jarvis-worker/` — Secure configuration directory (`chmod 0700 jarvis-worker:jarvis-worker`).
  * `/etc/jarvis-worker/worker.env` — Worker ID, token, control URL (`chmod 0400 jarvis-worker:jarvis-worker`).
  * `/var/lib/jarvis-worker/workspaces/` — Disposable task worktrees (`chmod 0700 jarvis-worker:jarvis-worker`).
  * `/var/log/jarvis-worker/` — Structured execution logs (`chmod 0700 jarvis-worker:jarvis-worker`).

---

## 4. Firewall & Network Architecture
* **Policy**: Default-Deny Incoming (`ufw default deny incoming; ufw default allow outgoing`).
* **Open Ports**: **Zero incoming ports** required for Jarvis operation.
* **SSH Access**: Restricted to authorized administrative keys; password authentication disabled (`PasswordAuthentication no`).
* **Control-Plane Network Recommendation**:
  * **Option A (Recommended)**: **Tailscale Private Mesh**. The control plane (Windows PC) and VPS join the same private tailnet. Traffic is end-to-end encrypted with WireGuard; no public DNS or public IPs exposed.
  * **Option B**: Public HTTPS with mTLS / reverse proxy (Cloudflare Access / Caddy with strict rate limiting).

---

## 5. Disposable Container Hardening Profile

When running untrusted coding tasks, the worker executes tests inside an ephemeral Docker container:
```bash
docker run --rm \
  --name "jarvis-task-${TASK_ID}" \
  --user 10001:10001 \
  --read-only \
  --network none \
  --cpus 2.0 \
  --memory 2048m \
  --pids-limit 64 \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --tmpfs /run:rw,noexec,nosuid,size=16m \
  -v "/var/lib/jarvis-worker/workspaces/task-${TASK_ID}:/workspace:rw" \
  -w /workspace \
  jarvis-sandbox:node22 \
  npm test
```

### Residual Risks & Mitigations
* **Kernel Exploits**: Containers share the host kernel. *Mitigation*: Dropped capabilities (`--cap-drop=ALL`), `no-new-privileges`, updated Ubuntu LTS kernel.
* **Disk Exhaustion**: Attacker script writes infinite data to `/workspace`. *Mitigation*: Task workspace mounted on a size-limited loopback filesystem or quota.
* **Metadata Attacks**: Attacker probes cloud metadata IP (`169.254.169.254`). *Mitigation*: `--network none` enforces zero network access; host firewall blocks link-local addresses.
