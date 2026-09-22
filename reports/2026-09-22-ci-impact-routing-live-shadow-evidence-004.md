# CI impact routing live shadow evidence 004

> **Status:** concluded-positive
> **Last evidence:** 2026-09-22 — real post-foundation CI supplied research-only scoped, solver-scoped, and full-impact routing examples with observed failure distribution.
> **Decision:** the live shadow-shape gate is satisfied; the semantic routing and lane boundaries behaved coherently on the inspected real PRs, so no classifier or lane-policy change is warranted before activation rehearsal.
> **Remaining gate:** establish a green current-main broad baseline, then run representative manual scoped dry-runs and verify final-status semantics before enabling ordinary PR validation skipping.

> **Question:** do real post-foundation PRs select the expected semantic surfaces and lane requirements, and do full-CI failures appear inside the selected obligations rather than only in work the router would skip?

## Evidence set

This pass uses real PR CI runs after the routing foundation landed.

### Research-only scoped samples

#### PR #1974 — retained-confirmation stop condition

Shadow decision, run `356817...`:

- `full=false`;
- surfaces: `repo + research`;
- capabilities: `lint`;
- `fast-gate=required`;
- `deep-verification=not required`.

Full CI result:

- fast gate **failed** on repository/research obligations including research integration, documentation links, agent-context/parity, and research Node/CLI contracts;
- deep verification **passed**:
  - coverage: success;
  - deep solver proofs: success;
  - Firestore boundary: success.

#### PR #1975 — independent WS1 preflight

Shadow decision:

- `full=false`;
- surfaces: `repo + research`;
- capabilities: `lint`;
- `fast-gate=required`;
- `deep-verification=not required`.

Full CI result:

- fast gate **failed** on the same combined-tree repository/research debt family;
- deep verification **passed** completely.

**Interpretation:** in both real scoped-research samples, every observed failure belonged to the lane the router retained. The entire deep runner was unrelated to the failures and passed anyway. These are direct positive examples for whole-job deep-lane omission on research-only changes.

### Solver scoped sample

#### PR #1982 — remaining-length intra-solve bridge

Shadow decision, CI run `35683294899`:

- `full=false`;
- surfaces: `repo + research + solver`;
- capabilities:
  - lint;
  - production build;
  - solver canary;
  - covered ordinary implementation tests;
  - heavyweight solver proofs;
- Firestore **not selected**;
- both fast and deep lanes required.

Full CI result:

- solver canary: success;
- production build: success;
- coverage: success;
- heavyweight solver proofs: success;
- Firestore also passed only because the current broad deep lane still runs it;
- fast gate failed on stale combined-tree repository/research validation debt plus a test-type issue.

**Interpretation:** the production-solver change correctly kept the deep lane and solver capabilities while excluding the unrelated persistence capability. This is the complementary live sample to #1974/#1975.

### Full-impact samples

Multiple recent PRs, including #1971, #1977, #1978, #1983 and CI/router/package-aggregate changes, shadowed to `FULL`.

Observed full triggers included:

- permanent `test:node` / validation composition mutation;
- maintained workflow / CI authority changes;
- broad repository/tooling authority changes.

No live sample supplied evidence that these triggers are unnecessarily narrow or unsafe. Keep them conservative.

## Failure-distribution lesson

Across the inspected post-foundation runs:

- `deep-verification` repeatedly passed;
- the active repository debt was concentrated in `fast-gate` research/repository contracts;
- solver canary/build also repeatedly passed where run;
- the shadow router itself completed successfully.

This does **not** mean the deep lane is generally unnecessary. It means the current semantic split is successfully separating production implementation/persistence obligations from research/repository integration failures.

## Current-main baseline

Main-push run `35683520083` on #1983 failed only because:

`reports/2026-09-21-ws1-legal-signal-continuation-temporal-challenge-001.md`

had prose evidence role `development / temporal robustness` while its structured closeout retained `development`.

PR #1984 subsequently normalized the prose role back to `development` and improved the research-status builder to aggregate all metadata disagreements in one pass. Its main-push validation is the current baseline run; do not activate scoped PR skipping until current main has a green broad safety-net baseline.

## Decision

The original live-shadow-shape gate is **satisfied**.

We now have direct live evidence for:

1. research-only changes that may omit the deep runner;
2. production-solver changes that must retain coverage/proofs/canary/build but may omit Firestore;
3. broad authority changes that conservatively remain full-impact.

No source-impact or lane-boundary rule change is justified by these observations.

## Remaining empirical gates

Before scoped PR execution becomes authoritative:

1. establish a green current-main broad baseline;
2. execute `CI Scoped Dry Run` against representative:
   - research-only scoped case;
   - solver scoped case;
   - full-impact case;
3. verify `ci-success` behavior when deep verification is deliberately skipped and when it is required;
4. run the Node-concurrency benchmark separately before changing `PATHFINDER_PARALLEL_JOBS`;
5. retain a periodic/manual full oracle after activation.

The concurrency benchmark is independent of scoped-routing activation. A lack of concurrency evidence should block changing the fan-out default, not block a separately validated routing rollout.
