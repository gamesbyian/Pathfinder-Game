# Solver research stale-gate / reopen audit preflight 001

> **Status:** active
> **Last evidence:** 2026-09-17 — current `main` after research-integration PRs #1864 and #1865.
> **Decision:** audit the machine-readable question registry and live queue for gates whose stated blocker/reopen condition has been overtaken by later evidence or tooling; distinguish hard consistency failures from semantic review candidates.
> **Remaining gate:** reconcile confirmed stale states into their owning authorities and add a reusable audit that reports future candidates without automatically reopening research.

## Rules

- Existing evidence decides whether a gate moved; string matching may only nominate review candidates.
- Closed tested forms stay closed unless their own stated reopen condition actually occurred.
- A newly available tool does not repair historically missing telemetry.
- A new population does not automatically validate a mechanism; it may only satisfy a population prerequisite.
- Update the machine-readable registry and live workstream/future-work authorities together when a disposition truly changed.
