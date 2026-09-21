# Solver research information-retention audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — repository-wide producer/combiner/publisher/retention/analyzer audit on current solver-research architecture
> **Decision:** keep the production level-blindness boundary unchanged; retain current bounded/opt-in telemetry policy; address one compact identity projection defect and a small number of reconstructability/closeout gaps prospectively
> **Remaining gate:** implementation planning for the narrow candidates listed below; no further broad information-retention survey is required
>
> **Evidence role:** forensic
> **Inference scope:** maintained solver/research tools, workflows, evidence resources, and representative reducers inspected during this audit
> **Primary working audit:** `docs/solver-research-information-retention-audit.md`

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"Preserve the production level-blindness boundary and current bounded telemetry posture; prospectively fix compact action/config identity and close reconstructability gaps without creating a raw-artifact warehouse.","remainingGate":"Implementation planning for the narrow identity, deterministic-refresh, and closeout-procedure candidates documented in docs/solver-research-information-retention-audit.md.","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"maintained solver/research producer and evidence surfaces inspected from repository current state","inferenceScope":"repository architecture and research-evidence retention behavior only"},"claimRefs":[],"sourceArtifacts":["docs/solver-research-information-retention-audit.md"],"prospective":{"expectation":null,"surprise":"The dominant remaining problem is late scientific promotion/reconstructability, not missing solver instrumentation.","anomaly":null}} -->

## Question

The audit began with a narrow concern:

> Production solving must remain level-blind, but solver research is not level-blind. Are level-blind sweep tools accidentally preventing useful research information from being collected?

The answer is:

**No at the solver-input boundary, but yes at some downstream retention and projection boundaries.**

The level-blind architecture is fundamentally sound. The worker receives mechanics/current-invocation information only; the parent can safely reattach identity and perform offline research joins after the solve. No level-blind invariant needs to be loosened.

The broader audit then followed information through:

```text
puzzle/corpus
  -> solver input
  -> search/attempt state
  -> solve result
  -> sweep row
  -> shard
  -> combined result
  -> standard publication
  -> durable evidence/resource
  -> analyzer/reducer
  -> report/decision
```

and asked what was discarded, downgraded, overwritten, or left on an expiring artifact clock at each boundary.

## Main conclusion

The repository is substantially stronger at preserving:

- scientific provenance;
- population integrity;
- exact experiment identity;
- successful discoveries;
- decision-bearing experiment bundles;

than at preserving every piece of explanatory process evidence.

That imbalance is mostly **intentional and healthy**.

The 2026-09-19 failure/search-loss program already measured richer diagnostic collection and deliberately kept prune/flow/progress telemetry opt-in. Rich search-loss capture remains question-driven because its measured cost is materially higher and no recurring producer has earned routine capture.

The audit therefore does **not** recommend broad telemetry expansion.

The remaining problems cluster around two narrower themes:

1. **identity/projection correctness**, where information already exists but is put into the wrong compact field;
2. **late scientific promotion**, where an exploratory or specialist acquisition later becomes important enough to cite or reuse, but its primary rows remain artifact-bound.

## Finding 1 — level-blindness is not the culprit

The production boundary already has the right one-way shape:

```text
legal current puzzle/current invocation
        -> solver
        -> observations/results
        -> parent-side identity + history + exact/reference/family enrichment
```

Offline joins against historical outcomes, exact/reference labels, family relationships, provenance, known solutions, and current research resources remain legal because they occur **after** the solve and do not steer it.

The audit found no reason to weaken or reinterpret `docs/solver-level-blindness.md`.

## Finding 2 — compact failure response currently collapses configuration and action identity

This is the clearest correctness-quality defect found.

Canonical identity already distinguishes:

- **configuration identity**: scoring/profile/beam/repair/admissible-order configuration;
- **action identity**: scheduler stage + configuration + repair seed salt;
- gate and budget as separate dimensions.

Production sweep rows already preserve both:

- `winningConfig`;
- `winningActionKey`.

