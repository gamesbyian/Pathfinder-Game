# Solver evaluation evidence

> **Status:** current authority for development, confirmation, and transfer/challenge evidence.
> **Execution priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) owns which workstream/candidate is tested next.
> **Runtime boundary:** [`solver-level-blindness.md`](solver-level-blindness.md).
> **General research method:** [`solver-research-operating-model.md`](solver-research-operating-model.md).

This document replaces the one-fresh-corpus-per-candidate interpretation that emerged from the
2026-08-23/24 confirmation-cohort work. That work established an important fact: repeatedly mined
stress data are development data even when every solve is level-blind. It also made confirmation
more elaborate than necessary.

The durable goal is simpler:

> protect against selection bias in proportion to how much selection occurred, and use a genuinely
> different data-generating process when making a genuinely broader generalization claim.

## Three different kinds of independence

Keep these separate.

1. **Runtime level-blindness:** the solver cannot use exact-level history, identity, hints, winners,
   provenance, or research metadata during a cold solve.
2. **Sample independence:** the levels used to evaluate a fixed candidate did not help choose that
   candidate, threshold, configuration, or acceptance rule.
3. **Distributional independence:** the evaluation data come from a materially different
   construction/source process, not merely another seed from the same generator.

A new seed from `generate-random.mjs` can provide sample independence. It does not provide
distributional independence from Corpus 2 because it shares the same witness-first random-walk
construction family.

## Evidence roles

### Development / tuning

Use freely. Exact IDs, failures, witnesses, traces, family relationships, and solver outcomes may be
inspected.

Current Corpus 1, Corpus 2, heavily mined technique-census outputs, historical confirmation failures,
and inspected variant families are development evidence for decisions they have influenced.

Development evidence may be very large and very persuasive about a mechanism. It is still selected
evidence when the same data chose the treatment.

### Confirmation

Use after the treatment and primary decision rule are fixed.

Confirmation answers:

> Does the selected candidate survive optimism introduced by discovery, tuning, and candidate
> selection on an independent sample?

Confirmation normally may come from the same broad generator family as development. A fresh or
previously locked `generate-random.mjs` block is therefore legitimate confirmation even though it
is not cross-distribution transfer evidence.

### Transfer / challenge

Use when the claim itself extends beyond the development distribution.

Transfer answers:

> Does the effect survive a materially different level-construction/source process?

A different seed or `--envelope-caps` mode of the same witness-first generator is not, by itself,
cross-generator transfer. It can still be useful confirmation or an in-envelope challenge.

Current cross-distribution sources include:

- `stress:generate-topology`, whose macro-maze/module construction is independent of
  `generateWitness()`;
- unrelated held-out parent families when the claim concerns family generalization; and
- genuinely independent human/editor-authored material when available and not already used to tune
  the candidate.

Match the claim to the mechanics actually represented by the transfer source. The topology generator
v0.1 intentionally omits portals, static filters, surround, adjacent-turn, and multi-gate levels, so
it cannot establish transfer across those mechanics.

## Evidence intensity follows selection pressure

Do not give every change the same ceremony.

| Change / selection pressure | Normal evidence gate |
|---|---|
| Correctness fix with a soundness argument, or implementation optimization with identical search trace/outcomes | targeted regression/soundness or trace-parity evidence; no statistical holdout required |
| One prespecified narrow treatment with little/no tuning | level-blind matched-work development A/B; use a small independent confirmation block when the effect is small, rare, or promotion risk is meaningful |
| Candidate selected/tuned from multiple rules, thresholds, configurations, seeds, archetypes, or residual analyses | independent confirmation is the default before broad default-on promotion |
| Heavily tuned/global scheduler, learned policy, automatic configurator, or candidate surviving a large search space | grouped/independent confirmation plus cross-distribution transfer/challenge before a broad generalization claim |
| Broad claim such as “generalizes to unseen Pathfinder levels” | distributionally independent transfer/challenge evidence, regardless of how clean the development result looked |

A spectacular, prespecified +large/-0 result should not be forced through the same number of
successive virgin corpora as a +2 winner selected from dozens of alternatives. Conversely, a tiny
winner mined from a large search space deserves more skepticism than its raw row count suggests.

