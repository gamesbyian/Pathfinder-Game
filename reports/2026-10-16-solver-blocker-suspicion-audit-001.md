# Solver blocker suspicion audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-10-16 — all 82 current non-archive `solver-*` / research Markdown authorities and references in the audited scope, including architecture/evidence/correctness docs beyond the initial 56 plan-like surfaces; the stable research-question registry; and historical evidence only where a current blocker explicitly depended on it.
> **Decision:** several research blockers were over-scoped. Preserve soundness, legality, independence, evidence-identity and production-economics gates, but stop using promotion thresholds, sample-size thresholds, durable-resource requirements or historical sequencing as blanket permission gates on cheaper diagnostics. Activate the bounded blocker-bypass descendants listed below.
> **Remaining gate:** execute the newly active diagnostics under their own stop rules; production behavior still requires the ordinary soundness, matched-work, confirmation and collateral gates.
> **Evidence role:** forensic
> **Selection:** observational repository-wide blocker-language audit over current non-archive authorities; historical evidence followed only from current blockers
> **Inference scope:** research-governance and queue semantics only; no production solver behavior is authorized by this audit
> **Production effect:** none from this audit. BC1-VX remains default-OFF pending its solved-control regression gate.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-16","decision":"Preserve soundness/inference/promotion gates at the claims they protect, while activating cheaper bounded diagnostics previously blocked only by sequencing, evidence-shape, or durable-resource requirements.","remainingGate":"Execute PG-L through PG-P under their own stop rules; BC1-VX production promotion still requires the solved-control regression gate.","joins":{"researchQuestion":null,"premiseRefs":["P132","P198","P203"],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"82 current non-archive solver/research Markdown authorities and references in audited scope plus the stable research-question registry, with historical evidence followed only from current blockers","selection":"observational repository-wide blocker-language audit","inferenceScope":"research-governance and queue semantics only; no production solver behavior is authorized by this audit"},"claimRefs":[],"sourceArtifacts":["docs/solver-research-question-relations.json","docs/solver-optimization-workstreams.md","docs/solver-research-operating-model.md"],"successors":{"questions":["WS2-CROSS-ATTEMPT-BASIN-OVERLAP","WS2-SOLVE-LOCAL-REDISCOVERY","WS2-INTERFACE-SUFFICIENCY-FALSIFIER","WS2-G1-COMPLETE-PATH-LNS","WS6-DEPENDENCY-CONDITIONED-REPAIR"],"artifacts":[]},"prospective":{"expectation":"Several blockers would turn out to be promotion or sequencing requirements rather than experiment prerequisites.","surprise":"The same category error recurred across scheduling, representation, resource-retention, repair and architecture language.","anomaly":null}} -->

## Question

The audit asked one deliberately adversarial question:

> When a document says a useful idea is blocked, is the stated condition actually necessary for the next scientific claim, or has a stronger later-stage standard been pulled forward and turned into ceremony?

This is not an argument for lowering correctness standards. The audit distinguishes permission to **observe/falsify/develop** from permission to **generalize/promote/ship**.

## Scope

The first pass covered 56 plan/preflight/queue/research-named surfaces. A hostile scope check then expanded this to all **82** current non-archive `docs/solver-*.md` plus the adjacent research authorities in scope, including architecture, correctness, evidence, level-blindness, budget, provenance, resumability and workflow-remediation references. The audit also inspected every deferred/reopen stable question and followed current blockers into historical evidence when necessary.

The recurring blocker types were:

1. semantic/soundness;
2. inference/independence;
3. promotion/economics;
4. tooling/representation;
5. sequencing/convention.

Only the first two normally justify forbidding an experiment outright. Promotion gates block production claims. Tooling blockers invite bypasses. Sequencing blockers require a concrete contamination, inference or material-cost reason to remain serial.

## High-confidence blocker corrections