The compact response schema also exposes both:

- `configurationKey`;
- `actionKey`.

But `compactFailureResponseRow()` currently projects common winner fields as:

```text
configurationKey <- row.configurationKey ?? row.configKey
actionKey        <- row.winningConfig ?? row.winningConfigKey ?? row.actionKey ?? techniqueKeys
```

For ordinary production sweep rows that means the configuration key is placed in `actionKey`, `configurationKey` is left null, and the real `winningActionKey` is ignored.

This degradation propagates into maintained downstream consumers including:

- failure-response novelty phenotypes;
- purpose-filtered failure evidence;
- hint/failure-process joins.

The prospective fix should preserve the type distinction, not merely add another fallback:

- configuration winner mirrors belong in `configurationKey`;
- canonical action winners belong in `actionKey`;
- absent real action identity should remain unknown rather than relabeling a config or multi-technique cell as an action.

Historical compact documents may already contain config strings in `actionKey`, so implementation must include backward-aware query/normalization handling.

## Finding 3 — richer failure diagnostics are intentionally not durable-default

The first pass noticed that level-blind workers already collect:

- beam-flow counters;
- prune reached/rejected counts;
- bounded DFS/beam/repair progress transitions;

and that these do not enter the standard compact failure response.

That omission initially looked suspicious.

The audit then reconciled the 2026-09-19 compact-diagnostic closeout. That program already measured parity, payload, and hosted overhead and explicitly chose:

> research-only opt-in / canonical semantics / parity-calibrated

rather than durable-default promotion.

Likewise, recurring rich search-loss capture was closed negative pending a real recurring consumer.

Therefore this audit does **not** reopen those choices.

## Finding 4 — deterministic stress refresh has a real long-horizon explanatory gap

Ordinary non-deterministic stress refreshes commit the broad current combined reports, so Git history retains their full rows.

Deterministic research refreshes intentionally avoid overwriting continuity/baseline report pointers. They commit immutable per-run projections instead.

Those projections retain:

- id/outcome/status;
- nodes/work/elapsed;
- deadline state;
- winning configuration;
- attempt count;
- failed strategies;
- solution;
- derived lifecycle maps when enabled.

They do not retain the full:

- attempt sequence;
- canonical winning action identity;
- stage lifecycle;
- compact diagnostic information;
- future explanatory row fields.

The full deterministic primary remains available in the standard Actions artifact for 90 days.

A naive fix would be bad. Current report sizes are approximately:

- Corpus 1 full primary: 1.3 MB;
- Corpus 2 full primary: 61.1 MB.

Historical per-run projected Corpus 2 records are roughly 2–3 MB.

The smallest plausible improvement is therefore to measure a durable **compact failure-response attachment** for deterministic refreshes, alongside the existing per-run projection and lifecycle map, rather than commit every 61 MB primary.

That compact attachment should only be considered after the action/config identity issue above is corrected.

## Finding 5 — the recurring weak seam is late scientific promotion

Several workflows intentionally acquire evidence without declaring a scientific verdict:

- targeted level-blind sweeps;
- exact/reference CP-SAT acquisitions;
- cross-run reconciliation;
- forensic/method-probe investigations.

That is correct. Acquisition tooling should not invent a hypothesis verdict.

The problem occurs when those bytes later become a durable premise, closeout, promotion/closure decision, or recurring research resource.

Examples:

### Targeted sweeps

The targeted workflow has strong population, integrity, participation, contract, and standard-publication plumbing. But it does not declare a research outcome, so it cannot automatically become a durable decision-bearing v3 bundle.

The optional `persist_failure_response` switch preserves only compact failure response + manifest and must be chosen at dispatch time.

A run can therefore become scientifically important **after** inspection while its full source rows remain on a 90-day clock.

### Reconciliation

The cross-run reconciliation workflow correctly proves that multiple leaf acquisitions form one coherent frozen population and preserves their ancestry.

