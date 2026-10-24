# DANVERS JARVIS — Always-On Control Plane Architecture & Topology

## 1. The Offline-PC Reality Check

### Critical Availability Fact:
If the central Next.js / Jarvis control plane runs **only on the Windows PC**:
1. When the Windows PC is asleep or powered off, **the control plane is offline**.
2. A remote Linux VPS worker cannot fetch tasks, report logs, extend leases, or communicate with the control plane while the PC is offline.
3. Your mobile phone cannot connect to the dashboard if the host running Next.js is turned off.

> [!IMPORTANT]
> **Tailscale is an encrypted private overlay network, NOT a compute host.** 
> Tailscale enables secure routing between your phone, PC, and VPS without public open ports, but if the machine hosting the control-plane web app is powered off, packets to that machine cannot be answered.

---

## 2. Architectural Deployment Options Compared

| Attribute | Option A: Windows PC Only | Option B: Low-Cost Always-On VPS (Recommended) | Option C: Hybrid Edge / Serverless |
|---|---|---|---|
| **Control Plane Location** | Windows 11 PC (Host) | Cloud VPS (e.g., Hetzner CX22 / DigitalOcean Droplet, ~$4/mo) | Vercel / Railway + Supabase |
| **Availability** | Available ONLY when PC is on | **24/7 Always-On** | 24/7 Always-On |
| **Mobile Access from Phone** | Works only when PC is awake | **Works anytime from anywhere** | Works anytime from anywhere |
| **Remote Worker Independence** | Worker halts when PC sleeps | **Worker executes tasks 24/7** | Worker executes tasks 24/7 |
| **Local Windows PC Role** | Single monolithic controller | Registered as a **Local PC Worker** node | Registered as a Local PC Worker |
| **Monthly Cost** | $0 | ~$4–$6 / month | $0–$10 / month |
| **Security Surface** | Confined to local LAN / Tailnet | Hardened Linux host on private Tailnet | Multi-tenant cloud |

---

## 3. Recommended Architecture: Option B (Always-On Control Plane + Local & VPS Workers)

```
                         +-----------------------------+
                         |      Operator's Phone       |
                         |  (Authenticated Tailnet)    |
                         +--------------+--------------+
                                        |
                            HTTPS / Private Tailnet IP
                                        |
                                        v
+---------------------------------------------------------------------------------------+
|                    ALWAYS-ON CENTRAL CONTROL PLANE (Small Linux VPS)                  |
|                 Hetzner / DO (~$4/mo) - Tailscale Node: 100.x.y.z                     |
|                                                                                       |
|  - Next.js 16 Web Dashboard & API Core                                                |
|  - PostgreSQL / Supabase durable task queue & state machine                           |
|  - Worker Registry & Token Validator (Constant-time token checks)                     |
|  - Human Approval Gateway (Cryptographic Artifact Manifest verification)              |
|  - Append-only cryptographic audit chain (SHA-256 hash chaining)                      |
+---------------------------------------------------------------------------------------+
                ^                                                       ^
                | Outbound Polling / Heartbeat                           | Outbound Polling
                v                                                       v
+-----------------------------------------------+   +-----------------------------------+
|            REMOTE LINUX WORKER                |   |          LOCAL PC WORKER          |
|      (Same VPS or Dedicated Heavy VPS)        |   |         (Windows 11 PC)           |
|                                               |   |                                   |
| - Unprivileged service account                |   | - Primary dev machine (GTX 1650)  |
| - Hardened disposable container sandbox       |   | - Local Ollama model acceleration |
| - Runs tests / builds when PC is off          |   | - Active when PC is turned on     |
| - Zero inbound open ports                     |   | - Controlled worktrees            |
+-----------------------------------------------+   +-----------------------------------+
```

---

## 4. Firewall & Anti-Lockout Security Procedure for VPS Setup

### Step-by-Step Safe UFW Hardening
To guarantee an administrator is **never accidentally locked out** of the Linux VPS:

1. **Inspect Active SSH Port**:
   ```bash
   ss -tlpn | grep ssh
   # Confirm whether SSH is on port 22 or a custom port
   ```
2. **Explicitly Whitelist SSH First**:
   ```bash
   ufw allow 22/tcp comment 'SSH Administrative Access'
   ```
3. **If using Tailscale Overlay**:
   ```bash
   ufw allow in on tailscale0 comment 'Allow private Tailscale mesh traffic'
   ```
4. **Enforce Default-Deny Incoming Policy**:
   ```bash
   ufw default deny incoming
   ufw default allow outgoing
   ```
5. **Dry-Run & Enable**:
   ```bash
   ufw enable
   ufw status verbose
   ```
6. **Verify Before Terminating Session**:
   * **Keep your existing SSH session open.**
   * Open a **second terminal window** and verify you can successfully establish a new SSH connection.
   * If failed: Run `ufw disable` from the first window immediately.
