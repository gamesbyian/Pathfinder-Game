# Static portfolio triage analysis

> **Status:** active
> **Last evidence:** 2026-08-24 — current `attempts.ts` policy, technique-census second-order analysis, and 2026-08-23 budget-cap efficiency report
> **Decision:** the scheduler should not begin from one global “cheap beams first” reorder. Current production already contains evidence-backed regime-specific orderings, including beam-first MustCross/high-intersection rules and deliberately DFS-first/beam-late exceptions. The first repricing join should preserve those known exceptions while concentrating scrutiny on expensive deep ordinary DFS/IDA continuations and additive retry tails; plain repair and `ida:none` remain protected specialist candidates until current residual `workSpent` proves otherwise.
> **Remaining gate:** compute current action-level reach/work/exclusivity by policy regime and ask where a cheaper action is eligible but delayed behind expensive failed work; compare that residual opportunity against the known beam-first negative regimes before nominating any reorder.
> **Evidence role:** discovery
> **Selection:** observational — action classes and policy exceptions are inferred from already-mined census evidence and current hand-authored routing history.

## Purpose

The isolated census creates a strong visual temptation:

- beams are cheap and self-exhausting;
- deep DFS/IDA often costs tens of millions of nodes;
- plain repair has distinctive deep capability.

A naive scheduler could therefore conclude:

> run every beam first, then repair, then the remaining deep searches.

Current production history says that is too coarse.

`modules/solver/attempts.ts` already contains several measured exceptions where action **order itself** was tuned because an apparently cheap search imposed unacceptable latency or simply did not fit the level regime. The scheduler must price actions conditionally on eligibility/regime and current predecessors rather than flattening all levels into one global ranking.

## What the census says in isolation

On the fully sampled frozen production-unsolved gap union:

- 219 levels have a winner among fully sampled techniques;
- plain repair alone covers 121/219;
- the first three coverage-selected techniques reach 153/219, about 70%;
- eight techniques reach 190/219, about 87%;
- full union coverage requires 22 techniques.

The cost-weighted cover has a different shape: a long run of cheap beam actions accumulates the first 105 solves, plain repair then adds 77 residual solves in one step, and deep DFS/IDA actions contribute a long thin tail.

That is useful headroom evidence, but it is not a production ordering because:

- the cells are isolated;
- cost is raw nodes, not current cross-technique `workSpent`;
- it ignores current archetype routing and stage budgets;
- it does not charge predecessor sequence effects;
- some action families, especially admissible-order, have unresolved P0 history dependence.

## Current production already contains multiple ordering regimes

### Beam-first regimes

Several high-intersection and MustCross rules already lead with beam actions because direct evidence says the beam is the right cheap search for those structures.

Examples in `attempts.ts` include:

- very-high-intersection portal-dense: diverse/WIDE objective/intersection beams before DFS;
- very-high-intersection non-portal: diverse/WIDE intersection/objective beams before DFS;
- medium-high-intersection: perimeter/standard/diverse beams before the feature-ordered DFS bundle;
- MustCross + heavy objectives: objective/MustCross/perimeter/intersection beam ladder before DFS;
- combined MustCross+MustPass: beam first specifically to avoid two expensive DFS timeouts.

These are the clearest existing examples of the scheduler principle “cheap screen before expensive search.”

### Deliberate DFS-first regimes

Other rules explicitly reject that ordering.

#### Near-Hamiltonian high-intersection

The rule leads with perimeter DFS because beams collapse over the long dense walk. Beam actions are retained later for complementary capability.

This is not merely inherited historical ordering. The source comment names beam collapse as the mechanism and routes around it.

#### Default/no-MustPass and catch-all default

These rules begin with template DFS/profile searches and place beam actions at the **end** inside the protected late reserve.

The comments preserve an unusually useful controlled history:

- adding beams after the templates but without a protected late slice produced essentially no participation/recovery;
- moving beams to the **front** recovered the target hard levels but imposed 1–6+ seconds of unnecessary beam work on many already-solving levels;
- on the published corpus that leading placement increased total wall time by roughly **94%**, with 66/160 levels meaningfully slower;
- the chosen compromise was trailing placement plus a protected node reserve, so previously unsolved levels can still reach the beam without taxing earlier DFS winners.

That is exactly why “cheap in isolated nodes” does not automatically mean “cheap as first production action.”

#### Portal-heavy

The portal-heavy rule similarly runs portal-transfer DFS/profile/template work before its beam suffix. Current comments link that late placement to the same measured latency problem.

So the current policy has already discovered a small form of **conditional scheduling** by hand.

## Consequence for the scheduler model

The first scheduler analysis should not have one scalar priority per action.

At minimum it needs action value conditioned on a coarse current policy context such as:

- applicable routing rule/archetype;
- current stage;
- whether an action is already an early screen, a protected suffix, or absent;
- predecessor work already paid;
- natural exhaustion/censoring state;
- current residual population after predecessors fail.

This does **not** mean the final runtime scheduler needs dozens of archetype-specific branches. It means the offline analysis must not erase the contexts that produced existing evidence.

A simple final policy may still emerge after repricing.

## First static action classes

These are research nominations, not production decisions.

### 1. Cheap/self-exhausting screens

**Beam actions**, especially the perimeter 2K and ordinary 2K/5K families.

Evidence:

- median exhausted hard-gap frontiers are roughly 0.12M–0.34M nodes depending on width/diversity;
- measured beam gap solves occur by <=1M and mostly <=500K;
- observational pair analysis repeatedly shows cheap perimeter beams retaining residual solves after deep failed DFS/IDA.

