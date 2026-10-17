# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, execution state, and next gates.
> **Program state (2026-10-16):** BC1-VX representative A/B is positive: control 36772815197 solved 225/300 at 44.64B `workSpent`; treatment 37052447194 solved 232/300 at 42.75B, **7 gains / 0 losses**. Disjoint fresh cold-64 adds R01765 and R02951 (+2/−0, 1.19% lower work); promotion remains default-OFF pending an explicit, verified production change now that solved-control regression has passed. Premise discovery is broadly active after the [blocker audit](../reports/2026-10-16-solver-blocker-suspicion-audit-001.md).
> **History:** detailed narratives remain in the [2026-09-25 snapshot](../reports/2026-09-25-solver-optimization-workstreams-precompaction-snapshot-001.md), [2026-10-02 snapshot](../reports/2026-10-02-solver-optimization-workstreams-precompaction-snapshot-002.md), dated reports, and the [queue reconciliation](../reports/2026-10-16-solver-research-queue-exhumation-reconciliation-001.md).

Method: [operating model](solver-research-operating-model.md) · [evidence](solver-evaluation-evidence.md) · [future work](solver-future-work.md) · [reasoning atlas](solver-reasoning-capability-atlas.md).

## Current priority

1. Decide and validate BC1-VX default-ON promotion: solved-control 150 gate passed at 149→150 (+1/−0); full solver correctness, work/wall economics, runtime default/rollback and evidence caveats remain.
2. In parallel, run retained/shadow lanes PG-C/H/I/L/M/N and PG-G independent confirmation plus cold-key feasibility.
3. Continue bounded semantic microscopes PG-D/J/K.
4. Run PG-O and PG-P as cheap blocker-bypass diagnostics, not architecture/operator promotions.
5. PG-B remains an optional frozen pricing re-dispatch only if that compute becomes decision-relevant.

Promotion remains: **premise -> cheapest falsifier -> smallest consumer -> matched-work economics -> independent confirmation proportional to selection -> production promotion**. A later-stage threshold does not automatically prohibit a cheaper earlier diagnostic.

## Workstream state

This table is the machine-readable authority. IDs identify workstreams; they are not ranks.

| ID | Workstream | Execution state | Gate class | State / context | Next gate | Stable question ref |
|---:|---|---|---|---|---|---|
| 2 | Repair-deadline allocation | `closed` | `reopen-only` | promoted 2026-09-26; 7 gains/0 losses, 180/180 regression | materially different dose/premise | `WS2-REPAIR-DEADLINE-ALLOCATION` |
| 2I | Capability invention | `closed` | `reopen-only` | CID-0027/0028 promoted; 8 new solves, 0 regressions | materially different exposure | `WS2-CAPABILITY-INVENTION-DEMAND` |
| 1 | Automatic action selection | `on-demand` | `reopen-only` | offline capture confirmed; consumer is work-only, no cold-solve upside | explicit work-reduction objective or different signal | `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE` |
| 2X | BC1-VX production candidate | `active` | `design/implementation` | theorem sound (~861k witness states, 0 alarms); prior 300 +7/−0, cold-64 +2/−0, frozen solved-controls current 149→150 (+1/−0; −3.75% work), 0 attributable losses | explicit default-ON promotion decision, full solver correctness/CI and runtime budget checks; preserve independent-transfer caveats | `WS2-CUT-BALANCE-PROJECTION` |
| 2Y | BC1-VX shared hard-prune transfer | `active` | `instrument-only` | positive-A/B prerequisite satisfied; distinct volume consequence, not closed pipeline-wide BC1 | DFS/admissible participation/economics probe; repair opt-out | `WS2-CUT-BALANCE-PROJECTION` |
| 2F | Forced-work economics | `closed` | `reopen-only` | global/post-recognition/raw-degree forms closed | materially different sound recognizer | `WS2-FORCED-WORK-CAPTURE-ECONOMICS` |
| 2R | Parity response | `on-demand` | `reopen-only` | tested static response vocabulary closed | materially different parity mechanism | `WS2-PARITY-RESPONSE-SIGNATURE` |
| 6/7 | Repair dependency discovery | `active` | `instrument-only` | exact-pair confirmation had 2/24 eligible; that floor does not block observation | PG-P descent shadow; independent exact parents before reusable consumer | `WS6-DEPENDENCY-CONDITIONED-REPAIR` |
| 5 | Exact/reference service | `on-demand` | `service` | truth service for bounded microscopes | only when a live discriminator requires it | — |
| 3 | Generalization method | `method-complete` | `method` | independent-unit method established | preserve in confirmation | — |
| PG-C | First-loss refresh | `active` | `existing-data` | controlled counterfactual material sufficient | retained Phase-9 analysis before telemetry | `WS2-FIRST-LOSS-CAUSAL-REFRESH` |
| PG-D | Trail/switch feasibility | `active` | `bounded-compute` | toy-positive; real-prefix novelty unknown | canonical differential + one nonredundant exact fact | `WS2-TRAIL-SWITCH-FEASIBILITY` |
| PG-G | Symmetry tie-order causality | `active` | `bounded-compute` | parent-frame ordering restored 6/6 selected cliffs; cold mechanical D4 frame unique on 137/160 published and 1700/1700 Corpus-2 rows | independent-parent 12-parent confirmation; cheap setup-work measurement and opt-in current-input tie-key feasibility in parallel | `WS2-SYMMETRY-TIE-ORDER-CANONICALIZATION` |
| PG-H | Hidden semantic forcedness / all-dead late branching | `active` | `existing-data` | shallow 2 true forced groups (1 parent); deep 35/35 DEAD but 28/35 never expanded later, other 7 have 0 extra parent-expansion work | **close deepest-selected late-prune consumer**, pursue mid-counted-depth/obligation strata with measured retained work; cheap R00242 contrast only with proof | `WS2-SEMANTIC-FORCEDNESS` |
| PG-I | Fragile/robust hardness | `active` | `existing-data` | six selected parents/125 variants: 39 technique-vector flips, 8 equal-count swaps in only two parents; no variant resistant to all five isolated methods | query other retained independent parent families for multi-technique resistance with comparable complete outcome coverage; no six-parent runtime policy | `WS2-VARIANT-RESPONSE-HARDNESS` |
| PG-J | Completion-regime successor | `active` | `bounded-compute` | old topology descriptor remains closed as consumer; new successor distinct | discrete exact consequence + retained Family-3 census | `WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR` |
| PG-K | Commutativity revision | `active` | `existing-data` | LIVE legality positive; revision value unknown | DEAD/near-miss restoration/work-value search | `WS2-RESIDUAL-INTERFACE-COMMUTATIVITY-REVISION` |
| PG-L | Basin/action overlap | `active` | `instrument-only` | old telemetry invalid; PG-G supplies causal motivation | canonical overlap/novelty observer; no steering | `WS2-CROSS-ATTEMPT-BASIN-OVERLAP` |
| PG-M | Solve-local rediscovery | `active` | `existing-data` | original Phase 0 negative; post-closeout evidence materially changed | delta rejoin only; observer only if new recurrence earns it | `WS2-SOLVE-LOCAL-REDISCOVERY` |
| PG-N | Interface sufficiency | `active` | `existing-data` | exact-fate collision attack need not wait for PG-D | test candidate interfaces; fidelity/compression before architecture | `WS2-INTERFACE-SUFFICIENCY-FALSIFIER` |
| PG-O | Complete-path LNS falsifier | `active` | `bounded-compute` | Stage 1 positive; old Stage 2 method-limited; real-search partials exist | fair partial-to-manifold/relaxed-candidate repairability test | `WS2-G1-COMPLETE-PATH-LNS` |
| PG-P | Repair descent shadow | `active` | `instrument-only` | read-only question survives closed exact-bisection forms | trace commitment classes before operator-incapable residuals | `WS6-DEPENDENCY-CONDITIONED-REPAIR` |

