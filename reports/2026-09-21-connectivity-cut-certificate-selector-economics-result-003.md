# Connectivity cut-certificate selector economics result 003

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — exact proof-template deduplication and current-position filtering were measured on the same frozen 24-parent hard-C2 development sample.
> **Decision:** a cheap selector structure exists, but scheduled-call replacement remains closed on whole-solve work economics; advance only to a production-inert unscheduled-applicability falsifier.
> **Remaining gate:** measure cut-certificate applicability only at candidates that survive earlier hard prunes while production skips connectivity; if incidence is material, then earn technique-specific downstream-work accounting.
> **Evidence role:** development.
> **Parent result:** [connectivity cut-certificate shadow development result 002](2026-09-21-connectivity-cut-certificate-shadow-development-result-002.md).
> **Parent audit:** [computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).
> **Execution:** GitHub Actions CI run `35571561810`, fast-gate job `106244290747`, one-shot branch-gated selector-economics probe.

## Question

The first cut-certificate shadow established real implication-level recurrence but made a naive linear 64-entry lookup look economically poor.

This follow-up asked:

1. how much exact proof-template duplication exists?
2. can a cheap current-position index discard most retained certificates before boundary validation?
3. does better retention materially change scheduled-call hit coverage?
4. does any of that rescue scheduled-call replacement as a whole-solve optimization?

## Frozen population

Identical to result 002:

- Corpus 2 random stress corpus;
- positions 81-104;
- 24 parents;
- strict whole-solve work budget 500,000 per level;
- 30 s wall ceiling per level;
- maximum 64 retained **unique** proof templates per solve;
- production search/pruning unchanged;
- every scheduled shadow hit still verified by the ordinary connectivity flood fill.

## Result

| metric | result |
|---|---:|
| completed parents | 24 / 24 |
| proof derivation occurrences | 2,290 |
| unique proof signatures across per-level denominators | 967 |
| repeated proof occurrences | 1,323 |
| repeated-occurrence rate | **57.77%** |
| retained unique certificates | 168 |
| exact duplicates suppressed before retention | 504 |
| unique certificates still dropped at capacity | 1,618 |
| scheduled probe calls | 15,019 |
| retained certificates scanned | 646,119 |
| current-position-eligible certificates | 93,814 |
| position eligibility rate | **14.52%** |
| position-index scan-reduction upper bound | **85.48%** |
| boundary-cell validations | 444,144 |
| confirmed scheduled-call hits | 911 |
| cross-exact-state hits | 861 |
| false positives | **0** |
| parents with any hit | 9 / 24 |
| parents with cross-state hit | 8 / 24 |
| scheduled-call hit rate | **6.07%** |
| total canonical solve work | 12,218,378 |

Exact proof deduplication therefore answers the first lookup question strongly: more than half of all proof derivations rediscover a proof template already derived earlier in the same solve.

The current-position predicate is also highly selective. Only 14.52% of linearly scanned certificates even contain the current position in their certified component. A direct cell-to-certificate index could therefore avoid up to 85.48% of the certificate-entry scans before inspecting any boundary cell.

## Why hits increased from result 002

Result 002 retained up to 64 certificate **occurrences**, so repeated templates could consume retention capacity.

This run deduplicated exact proof signatures before they consumed a retained slot. That increased unique-template coverage and raised:

- confirmed scheduled hits from 650 to 911;
- cross-exact-state hits from 612 to 861;
- scheduled hit rate from 4.33% to 6.07%.

The underlying production search/work denominator remained the same 12,218,378 canonical work units.

This is a lookup/retention effect, not improved solver capability.

## Scheduled-call economics still close

`isConnected()` charges 12 canonical work units.

Even the optimistic upper bound where every one of the 911 confirmed hits eliminates a full scheduled connectivity call is:

```
911 * 12 = 10,932 canonical work units
```

or approximately **0.0895%** of the 12,218,378-work sample.

That is still before charging:

- cell-index lookup;
- boundary revalidation;
- certificate construction;
- signature/deduplication cost;
- memory traffic.

Therefore the improved selector does **not** rescue "replace already-scheduled connectivity calls" as a meaningful whole-solve work treatment.

That form stays closed.

## What survives

Two structural results are now durable:

1. **proof recurrence is real:** 57.77% of derivations repeat an exact normalized cut template;
2. **a cheap first-stage selector is plausible:** current-position membership eliminates ~85% of naive candidates.

Those facts matter because the next question is not scheduled-call replacement.

The remaining potential value is **earliness**:

> can a previously derived proof reject a branch at a candidate where production deliberately skips the more expensive connectivity flood fill?

DFS currently schedules connectivity only every 64 expanded nodes until the last 10 required steps. Beam schedules it every eighth real-length layer until the last 20. Those gaps are the only remaining plausible reservoir large enough to matter.

## Next falsifier

Do not implement behavioral proof pruning yet.

Add a production-inert shadow at the shared hard-prune seam with this exact eligibility:

- the candidate has already survived every earlier hard prune;
- production has `runConnectivity === false`;
- the level is portal-free;
- at least one retained unique cut proof exists;
- lookup first restricts to proofs whose certified component contains the current position;
- the full old boundary is revalidated under the current connectivity predicate;
- a hit is observed only, never consumed.

Primary observables:

- unscheduled eligible candidates;
- candidate certificates after position filtering;
- boundary checks;
- exact proof hits;
- distinct parents/attempts/techniques with hits;
- work point of each hit;
- hit distance from certificate derivation.

This first microscope deliberately does **not** estimate counterfactual saved subtree work. If unscheduled applicability is rare, close immediately. If it is material across multiple parents, then earn technique-specific downstream-work accounting.

## Artifact note

The one-shot CI probe emitted:

- `reports/stress/connectivity-cut-selector-development-003.json`;
- `reports/stress/connectivity-cut-selector-development-003-summary.md`.

The temporary execution rail was removed after the run. The aggregate result is preserved in the CI job log and transcribed here as the durable disposition authority.

## Disposition

- exact cut-proof recurrence: **positive**;
- exact-signature deduplication: **useful observer/selector primitive**;
- current-position filtering: **strong cheap selector nomination**;
- naive linear scan: **closed**;
- scheduled-call replacement: **closed low-value**;
- behavioral cache/prune: **not earned**;
- unscheduled-applicability shadow: **earned**;
- general proof store / blackboard: **not earned**.

The proof family now advances only on evidence of earlier applicability, not on more scheduled-call recurrence measurements.
