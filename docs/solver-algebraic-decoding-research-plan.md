# Algebraic decoding of Pathfinder solutions — research plan (2026-10-12)

> **Status:** active, **premise-discovery only**. No new production solver strategy, flag, scheduling change, bulk campaign, or treatment authority.
> **Current-main reconciliation:** `3cdbb1fc169827b1efb411e190fd7c76096bf02d` (2026-10-12 inspection).
> **Owner:** existing solver-science priority authority `docs/solver-optimization-workstreams.md`; this plan owns the *method and ordered gates*, not queue priority.
> **Premise family:** small exact projections / joint future feasibility / topology / composition. Terminology: *algebraic decoding* is an analogy to constraint recovery, not a claim of encryption or cryptographic security.

## 1. Question, rivals, and decision

Can a level's requirements and static/dynamic mechanics be represented as a small algebraic or constraint system which **deduces forced structure, impossible choices, or a small completion plan** before ordinary forward-path search spends comparable work?

Three distinct claims must not be conflated:
1. **Necessary-condition decoder:** an inexpensive projection rejects impossible residual states missed by current scalar bounds, parity, connectivity and BC1/BC1-VX.
2. **Plan decoder:** a relaxed complete-path or regional-interface model produces partial commitments that are realizable, useful to guide/revise search, and cheaper than searching without them.
3. **Complete-path decoder:** exact SAT/CP-SAT/SMT/ILP reconstruction independently produces canonical referee-valid paths on currently unserved inputs at acceptable cold work/wall cost.

Rivals: (a) equivalent algebra restates existing parity/bridge/connectivity; (b) a projection is sound but weak; (c) it is informative only after most of the search was spent; (d) abstract plans are unfaithful due to path history, revisits, portal jumps and flipper state; (e) exact models win offline but cost more than their saved production work; (f) isolated gains are produced by selection bias rather than a transferable mechanism. Useful inverse: measure *under-determination* as carefully as forced structure. A large GF(2) nullspace does not establish many valid legal paths; a unique parity assignment does not establish a unique legal path.

Decision consequences: retain a new projection **only** on an incremental exact consequence with a decision-bearing consumer and measured cost; otherwise close its precise form and preserve evidence. The ambitious plan/complete decoder is a conditional descendant, not an automatic architecture build.

## 2. Exact semantics and tempting but invalid shortcuts

Canonical rules: `DEVELOPER_REFERENCE.md` and `docs/mechanic-state-contracts.md`. A path begins at one gate, ends at the goal, uses orthogonal steps and zero-count portal jumps, and wins at exact counted length/intersections plus mechanic obligations. Revisits are allowed subject to directional edge/entry history; required intersections count returns to visited cells, not generic undirected graph crossing. Filters, global-parity flippers, two-pass must-cross, orientation-sensitive turns, portals, false goals, gates, and landmarks affect feasibility.

For any realized walk in an undirected *transition multigraph* and chosen gate `g` / goal `t`, edge-traversal parity `x_e = n_e mod 2` obeys

```
              B x = e_g + e_t         (mod 2).
```

Here `B` is the vertex/edge incidence matrix over GF(2). This is exact for a realized walk **only if every actual transition is represented**, including portal transitions when they are supported, and all physical path steps map to the corresponding multigraph edges. Treating a directed/forced portal as an undirected optional edge is a *superset relaxation* and cannot by itself establish a legal route. For a simple connected graph, `rank(B)=|V|-1`, `dim ker(B)=|E|-|V|+1`; with `c` components, rank `|V|-c` and kernel dimension `|E|-|V|+c`. These are algebraic freedom counts, **not** counts of valid Pathfinder solutions.

Bridge-edge parity is fixed: a bridge separating gate and goal must be crossed an odd number of times; any other bridge is crossed an even number of times. A nonbridge edge's parity is not fixed by *incidence equations alone* when endpoints connect. An even-parity bridge is **not** necessarily unused: it may be traversed twice. The usual `reqLen mod 2` checkerboard constraint for portal-free orthogonal grids is already a consequence of the incidence system; do **not** sell that as a new theorem or new runtime prune.

