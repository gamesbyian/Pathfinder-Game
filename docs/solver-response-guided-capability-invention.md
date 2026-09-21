<!-- agent-context-budget: warn=6000 max=8000 -->
# Solver response-guided capability invention

> **Status:** ACTIVE METHOD; no production behavior authorized.
> **Priority owner:** [solver optimization workstreams](solver-optimization-workstreams.md).
> **Capability owner:** [solver capability invention program](solver-capability-invention-program.md).
> **Exact-premise owner:** [small exact projections](solver-small-exact-projections-program.md).

## Purpose

Use existing technique, capability, failure, search-loss, provenance, exact/reference and production evidence as a capability-discovery instrument.

The central question is:

> What smallest legal current-input fact would explain or exploit a real decision/technique contrast that current production reasoning does not already distinguish?

Historical winners remain offline labels, never runtime routing inputs.

## The loop

1. **Contrast.** Identify a real differential response:
   - technique A-only vs B-only solves;
   - retained vs lost viable material at one decision seam;
   - repair rescued vs unrepaired near misses;
   - historical capability signatures with complementary current-residual overlap.
2. **Freeze the contrast population.** Preserve identities, protocol/comparison scope, independent unit and selection history. Aggregate counts are not enough for theorem discovery.
3. **Describe, do not route.** Use legal current-input descriptors to identify dimensions that differ. Existing outcomes are labels for offline premise nomination only.
4. **Seek the smallest exact explanation.** Search the exact-projection families for a theorem/necessary condition/partial order/quotient that could explain the contrast:
   - conserved/transition invariant;
   - relaxed feasibility or capacity;
   - one-way dominance;
   - exact quotient/equivalence.
5. **Stage-0 attack.** Require mechanic scope, novelty witness against current reasoning, redundancy witness and smallest counterexamples before observer code.
6. **Consumer oracle.** Before implementing behavior, replay existing decisions/candidate sets where possible and ask:
   > if this fact had been free here, could it have changed the actual decision?
7. **Smallest consumer.** Only then consider prune, order, retain, repair, route, allocate or handoff.
8. **Transfer/economics.** Production descendants still require level-blind matched-work evidence proportional to selection pressure.

A negative at steps 4-7 feeds back into the loop. It closes the tested explanation/consumer, not necessarily the contrast.

## Two independent values for every premise

Track these separately:

- **proof value:** the premise proves a new sound reject, lower bound or dominance fact;
- **response value:** the premise explains/predicts differentiated solver behavior.

Do not kill response value because prune incidence is low, or infer sound rejection from response association.

## Two-way search

### Response-guided theorem discovery
Start from a real disagreement and ask what exact low-dimensional fact distinguishes the sides.

This is preferred when:
- the disagreement population is substantial;
- coarse descriptors fail to explain it;
- a current decision seam is known.

### Theorem-guided response mining
Start from a proved exact projection and ask which technique/decision contrasts it explains.

Parity response-signature analysis is the worked example.

Both routes meet at the same Stage-0 and consumer-oracle gates.

## Product projections

A tiny Cartesian product can be tested when:
- each component has an exact declared transition/relaxation law;
- the product remains much smaller than residual identity;
- a novelty witness shows the product says something neither component says alone.

Initial examples worth theorem audit, not implementation:
- parity phase × cut side;
- checkerboard capacity × cut/region capacity;
- portal/twist phase × finite mechanic residue;
- obligation-support matching × separator interface capacity.

Do not multiply descriptors speculatively. Product projections exist to express a specific missed joint constraint.

## Partitioned-capacity schema

Several current ideas share one theorem-generation pattern:

1. choose a sound partition/subset or compatibility neighborhood;
2. derive necessary future demand;
3. derive deliberately generous compatible capacity;
4. reject only when demand exceeds capacity.

Checkerboard capacity, cut/interface capacity and Hall-style obligation/support pressure are instances. Keep specialist derivations separate, but use this schema to search for new premises systematically.

Candidate partitions include checkerboard color, cut side/region, reachable phase, mechanic-state class, obligation-support neighborhood and path-created enclosure.

## Evidence sources

Prefer existing evidence in this order:
1. prespecified technique-census pair discordance;
2. capability-memory complementary signatures, used only to nominate explanatory contrasts;
3. first-loss/search-loss decision observations;
4. within-level accepted-path technique contrasts;
5. new production-inert telemetry only after existing evidence cannot answer the discriminator.

Historical identity never becomes a runtime feature.

## First execution slice — implemented

The existing relative-advantage analyzer now preserves left-only/right-only/both level identities for its prespecified technique pairs.

`modules/solver/parity-structure.ts` owns portal twist classification and per-gate required twist parity; production prep consumes the same owner.

Freeze the current tracked development cohorts first:

```bash
npm run research:freeze-response-guided-contrasts -- \
  --base=reports/stress/technique-niches/2026-09-03/level-capability.json \
  --out=tmp/response-guided-contrast-population.json
```

The freezer records the exact A-only/B-only/both identities plus the source file SHA-256. The historical September 1 analysis remains provenance for the original nominations; new executable development work uses the tracked September 3 capability map unless an older artifact is supplied explicitly.

Then run the first no-search response analysis:

```bash
npm run research:response-guided-parity -- --out=tmp/response-guided-parity-contrast.json
```

It normalizes raw levels through the solver boundary and compares portal-pair phase structure and gate parity demand across the prespecified technique-discordance cohorts.

The second no-search probe is transformation-aware geometry:

```bash
npm run research:response-guided-orientation -- --out=tmp/response-guided-orientation-contrast.json
```

Its signed Gate→Goal side balances/moments obey a tested reflection law and target the large CW/CCW discordance that count features fail to explain. Both outputs remain outcome-selected development evidence and can only nominate Stage-0 premises.

The width-inversion nomination has a bounded consumer-oracle tool, but no default population:

```bash
npm run research:paired-beam-width-frontier -- \
  --levels=<frozen outcome-selected contrast IDs> \
  --profile=objectiveFirst --widths=2000,5000 \
  --depth-fraction=0.2 --out=tmp/paired-width-frontier.json
```

It compares exact prefix support per gate at one phase checkpoint and persists only bounded examples. Frontier membership is not feasibility or production evidence.

The first nominations are recorded in [the 2026-09-21 report](../reports/2026-09-21-response-guided-premise-nominations-001.md).

## Rebirth rule

A negative result should be offered three exits before archival:
1. **different consumer:** proof weak, response useful or vice versa;
2. **different representation:** tested form failed but a materially different exact projection survives;
3. **different contrast:** the premise explains another decision seam better than the original one.

Only after those are explicitly considered should the semantic premise be treated as dormant.
