# Connectivity cut-certificate shadow development result 002

> **Status:** concluded-positive for recurrence; concluded-negative for naive linear scheduled-call replacement economics.
> **Date:** 2026-09-21.
> **Evidence role:** development.
> **Question:** does the proved portal-free goal-cut implication recur across distinct exact states often enough to constitute a real reusable-reasoning reservoir, and does the first bounded linear shadow already justify a behavioral consumer?
> **Execution:** GitHub Actions CI run `35569648501`, fast-gate job `106238397113`, branch head `6ff95507f652e3e3ea20a7934ca371e0b4d77fb3`.
> **Design authority:** [connectivity certificate source audit 001](2026-09-21-connectivity-certificate-source-audit-001.md).
> **Parent audit:** [computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).

## Result

The recurrence hypothesis is clearly positive.

The first naive lookup architecture is not.

Frozen development population:

- Corpus 2 random stress corpus;
- positions 81-104;
- 24 parents;
- strict whole-solve work budget 500,000 per level;
- 30 s wall ceiling per level, non-binding in this run;
- maximum 64 retained certificates per solve;
- ordinary production search unchanged;
- every shadow hit verified by the ordinary connectivity flood fill.

Observed:

| metric | result |
|---|---:|
| completed parents | 24 / 24 |
| certificates retained | 191 |
| certificates dropped at capacity | 2,099 |
| scheduled probe calls | 15,019 |
| certificate entries scanned | 806,088 |
| boundary-cell validations | 311,919 |
| shadow hits | 650 |
| cross-exact-state hits | 612 |
| confirmed goal-unreachable hits | 650 |
| false positives | **0** |
| parents with any hit | 9 / 24 |
| parents with cross-exact-state hit | 8 / 24 |
| potentially replaceable scheduled connectivity calls | 650 |
| replaceable-call rate among probed scheduled calls | **4.33%** |
| total canonical solve work | 12,218,378 |

Cross-exact-state reuse accounts for **94.15%** of all hits (612 / 650). The candidate is therefore not merely rediscovering identical residual states.

One parent dominated the raw hit count: R00595 produced 532 hits, 530 cross-exact-state. R00597 contributed 88 / 73. The remaining positive parents were much smaller. Parent-level replication is nevertheless real: 9 parents had hits and 8 had cross-state hits.

## Safety interpretation

All 650 shadow hits were confirmed by the ordinary flood fill.

This is not a proof of universal soundness by sample frequency; soundness comes from the portal-free cut implication proved in the source audit. The zero-disagreement development run is an implementation differential against that theorem.

No behavioral prune or connectivity replacement occurred.

## Canonical-work economics

`isConnected()` charges `CONNECTIVITY_WORK_UNITS = 12` canonical work units per call.

Therefore even the optimistic upper bound in which all 650 confirmed hits replace a scheduled connectivity call is:

```
650 * 12 = 7,800 canonical work units
```

against 12,218,378 total solve work, approximately **0.064%**.

That upper bound ignores certificate validation cost.

The actual naive shadow performed:

- 806,088 retained-certificate scans;
- 311,919 boundary-cell checks;

to identify those 650 replaceable calls.

The observer checks are not charged to canonical `workSpent`, so the run does not provide a comparable work-unit subtraction for lookup overhead. But the operation-count imbalance is already enough to reject the current linear-scan shape as an earned behavioral consumer.

## What this establishes

### Positive: reusable proof is a real unit smaller than exact residual state

The theorem applies repeatedly across distinct exact states on multiple independent parents.

This directly answers the successor audit's first discriminator:

> reason reuse is a real reservoir for this proof family, not merely an elegant zero-incidence cache idea.

It also validates the audit's identity/equivalence/implication hierarchy: the useful reusable unit here is a one-way **implication certificate**, not residual equivalence.

### Negative: naive linear certificate retention is not the consumer

The first observer retained up to 64 certificates and scanned them linearly.

That form is closed for behavioral promotion from this evidence:

- certificate scans greatly outnumber hits;
- boundary validation is non-trivial;
- best-case canonical work replaced is only ~0.064% of whole-solve work;
- retention saturated heavily, with 2,099 proof derivations dropped.

Do not ship “cache the last 64 cuts and linearly scan them.”

## New discriminators earned by the result

The strong recurrence plus poor lookup economics narrows the next question.

Before any behavioral prototype, determine whether the proof population has a compact indexing/deduplication structure that removes most lookup work.

The smallest useful measurements are:

1. **proof-object uniqueness:** how many of the 2,290 derived certificate occurrences are distinct normalized cut signatures within each solve?
2. **duplicate derivation recurrence:** how often is the exact same cut proof derived again after its first occurrence?
3. **candidate fanout by current position / component membership:** can a cheap cell-to-certificate index reduce validation from dozens of certificates to a tiny candidate set?
4. **boundary-size economics:** among certificates that actually hit later, how large are their boundaries versus non-hitting certificates?
5. **hit concentration:** does a small number of proof objects account for most of the 650 hits?
6. **retention censoring:** would exact-signature deduplication keep the useful proof set below a small bounded cap?

These measurements can be added to the existing production-inert shadow. They do not require memoization or search changes.

## Earliness remains separate

This result covers replacement only at already-scheduled connectivity calls.

The 0.064% whole-work ceiling makes simple scheduled-call replacement unattractive unless a much cheaper index makes wall cost surprisingly favorable.

The potentially larger value remains **earlier rejection between connectivity checkpoints**, but that experiment is not yet earned. First prove that a cheap certificate selector exists. Otherwise checking certificates more often would amplify the lookup problem.

## Multi-query implication

The proof-object identity introduced for the paired 2K/5K beam-width tool is now better motivated.

The next W2 question is:

> do two isolated beam widths derive the same normalized connectivity cut proofs even when their exact frontier prefixes diverge?

That measurement may reveal cross-query redundant reasoning, but it remains an offline overlap study. This result does not license shared beam execution.

## Artifact note

The CI command wrote development files ending in `-002`, but the temporary uploader mistakenly requested `-001`; therefore no artifact ZIP was retained.

The full aggregate result and per-parent hit counts are preserved in the CI job log and transcribed here. This report is the durable disposition authority for the development run. The temporary CI execution rail should now be removed rather than repaired into standing research compute.

## Disposition

**Advance the proof family, close the naive consumer.**

- theorem/safety scope: survives;
- recurrence: **positive**;
- cross-exact-state recurrence: **positive**;
- naive bounded linear lookup: **closed low-value**;
- behavioral scheduled-call replacement: **not earned**;
- smaller indexed/deduplicated shadow measurement: **earned**;
- unscheduled/earlier behavioral checking: **deferred until lookup economics improve**;
- general proof store / blackboard: **not earned**.

Reopen the closed linear form only if the connectivity kernel's cost changes materially enough that replacing ~4.33% of probed scheduled calls has substantially different economics.