## Confirmation pools: consume blocks, not universes

When several selected candidates are expected, prefer one locked confirmation pool partitioned into
blocks before any candidate outcomes are inspected.

Rules:

1. freeze generator/source revision, seed, block size/order, and partitioning before decision-bearing
   outcomes;
2. materialize the pool once and seal the exact level content used by all arms;
3. assign one untouched block to one fixed decision-bearing candidate;
4. record treatment/control provenance and participation before interpreting the result;
5. after the verdict, that block is **spent for descendants of the decision** if its outcomes are
   opened or influence subsequent design;
6. untouched sibling blocks remain valid confirmation material;
7. do not treat repeated aggregate peeks at the same block as unlimited independent tests.

This removes the need to generate a wholly new corpus for every modest candidate while preserving the
actual protection that matters: the evaluated rows did not choose the candidate.

A one-off fresh cohort remains fine when it is cheaper than maintaining a pool. The block model is a
default efficiency rule, not a requirement to build more infrastructure before it is useful.

### Residual-conditioned confirmation

A two-phase residual design is legitimate when the claim is specifically about levels the current
control fails:

1. freeze the candidate and protocol;
2. run **control only** on an untouched block/pool;
3. freeze the control-failure residual before treatment outcomes exist;
4. compare control and treatment on that exact residual.

The residual is conditional evidence, not a broad population solve-rate estimate. It must not be
selected by treatment success. Record both the original pool size and residual denominator.

## Transfer/challenge sources

### Witness-first random generator

`scripts/stress/generate-random.mjs` remains valuable for cheap independent confirmation because it
is solver-blind and reproducible. Corpus 2 itself is development data for many current decisions
because it has been repeatedly mined.

`--envelope-caps` changes the complexity envelope but retains the same witness-first generator
family. Treat it as an **in-envelope challenge/confirmation stratum**, not proof of cross-generator
generalization.

### Topology-composition generator

`npm run stress:generate-topology` provides a materially different construction family:

> randomized perfect macro maze -> maze diameter -> independent 3x3 path modules -> optional exact
> crossing modules -> referee-validated mechanics

It does not import or call `generateWitness()`, and the production solver never participates in
generation or filtering. Its default output is under `tmp/`; the generator is durable tooling, not
a standing corpus that must be continually refreshed.

Use it primarily for cross-generator transfer/challenge after a candidate has earned that expense.
Do not tune its generation parameters in response to treatment outcomes. A feature-only pilot may
measure basic yield, mechanic coverage, and eligibility to choose a reasonable sample size before
the decision-bearing solver run, provided the treatment outcome remains unseen.

#### Suitability and expansion gate

Before using topology-composition evidence for a decision, state which property is being challenged
and check it against the generator's actual support.

| Situation | Action |
|---|---|
| Candidate depends only on mechanics/topology already represented by v0.1 and the claim is limited to that represented scope | Use the generator as-is. Do not broaden it merely for completeness. |
| Candidate's activation/routing rule requires an omitted mechanic (currently portals, static filters, surround, adjacent-turn, or multi-gate) | **Do not use a null/non-participating topology run as evidence against the candidate.** Either choose another independent source that represents the mechanic or expand the generator first. |
| Candidate concerns scale/grid size outside 12x12/15x15, or a topology property absent from perfect-maze-diameter construction (for example macro cycles, multiple competing routes, large open regions, room/corridor structure, or a specific separator/bottleneck regime) | Treat v0.1 as out of scope for that claim. Prefer another source or add a deliberately different construction grammar/scale before the decision-bearing run. |
| Existing topology generator participates adequately and already challenges the causal property at issue | **Do not expand it.** Extra mechanics/topologies add confounds and maintenance without improving the current test. |
| Repeated ranked research questions are blocked by the same missing mechanic/topology family, or a broad promotion claim materially requires coverage the current generator cannot represent | Expansion is justified. Add the smallest missing capability/family, validate solvability/provenance, document the new support boundary, and bump generator version before decision-bearing use. |
| The desired expansion is motivated only after seeing a treatment fail/succeed on topology levels | Treat that outcome as development evidence. Do not retroactively broaden the same test and call it untouched transfer; freeze the revised generator and use fresh/locked material for the new claim. |

