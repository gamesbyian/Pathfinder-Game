# M6 — missing cross-locus edges

Snapshot: `solver-premise-map-v1-2026-09-17` (`e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`)
Method: preregistered M6 only. The hardening authority's named cross-locus failure classes were checked against all frozen typed relations. A missing typed edge is treated as an ambiguity between a real composition gap and incomplete relation modeling, never as proof of a runtime defect.

## M6.1 — derive → transfer remains weakly contracted

Frozen concepts: P155 dynamic/state-conditioned preprocessing, P164 cross-mechanic derived relations, P162 reusable positive solve-local facts, P083 typed-fact exchange, P177/P193 handoff preservation.

The map represents derivation and transfer strongly as separate concepts but does not encode a concrete producer/consumer contract showing which derived facts from P155/P164 are admissible inputs to P083 or a P193 handoff. P012 SUPPORTS P155 and P155 ENABLES P093/P159, but that is local use rather than general cross-stage transfer.

Alternative interpretation: a producer/consumer edge would be implementation detail until a particular fact type and consumer exist. The conceptual gap may be graph documentation, not solver behavior.

Confidence: high structural, low on runtime impact. Classification: `RELATION_ONLY` with possible interface-contract premise if later evidence requires it.

## M6.2 — generate → retain has semantic adjacency but no explicit contract

Frozen concepts: candidate generation P020/P114/P190/P191; retention/diversity P050/P053/P141/P184.

The map asks whether the generator contains relevant continuations and whether retention preserves distinct futures, but it does not explicitly connect generated candidate provenance/regime coverage to the retention policy that must preserve it. A generator can therefore be locally adequate while its distinctive outputs are erased by a downstream retention rule without the graph naming that composition.

Alternative interpretation: P135's first-loss diagnosis already spans both loci and can reveal this empirically without a new semantic edge. If so, the missing relation is explanatory convenience rather than missing capability.

Confidence: high. Classification: `RELATION_ONLY` / possible `SCOPE_SPLIT` around provenance-aware retention.

## M6.3 — retain → allocate is under-specified

Frozen concepts: P050/P053/P122/P141/P184 retention/continuation/optionality; P065/P123/P153/P186 work allocation and continuation economics.

The map separately represents preserving a frontier and deciding how much more work to spend, but not the output contract between them. In particular, option value (P184) and resumability (P122) are potentially allocation-relevant state, while P065/P186 need a value signal to decide dose or abandonment.

Alternative interpretation: the allocation policy can recompute value directly from retained states, so no explicit handoff object is necessary. The graph would then be missing a relation rather than the architecture missing information.

Confidence: medium-high. Classification: `RELATION_ONLY`.

## M6.4 — measure → infer has partial safeguards but no general validity edge

Frozen concepts: P151 participation, P158 labelled reference support, P167 operational similarity, P175 solved-set churn, P188 instrumentation missingness/observer effect, P198 maturity gates; inference guards P003/P005/P137/P181/P187.

Several specific dependencies exist, including P151 `EVIDENCE_DEPENDS_ON` P003 and P198 strengthening P151/P187. But there is no general graph object stating what measurement properties license which conclusion class. This leaves a recurrent composition risk: a correct measurement at one maturity/population level can be used to support a stronger inference than it warrants.

Alternative interpretation: P197 authority classes plus P198 maturity gates are intended to supply exactly this governance without adding pairwise measurement→inference edges. If those overlays are applied operationally, the relation graph need not duplicate them.

Confidence: high. Classification: `ONTOLOGY_ISSUE` / `RELATION_ONLY`.

## M6.5 — failure explanation → revision is represented, but incompletely typed

Frozen concepts: P081 failure explanation, P147 causal earlier commitment, P082 selective revision, P135/P183 first irreversible loss.

This interface is the strongest counterexample to a blanket missing-edge story. P081 ENABLES P082, and P147 is a PREREQUISITE of P082. The broad explanation→revision connection is therefore present.

The residual gap is output typing: P135/P183 can diagnose a first irreversible loss, but the graph does not say which diagnostic outputs identify a reversible commitment, which revision operator consumes them, or when P082 cannot act on a valid diagnosis.

Alternative interpretation: those are implementation forms beneath P082 and should not become relation-level commitments yet.

Confidence: high. Classification: existing edge plus bounded `RELATION_ONLY` gap.

## M6.6 — stage output → handoff is named but not stage-specific

Frozen concepts: P177, P178, P193, P200 plus continuation P122 and knowledge P162.

P177/P193 explicitly elevate handoffs and contracts, so the semantic gap is no longer unnamed. What remains absent is stage-specific producer/consumer structure: which frontier, knowledge, budget, causal evidence, or uncertainty objects survive each concrete transition, and which downstream component is authorized to use them.

Alternative interpretation: a generic contract is preferable until evidence identifies a harmful concrete transition. Enumerating stage pairs prematurely could fossilize current architecture.

Confidence: high. Classification: `RELATION_ONLY`, with architecture-epoch sensitivity.

## M6.7 — participation → capability attribution is partially represented

Frozen concepts: P151 verified participation, P152 lifecycle/winner attribution, P187 fixed-envelope non-monotonicity, P198 maturity gates.

P151 is a PREREQUISITE of P152, and P198 strengthens P151/P187. Thus the frozen map already captures that capability attribution cannot precede verified participation. The remaining weak edge is from attribution to stronger promotion/economic conclusions: observed participation and even causal credit do not by themselves establish complementary matched-cost value, schedulability, or production promotion.

Alternative interpretation: P198's maturity ladder completely supplies this distinction and no additional graph relation is needed.

Confidence: high. Classification: `DESCRIPTIVE` / `RELATION_ONLY` only if the maturity overlay is not consumed by future tooling.

## M6 bounded conclusion

The named cross-locus audit classes divide into three types: genuinely uncontracted interfaces (derive→transfer, generate→retain, retain→allocate), semantically named but operationally untyped interfaces (stage handoff, failure explanation→revision), and interfaces whose guard already exists mainly in the authority/maturity overlay rather than the core relation graph (measure→infer, participation→attribution).

M6 does not infer that any missing relation caused a solve loss. It records where local claims do not yet compose transparently in the frozen representation.
