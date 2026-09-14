# Stress-corpus population-validity audit

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — fresh 2,162-row population census, witness-free nearest-neighbour scan, generator-code review, corpus-history archaeology, and bounded decision-exposure genealogy over decision-bearing population records.
> **Decision:** keep the standing stress corpora as valuable challenge/development targets, but stop treating Corpus 2 or envelope as neutral samples of Pathfinder space. Preserve generator, retention epoch, selection history, treatment-lineage exposure, and claim scope when interpreting results.
> **Remaining gate:** none for generic population validity. The decision-exposure genealogy is complete at the level justified by current claims; purpose-specific symmetry/near-equivalence analysis remains available when a live decision needs it. See [`2026-09-13-decision-exposure-genealogy-audit-001.md`](2026-09-13-decision-exposure-genealogy-audit-001.md).

## Bottom line

The first 2026-09-13 corpus audit established identity, provenance, and invariant health. This follow-up asks the harder question: **what populations do the current corpora actually represent?**

The answer materially narrows their scientific interpretation without reducing their operational value.

Corpus 2 and envelope are broad *challenge distributions inside one dense witness-first construction grammar*. They are not neutral samples of player-authored or published Pathfinder levels. Published levels and the standing random corpora occupy visibly different structural regions: published levels are much shorter, sparser, less intersection-heavy, smaller, and use fewer mechanics at once. Static filters occur in published levels but are absent from all standing generated stress corpora.

This is not a defect for the project's primary objective of solving every stress level. It is a defect only when a stress result is allowed to imply more population coverage than the corpus actually supplies.

## Population census

| Population | Rows | Median reqLen | Median reqInt | Median required coverage | Median mechanic kinds | Sparse-low-intersection | Intersection-heavy |
|---|---:|---:|---:|---:|---:|---:|---:|
| Published | 160 | 30 | 2 | 0.354 | 2 | 45 (28.1%) | 11 (6.9%) |
| Corpus 1 | 102 | 77 | 4 | 0.670 | 4 | 1 (1.0%) | 58 (56.9%) |
| Corpus 2 | 1,700 | 97 | 5 | 0.752 | 5 | 0 | 1,302 (76.6%) |
| Envelope | 200 | 96.5 | 5.5 | 0.707 | 5 | 0 | 148 (74.0%) |

The grid distributions separate the populations further. Published content is concentrated around 8x8–12x12, especially 10x10. Corpus 2 and envelope are generated only at 11x11–15x15.

Mechanic support is also different. Published levels contain static filters on 27.5% of rows; the standing generated stress corpora contain none. Conversely, the random generator deliberately produces mechanic-rich rows: Corpus 2 has a median of five represented mechanic kinds and most supported mechanics appear on roughly half the rows.

Therefore “Corpus 2 is broad” should mean **broad within its declared challenge grammar**, not broad across legal or player-facing Pathfinder space.

## The retained population is not the proposal distribution

`generate-random.mjs` is solver-blind and removes deliberate heuristic targeting, but “uniform-random” describes only parts of proposal construction.

Each accepted row is conditioned on a substantial funnel:

1. an 11x11–15x15 square grid and a deliberately dense target witness length are chosen;
2. a random-walk witness must be successfully generated;
3. mechanics are requested from nominal presence/count priors;
4. requested mechanics must be placeable on geometry that keeps the witness referee-valid;
5. schema and structural checks must pass;
6. the construction witness must pass the referee; and
7. the candidate must clear a novelty threshold against published/C1/already-retained rows, with a lower fallback threshold after repeated attempts.

The current generator targets witness lengths at roughly 55–90% of raw grid area before obstruction effects. This alone explains why the retained random corpus is structurally dense compared with published content.

The mechanic priors are also geometry-conditioned. A nominal 55% presence coin does not imply an unconditional 55% mechanic distribution:

- MustCross needs genuine witness self-crossing cells;
- must-turn needs witness turns;
- surround needs rare off-path cells whose valid neighbourhood is already covered/impassable;
- portals are incorporated into witness construction;
- geese and false goals need only unused off-path cells.

Thus the witness grammar is itself a hidden mechanic/topology prior. Empirically many final C2 presence rates happen to remain near 55%, but that does not erase the geometry conditioning that determines *which forms* of each mechanic survive.

## Witness-grammar fingerprint

Among standing generated rows, the construction witnesses are themselves concentrated in a recognisable regime.

