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

For Stage 2, use `--execution-boundary=production-orchestration`. This attaches the generic
research-only beam observer to the real `solveLevel` ladder, tags every record with an attempt
ordinal/config/gate identity, and joins that ordinal back to the authoritative `SolveResult.attempts`
stage telemetry. Confirmation/transfer capture is rejected on the older isolated-beam boundary.

## Required observation record

Use the shared bounded record contract in `scripts/solver-decision-observation-lib.mjs` for the common decision identity/order/retention/work fields rather than creating a D1-private event envelope. D1-specific exact-query output belongs in that record's optional annotation, with unsupported/time-limited queries represented as `UNKNOWN`.

The capture artifact is also the first prospective consumer of the shared research-block lineage contract. It must retain:

- stable question ID `WS2-D1-PRODUCTION-INERT-OBSERVATION`;
- a block ID distinct from its content seal;
- SHA-256 source-corpus revision;
- canonical structural content identity for every selected parent;
- `independentUnit: parent-level`;
- development evidence role under the current isolated-attempt capture boundary;
- source/capture artifact references;
- no consumption event at capture time.

The offline annotation inherits the exact `populationIdentity` and `researchBlock` from the frozen capture. Do not mint a second block for annotation. Append a consumption event only when labelled outcomes are actually opened for a decision/report.

For ordinary execution, `solver:capture-d1-decisions` defaults the stable D1 question ID and derives a deterministic block ID from the sealed parent population; `--block-id` may be supplied when an external plan already assigned one.

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

Confirm the missing fields remain genuinely absent and extend existing trace/observer plumbing rather than creating a parallel research store when possible. Reuse the shared decision-observation contract and existing beam operational trace surfaces; if those cannot carry one of the required D1 fields, extend the shared seam rather than inventing a D1-only store.

### Stage 1 — execution-family canary

Exercise the observer on development material, including `R03147` if useful, solely to validate eligibility semantics, exact-query support, output shape, ancestry accounting and parity.

No inference uses this stage.

### Stage 2 — independent pilot

Run the frozen observer on a small deterministic multi-parent sample selected before D1 outcomes are seen.
The capture must use the full production orchestration boundary, not a standalone beam attempt.
For confirmation/transfer evidence, offline annotation must cover every frozen eligible decision; the
development-only `--max-eligible-decisions` cap is rejected.

Local per-cell serial annotation (`annotate-d1-production-decisions.mjs`) does not scale past a
handful of decisions: a candidate's revisit-cell count (measured ~33/candidate on the 2026-09-18
8-parent capture) each costs one independent CP-SAT query. Use the GHA seam instead:
`d1-decisions-to-explicit-prefix-cases.mjs` -> `cpsat-explicit-prefix-reference.yml` (`pinRevisit`
case field) -> `reconcile-d1-explicit-prefix-cases.mjs`, which reconstructs the same decision-level
shape the local annotator produces. See [`report`](../reports/2026-09-18-d1-stage2-independent-pilot-capture-result-001.md)
for exact case-volume/cost figures and why the full frozen population was not dispatched outright.

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

## Lineage query

The capture and annotation artifacts can be composed without a persistent evidence warehouse:

```bash
npm run research:relations -- \
  --artifact=<capture.json> \
  --artifact=<annotation.json> \
  --relation=researchBlocks \
  --query=WS2-D1-PRODUCTION-INERT-OBSERVATION
```

For conservative eligibility facts, also supply `--eligibility-question=<question-id>`,
`--eligibility-role=<development|confirmation|transfer>`, and, when known,
`--related-questions=<comma-separated-question-ids>`. Use an explicit empty `--related-questions=` when the known lineage contains no additional related questions. Omitted question-lineage context must remain unknown for confirmation/transfer rather than being treated as proof of freshness.

## Handoff

Close with a dated report and reconcile:

- `solver-optimization-workstreams.md`;
- `solver-future-work.md` only if the descendant/reopen condition changes;
- capability memory if the observation reveals durable complementary capability.

No production solver behavior changes in this preflight.
