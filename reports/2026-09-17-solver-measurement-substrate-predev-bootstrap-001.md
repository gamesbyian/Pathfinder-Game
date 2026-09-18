# Solver measurement substrate pre-development tranche

> **Status:** active
> **Last evidence:** 2026-09-17 — implementation branch opened from `main` @ `370973e34fc014241b2613f3f3ae2fd4e39f4f1b`.
> **Decision:** implement the bounded non-behavioral measurement substrate before ordinary solver development resumes.
> **Remaining gate:** merge only after exact-head CI/review; D1 production-inert evidence acquisition remains the next solver-research gate.

## Purpose

Prepare the smallest reusable measurement substrate warranted before the next ordinary solver-development round.

This tranche is intentionally non-behavioral. It must not change production solver ordering, pruning, retention, budgets, randomness, cache lifetime, or solve outcomes.

Planned bounded work:

1. implement the production-inert decision-observation seam required by the active D1 evidence preflight, in a reusable form suitable for later retention/rejection questions;
2. add explicit live-ambiguity / discriminating-observable / interpretation metadata to experiment contracts where it can be carried without breaking historical readers;
3. add a thin bounded work-ladder experiment primitive over existing sweep infrastructure;
4. extend operational-similarity tooling only as far as needed to observe beam ranking/retention divergence;
5. add an offline ancestry-aware gain/loss covariance analyzer that produces nominations only;
6. reconcile operating-model, tooling, and queue authorities after validation.

## Hard boundaries

- no production solver-policy change;
- no automatic promotion of measurement opportunities into queue tasks;
- no broad telemetry warehouse;
- no new exact-query production dependency;
- no proxy optimization without a live ambiguity and decision-changing interpretation contract;
- D1 remains observation-only until its existing advancement gate is satisfied.
