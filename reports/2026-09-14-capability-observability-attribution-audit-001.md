<!-- agent-context-budget: warn=12000 max=16000 -->
# Capability observability and attribution audit 001

> **Status:** concluded-positive-with-one-live-inference-repair
> **Last evidence:** 2026-09-14
> **Decision:** Pathfinder usually preserves the distinction between capability and promotion economics, but the canonical residual atlas still overstates one observability boundary. Its Class 3 predicate proves exact dispatch plus family/stage non-starvation, not nonzero exact-action work or comparable dose. Class 3 therefore cannot, by itself, support “genuine comparable-work capability failure.” The stronger existing equal-work/production-reach join already has the right evidentiary contract and should be used whenever dose matters.
> **Solver consequence:** Class 5 remains the strongest acquisition frontier. Class 2 remains an exposure/composition frontier. Class 4 remains an allocation/economics frontier dominated by preserved portal coarse-state capability. Class 3 is demoted from a causal-negative bucket to a “dispatched/reached, dose still to be established” bucket unless row-level per-attempt work is joined.
> **Compute:** no new all-technique census or solver campaign. Existing current census, lifecycle, matched-cell, A/B, replay and production evidence were sufficient.

## Scope and upstream audits

This audit used the inference-first framework from PR #1793. PR #1794 and PR #1795 were read as provisional upstream evidence only; this branch does not depend on their implementation commits.

Audit 1 supplied two important constraints: nominal attempts with zero target-stage work are non-participation, and historical conclusions can remain valid while expiring Actions artifacts reduce later reconstructability. Audit 3 supplied the ancestry constraint: family replay, imported hints, Solution Profiles and path-derived diagnostics can be descendants of one accepted-path/replay lineage rather than independent confirmations.

The audited object was not “a technique.” It was a capability observation under a canonical operational identity and context:

`level/population × operational action × predecessor state × placement × work/dose × outcome`.

## Canonical identity findings

`docs/solver-technique-operational-taxonomy.md` is necessary authority for every join. The repo contains several identity layers that cannot safely substitute for one another:

- source/config identity;
- operational mechanism identity;
- scorer/order identity;
- beam versus DFS mode;
- width/budget/control settings;
- mechanic bucket and coarse-state semantics;
- repair/retry/prune action;
- scheduler stage/action identity;
- experiment treatment identity;
- capability-memory signature.

The September 12 turn-biased repair correction is the strongest calibration case. A bookkeeping `variantLabel` was mistaken for a modified-condition marker, excluding a real current T1 action from the atlas. With no new solving, the 652 residual changed from `22/17/48/125/440` to `22/39/37/123/431`; nine rows left “no known capability,” and the exact turn-biased action became visible on rows where production had only run the broader repair family. Identity repair changed the causal question before any scheduler work changed.

That correction also demonstrates why “repair ran” is not equivalent to “this repair guidance ran.” The current taxonomy is good enough to express the distinction. The residual classifier was not always using its full consequence.

## Current census and derived material

The current authoritative technique census is run `33717910218`. `docs/technique-census-analysis.md` correctly says the main gap is derived joining/valuation, not another census. This audit did not rerun it.

Two existing second-order surfaces are especially important:

1. the corrected residual atlas, which joins T1 wins to production exposure/reach; and
2. `scripts/stress/analyze-equal-work-production-reach.mjs`, which joins isolated EW1 capability to current production attempts and refuses decision-bearing output if lifecycle telemetry, per-attempt `workSpent`, corpus identity, commit identity, or matching action identity are missing.

The second tool has the stronger observability contract. The first atlas should not make a stronger dose claim than the second can prove.

## Capability observability crosswalk

The audit crosswalk is committed as `reports/2026-09-14-capability-observability-crosswalk-001.csv`. It is deliberately an audit view rather than a canonical capability database.

The useful state machine is:

1. no known isolated/current capability;
2. capability exists but action is not offered;
3. offered family/stage exists but exact action is not dispatched;
4. exact action is dispatched but exact-action work is unavailable or zero;
5. real participation exists but dose is below a demonstrated solve dose;
6. substantial comparable work exists and still fails;
7. capability depends on a different predecessor/search history;
8. capability works but fixed-work displacement or collateral blocks promotion;
9. historical nomination exists but current reconciliation is unavailable;
10. evidence is insufficient.

Not every action has every layer. Fresh isolated cells, additive retries and state-mutating whole-ladder treatments are not interchangeable contexts.

## Residual reclassification attack