Additional constraints (length, visit multiplicities, directed entry axes, available supports, crossing quotas, required regions, mechanic state) may remove the GF(2) ambiguity, but each constraint must have a stated relaxation direction and counterexample coverage. A partial prefix changes the residual endpoint and reachable transition resources: fresh, used axis, straight-through-on-used-axis and portal-flipper history cannot be guessed from a static graph. A new hard reject must prove every canonical completion is represented by the model.

Potential stronger forms to test separately: (i) coupled cut-crossing parity with capacity and mandatory-region obligations; (ii) Hall-style matching between scarce directional visits and required supports; (iii) small finite-state residues for portals/flippers/turns; (iv) separator transfer matrices indexed by length/intersections/endpoint axes; (v) conflict cores and refinement of an abstract completion plan. All are *hypotheses*, not proven new capabilities.

## 3. Already existing, and what NOT to build

- `docs/solver-small-exact-projections-program.md` already owns proof families (transition invariants, necessary-condition relaxations, dominance and equivalences), novelty witnesses, mechanics perturbation and economics.
- `docs/solver-reasoning-capability-atlas.md` identifies joint feasibility, path-history topology, decomposition, causal conflicts, non-prefix search objects, and bounded exact queries as gaps. These are existing semantic owners, not seven new queues.
- Production `modules/solver/*` already has parity, goal-distance/MP/MC bounds, connectivity and BC1/BC1-VX; `docs/solver-optimization-workstreams.md` retains the *unfinished* BC1-VX production A/B.
- `scripts/stress/cpsat-reference-probe.py`, `cpsat-core-probe.py`, `cpsat-solution-count-probe.py`, explicit-prefix reference scripts and `scripts/stress/offline-replay-harness.mjs` supply existing exact/relaxed/referee-labelled capabilities. The solution-count probe explicitly counts a core *relaxation* and caps enumeration: neither its counts nor timeouts establish exact full-game uniqueness.
- `scripts/stress/probes/separator-resource-probe.mjs` and `joint-obligation-mc-portal-probe.mjs` already test related joint resources; do not reimplement them with algebra branding.
- `docs/variant-level-research.md` and the active PG-G `reports/2026-10-07-controlled-technique-response-neighborhoods-plan-001.md` supply controlled parent/variant x isolated-technique response; use them to nominate a *specific* differentiating mechanic later.
- `docs/solver-offline-replay-harness.md` owns production-inert evaluation. Do not create another universal harness, ledger, proof store, model language, solver portfolio, synthetic level source, or GHA workflow at Stage 0.

Discovery limitation: the linked repo has an unindexed GitHub code-search surface; inspection used the recursive main tree and explicit source/authority fetches, not an empty code-search result as an absence proof. Before any new runtime capability, run local `tooling-census`, `research-status-index`, `research-asset-query`, and stable-question dossier joins from a full checkout.

## 3A. External repository search before any solver lane

A broad [2026-10-12 source-code search and reconciliation](../reports/2026-10-12-algebraic-decoding-external-code-repo-audit-001.md) has now inspected/reconciled 91 [evidence-graded candidate repositories](../reports/2026-10-12-algebraic-decoding-code-repo-candidates-001.json). It revisits the [2026-08-24 external code census](../reports/2026-08-24-external-solver-code-census.md) and [cancelled frontier/ZDD pilot](../reports/2026-08-24-frontier-zdd-pilot-spec.md). **Do not treat frontier/ZDD, SAT/SMT, or global graph connectivity as newly discovered.**

The search added *specific* new reference code: `hana-hiro/graphillion-trails` for repeated-vertex/edge-disjoint trail diagrams; `semiexp/cspuz_core` for conflict-reason-producing native graph division and parity-loop modelling; `xzy06/slitherlink_solver` for iterative global-loop elimination; plus the F# `leymbda/numberlink` crossing-lane model (incomplete: shadow-cycle TODO and no extracted Flow on SAT), Japanese C# `wix-diesel/ZDD.Net` frontier/linear constraints, and source comparisons of Graphillion, TdZdd, Grilops, Witness/Zip and CryptoMiniSat. The TypeScript `logic-pad/grilops` port flags its own path module as buggy. Source-grade labels matter: a search hit is not a verified algorithm; claimed external speeds are not Pathfinder measurements.