| Area | Former blocker | Audit finding | Disposition |
|---|---|---|---|
| PG-H semantic forcedness | wait for forced-work work/PR #1952 | predecessor is closed; its result is exactly why hidden semantic branching is now distinct and interesting | **expired**; PG-H active |
| PG-C first-loss | Phase 9 only if workstreams selects first-loss | workstreams now explicitly selects PG-C | **expired**; Phase 9 active retained-first |
| separator Family 3 | wait for frozen legal prefix population / sibling harvest | frozen production-search prefix populations now exist | **expired**; run retained census under PG-J/PG-N |
| relational feasibility Q1 | D1 evidence preflight is current next gate | D1 ran and its ranking consumer closed 0/120; premise survived | **expired**; route premise to PG-D/PG-J/PG-N |
| PG-L basin overlap | wait until PG-C/PG-G | PG-G already causally proves order-sensitive trajectory divergence; PG-C completion is not required to observe overlap/novelty | **procedural**; PG-L active instrument-only |
| PG-M reason reuse | wait for a brand-new proof-bearing reason family | the original Phase 0 stays negative, but later fresh exact-DEAD siblings and PG-D/J/K query material are a materially changed evidence set that can be rejoined without a new theorem | **over-scoped**; PG-M active as a delta rejoin, not a rerun |
| PG-N alternative search object | wait for PG-D to find useful trail/switch consequence | exact-fate collision attacks can falsify existing separator/topology/relational interface candidates now | **over-scoped**; PG-N active retained-first |
| complete-path LNS | no production-quality complete candidate constructor | its own machine result says this blocker is obsolete after production multi-pick/frontier work; Stage 2 was method-limited, not negative | **obsolete**; PG-O active bounded falsifier |
| WS6 dependency repair | need >=12 independent exact matched parents before proceeding | 12 parents is a confirmation threshold. The preserved descent-shadow observer can cheaply test whether a useful interface exists before buying exact replication | **over-scoped**; PG-P active instrument-only |
| PG-G canonicalization | independent-parent confirmation must finish before trying a cold D4 key | confirmation and current-input consumer feasibility are separable and need not contaminate one another | **seriality unjustified**; run in parallel, but confirmation still gates production A/B |
| dynamic scheduler signals | static scheduling must show value first | dynamic state can be useful precisely where static descriptors fail; observation can compare against static baselines without promoting a policy | **seriality unjustified**; bounded dynamic observers allowed now |
| architecture-shaped experiments | no framework/optimizer/frontier code before premise value | valid for durable architecture, too strong for a tiny disposable program whose output is the premise test | **scope narrowed**; disposable falsifier allowed, durable architecture still gated |
| fourth research generator | no generator before independent soundness | valid for registry/shared-generator status, not for a question-scoped one-off constructor | **scope narrowed**; one-off development construction allowed with explicit identity |
| recurring rich producer | no recurring producer, therefore resource not promoted | correct for Resource Contract promotion; wrong if interpreted as forbidding a valid one-off capture for PG-C | **scope narrowed** |
| cross-program backlog | wait for PR #2122 / WS1 confirmation | both are historical and complete | **expired** |
| retention audit fixes | fix only after documentation audit closes | audit header itself is concluded-positive | **expired**; remaining implementation follows current consumer priority |
| BC1-VX shared-stage transfer | only after representative beam/production A/B is positive | run 37052447194 completed 232/300 vs frozen control 36772815197 at 225/300, 7 gains / 0 losses, ~4.2% lower aggregate work | **satisfied**; diagnostic shared-stage transfer may begin; BC1-VX promotion still waits on solved-control regression |
| premise-map hardening / mining | hardening docs still said freeze snapshot / run lenses / complete reciprocal coverage before mining | v1/v2 freeze, reciprocal coverage, mining, replication and successor reconciliation are already complete | **expired**; documents retained as historical method, not current blocker |
| premise measurement overlay | integrate overlay in later successor-map pass | measurement-opportunity relation is already live in research relations | **expired** |
| fresh-vs-preceded late-stage integrity | naive predecessor replay cannot support a causal comparison | real methodological blocker, but only for that causal claim; unrelated late-stage work is not blocked | **kept but narrowed**; preferred bypass is exact typed stage-entry capture/replay, not manual Proxy reconstruction |
| WS1 execution-efficiency Phase 7 | 2026-09-26 confirmation was described as negative, so shadow-authority transport stayed inactive | that negative was later proven instrument-invalid; corrected 2026-10-02 confirmation is positive. Production suppression still is not earned because the consumer/seam audit found the signal work-only with no demonstrated cold-solve upside | **expired and replaced**; retain the promotion ladder, but gate production on the actual consumer/economics result rather than the retracted confirmation |
| evidence-graduation implementation | retention audit said to update the method only after final reconciliation proved no duplicate rule | reconciliation already found the Resource Contract owned the rule, and `investigation-report-conventions.md` now carries the reconstructability closeout check | **expired**; no new retention schema needed and the concluded audit is not a blocker |
| human-parent WS7 generation | validation/scaling generation only after a speed mechanism is earned | correct for a durable validation corpus, too broad for one-off adversarial development cases that may cheaply expose complexity/pathology | **scope narrowed**; disposable question-scoped constructions allowed, synthetic wins confer no production entitlement |
| question-intake acquisition order | bounded compute only after cheaper routes cannot decide | usually sound economics, but a tiny exact/reference computation can itself be cheaper and more faithful than inventing a proxy | **scope narrowed**; prefer cheap routes rather than enforcing ceremonial seriality |