Scheduler treatment:

- protect existing beam-first regimes;
- in DFS-first regimes, ask specifically whether a beam is currently delayed behind expensive failures and whether moving it earlier reproduces the old latency regression;
- do not globally front-load every beam.

### 2. Protected deep specialist

**Plain repair.**

Evidence:

- 121/219 fully sampled hard-gap union solves from repair alone;
- 57/121 repair wins occur after 10M isolated nodes;
- 37/121 occur after 20M;
- meaningful yield continues through 20–30M, 30–40M, and 40–50M bands.

Scheduler treatment:

- represent repair as continuations/tranches, not one unlimited entitlement;
- preserve a deep path on the Pareto frontier until current residual `workSpent` shows a cheaper substitute;
- scrutinize the 40–50M tail because it is the weakest measured late isolated tranche, but do not cut it merely from isolated node economics.

### 3. Protected distinct deep candidate

**`ida:none`.**

Evidence:

- 13 frozen-gap wins versus `ida:default` that default misses in their direct comparison;
- five equal-cap exclusive 50M wins among fully sampled comparators, materially more than other canonical IDA profiles;
- cost-weighted cover selects it before other IDA variants.

Caution:

- admissible-order has the unresolved P0 history dependence.

Scheduler treatment:

- exclude ambiguous sequence-dependent cells from causal production repricing;
- keep `ida:none` as a distinct specialist candidate rather than collapsing all deep IDA into one redundant family.

### 4. Strong repricing nominations

**Deep ordinary DFS profiles.**

The frozen substitution screen finds ten ordinary DFS profiles whose hard-gap wins are each reproduced by at least one technique with lower mean isolated cost, while those DFS attempts average about 49.7M nodes in the hard-gap matrix.

This is the strongest static overspend signal in the current evidence.

It is still not a deletion proof. “Reproduced somewhere cheaper” does not prove that the cheaper substitute is eligible/reached before this exact production attempt, and a greedy portfolio can need a globally substitutable action after its substitutes have been displaced.

Scheduler treatment:

- prioritize these actions in the current `workSpent`/reach join;
- ask which specific DFS continuations are still paying large failed-work tax after cheaper eligible actions have run;
- nominate reduction/reorder only from current residual evidence.

### 5. Secondary repricing nominations

**Lower-yield informed IDA profiles**, especially where equal-cap exclusivity is weak and overlap is high.

`ida:default`/`mustCrossFirst`/`nearClosureRescue` have strong outcome similarity and weaker equal-cap exclusivity than `ida:none` in the frozen matrix.

Again P0 blocks direct production conclusions for sequence-sensitive admissible-order stages.

### 6. Mandatory tail audit

**Promoted additive retry stages**, including legacy-distance retry, multi-seed late repair, connectivity-axis retry, MustCross-neighbor-budget retry, non-default admissible retry, and other whole-ladder reruns.

Their historical “+N, zero regressions” results establish capability and safe dead-last placement on their tested populations. They do not establish current fixed-work value.

Scheduler treatment:

- charge failed work on every level that reaches the stage;
- decompose a whole-ladder retry to the narrower winning actions where possible;
- check whether upstream changes have made historical exclusives redundant;
- preserve genuine rare capability as a protected late action only when current residual evidence supports it.

## A useful current-policy invariant

The hand-authored policy repeatedly uses a pattern worth preserving as a baseline:

> **late protected complement**

An action with useful hard-level capability but unacceptable tax on easy winners can remain late while receiving a protected residual budget slice so earlier work cannot starve it.

This is not automatically optimal, but it is a much stronger comparison baseline than either:

- “run the action first because it is cheap in isolation”; or
- “leave it last with no budget protection because easy levels solve before it.”

The scheduler should have to beat this existing compromise at matched aggregate work.

## Smallest next join

For each current attempt-policy rule/context, compute:

- level count entering the rule;
- current main-ladder action order;
- reach count per action;
- success/exhaustion/censoring/budget-starvation counts;
- aggregate and quantile `workSpent` when reached;
- residual unique solves;
- whether a cheaper isolated substitute exists and is actually eligible in the same rule;
- whether that substitute already ran before the expensive action;
- whether the action is protected by late-reserve semantics;
- evidence note for known order experiments such as default beam-first +94% wall.

Then prioritize **actual inversions**:

> expensive action A currently fails before cheap action B, B remains residual-capable, and B was not already tested/rejected as an early action in that policy regime.

This is much narrower and safer than sorting all actions by isolated solves/work.

## What not to conclude yet

Do not conclude from this audit that:

- every beam should move earlier;
- every ordinary DFS profile should be removed;
- repair should always receive 50M-equivalent work;
- `ida:none` should move early;
- the existing hand-authored archetype policy is optimal;
- the isolated cost-weighted greedy cover is an implementable scheduler.

The correct conclusion is that the first scheduler should be a **repricing of the existing conditional action grammar**, preserving known ordering counterexamples, before it becomes a learned selector.

## Disposition

The likely fixed-work architecture is increasingly constrained:

1. cheap screens where they are genuinely cheap in the relevant production context;
2. protected deep repair capability;
3. a small number of genuinely distinct deep specialists such as `ida:none` if current evidence survives P0;
4. expensive overlapping DFS/IDA continuations forced to re-earn residual budget;
5. additive retry tails repriced rather than grandfathered.

The next decision-bearing work remains the action-level `workSpent` join, not another global reorder or new scheduler framework.
