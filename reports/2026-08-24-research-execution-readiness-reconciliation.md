# Solver research execution-readiness reconciliation

> **Status:** active
> **Last evidence:** 2026-08-24 — completed static audits across queue items #0-#8 and current tooling/source contracts
> **Decision:** the current research program is no longer broadly blocked on ideas or literature. Most ranked questions have been narrowed to one small executable gate using existing machinery; avoid another round of broad conceptual expansion until those gates return evidence.
> **Remaining gate:** execute the ranked tests below in queue order, beginning with P0 and the scheduler current-data join; update the owning report/queue item as each result lands.
> **Evidence role:** discovery
> **Selection:** observational — readiness is reconciled from current repo/tooling and the audits on this branch.

## Purpose

This is not another roadmap. Rank remains in `docs/solver-optimization-current-queue.md`.

This report answers one narrower operational question:

> After the August 24 static/research integration work, what is actually missing before each live queue item can produce new decision-bearing evidence?

The answer is encouragingly concrete.

## Readiness matrix

| Queue | Current knowledge | Smallest next executable | New infrastructure needed? | Blocker |
|---:|---|---|---|---|
| #0 P0 stage dependence | static suspects narrowed; resource context + initial admissible ordering are the first checks | one fresh-vs-preceded reproduction with resource vector and first-order/tree-divergence diagnostics | **tiny instrumentation/test seam** | none higher; this is the blocker |
| #1 scheduler repricing | action identity, work, outcomes, exhaustion/censoring telemetry already exist; census tranche data exist | current attempt/lifecycle × census action/tranche join, fixed-work frontier, failed-work tax, simple static baseline | **small analyzer/join**, not new telemetry system | P0 only for sequence-ambiguous admissible cells; rest can proceed with exclusions |
| #2 generalization | protocol designed; deterministic random/envelope generators and run manifests already exist | define thin population lifecycle manifest; mint first broad-confirmation + transfer-envelope cohorts | **small manifest/validation layer**; generator already exists | selected treatment needed before first decision-bearing use |
| #3 automatic configuration | action grammar and stable identities already exist | use #1 portfolio-cardinality/headroom result to decide whether action racing or local parameter refinement is worth running | **none before #1** | #1 headroom gate |
| #4 beam retention | exact A/D labels already exist; scalar summaries falsified; MustCross first-pass state nominated | offline descriptor projection on existing exact cases, then one fixed-width matched-work retention treatment only if recurrence survives | likely **small analysis extraction**, then bounded experiment | no new CP-SAT needed initially |
| #5 reference model | prefix oracle has paid rent on repair and beam; support/validation boundary understood | finish small adversarial bidirectional support matrix only where currently incomplete | existing CP-SAT/referee tooling | avoid scope expansion |
| #6 restart | seed diversity established; historical wins additive | equal-aggregate-work continuation vs prespecified macro-seed split | existing repair seed/action provenance; may need fixed-work harness composition | fresh residual confirmation later |
| #6 learned failure | exact-state recurrence weak; repair memory is non-proof; connectivity reason is first candidate | shadow reason sketch on already-scheduled connectivity rejects, measure recurrence/earliness/avoided fill opportunity | **small instrumentation** | no production cache until positive |
| #7 repair | exact retreat labels show shallow/deep regimes | invoke existing bounded reconstruction from known-live/dead prefixes at fixed work | possibly **small prefix-to-existing-operator seam** | no new repair operator first |
| #8 speed | native boundary currently too broad; specialized JS scorer is the only speculative candidate left | fresh CPU profile; if scoring still dominant, one true structural scorer specialization A/B | profiling exists; bounded scorer prototype only if nominated | current profile result |

## What can proceed without new broad compute

### P0

One or a handful of exact reproductions are more valuable than another population sweep. The diagnostic is now deliberately staged:

1. equalize explicit action/resource context;
2. compare initial admissible child ordering;
3. clear MP/MC bound memos if ordering differs;
4. otherwise trace first later divergence.

