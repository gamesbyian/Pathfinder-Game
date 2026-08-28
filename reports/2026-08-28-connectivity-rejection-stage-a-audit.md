# Connectivity-rejection Stage A audit — first real evidence

> **Status:** active
> **Last evidence:** 2026-08-28 — 80-level connectivity-rejection observer run on `data/stress/stress-levels-random.json` (corpus2)
> **Decision:** Stage A's own gate is met on a first, unselected sample: the rejection population is large, and coarse-context recurrence survives across genuinely different exact states and different levels — not "already nearly unique." This earns a Stage B structural-reason-sketch pilot on the dominant `goal`-unreachable subtype; it does **not** establish a sound learned reason or justify any production cache.
> **Remaining gate:** Stage B (see [`2026-08-24-learned-failure-certificate-audit.md`](2026-08-24-learned-failure-certificate-audit.md)) — add a bounded conservative boundary/blocker sketch for the `goal`-subtype coarse cluster with the largest cross-level span, and test whether it recurs as a genuinely sufficient reason (not just a correlated coarse tuple) across unrelated parents.
> **Evidence role:** discovery
> **Selection:** prespecified population rule (levels 1-80 of corpus2, sequential, not chosen after inspecting results); no candidate/threshold selection yet performed on this data

## Scope

Implements Stage A of [`2026-08-24-learned-failure-certificate-audit.md`](2026-08-24-learned-failure-certificate-audit.md), queue item #0's only live "learned-failure search" thread (the restart/randomization half of item #0 remains separately closed — see that item's own W=150M pre-wiring-pilot null).

Adds a research-only `ConnectivityRejectionObserver` to `isConnected()`'s four existing rejection sites (`modules/solver/topology.ts`) and a collection tool (`scripts/connectivity-rejection-audit.mjs`) that runs the real production ladder over a level sample with the observer attached, then aggregates Stage A's four questions. See this session's commit for the instrumentation's own verification (byte-identical `solver:bench --check`, 13 topology tests).

## Population and protocol

- Corpus: `data/stress/stress-levels-random.json` (corpus2), positions 1-80 sequentially (not selected after inspecting outcomes).
- Per level: one production `Solver.solve()` call, `workBudget=500,000` with `strictTotalWorkBudget: true` (a true whole-solve cap — see the script's own comment on why a bare `nodeBudget`/`timeBudgetMs` doesn't reliably bound cost once additive ms-derived fallback tiers are in play), `timeBudgetMs=30,000` as a non-binding safety net.
- All 80 levels reached `work-budget-reached` (none solved at this deliberately modest budget — expected and fine, since the audit's subject is the rejection population itself, not solve rate).
- 2/80 levels produced zero rejections (trivially easy geometry).

## Results

### Q1: subtype prevalence

| Subtype | Records | Share |
|---|---:|---:|
| `goal` unreachable | 49,528 | 73.7% |
| `must-pass` unreachable | 12,562 | 18.7% |
| `must-cross` unreachable | 5,081 | 7.6% |
| `volume` shortage | 8 | 0.01% |

`goal` dominates by a wide margin. `volume` is nearly absent in this sample — worth re-checking on a portal-free-heavy or high-`reqLen` population before concluding it is generally rare, since this sample's own portal/length mix wasn't controlled for.

### Q2: exact-state recurrence

33.61% of all 67,179 records (22,577) share an exact-state fingerprint with at least one other record; 50,891 distinct fingerprints. This is real but well below the 53.65%-98.09% exact-state repeat rate the 2026-08-07 repair-cache premise check found for repair's own terminal-failure population (see the certificate-audit report's "prior evidence" section) — connectivity rejections recur less than repair's randomized-continuation failures, but not negligibly.

### Q3: coarse-context recurrence across different exact states and levels

Coarse key = `(subtype, objectiveIndex, mpVisitedMask, mustCrossMask, reservedWallActive)` — deliberately shallow, exactly the "observational triage, not a candidate production checker" Stage A calls for. It carries no geometry, so a shared coarse key does **not** by itself mean two rejections share the same true reason (same separator/wall facts); it only says the resource-state shape recurred. That is the question Stage B's boundary sketch exists to answer.

