# Solver batch fixed-cost measurement 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — GHA run 35562250904 measured validation, normalization, and prepLevel fixed costs on current code.
> **Decision:** Parser/normalization speed is closed as meaningful optimization; prepLevel is measurable but only a high-multiplicity reuse candidate.
> **Remaining gate:** Use solve-relative measurements to determine whether repeated prep cost is large enough for a compile-reuse prototype.
## Question

How much wall time does the current level-shaped fixed pipeline consume before ordinary search?

Measured separately:

1. raw schema validation;
2. normalization;
3. `prepLevel()`.

The probe intentionally ran with search disabled so this first ceiling measurement did not require an expensive solver batch.

## Protocol

Tool:

`scripts/solver-batch-cost-probe.mjs`

Execution used the bundled solver runtime under Node 20 on GitHub-hosted Ubuntu.

Populations:

- published: all 160 levels, 10 repeats;
- Corpus 1: stride-5 selection; the corpus yielded 21 selected rows, 10 repeats;
- Corpus 2: 200 stride-5 rows, 10 repeats.

Nested timing perturbs tiny stages. Interpret order of magnitude and repeated distributions, not sub-percent differences.

## Results

| Population | Stage | n | median ms | p90 ms | max ms | total measured ms |
|---|---|---:|---:|---:|---:|---:|
| published | validation | 1,600 | 0.0128 | 0.0268 | 0.9288 | 27.793 |
| published | normalization | 1,600 | 0.0074 | 0.0153 | 0.2727 | 13.993 |
| published | `prepLevel` | 1,600 | **0.5088** | **1.2938** | 8.2991 | **1,117.831** |
| Corpus 1 | validation | 210 | 0.0325 | 0.0693 | 0.5811 | 8.977 |
| Corpus 1 | normalization | 210 | 0.0184 | 0.0325 | 0.2610 | 4.943 |
| Corpus 1 | `prepLevel` | 210 | **1.1221** | **2.2096** | 5.8648 | **272.228** |
| Corpus 2 | validation | 2,000 | 0.0265 | 0.0444 | 0.8616 | 61.535 |
| Corpus 2 | normalization | 2,000 | 0.0127 | 0.0218 | 0.4000 | 28.537 |
| Corpus 2 | `prepLevel` | 2,000 | **1.6405** | **3.0366** | 20.2422 | **3,716.590** |

## Immediate interpretation

### Validation and normalization are not meaningful speed targets

Their median costs are measured in hundredths or thousandths of a millisecond.

On one complete published-corpus pass, dividing ten-repeat totals by ten gives approximately:

- validation: 2.78 ms total;
- normalization: 1.40 ms total.

On the sampled 200-row Corpus-2 pass:

- validation: 6.15 ms total;
- normalization: 2.85 ms total.

Even perfect elimination would not materially alter the human research loop.

**Disposition:** close parser/tokenization/normalization speed as a near-term optimization lane. Keep representation questions only where they change search, reuse, memory locality, or abstraction power rather than ingestion cost.

### Preparation is measurable but modest

`prepLevel()` dominates fixed cost:

- published median: 0.51 ms;
- Corpus 1 median: 1.12 ms;
- Corpus 2 median: 1.64 ms;
- Corpus 2 p90: 3.04 ms.

This is enough to matter when the same level is compiled tens or hundreds of times, but it is not remotely large enough to explain multi-second/minute hard-solve latency by itself.

### Per-pass compile ceiling

Using measured totals / repeats:

- one 160-level published pass spent about **111.8 ms** in `prepLevel`;
- one 21-row Corpus-1 sample pass spent about **27.2 ms**;
- one 200-row Corpus-2 sample pass spent about **371.7 ms**.

Thus an exact same-level compile-once implementation can save at most roughly these amounts for each additional identical compile pass over those populations, before cache/context overhead.

For example, on the measured 200-row Corpus-2 sample, 100 identical experiment passes would contain about 37 seconds of preparation work in total. That can be worth removing in a high-multiplicity research batch, but only if the accompanying search cost is not orders of magnitude larger.

## Consequences for the audit

### Lane A1 — validation/normalization

**Closed low ceiling for speed.**

Do not invest in:
- alternate raw token formats;
- binary level serialization for runtime speed;
- normalization caches for ordinary solving;
- parser micro-optimization.

These may still have correctness/storage reasons, but this audit has no speed case for them.

### Lane A2 / B1 — compiled-level reuse

**Narrowed, not closed.**

The architecture seam is real, but its value is now specifically:

- repeated exact same-level queries;
- many-experiment ablation batches;
- repeated reqLen-point runs;
- perhaps persistent worker caches when query multiplicity is very high.

It is not a likely hard-tail solve-time breakthrough.

### Dense/native representation

These numbers do not address hot-loop memory locality. A true solver-native dense representation remains a separate search-runtime question, not an ingestion optimization.

### Presolve

These numbers increase the relative interest of presolve.

A one-time 1-3 ms static analysis that removes seconds of downstream search can easily dominate compile-reuse savings. Therefore the audit should compare new compile work against **search removed**, not merely against current prep cost.

## Follow-up required before implementation

A second bounded measurement should relate fixed prep cost to actual fixed-work solve wall time on:

- published/many-short workload;
- hard Corpus-2 workload.

This will tell us the percentage ceiling for compile reuse under realistic search.

If prep share is tiny even in many-short solves, retain the `CompiledLevel / SolveContext` architecture as a future cleanliness/reuse seam but do not refactor production for speed.

If the share becomes material in high-multiplicity short solves, prototype only inside the ablation runner first.

## Research-system implication

The original "can the level object be reformatted/tokenized so the solver digests it faster?" question has now been split empirically:

- **raw digestion:** negligible;
- **static solver compilation:** measurable but small;
- **search-space digestion / presolve / reuse:** still potentially large.

The audit should therefore move its center of gravity away from serialization and toward avoiding repeated or unnecessary combinatorial work.
