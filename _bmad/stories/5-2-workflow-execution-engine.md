# Story 5.2: Workflows — Real Execution Engine

**Epic:** Sprint 5 — Migration Gap Closure
**Status:** backlog
**Effort:** 5 days
**Priority:** P0 — feature is a stub

## Description

`workflows.execute` (`apps/web/src/server/api/routers/workflows.ts`) currently just
inserts a `WorkflowExecution` row with status `PENDING` and returns — no steps run, no
logs are written, status never advances. The workflows page only calls `workflows.list`;
it can't create or run anything. Build a real (even if synchronous/minimal) execution
path and wire the UI.

## Acceptance Criteria

- [ ] Backend: define workflow step/config shape on the `Workflow` model (document the JSON schema stored)
- [ ] Backend: `workflows.execute` transitions `WorkflowExecution` PENDING → RUNNING → COMPLETED/FAILED
- [ ] Backend: each step writes an `ExecutionLog` row (level, message, timestamp)
- [ ] Backend: failures set status FAILED and log the error; execution is idempotent per run
- [ ] Backend: `workflows.getExecution` / `workflows.listExecutions` to fetch run history + logs
- [ ] Backend: authorization — only workflow owner (or ADMIN) can execute
- [ ] Frontend: "New workflow" form on the workflows page (wire `workflows.create`)
- [ ] Frontend: "Run" button per workflow (wire `workflows.execute`) with running state
- [ ] Frontend: execution history panel with per-step logs and final status
- [ ] Tests: execute happy-path (status progression + logs) and failure-path
