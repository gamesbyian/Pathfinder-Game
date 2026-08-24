# Solver confirmation and transfer protocol design

> **Status:** active
> **Last evidence:** 2026-08-23 — generalization review of Corpus 2, family/variant research, current level-blindness contract, and investigation-report selection rules
> **Decision:** create a renewable three-role evaluation discipline (development/tuning, untouched confirmation, locked/fresh transfer) rather than treating level-blind execution on repeatedly mined corpora as generalization evidence
> **Remaining gate:** instantiate one reproducible confirmation cohort and one reproducible transfer/challenge cohort, record their generator/source/version metadata, and use them on the next solver treatment selected from development evidence
> **Evidence role:** discovery
> **Selection:** observational — protocol is motivated by repeated inspection/tuning on existing stress/census/family populations and by the number of candidate policies/configurations now being compared

## Purpose

This report turns the generalization principles already present in [`docs/solver-research-operating-model.md`](../docs/solver-research-operating-model.md) and [`docs/solver-level-blindness.md`](../docs/solver-level-blindness.md) into a concrete first protocol.

It is intentionally a **dated design**, not yet a permanent `docs/solver-evaluation-populations.md` authority. A stable topic document should be created only after real named populations exist and their lifecycle has been exercised enough to know what the durable contract actually needs.

## Problem

Pathfinder's current research corpora have become excellent development laboratories precisely because they have been inspected so heavily.

Corpus 2, technique-census cells, regression cohorts, known difficult levels, and variant families have been used to:

- discover failure phenotypes;
- nominate features and gates;
- select scoring/configuration variants;
- compare budgets and retries;
- inspect exact failures;
- diagnose specific regressions;
- build scheduler hypotheses; and
- decide what to investigate next.

A solver can remain perfectly **level-blind at runtime** while becoming highly adapted to those repeatedly observed distributions. Therefore:

> level-blindness answers “did the production solver look up this level?”; a holdout answers “was this evidence exposed while the treatment was being designed or selected?”

Those are different questions and require different controls.

## Evaluation roles

Every decision-bearing solver population should have one declared role for the decision being made.

### 1. Development / tuning

Agents may inspect exact failures, paths, features, family relationships, traces, and per-level outcomes freely.

Use it to:

- generate hypotheses;
- select thresholds/configurations/features;
- build cohorts;
- debug implementation;
- choose among candidate policies;
- perform mechanism forensics.

Current Corpus 2 and the heavily mined technique census belong here for new scheduler/configuration decisions.

### 2. Confirmation

The treatment and primary acceptance criterion are frozen before this population's decision-bearing outcomes are inspected.

Use it to answer:

> Does the selected candidate survive the optimism introduced by discovery/tuning and candidate selection?

Confirmation may expose exact failures after the verdict is recorded. Once those failures influence redesign, the exposed cases become development evidence for the next iteration.

### 3. Transfer / challenge

A locked or freshly generated population tests a broader claim about unseen/editor-like Pathfinder levels rather than merely another sample from the exact development process.

Use it only after the candidate has survived confirmation.

During treatment iteration, prefer aggregate-only visibility where practical. Once exact identities/failures/traces are inspected and influence redesign, that cohort is no longer transfer evidence for the redesigned treatment.

## No immortal holdout

The goal is not a sacred secret leaderboard that can never be touched.

The correct model is renewable:

```text
development data
    -> candidate freeze
    -> confirmation
    -> transfer/challenge
    -> inspect failures if useful
    -> exposed population becomes development data
    -> replenish with fresh confirmation/transfer data
```

This avoids two bad extremes:

- repeatedly peeking at one “holdout” until it becomes training data while keeping the label; and
- refusing to inspect useful failures forever because the benchmark has become ceremonial.

## Independent unit and family leakage

For variant/family data, the independent unit is the **parent family**, not each sibling row.

Rules:

- no parent may contribute siblings to both development and confirmation/transfer for a family-trained/tuned decision;
- orientation/mirror/perturbation siblings remain grouped even if their serialized level IDs differ;
- bootstrap/resampling and uncertainty should operate by parent when siblings are included;
- a huge sibling count does not create a huge independent sample size.

For unrelated generated levels with no known family relationship, the level is the default independent unit.

## First instantiation

The first version should be deliberately simple and reproducible.

### Development

Use current already-mined evidence:

- Corpus 2;
- technique census and current derived analyses;
- historical regressions/current reconciliation sets;
- existing variant families for offline nomination, grouped by parent;
- published/Corpus 1 only where their prior use does not conflict with the specific claim.

Do **not** waste compute attempting to make these populations “clean” again. Their value is development value.

### Confirmation cohort

Create or reserve a reproducible cohort large enough to detect the expected effect size of the next selected treatment, but do not default to a giant corpus.

Desirable properties:

- generated or sampled by a fixed recorded rule before candidate outcomes are inspected;
- difficulty distribution broad enough that both gains and regressions can appear;
- no exact family overlap with development family data;
- generator/source/version/hash recorded;
- exact level list frozen with the experiment manifest;
- no candidate-specific filtering after results are seen.

If the next treatment is expected to affect only a narrow mechanic population, stratification may be prespecified. The stratum definition must be based on legal static features, not post-hoc outcome inspection.

### Transfer/challenge cohort

Prefer a **freshly generated or separately sourced** population whose generation process is not merely “more of the exact cases that taught the current solver.”

Possible sources include:

- fresh editor-like generation with a declared seed/version;
- a deliberately shifted generator distribution;
- new human-authored/editor levels not previously used for tuning;
- a future generated batch held from agents until a candidate is frozen.

The first transfer set does not need to be enormous. Its job is to detect obvious development-distribution overfit and calibrate the maintenance process.

## Visibility policy

For development data, exact visibility is unrestricted.

For confirmation data:

1. freeze candidate + primary acceptance criterion;
2. run full per-level evaluation;
3. record verdict;
4. exact failure inspection may then occur;
5. if redesign follows, mark the cohort exposed/development for later iterations.

For transfer data, prefer two stages:

### Aggregate stage

Expose only information needed for the frozen verdict, such as:

- total solves;
- paired gains/losses;
- aggregate `workSpent`;
- correctness alarms;
- confidence/interval summaries;
- broad prespecified strata if required.

Do not expose exact IDs, winning configs, traces, paths, or per-level feature tables while deciding whether to modify the treatment.

### Unseal stage

After the transfer verdict is frozen, exact failures may be inspected for research value. Record the date/commit at which unsealing occurred. From that point forward, the set is not transfer evidence for treatments redesigned using those details.

If infrastructure cannot currently hide exact results cheaply, do not build a large secrecy system first. Use process discipline and clear evidence-role metadata; build aggregate-only tooling only if repeated use justifies it.

## Candidate freeze contract

Before confirmation/transfer, record:

- solver commit/ref;
- candidate policy/configuration/flags;
- action/config registry version when relevant;
- work envelope and non-binding wall deadline;
- population generation/source identity;
- primary objective;
- paired gain/loss rule;
- correctness/referee criteria;
- acceptable work tradeoff or Pareto interpretation;
- any prespecified mechanic strata;
- exact rule for pass / fail / inconclusive;
- whether the candidate was selected from many alternatives and how many/range were tried.

Changing treatment or acceptance criteria after seeing outcomes makes the next run exploratory/tuning unless a fresh untouched cohort is used.

## Primary outcome

The default production objective remains:

> cold level-blind valid solves versus machine-independent `workSpent`, with paired gains/losses and correctness protected.

Avoid reducing this automatically to one scalar. Report the solve/work Pareto change and any rare unique losses.

Wall time remains an implementation metric. It may accompany results but should not substitute for deterministic work when evaluating scheduling/search policy.

## Sample size and uncertainty

Do not choose sample size by ritual.

