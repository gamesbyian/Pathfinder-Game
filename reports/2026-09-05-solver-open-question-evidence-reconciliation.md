# Solver open-question → existing-evidence reconciliation

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — Current queue, deferred/future work, scheduling/resumability policy, census cross-evidence plan, opt-in dispositions, and recent reports were reconciled against later evidence.
> **Decision:** the apparent research frontier is materially larger than the real frontier because several older plans still phrase already-answered questions prospectively; carry forward only the compact residual set below.
> **Remaining gate:** none for this audit; rerun reconciliation when enough new evidence accumulates to make current question-owning docs drift again.
> **Scope:** solver queue, deferred/future work, scheduling/resumability policy, census cross-evidence plan, opt-in dispositions, and recent dated research reports.
> **Priority authority:** `docs/solver-optimization-workstreams.md` remains canonical for execution order and live gates.

## Why this reconciliation exists

The repository has accumulated evidence faster than every question-owning plan has been rewritten. That creates a specific failure mode for agents: an old plan can still ask a sensible question after a later report has already answered it, encouraging duplicate analysis or needless GitHub Actions work.

This pass therefore separates four states:

- **answered** — later evidence resolves the question strongly enough that the old question should no longer drive work;
- **partially answered** — the broad question has been narrowed to a smaller residual;
- **genuinely open** — no existing evidence closes the decision-bearing form;
- **deferred/reopen-only** — logically open, but no present evidence makes it worth active execution.

Historical reports remain historical evidence. Reconciliation should change current authorities and live plans, not rewrite the result of an old experiment.

## Answered or substantially answered questions

