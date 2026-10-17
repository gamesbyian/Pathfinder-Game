# PG-K bounded exact-DEAD prefix segment-revision preflight 001

> **Status:** active
> **Last evidence:** 2026-10-17 — 75 exact-DEAD raw-prefix states across 25 independent Corpus-2 parents have previously retained oracle labels and accepted historical hint files; the existing Lane D same-interface splice machinery previously showed legal substitutions on LIVE paths, but not DEAD-prefix rescue.
> **Decision:** run one strictly offline, read-only, bounded *candidate construction + full-path native referee* test before claiming a repair mechanism or buying CP-SAT. It neither changes the production solver nor spends any solver work budgets.
> **Remaining gate:** evaluate the full frozen parent cohort. Preserve every referee-accepted novel complete patched path and the cases/cost of candidates with no accepted completion. Distinguish candidate construction, native solution evidence and unlabelled patched prefixes.
> **Research question:** `WS2-RESIDUAL-INTERFACE-COMMUTATIVITY-REVISION`
> **Evidence role:** discovery
> **Population identity:** all 75 exactly DEAD prefix cases from `reports/stress/class5-fresh-sibling-harvest-exact-labels-2026-09-17.json` across 25 Corpus-2 parent levels; source declares 0 alarms and CP-SAT INFEASIBLE for each case. Parent, not sibling, is the independent inference unit.
> **Selection:** entire frozen exact-DEAD population with no further label-dependent subset; historical accepted hints may nominate segments/suffixes offline, but may never enter a cold policy.
> **Inference scope:** feasibility of a very specific reference-guided, raw-length-preserving local revision followed by a reference-guided complete suffix, with at most 20 accepted hints and 256 geometry-hashed candidate prefixes per frozen DEAD case. No population cold-solve claim.
> **Production effect:** none.

## Exact question and stop boundary

Known accepted-solution segments can commute across shared interfaces in LIVE paths under the right constraints: 1,453/3,121 length-matched substitutions in the earlier experiment were valid complete solutions. Does the same narrow segment-substitution operation ever change an **exact-DEAD prefix** into a completed, independently referee-accepted path while preserving a substantial portion of that originally DEAD trajectory?

This is not a claim that the original prefix was secretly LIVE; every original case is CP-SAT-proved DEAD. It is not enough for a replacement prefix to look geometrically plausible, or for a patched completion attempt to fail under one available suffix. Only a completely referee-accepted path proves rescue; all other candidate fates stay **UNKNOWN**.

## Frozen selection and action

For each DEAD case, traverse up to 20 already accepted hints from the **same level**. Search for a hint segment with both endpoints matching two nodes of the DEAD prefix, length 3–12 raw transitions, with identical raw step count and different interior. Preserve at least four raw transitions at both the beginning and end of the original DEAD prefix. Rank distinct patched prefixes by stable SHA-256 of their raw geometry, outcome-blind, and inspect at most 256 per case. Splice at the patched prefix's endpoint any remaining suffix of an accepted historical hint on that level, then ask the canonical native PLAY referee whether that *entire candidate path* satisfies all mechanics and exact budgets.

Candidate proposal and completion reuse historical hints, so even a successful repaired path is **hint-assisted mechanism-discovery evidence, categorically not a new cold solve**. The rejoined complete candidate must differ from original DEAD prefix and must not be identical to an already stored hint. Preserve exact output paths if successful. Portal jumps may change game-counted path length despite fixed raw transition counts; only referee validation is authoritative. A failed complete candidate does **not** prove its revised prefix DEAD.

The bounded pilot is run through a one-shot branch-only workflow and `scripts/stress/pg-k-dead-prefix-commuting-revision.mjs`, with the exact-labelled input and corpus SHA-256 saved in the machine verdict. The first harness-only attempt failed before testing because it copied a historical reader import removed from the current code; the fixed implementation uses `readLevelCorpusDocumentWithHints` and must pass self-tests before reading experiment cases.

## Decision table

- **No applicable same-interface revision candidates:** close this retained-cohort constructor on opportunity; do not buy oracle calls.
- **Some candidates, zero accepted complete patched paths:** close only the *hint-suffix completion* formulation; use measured support/retained candidate coverage to decide whether any true prefix oracle is worth buying.
- **At least one complete accepted patched path:** retain full referee-valid path and its originating exact-DEAD prefix, classify the geometry/obligation change and ask whether a generic **solve-local** (no historical hint) candidate provider can construct comparable revisions. Any candidate policy still needs matched-work cold production A/B and independent parents before promotion.

Stop before CP-SAT, general repair code, or an unbounded candidate search. Never conflate accepted *alternate already-LIVE solution* swaps with actual DEAD-prefix revision, and never use retained outcomes/paths as a cold router.
