# Story 5.6: Finance — Recurring Transactions & Business Metrics

**Epic:** Sprint 5 — Migration Gap Closure
**Status:** backlog
**Effort:** 3 days
**Priority:** P2 — capability exists, not surfaced

## Description

The `finance` router exposes recurring-transaction procedures (`createRecurring`,
`listRecurring`, `updateRecurring`, `deleteRecurring`) and metrics procedures
(`listMetrics`, `upsertMetric`), plus the schema has a `Budget` model — none are
surfaced in the finance page. Add UI; add budget procedures if budgets are in scope.

## Acceptance Criteria

- [ ] Frontend: recurring transactions manager (list/create/edit/delete) wired to the `*Recurring` procedures
- [ ] Frontend: business-metrics view wired to `listMetrics` / `upsertMetric` (+ `MetricHistory`)
- [ ] Backend: decide budgets — either add `finance.*Budget` procedures + UI, or explicitly defer (document)
- [ ] Backend: confirm recurring generation runs somewhere (cron/scheduled) or document manual trigger
- [ ] Tests: recurring CRUD + metric upsert
