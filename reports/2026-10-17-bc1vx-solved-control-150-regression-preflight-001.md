# BC1-VX solved-control 150 regression: frozen paired promotion gate

> **Status:** concluded-positive
> **Last evidence:** 2026-10-17 — complete [15-shard GHA solved-control regression 39007506080](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39007506080), source `99f598eb73f263459e7107485a46279ce8ef002c`: 149/150 current control, 150/150 BC1-VX, one treatment-only gain R02401, zero attributable losses, aggregate work −3.748%.
> **Decision:** The prespecified historical solved-control 150 regression gate is **passed**: BC1-VX did not lose any currently solved control at the same 50M-node/67M-base-work production envelope and actually recovered R02401. This gate is supporting production promotion evidence; the run itself did **not** change the default flag.
> **Remaining gate:** integrate all paired evidence, decide explicit default-ON promotion with soundness/economics and generalization scope recorded, then pass full solver hot-path correctness, baseline and CI checks. Do not infer independent worldwide prevalence from historical solved controls.
> **Research question:** `WS2-CUT-BALANCE-PROJECTION`
> **Evidence role:** discovery
> **Selection:** existing frozen 150-ID historical solved-control cohort, selected for earlier unrelated regression before BC1-VX; not chosen by treatment response, but still existing Corpus-2 development evidence.
> **Population identity:** all 150 IDs in `data/stress/ws2-repair-deadline-solved-control-confirmation-150-ids.json`; corpus SHA `d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb`; cohort SHA `f7f9b81f4f40fef64e442f4f7cc09997dc81e6a5f3ce1bdd52d853952fec14a9`.
> **Inference scope:** no-regression among 149 *currently* solved controls, not unconditional 150/150 current control, transfer or broad rate.
> **Production effect:** none; `STRATEGY_BC1_VERTEX_VOLUME_PRUNE` stays default-OFF until separate explicit promotion.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-17","decision":"BC1-VX 150-row current-default paired solved-control regression is 149/150 control versus 150/150 treatment; zero attributable losses, one gain R02401 and 3.748% lower aggregate work. Completes the previously prescribed solved-control gate without turning the flag on.","remainingGate":"Explicit production promotion decision with full soundness/solver CI and any independent-sample/generalization gates respected.","joins":{"researchQuestion":"WS2-CUT-BALANCE-PROJECTION","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"all 150 IDs in data/stress/ws2-repair-deadline-solved-control-confirmation-150-ids.json; corpus SHA d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb; cohort SHA f7f9b81f4f40fef64e442f4f7cc09997dc81e6a5f3ce1bdd52d853952fec14a9.","selection":"existing frozen 150-ID historical solved-control cohort, selected for earlier unrelated regression before BC1-VX; not chosen by treatment response, but still existing Corpus-2 development evidence.","inferenceScope":"no-regression among 149 *currently* solved controls, not unconditional 150/150 current control, transfer or broad rate."},"claimRefs":[],"sourceArtifacts":["reports/stress/bc1vx-solved-control-150-paired-20261017-001.json","reports/2026-10-16-bc1vx-fresh-cold-solve-paired-screen-001.md"],"successors":{"questions":["WS2-CUT-BALANCE-PROJECTION"],"artifacts":[]},"prospective":{"expectation":"A sound cut/volume prune should not remove current solved controls and may reduce search work.","surprise":"One historically solved control R02401 currently fails default search but succeeds with BC1-VX, with no losses on 149 current controls.","anomaly":null}} -->

## Completed 150-row verdict

All 15 ten-level paired shards succeeded with **identical effective requests except the BC1-VX flag**, identical current corpus and previously frozen 150 IDs, the ordinary production scheduler (50M nodes / 67M base canonical work / additive retries), and referee validation on every successful path. The strict combiner verified exactly 150 unique rows and matching cohort/source hashes. Immutable source artifacts are at [run 39007506080](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39007506080); the complete permanent [150-row machine verdict and R02401 packed witness](stress/bc1vx-solved-control-150-paired-20261017-001.json) are committed in git.

