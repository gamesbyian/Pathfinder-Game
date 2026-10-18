# Strict 250k cold-control crossing forensics (PG-I, 2026-10-18)

> **Status:** active
> **Last evidence:** 2026-10-18 — corrected frozen 12-parent run 39171380197, artifact 12152751142, execution commit a2ca855dcc643f07c316261277368369939591ac
> **Decision:** all 12 historical strict controls exceeded their 250k work budget; most excess work occurred in subsequent nominally budget-starved attempts, so both crossing and post-exhaustion work must be prevented. No existing record becomes a source-exact 250k A/B control.
> **Remaining gate:** qualify PR #2203 and rerun exactly these frozen 12 cold production controls at strict 250k from its fixed source; require 0 actual work overshoots, no deadline/attempt-error misclassification, and referee-valid solutions if any.
> **Research question:** `WS2-VARIANT-RESPONSE-HARDNESS`
> **Evidence role:** forensic
> **Selection:** original PG-I 12 selected before the current 250k solver observations using its frozen source-historical hardness cohort
> **Population identity:** sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb
> **Selection history:** 625 historically baseline-unsolved, no-recorded-T1-success candidates after explicit exclusions; FNV-1a/avalanche frozen hash ranked first 12, not an unselected distribution estimate
> **Inference scope:** exact attempt-level accounting on the original twelve source-identified cold controls only; no claim about general solve prevalence or exact per-primitive first charge

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"active","lastEvidenceDate":"2026-10-18","decision":"For all twelve 250k strict cold controls, most overshoot was billed by later attempts after the first budget crossing. Keep exact-cost comparison blocked until fixed source-accurate replay.","remainingGate":"Exact-source fixed strict-250k rerun of twelve frozen parents, with no actual overshoots and correct censoring/referee outcomes","joins":{"researchQuestion":"WS2-VARIANT-RESPONSE-HARDNESS","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb","selection":"prespecified historical-hardness frozen 12 of 625 after exclusions","inferenceScope":"original PG-I cold control attempt-level work accounting"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-i-strict-250k-fixed-control-20261018.json"],"successors":{"questions":[],"artifacts":[]},"prospective":{"expectation":null,"surprise":"Most strict overshoot accrued in subsequent attempts already marked budget-starved","anomaly":"strict work 250k controls overshoot"}} -->

The frozen twelve-parent roster is `reports/stress/pg-i-resistant-parent-20261018-frozen-selection.json` at PR #2201. The population identity above is the source corpus digest, with the exact parent selection pinned separately by that roster.

## Source and calculation

- Recorded solve source: `68cb6c11198585bbcacd10ccc39cd1d45b93bc22`; original production control run [39128573753](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39128573753), artifact ID `12136733835`, member `production-control-250k.json` (132,892 bytes uncompressed). It was recovered and decoded as published, without rerunning solver or changing selection.
- Each row has `attemptStatuses[].workSpent` and `workSpent`. For every parent, the sum of all attempt charges equals the top-level total exactly. Let `i` be the **first attempt** with cumulative charged work strictly above 250,000. `first-crossing-excess = cumulative[i] - 250000`; `subsequent-work = sum(attempt.workSpent for attempts after i)`. This cannot resolve the exact *primitive charge* within attempt `i`.
- Only attempts with positive work after `i` appear in the subsequent-attempt count. Every one of these positive-work attempts carries outcome `budget-starved`.

| Frozen parent | First crossing attempt (1-based) | First-crossing excess | Later positive-work attempts | Subsequent work | Total overshoot |
|---|---:|---:|---:|---:|---:|
| R03031 | 1 | 11 | 12 | 4,902 | 4,913 |
| R00044 | 1 | 57 | 30 | 12,655 | 12,712 |
| R02166 | 1 | 55 | 36 | 15,049 | 15,104 |
| R03287 | 1 | 186 | 12 | 4,674 | 4,860 |
| R00449 | 1 | 17 | 30 | 13,397 | 13,414 |
| R02160 | 1 | 101 | 12 | 4,117 | 4,218 |
| R02550 | 12 | 1,629 | 25 | 9,307 | 10,936 |
| R01351 | 1 | 23 | 12 | 5,360 | 5,383 |
| R02839 | 23 | 306 | 23 | 7,923 | 8,229 |
| R03092 | 34 | 95 | 64 | 21,160 | 21,255 |
| R02701 | 1 | 3 | 25 | 10,534 | 10,537 |
| R02108 | 1 | 14 | 10 | 3,983 | 3,997 |
| **All 12** | **9 first-attempt crossings** | **2,497** | **291** | **113,061** | **115,558** |

**97.84%** of these 115,558 excess charged units occurred in *later* positive-work attempts after the crossing attempt. They were not merely the few work units lost within the one first over-budget atomic group. Some later attempts did hundreds of genuine charged units each while carrying a `budget-starved` outcome. This is an **observed accounting fact**, not a claim that the attempt outcome classification caused the charge.

## Mechanism and safe disposition

The source has two canonical charge sites: `applyMove` (+1) and `isConnected` (+12). Search techniques check `prep._workCap` at coarser boundaries. A post-cap dispatch can still enter such a batch and charge work before checking its budget; an attempt being *classified* as `budget-starved` never prevented the work itself. Narrow whole-solve atomic charge refusal before the two charge sites addresses **both** observed failure classes without requiring changes to search ordering or unsafe retroactive arithmetic.

This forensics cannot identify the original first violating instruction, because the original artifact contains attempt totals rather than primitive-event traces. Source instrumentation or controlled replay is required for that finer causal claim. The candidate correction is [draft PR #2203](https://github.com/gamesbyian/Pathfinder-Game/pull/2203), which isolates immutable atomic guarding to `SolveOpts.strictTotalWorkBudget`, leaving per-technique census caps and resumable beam portfolio tranches unchanged. Do **not** confuse their shared historical `_strictWorkCap` field with the proposed immutable `_atomicStrictWorkCap`.

The two PG-I 10M isolated method successes and the 12 historical 250k *no-solution trajectories* remain valid descriptive observations at their actual measured costs. **Zero new current-cold solves at 250k are established by this forensics.** No production promotion or queue takeover is authorized; the independent PG-I lane owns future candidate/scheduler conclusions.

## Corrected source-exact replay: 2026-10-18

The one-shot [PG-I strict-250k qualification run](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39171380197) succeeded on exact **execution source** `a2ca855dcc643f07c316261277368369939591ac` (PR synthetic merge commit). The frozen parent IDs, original corpus SHA, and one cold invocation per parent were checked; no hints or previous per-parent outcomes entered the solver. Full attempt-level JSON: artifact `12152751142`, ZIP SHA256 `0c00873213fa13b47dcd1fe12233d4222d9364a7f08c499d1ba22af76bd6cbc9`, `control.json` SHA256 `04b1909708591fc54614f193589f05c536e989e68ce65eafe04981eefe6b6fb2`.

The durable [twelve-row summary](stress/pg-i-strict-250k-fixed-control-20261018.json) records **12/12 actual workSpent = 250,000**, **0 overshoots**, **0 incomplete attempt-work sums**, **0 errors**, **0 deadline censors**, and **0 new cold production solves**. All 12 are measured no-success-at-250k observations, not proof of puzzle impossibility. Ten final statuses are `work-budget-reached`; two are `node-budget-reached` with exactly 250,000 work. Total metered work is 3,000,000. The previously observed 115,558 excess units are not present under this proposed fixed source.

This establishes **correct opt-in containment on the original failure cohort**, conditional on PR integration and separate continued regression tests; it does not establish 250k cold-solves or change the 10M isolated-path science. No production-default search allocations were changed. The one-shot workflow was retired after this result, leaving a source-pinned reusable CLI and the durable source-checksummed summary.