| Subtype | Distinct coarse keys | Recur across >1 exact state | Recur across >1 level |
|---|---:|---:|---:|
| `goal` | 1,507 | 54.5% | **11.3%** |
| `must-pass` | 1,463 | 56.0% | 8.4% |
| `must-cross` | 110 | 71.8% | 24.5% |
| `volume` | 4 | 75.0% | 0.0% |

`objectiveIndex` is level-local (index 0 on one level is an unrelated physical cell from index 0 on another), so cross-level recurrence for `must-pass`/`must-cross` coarse keys is partly a coincidence of small index spaces, not necessarily structural — `must-cross` in particular has only 110 distinct coarse keys total (levels carry at most 4 must-cross cells per CLAUDE.md, so the mask space is inherently tiny), which likely inflates its recurrence rate mechanically rather than substantively. `goal` has no `objectiveIndex` at all, so its 11.3% cross-level rate is the cleanest signal in this table.

The single most common `goal`-subtype coarse key (`mpVisitedMask=0, mustCrossMask=0, no reserved wall` — i.e. an ordinary dead-end/wall block with no pending must-pass/must-cross obligation active) accounts for 12,905 records across **7,934 distinct exact-state fingerprints and 29 distinct levels** — recurrence that is neither exact-state duplication nor an index-space artifact.

### Q4: work-point distribution

Rejections are spread across essentially the whole 500,000-unit budget for every subtype (`goal` p50≈244k, p90≈462k; `must-pass` p50≈226k, p90≈400k; `must-cross` p50≈262k, p90≈454k), not clustered early or late. This sample does not by itself show an "earlier firing" opportunity — that requires Stage B's actual gap-timing analysis between scheduled connectivity calls, not just the work value at rejection.

## Reading against Stage A's own gate

Per the certificate-audit report: *"Proceed from Stage A to Stage B only if the failure population is large enough and some subtype/coarse-context recurrence or earliness opportunity survives across unrelated parents. A Stage-A negative is enough to stop without paying for graph fingerprints."*

This sample is not a Stage-A negative: the population is large (67K records, 80 levels), and `goal`-subtype coarse-context recurrence survives across unrelated parents (11.3% of coarse keys span multiple levels; the dominant shape spans 29). That earns Stage B — specifically a bounded boundary/blocker sketch for the `goal`-unreachable, no-pending-obligation coarse cluster, since it is both the largest population share (73.7%) and has the cleanest (index-free) cross-level signal.

This is **not** evidence that a sound learned reason exists or will pay off. The coarse key carries no geometry; two rejections sharing it could be structurally unrelated coincidences. Stage B's own job — canonical boundary/blocker facts, checked against Stage B's success gate (recurrence materially exceeding exact-state recurrence, cheap matching, conservative soundness per literal, value not confined to one level family) — is what actually tests that.

## What this does not establish

- No production cache, checker, or search-behavior change. The observer is verified byte-identical to production when absent and was never active during any production-shaped decision in this run either — it only recorded already-computed rejections.
- No claim about the 585 currently-unsolved-with-no-observed-isolated-solver population from the separate post-976 portfolio rejoin (`2026-08-25-post-976-portfolio-exposure-rejoin.md`) — unrelated analysis, unrelated evidence.
- No claim beyond this specific 80-level corpus2 sample. A Stage B pilot should itself draw on an independent/larger population before any promotion-shaped claim, per the evaluation-evidence selection-pressure rules.
- `volume`'s near-zero share here should not be read as "volume rejections are rare in production" without checking a population where it's more mechanically likely to fire (non-portal, tight `reqLen` margin).

## Reproduction

```bash
node scripts/connectivity-rejection-audit.mjs \
  --corpus=data/stress/stress-levels-random.json --levels=pos:1-80 \
  --work-budget=500000 \
  --out=reports/stress/connectivity-rejection-audit-corpus2.json \
  --summary-out=reports/stress/connectivity-rejection-audit-corpus2-summary.md
```

Raw records and per-level summaries: [`reports/stress/connectivity-rejection-audit-corpus2.json`](stress/connectivity-rejection-audit-corpus2.json).
