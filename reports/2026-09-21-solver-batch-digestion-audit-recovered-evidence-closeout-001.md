<!-- agent-context-budget: warn=7000 max=10000 -->
# Solver batch digestion audit: recovered execution evidence and dispositions

> **Status:** closeout evidence recovered from successful GitHub Actions run.
> **Date:** 2026-09-21.
> **Source branch/run:** former PR #1940 / execution-only PR #1942, run `35563235874`.
> **Artifact:** `solver-batch-digestion-fixed-cost`, artifact `10623295608`, digest `sha256:08144ee64750d6577c5e2f7feeea3ca91d5691632b68a3258c7dd1acb44b3b5e`.
> **Parent plan:** [`../docs/solver-batch-digestion-architecture-audit-plan.md`](../docs/solver-batch-digestion-architecture-audit-plan.md).
> **Decision:** the audit's strongest implementation-heavy ideas are mostly closed or narrowed. No general compiled-level refactor, global equivalence canonicalizer, initial parity presolve, or initial BC1 presolve is earned. Remaining value is concentrated in narrowly scoped research-batch latency and family/query-specific reuse questions.

## 1. Recovery note

The audit session stalled after PR #1940 had already been merged to `main`. Repository history is the
source of truth:

- former audit head: `705da5182fd715e54dffcb1d5c20c30765fead5f`;
- PR #1940 merge: `e587292fd4515deb8d38de2bf931343dd3c61aa7`;
- current recovery base: `222a570fa082a22ca98e8fb7ef5b766e6ba64383`.

Current `main` contains the full audit head and subsequent closeout repairs.

The successful one-shot evidence workflow was run as GitHub Actions run `35563235874` against
`defefdc4924413768069c57181a0be3614a44b64`. The temporary workflow was later removed as intended.

## 2. Fixed-cost versus solve-wall result

### Published corpus, 160 levels

At a fixed 250k node budget:

- validation total: **7.272 ms**;
- normalization total: **3.201 ms**;
- `prepLevel` total: **91.956 ms**;
- solve wall total: **27,478.338 ms**.

Therefore preparation was approximately:

```
91.956 / 27,478.338 = 0.00335 = 0.335%
```

of measured solve wall.

### Hard Corpus 2 sample, 24 levels

At the same fixed node budget:

- validation total: **4.215 ms**;
- normalization total: **1.941 ms**;
- `prepLevel` total: **55.028 ms**;
- solve wall total: **486,254.975 ms**.

Therefore preparation was approximately:

```
55.028 / 486,254.975 = 0.000113 = 0.0113%
```

of measured solve wall.

### Disposition

The earlier conceptual `CompiledLevel / SolveContext` split remains semantically coherent, but it is
**not earned as a general solve-speed refactor**.

Same-level compilation reuse can still remove seconds in very high-multiplicity research batches,
but the percentage-of-total result says this is tooling overhead, not a route to materially faster
hard solving.

Do not undertake a solver-wide lifetime/API refactor for this speed case.

## 3. Raw digestion and normalization

Fresh fixed-cost medians in the recovered run were even smaller than the first opportunity-sizing run:

| population | validation median | normalization median | prep median |
|---|---:|---:|---:|
| published | 0.0065 ms | 0.0034 ms | 0.1948 ms |
| Corpus 1 sample | 0.0178 ms | 0.0099 ms | 0.5788 ms |
| Corpus 2 sample | 0.0145 ms | 0.0062 ms | 0.8664 ms |

These measurements strengthen the prior disposition:

- alternate raw token formats: **closed for speed**;
- binary serialization: **closed for speed**;
- normalization cache for ordinary solving: **closed for speed**;
- parser micro-optimization: **closed for speed**.

Representation changes remain open only if they reduce search work or hot-path memory traffic.

## 4. Exact duplicate / symmetry reuse census

The complete equivalence census covered:

- published: 160;
- Corpus 1: 102;
- Corpus 2: 1,700;
- total: **1,962 levels**.

Result:

| metric | count |
|---|---:|
| exact duplicate groups | **0** |
| exact rows avoidable after representative | **0** |
| symmetry-equivalent groups including exact | **0** |
| strict non-identical symmetry groups | **0** |
| additional rows avoidable by symmetry | **0** |

### Disposition

Global exact/symmetry canonicalization is **closed for current corpora**.

This is stronger than the earlier partial 262-level negative. There is no demonstrated solve-elimination
customer across all extant published/stress levels.

Generated symmetry families remain different: their relationship is known directly from provenance,
so they should use family lineage rather than global canonicalization.

## 5. Initial-state presolve census

Complete population:

- published: 160;
- Corpus 1: 102;
- Corpus 2: 1,700;
- total: **1,962**.

### P1: all-gates ordinary parity infeasibility

- no-twist rows: 967 total;
- all-gates parity-infeasible rows: **0**.

### P3: BC1 bridge-excursion conflict at initial state

- initial connectivity-passing gates:
  - published: 221;
  - Corpus 1: 108;
  - Corpus 2: 1,700;
- BC1-conflicted gates: **0** in every population;
- rows with any initial BC1 conflict: **0**;
- rows where every connectivity-passing gate conflicts: **0**.

BC1 plus connectivity snapshot cost was already small:

- published median per gate: 0.1958 ms;
- Corpus 1 median: 0.2898 ms;
- Corpus 2 median: 0.2739 ms.

But zero incidence means even a cheap consumer has no current initial-state speed value.

### Disposition