## Newly active bounded lanes

### PG-L - basin/action overlap

Rebuild only the observer that history failed to deliver cleanly. Use canonical action identity, real participation/reach, state/trajectory overlap, failure-family novelty, incremental outcome and canonical `workSpent`.

This may establish that two actions are redundant or complementary. It may not steer allocation in the same experiment.

### PG-M - solve-local rediscovery

Do not rerun the original 2026-09-17 Phase 0 unchanged. Rejoin only the later fresh exact-DEAD sibling population and newer PG-D/PG-J/PG-K exact/interface-query material, then ask whether that changed evidence restores solve-local recurrence or a material rediscovery ceiling.

The experiment may prove there is nothing to reuse. A behavioral cache, backjumper or proof store still needs:

- a sound pre-computation identity/certificate;
- recurrence before the expensive work;
- material avoided canonical work;
- no hidden state omitted from the reuse key.

### PG-N - interface-sufficiency collision attack

Use exact-labelled retained states to attack candidate compact interfaces. Group states by a proposed current-input signature and look for exact completion-fate collisions.

A single LIVE/DEAD collision is a powerful negative for exact sufficiency. Surviving a bounded attack is only evidence to continue; it does not prove a frontier/ZDD/backward architecture sound.

### PG-O - complete-path LNS falsifier

Stage 1 already showed accepted solutions cluster (median visited-cell Jaccard distance about 0.11). The old Stage-2 constructors were the failure, not the premise.

Reuse real production-search partial/frontier material. Try the cheapest fair path to one of:

- a full relaxed candidate;
- a bounded completion of a frozen partial;
- a partial-to-solution-manifold closeness proxy that predicts local repairability.

Do not build a full LNS framework until candidate closeness and local repairability are demonstrated.

### PG-P - repair descent-shadow observer

Keep the failed 12-parent confirmation attempt failed. Do not reinterpret two exact parents as transfer.

Instead, run the different read-only question archaeology preserved: before an operator-incapable terminal residual appears, do a small recurring set of earlier commitment classes become fixed? Candidate classes include turn arrival/exit, crossing axis, portal/flipper use, separator traversal, obligation order and coupled path-history state.

A small sample can nominate a better interface. It cannot confirm one.

## BC1-VX blocker that expired during the audit

The representative production random-300 treatment completed successfully during this audit.

| Arm | Run | Solved | Aggregate workSpent |
|---|---:|---:|---:|
| frozen BC1-on control | 36772815197 | 225 / 300 | 44,638,363,505 |
| BC1-VX | 37052447194 | 232 / 300 | 42,754,637,509 |

Paired solved-set delta: **7 gains / 0 losses**.

This clears the prerequisite stated for exploratory BC1-VX shared hard-prune transfer. It does **not** clear BC1-VX's own production promotion gate. The prespecified solved-control regression set remains required before default-ON.

## Blockers that survive the suspicious review

The following restrictions are not treated as pedantry.

### Hard-consumer soundness

A hard prune, exact cache, forced move, reusable failure clause, exact quotient, or dominance action must have the corresponding proof/equivalence/monotonicity guarantee. Empirical accuracy cannot turn an unsound abstraction into a hard consumer.

### Unsupported exact outcomes

Timeout, unsupported mechanics, abstention or missing coverage do not become DEAD/UNSAT. Exact/reference models must remain conservative.

### Level blindness

Cold behavior may use current legal input/state/solve-local telemetry, but not historical outcome, ID, family ancestry, stored answer or identity recognition.

### Independent evidence for transfer claims

Development can be freely inspected. Confirmation/transfer claims still need the independent unit appropriate to the selection pressure. Variant siblings remain grouped by parent.

### Evidence-identity joins