| Measurement | Current control | BC1-VX treatment |
|---|---:|---:|
| Historic solved-control cohort membership | 150 | 150 |
| **Referee-valid current solves** | **149/150** | **150/150** |
| **Attributable treatment losses** | — | **0** |
| Treatment-only current solve | — | **R02401** |
| Aggregate canonical work | 11,899,468,744 | **11,453,429,684** |
| Work difference | — | **−3.748%** |

The 150-ID set is historical. **R02401 was not a current-control solve**: the freshly executed current control stopped at node budget after 294,951,648 work, whereas BC1-VX solved with referee-valid 101-position path at 259,739,147 work. It is a real current-source *treatment-only* gain, but not an entirely unknown level: earlier policy/history had solved it.

The negative regression test is exactly scoped to the **149 current-control successes**; all 149 survived under treatment. This is separate from the [representative 300 study](2026-10-02-bc1-volume-consequence-result-001.md) (+7/−0) and [disjoint cold-64 study](2026-10-16-bc1vx-fresh-cold-solve-paired-screen-001.md) (+2/−0); all remain development evidence from extensively studied Corpus 2. No rows from the failed old BC1 selector canary contaminate this study.

**Next:** authorize promotion/default-ON only through a separate code/configuration PR after reviewing soundness, latency costs, actual runtime flag default, matched-budget regression behavior and required CI. This completed read-only research run made **no product flag change**.


## Why this population

`docs/solver-optimization-workstreams.md` has demanded the BC1-VX solved-control regression since the first positive production A/B. The 150-ID cohort is the already-established solved-control set used for the earlier BC1 fresh-prune promotion regression (which detected the real `R02401` loss). It is a useful, previously frozen adversarial stress set, chosen without seeing the BC1-VX effect.

**Do not silently call all 150 current control successes.** Previous "solved" means historic, possibly a different source revision or budget contract. Every item gets a fresh **paired current-default control** under the exact treatment source. Only rows where current control actually solves enter the BC1-VX loss denominator. Report any historical-control failures explicitly, not as BC1-VX regressions.

## Fixed protocol

- Level-blind ordinary production scheduler, 50,000,000 nodes, base work budget 67,000,000, wall safety 86,400,000ms, additive retries retained (`strictTotalWorkBudget=false`), two workers per arm.
- Control: production defaults, no flags altered. Treatment: exactly `STRATEGY_BC1_VERTEX_VOLUME_PRUNE` enabled.
- Assign the 150 fixed ordered IDs round-robin to 15 shards of 10 IDs; each resolves IDs to current corpus positions. Each position token must independently carry `pos:`.
- Same source and corpus on both arms. Assert sample SHA, source commit, budgets, effective solver requests (BC1-VX boolean is the **only** intended change), 10 unique IDs, completeness, definite outcomes, and referee validity for all successes.
- Upload full per-arm solution paths/attempt records, both request projections, selected manifest and paired 10-row verdict. Run a strict 15-shard combiner to reject any missing/overlapping row or subset mismatch.
- No automatically updated Hint files or promotion action. The workflow is temporary and will be removed after the decision data are retained in repository reports.
- Use canonical `workSpent` for aggregate economics, and list **all** treatment-only losses and gains. Distinguish no-harm among *current* solved controls from an unqualified 150/150 claim.
- Source workflow may continue when this session ends; it is GitHub Actions computation, not asynchronous ChatGPT work.

## Prespecified decision

If any current-control success becomes a treatment failure, freeze that loss as a real regression and investigate its winning tier/trajectory before deciding production promotion. Do **not** auto-reject or auto-promote on a mechanical gain/loss count alone. Zero attributable losses and reasonable work cost would be a positive solved-control gate, but causal checks and the independent/generalization limitations of Corpus 2 remain separate.

Source from [prior solved-control regression](2026-09-30-bc1-fresh-prune-matched-budget-ab-result-001.md), [BC1-VX owner](2026-10-02-bc1-volume-consequence-result-001.md), and [disjoint positive result](2026-10-16-bc1vx-fresh-cold-solve-paired-screen-001.md).