Before a confirmation run, estimate the plausible effect from development evidence and use the smallest cohort likely to distinguish:

- a material gain worth pursuing;
- a null/too-small effect; and
- an unacceptable regression/cost tradeoff.

For very small expected gains (+2/+3/+5-level effects), raw point estimates on a tiny cohort are inherently unstable. Use paired uncertainty, grouped resampling where appropriate, and repeat/fresh confirmation rather than pretending the exact observed delta is the true effect size.

When the effect is primarily a rare-capability change, report the rare cases directly and avoid hiding them inside an average.

## Multiple comparisons

If one confirmation cohort is used to compare many candidates, it becomes a tuning population for choosing among those candidates.

Therefore either:

- nominate one/few candidates from development and confirm them prespecifically; or
- use nested/grouped selection within a development/tuning pool, then reserve a separate final confirmation cohort.

Do not run twenty variants on “confirmation,” select the best one, and call its same-cohort result independently confirmed.

## Relationship to published, Corpus 1, and Corpus 2

Population names do not inherently determine evidence role.

A published or Corpus-1 level repeatedly inspected for a given treatment can be development data. A newly generated Corpus-2-format batch frozen before a decision can be confirmation/transfer data. Evidence role depends on **exposure for the decision**, not prestige or file name.

Published levels remain important product/regression evidence because users may actually encounter them. That is separate from whether they provide statistically fresh confirmation of a research hypothesis.

## Relationship to known solutions and exact/reference tools

Known solutions, exact labels, and CP-SAT witnesses may be used freely in development diagnosis.

For confirmation/transfer:

- the production solver remains cold and level-blind;
- external labels may validate correctness or classify a prespecified diagnostic outcome offline;
- exact-level oracle information must not become runtime steering;
- if exact labels are used to select the evaluation cohort after outcomes are inspected, disclose that selection and do not call it an untouched broad sample.

## First treatments that should use this protocol

The next strong candidates are:

1. any policy selected by the portfolio-repricing/scheduler study;
2. any configuration selected from an automatic/racing search;
3. a restart policy selected after examining multiple seeds/schedules;
4. a learned-failure treatment selected from several reason classes;
5. a beam-retention descriptor selected from exact extinction cases.

These are exactly the cases where the project now has enough candidate-selection freedom for development results to become especially optimistic.

## Promotion language

Use claim language matched to evidence:

- development only: “improves Corpus 2 / selected development cohort by …”;
- independent confirmation: “retained the effect on untouched/grouped confirmation data …”;
- transfer: “also improved a locked/fresh challenge population …”;
- no transfer set: do not upgrade the wording to generic unseen-level generalization.

Useful engineering changes do not need grand claims. A Corpus-2-targeted improvement can still be worth shipping if its product/regression tradeoff is good; the evidence just needs an honest label.

## Reclassification ledger

Each managed confirmation/transfer population should eventually record:

- population ID;
- creation/source/generator version;
- seed/hash or exact manifest;
- intended role;
- first treatment evaluated;
- dates/commits of aggregate runs;
- date exact outcomes were unsealed;
- date/decision when it became development data;
- successor/replenishment population if any.

This should be machine-readable if the lifecycle repeats. Do not create a large registry framework before the first one or two populations prove which fields are actually needed.

## Success gate

This protocol earns a permanent topic document when:

- at least one real confirmation cohort and one transfer/challenge cohort have been instantiated;
- at least one selected solver treatment has moved through the lifecycle;
- the project has learned which visibility/reclassification mechanics are actually practical; and
- repeated use demonstrates that the lifecycle needs a stable authority beyond the operating model and experiment reports.

At that point, promote the durable contract to `docs/solver-evaluation-populations.md` and keep individual population creation/results in dated reports/manifests.

## Failure/stop gate

Do not build elaborate holdout infrastructure if the simple process above works.

If aggregate-only visibility is operationally expensive, use clear population manifests, candidate freeze, and evidence-role discipline first. The goal is independent evidence, not secrecy theater.