It does not declare the later scientific conclusion.

So:

> reconciled acquisition != durable scientific verdict

That distinction is correct, but a later closeout must decide whether the exact reconciled evidence needs longer-lived reconstruction.

### One-shot diagnostics

Older one-shot convention says to delete bespoke workflow wrappers after the answer is recorded.

That is good hygiene, but some historical reports preserve only aggregate findings/representative rows while pointing to the full row set in an Actions artifact.

The conclusion remains valid after artifact expiry, but row-level re-analysis becomes impossible.

## Finding 6 — the needed closeout rule already mostly exists

The Resource Contract already says:

- identify primary evidence needed to reconstruct a decision-bearing claim;
- determine whether it will remain durable for the expected reuse horizon;
- preserve the smallest reconstructable bundle prospectively, or explicitly record the expiration/reconstructability boundary;
- do not pretend a durable summary substitutes for primary rows when later audit depends on row distinctions.

So no new “evidence graduation framework” is needed.

The small gap is that the **generic investigation closeout checklist** does not visibly carry this rule.

The likely procedural improvement is just to propagate the existing Resource Contract requirement into ordinary investigation closeout:

> If artifact-bound or branch-bound source evidence materially supports the durable conclusion, either preserve the smallest existing-compatible reconstructable bundle or explicitly state what expires and what later audit will no longer be possible.

No new closeout schema field is justified yet.

## Finding 7 — exact/reference evidence already has the right practical persistence pattern

The generic CP-SAT explicit-prefix workflow is intentionally artifact-only and is not a Pathfinder compact-attempt producer or binary experiment-verdict rail.

When exact labels have actually become reusable research inputs, the repo already tends to commit purpose-specific datasets such as:

- `reports/stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json`;
- the winning-prefix atlas material and dated report.

That is the right scientific shape:

```text
generic exact acquisition
  -> purpose-specific labelled dataset/report
  -> durable research input
```

The generic exact workflow does not need to become a universal archive.

The procedure merely needs to make this graduation expectation explicit when an exact/reference acquisition becomes reusable.

## Finding 8 — failed/cancelled salvage is intentionally success-asymmetric

Many solver workflows persist rows incrementally and upload artifacts before surfacing a failure.

The main harvester therefore does excellent salvage of positive evidence from failed/cancelled runs:

- Hint/provenance merging;
- valid solved-row reconstruction;
- isolated valid solutions;
- quarantine rather than discard when evidence cannot safely attach to current main.

But partial negative/process rows generally do not receive a generic durable import.

That is scientifically reasonable because an incomplete run must not become a clean null.

Those partial rows can still be useful forensic/mechanism evidence, but this audit found no demonstrated recurring consumer sufficient to justify a new partial-negative archive.

Leave this measurement-gated.

## Finding 9 — branch-local commit is not synonymous with canonical durability

Some research workflows commit rich generated evidence back to the dispatched feature/research branch.

That is correct for branch-first experimentation.

But survival depends on what happens to the branch:

- merged evidence commit -> retained repository history;
- abandoned/deleted branch -> rich evidence can become practically unavailable after Actions expiry;
- main harvester rescues only supported evidence layers.

The audit therefore uses separate destination classes:

- canonical-main;
- merged-history;
- branch-bound;
- durable-experiment-bundle;
- artifact-bound;
- operational-overwrite;
- recomputable;
- unknown.

This is a documentation distinction, not a demand that every branch artifact move to main.

## Finding 10 — generated interfaces may outlive their source semantics but not their source bytes

A notable example is `hint-discovery-process`.

The Hint schema deliberately does not embed the full failed-attempt sequence preceding every discovered solution.

Instead, the generated interface reconstructs:

- preceding failed attempts;
- winner;
- exact solution match;
- run/protocol/solver/population identity;

from the source solver report.

This avoids Hint-schema bloat, which is good.

But a Hint can remain durable after the solver report required to reconstruct its discovery process has expired.

This is another example of:

