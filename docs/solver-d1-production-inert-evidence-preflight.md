# D1 production-inert evidence acquisition preflight

> **Status:** READY / next solver-research evidence gate.
> **Authority:** `solver-optimization-workstreams.md` owns execution priority. This preflight authorizes observation only, not ranking changes, production exact queries, proxy search, or a live treatment.
> **Purpose:** collect the missing decision-context and economics evidence required by the concluded D1 retained-evidence falsifier.

## Decision question

D1 future-intersection commitment realizability is already a replicated forensic discriminator and maps to an existing beam rank/retain seam. The remaining question is narrower:

> On ordinary production-generated decision opportunities across independent parents, does zero/nonzero D1 information disagree with current ranking/retention often enough, displace enough downstream work, and cost little enough to justify a live matched-work ranking prototype?

This pass must answer that question without changing solver behavior.

## Frozen boundaries

- Production policy, ordering, retention, randomness, work envelope, caches and solve outcomes must be identical with observation enabled or disabled.
- Historical level identity, known LIVE/DEAD labels, saved solutions and prior D1 outcomes may not select or steer opportunities.
- D1 remains **ranking-only**. This preflight cannot earn prune, forced-move or correctness authority.
- The exact observer may be expensive because it is research instrumentation. Its measured cost is evidence, not permission to put it in production.
- Development evidence from the one-parent `R03147` replication is excluded from independent support; it may be used only for canary/schema validation.

## Population

Use a deterministic, level-blind selection of current Class-5 production-search parents from the current production protocol, excluding parents whose D1 outcomes informed the existing result.

The independent unit is **parent level**, not candidate row or pin query.

Within every selected parent, observe **every generated decision opportunity satisfying one explicit D1 eligibility contract**. Do not cherry-pick candidates after labels or D1 results are visible.

Before any broad collection:

1. use current research-data/status tooling to verify no retained asset already contains the required decision context;
2. run `solver:experiment-preflight` / opportunity sizing where applicable;
3. freeze the literal parent selection and D1 eligibility predicate;
4. record development versus independent-confirmation roles.

## Required observation record

For each eligible opportunity retain enough information to reconstruct the actual decision and its economics:

- parent/protocol/run identity and evidence ancestry;
- candidate identity local to the run plus sibling/frontier membership;
- ordinary candidate score and all tie-breaking fields relevant to the current decision;
- actual pre-D1 frontier rank;
- beam width / cutoff position;
- coarse-state collision/dedup context where it affects retention;
- actual retain/reject outcome under unchanged production policy;
- D1 zero/nonzero result, or `UNKNOWN` / unsupported;
- D1 query/model support and observed information-production cost;
- descendant/work ancestry sufficient to attribute bounded downstream `workSpent`;
- later survival/first-loss information needed to distinguish an already-doomed candidate from one whose selection mattered;
- independent parent identity.

Preserve raw timing/query diagnostics as implementation-cost evidence, but do not substitute wall time for `workSpent` when comparing solver policy.

## Instrumentation parity

The observer is valid only if enabling it changes no decision-bearing execution state.

Canary before scaling:

- identical solved/unsolved result;
- identical `workSpent`;
- identical candidate ordering and retention;
- identical randomness/seed behavior;
- identical cache/memo lifetime;
- observer output contains every required field;
- unsupported/time-limited D1 queries are recorded as non-decision-bearing `UNKNOWN`.

Any parity failure stops the experiment and is an instrumentation defect, not D1 evidence.

## Staged collection

### Stage 0 — retained-evidence and tooling audit

Confirm the missing fields remain genuinely absent and extend existing trace/observer plumbing rather than creating a parallel research store when possible.

### Stage 1 — execution-family canary

Exercise the observer on development material, including `R03147` if useful, solely to validate eligibility semantics, exact-query support, output shape, ancestry accounting and parity.

No inference uses this stage.

### Stage 2 — independent pilot

Run the frozen observer on a small deterministic multi-parent sample selected before D1 outcomes are seen.

Measure:

- parent-level eligibility prevalence;
- fraction of eligible decisions with supported D1 answers;
- zero/nonzero D1 distribution;
- number and rate of **counterfactual decision disagreements**, especially cases near the actual retention cutoff;
- downstream `workSpent` associated with the affected candidates;
- D1 information-production cost.

Treat multiple opportunities from one parent as clustered evidence.

### Stage 3 — expansion only if informative

Expand to the opportunity-sized independent population only if the pilot establishes all of:

1. non-trivial production eligibility;
2. supported D1 answers on enough opportunities to study the decision seam;
3. at least one genuine current-policy disagreement or cutoff-near case showing the ranking question is live;
4. instrumentation parity;
5. no evidence that information cost is obviously orders of magnitude beyond any plausible displaced work.

If the pilot shows zero decision-bearing opportunity, stop rather than buying statistical precision on a null seam.

## Primary outputs

The closeout must report, at parent level where applicable:

- eligibility prevalence with numerator/denominator;
- support/UNKNOWN rate;
- D1/current-policy disagreement prevalence;
- cutoff-crossing versus harmless-ordering disagreement;
- displaced-work lower/upper bounds from observed ancestry;
- information-production cost distribution;
- dependence/clustering by parent;
- counterexamples, especially LIVE-looking/high-ranked zero-D1 states and DEAD-looking/low-ranked nonzero-D1 states if they occur.

Do not treat retrospective exact LIVE/DEAD classification accuracy as the primary outcome. The decision question is whether D1 changes a real ranking choice economically.

## Advancement gate

A live matched-work D1 ranking prototype is earned only if the production-inert evidence shows:

1. D1 opportunities recur across independent parents;
2. D1 information creates non-trivial decision disagreement at the existing rank/retain seam;
3. disagreement is plausibly tied to avoidable downstream work or retained capability rather than harmless reordering;
4. observed/estimated information cost leaves a credible positive-value envelope;
5. the proposed live consumer can remain level-blind and bounded, with `UNKNOWN` neutral.

If exact D1 is informative but too expensive, that result may nominate a **separately justified** cheap-proxy investigation. It does not automatically authorize proxy fitting.

## Stop conditions

Close the D1 production path, in its present form, if representative multi-parent observation finds any of:

- eligibility is negligible;
- D1 almost never disagrees with current selection;
- disagreements almost never touch a real cutoff/retention boundary;
- affected candidates do not account for material downstream work;
- exact information cost dominates plausible displaced work with no independently motivated cheaper derivation;
- the one-parent forensic discrimination fails to recur;
- sound support is too sparse and `UNKNOWN` dominates.

A stop here closes this D1 consumer path, not all per-instance relational feasibility.

## Handoff

Close with a dated report and reconcile:

- `solver-optimization-workstreams.md`;
- `solver-future-work.md` only if the descendant/reopen condition changes;
- capability memory if the observation reveals durable complementary capability.

No production solver behavior changes in this preflight.
