# Mechanic-composition transfer pilot 001: result (Stage A/B/C)

> **Status:** concluded-negative
> **Last evidence:** 2026-09-12 — full Stage A (deterministic materialization), Stage B (observer manipulation check), and Stage C (matched-work prune on/off comparison) executed for a 5-parent cohort per [`the frozen design`](2026-09-11-mechanic-composition-transfer-pilot-design-001.md).
> **Decision:** the portal-terminal relocation instrument is **not clean enough across the cohort to reuse as a general causal-transfer probe**: 2/5 parents show the predicted mechanism-supporting chain cleanly, but 2/5 introduce a general-difficulty confound the design explicitly pre-registered as a stop condition (decoupled control now also solves, with byte-identical work/node counts to decoupled treatment — the edit made the level easier by some other route, not merely removed the targeted obligation), and 1/5 is inconclusive because the original rescue itself does not reproduce at this pilot's reduced budget. Per the design's own stop rule, this closes the relocation instrument without reopening broad generator/capability-acquisition work.
> **Remaining gate:** none for this instrument. A different, cleaner manipulation (e.g. one that doesn't relocate a shared navigational landmark) would need its own frozen edit rule before any further transfer-pilot work in this family.
> **Evidence role:** bounded diagnostic pilot (5 parents). No population-scale effect size, no production solver behavior change, no capability-acquisition promotion.

## Method recap

Executed the design's frozen rules exactly, with one correction (see below):

- **Stage A:** deterministic parent/edit selection — enumerate static obligation clusters (`findStaticObligationClusters`), order them deterministically, search relocation cells by increasing Manhattan distance with a row/col tie-break, take the first edit that removes exactly the targeted cluster and no other. `scripts/stress/mechanic-composition-pilot-stage-a.mjs`.
- **Stage B:** joint-obligation observer with pruning disabled (`PRUNE_MC_PORTAL_FORCED_NEIGHBOR: false`, pure logging) on original/decoupled pairs. `scripts/stress/mechanic-composition-pilot-stage-b.mjs`.
- **Stage C:** matched-work prune on/off comparison (control = flag `false`, treatment = flag `true`) on original vs. decoupled siblings, `nodeBudget=20,000,000` (a reduced but identical-across-all-four-arms base parameter; the production ladder's own additive retry tiers can add further work beyond this base uniformly on every arm, so comparability holds even though raw node/work totals exceed 20M on some rows), `timeBudgetMs=300,000`. Every claimed solve referee-validated via `Solver.validateCandidatePath`. `scripts/stress/mechanic-composition-pilot-stage-c.mjs`.

### Correction to the frozen inference population

The design doc's own transcription of the "20 candidate parents" (its line 36) does not match the A/B preflight it cites as the source — only 4 of its 20 IDs overlap with [`the preflight's real 21 gains`](2026-09-11-joint-obligation-mc-portal-ab-001-preflight.md#L56), and 6 do not exist in any corpus at all. This pilot used the preflight's verbatim gain list minus calibration-only `R00726`. A correction note is now attached to the design doc itself (original frozen text preserved, per archive-is-git convention). With the corrected pool, all 20/20 candidate parents were structurally eligible (vs. 3/20 against the corrupted list), giving the full preferred 5-parent cohort.

## Stage A result

All 5 cohort parents (`R01274`, `R01489`, `R01849`, `R01882`, `R02036`) got a clean single-cluster-removal edit on the first deterministically-ordered cluster/relocation candidate — no parent needed to fall through to a second cluster or an extended search radius.

## Stage B result

5/5 manipulation-valid: on every parent, the original sibling's real search (no pruning, observer only) actually rejects on the targeted cluster's exact `(mustCrossIndex, axis)` identity millions of times within a 5M-node budget, and the decoupled sibling structurally cannot produce that verdict at all (cluster absent by construction, reconfirmed live rather than assumed from Stage A alone).

## Stage C result

| parent | original control | original treatment | decoupled control | decoupled treatment | verdict |
|---|---|---|---|---|---|
| `R01274` | fail (budget) | **solve** | fail (budget) | fail (budget) | clean: rescue disappears |
| `R01489` | fail (budget) | fail (budget) | fail (budget) | fail (budget) | inconclusive: original rescue doesn't reproduce at this budget |
| `R01849` | fail (budget) | **solve** | **solve** | **solve** | confound: decoupled control now also solves |
| `R01882` | fail (budget) | **solve** | fail (budget) | fail (budget) | clean: rescue disappears |
| `R02036` | fail (budget) | fail (budget) | **solve** | **solve** | confound (+ inconclusive original) |

Summary: 3/5 reproduce the original treatment-exclusive rescue at this reduced budget; of those 3, all 3 lose the rescue after decoupling (`decoupledRescueDisappears`), but 2 of those 3 do so via a **confound** rather than a clean mechanism removal: `R01849`'s and `R02036`'s decoupled-control and decoupled-treatment solves are **byte-identical** in `workSpent`/`nodesExpanded` (`R01849`: 217,207/56,511 both arms; `R02036`: 44,200,931/14,510,656 both arms) — the search found the exact same winning path regardless of the ablation flag, meaning the relocation itself made the level solvable through some other route entirely, never engaging the joint-obligation mechanism at all. This is exactly the "relocation introduces connectivity/general-difficulty confounds" stop condition the design pre-registered.

Only `R01274` and `R01882` show the clean predicted chain: rescue confirmed on the original, and **both** decoupled arms remain budget-exhausted (not solved), meaning decoupling removed the treatment's exclusive advantage without making the level generically easier for control either. `R01489` never reproduces its original rescue at this reduced budget in any arm (all four `node-budget-reached`), so it contributes no usable data point either way — its original 21-gain status is a full-production-budget (`nodeBudget=50,000,000`) fact this pilot's smaller budget cannot probe.

## Interpretation and decision

Two independent parents (`R01274`, `R01882`) support the causal chain the design set out to test: the promoted mechanism's rescue is genuinely load-bearing there, and removing the specific coupled obligation removes exactly that advantage. That is real, if narrow, mechanism-supporting evidence for those two levels specifically.

But the relocation instrument itself recurs into a general-difficulty confound in 2/5 tested parents (40%) — not a rare edge case. A causal-transfer instrument that changes the outcome for reasons unrelated to its intended manipulation on two-fifths of its own frozen cohort is not clean enough to keep using as a generic probe, even though it happens to work cleanly on some parents. Per the design's own stop rule, this closes the **portal-terminal relocation instrument** specifically. It does not:

- reopen or narrow the underlying `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` promotion (unaffected — Stage C's original-sibling rows are consistent with the original A/B's own gain/non-gain shape at a smaller budget, not a contradiction of it);
- license a broader generator/capability-acquisition campaign (the explicit non-goal of this pilot from its own design);
- authorize any production routing, per-level lookup, or family-ID signal.

**If this transfer question is revisited**, the next earned step is a materially different manipulation that does not relocate a landmark cell shared with the level's general navigation graph (the design's own "alternative usable interface" contrast — adding/removing a viable must-cross axis while keeping the coupled cluster present — is the next plausible candidate, but needs its own frozen edit rule and its own confound check before execution).

## Artifacts

- `scripts/stress/mechanic-composition-pilot-stage-a.mjs`, `-stage-b.mjs`, `-stage-c.mjs` — reusable pipeline (not tied to this one cohort; would need a new frozen inference population to rerun on different parents).
- `reports/stress/mechanic-composition-pilot-001/stage-a.json`, `stage-b.json`, `stage-c.json` — full per-parent detail backing the tables above.
