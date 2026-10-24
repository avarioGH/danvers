# DANVERS JARVIS — Remote Worker Protocol Specification (v1.0)

## 1. Overview & Architectural Principles

The remote worker protocol enables an isolated Linux VPS worker to safely process approved tasks while the primary Windows PC is offline or disconnected, without compromising the security of the host network, primary development environment, or production applications.

```
+-------------------------------------------------------------------------------+
|                       CENTRAL JARVIS CONTROL PLANE                            |
|             (Next.js 16 Backend / API Routes / Task Store)                    |
|                                                                               |
|  - Worker Registry & Token Validator                                          |
|  - Atomic Task Lease Manager (TTL locks, lease renewals)                      |
|  - Strict Capability & Project Scope Policy Engine                            |
|  - Human Approval Gateway (Diff Hash & Commit Bound)                          |
+-------------------------------------------------------------------------------+
                                    ^
                                    | Outbound HTTPS Polling / mTLS
                                    | (No inbound open ports on VPS)
                                    v
+-------------------------------------------------------------------------------+
|                        REMOTE LINUX VPS WORKER NODE                           |
|                                                                               |
|  1. Worker Daemon (Node.js runtime, non-root user 'jarvis-worker')            |
|  2. Registration & Ephemeral Auth Token (Rotated / Revocable)                 |
|  3. Heartbeat Sender (30s interval; leases expire at 90s)                     |
|  4. Sandboxed Task Executor (Isolated Container / Non-root Sandbox)           |
|  5. Worktree Manager (Clean clone from authorized remote repo)                |
|  6. Diff & Artifact Packager (Diff hash verification)                         |
+-------------------------------------------------------------------------------+
```

---

## 2. Transport Architecture: Outbound Polling vs WebSocket

### Decision: Outbound Polling over TLS 1.3 (with Long-Polling support)
* **Rationale**:
  1. **Zero Inbound Attack Surface**: The VPS opens **no inbound ports** (no open port 22, 80, 443, or 3000 to the public internet). All connections originate outbound from the VPS to the central control plane.
  2. **NAT & Firewall Friendly**: Works behind strict egress-only firewalls or private overlays (Tailscale / WireGuard).
  3. **Resilience & State Recovery**: If the connection drops, simple HTTP retry semantics with lease renewal prevent duplicate task execution or split-brain.
  4. **Simplicity & Debuggability**: Avoids WebSocket connection drop reconnection storms and stateful connection pinning across serverless or edge deployments.

---

## 3. Worker Identity, Registration & Revocation Lifecycle

### 3.1 Worker Credentials
Each worker has:
- `workerId`: Unique cryptographic identifier (e.g. `worker_linux_vps_01_a9f8...`).
- `name`: Human-readable description (e.g. `Hetzner Cloud CX22 - Worker 01`).
- `workerTokenHash`: SHA-256 hash of the bearer token issued during provisioning.
- `status`: `'active' | 'suspended' | 'revoked'`.
- `capabilities`: Explicit list of supported task types and runtimes (e.g. `['code_read', 'code_edit', 'test_run']`).
- `allowedProjects`: Explicit list of project IDs the worker is permitted to claim.
- `lastHeartbeat`: ISO timestamp of latest heartbeat.

### 3.2 Registration & Provisioning Flow
1. An administrator manually provisions a worker in the Jarvis Dashboard.
2. The server generates a high-entropy secret token `jwt_wkr_...` (cryptographically random 256 bits).
3. The server stores only the `SHA-256` hash of the token.
4. The worker daemon on the VPS is configured with `JARVIS_CONTROL_URL`, `JARVIS_WORKER_ID`, and `JARVIS_WORKER_TOKEN`.
5. When connecting, the worker presents `Authorization: Bearer <token>`.
6. Immediate revocation: Changing status to `'revoked'` instantly rejects all subsequent calls.

---

## 4. Task Lease Protocol & Concurrency Controls

To prevent race conditions where multiple workers or PC/VPS workers execute the same task simultaneously:

```
                    Task: 'queued'
                          |
                          v
        [Worker calls POST /api/jarvis/workers/claim]
                          |
                          v
                Atomic Lease Check:
          - Task status == 'queued'
          - Worker status == 'active'
          - Worker has capability for task.type
          - Worker is authorized for task.scope.workspaceRoot
                          |
             +------------+------------+
             |                         |
          (Passed)                  (Failed)
             |                         |
             v                         v
     Acquire Lease:               Return 409 / null
     - status -> 'assigned'
     - workerId = claimingWorker
     - leaseExpiresAt = now + 90s
     - taskAttempt += 1
```

### 4.1 Heartbeat & Lease Renewal
* While working on a task, the worker sends a heartbeat every 30 seconds (`POST /api/jarvis/workers/heartbeat`).
* The server extends `leaseExpiresAt = now + 90s`.
* If a worker crashes or drops offline, the lease expires after 90 seconds. The task can then be safely re-queued or marked as orphaned without corrupting workspace files.

---

## 5. Security & Isolation Boundaries

1. **Deny-by-Default Execution**:
   * A worker cannot claim a task outside its `allowedProjects`.
   * An untrusted worker cannot redefine task permission levels (e.g., promote a task from Level 2 to Level 3).
2. **Approval Binding via Diff Hash**:
   * When a worker produces code edits, it computes the SHA-256 hash of the unified diff and the base commit.
   * The human approval request is bound to `(taskId, baseCommit, diffHash)`.
   * If any file in the workspace changes before promotion, the diff hash changes, instantly invalidating the approval.
3. **No Credential Propagation**:
   * The worker never receives Supabase master keys, OpenAI/Gemini admin credentials, or production SSH keys.
   * Project secrets are stripped from task payloads.

---

## 6. Audit Trail & Security Events
The following security-critical actions generate tamper-evident audit records:
* `WORKER_REGISTERED`: New worker credential hash created.
* `WORKER_REVOKED`: Worker immediately blocked.
* `TASK_LEASE_ACQUIRED`: Worker assigned exclusive execution lease.
* `TASK_LEASE_EXPIRED`: Worker failed to heartbeat; lease recovered.
* `APPROVAL_GRANTED` / `APPROVAL_REJECTED`: Authenticated operator action.
* `SECURITY_VIOLATION`: Unauthorized claim attempt, path escape, or malformed payload.
