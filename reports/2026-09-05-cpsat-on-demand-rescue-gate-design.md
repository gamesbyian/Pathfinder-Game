# CP-SAT on-demand rescue gate: candidate design

> **Status:** active
> **Last evidence:** 2026-09-05 — Existing referee-valid hint provenance contains `cpsat-full-probe` rescues for 45 current production-unsolved levels and 13 isolated-no-winner levels.
> **Decision:** promote a bounded local exact-reference selector question, not production CP-SAT integration.
> **Remaining gate:** run the predeclared local holdout characterization; no stable narrow selector keeps Workstream 5 strictly on demand, while a replicated selector may become a bounded exact-label acquisition gate.
> **Evidence source:** existing referee-valid `cpsat-full-probe` hint provenance plus current isolated census and production results
> **Observed target:** 13 levels with no isolated census winner and 45 levels unsolved by the fresh production run have referee-valid CP-SAT solutions in stored provenance
> **Workstream boundary:** Workstream 5 remains ON DEMAND; use exact/reference work only for a concrete prioritized label, counterexample, or certificate

## What the new evidence changes

The exact/reference program previously had an abstract reopen rule: spend CP-SAT only when a concrete research question needs a label/certificate. The existing hint-provenance join now supplies a concrete residual population. `cpsat-full-probe` has already solved levels that the current native evidence either cannot solve in isolation (13 no-isolated-winner cases) or does not solve in the current production run (45 cases).

That is enough to promote a **bounded exact-reference labeling question**. It is not evidence that CP-SAT should run in production, nor that every native-unsolved level should receive an exact solve attempt.

## Immediate local question

Before any new CP-SAT dispatch, characterize the already-solved CP-SAT rescue population against the corresponding native-unsolved/control population using only existing legal static features and current evidence joins.

Ask:

1. Are the 45 production-unsolved CP-SAT-rescued levels concentrated in a structural/routing regime already visible to the native scheduler?
2. Do the 13 isolated-no-winner rescues form the same population or a distinct one?
3. Is rescue status predictable out of sample from a small, interpretable feature set, or does it disappear under holdout?
4. Do rescued levels disproportionately belong to known native failure modes such as high constrained-object load, portal density, starvation, or low capability multiplicity?
5. Does hint provenance show that CP-SAT rescue is stable across repeated/reference runs, rather than one-off stale evidence?

Use the existing structural-holdout replication discipline. Broad feature scans are exploratory; any apparent selector must survive a natural holdout before it is treated as a gate.

## Cheapest falsifying pilot

Build a local analysis table with one row per current production-unsolved Corpus-2 level, containing at minimum:

- CP-SAT rescue label from referee-valid hint provenance (`cpsat-full-probe` / renamed current reference identity as applicable);
- current production solved/unsolved state;
- current isolated-census `solverCount` / support class;
- routing regime;
- the replicated structural feature set already used by production-risk analysis (`constrainedObjects`, portals, constrained-object density, turn-constraint load, must-cross/must-pass/intersection load, etc.);
- lifecycle starvation/capped class where available;
- capability multiplicity and technique-family support.

Split before modeling/scoring. A simple parity or corpus-position holdout is acceptable if no cleaner family/parent grouping applies; do not tune the split after seeing results.

Start with interpretable univariate/enrichment effects and a tiny rule set. Do not jump to ML/bandit machinery. The goal is to falsify the existence of a cheap gate, not maximize in-sample fit.

## Decision rule

- **No stable selector:** if rescue enrichment collapses on holdout or requires a large fragile conjunction, keep Workstream 5 strictly on demand. Use the 45/13 cases as exact-reference counterexamples/labels when another workstream needs them; do not create a production gate.
- **Stable narrow selector:** if a small legal feature rule materially enriches CP-SAT rescue rate on holdout while selecting a bounded population, promote that rule as an **exact-label acquisition gate** first. Run CP-SAT/reference only on that bounded research cohort to obtain labels/certificates for native-solver diagnosis. This still does not authorize production CP-SAT.
- **Strong repeated value:** only if repeated gated reference work produces actionable native-solver changes or a measured production-facing benefit should a production integration question be opened. That would be a new experiment with its own cost envelope and confirmation requirements.

## Important controls

- Exclude witness-generator or hint-guided native provenance when labeling native capability; CP-SAT hints are external-reference evidence, not proof the native solver can rediscover the path.
- Referee validation is mandatory. The historical CP-SAT model had under-constraint bugs; only retained paths that pass the real game referee count as rescue evidence.
- Respect mechanic coverage. A CP-SAT timeout/UNKNOWN or unsupported mechanic is not a native-unsolvable label.
- Keep selection based on mechanics/static state/current control evidence, never level ID or prior treatment outcome.
- Do not use the 45 rescued production-unsolved rows both to discover and confirm a selector without a holdout. If sample size is too small for a meaningful holdout, classify the result as exploratory and stop there.

## Why this is worth doing

This is the rare future-work promotion that costs almost no new solver compute: the exact solutions already exist. The value is in converting them from a pile of provenance into a bounded counterexample set that can either reveal a native failure regime or demonstrate that no cheap exact-reference gate exists. Either outcome advances Workstream 5 without expanding the production solver.
