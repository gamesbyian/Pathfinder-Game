# Research-contract interoperability audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — current producers, validators, compatibility readers, shared result schema and durable v3 experiment-evidence manifests audited during research-system consolidation.
> **Decision:** normalize only the cross-system scientific meanings that already have multiple real consumers; keep family-run, compact failure-response, exact/reference and hint provenance payloads specialist.
> **Remaining gate:** validate any proposed common-kernel field on a second real consumer before promoting it out of the WS2 vertical slice.

## Purpose

This audit closes the Bundle-B/Phase-6.1 question "does semantic interoperability require one envelope?" with a qualified **no**.

The current systems fall into three useful classes:

| Surface | Audited owner | Classification | Interoperability decision |
|---|---|---|---|
| Shared solver experiment/result v3 | `scripts/write-solver-experiment-contract.mjs`, `scripts/publish-solver-sweep-result.mjs`, `docs/solver-experiment-result.schema.json` | shared decision-bearing envelope | Keep shared. The emitted/schema split-brain was real and has been repaired; durable v3 manifests are now checked against the declared schema. |
| Family evaluation/run manifests | `scripts/experiment-manifest-lib.mjs` and family-run producer/tests | specialist contract with compatibility reader | Keep specialist. Schema-v1 family runs normalize through one v2 owner; constructors validate before write. Do not force family selection/corpus/run detail into v3 merely for shape uniformity. |
| Compact failure response | `scripts/solver-failure-response-lib.mjs` | compatible shared semantics inside a specialist observation payload | Keep specialist. Reuse the shared solver outcome/population vocabulary where meanings coincide; protocol/solver identity, parent dependence and reported-field/unknown semantics remain explicit. It is not independently decision-bearing without a question-specific analysis/claim boundary. |
| Exact/reference prefix evidence | `scripts/stress/cpsat-explicit-prefix-reference-lib.mjs` plus the explicit-prefix runner/integrity path | specialist truth/instrument payload | Keep specialist. `unsupported`, model-invalid and UNKNOWN remain abstention/indeterminate and must never collapse into DEAD. Structured source/cut identity now survives current rows; legacy delimiter recovery remains a reader-only compatibility path. |
| Hint provenance identity | `modules/domain/hint-runtime.mjs` via `scripts/hint-provenance-identity.mjs` compatibility export | specialist discovery/provenance identity | Keep specialist. Share run/source/protocol, reconstruction, selection/dependence and cost semantics only where their meaning is genuinely the same as failure evidence; do not rewrite historical Hint records into semantics they never captured. |

## Shared meanings that have earned reuse

The audit supports continued reuse of the existing common owners for:

- immutable population/content identity and configuration hashing;
- normalized solver outcome/censoring classes where the underlying event means the same thing;
- protocol/run/solver revision identity;
- parent-level dependence and research-block lineage;
- work/node quantities with their existing unit boundaries;
- exact/reference abstention as distinct from a negative label;
- evidence-role/selection lineage where the consumer actually needs it;
- derivation/recovery identity on decision-bearing paths.

This is a **small semantic kernel**, not a master document format.

## Deliberately specialist meanings

The following remain local because collapsing them would erase useful semantics:

- family dataset/source/selection/run topology;
- compact attempt-level failure fields and missing-as-unknown behavior;
- exact/reference model status/reason and replay details;
- hint discovery event/replay/provenance detail;
- specialist treatment/observation payloads.

A field with the same English name is not automatically the same scientific concept.

## Validation posture

Current construction/validation ownership is intentionally heterogeneous:

- v3 experiment publication is checked against the declared result schema and the local checker now fails if the schema introduces validation keywords the checker does not understand;
- family manifests validate at construction and retain an explicit legacy normalization path;
- compact failure-response documents have a shared constructor/validator and inherit the common solver outcome classification;
- exact/reference uses a separate classifier so abstention/unsupported semantics retain an independent failure mode;
- hint provenance retains its domain owner rather than being reimplemented by failure-evidence tooling.

This diversity is useful. Integration should standardize contracts more aggressively than implementations when implementation independence protects scientific cross-checks.

## Vertical-slice implication

The first Bundle-C slice, `WS2-FAILURE-RESPONSE-RECONNAISSANCE`, therefore keeps the generic compact-response reducer unchanged and adds a **question-specific analysis contract and claim capsule** around it. The slice is the proving ground for unit topology, instrument support, applicability, analysis identity, claim/decision separation and invalidation semantics.

Do not promote those fields into a repository-wide common kernel until a second real consumer needs the same meaning.