Before Stage 1, choose **no implementation lane by default**. First form a Pathfinder-specific smallest discriminator and a mechanic-support matrix; compare the appropriate external source against canonical parity/connectivity/BC1, existing separator/joint-obligation probes and retained CP-SAT. In particular test whether trail/DD encodings admit every legal Pathfinder crossing and whether their spurious/false forced edge assignments are manageable. The external-code search by itself does not re-open the cancelled frontier pilot or grant a production treatment.

A second, [mechanic-first primary-source audit](../reports/2026-10-13-mechanic-first-crossing-decoder-source-audit-001.md) found genuinely implemented crossings in Noqx (ASP H/V reachability and directed entry/exit), Nikoli/Z3 Icebarn (ordered edge segments), Japanese PuLP Icebarn (direction-specific flow), and IceLom C++/Python (edge-domain fixpoint, failed-assumption forcedness, independent oracle/differential tests). CP-SAT region-border quotas in EntryExit/DoubleBack are useful comparator idioms. Crucially, IceLom documents a historical **false-dead** when crossing strands were fused in connectivity. **Do not call split H/V lane support new**: the 2026-08-24 Pathfinder frontier spec already owns that derivation. Candidate next consequence must be joint residual lane/cut/resource *incremental* to native BC1/MC bounds, proved with both a DEAD refutation and a LIVE crossing-sensitive control. The source audit is not an implementation nomination and leaves the program's lane choice open.

## 4. Stages and executable gates

### Stage 0 — algebraic validity and novelty preflight (started)

- Add an **offline-only, deterministic, dependency-free** incidence/bridge-parity preflight on a clearly stated portal-free orthogonal-core relaxation. It returns rank/nullity, gate-to-goal reachability, parity-fixed bridge edges, and parity-free edge counts, plus explicit unsupported/abstention reasons for special transition mechanics. It claims neither Pathfinder forced moves nor a production prune.
- Test path-derived edge-parity syndrome on exhaustive tiny walks, cycles, two-gate examples, disconnected graphs and bridges. Include a walk traversing a bridge twice (even parity but used) and a grid parity-redundancy witness. Ensure unsupported portal mechanics abstain, not silently mislabel.
- Optionally inspect **a bounded, named development sample** from `data/levels.json` with per-level `id`, geometry, method, applicability, graph rank/nullity and fixed-edge fraction. This is a structural census, not an estimate of solve count or generalized benefit.
- Advance only with a candidate fact that separates a demonstrated LIVE/DEAD or retention decision **beyond** existing connectivity/parity/BC1 and whose computation can plausibly be cheaper than the displaced work. A null/redundant result closes *incidence-only* decoding, not coupled-resource algebra.

### Stage 1 — one stronger coupled constraint, no production modification

Candidate A: regional cut-crossing syndrome **plus required-visit directional/capacity resources**; candidate B: obligation-to-support Hall/matching infeasibility. Select A or B only after the Stage 0 novelty audit and an explicit mechanics matrix. Produce a complete micro-instance proof, redundancy counterexample and **smallest nonredundant witness**. A cut from a simple grid is insufficient if current connectivity/BC1 already catches it. Compare against `separator-resource` and `joint-obligation-mc-portal` probes. Every model must classify ordinary moves, revisits/used axes, gates, portals, filters, flippers, must-cross, surround, must-turn and adjacent-turn as supported, safely relaxed or unsupported. No full-model UNSAT declaration after timeout/unsupported input.

### Stage 2 — shadow correctness and incremental value

Use existing exact/reference labels and the canonical witness-bound offline replay harness. Pre-register: selected development parents, alternate/representative parents, semantic probe version, work envelope, opportunity denominator, comparator/prune set, supported states, abstentions and budget. Compare dead catches *beyond the existing gauntlet*, LIVE false-rejects, overlap, decision depth, and observer overhead. Count unique independent parent families separately from states. If no novel catch or consumer headroom, close this precise form and stop.

### Stage 3 — abstract-plan decoder only if Stage 2 identifies structural demand

Encode limited subproblems as a flow/constraint transfer state (regions, interface entry/exit, required obligations, length and intersection contributions). Try plan -> canonical witness reconstruction; when it fails, add a **sound**, tested conflict excluding exactly the impossible abstract assignment (CEGAR), without silently excluding other legal completions. Compare abstract-plan survival, refinement rounds, path validity, and work against native search and existing CP-SAT on the same supported input. The distinct promise is a useful non-prefix search object; if abstract contracts explode into near-full path histories or reconstruct poorly, record closure (prior C0-C2 decomposition and full-MITM negatives are mandatory comparators).