Corpus 2 has median witness unique-cell coverage of about 0.592 of grid area, median turn rate 0.56, median five self-crossing revisit events, and median endpoint closure ratio about 0.087. Envelope is very similar: median witness coverage about 0.575, turn rate 0.582, 5.5 crossing revisits, and closure ratio about 0.086.

That similarity is expected because envelope changes object caps, not the underlying witness-first grammar. It should therefore be treated as an **in-envelope stratum of the same construction family**, not as a proxy for ordinary player-level distribution.

## Comparable nearest-neighbour evidence

The audit uses `levelDistance` only after deliberately removing witness-only dimensions from **all** populations. Published rows do not carry construction witnesses, and mixing witnessed and unwitnessed distances would make the metric's effective weighting differ by pair. An initial version of this audit made that mistake; those results were discarded and the tool was hardened before conclusions were recorded.

With one comparable feature contract:

| Population | Median nearest within-population distance | Median nearest other-population distance | Dominant nearest-neighbour owner |
|---|---:|---:|---|
| Published | 0.164 | 0.274 | published: 147/160 |
| Corpus 1 | 0.229 | 0.192 | Corpus 2: 70/102 |
| Corpus 2 | 0.200 | 0.248 | Corpus 2: 1,593/1,700 |
| Envelope | 0.234 | 0.232 | envelope: 97; Corpus 2: 97 |

These are diagnostics, not independence coefficients. Still, the pattern is informative:

- published content forms a strongly self-neighbouring region distinct from the stress populations;
- Corpus 2 overwhelmingly self-neighbours;
- envelope is almost perfectly split between itself and Corpus 2, exactly what a same-family cap variant should look like;
- current Corpus 1 mostly neighbours Corpus 2, consistent with 79/102 retained C1 rows having later `random-uniform-v1` ancestry rather than old A–F ancestry.

No coverage-weighted solve score is introduced here. Raw solve count remains the operational objective. These descriptors are for interpreting *where* gains occur, not discounting solved levels after the fact.

## Temporal identity is more important than the corpus name suggests

Current corpus names conceal major population replacement.

On 2026-07-11 commit `063ada5c9b97a29a392865413e1d53630bf347f6` enforced square grids after discovering that both stress generators had independently drawn width and height even though shipped levels are square.

That change:

- cut Corpus 1 from 450 rows to 102 by deleting all non-square rows and not regenerating them;
- deleted **1,372** non-square Corpus-2 rows and regenerated 1,372 replacements through append mode, restoring the file to 1,700 rows;
- removed 19 of 24 then-pinned known-hard regression levels because they were non-square.

Therefore a historical statement about “Corpus 1” or “Corpus 2” before 2026-07-11 can refer to a materially different population even when the filename is unchanged. Reusable evidence should prefer a content hash/fingerprint plus commit/run identity over corpus name alone.

### The Corpus-2 wrapper is a hybrid history record

The current Corpus-2 wrapper preserves the original `generatedAt` (`2026-07-09`) and original `masterSeed` (`20260709`), records an append-history entry for 1,372 rows generated on 2026-07-11 with seed `20260711`, but exposes top-level `generationStats` of:

- attempts: 1,917;
- witness failures: 541;
- structural rejects: 4;
- novelty rejects: 0;
- fallbacks: 0.

Those stats describe the 1,372-row replacement episode: `1917 - 541 - 4 = 1372`. They cannot describe all 1,700 current rows.

So the wrapper is not merely “generation-time metadata”; after append it is a **hybrid of fields from different generation episodes**. Row provenance remains the ancestry authority. Future generated corpora should either record per-run stats inside append history or make top-level aggregate semantics explicit. Rewriting current corpus bytes is unnecessary for this audit.

## Envelope semantics need a narrower interpretation

Envelope is useful, but the phrase “levels players will actually encounter” is too broad if read distributionally.

What envelope establishes is narrower and cleaner: the same dense witness-first random construction family, constrained to documented shipped-game object-count maxima. It answers whether a capability depends on Corpus 2's deliberately raised object caps. It does **not** establish representativeness of published/human puzzle geometry, size, mechanic frequency, sparse regimes, or static-filter use.

The current evaluation authority already correctly classifies envelope as in-envelope challenge/confirmation rather than cross-generator transfer. This audit supplies the empirical population reason for that rule.

## Dependence and effective sample size

The first audit established zero exact structural duplicates. The present scan shows that this should not be translated into 2,162 independent observations.