The corrected atlas currently reports `22/39/37/123/431` across Classes 1–5. Those counts remain useful, but the Class 3 interpretation needs narrowing.

Before this audit Class 3 was labeled “known rescuer reached with comparable work but failed.” The actual predicate in `residual-classification-lib.mjs` is weaker:

- beam/DFS: exact action appears offered and exact identity appears dispatched;
- repair/admissible-order families: exact identity appears dispatched and no family stage is marked starved.

The predicate does **not** join exact-action `workSpent` or nodes, and family non-starvation is not proof that the exact action received meaningful work. Therefore the 37 Class 3 primary rows are not 37 demonstrated “more of the same work will not help” negatives.

This branch changes the Class 3 label to `known rescuer dispatched/reached; target-action dose not established by this classifier` and adds an explicit per-win `observability` grade. It does not fabricate a new class count. Stronger comparable-work claims must come from row-level attempt evidence such as the existing equal-work/production-reach join.

This is the audit’s main live repair.

## Real participation versus nominal presence

The required nominal-reach substitution attack changes interpretation in at least two places.

First, Audit 1’s admissible-order retry case had nominal target attempts across 150-row arms but zero useful target-stage work after upstream exhaustion. That evidence is non-participating and cannot support a causal repricing result.

Second, the residual atlas’s Class 3 predicate can currently observe dispatch without exact-action work. The correct classification is “dose unverified” until attempt-level work is joined. This is less severe than the admissible-order case because dispatch identity is real, but it still does not earn a comparable-work negative.

The repo already has the right stronger producer/consumer pattern: `analyze-equal-work-production-reach.mjs` blocks decision-bearing output when matched attempts lack `workSpent`, when `stageLifecycle` is absent, or when production provenance does not identify the current commit/corpus. The scientific repair is to reuse that contract, not create another telemetry system.

## Isolation versus production exposure

The six-row must-turn-biased repair population is the cleanest current positive calibration.

For `R02768`, matched 7M isolated cells give plain repair failure versus must-turn-biased solve at 1,179,294 nodes. For `R02180`, plain repair fails at 7M while must-turn-biased solves at 6,206,072. A real-orchestration run then reproduces both exact node counts in the additive child tier only after the ordinary late-repair attempt genuinely participates and fails. These are not nominal wins. They prove current capability plus correct late placement. What remains open is population economics/collateral, not acquisition.

`R03049` is the converse warning. Must-turn-biased repair solves it, but standard and turn-biased repair solve it more cheaply. Treating every must-turn-biased census win as a guidance gap would inflate mechanism reputation. The audit therefore preserves the six-row corrected guidance population rather than the original seven-row shorthand.

The September 12 identity repair supplies a broader exposure result: nine residuals once classified as “no known capability” actually had current turn-biased repair T1 wins; production reached repair context but did not dispatch that exact guidance. Those are composition/exposure questions, not acquisition questions.

## Winner-only attribution attack

Winner counts, isolated solve counts, union nomination, marginal A/B gain and unique rescue answer different questions.

The current research system generally understands this distinction. Technique-census second-order material exposes overlap and exclusives; capability memory explicitly says union is not an additive solve claim; matched experiments carry gain/loss accounting.

The strongest practical counterexample to winner-only reasoning is the must-turn population impurity above: `R03049` is a must-turn solve but not a must-turn-specific marginal capability. Likewise, portal coarse-state merge has a large positive basin but global promotion is negative because losses matter. A mechanism can be capable and still be economically bad in a tested placement.

No live workstream was found that currently ranks a technique for promotion from winner count alone. That is a meaningful negative finding.

## Predecessor-state and sequence dependence

Fresh isolated capability is not automatically scheduler-compatible capability.

Must-turn-biased repair earned stronger status only after a real-orchestration integration run placed it after a genuinely participating plain late-repair stage with a fresh child work scope. The exact isolated node counts reproduced there, which is unusually strong reconciliation between isolation and production sequence.

Portal coarse-state merge demonstrates the opposite shape. Global enablement mutates state equivalence inside primary search. `R01273` loses a known-live continuation because the coarse key merges states that differ in future-relevant visited/history information. The 8/8 current class-4 freshness replay proves the capability basin still exists under the global treatment semantics, but it does not prove that a proposed dead-last additive retry has identical economics or predecessor behavior. The narrower placement therefore remains a changed-treatment hypothesis, not an automatic consequence of isolation.

This satisfies the predecessor-history challenge: direct comparison is unsafe when the mechanism changes inherited search-state equivalence or when an additive child sees a different predecessor history than a fresh isolated cell.

