# Solver premise-map reciprocal source-coverage audit

> **Status:** pre-mining completeness hardening.
> **Scope:** confidence in what the premise map may have missed, not another internal ontology pass.
> **Frozen reference:** `solver-premise-map-v1-2026-09-17` remains immutable.

## Why this exists

The v1 hardening proves a useful one-way property: every mapped proposition has documentary provenance and a discovery lineage. That does **not** prove the reciprocal property that every premise-bearing part of the repository has been sampled, represented, or deliberately excluded.

This audit therefore reverses the arrow:

`repository surface -> premise-bearing claim/default/question -> mapped premise(s) or explicit disposition`

A map can have perfect provenance and still be incomplete if whole source regions never entered the sampling frame.

## Source universe

The mechanical source audit uses a deliberately broad candidate universe rather than only files already named by the map:

- current `docs/solver-*.md` authorities and research notes;
- `docs/mechanic-state-contracts.md`, `docs/variant-level-research.md`, `docs/human-parent-contrast-research.md`, and `docs/technique-census-analysis.md`;
- `data/stress/README.md` as the durable corpus/generator authority;
- premise-bearing runtime/search architecture and research-governance surfaces nominated by those documents;
- historical/archived material through the archaeology register rather than treating every archive snapshot as an independent authority;
- dated reports through current synthesis/authority documents, plus stratified spot checks where a claim is high-impact, surprising, or only weakly summarized.

The audit intentionally distinguishes **source coverage** from **source independence**. Ten current documents may all descend from one experiment or one historical conclusion.

## Reciprocal dispositions

Every candidate source should end in one of these states:

- `DIRECTLY_MAPPED`: at least one proposition cites the source and the cited propositions reasonably cover its premise-bearing role.
- `INDIRECTLY_MAPPED`: its material is intentionally represented through a current synthesis/authority source; the ancestry must be named.
- `REVIEWED_NO_NEW_PREMISE`: reviewed and found to add implementation detail, evidence, or restatement but no semantically new premise.
- `NEW_PREMISE_CANDIDATE`: exposes a proposition not cleanly represented in v1.
- `ONTOLOGY_ESCAPE`: exposes a question the present schema represents awkwardly enough that adding a row would conceal the problem.
- `OUT_OF_SCOPE`: not meaningfully relevant to solve-count premise space; rationale required.
- `UNREVIEWED`: candidate source still outside the inspected set.

`source_paths` membership alone is insufficient for `DIRECTLY_MAPPED`: a source can be cited for one sentence while containing other unrepresented premises.

## Confidence dimensions

Completeness confidence is reported as a vector, never one percentage:

1. **surface coverage** — how much of the nominated source universe has a disposition;
2. **semantic saturation** — how often new independent/source-stratified passes still generate genuinely new parent premises;
3. **lineage independence** — whether rediscoveries come from causally independent investigations rather than copied summaries;
4. **ontology escape rate** — how often important questions resist clean representation;
5. **historical reach** — current docs, removed tooling, older terminology, and pre-renaming evidence are all represented;
6. **runtime reach** — architectural defaults embedded in code/search lifecycle are sampled, not just prose;
7. **evidence-process reach** — assumptions about observation, selection, attribution, reuse, and inference are represented;
8. **distribution reach** — corpora/generators/human levels/variant families and their selection mechanisms are represented.

No dimension certifies unknown unknowns. The goal is to make residual uncertainty explicit and to watch discovery yield approach saturation across independent passes.

## Saturation protocol

A completeness pass should be run in batches whose source selection is fixed before reading for new premises. For each batch record:

- source stratum and files sampled;
- number of premise-bearing statements reviewed;
- new parent premises;
- specializations/scope splits;
- relation-only additions;
- ontology escapees;
- rewording/restatement rejects;
- concepts independently rediscovered from v1.

The important quantity is not raw proposition count. Confidence rises when **independently selected** batches repeatedly yield mostly rediscovery, scope refinement, or evidence updates rather than new parents.

Stop condition for pre-mining hardening: at least one substantial batch from each major source stratum has been reviewed, no major source stratum is `UNREVIEWED`, and the final two heterogeneous batches produce no high-impact new parent premise. This is evidence of saturation, not proof of completeness.

## Anti-self-sealing rules

1. Do not choose source batches using premise IDs or thin cells alone.
2. Include documents and code surfaces that were not source paths in v1.
3. Search for claims that *contradict the map's organizing assumptions*, not only missing examples.
4. Treat awkward placement as an ontology signal rather than forcing a row into the nearest category.
5. Count causal ancestry of evidence, not document count, when judging corroboration.
6. Preserve narrow source language before normalizing it into map vocabulary.
7. A source that is currently summarized elsewhere still gets sampled when its claim is decision-bearing and the summary could have broadened or narrowed it.

## First reciprocal findings

The first source-stratified check already exposed two cross-cutting epistemic concepts that v1 does not isolate cleanly:

- **causal ancestry / pseudoreplication of evidence:** several reports, ledgers, profiles, and summaries can be descendants of one primary observation and therefore do not constitute independent support;
- **claim-propagation drift:** a correctly narrow result can become broader, stronger, or differently authoritative as it moves from primary observation into a report, capability memory, question state, future-work prose, or queue.

These are not cosmetic additions. Both can change confidence in premise closure and in apparent independent convergence. They are recorded as post-v1 candidates rather than mutating the frozen map.

## Relationship to mining

This audit is a gate on confidence in the **input**, not a thirteenth mining lens over the frozen v1 graph. Mining may proceed only with the residual uncertainty stated explicitly. New post-v1 candidates discovered here remain outside the frozen first mining round unless a separately versioned map is intentionally adopted.