Corpus 2 rows share one witness grammar, one generator family, common parameter ranges, common acceptance logic, and novelty selection against a rolling retained pool. Envelope shares almost all of that machinery. C1 mixes old deliberately selected batches with later random-uniform ancestry.

The nearest-neighbour results do **not** justify an invented “effective N.” They do justify keeping generator/family/retention strata visible when evidence volume is used rhetorically. “+20 rows” remains the correct operational solve count; “20 independent confirmations of a broad mechanism” may not be.

A deeper symmetry/near-equivalence clustering pass should be purpose-specific. Run it when a decision actually depends on whether a gain is spread across genuinely different structures, not as a standing ceremony.

## Research exposure: the naive measurement failed, the decision genealogy did not

A first attempt to estimate row-level research exposure by scanning reports/docs/workflows/scripts for explicit level IDs was rejected.

Generated aggregate artifacts contain large lists of corpus IDs, so raw mention counts make almost every C2 row look repeatedly “exposed” even when a file merely serializes a census population. That measurement cannot distinguish decision influence from bookkeeping.

This is a **measurement failure**, not evidence that every row has independently influenced solver design.

The follow-up [`decision-exposure genealogy`](2026-09-13-decision-exposure-genealogy-audit-001.md) therefore used decision-bearing experiment manifests/reports and treatment ancestry rather than mention counts. It asked whether outcomes from a population actually changed candidate design, thresholds, routing, stop rules or descendants before the same population was later given a stronger evidence role.

That pass found no second September-3-style population-role failure. Managed broad confirmations were genuinely fresh for the candidate that consumed them; spent/void cohorts are recorded as such; the topology challenge used an independent construction family after the candidate was frozen; the envelope reservation remains unmaterialized and untouched; later goal-attraction and six-seed confirmations explicitly exclude their candidate-specific development rows.

It did find one vocabulary defect worth preserving for the resource contract: two-phase control-failure residuals are **control-outcome-conditioned**, even though treatment outcomes remain unavailable during selection. That makes them valid **conditional confirmation**, not outcome-neutral populations. The old managed-population boolean/prose is too coarse to express this distinction cleanly.

A universal row-by-row exposure graph is still unnecessary. Broad C2 is already classified as heavily mined development data. Reconstruct deeper genealogy only when a future decision depends on proving that a particular stronger-role population is untouched for a particular treatment lineage.

## Consequences for solver research

1. **Keep optimizing the standing stress corpora.** They are the project's explicit mountain, and solving their rows remains directly valuable.
2. **Do not mistake challenge coverage for population representativeness.** C2 is an intentionally dense hard-distribution laboratory.
3. **Stratify gains when mechanism interpretation matters.** Sparse/general versus intersection-heavy, generator epoch, mechanic combinations, and published-like versus challenge-like geometry can reveal whether a gain expands capability or harvests one dense cluster.
4. **Use published/player-facing evidence for player-facing claims.** Stress success alone cannot establish that distribution.
5. **Use topology composition for genuinely different construction evidence only within its supported mechanic scope.** The present audit strengthens, rather than replaces, the existing transfer rules.
6. **Treat corpus name as insufficient historical identity.** Frozen experiments should record content hashes and commits/manifests.
7. **Record the variable that conditioned population selection.** Control failure, treatment success, stage reach, starvation, residual membership and ordinary fresh sampling are scientifically different forms of selection.
8. **Do not add a weighted solve objective by default.** The project's goal is solves. Coverage descriptors are secondary interpretation instruments, not a new scoreboard.

## Durable artifact

`scripts/stress/corpus-population-audit.mjs` is retained as a read-only population diagnostic. It reports population shape, mechanic support/co-occurrence, witness-grammar descriptors where construction witnesses exist, wrapper generation episodes, and witness-free comparable nearest-neighbour structure.

It intentionally does not run the solver, mutate corpus data, infer effective sample size, or fabricate a decision-exposure score. Decision-lineage exposure is separately recorded in [`2026-09-13-decision-exposure-genealogy-audit-001.md`](2026-09-13-decision-exposure-genealogy-audit-001.md).

This report should be read as Phase B of [`2026-09-13-stress-corpus-research-resource-audit.md`](2026-09-13-stress-corpus-research-resource-audit.md): Phase A established integrity/provenance plumbing; this phase establishes the narrower population claims those healthy files are entitled to support.