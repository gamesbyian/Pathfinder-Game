# Prune-gap witness identity provenance gap

**Date:** 2026-09-09  
**Status:** confirmed evidence-replay integrity gap; fix before generalizing prune-gap replay across representative solution basins.

## Finding

`scripts/stress/prune-gap-probe.mjs` constructs each `prune-gap-*.json` atlas by walking `(raw.hintRecords || [])[0]?.path`. Branch rows are keyed by `step`, `from`, and alternative move, but the persisted artifact does not record the actual solution path, exact path signature, hint identity, or provenance used to generate those step labels.

`scripts/stress/offline-replay-harness.mjs` later reads the atlas and independently chooses `(raw.hintRecords || [])[0]?.path` from the **current** corpus, then reconstructs solver state by step and applies the historical branch rows.

Those two first-hint selections are only equivalent if the first stored hint for the level has remained the same path and ordering since the atlas was generated. Hint accumulation, merge/reconciliation, import, dedup, or curation can change the first record without changing the level id. If that happens, branch labels can be replayed against a different trajectory while still looking structurally valid to the harness.

This is an evidence-provenance problem, not evidence that any existing report is wrong. Existing prune-gap artifacts need to be checked before decision-bearing reuse.

## Required repair

For newly generated atlases, persist enough witness identity to make replay self-contained and verifiable, preferably:

- artifact schema version;
- exact packed solution path, or an immutable path reference plus exact path signature;
- exact path signature even when the full path is stored;
- level revision/fingerprint where available;
- enough hint provenance identity to explain why that path was selected when selection is not explicit.

The replay harness should prefer the persisted path. For legacy atlases with no witness identity, it should explicitly enter a compatibility mode and either:

1. verify that the current candidate witness reproduces every recorded `from` position at every recorded step before evaluating probes; or
2. refuse decision-bearing replay when that verification cannot be established.

It must never silently assume that the current first hint is the historical witness.

## Relation to the hint/provenance program

This blocks a naive replacement of `hintRecords[0]` with the new representative-hint selector inside `offline-replay-harness.mjs`: the CP-SAT branch labels belong to the path used by the upstream producer, so changing only the consumer would make the mismatch worse.

The broader representative-basin work should instead:

1. make path identity explicit in producer artifacts;
2. regenerate or validate bounded atlases as needed;
3. then allow deliberate representative-path/basin selection at atlas-production time;
4. carry that identity through every replay consumer.

`winning-path-analysis.mjs` does not consume path-specific historical branch labels, so it can adopt representative-hint selection independently.

## Next gate

A checkout-capable agent should implement the producer/consumer migration with legacy-artifact tests, audit the checked-in `prune-gap-*.json` files for recoverable witness identity, and update `docs/solver-offline-replay-harness.md`. Do this before using the harness for all-known-basins first-loss analysis.
