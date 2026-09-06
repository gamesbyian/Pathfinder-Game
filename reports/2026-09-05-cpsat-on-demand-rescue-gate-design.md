# CP-SAT on-demand rescue gate: candidate design

> **Status:** active, blocked on local evidence-integrity repair
> **Last evidence:** 2026-09-06 — the source report's isolated-no-winner rescue summary is internally inconsistent: it reports 13 distinct IDs but prints 15 entries / 14 unique IDs. `R00720`, an apparently suspicious tail entry, independently satisfies the intended current native-residual + referee-valid CP-SAT shape, so the mismatch cannot be repaired by casually dropping it.
> **Decision:** retain the bounded local exact-reference selector question, but regenerate and assert the rescue cohorts before any characterization or holdout work. Do not treat the old 13-row set as a valid label population.
> **Remaining gate:** deterministic no-dispatch regeneration of both rescue cohorts from authoritative current capability data plus referee-valid hint provenance, with count/uniqueness/predicate assertions; only then run the predeclared local holdout characterization.
> **Evidence source:** existing referee-valid `cpsat-full-probe` hint provenance plus current isolated census and production results
> **Observed target:** exact/reference provenance demonstrably contains native-residual rescues, but the exact small-cohort membership/count requires repair before modeling; the previously reported 45 production-unsolved count also requires independent count/list verification before modeling.
> **Workstream boundary:** Workstream 5 remains ON DEMAND; use exact/reference work only for a concrete prioritized label, counterexample, or certificate

## What the evidence changes

The exact/reference program previously had an abstract reopen rule: spend CP-SAT only when a concrete research question needs a label/certificate. Existing hint provenance supplies a concrete residual population because `cpsat-full-probe` has retained, referee-valid solutions for levels that current native evidence leaves unsolved.

A follow-up integrity audit, however, found that the original isolated-no-winner enumeration cannot be trusted as printed. The report claims 13 distinct IDs but prints 15 entries containing 14 unique IDs. `R00860` is duplicated. A targeted recheck of `R00720` shows it is not an obvious transcription stray: current capability data has `productionSolved:false` and `isolatedOracleSolved:false`, and retained provenance contains referee-accepted `cpsat-full-probe` solutions.

Therefore the **premise** for a bounded exact-reference labeling question survives, while the **specific old 13-row label set** does not. See `2026-09-06-cpsat-rescue-cohort-integrity-audit-001.md` and the integrity warning in `2026-09-05-cpsat-full-probe-rescue-coverage-001.md`.

This remains evidence for research labeling, not evidence that CP-SAT should run in production or that every native-unsolved level should receive an exact solve attempt.

## Immediate local question: repair the labels first

Before any structural characterization and before any new CP-SAT dispatch, deterministically regenerate the already-solved CP-SAT rescue populations from existing repository data.

The regeneration must materialize sorted unique ID arrays for at least:

1. all current levels with retained referee-valid `cpsat-full-probe` rescue provenance;
2. those with current `productionSolved===false`;
3. those with current `isolatedOracleSolved===false`.

Before accepting the output, assert that:

- every reported count equals its materialized array length;
- each array contains no duplicates;
- every ID exists in the current capability map;
- every production-unsolved member actually has `productionSolved===false`;
- every isolated-no-winner member actually has `isolatedOracleSolved===false`;
- every positive label is backed by retained referee-valid CP-SAT provenance under the documented solver identity/rename mapping.

Preserve the machine-readable regenerated membership beside the report or otherwise in a durable queryable artifact. Do not return to a hand-copied list as the authority.

This repair requires no new solver compute.

## Characterization question after integrity passes

Once the regenerated label sets pass those assertions, characterize the CP-SAT rescue population against the corresponding native-unsolved/control population using only existing legal static features and current evidence joins.

Ask:

1. Are production-unsolved CP-SAT-rescued levels concentrated in a structural/routing regime already visible to the native scheduler?
2. Do isolated-no-winner rescues form the same population or a distinct one?
3. Is rescue status predictable out of sample from a small, interpretable feature set, or does it disappear under holdout?
4. Do rescued levels disproportionately belong to known native failure modes such as high constrained-object load, portal density, starvation, or low capability multiplicity?
5. Does hint provenance show that CP-SAT rescue is stable across repeated/reference runs rather than one-off stale evidence?

Use the existing structural-holdout replication discipline. Broad feature scans are exploratory; any apparent selector must survive a natural holdout before it is treated as a gate.

## Cheapest falsifying pilot after regeneration

Build a local analysis table with one row per current production-unsolved Corpus-2 level, containing at minimum:

- regenerated CP-SAT rescue label from referee-valid hint provenance (`cpsat-full-probe` / documented current reference identity as applicable);
- current production solved/unsolved state;
- current isolated-census `solverCount` / support class;
- routing regime;
- the replicated structural feature set already used by production-risk analysis (`constrainedObjects`, portals, constrained-object density, turn-constraint load, must-cross/must-pass/intersection load, etc.);
- lifecycle starvation/capped class where available;
- capability multiplicity and technique-family support.

Split before modeling/scoring. A simple parity or corpus-position holdout is acceptable if no cleaner family/parent grouping applies; do not tune the split after seeing results.

Start with interpretable univariate/enrichment effects and a tiny rule set. Do not jump to ML/bandit machinery. The goal is to falsify the existence of a cheap gate, not maximize in-sample fit.

## Decision rule

- **Integrity assertions fail:** stop. Fix the evidence join before drawing any selector conclusion.
- **No stable selector:** if rescue enrichment collapses on holdout or requires a large fragile conjunction, keep Workstream 5 strictly on demand. Use verified rescue cases as exact-reference counterexamples/labels when another workstream needs them; do not create a production gate.
- **Stable narrow selector:** if a small legal feature rule materially enriches CP-SAT rescue rate on holdout while selecting a bounded population, promote that rule as an **exact-label acquisition gate** first. Run CP-SAT/reference only on that bounded research cohort to obtain labels/certificates for native-solver diagnosis. This still does not authorize production CP-SAT.
- **Strong repeated value:** only if repeated gated reference work produces actionable native-solver changes or a measured production-facing benefit should a production integration question be opened. That would be a new experiment with its own cost envelope and confirmation requirements.

## Important controls

- Exclude witness-generator or hint-guided native provenance when labeling native capability; CP-SAT hints are external-reference evidence, not proof the native solver can rediscover the path.
- Referee validation is mandatory. The historical CP-SAT model had under-constraint bugs; only retained paths that pass the real game referee count as rescue evidence.
- Respect mechanic coverage. A CP-SAT timeout/UNKNOWN or unsupported mechanic is not a native-unsolvable label.
- Keep selection based on mechanics/static state/current control evidence, never level ID or prior treatment outcome.
- Do not use the regenerated rescued rows both to discover and confirm a selector without a holdout. If sample size is too small for a meaningful holdout, classify the result as exploratory and stop there.
- Do not silently preserve the old 13-row count as a compatibility convention. Regenerated asserted membership is authoritative.

## Why this is still worth doing

This remains a rare future-work promotion that should cost almost no new solver compute: the exact solutions already exist. The immediate value is first to turn an unreliable hand-reported cohort into a trustworthy machine-checked counterexample set, then ask whether that set reveals a native failure regime or demonstrates that no cheap exact-reference gate exists.

Either outcome advances Workstream 5 without expanding the production solver. The integrity repair also prevents a small bookkeeping defect from becoming a surprisingly expensive false research direction.