> success durability != process durability

No default Hint-schema expansion is recommended.

## Finding 11 — analyzer information loss is localized

The audit did not find a broad reducer problem.

Several maintained analyzers preserve useful row-level structure alongside aggregates:

- work-ladder response keeps per-level response;
- technique niches keeps derived per-level rows;
- census temporal stability keeps changed-level identities and gained/lost IDs.

`analyze-solver-winning-attempts.mjs` is a more genuinely lossy example: it constructs normalized winning-attempt rows internally but writes only aggregate config/tail summaries.

That may merit a future output extension if exact tail attribution becomes recurring. It does not justify a repository-wide “serialize every intermediate dataframe” rule.

## Finding 12 — most potentially useful transient solver knowledge already has observer seams

The solver already exposes specialist research hooks for:

- beam decisions and flow;
- prune composition;
- bounded progress;
- repair elite arrivals;
- repair choice sets/random draws;
- connectivity rejection structure;
- parity/phase shadow facts;
- joint-obligation propagation;
- beam continuations.

The genuinely unobserved compact areas are narrower, such as:

- DFS subtree/backtrack anatomy;
- cache/repeated-work economics.

Those are not automatically information-retention work.

PR #1940's batch-digestion audit already owns compilation/cache/reuse economics, while search-loss owns selective event/state capture.

This audit should not create a competing workstream.

## Small implementation queue earned by the audit

### 1. Compact identity normalization

High confidence.

Correct row-level compact projection so configuration and action identities remain distinct. Add producer-specific tests and historical compatibility handling.

### 2. Deterministic-refresh compact durability measurement

Measure:

- compact response bytes for representative full C1+C2 deterministic refresh;
- whether existing per-run projection + lifecycle maps + corrected compact response answer current longitudinal/action/dose questions;
- what important question still requires the full 61 MB primary.

Only then decide whether to persist the compact document under the immutable capability-run directory.

### 3. Generic closeout reconstructability sentence/check

Propagate the existing Resource Contract durability/reconstructability rule into the ordinary investigation-report closeout checklist.

Do not invent a new registry or closeout object.

### 4. Evidence-survival discoverability

Clarify somewhere existing and lightweight that:

- `automatic-harvest` means the workflow participates in a harvester;
- it does not promise every evidence layer survives;
- generated-interface status does not mean durable instances exist.

The exact home should be chosen during implementation planning. Avoid a new mandatory registry field unless a real consumer needs it.

## Explicit non-actions

This audit does **not** recommend:

- weakening level-blindness;
- universal rich telemetry;
- universal prune/flow/progress persistence;
- retaining all raw Actions artifacts;
- a new research warehouse;
- a new exact-label database;
- full failed-attempt payloads for every census cell;
- automatically persisting incomplete negative runs;
- copying full 61 MB deterministic primaries into Git every run;
- adding every solver cache/repetition counter;
- expanding the Hint schema with full pre-win attempts;
- a new durability ontology or closeout registry.

## Final assessment

The original concern was worth pursuing because the repository genuinely was losing or downgrading some research-useful information.

But the deeper result is more reassuring than alarming.

The solver-research system has already solved most of the dangerous problems:

- level-blind provenance separation;
- fail-closed experiment identity;
- population integrity;
- decision-bearing persistence;
- missingness/truncation honesty;
- compact-vs-rich telemetry economics;
- successful discovery salvage.

The remaining weaknesses are mostly ordinary plumbing at **semantic boundaries**:

- a config accidentally occupying an action field;
- an exploratory run becoming important after its dispatch-time retention choice;
- a branch or artifact being treated as more durable than it really is;
- a durable conclusion outliving the primary rows that made later re-analysis possible.

Those are fixable without adding a major subsystem.

The useful architectural principle from the audit is:

> **Capture only what has earned collection; preserve identity faithfully; retain the smallest reconstructable evidence when scientific use outlives the acquisition artifact; let richer evidence graduate when a real consumer earns it.**
