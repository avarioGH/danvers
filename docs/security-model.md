# DANVERS JARVIS — Security Model & Autonomy Specification

## 1. Core Principles

1. **Least Privilege**: Workers and models operate strictly within declared project boundaries.
2. **Untrusted LLM Output**: LLM responses are treated as non-authoritative proposals. No action is performed simply because an LLM emitted it.
3. **No Unauthenticated Execution**: All API endpoints and commands require authenticated sessions with verified roles.
4. **Zero Ambient Shell Access**: Arbitrary shell string concatenation is strictly prohibited. Process execution uses verified, whitelisted command arguments.
5. **Tamper-Evident Audit Trail**: Every sensitive check, transition, approval, and execution log is stored immutably.

## 2. Three-Level Permission Framework

| Level | Classification | Scope & Policy | Examples |
|---|---|---|---|
| **Level 1** | **Read & Analyze** | Allowed automatically within designated workspace. | Read source code, examine git status/diff, parse log files, run static AST analysis. |
| **Level 2** | **Controlled Execution** | Allowed within configured project workspace limits. | Edit files in workspace, install declared npm dependencies, run `npm test` or `npm run build`, create git branches. |
| **Level 3** | **Sensitive Actions** | **Requires Explicit Human Approval via Approval Center.** | Production deployments, deleting files/directories, running destructive DB migrations, modifying server firewall/network rules, administrator commands, force-pushing git branches. |

## 3. Human-In-The-Loop Approval Protocol

When an action crosses into Level 3:
1. The Task State Machine halts execution and enters `awaiting_approval`.
2. An `ApprovalRequest` record is generated with:
   - Specific action name and human-readable explanation.
   - Exact target entity (file path, database table, host, port, service).
   - Proposed diff or exact command argument vector.
   - Blast radius assessment and potential consequences.
3. The authenticated user reviews the request in the Approval Center UI.
4. If approved: Backend revalidates user token, updates approval record to `APPROVED`, and transitions task back to `running`.
5. If rejected: Task transitions to `failed` or `cancelled` with human feedback logged.

## 4. Workspace Sandboxing & Path Traversal Defense

- Every project must register an absolute `rootPath`.
- All file operations enforce path normalization and verify:
  `resolvedPath.startsWith(projectRootPath)`
- Any attempt to escape the workspace (e.g. `../../Windows/System32`, `C:\`, UNC paths) throws an immediate security violation and triggers an audit alert.

## 5. Secret Protection

- Secrets (`.env`, private keys, database credentials) are never passed in prompt contexts to external models.
- Execution logs are filtered through a redaction pipeline before persistence and dashboard broadcast.
