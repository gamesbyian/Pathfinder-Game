# Mechanic-composition transfer pilot 001: result (Stage A/B/C)

> **Status:** concluded-negative
> **Last evidence:** 2026-09-12 — full Stage A (deterministic materialization), Stage B (observer manipulation check), and Stage C (matched-work prune on/off comparison) executed for a 5-parent cohort per [`the frozen design`](2026-09-11-mechanic-composition-transfer-pilot-design-001.md), with the Stage-C execution envelope clarified below.
> **Decision:** the portal-terminal relocation instrument is **not clean enough across the cohort to reuse as a general causal-transfer probe**: 2/5 parents show the predicted mechanism-supporting chain cleanly, but 2/5 introduce a general-difficulty confound the design explicitly pre-registered as a stop condition (decoupled control now also solves, with byte-identical work/node counts to decoupled treatment — the edit made the level easier by some other route, not merely removed the targeted obligation). One parent is inconclusive at the reduced diagnostic envelope. The confound finding is sufficient to close the relocation instrument; the smaller envelope is not used to reinterpret the original production-scale promotion.
> **Remaining gate:** none for this instrument. A different, cleaner manipulation would need its own frozen edit rule, explicit execution envelope, and confound check before any further transfer-pilot work in this family.
> **Evidence role:** bounded diagnostic pilot (5 parents). No population-scale effect size, no production solver behavior change, no capability-acquisition promotion.

## Method recap

Stages A and B follow the frozen structural/manipulation rules. Stage C preserves matched execution **within this pilot** but uses a reduced diagnostic envelope relative to the original promotion A/B:

- **Stage A:** deterministic parent/edit selection — enumerate static obligation clusters (`findStaticObligationClusters`), order them deterministically, search relocation cells by increasing Manhattan distance with a row/col tie-break, take the first edit that removes exactly the targeted cluster and no other. `scripts/stress/mechanic-composition-pilot-stage-a.mjs`.
- **Stage B:** joint-obligation observer with pruning disabled (`PRUNE_MC_PORTAL_FORCED_NEIGHBOR: false`, pure logging) on original/decoupled pairs. `scripts/stress/mechanic-composition-pilot-stage-b.mjs`.
- **Stage C:** matched prune on/off comparison (control = flag `false`, treatment = flag `true`) on original vs. decoupled siblings, `nodeBudget=20,000,000`, `timeBudgetMs=300,000`, identical across all four arms per parent. The production ladder's additive tiers can add work beyond the base uniformly on every arm. Every claimed solve referee-validated via `Solver.validateCandidatePath`. This is smaller than the original promotion A/B's 50M-node / 67M-work production envelope, so failures to reproduce an original rescue here are **inconclusive**, not negative evidence about the promotion.

The original design's phrase "same matched-work prune on/off comparison contract used by the original promotion" was therefore too strong for the execution that actually occurred. The pilot retains valid within-pilot matched comparisons, but it does not claim production-envelope equivalence.

### Correction to the frozen inference population

The design doc's own transcription of the "20 candidate parents" does not match the A/B preflight it cites as the source — only 4 of its 20 IDs overlap with [`the preflight's real 21 gains`](2026-09-11-joint-obligation-mc-portal-ab-001-preflight.md), and several do not exist in any corpus. This pilot used the preflight's verbatim gain list minus calibration-only `R00726`. A correction note is attached to the design doc itself. With the corrected pool, all 20/20 candidate parents were structurally eligible, giving the full preferred 5-parent cohort.

## Stage A result

All 5 cohort parents (`R01274`, `R01489`, `R01849`, `R01882`, `R02036`) got a clean single-cluster-removal edit on the first deterministically ordered cluster/relocation candidate.

## Stage B result

5/5 manipulation-valid: on every parent, the original sibling's real search with pruning disabled actually rejects on the targeted cluster's exact `(mustCrossIndex, axis)` identity within the observer budget, and the decoupled sibling structurally cannot produce that verdict.

## Stage C result

| parent | original control | original treatment | decoupled control | decoupled treatment | verdict |
|---|---|---|---|---|---|
| `R01274` | fail (budget) | **solve** | fail (budget) | fail (budget) | clean: rescue disappears |
| `R01489` | fail (budget) | fail (budget) | fail (budget) | fail (budget) | inconclusive at reduced envelope |
| `R01849` | fail (budget) | **solve** | **solve** | **solve** | confound: decoupled control also solves |
| `R01882` | fail (budget) | **solve** | fail (budget) | fail (budget) | clean: rescue disappears |
| `R02036` | fail (budget) | fail (budget) | **solve** | **solve** | confound; original arm inconclusive |

`R01849` and `R02036` are the decisive instrument failures: each decoupled control/treatment pair solves with byte-identical `workSpent`/`nodesExpanded` (`R01849`: 217,207/56,511; `R02036`: 44,200,931/14,510,656). The relocation itself therefore opened an unrelated winning route before the targeted prune distinction mattered. That is exactly the pre-registered connectivity/general-difficulty confound.

`R01274` and `R01882` show the clean predicted chain at this diagnostic envelope. `R01489` does not reproduce its known production-scale rescue here, which is unsurprising enough under the smaller budget that it contributes no directional evidence. The same caution applies to `R02036`'s original sibling: the confound conclusion comes from the decoupled pair, not from failure to reproduce the original treatment rescue.

## Interpretation and decision

The instrument closes because its structural intervention is not isolated from general navigation difficulty on 2/5 frozen parents. That conclusion does **not** depend on treating the reduced Stage-C envelope as equivalent to the original promotion envelope.

Two parents still provide real, narrow mechanism-supporting evidence: on `R01274` and `R01882`, the treatment advantage is present on the original and disappears after clean decoupling while control remains unsolved. But a causal-transfer instrument that independently makes control solve on two other parents is not reusable as a generic probe.

This result does not:

- reopen or narrow the underlying `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` promotion;
- treat reduced-envelope non-reproduction as evidence against production-scale gains;
- license a broader generator/capability-acquisition campaign;
- authorize production per-level or family-ID routing.

**If revisited**, use a materially different manipulation that does not relocate a landmark shared with the general navigation graph, and freeze both the edit rule and the exact execution envelope before outcomes are observed.

## Artifacts

- `scripts/stress/mechanic-composition-pilot-stage-a.mjs`, `-stage-b.mjs`, `-stage-c.mjs` — reusable pipeline; any future reuse needs a new frozen population/manipulation/envelope contract.
- `reports/stress/mechanic-composition-pilot-001/stage-a.json`, `stage-b.json`, `stage-c.json` — full per-parent detail backing the tables above.
