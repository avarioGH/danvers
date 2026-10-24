# DANVERS JARVIS — Implementation Roadmap

## Phase 0: Environment & Capability Audit (COMPLETE)
- [x] Host environment inspected (Windows 11 Pro, Intel i5-13400F, 32GB RAM, GTX 1650 4GB).
- [x] Git, Node v24, Ollama verified. Missing WSL/Docker/Python noted.
- [x] Existing codebase (`jarvis-os`) preserved and Git checkpoint branch established (`checkpoint/phase1-baseline`).

## Phase 1: Architecture, Local Model Benchmark & Foundation (IN PROGRESS)
- [x] Deliver `docs/architecture.md`, `docs/security-model.md`, `docs/implementation-roadmap.md`.
- [ ] Pull and benchmark `qwen2.5-coder:3b` against local Ollama.
- [ ] Implement core backend types, state machine, permission policy engine, in-memory/Supabase task store.
- [ ] Expose health, model status, task creation, and approval endpoints.
- [ ] Add unit tests verifying permission boundaries and state transitions.

## Phase 2: Minimum Viable Engineering Dashboard
- [ ] Implement the engineering navigation and core views (Command Center, Tasks Queue, Approval Center, Model Settings).
- [ ] Connect dashboard to real Jarvis API routes.
- [ ] Display live task status, logs, and interactive approval prompts.

## Phase 3: Local AI & Coding Worker
- [ ] Connect agent loop to local Ollama and cloud fallback.
- [ ] Implement isolated workspace code editor and diff generator.
- [ ] Execute verified test task in an isolated workspace.

## Phase 4: Secure Execution & Sandboxing
- [ ] Enforce strict argument-based command runner with timeouts and output limits.
- [ ] Adversarial testing against prompt injections and workspace escape attempts.

## Phase 5: Mobile Access
- [ ] Configure secure private access (Tailscale / authenticated reverse proxy).
- [ ] Verify phone responsiveness and approval workflows on mobile viewport.

## Phase 6: VPS Worker
- [ ] Establish worker lease protocol, heartbeat, and remote Linux execution.

## Phase 7: Deployment & Maintenance
- [ ] Automated security scans, file audit, and cleanup proposal generation with human approval.

## Phase 8: Acceptance Verification
- [ ] Full end-to-end regression and security acceptance tests.