### Stage 4 — possible production treatment, only when earned

Choose the *smallest* consumer: startup presolve, at-branch prune, scoring hint, exact micro-query, or repair-plan interface. Static board predicates must be level-blind; persisted hints, identity, prior outcomes/solutions, and historical variant classifications may never steer a cold solve. Run existing preflight, execution-family canaries and pinned **aggregate** `workSpent` matched A/B with explicit no-harm population. Correctness uses canonical referee and adversarial mechanic/soundness checks; apparent speed from wall-only comparison is not enough. Maintain rollback/default-OFF until the normal queue/evidence/promotion contract is satisfied; only the live workstream authority can schedule this stage.

### Stage 5 — splash-zone and hostile closeout

Reconstruct changed semantic contracts from main rather than this PR's diff; update live queue/future work/stable question relations/promotion ledger **if their truth changes**; reconcile architecture, research assets, tooling census, docs, CLI/test inventories, experiment manifests, workflow lifecycle and historical-reader distinctions. Preserve dated negatives, independent-unit provenance and exact model support/timeout statuses. Retire experimental scaffolding with no surviving consumer. A fresh agent must be able to reproduce every admitted scientific claim without trusting this plan.

## 5. Impact and execution topology

| Surface | Stage-0 disposition | Later conditional disposition |
|---|---|---|
| game rules/schema / renderer / UI | unchanged | unchanged unless independently earned |
| solver `modules/solver/*`, production workers, sequential/raced orchestration | unchanged | gated at Stage 4; parity/soundness/flags/work matching mandatory |
| CP-SAT and existing oracle/referee tooling | reuse, no model modification | extend only if Stage-1 supported domain demands it |
| research probes / offline replay / technique census / family experiments | reuse | selected witness-bound shadow/equal-work cells |
| evidence stores, hint persistence/Firestore, raw and historic reports | unchanged | new versioned reports; no migration/backfills by default |
| package scripts / GHA / lifecycle | no new maintained workflow | add CLI/test alias only if ongoing consumer earns it |
| solver workstreams / future work / question relations / opt-in ledger | link this premise as research-only, no reordering | transactional reconciliation on actual evidence/treatment change |
| docs/catalogues / agent onboarding | link bounded plan in owning queue | refresh usage only once tooling is maintained |

Execution: Stage-0 script runs under plain Node in a full checkout; no browser/worker/CI/raced semantic claim. Stage-2 uses bundled TypeScript replay with real `applyMove` state and the precise witnessed source path; Stage-4 requires testing all applicable production entrypoints. Branch PR CI is an integration gate, not evidence of a scientific success; local `ci:fast && build` (deep `ci && build` when runtime hot path changes) remains the finish line.

## 6. Measurements and stopping rules

For each observation retain: code/ref; corpus and selection rule; level/family identity and independent parent; model version; mechanic support; graph or prefix; exact-vs-relaxation status; FULL/LIVE/DEAD/UNKNOWN/UNSUPPORTED/TIMEOUT without collapsing; current-gauntlet comparison; canonical `workSpent`; model runtime/work; referee witness identity. If a candidate proves only graph parity, classify evidence as **structural** and do not label it a solve.

Stop on: no novelty witness against existing inference, broad underdetermination without a small derived relation, model leakage/unsoundness, high abstention, only late redundant catches, no real production opportunity, reconstruction contracts matching full search histories, or cost above displaced work. Negative results close the exact form tested; do not declare the entire algebraic family impossible.

## 7. Current handoff

1. Stage-0 source, tests, a reproducible bounded structural preflight and honest initial report.
   - The source-code reconnaissance is now documented as a separate bounded evidence report; it cannot count as a Stage-1 nonredundant theorem or trigger architecture work.
2. Only after inspecting the Stage-0 observations and existing probe/CP-SAT records: identify one *specific* coupled fact and stage-1 discriminating tiny witness, or close the incidence-only form as redundant.
3. Do not preempt pending BC1-VX production A/B or PG-G pilot. Any queue change must stay premise-discovery / method, with **no treatment entitlement**.

**Definition of done** is deliberately phase-local and machine-backed in the sibling `.quality.json`; the whole program is *not* done because this Stage-0 PR merges.