| Earlier question | Existing answer | Disposition |
|---|---|---|
| Should `portfolio-18` / the static fixed-cap portfolio replace the real production ladder? | No in the tested production form. The real-entrypoint A/B was production 18/40 vs static 14/40 with zero static-exclusive wins; static-first + production fallback cost 9.82% more work. See `2026-09-04-static-portfolio-entrypoint-production-ab-001.md`. | **Answered negative.** Keep infrastructure and pricing lessons; do not treat production wiring as pending. |
| Does must-cross + flipper wide-beam exposure deserve default-on promotion? | Development and independent confirmation were +3/-0; the cross-generator challenge was a clean zero-loss ceiling test. The exposure is promoted/default-on. | **Answered positive / promoted.** |
| Does the reserve-widen sibling add useful capability? | The population-scale treatment engaged but produced no gains/losses. | **Answered negative in tested form.** |
| Do repeated/cyclic/staged beam policy switches add value beyond one handoff? | Tested cyclic and three-policy staged schedules added no reliable value over the one-handoff form. See `docs/solver-search-resumability.md`. | **Answered negative for those schedule shapes.** |
| Does naive beam → DFS inherited-state handoff work? | No. Fresh DFS materially outperformed direct inherited-state DFS in the tested pair. | **Answered negative for the naive handoff.** A state-selection mechanism is a separate, low-priority question. |
| Is capability multiplicity meaningful robustness evidence? | Yes. It predicts temporal retention, budget-edge margin, and real production success; singleton fragility is also strongly family-dependent. See `2026-09-04-capability-multiplicity-temporal-robustness-001.md`, `2026-09-04-capability-multiplicity-budget-edge-robustness-001.md`, `2026-09-04-singleton-fragility-by-technique-family-001.md`, and `2026-09-05-multiplicity-production-success-robustness-by-corpus-001.md`. | **Answered for temporal/budget-edge/production-success clauses.** Only variant-family robustness remains. |
| Are doubletons automatically robust redundancy? | No. Same-family redundancy is common: 58.5% of solverCount=2 rows are same-family. The structural-signature follow-up was null. | **Answered enough to change interpretation.** Do not treat `solverCount=2` as cross-family insurance by default. |
| Can historical same-config cost volatility proxy capability stability? | No. Relative cost drift and solve-set Jaccard had only weak correlation (`r=0.126`) across comparable actions; technique family explains much more. See `2026-09-04-action-cost-volatility-capability-drift-001.md`. | **Answered negative.** |
| Is the broad structural unsupported/difficulty signal a pooled artifact? | No. The 17-feature ranking replicated across corpus and parity holdouts and against a second outcome, while the same holdout method rejected a false-positive support-churn signal. | **Answered positive as a broad empirical signal.** Causal decomposition remains separate. |
| Does routing regime predict late-ladder-stage reliance? | No meaningful relationship was found; late-stage reliance was similar across regimes. | **Answered negative.** |
| Does routing regime predict anything useful? | Yes, overall multiplicity/production success and corpus composition differ by regime. | **Answered for those outcomes.** Do not reuse the null late-stage result as a claim of universal irrelevance. |
| Are all 35 production-solved / no-isolated-T1-winner rows genuine production-only capability? | No. `2026-09-04-census-cross-evidence-35-cohort-anatomy.md` explains 25/35 as census coverage gaps and 7/35 as production context/retry/flag variants. Only `R03195`, `R02452`, and `R02887` remain unresolved. | **Narrowed from 35 to 3.** Never carry the old 35-row anomaly forward as one unresolved phenomenon. |
| Are early 40-level zero-win ladder stages actually useless? | No. Fresh 1,700-level production evidence found nonzero wins for every stage that had looked zero-value in the small sample. | **Answered: small-sample zeroes were not reliable suppression evidence.** |
| Does admissible-order alternate-tiebreak capability exist in real production? | Yes. Full-scale production evidence found 28/975 wins attributed to that retry; only half had a non-admissible-order isolated alternative. | **Answered positive for capability existence.** The open question is how much work it should receive. |
| Is goal-attraction-disabled retry starvation a real mechanism? | Yes. A direct mechanism reproduction plus full-scale lifecycle evidence show starvation, including 605/725 unsolved levels with any starvation pattern in the fresh 1,700-level run. | **Answered positive for starvation.** The remaining question is whether a fresh pool converts that starvation into enough useful solves. |
| Does resumability correctly preserve same-policy search? | Yes for the implemented in-memory beam continuation primitive when full mutable search state is carried. | **Answered implementation-feasibility question.** Scheduler value remains separate. |
| Are raw nodes a fair cross-technique scheduler price? | No. Technique families differ by roughly an order of magnitude in nodes per wall-ms. Canonical `workSpent` is the cross-technique accounting currency. | **Answered / policy invariant.** |
| Is there enough allocation headroom to justify scheduler research? | Yes by optimistic ceilings: production-vs-isolated-cheapest median ratio is 38.65x, and cheapest-vs-priciest successful isolated technique is 41.7x median. | **Answered positive.** Capturing the ceiling legally and level-blind remains the hard problem. |
| Can the current published solution-profile population distinguish solved vs unsolved difficulty? | No. The regenerated published population is 160/160 production-solved and broadly frozen-T1-supported, so it has no contrast population for that question. | **Answered: wrong dataset for that comparison.** |
| Can CP-SAT solve native residuals current solver evidence misses? | Yes. Existing hint provenance already contains referee-valid `cpsat-full-probe` rescues for 45 current production-unsolved and 13 isolated-no-winner levels. | **Answered positive for existence of exact rescue capability.** A legal narrow selector remains open. |

## Partially answered questions whose residual should replace the old broad framing

### Census cross-evidence program

Gate 0 is complete, including refreshed second-order analysis, fixed relative-advantage pairs, temporal stability, production-boundary/exposure rejoin, and the 35-row cohort anatomy. The bounded existing-data Gate-1 pilot also ran and was inconclusive. `2026-09-04-technique-census-refresh-direct-analysis-rejoin.md` explicitly records **no remaining Gate 0/1 requirement**.

The old sequential plan should therefore no longer read as though Gate 0 is "now" and Gate 1 is the mandatory next campaign. Its remaining value is as a map from future concrete questions to evidence surfaces.

### Solution-space structure

Existing Corpus-1 / published profile work is enough to show that the current local samples cannot carry broad solved-vs-unsolved claims. A small diverse-beam solution-space pilot was inconclusive. The residual question is narrower:

> Does solution-space diversity/rigidity predict technique response on a sufficiently large, genuinely contrasting population?

That likely requires a Corpus-2-scale profile source or another already-existing contrast-rich profile dataset; do not repeatedly mine the current 160/160 published profile.

### Variant-family robustness

Temporal robustness, budget-edge robustness, production-success prediction, and same-family redundancy are already answered. The only remaining clause is actual sibling/parent robustness under controlled variants. Existing hint provenance is rich but does not currently provide the needed merged family/parent outcome join.

### Production-solved/no-isolated-winner anomaly

