# Response-guided premise nominations from existing technique discordance

> **Status:** active
> **Last evidence:** 2026-09-21 — preserved technique contrast populations plus shared static parity/portal feature owner
> **Decision:** retain three response-guided premise nominations; no routing or production change is licensed
> **Remaining gate:** run the parity/portal and transformation-aware orientation contrasts on the frozen prespecified pairs, then apply Stage-0 theorem/novelty gates to surviving signals
> **Evidence role:** discovery
> **Selection:** observational; A-only/B-only cohorts are selected on technique outcomes within prespecified technique pairs
> **Population identity:** `reports/stress/technique-niches/2026-09-01/level-capability.json` with its embedded source identities
> **Selection history:** frozen T1 technique-census outcomes joined to legal static descriptors; this report reinterprets retained contrasts after seeing those outcomes
> **Inference scope:** offline premise nomination only; not confirmation and not runtime routing evidence
> **Proposal provenance:** response-guided reinterpretation of existing technique discordance after the parity/exact-projection audit
> **Method:** [response-guided capability invention](../docs/solver-response-guided-capability-invention.md).
> **Source evidence:** [2026-09-01 technique relative-advantage follow-up](2026-09-01-technique-relative-advantage-followup.md).
> **Compute:** no new solver search.

## Question

Which existing technique-response disagreements are strong enough to justify searching for a small exact current-input explanation, and what is the cheapest falsifier for each?

## Nomination 1 — portal-heavy diverse-beam advantage

Two independently prespecified wide-beam comparisons show the same directional coarse signal:

- objective scoring: diverse-only wins are much more portal-heavy than plain-only wins;
- intersection-harvest scoring: the same portal-heavy direction recurs.

This cross-score recurrence is more interesting than either comparison alone.

### What not to conclude

Do not route on portal count. Portal count may proxy for endpoint geometry, phase, region transfer, or another correlated burden.

### Exact-premise search

First candidates:
1. twist-vs-same-parity portal structure and required gate/goal phase;
2. portal endpoints relative to small cuts/regions;
3. whether portals expand or collapse scarce region/interface capacity;
4. small product projections such as parity phase × portal-crossing cut side.

### Cheapest falsifier

Reuse the now-retained plain-only/diverse-only contrast IDs. Derive a compact **current-input portal-structure basis** from one shared owner and ask whether it separates the two directions beyond raw portal count and existing generic descriptors.

Stop if the richer exact basis adds no stable distinction. If it does, run Stage-0 theorem/novelty work before any routing experiment.

## Nomination 2 — CW/CCW orientation disagreement

Both perimeter beam and perimeter DFS show large left/right disagreement populations while current count/density descriptors barely separate them.

This is a high-value **representation gap**: the response signal exists, but the current static vocabulary largely cannot see it.

### Exact-premise search

Prefer geometry with transformation semantics rather than adding arbitrary coordinate features:

1. Gate→Goal orientation relative to obstacle/obligation asymmetry;
2. reflection/rotation symmetry class and symmetry-breaking landmarks;
3. signed side-of-path / side-of-cut distributions for required objects;
4. planar separation or region-order constraints that transform predictably under reflection;
5. exact automorphisms as a negative control: on truly symmetric levels, direction should not gain semantic information from static geometry alone.

### Cheapest falsifier

Implemented as a no-search specialist probe. `research:response-guided-orientation` derives signed Gate→Goal side balances and signed/absolute moments for blocks, required objects, portal terminals, flippers and their constrained union. Synthetic metamorphic coverage requires signed features to reverse under horizontal reflection while absolute moments remain unchanged.

Run it on the frozen contrast IDs. If orientation remains unexplained, selected operational traces are more valuable than more count features.

## Nomination 3 — non-monotonic 2K/5K beam width

Both objective and intersection-harvest comparisons contain real narrower-beam-only wins. In the objective pair, the 2K-only cohort is not merely smaller/easier; it skews larger in area.

This argues against treating beam width as monotonic capability.

### Exact-premise search

The likely missing object is not a level category but a **retention relation**:

1. one-way state dominance or lack thereof;
2. viable-regime coverage lost by the wider beam through ranking/displacement;
3. bounded future-option containment;
4. interaction between width and diversity/score-induced survivor composition.

### Cheapest falsifier

The retained evidence does **not** currently contain a paired 2K/5K candidate-decision population on these inversion levels. D1 has rich 5K cutoff evidence and the generic frontier sampler is width-specific, but neither can honestly reconstruct this contrast after the fact.

A bounded consumer oracle is now implemented as `research:paired-beam-width-frontier`. On explicit frozen inversion IDs it runs both widths per gate at the same scoring profile and phase checkpoint, compares exact prefix identities, and reports shared/2K-only/5K-only support plus bounded examples.

First gate:
- if every 2K frontier is contained in 5K, simple state-support displacement is not the explanation at that checkpoint;
- if support is materially non-nested, freeze a bounded set of exclusive prefixes and only then test dominance/feasibility/regime explanations.

Frontier membership itself is not viability. Do not build another beam-width treatment until an explanatory decision seam is observed.

## Cross-cutting opportunity — product projections

The contrast evidence suggests that single descriptors may be insufficient. Permit tiny exact products only when a specific contrast demands them and each component has an exact law.

Most promising first products:
- parity phase × cut/region side for portal-heavy contrasts;
- region/interface capacity × obligation-support pressure;
- symmetry class × signed Gate/Goal/landmark geometry for direction contrasts.

Require a novelty witness beyond each component independently.

## Cross-cutting opportunity — response/proof dual disposition

Every premise nominated here should receive two dispositions:
- **proof value:** does it prove sound deadness/bounds/dominance?
- **response value:** does it explain differentiated solver behavior?

A negative prune result must not silently kill a useful response signal, and an observational response signal never licenses a hard rule.

## Implementation consequence

The existing relative-advantage analyzer must preserve the actual contrast identities, not only counts/effect summaries. That change is part of this branch and turns the old analysis into a reusable premise-nomination input.

The next code should **not** be a selector. It should be the smallest shared current-input feature owner required by whichever first Stage-0 audit survives: portal/parity structure for nomination 1, or transformation-aware geometry for nomination 2.

## Reproduction

```bash
npm run research:response-guided-parity -- --out=tmp/response-guided-parity-contrast.json
npm run research:response-guided-orientation -- --out=tmp/response-guided-orientation-contrast.json
# Width oracle intentionally requires explicit frozen --levels; see Nomination 3.
```

This command performs normalization and static feature analysis only; it runs no solver search.