Prefer **new construction grammars** when the missing independence is topological, rather than
continually decorating the existing perfect-maze grammar. A generator that supports every mechanic
but only one topology family is not a universal transfer oracle.

Expansion must preserve the defining independence: production solver outcomes may not choose
generated rows, and new geometry must not quietly fall back to the Corpus-1/2 stochastic
`generateWitness()` process. Update this section, [`../data/stress/README.md`](../data/stress/README.md),
the generator header/version, and its smoke tests whenever the supported scope changes.

### Human/editor and family data

Unpublished human/editor levels can be especially useful transfer material because their construction
process is external to both procedural generators. Preserve independence from candidate design.

Variant families answer a different question. Hold out whole parents and treat parents, not siblings,
as the independent unit.

## Current population interpretation

| Population/source | Default role for new solver-policy decisions |
|---|---|
| Corpus 1 | development/diagnosis; batches B/C/D/F can still be solver-blind at generation time, but repeated project use matters |
| Corpus 2 | primary large development/capability laboratory |
| Existing in-envelope stratum | player-envelope challenge; confirmation only when untouched for the decision; same generator family as Corpus 2 |
| Spent/void 2026 confirmation cohorts | historical/development evidence as documented in their reports |
| Locked unused blocks/cohorts from the same random generator | confirmation, not cross-generator transfer |
| Topology-composition fresh/locked blocks | cross-generator transfer/challenge when treatment design did not inspect their outcomes |
| Variant trove | development/causal-family evidence unless whole independent parents were held out |
| Unpublished independent human/editor levels | potential transfer/challenge evidence when genuinely untouched |

Roles are claim-relative. A population can be untouched for one candidate and development data for a
descendant after its results influence redesign.

## Promotion and claim rules

All production-facing solver-policy treatments still require level-blind execution, comparable arms,
correctness protection, complete intended coverage, and relevant `workSpent` accounting.

For selected/tuned treatments:

- independent confirmation is the normal promotion gate;
- cross-generator transfer is required when the intended claim is broad, the policy is heavily
  selected/tuned/global/learned, or the observed effect is sufficiently rare that distributional
  robustness is a material concern;
- a narrow default-on promotion may be justified after confirmation without cross-generator transfer
  when selection pressure and claim scope are modest. State the claim narrowly.

Use language that says what was actually established:

- “+N on Corpus 2” means a development-population result;
- “confirmed on an untouched random-generator block” means sample-independent confirmation;
- “held on topology-composition levels” means cross-generator transfer within that generator's
  supported mechanic scope;
- “generalizes to unseen Pathfinder levels” needs broader transfer evidence than any single
  procedural generator can provide.

## Experimental plumbing must prove participation

The 2026-08-27 confirmation-workflow incident showed why simple provenance checks matter more than
ceremonial cohort machinery.

Every decision-bearing A/B should make it cheap to verify:

- which arm ran;
- the resolved enable/disable flags or equivalent treatment identity;
- the exact corpus/block hash;
- actual treatment participation/attempts when applicability is conditional; and
- complete arm coverage.

A treatment arm that never received the treatment is void evidence, not a null. A candidate that was
configured but never reached is non-participating/inconclusive for its intended mechanism, not
negative.

The hardened broad/residual confirmation workflows already persist resolved arm/flag provenance and
fail fast on control/treatment wiring mismatches. Preserve those checks if the workflows are adapted
to block-based pools.

## Before generating evaluation data

Do not generate a large holdout merely because the framework permits it. Record:

1. the candidate/claim it may decide, or the expected repeated confirmation need that justifies a
   shared pool;
2. source/generator revision and independent unit;
3. block size/partitioning if using a shared pool;
4. whether the role is confirmation, in-envelope challenge, or cross-generator transfer;
5. the primary outcome/work envelope and stop rule;
6. what exposure will make a block spent.

The cheapest evidence that can decide the gate still wins.
