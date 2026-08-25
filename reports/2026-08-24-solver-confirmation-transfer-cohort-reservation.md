# Solver confirmation/transfer cohort reservation

> **Status:** active
> **Last evidence:** 2026-08-24 — current confirmation/transfer protocol, stress-corpus contract, and `generate-random.mjs` v1.1.0 generator interface
> **Decision:** reserve the first broad-confirmation and transfer-envelope cohorts now, before any next candidate is frozen or any cohort levels/outcomes are generated/inspected
> **Remaining gate:** when the next selected treatment is ready, freeze its candidate/work/acceptance contract, materialize `confirm-broad-001`, run the frozen comparison, and record the verdict before exact failure inspection; materialize/use `transfer-envelope-001` only after confirmation succeeds
> **Evidence role:** discovery / protocol instantiation
> **Selection:** prespecified before cohort materialization or candidate outcomes
> **Manifest:** [`stress/managed-evaluation-populations-2026-08-24.json`](stress/managed-evaluation-populations-2026-08-24.json)
> **Protocol:** [`2026-08-23-solver-confirmation-transfer-protocol-design.md`](2026-08-23-solver-confirmation-transfer-protocol-design.md)

## Why reserve rather than generate now?

The protocol's missing piece was not another discussion of holdouts. It was a reproducible population identity that exists **before** the next treatment is selected and inspected on it.

Generating the levels now would add no decision value and would make accidental inspection easier. `generate-random.mjs` is deterministic from its generator version, source commit, mode, count, and master seed, so reserving those inputs is sufficient to define the population reproducibly while keeping exact level identities unmaterialized.

This is intentionally process-light. There is no new holdout service, database, secrecy layer, or workflow framework.

## Reserved populations

### `confirm-broad-001`

- role: broad independent confirmation;
- exposure: `LOCKED`;
- size: 256 independent generated levels;
- generator: `scripts/stress/generate-random.mjs`, version `1.1.0` at source commit `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`;
- generator mode: ordinary uniform-random raised-caps mode, matching the Corpus-2 generation philosophy but with a fresh master seed;
- master seed: `2026082417`;
- IDs on materialization: `C00001` onward;
- outcome conditioning: none;
- selection: every generated row, with no baseline-failure filtering and no post-hoc candidate-specific exclusion.

Materialization command:

```bash
node scripts/run-bundled.mjs scripts/stress/generate-random.mjs \
  --count=256 \
  --master-seed=2026082417 \
  --id-prefix=C \
  --out=tmp/managed-evaluation/confirm-broad-001.json
```

This cohort answers the broad question: does a candidate selected on the existing development populations retain its solve/work effect on an untouched sample from the solver-blind generated distribution?

### `transfer-envelope-001`

- role: transfer/challenge;
- exposure: `LOCKED`;
- size: 256 independent generated levels;
- generator: same source/version, but `--envelope-caps` mode;
- master seed: `2026082429`;
- IDs on materialization: `T00001` onward;
- outcome conditioning: none;
- selection: every generated row, with no baseline-failure filtering or post-hoc exclusion.

Materialization command:

```bash
node scripts/run-bundled.mjs scripts/stress/generate-random.mjs \
  --envelope-caps \
  --count=256 \
  --master-seed=2026082429 \
  --id-prefix=T \
  --out=tmp/managed-evaluation/transfer-envelope-001.json
```

This is a modest but real distribution shift. It uses the same solver-blind witness-first generator while restoring mechanic caps to the shipped/editor envelope rather than Corpus 2's deliberately raised stress caps. It therefore tests something stronger than another exact Corpus-2 sample without pretending to be human-authored transfer evidence.

## Why 256 + 256?

This is a reservation, not a claim that 256 is universally sufficient for every future effect size.

The choice deliberately balances three considerations:

1. large enough that a material several-percent solve-rate change is not represented by only one or two levels;
2. small enough that the first lifecycle does not turn confirmation into another multi-hour giant-corpus ritual by default;
3. power-of-two cardinality makes sharding and paired accounting simple if/when these cohorts are materialized.

The **candidate acceptance rule still must be frozen before the run**. If development evidence implies an effect too small for this population to decide credibly, the right response is to reserve a larger fresh successor before inspecting outcomes, not to keep querying this cohort until something looks convincing.

## Exposure contract

At this commit the two populations remain `LOCKED` because:

- their exact level files have not been generated into the repository;
- no baseline or candidate solve outcomes exist for them;
- no per-level identities/features/traces have been inspected for treatment design.

The seeds and generator recipe are intentionally recorded publicly for reproducibility. Merely knowing the deterministic recipe does not make the cohort development evidence; reconstructing/inspecting its rows for candidate design would.

Before any decision-bearing run, record the candidate freeze contract required by the protocol: solver commit, treatment/config, work envelope, objective, paired gain/loss rule, correctness criteria, acceptable work tradeoff, pass/fail/inconclusive rule, and how many alternatives were tried in development.

For `confirm-broad-001`:

1. materialize only after candidate freeze;
2. run the frozen treatment/control comparison;
3. record the verdict before exact failure inspection;
4. exact rows may then be unsealed for diagnosis;
5. if those details influence redesign, change exposure state to `DEVELOPMENT` and reserve a successor for the redesigned candidate.

For `transfer-envelope-001`:

1. do not use it to select among candidates;
2. materialize only after the candidate survives broad confirmation;
3. prefer aggregate verdict visibility first;
4. unseal exact rows only after the transfer verdict is frozen;
5. reclassify if failures influence redesign.

## What this does not instantiate

No residual-confirmation cohort is reserved yet. That population is only needed for an explicitly conditional hard-tail question such as scheduler continuation value among fresh baseline failures. Its membership requires a **future frozen baseline commit/work contract**, so reserving a failure-conditioned set before that contract exists would be backwards.

Likewise, no family-confirmation cohort is reserved. The next likely decision-bearing treatments are scheduler/configuration/restart/beam policies selected from existing development evidence, not a treatment whose independent unit is a variant parent family.

## Relationship to existing corpora

Existing Corpus 2, census cells, regressions, and envelope data remain development evidence for current research because they have already been repeatedly inspected and used to choose hypotheses.

These reservations do not relabel or sanitize them. They create new population identities with fresh seeds and an explicit exposure lifecycle.

## Decision consequence

Queue Priority 2 is no longer blocked on defining what the first populations should be. Two deterministic cohorts are now reserved and `LOCKED`.

The remaining work is operational and candidate-dependent:

- freeze the next selected treatment;
- materialize and use `confirm-broad-001` once;
- if it passes, use `transfer-envelope-001` once;
- record exposure transitions and replenish after unsealing/design influence.

A permanent `docs/solver-evaluation-populations.md` authority is still premature. The existing protocol explicitly requires at least one real lifecycle before promoting the mechanism into durable documentation.
