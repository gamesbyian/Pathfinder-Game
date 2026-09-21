# Connectivity cut-certificate shadow development result 001

> **Status:** inconclusive
> **Last evidence:** 2026-09-21 — frozen Corpus-2 positions 81-104 completed under 500k strict work each and emitted 0 certificates across 12,218,378 total canonical work.
> **Decision:** classify run 001 as an observability miss, not a negative reuse/economics result; the implementation's no-pending-obligation source gate was narrower than the proved goal-cut theorem.
> **Remaining gate:** rerun the identical 24-parent population after broadening certificate production to every ordinary portal-free goal-unreachable rejection; preserve the same safety/economics gates.

## Frozen contract

Authority:

`reports/2026-09-21-connectivity-certificate-shadow-development-preflight-001.md`

Execution:

- corpus: `data/stress/stress-levels-random.json`;
- positions: 81-104;
- 24 independent parents;
- strict base work budget: 500,000 per level;
- wall safety: 30,000 ms;
- retained certificate cap: 64;
- ordinary production ladder;
- observer only.

GitHub Actions:

- run: `35568807183`;
- head: `dd967d1a6fd5598376e4ca2f61cc167f483958fe`;
- artifact: `connectivity-certificate-shadow-development-001`;
- artifact id: `10624468119`;
- digest: `sha256:c781589e36fce4055a659fb4ae4d167d3ae47bd839af0438d8152e68d1d310fe`.

## Result

| measure | value |
|---|---:|
| requested/completed parents | 24 / 24 |
| total solve work | 12,218,378 |
| certificates produced | 0 |
| certificates dropped at cap | 0 |
| scheduled probe calls with retained certificates | 0 |
| certificate scans | 0 |
| boundary-cell checks | 0 |
| shadow hits | 0 |
| cross-exact-state hits | 0 |
| confirmed goal-unreachable hits | 0 |
| false-positive hits | 0 |
| potentially replaceable connectivity calls | 0 |

Twenty-three rows ended `work-budget-reached`; one solved. The run therefore exercised substantial solver work but never entered the certificate consumer because no source certificate was produced.

## Why zero certificates is not a reuse negative

The preflight explicitly required multiple certificate-producing portal-free parents before interpreting replacement economics.

That observability condition failed at the first step.

Source review after the frozen result found the implementation had imposed:

- `state.mustMask === 0`;
- `state.mustCrossMask === 0`;
- `mcOpenMask === 0`;

before retaining an otherwise valid portal-free goal cut.

Those restrictions were inherited from an over-reading of the historical Stage-B dominant-cluster prose, not from the cut proof.

Stage-B retained `mpVisitedMask`, not pending `mustMask`. In particular:

> `mpVisitedMask=0` means no must-pass cell has yet been visited; it does **not** mean no must-pass remains pending.

More importantly, the theorem itself only needs:

1. the fixed goal to be outside the old reached component;
2. no portal edge to escape the represented cardinal cut;
3. later current position inside the old component;
4. every old boundary cell to remain blocked under the later state's connectivity predicate.

Pending obligations and reserved-MC semantics merely affect that predicate. Construction and later validation already receive the exact `maxVisit`, `mcOpenMask`, must-cross keys, flipper state and axis-exhaustion semantics.

## Disposition

Run 001 answers a useful observability question:

> the first source gate was too narrow to expose the theorem on this independent block.

It does **not** answer:

- whether cut certificates recur;
- whether recurrence crosses exact states;
- whether lookup is cheaper than connectivity;
- whether scheduled connectivity calls are materially replaceable.

The population must not be replaced with hand-picked hit-producing levels.

Instead, broaden only the source gate to the theorem's already-proved scope and rerun the **same** positions 81-104. That changes one conceptual dimension while holding population and resource envelope fixed.

## Safety continuity

The broadened run retains the same hard safety rule:

- every shadow hit is followed by the ordinary flood fill;
- any `confirmedGoalUnreachable=false` hit blocks behavioral advancement;
- portal levels remain unsupported by this first certificate form.

No production prune or ordering behavior is changed.