- initial all-gates parity presolve: **closed no-opportunity**;
- initial BC1 presolve: **closed no-opportunity**;
- dynamic/frontier BC1: **not closed**. Earlier frontier-state incidence was materially positive, so
  the theorem remains a distinct dynamic-consumer question;
- initial checkerboard-capacity P2: **deferred**, not promoted. It requires additional execution
  plumbing, and the two cheaper initial-state candidates produced zero incidence across all 1,962 levels.
  Reopen only if existing H2 telemetry or a live solver question makes the incremental measurement cheap.

## 6. Generated-family constructive reuse

Across 163 family manifests:

- variant rows: **1,265**;
- constructive-witness rows: **1,265 / 1,265**;
- exact-coordinate witness relation: **674**;
- transformed witness relation: **591**;
- stored hint files: **816**;
- constructive variants without a separate stored hint file: **449**.

### Interpretation

For operational questions whose goal is merely "produce a valid solution for this generated variant,"
the general solver is often unnecessary: the family-generation contract already proves a constructive
solution.

For blind solver-capability experiments, using that constructive answer remains prohibited because it
would destroy the measurement.

### Disposition

No new global solution warehouse is earned from this fact. Family provenance already owns the exact
relationship.

A narrower ergonomic/data-access improvement may be justified later if operational consumers repeatedly
need to materialize the 449 constructive witnesses that are provenance-valid but lack a separate hint
file.

## 7. Family partial-compilation census

Across 1,265 variants / 145 families:

| broad class | invariant rate |
|---|---:|
| challenge metric | **100%** |
| grid | 92.0% |
| mechanics | 59.6% |
| obligations | 56.1% |
| endpoints | 53.4% |
| static occupancy | 23.0% |
| landmarks | 20.8% |

Only **243 / 1,265** variants changed at most one broad dependency class.

Mode-specific structure matters:

- density sweep: 16/16 change only static occupancy among these broad classes;
- local mutant: 190/391 change at most one broad class;
- swap: 30/151;
- symmetry: 7/490 under literal coordinate invariance;
- constrained shuffle, group reshuffle, re-embed: no one-class cases in this census.

### Interpretation

There is real controlled-delta structure, but it is heterogeneous.

The data do **not** support building a generic incremental compiler. They do support the narrower
observation that specific generator modes may eventually justify mode-aware reuse if a high-multiplicity
consumer needs it.

For symmetry, literal field invariance is the wrong reuse notion anyway: transformability, not unchanged
coordinates, is the relevant relation. That relation is already explicit in family provenance.

### Disposition

Generic parent->child incremental compilation: **deferred / not earned**.

If revisited, start with the cleanest actual customer:

1. required-metric sweeps, where source audit shows almost all prep is invariant; or
2. density-sweep families, where the broad delta is isolated to occupancy.

Do not build a general invalidation graph first.

## 8. Required-metric partial compilation

Source audit found that `prepLevel()` itself has only one clear challenge-metric-dependent derived
field: `mustMaskForDFS`, through required path coverage.

Most expensive static products are reqLen/reqInt invariant.

This makes reqLen/reqInt sweeps a technically clean partial-reuse case.

However, the solve-relative evidence above sharply reduces its priority: preparation is a tiny fraction
of realistic solve wall.

### Disposition

Keep the dependency boundary documented. Do not implement a partial compiler for speed unless a real
sweep workload demonstrates human-visible wall latency dominated by repeated prep rather than search.

## 9. Decision-latency lane

This remains the strongest architecture lane not closed by the recovered execution evidence.

Existing `runWorkerPool` already supports completion-order cancellation. For frozen gates with a
monotone negative condition, such as `maxLosses = 0`, a genuine loss can make promotion impossible
before the planned population finishes.

Historical artifacts do not generally preserve both:

- the frozen generic promotion gate; and
- real independent-unit completion order/timestamps.

Therefore retrospective "hours saved" reconstruction is not trustworthy.

### Disposition

Do not build a broad sequential-inference framework.

If a future expensive paired experiment has a frozen monotone stop condition, add the smallest
prospective terminal certificate and exercise the existing pool cancellation primitive there.

This is an execution-contract improvement to apply opportunistically, not a standalone infrastructure
project.

## 10. Overall synthesis

The original question asked whether the level could be digested differently so large batches complete
faster.

The recovered evidence says the literal answer is mostly **no**:

- parsing/normalization is too cheap;
- level compilation is too small a share of solve wall;
- natural corpus duplicate/symmetry elimination has zero hits;
- two exact initial presolve ideas have zero initial-state incidence;
- generic family incremental compilation is too heterogeneous.

The useful inversion survives:

> the biggest wins will come from reducing or avoiding combinatorial search, not from making the
> existing level object cheaper to ingest.

The audit therefore hands remaining work back to the solver-science program rather than creating a new
performance subsystem.

## 11. Recommended closeout actions

1. Mark the audit plan as closeout / mostly concluded.
2. Update `solver-architectural-speed-opportunities.md` with the current-head negative ceilings so
   future agents do not reopen raw ingestion, global compile reuse, or equivalence canonicalization
   without new evidence.
3. Keep dynamic BC1, residual interfaces, capability invention, and other search-reducing mechanisms
   in their existing solver-science authorities.
4. Add no new canonical queue item solely for compiled-level reuse.
5. Treat prospective irreversible decision locks as an opportunistic research-run feature when a real
   expensive experiment supplies the first live consumer.
6. Retain the census scripts as cheap diagnostic tools unless repo hygiene later finds no reuse.
