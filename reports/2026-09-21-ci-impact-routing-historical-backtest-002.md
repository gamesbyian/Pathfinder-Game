# CI impact routing historical backtest 002

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — 27 recent merged PRs (#1964 through #1926, excluding closed/unmerged PRs) were replayed through the current impact rules with semantic package inspection where needed.
> **Decision:** the conservative classifier is selective enough to continue toward shadow/scoped execution without weakening full-impact fallbacks.
> **Remaining gate:** verify the modeled routing against live shadow observations and execution-plan parity before activation.

> **Scope:** 27 recent merged PRs, #1964 through #1926 (excluding closed/unmerged PRs).
> **Authority:** current PR #1965 impact rules plus semantic inspection of actual `package.json` patches where package registration affected classification.

## Purpose

Stress the impact model against the recent work distribution that actually matters for Pathfinder: research-only documentation, research tooling/data, solver implementation, repository process work, validation-graph changes, and GitHub workflow plumbing.

This pass asks whether the classifier is usefully selective without making obviously cross-cutting changes look narrow. It is not an effectiveness estimate for future PRs.

## Results

| PR | Current-model disposition | Why |
|---|---|---|
| #1964 | **FULL** | permanent validator composition / CI authority changed |
| #1962 | repo + research | forced-work analysis library + research authorities |
| #1961 | repo + research | semantic-forcedness research tooling; package diff is scripts-only |
| #1960 | data + repo + research | research population/evidence + research tooling; scripts-only package diff |
| #1959 | repo + research | research question/queue material |
| #1957 | repo + research | research method/authority/report |
| #1954 | data + repo + research | research data/analyzer + scripts-only package registration |
| #1951 | data + repo + research | research-system integration/tooling/data |
| #1950 | research | dated integration audit report only |
| #1949 | repo + research | research integration authorities |
| #1948 | **FULL** | maintained GitHub workflow changed |
| #1947 | repo + research + solver | production solver implementation + research audit/tooling |
| #1946 | research | dated audit report correction |
| #1945 | **FULL** | permanent `test:node` aggregate changed, so validation authority changed |
| #1941 | repo + research | naming/hygiene authority + audit report |
| #1940 | repo + research + shared | batch-research tooling plus removal of a generic check registration; no production solver module change |
| #1939 | **FULL** | shared domain/game/solver implementation plus permanent validation/package changes |
| #1935 | repo | agent/CI procedure docs + workflow-validator implementation |
| #1934 | repo | periodic repository hygiene authority |
| #1933 | repo + research | protocol/schema research plan/report |
| #1932 | **FULL** | research program work also changed permanent `test:node` aggregate |
| #1931 | repo + research | failure-response research evidence/queue/tool |
| #1930 | **FULL** | broad maintained workflow/tooling boundary hardening |
| #1929 | **FULL** | GitHub workflow step ordering |
| #1928 | repo + research | research result/evidence + analyzer |
| #1927 | **FULL** | GitHub workflow persistence plumbing |
| #1926 | **FULL** | method-probe workflow plus package/tooling plumbing |

### Aggregate

- **18/27 (67%)** are scoped candidates under the current conservative model.
- **9/27 (33%)** remain full-impact.
- Every sampled production-solver-module change includes the solver surface.
- Every sampled maintained-workflow change is full-impact.
- Permanent validation-composition edits remain full-impact even when the underlying feature work is research-only.
- Script-only package registration does not by itself force full impact when all changed local entrypoints have known narrow ownership.

The sample is intentionally skewed toward the repo's recent research-heavy workload, so 67% is not a general future-PR probability. It is evidence that scoped routing would materially affect the work the repo is actually doing now.

## Broadening patterns

### Earned full-impact cases

The repeated full-impact causes are coherent rather than accidental:

1. maintained workflow mutation;
2. CI/router/validation-aggregate mutation;
3. genuinely shared/domain + solver + game implementation change.

These should remain broad.

### Remaining conservative scoped broadening

`shared` still appears where generic tooling ownership has not earned a narrower contract. #1940 is the notable sample. This is acceptable in the first routed implementation because `shared` requests covered implementation tests but does not automatically request solver canary/deep proofs/Firestore.

Do not optimize `shared` away merely to increase the scoped percentage.

## Decision

The classifier has enough historical diversity to proceed to **shadow-mode Actions planning**.

Shadow mode must:

- compute the impact from the tested PR merge diff;
- expose proposed semantic groups and expensive capabilities;
- remain non-gating;
- leave `fast-gate` and `deep-verification` unchanged;
- treat planner failure as observable evidence while full CI continues to prove the PR.

Actual validation skipping remains gated on collected shadow agreement and explicit execution-path implementation.