Control/treatment, source/result, parent/child, protocol/revision and population joins need their actual identity dimensions. Convenient filenames or lexical similarity do not repair a broken join.

### Matched-work production economics

A new capability does not earn permanent additive budget merely because it wins somewhere. Production promotion still asks what it displaces, what it uniquely solves, what it costs, and whether losses/collateral are acceptable.

### Observer effects

Under wall-clock termination, even read-only instrumentation can change reach. Decision-bearing rate claims still need parity/non-binding-time evidence or an observer-conditioned interpretation.

### Low-value implementation-speed deferrals

The speed-opportunity authority's deferred families mostly survive. They are backed by measured tiny cost share, zero incidence, stale profiling, or lack of an economical treatment boundary. They are priority/economics dispositions rather than semantic impossibility. Narrow cheap prototypes remain legal if a fresh profile or live consumer changes the opportunity.

### Continuation persistence / checkpointing

The resumability primitive exists, but persisted/cross-process continuation remains downstream of a useful continuation consumer because compatibility/serialization is durable product architecture, not merely an observer. A tiny round-trip test would be legal if a live question needed it; building persistence as speculative infrastructure is still unjustified.

### Known-solution / saved-answer constraints

Known solutions may be used offline as positive-oracle/evaluation evidence, but the recurring-generic-distinction gate before a **live** counterfactual consumer survives. Saved-answer compatibility cannot become runtime steering merely because it is diagnostically informative.

## Numeric thresholds: revised interpretation

Prespecified floors remain useful and must not be retroactively moved to rescue a claim. Their scope is narrower than several documents had implicitly assumed.

A floor such as "12 independent parents" can mean:

> fewer than 12 cannot support the planned reusable-descriptor confirmation.

It does not automatically mean:

> with 2 parents the repository is forbidden to inspect mechanism shape, test instrumentation, discover why eligibility is rare, or nominate a different interface.

The first is inference discipline. The second is usually ceremony.

## Architecture rule after this audit

The preferred ladder is now:

```
semantic question
  -> cheapest retained-data attack
  -> smallest disposable observer/reference/prototype if needed
  -> phenomenon / fidelity / opportunity
  -> smallest real consumer
  -> matched-work economics
  -> independent confirmation proportional to selection
  -> durable architecture / production promotion
```

A disposable prototype should be easy to delete, narrow in scope, branch-local where practical, and forbidden from silently becoming production infrastructure. But requiring the premise to be proved before allowing the code that measures it is backwards.

## Stop rules for blocker bypasses

A blocker-bypass lane stops when:

- the supposedly missing observable is still unobservable after the smallest instrument;
- retained evidence supplies a direct counterexample;
- candidate construction requires essentially solving the original problem at comparable/higher cost;
- an interface must encode near-full history to avoid fate collisions;
- recurrence exists only after the expensive computation it was meant to avoid;
- the small diagnostic shows no plausible participation/economic ceiling;
- the proposed bypass would contaminate the independent confirmation population;
- or the blocker turns out to be a real correctness/soundness requirement rather than sequencing.

## Repository changes made with this audit

- added a claim-scoped blocker taxonomy to the operating model;
- activated PG-L/PG-M/PG-N rather than leaving them dependency-queued;
- activated method-limited complete-path LNS falsification as PG-O;
- activated the repair descent-shadow diagnostic as PG-P while preserving its confirmation threshold;
- allowed PG-G cold-key feasibility in parallel with independent confirmation;
- expired stale semantic-forcedness, first-loss, separator-Family-3, D1, WS1, retention-audit and completed premise-map hardening/mining sequencing language;
- narrowed the fresh-vs-preceded late-stage correctness blocker to the causal comparison it actually protects and recorded typed stage-entry capture as the preferred bypass;
- allowed bounded dynamic scheduler observation before static-policy success;
- distinguished disposable architecture-shaped falsifiers from durable framework promotion;
- distinguished one-off generation from registered generator status;
- recorded the now-positive BC1-VX production A/B and opened its previously blocked diagnostic shared-stage transfer;
- retained hard soundness, independence, join-integrity and matched-work promotion rules.

## Bottom line

The repository had become conservative in a slightly asymmetric way: it was excellent at preventing weak evidence from becoming production behavior, but some of those same safeguards had leaked backward and begun preventing cheap experiments whose whole purpose was to obtain stronger evidence.

The correction is not “fewer gates.” It is **put each gate at the claim it actually protects**.
