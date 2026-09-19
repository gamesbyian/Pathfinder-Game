# Failure-information remaining instrumentation seam audit 001

> **Status:** implementation-preflight / source audit
> **Date:** 2026-09-18
> **Scope:** the four search-loss plan sub-investigations left after automatic compact failure-response rollout: progress-over-work, rejection-reason seams, beam candidate-flow, and replayability.
> **Decision:** none of the four should be made universal from source inspection alone. Reason and beam-flow collection have strong existing seams; progress-over-work requires genuinely new search-family instrumentation; replayability needs a stronger reconstructability contract before any capsule may claim `replayable`.
> **Evidence role:** implementation planning. No solver policy, ordering, pruning, budget, or search instrumentation changed by this audit.

## 1. Progress over work

### Existing support

The ordinary attempt record already preserves canonical attempt `workSpent`, `bestBadness` when a search family reports it, and `finalBadness` where available.

Repair search already maintains `bestBadnessEver` internally and updates it when a restart/dead-end produces a new best state. That is a natural transition seam.

DFS currently reports a one-shot `finalBadness` on timeout. Its own source comment explicitly says this is not tracked best-ever progress.

Beam likewise reports terminal `finalBadness`; its research observer carries canonical `workSpent` at stage boundaries but is not a cheap universal progress recorder.

Admissible-order reports nodes/timed-out status but no comparable best-badness trajectory.

### Consequence

A generic progress curve cannot be reconstructed from current durable outputs. Adding one is real instrumentation work, not merely a reducer.

The narrow pilot should therefore:

1. instrument at least two materially different search families, preferably repair plus beam or DFS;
2. sample fixed/logarithmic canonical-work checkpoints and bounded new-best transitions;
3. retain only aggregate transition/checkpoint data, never full state traces;
4. measure parity, wall overhead, transition count, and bytes/attempt;
5. test whether it distinguishes late-improving from early-plateau attempts beyond terminal `bestBadness`.

Do not make it universal unless the additional information value survives that overhead test.

## 2. Rejection-reason seam

### Existing support

`modules/solver/hard-prune-pipeline.ts` already owns a typed `PruneId` vocabulary and `PruneDiagnostics.rejected` counter map. Most named hard-prune exits use the shared `reject(diagnostics, id)` helper, including distance, parity, lower bounds, must-turn, must-cross, intersection deficit, and connectivity.

The first-step forced-neighbor path also already increments a typed prune counter when diagnostics are present.

Two specialist seams are richer:

- connectivity can emit rejection subtype (`goal`, `must-pass`, `must-cross`, `volume`);
- joint-obligation observation already carries a `reasonFamily` and demonstrates the desired broad-count + bounded-specimen collection pattern.

Not every rejection currently has a typed diagnostic identity. Direct exits such as length/intersection overshoot and some terminal/neighbor-empty conditions remain outside the shared counter vocabulary.

### Consequence

The next reason-telemetry implementation should **reuse the existing prune diagnostics**, not invent a second reason taxonomy.

The narrow pilot should:

1. attach one diagnostics accumulator at attempt/search scope;
2. persist aggregate typed counts only;
3. inventory direct untyped reject exits and decide individually whether a stable reason ID is worth adding;
4. keep connectivity/joint-obligation rich details specialist;
5. measure overhead with diagnostics on/off over a small deterministic sample.

No per-node rejection log is justified.

## 3. Beam candidate-flow summary

### Existing support

The beam research observer already exposes the complete flow vocabulary required by the plan:

- incoming frontier;
- generated;
- hard-pruned;
- post-hard-prune;
- coarse-state-merge removed;
- post-production coarse-state merge;
- score-width culled;
- mechanic-bucket culled;
- intersection-bucket culled;
- retained/post-selection frontier stages.

It also reports canonical `workSpent` at observation boundaries.

### Important cost boundary

The current research observer is intentionally rich. In research mode it can build candidate/path arrays, removal contexts, and ranked-pool material. Turning that observer on for every normal sweep merely to derive counts would violate the compact-evidence design and risks recreating the D1 full-trace storage/overhead failure.

### Consequence

The universal candidate-flow form should be a **counter-only beam summary**, using the same stage semantics but not the rich observer payload.

The pilot should compare:

1. observer off;
2. counter-only flow accounting;
3. existing rich BeamResearch observer,

on a bounded deterministic sample.

Promotion requires parity plus negligible overhead for the counter-only arm. The rich observer remains question-specific.

## 4. Replayability

### Existing support

The search-loss capsule schema already distinguishes:

- `replayable`;
- `identity-only`;
- `historical-unverified`.

The capsule validator requires a state or path identity. The decision-observation adapter deliberately defaults to `identity-only` and currently uses the decision identity as `pathIdentity`.

Separately, the repository already has stronger replay precedents:

- witness-path replay fails closed unless the exact stamped witness can be resolved;
- production frontier sampling preserves exact selected prefixes plus ancestry;
- beam continuations enforce exact live ownership, although continuations are execution objects and must not be confused with durable replay artifacts.

### Gap

The current generic search-loss validator validates the **label** `replayable`, but does not independently prove that a capsule carries enough material or a resolvable source reference to reconstruct the exact historical state.

A digest/decision ID is sufficient for identity comparison and deduplication. It is not sufficient for later exact-state annotation.

### Consequence

Until the schema grows an explicit reconstructability descriptor and validator, generic producers should continue to emit `identity-only` unless they already carry an independently validated exact replay basis.

The replayability sub-investigation should freeze one minimal descriptor shape supporting only already-earned cases, for example:

- inline exact prefix/path; or
- durable source artifact + stable source-row identity that resolves to an exact prefix/path.

Then add fail-closed validation and a round-trip reconstruction test before any generic producer may set `replayable`.

Do not serialize beam continuations as a shortcut.

## 5. Implementation ordering

These investigations are independent of solver-workstream scientific priority. For infrastructure implementation cost, the natural order is:

1. **reason-count pilot**: existing typed counters make this the cheapest;
2. **beam counter-only flow pilot**: vocabulary exists, compact counter path still needs implementation;
3. **replayability contract hardening**: pure data/reconstruction semantics before broader rich capture;
4. **progress-over-work pilot**: widest cross-search instrumentation surface and therefore the most likely to need careful performance work.

That order is an engineering-cost ordering only, not a claim about which scientific question is most important.

## 6. What this audit closes

The repository no longer needs an open-ended investigation into whether useful seams exist for these four areas.

What remains is bounded implementation/measurement:

- progress: implement and benchmark a small checkpoint/transition observer;
- reasons: wire existing diagnostics at attempt scope and measure;
- beam flow: implement counter-only accounting and compare with rich observer;
- replay: define/validate a reconstructable source descriptor and round-trip it.

Those should be treated as explicit instrumentation pilots with parity and overhead gates, not as prerequisites to every solver run today.