## Capability-memory reconciliation

`docs/solver-capability-memory.md` is conceptually sound and current use largely follows it:

- historical signatures nominate rather than become current gains;
- absent candidate rows remain unknown;
- row gains/losses require conclusive sides;
- union is nomination coverage, not additive portfolio solves;
- production displacement is causal evidence but not automatically a bug;
- capability memory routes research rather than steering runtime.

The six-source September 12 reconciliation is a useful stress test. Its union reaches 179/652 current residuals, distributed `14/28/21/116/0` across Classes 1–5. Zero of the six sources reaches Class 5, while portal coarse-state alone nominates 113/123 Class 4 rows. The correct decisions followed: Class 5 remains acquisition-heavy; Class 4 earned a cheap freshness check rather than being declared solved or dead.

Audit 1 adds a retention qualifier: where primary Actions evidence expires, a historical capability claim can remain a legitimate nomination while independent row-level reconstruction becomes unavailable. The correct state is `historical-only / reconstruction unavailable`, not false and not current.

## Ancestry and independence

Audit 3’s ancestry result materially changes confidence accounting but not the live capability decisions inspected here.

Family replay, hints imported from that replay, Solution Profiles built from those hints, and path-derived diagnostics over the same accepted paths can be several representations of one causal lineage. They should count as one ancestry family when used to nominate a capability mechanism.

The must-turn dose pilot is a good pass case after ancestry collapse. Family evidence selected `R02768` and `R02180`; it did not prove efficacy. The current matched isolated cells and later real-orchestration run supplied distinct intervention evidence. Collapsing family/hint ancestry therefore reduces the number of “sources” but does not weaken the causal conclusion.

By contrast, a future claim supported only by family replay + imported hint + Solution Profile should remain nominative until an intervention or independent current execution confirms it.

## Calibration cases

| case | audit classification |
|---|---|
| global portal coarse-state merge | **capability present; tested global placement economically bad** (`+158/-12`; `R01273` collision) |
| current Class-4 portal line | **capability present/current; narrower dead-last placement still live** (8/8 freshness, global form remains closed) |
| must-turn biased late repair | **current capability present; placement proven on development pair; economics pending** |
| admissible-order retry zero-work case | **nominal attempt, non-participating; causal effectiveness unknown** |
| residual atlas Class 3 without attempt-work join | **exact dispatch/reach observed; comparable-work failure not established** |
| historical capability-memory nomination without current reconciliation | **historical-only / unknown current** |
| `R03049` must-turn winner | **shared solve, not a must-turn-specific marginal guidance gap** |
| `R01273` portal loss | **placement/state-equivalence failure, not absence of portal-coarse capability elsewhere** |

## Strongest falsification tests

1. **Nominal reach -> real participation:** broke one live label. Class 3 was too strong. Audit 1’s zero-work retry independently validates the distinction.
2. **Winner -> marginal:** current promotion machinery survives. Winner/isolated solve is not generally substituted for gain/loss or unique rescue; `R03049` catches the local population impurity.
3. **Isolation -> production:** finds both exposure gaps and successful reconciliation. Turn-biased repair rows move from acquisition to exposure after identity repair; must-turn-biased pair reproduces under real orchestration.
4. **Historical -> current:** portal coarse-state survives an 8/8 current freshness replay; its global negative remains scoped to global placement.
5. **Predecessor-history challenge:** portal coarse-state and additive late repair show that context can be mechanism-defining and must be recorded in the claim.
6. **Ancestry collapse:** collapsing family/hint/Profile/path descendants removes false multiplicity but does not overturn the matched must-turn current result because intervention evidence is separate.

## Claim propagation review

The main live workstream conclusions mostly survive:

- **Class 5 acquisition priority:** supported for the bounded six-source panel; no known panel capability reaches the 431 rows. This is not proof that no possible existing mechanism can ever reach them.
- **Class 2 composition/exposure:** strengthened. Exact-action identity matters and current must-turn work shows a real exposure seam can become a rescue.
- **Class 4 allocation:** supported. Portal coarse-state capability is current; the global form is closed; narrower dead-last allocation remains the correct question.
- **“global portal coarse is closed”:** supported only with the global-placement qualifier.
- **Class 3 comparable-work exhaustion:** narrowed. The atlas alone no longer earns this claim. Exact-action dose must be joined before “more budget cannot help” or “already enough work” language is used.

No scheduler policy is changed by this audit.

