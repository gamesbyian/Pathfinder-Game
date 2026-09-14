# Solver corpus selection provenance

> **Status:** current evidence-interpretation authority for selection history of standing stress populations.
> **Population structure:** [`../reports/2026-09-13-stress-corpus-selection-history-reconstruction-audit.md`](../reports/2026-09-13-stress-corpus-selection-history-reconstruction-audit.md).
> **Machine classification:** [`../scripts/corpus-selection-lineage.mjs`](../scripts/corpus-selection-lineage.mjs).
> **Evidence roles:** [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).
> **Generation/workflow contract:** [`../data/stress/README.md`](../data/stress/README.md).
> **Historical re-evaluation:** [`../reports/2026-09-13-historical-evidence-reevaluation-ledger.md`](../reports/2026-09-13-historical-evidence-reevaluation-ledger.md).

Generation provenance and population-selection provenance answer different questions.

- **Generation provenance:** how a level was constructed, by which generator/source, seed, batch, and mechanism.
- **Selection provenance:** why a generated level was retained, removed, migrated, grouped, promoted into a corpus, or selected into an experiment.

A row can be solver-blind at generation time and still be solver-outcome-selected later. Do not use the former claim to erase the latter.

## Standing-corpus correction

The current corpus names are downstream historical containers, not clean statistical source labels.

### Corpus 1

Current Corpus 1 has 102 rows:

- 23 retained A-F generator-1.0.0 rows;
- 79 `random-uniform-v1` rows from the original 2,000-level random corpus.

Those 79 are not an arbitrary random subset. PR #1182 on 2026-07-10 selected 300 random rows because the then-current solver solved them and migrated them into Corpus 1. The 2026-07-11 square-grid cleanup later retained 79 of those rows.

Therefore **whole Corpus 1 is not cross-generator evidence against Corpus 2**. Its 79-row majority shares the random generator family and an explicit historical solver-success selection event.

### Corpus 2

The 2026-07-10 migration left 1,700 original random rows specifically because the then-current solver returned unsolved/timeout on them. The 2026-07-11 square-grid cleanup retained 328 of those rows and replaced 1,372 non-square rows with newly generated square rows.

Thus current Corpus 2 is temporally heterogeneous:

- 328 old rows from a solver-negative complement;
- 1,372 later replacement rows not selected by that original solver outcome.

The cleanup's append generator preserved every survivor and continued numeric IDs after the highest retained row, `R01997`; **`R01998` is the first replacement ID**. That historical identity cut is the durable machine-readable separator used by `scripts/corpus-selection-lineage.mjs`. It is preferable to copied per-row generation timestamps, which do not encode later curation, and to a moving `current row count - 1372` position boundary, which would change after future appends. The ordinary corpus-query test guards that the standing corpus still resolves to the independently reconstructed 328 / 1,372 split.

Corpus 2 remains an excellent large development/capability laboratory. It is not one prospective untouched sample merely because all rows share a filename and broad generator family.

## Historical transfer correction

The 2026-09-03 `portfolio-18-tranche-v2` experiment described all 102 Corpus-1 rows as a clean different-generator transfer population. Reanalysis of its preserved per-level artifacts shows:

| Arm | genuine A-F 23 | migrated random 79 | all 102 |
|---|---:|---:|---:|
| full-menu | 22 solved | 71 solved | 93 solved |
| flat-2m | 22 solved | 69 solved | 91 solved |
| tranche-v2 | 22 solved | 71 solved | 93 solved |

On the genuine A-F stratum, tranche-v2 and full-menu have identical coverage but tranche-v2 spends **29.92% more aggregate work**. Its whole-C1 **7.12% work saving** is supplied by the migrated random stratum, where it saves **11.73%**.

Therefore the historical statement that tranche-v2's no-regression/work-saving property transferred to a genuinely different generator is superseded. The run remains valid development/forensic evidence; its population-role premise failed.

## Rules going forward

1. Do not infer evidence independence from a corpus filename.
2. When a population was curated by solver outcome, residual status, difficulty, novelty, or another measured response, record that selection mechanism alongside generation ancestry.
3. For existing C1 analyses, stratify A-F versus migrated-random rows whenever generator independence matters.
4. Do not use whole C1 as a cross-generator transfer source.
5. For broad transfer claims, prefer a materially independent current construction/source such as topology composition or genuinely independent human/editor material, with treatment outcomes untouched during selection.
6. Freeze exact level content and source revision for decision-bearing runs. A mutable corpus name is not sufficient historical identity.
7. Treat the July-10 solve/fail split as historical selection evidence, not a runtime solver feature. It must never steer cold production solving.
8. In every decision-bearing report, state separately **what happened on the tested rows** and **what the population is entitled to support as an inference**. A corrected evidence role can narrow an old claim without erasing its exact solve/work observations.

The correction does not change the project's operational objective: every current stress-corpus solve still counts. It changes only what aggregate corpus outcomes are scientifically entitled to prove.