## Interpretation and closure

PG-M is a **delta rejoin** on the fresh exact-DEAD sibling population and newer PG-D/J/K exact-query material. Its 2026-09-17 Phase 0 remains negative and must not be rerun unchanged. PG-O reopens only candidate shaping using real-search partials; the three naive constructors remain failed. PG-P is observation only; the 12-parent floor still gates reusable-interface confirmation.

Closed tested forms include old pipeline-wide/unconditional/every-phase BC1, BC1-G production use, literal forced-work consumers, static parity/checkerboard response, D1 ranking, separator C0-C2, tested dependency-defined exact bisection, causal-revision tested form, naive LNS constructors, generic restart/stasis predictors, and size-1 DEAD-core relaxation. See [future work](solver-future-work.md) for exact reopen boundaries.

Only three stable questions remain `deferred-reopen`: admissible-order retry repricing, parity-response signature, and forced-work economics.

## Standing rules

- Use canonical `workSpent` for competing techniques.
- Cold behavior cannot consume level ID, historical outcome, family ancestry, hint, or stored answer.
- Timeout/unsupported/abstain/missing coverage are not DEAD/UNSAT.
- Hard consumers require the appropriate proof/equivalence/monotonicity guarantee.
- Independent confirmation gates transfer/promotion claims proportional to selection; it need not ban a non-contaminating feasibility prototype.
- Sample minima gate the claim they were designed for, not every cheaper observability question.
- Recurring-producer requirements gate standing resource promotion, not valid scoped one-off science.
- Durable frameworks need repeated decision-bearing demand. Disposable narrow falsifiers are allowed with stop/delete rules.
- Negatives are scoped to tested form, population, seam, and work contract unless the semantic parent was falsified.
- **No-stranding:** executable unresolved falsifiers belong here or require a concrete blocker elsewhere.
- **Transactional state:** reconcile question state, dated evidence, future-work/opt-in disposition when relevant, and lifecycle tests in the same change.

## Cheap evidence routing

Prefer retained/indexed evidence before bespoke acquisition. Chronology and detailed evidence live in dated reports; exact deferred triggers live in [future work](solver-future-work.md); blocker classification lives in the [operating model](solver-research-operating-model.md).
