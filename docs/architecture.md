# DANVERS JARVIS — Architecture Specification

## 1. System Overview

Danvers Jarvis is a self-hosted AI engineering and system control platform. It allows the operator to delegate real engineering tasks (code analysis, editing, testing, builds, git ops, deployment, and security auditing) through a unified web dashboard and mobile interface.

```
                      +-----------------------------+
                      |   Mobile & Web Dashboard    |
                      | (Next.js 16 + React 19 + UI)|
                      +--------------+--------------+
                                     |
                             HTTPS / JSON APIs
                                     |
                                     v
                      +-----------------------------+
                      |  Jarvis Orchestration Core   |
                      | - Authentication & RBAC     |
                      | - Task State Machine        |
                      | - 3-Tier Policy Engine      |
                      | - Approval Center Service   |
                      | - Structured Audit Logger   |
                      +--------------+--------------+
                                     |
                   +-----------------+-----------------+
                   |                                   |
                   v                                   v
    +------------------------------+   +-------------------------------+
    |         PC Worker            |   |          VPS Worker           |
    | (Windows 11 Execution Node)  |   |    (Remote Linux Node)        |
    | - Local Repo Sandboxes       |   | - Remote Repo Sandboxes       |
    | - Safe Command Execution     |   | - Task Lease / Heartbeat Sync |
    | - Git Operations & Diffs     |   | - Staging / Production Deploy |
    +--------------+---------------+   +---------------+---------------+
                   |                                   |
                   +-----------------+-----------------+
                                     |
                                     v
                      +-----------------------------+
                      |    Model Provider Gateway   |
                      | - Local: Ollama (Qwen Coder)|
                      | - Cloud: Gemini / OpenAI    |
                      +-----------------------------+
```

## 2. Key Components

### 2.1 Web Dashboard (Next.js 16 App Router)
- Built on Next.js 16, React 19, Tailwind CSS, Lucide icons.
- Provides 15 operational pages:
  1. Overview / Command Center
  2. AI Chat
  3. Projects and Repositories
  4. Tasks and Execution Queue
  5. Agent Sessions
  6. Code Changes and Diff Viewer
  7. Terminal Sessions (Restricted & Approved)
  8. VPS and Infrastructure
  9. Deployment Center
  10. Security and Malware Scans
  11. File Audit and Cleanup
  12. Approval Center
  13. Logs and Audit History
  14. Model and Provider Settings
  15. System Settings

### 2.2 Backend & Orchestration Core
- Decoupled service layer located at `src/lib/jarvis/`.
- Exposed via Next.js Route Handlers (`src/app/api/jarvis/...`).
- **Database & State Store**: Supabase / PostgreSQL. Reuses existing authenticated PostgreSQL infrastructure via Supabase client, maintaining durable task records, attempts, approvals, and audit events.
- **Task Lifecycle**:
  `queued` -> `assigned` -> `running` -> `awaiting_approval` -> `succeeded` / `failed` / `cancelled`.

### 2.3 Worker Nodes
- **PC Worker (Windows 11)**: Primary development worker. Runs approved commands within whitelisted workspace roots (e.g. `D:\Danvers\workspaces\...`). Enforces strict argument parsing (no arbitrary shell injection).
- **VPS Worker (Remote Linux)**: Secondary background worker for staging, remote builds, and offline jobs. Uses mutual authentication and task lease locks to prevent split-brain execution.

### 2.4 Model Provider Gateway
- Unified interface for local and cloud models.
- **Local Model**: Ollama daemon at `http://127.0.0.1:11434`.
  - Primary lightweight: `qwen2.5-coder:3b` (fast GPU inference within 4 GB VRAM).
  - Heavyweight fallback: `qwen3-coder:latest` (CPU/RAM MoE offloading).
- **Cloud Models**: Google Gemini (`@google/generative-ai`), OpenAI (`openai`).
- Strict routing policy: Never send private workspace code to cloud providers without explicit configuration.

### 2.5 Coding Agent Adapter
- Pluggable agent loop:
  1. Read workspace structure & context.
  2. Generate diff / edit plan.
  3. Verify against permission boundary.
  4. If Level 3 required -> Transition task to `awaiting_approval`.
  5. Apply verified edits -> Run tests / lint.
  6. Return structured diff & status summary.
