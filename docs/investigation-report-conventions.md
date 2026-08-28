# Investigation report status convention

Use this for new human-authored investigation reports and material revisions to older ones. Generated summaries/raw logs are exempt; their generator metadata is their status.

## Required status block

Place immediately after the title:

```markdown
> **Status:** active | concluded-positive | concluded-negative | inconclusive | superseded | cancelled
> **Last evidence:** YYYY-MM-DD — report, run, or commit that most recently changed the conclusion
> **Decision:** the conclusion readers should act on now
> **Remaining gate:** one concrete measurement/decision, or `none`
```

Use those status values exactly. Put implementation detail in `Decision` or the body, not free-form status text.

For **decision-bearing solver research**, also state near the status block:

```markdown
> **Evidence role:** discovery | tuning | confirmation | transfer | forensic
> **Selection:** prespecified | observational | selected after inspecting <population/results/candidates>
```

If several candidates, thresholds, profiles, seeds, populations, metrics, or explanations were tried before the reported winner was chosen, say so and give the meaningful candidate count/range when available. Do not make a selected-on population look like an untouched confirmatory test.

For top-level dated reports created on or after **2026-08-20**, `npm run check:documentation-links` enforces the core status block. A generated top-level dated report may opt out only with `<!-- report-metadata: generated -->` immediately after its title. Generated collection reports use their collection/generator conventions.

## Evidence roles

- **Discovery:** exploratory evidence used to generate a hypothesis, candidate, threshold, feature, or cohort. It may nominate work but is expected to be optimistic after selection.
- **Tuning:** evidence used to choose among parameter/configuration/policy alternatives. A winner still requires independent confirmation for a broad promotion claim.
- **Confirmation:** a candidate and primary acceptance criterion were fixed before this population was inspected for that decision. Minor debugging does not automatically invalidate confirmation; changing the treatment in response to results does.
- **Transfer:** evidence from a materially different construction/source distribution reserved to test a broader generalization claim. A new seed from the same generator is confirmation, not cross-distribution transfer. Once exact failures are inspected and used to redesign the treatment, those cases become development data for later iterations.
- **Forensic:** replay/bisection/diagnosis of historical behavior. It can establish mechanism or provenance but is not automatically current capability evidence.

The same artifact can support different claims at different roles, but the report must state which claim it is being used to support.

## Rules

- **Active** means actually underway or queued with an owner/prerequisite; mere possibilities belong in the current queue/deferral doc.
- **Inconclusive** names the evidence that would resolve it. If buying more evidence is not worthwhile, use `cancelled` and say why.
- **Superseded** links its replacement; preserve the old evidence.
- **Cancelled** explains why the original scope is no longer decision-relevant and any reopen condition.
- **Remaining gate** is the smallest decision-bearing check, with population and acceptance criterion when known.
- When a later report closes a gate, link both directions.
- An A/B applies to the implementation it tested. If participation, budget, ordering, applicability, candidate set, or interactions materially change, state whether the old verdict still applies.
- A positive result selected from many alternatives is normally **nomination evidence** until confirmed independently. Evidence intensity should scale with selection pressure and claim scope under [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md); do not report the maximum observed arm as though it were a prespecified single test.
- A negative result closes the tested form, not every imaginable descendant. Conversely, do not indefinitely rescue a null hypothesis by changing one more threshold, budget, seed, or cohort. Reopen only when new evidence changes the mechanism premise or the original treatment was demonstrably invalid.
- **Absence of a solve gain is not automatically evidence of no mechanism.** If participation/activation was near zero, classify the treatment as non-participating/inconclusive for the intended mechanism rather than “negative.” Once participation is demonstrated and the outcome remains null/negative, close that form unless new evidence changes the premise.
- Report the intended population, actual coverage, exclusions/missing rows, deadline truncation/errors, and whether the population itself was selected because it showed the effect.
- Family/variant rows are correlated. State the independent unit and group/split by parent when the claim depends on generalization.
- Cross-technique cost comparisons use `workSpent`; raw nodes remain within-technique diagnostics. If treatment buys additive work, report the larger envelope rather than describing the gain as free.
- External algorithms/frameworks are comparators or hypothesis sources, not automatic gold standards. Report encoding/feature/support differences and compare at a meaningful resource/correctness boundary before concluding a custom approach is inferior/superior.
- Retained default-off solver code is not automatically active work. Reconcile against [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md); code polarity is not promotion status.

## Before buying broad compute

For expensive decision-bearing work, write down enough of the intended test before dispatch that a later reader can distinguish prediction from hindsight:

1. treatment/configuration being tested;
2. control/baseline and code/ref identity;
3. evidence role and population selection rule;
4. primary outcome and work/cost envelope;
5. smallest result that would close the form, nominate follow-up, or justify confirmation;
6. planned handling of multiple candidates/thresholds if the run is a sweep;
7. stop condition for escalating to a larger population;
8. any external/reference baseline and what differences make the comparison fair or limited.

This is lightweight precommitment, not ceremony. It exists to prevent broad sweeps from becoming retrospective threshold-fishing exercises. For confirmation versus cross-generator transfer and block-consumption rules, use [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).

## Where information belongs

| Information | Canonical home |
|---|---|
| Current product/solver behavior | Topic reference under `docs/` |
| Ranked solver optimization work | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) |
| Solver research method/promotion rules | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| Solver development/confirmation/transfer evidence | [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) |
| Broader deferred/reopen ideas | [`solver-future-work.md`](solver-future-work.md) |
| Retained/default-off dispositions | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Family/variant method/resource | [`variant-level-research.md`](variant-level-research.md) |
| One experiment's evidence | Dated file under `reports/` |
| Generated results | Relevant `reports/` collection |
| Raw run/shard output | `logs/` |
| Completed plan/handoff | [`archive/`](archive/README.md) |
| Durable architecture decision | [`adr/`](adr/) |

Historical evidence may remain outside its canonical home, but must not present itself as a competing workstream authority. Long dated notebooks with stable replacements should be frozen under `archive/snapshots/` and left with a compact compatibility pointer/current contract.

## Closing checklist

Before calling an investigation complete:

1. Set the final status and remove stale active wording.
2. Link final evidence and separate measurement from inference.
3. State evidence role, selection procedure, intended/actual population, and material alternatives tried for decision-bearing solver work.
4. State whether the treatment actually participated enough to support the claimed positive/negative mechanism verdict.
5. Update the current surface that owns the decision: queue, opt-in ledger, or deferred-work index as appropriate.
6. Ensure feature/flag descriptions do not advertise a stale gate.
7. Update the authoritative topic/tool contract if reusable behavior changed.
8. Add predecessor/successor links for follow-ups.
9. If implementation changed after the decisive A/B, explicitly decide whether the verdict still applies; otherwise record a new gate.
10. If a selected/tuned positive is being promoted, satisfy the proportional confirmation/transfer gate in [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) or explicitly limit the claim.
11. Archive concluded plans/notebooks when they make current-state retrieval harder.
12. Run `npm run check:documentation-links`.

This convention is prospective. Older reports need not be reformatted unless revised, but stale status discovered in them must still be reconciled with current authorities.