Do not dump all mutable state before these cheaper discriminators.

### Scheduler

The first scheduler frontier is fundamentally an **existing-data analysis**. It may discover stale/non-comparable cells that require targeted reruns, but that should be an output of the join rather than a reason to commission another full census first.

### Beam

The existing exact A/D case material is sufficient to test the first cheap descriptor hypotheses. More oracle labels are justified only by a specific coverage gap after that projection.

### Reference model

Use already-committed witnesses and adversarial tiny fixtures to close validation holes. Do not run a broad exact solve campaign.

## What needs a tiny coding seam, not a framework

### Population lifecycle manifest

Generation and A/B comparability are already solved. The missing #2 tool should be roughly a manifest validator/writer and optional exposure transition recorder, not benchmark management software.

### Connectivity reason shadowing

Only augment connectivity calls that already execute/reject. No clause store, no modified pruning, no second graph traversal.

### Repair prefix reconstruction seam

Expose an existing bounded operator from an explicit prefix if necessary. Do not implement a new destroy/recreate strategy just to run the diagnostic.

### P0 checksum instrumentation

Log the resource/context vector and first admissible ordering in a reproducible control path. Avoid broad tracing until the checksum agrees.

## What is blocked by another result

### Automatic configuration

Do not configure raw weights yet. #1 must first show fixed-work portfolio headroom after pricing the existing action menu. If a compact static subset captures most headroom, broad configuration search is unnecessary.

### Dynamic scheduler / survival / bandit machinery

Blocked on the same #1 headroom result and a simple static-policy baseline.

### Generic learned failure / CDCL / backjumping

Blocked on one compact sound reason class demonstrating recurrence, earliness and net saved work.

### Large destroy/core-guided repair

Blocked on #7 demonstrating a recurrent deep-retreat regime for which smaller reopening is impossible.

### Native/WASM migration

Blocked until the architecture naturally exposes a compact material kernel or profiling finds a different isolated boundary.

## Current strong “do not repeat” list

The branch audits also consolidate several questions whose premise is already answered enough to avoid reruns:

- do not re-prove that repair seeds differ in capability;
- do not re-run broad exact DFS transposition recurrence;
- do not re-label the existing beam extinction set with CP-SAT before using it;
- do not launch another global beam-width/diversity study before the exact descriptor question;
- do not split already-mined Corpus 2 and call the split untouched holdout;
- do not build another solver-blind random generator for confirmation;
- do not define a second action identity format;
- do not use winner-only historical portfolio replay as current continuation-value analysis;
- do not front-load every beam globally from isolated node economics;
- do not prototype native/WASM across the current broad candidate kernel;
- do not interpret repair-local failed-state cache hits as logical UNSAT.

## Suggested execution order within the current queue

Rank still controls, but several actions can be prepared in parallel without contaminating each other:

1. **P0 reproduction/checksum** because it governs interpretation of sequence-sensitive admissible cells.
2. **Scheduler existing-data join/frontier**, excluding P0-ambiguous cells rather than waiting for every action to become perfect.
3. **Thin population manifest + first fresh cohorts** so confirmation capacity exists when #1/#4/#6/#7 nominate a treatment.
4. **Beam descriptor projection** on existing exact cases.
5. **Reference support-matrix closure** only for unresolved currently claimed exact mechanics.
6. **Restart equal-work pilot** and **connectivity reason shadowing** as separate #6 experiments.
7. **Repair live-prefix reconstructability pilot**.
8. **Fresh performance profile**, then scorer specialization only if nominated.

This order intentionally turns existing evidence into decisions before buying another broad search campaign.

## Disposition

The research program has reached an execution-heavy phase.

The main risk now is not lack of sophisticated ideas. It is spending compute or implementation effort on questions whose cheapest discriminating experiment is already known.

Keep the literature/research synthesis as hypothesis vocabulary, but make the next tranche predominantly **measurement and falsification**.
