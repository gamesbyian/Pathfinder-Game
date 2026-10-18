# PG-I: prospective current-code resistant-parent exposure 003

> **Status:** active
> **Last evidence:** 2026-10-18 — current main 45efe88b86b9e5cbee60c9aebabbe946d7341a64, historical source blob `bd6dfaa1c3b585824036c2798fddf23502baef35`, independent source-selected 12-parent freeze `reports/stress/pg-i-resistant-parent-20261018-frozen-selection.json`.
> **Decision:** run a bounded **current-code exposure pilot** on twelve independent previously untested Corpus-2 parents, using the same five isolated technique identities and 10M canonical work per method as PG-I's earlier six-family pilot. The historical 50M-node labels nominate parents but cannot be treated as comparable failures.
> **Remaining gate:** retrieve the exact one-shot `pg-i-resistant-parent-exposure-20261018.yml` verdict; verify full 60-cell coverage, referee validity, work participation, no deadline truncation and individual parent-level technique-success vectors before choosing any successor.
> **Research question:** `WS2-VARIANT-RESPONSE-HARDNESS`
> **Premise refs:** `P113`, `P144`, `P145`, `P199`
> **Evidence role:** discovery
> **Selection:** historically baseline-unsolved and no *recorded* isolated T1 success in the 32240161854 epoch; remaining candidates ranked by an outcome-blind fixed salted ID hash, excluding already heavily examined PG-I/PG-L/PG-G parents.
> **Population identity:** 12 unique frozen `corpus2` IDs, hash ranks and expected current corpus SHA-256 in `reports/stress/pg-i-resistant-parent-20261018-frozen-selection.json`; 625 eligible source candidates after exclusions.
> **Selection history:** original Corpus-2 witness-first generation followed by historical solver-outcome selection, historic 50M-node capability census, then deterministic hash rank. **This is not untouched confirmation** or a population prevalence sample.
> **Inference scope:** conditional current-code five-technique solve/non-solve at exactly the recorded dose on twelve independently selected historical nominees. No production rescue rate, all-method impossibility, or new future-level generalization.

## Why this run is justified

[PG-I 002](2026-10-18-pg-i-retained-resistant-parent-reservoir-audit-002.md) retained 635 old production-unsolved, no-recorded-T1-success parents. That source says nothing conclusive about whether every isolated technique was actually executed at full comparable cost: 32240161854 had a still-partial shard, its coverage projection lists only successful technique IDs, and its 50M-node cap is not cross-technique comparable. The separate epoch 33717910218 reports **611** no-success baseline-unsolved rows but its committed `level-technique-coverage.json` is a **zero-byte file** (Git blob `05ebb8dada44030fbb679c9efd94a465f76d929f`). Neither summary creates a comparable attempted-cell matrix.

The old attempted-cell reconciliation remains unresolved for *historical inference*. Instead of pretending this blocks **every possible independent current-code measurement**, this pilot treats the old evidence solely as a discovery frame and produces a self-contained current equal-work measurement on twelve parents. This is a deliberately small, genuinely new prospective observation, not a reconstructed comparable two-epoch join or an answer about historical hardness prevalence. No extra historic missing cell is interpreted as a failure.

## Frozen execution

Source: old coverage Git blob `bd6dfaa1c3b585824036c2798fddf23502baef35`; current raw Corpus-2 SHA-256 `d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb`.

Exactly twelve parent IDs, before looking at current outcomes:

`R03031`, `R00044`, `R02166`, `R03287`, `R00449`, `R02160`, `R02550`, `R01351`, `R02839`, `R03092`, `R02701`, `R02108`.

The frozen selection source records all twelve hash ranks and excluded prior microscope/co-dispatch parents. The planner verifies the old coverage content as an exact Git blob, independently recomputes candidate ranking, validates the raw corpus SHA-256, resolves all twelve literal current corpus positions exactly once, and emits the same 60 frozen cells consumed by three read-only shards.

Each parent's five measured methods are exactly the original October response-pilot roster: standard repair; width-5000 objective-first beam; width-5000 intersection-harvest mechanic-bucket beam; default DFS; and no-tie-break admissible-order. Every isolated method gets `workBudget=10000000`, `budgetMs=600000`, through the existing `scripts/technique-census.mjs` shared executor. The strict per-attempt work cap already applies to admissible-order; the canonical referee validates any successful path. This is *isolation*, not an additive 50M-work portfolio or a change to the ordinary ~250k production allocation.

A 100k-work execution-family canary on all five method identities precedes the main 60-cell pass. All source plan and cell artifacts are retained from the branch-exact push. No hint is read or written, no cold policy consumes parent IDs or old results, and any newly found path remains evidence-only until the usual provenance/harvest treatment is reviewed.

## Preregistered possible outcomes

- **One or more referee-valid current-code wins:** preserve each exact parent/method/path/work record; historical no-recorded-T1-success has been concretely falsified as current five-method robustness for those cases. This is a *cold method solve under 10M work* on a historically unsolved parent, not automatically a fresh production-ladder rescue at near-typical 250k work. Next inspect the method's *actual* useful work, production participation and simple cheap trigger before any cold ladder experiment.
- **At least one completely measured all-five-non-success parent:** positive current-code robust-hard **at this 10M work dose only**; nominate the smallest controlled transformations on two or three such independent parents, not another broad 96k-family campaign. Test whether tiny changes flip method identity; don't infer UNSAT.
- **No fully measured all-five-non-success parents:** tested reservoir slice does not supply current robust-hard opportunity; stop expansion unless a materially different nomination mechanism earns it.
- **Incomplete rows, no actual work, timed-out/unsupported, mismatch or invalid referee path:** preserve the rows and classify observability/fidelity failure; never upgrade missing data to measured non-success. Fix only the smallest source/CLI issue if it invalidates the intended 12-parent test.

Any later current-production comparison must be at **one shared `workSpent` envelope**, with a direct 250k control and current-input-only treatment; isolated method success at 10M is not that comparison.

## Lifecycle / stopping rule

This one-shot workflow is artifact-only and branch-scoped. Once the exact successful or negative scientific result has permanent machine evidence, dated interpretation and canonical queue/question joins, remove the temporary GHA wrapper, lifecycle registration and unused one-shot code or explicitly retain only the minimal reusable tested analysis primitive. Do not rerun failed shards merely to chase a green badge without investigating source correctness. This work does not supersede ongoing independent PG-L #2196.