## Solver opportunities exposed

The audit changes where effort should go:

- **Acquisition:** Class 5 is still the cleanest place to seek genuinely new capability.
- **Exposure/routing:** corrected Class 2 identities and any EW1 solver that production never offers are cheap composition targets.
- **Participation/dose:** Class 3 candidates should first be priced with existing per-attempt work joins before mechanism retirement or new-capability work.
- **Sequence/state:** state-mutating treatments need placement-specific experiments rather than inference from isolated wins.
- **Allocation/economics:** portal coarse-state and must-turn-biased repair already own capability; research should measure safe exposure/collateral rather than rediscover them.

## Producer/query/tooling improvements

Shipped here:

1. residual classification schema v2 no longer labels Class 3 “comparable work failed”;
2. each known-rescuer row receives an explicit observability grade such as `not-offered`, `offered-not-dispatched`, `family-reached-starved`, or `exact-dispatched-family-not-starved-dose-unverified`;
3. a focused node test locks those semantics;
4. the audit crosswalk preserves the distinctions without becoming a new canonical database.

Recommended, not shipped because the machinery already exists: use `analyze-equal-work-production-reach.mjs` or a shared helper from it whenever a decision requires exact-action dose. Do not force scheduler fields into census rows that never experienced scheduling.

## Interactions with PR #1794 and #1795

No source changes from either PR were copied.

PR #1795’s non-participation result is applied here as an inference rule. Its reconstructability concern adds a `historical-only / primary reconstruction unavailable` state to capability interpretation. Durable experiment-retention changes remain Audit 1’s reconciliation scope.

PR #1794’s ancestry result is applied only where confidence would otherwise be double-counted. Accepted-path representative selection, winning-path metadata and prefix-oracle contracts remain untouched.

## Discarded or confounded analyses

- No new all-technique census was justified. Current census `33717910218` already answers isolated capability at its natural grain.
- The 37 Class 3 rows were **not** relabeled genuine capability failures from stage reach/dispatch alone.
- Family-stage non-starvation was not converted into exact-action work.
- Portal 8/8 freshness was not extrapolated into an unmeasured dead-last gain rate.
- Family replay, imported hints and Solution Profiles were not counted as independent votes.
- Historical signatures with unavailable primary rows were not backfilled from current defaults.
- `R03049` was not counted as a must-turn-specific guidance rescue merely because must-turn solves it.

## Explicit negative findings

Several hostile attacks failed, which is good news:

- capability memory does not silently convert nomination union into additive solves;
- global promotion negatives generally do not erase demonstrated capability;
- current portal work correctly separates global-form failure from narrower-placement opportunity;
- the must-turn program explicitly separated mechanism efficacy, integration and population economics;
- current experiment interpretation already rejects zero-work attempts as causal evidence;
- winner counts are not the main current promotion currency;
- Class 5’s bounded six-source zero remains intact after identity correction and capability-memory reconciliation.

## Methodology revisions from the audit

The initial residual classes were too tempting to treat as causal classes. They are better treated as a first join over identity and coarse lifecycle evidence, followed by a second join over exact-action dose when a causal negative is needed.

The useful inferential ladder is therefore:

`identity -> offer -> stage reach -> exact dispatch -> nonzero exact-action work -> comparable dose -> predecessor context -> outcome -> marginal/collateral economics`.

Stopping earlier is legitimate, but the conclusion must stop at the same layer.

## Bottom line

Pathfinder is already substantially better at preserving capability than a naive production-winner view would be. The strongest live examples are correctly separated: portal coarse-state is capable but globally unsafe; must-turn-biased late repair is capable and correctly placed but still owes economics; Class 5 remains acquisition-heavy.

The live weakness was narrower but important: the residual atlas’s Class 3 vocabulary outran its evidence. Exact dispatch plus non-starvation is useful observability evidence, but it is not proof of comparable target-action work. With that repaired, the solve-oriented decision boundary becomes clearer:

- **acquisition problem:** no known useful capability;
- **exposure/routing problem:** useful capability exists but is not offered or exact-dispatched;
- **participation/dose problem:** action is present but meaningful/comparable work is absent or unproven;
- **sequence/state problem:** capability depends on predecessor context;
- **allocation/economics problem:** capability works but costs or displaces too much;
- **genuine capability failure:** only after substantial comparable opportunity/work still fails;
- **historical-only/unknown:** evidence cannot support a current classification.

That is the distinction future solver-research triage should preserve before spending effort inventing a new mechanism.