The unresolved set is three IDs, not 35. A future lifecycle attribution re-check should target only `R03195`, `R02452`, and `R02887` unless a new census refresh creates a new cohort.

## Credible stranded finding that deserves active visibility

### Clockwise perimeter-bias preference

`2026-09-05-perimeter-bias-clockwise-preference-cross-family-001.md` found the same direction in two structurally different search families:

- DFS perimeterSweep: clockwise 21 wins vs counter-clockwise 11 (`1.91x`);
- beam perimeterSweep: clockwise 170 vs counter-clockwise 76 (`2.24x`).

The direction also holds separately in Corpus 1 and Corpus 2 for both families. This is stronger than an isolated pooled correlation, but the report correctly labels it **discovery evidence**: it does not identify the structural mechanism and comes from one production evidence generation.

The useful open question is therefore not "is CW larger in this report?" but:

> Is there a simple legal level/state descriptor that explains which directional perimeter bias should be preferred, and does that selector replicate on independent evidence?

This is a good WS1 local-analysis candidate. It is **not** yet a production routing rule.

## Genuinely open decision-bearing questions

1. **Admissible-order non-default retry fraction `1.0 → 0.18`:** confirmation 006 was zero-loss on all 76 informative reached levels, but the first fresh production A/B was non-informative because the target stage performed zero work. The next test must require nonzero target-stage participation under an independently frozen usable envelope.
2. **Repair late-probe seed count `7 → 6`:** existing audit says seed 7 adds no reached-level unique best result while seed 6 remains load-bearing. Existing hints cannot supply same-level multi-seed confirmation. Population-scale fixed-work confirmation is still required.
3. **Goal-attraction-disabled fresh work pool:** starvation is proven; unconditional development was +1/-0 and a random confirmation was null. The next useful test is the already-designed cohort selected from independent historical control-side starvation.
4. **One inherited beam-policy handoff:** `intersectionHarvest → objectiveFirst` produced 2/60 inherited-only solves in development. This is real enough to preserve, not enough to productionize. It should resume only when a concrete WS2 allocation question needs continuation and can provide a fixed-work comparator.
5. **CP-SAT rescue selector:** exact rescue capability exists. What is unknown is whether a stable narrow legal descriptor identifies that cohort strongly enough to justify bounded on-demand exact-label acquisition.
6. **Clockwise perimeter-bias mechanism/selector:** cross-family/corpus-split direction is credible discovery evidence; the legal explanatory selector is untested.
7. **Variant-family capability robustness:** blocked on a suitable family/parent join, not on another temporal or budget-edge census analysis.
8. **Solution-space diversity/rigidity on a useful contrast population:** current local published/Corpus-1 coverage is too ceilinged/thin for a decision-bearing answer.

## Deferred / reopen-only, not active unanswered work

Keep richer latent response dimensions, stability-aware portfolio objectives, forced-decision/backdoor-depth work, four-space triangulation, generic ML/bandit scheduler machinery, cross-process checkpoint persistence, and generalized typed producer/consumer artifacts deferred until a simpler concrete residual earns them.

A logically unanswered idea is not automatically research debt.

## Authority repairs implied by this pass

1. `docs/solver-scheduling-policy.md` should describe budget-model completion as an **established foundation/invariant**, not a prerequisite still waiting to happen.
2. `reports/2026-09-04-census-cross-evidence-research-plan.md` should be reconciled from an active sequential campaign into a standing evidence map with Gate 0/1 complete and later gates conditional on concrete current questions.
3. `docs/solver-optimization-workstreams.md` should surface the clockwise perimeter-bias discovery as a WS1 lead and explicitly narrow the 35-row anomaly to its 3-row unresolved residue.
4. `docs/solver-future-work.md` should refer to the census plan as a standing/reconciled evidence map rather than an active program and should not recreate answered temporal/budget-edge/cost-volatility questions.

## Anti-duplication rule

Before accepting an apparent open question from any plan/proposal/report:

1. query `node scripts/research-status-index.mjs --compact --query=<mechanism>`;
2. query `node scripts/research-asset-query.mjs --query=<mechanism>` when a data join might already exist;
3. inspect later-dated reports and the canonical workstream disposition;
4. rewrite the question to its smallest unexplained residue before proposing new compute.

An agent should not spend GHA merely because the document that originally asked a question predates the document that answered it.
