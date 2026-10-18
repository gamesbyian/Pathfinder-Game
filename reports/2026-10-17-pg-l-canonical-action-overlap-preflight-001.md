# PG-L canonical isolated-beam action-overlap shadow preflight 001

> **Status:** active
> **Last evidence:** 2026-10-17 — prior cross-attempt overlap telemetry invalidated by missing canonical profile/root identity; no clean current paired action population survey. See [overlap archaeology](2026-09-13-solver-archaeology-overlap-restart-retention-006.md).
> **Decision:** authorize only an eight-parent read-only isolated-beam action-overlap canary using an existing audited `_beamResearchObserver` seam, strict observer-off parity and identical work envelopes. No new scheduler, cache or restart policy.
> **Remaining gate:** inspect observable overlap/exposure/economics and observer correctness before any larger independent-parent/matched-work consumer experiment.
> **Research question:** `WS2-CROSS-ATTEMPT-BASIN-OVERLAP`
> **Evidence role:** development opportunity sizing
> **Selection:** eight Corpus-2 parents selected without hints/outcomes by deterministic SHA-256 of literal seed plus current level ID, from corpus SHA-256 `d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb`; selection is resolved once before any action, and literal IDs plus selection hashes are emitted in the verdict. The first normalized gate is chosen only from the current level.
> **Inference scope:** isolated scoring-profile action overlap under one width-500, 150,000-work nominal dose on the same board/gate; neither a full production portfolio nor independent solves, nor a certificate-reuse proof.
> **Production effect:** none.

## Why this is materially different from retired overlap controls

[Historical archaeology](2026-09-13-solver-archaeology-overlap-restart-retention-006.md) found that previous `pairwiseStateOverlap` was broken when the attempt audit lost profile IDs and root-move scores: one version reported a mechanical overlap of one. The later divergence guard and restart canaries did not establish a general cross-attempt overlap verdict. PG-G's selected symmetry-order factorial makes the search-basin question causal but not automatically economical.

The new observer does **not** infer technique from a missing audit field. Each row captures literal parent ID, normalized prepared gate, the exact `objectiveFirst` or `intersectionHarvest` scoring profile, beam width, initial work cap, returned status, work spent and expanded nodes, plus a source commit. The two actions are ordinary independent `beamSearchFromGate` calls on **fresh prep state**, not callbacks that steer the live production orchestrator.

## Fixed miniature protocol

Use eight deterministic outcome-blind Corpus-2 parent IDs, the same single current-input gate and each of two frozen scoring profiles at `width=500`, nominal `150,000` canonical work and 600s wall safety ceiling (not a dose grant). For *each action*, perform one collector-OFF control and one otherwise identical collector-ON replay. Fail the experiment if *any* paired `status`, solved indicator, accepted path hash, canonical `workSpent` or `nodesExpanded` differs; the observer is not allowed to create false work savings or a different solve.

The observer receives real generated-stage parent-expansion records from the existing beam-research seam (`parentExpansions`), without modifying survivors or priority. On each arm it collects:

- full parent-path SHA-256 identity, including visited history; exclude raw/hint paths from emitted output;
- full-path hash counts at raw depth 8+, which excludes common shallow starting states;
- first-four and first-eight **path prefix** bucket hashes, used only as descriptive *basin/coarse trajectory markers*, never future-complete state keys;
- source-per-event parent-expansion work, counts, and a digest of all sorted exact-path hashes.

Between the paired scoring actions on each parent, compare exact processed parent identity set Jaccard, deep-path Jaccard, coarse prefix4/prefix8 bucket overlap and minimal matched parent-expansion work. The cost estimate is **descriptive**, not an amount known to be safely eliminable by caching; same prefix does not prove the same future proof or that avoiding it would preserve beam-frontier diversity. Every claim is parent-level, not a count of thousands of independent states.

## Frozen interpretation and stop gates

- If any observer parity mismatch, incorrect corpus SHA, canonical profile mismatch, wall truncation or missing gate occurs: **instrument-invalid**, never interpret overlap science.
- If few source expansions are observed, stop at a bounded opportunity result, not an empty-population negative claim.
- If full exact-parent overlap is negligible even when coarse prefixes share buckets, do **not** resurrect loose transposition caching or restarts from bucket similarity.
- If full-path overlap is material on independent parents, investigate which current expensive work/fact could *legally* be keyed and cheaply reused before designing an anti-redundancy consumer. PG-M remains closed on raw offline exact-query population overlap until typed same-invocation sound fact recurrence is actually observed.
- Even a strong descriptive overlap is **not** an earned cold-solve policy: a separate current-input selector/consumer, fixed aggregate work, representative no-harm cohort and independent confirmation are required before production A/B.

Source: `scripts/stress/pg-l-canonical-action-overlap-shadow.mjs`. A one-shot branch-only workflow is permitted for this canary, then retired before evidence integration. Preserve complete source-provenance hashes, per-parent arm results and the stable research question join. Do not reuse the observer as a recurring production telemetry producer without fresh overhead justification.
