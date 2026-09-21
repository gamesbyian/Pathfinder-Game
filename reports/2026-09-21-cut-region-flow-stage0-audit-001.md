# Cut / region-flow Stage-0 audit: bridge-excursion theorem

> **Status:** active
> **Last evidence:** 2026-09-21 — preregistered 24-parent Stage-B frontier incidence: BC1 conflicts on 22/24 connectivity-passing parents
> **Decision:** BC1 clears the incidence gate and earns a production-inert observer/consumer study; no production prune or general k-cut/flow machinery is authorized
> **Remaining gate:** run reference/valid-path safety differential plus production-inert cost/work-saved measurement, preserving parent-level independence and capturing later disposition overlap
> **Evidence role:** development
> **Selection:** theorem audit nominated by the parity/exact-projection program; no solver outcomes used to select a threshold
> **Inference scope:** soundness/novelty of one necessary condition only; no production prune is authorized
> **Owner:** `WS2-CUT-BALANCE-PROJECTION`
> **Method:** [small exact projections](../docs/solver-small-exact-projections-program.md)

## 1. Existing machinery and novelty boundary

Current `isConnected()` builds a deliberately generous future-reachability graph:

- the current position is seeded unconditionally;
- static blocked cells, visit budget, used flippers, reserved must-cross semantics and axis exhaustion constrain passability;
- cardinal adjacency between passable cells is treated as reachable;
- portal pairs add non-local reachability edges;
- dynamic turn/filter details are not all represented, so the graph remains an over-approximation;
- after the flood, current production asks whether goal and pending must-pass/must-cross cells are reachable and whether total fresh volume is sufficient.

That answers **individual reachability + volume**, not whether one continuous path can visit a reachable region and still leave it.

Lane A C0-C2 tested a recurring compact separator/interface representation and closed representation-explosive. The theorem below is different: its cut and sides may be unique to one state; only the derivation procedure must generalize.

## 2. Exact transition facts

Pathfinder gives two relevant single-use transition resources:

1. **Ordinary cardinal edge.** Traversal spends the corresponding axis bit at both endpoints. A later reverse traversal would enter a target whose same axis is already used, so the same geometric edge cannot be traversed twice.
2. **Portal pair.** Each portal terminal can be visited only once. A portal-pair jump therefore cannot be used out-and-back.

A connectivity graph edge may be an over-approximation of an actually legal transition. That is safe for this theorem: adding impossible edges can hide a bridge, but cannot create a bridge that is absent from the more restrictive actual graph *provided distinct transition resources are preserved as distinct multiedges*.

### Multigraph requirement

Do not collapse edges solely by endpoint pair.

If two adjacent cells are also paired portal terminals, the cardinal adjacency and portal jump are two distinct transition resources. They are parallel multiedges. Neither alone is a bridge. Treating them as one simple edge could falsely prove a one-interface excursion impossible.

## 3. Theorem BC1 — bridge excursion impossibility

Let `G` be an undirected multigraph that over-approximates possible future side-to-side transitions from the current state. Every edge of `G` represents one transition resource that cannot be used twice by a valid future path.

Let:
- `p` = current path head;
- `g` = goal;
- `O` = outstanding mandatory-visit cells, initially pending must-pass and pending must-cross cells.

For any bridge edge `e` of `G`, remove `e` and let `A` be the component containing `p`.

If:
1. `g ∈ A`, and
2. some `o ∈ O` lies outside `A`,

then no valid completion exists.

### Proof

Any suffix from `p` to `g` that visits `o` must:
1. leave `A` through `e`, because `e` is the only transition resource connecting the two components;
2. later return to `A` through `e`, because `g ∈ A`.

That uses the same single-use transition resource twice, contradicting Pathfinder move semantics.

The result remains sound if `G` over-approximates real transitions. A bridge surviving an edge-supergraph is also unavoidable in any actual path that reaches the far component.

## 4. Smallest novelty witness

Construct a reachable pocket attached to the current/goal side by one ordinary bridge edge:

- current head outside pocket;
- goal outside pocket;
- one outstanding must-pass inside pocket;
- enough total reachable fresh cells and remaining length that volume passes;
- no portal or second interface.

The connectivity flood reaches both goal and must-pass and can pass volume. BC1 rejects because visiting the pocket requires crossing the bridge out and back.

This is the smallest intended discriminator against ordinary reachability.

### Redundancy witnesses

BC1 must **not** reject:

- current outside, goal inside, one bridge: only one bridge traversal is required;
- current/goal outside, required pocket has two independent transition resources;
- a nominal single endpoint pair with both a cardinal edge and a portal multiedge.

## 5. Mechanic perturbation matrix

| Mechanic/state fact | Effect on BC1 |
|---|---|
| ordinary intersections | preserve theorem; they never permit reuse of the same cardinal edge-axis |
| must-pass | pending cell is a mandatory-visit target |
| must-cross | pending second visit makes the cell a mandatory-visit target |
| portals | preserve theorem if each portal jump is a distinct multiedge and parallel ordinary/portal edges are not collapsed |
| used portal terminal | actual graph may lose an edge; leaving it in the over-approx can only hide BC1 opportunities |
| filters/flippers | ignoring additional dynamic restrictions adds edges/possibilities; safe but weaker |
| blocks/geese/gates | current connectivity graph already treats them conservatively |
| surround | ignored in first demand set; lower bound becomes weaker, not unsound |
| must-turn/adjacent-turn | ignored in first demand set; weaker only |
| exact length/intersections | ignored by BC1 except insofar as existing connectivity constructs passability; can only supply later strengthening |
| multiple gates | state-local theorem starts after a gate is selected; whole-level use would require per-gate evaluation |

## 6. General cut law retained but not yet implemented

BC1 is the capacity-1 special case of a broader necessary condition.

For any binary region cut:
- future side-transition parity is fixed by current-side XOR goal-side;
- if current and goal are on the same side and a pending mandatory visit lies on the other, at least two future side transitions are required;
- more generally compare a lower bound on required transitions with a generous upper bound on still-available ordinary + portal transition resources.

Do **not** build general min-cut/flow machinery yet. The bridge form is cheaper to falsify and has a direct connectivity novelty witness.

## 7. Cheapest evidence plan

### Stage A — pure theorem tests — **IMPLEMENTED**

`scripts/stress/cut-bridge-excursion-lib.mjs` owns the specialist theorem helper; its Node test covers:

- bridge-pocket positive;
- goal-across-bridge non-reject;
- two-interface cycle non-reject;
- parallel cardinal + portal multiedge non-reject;
- multiple pending objectives / multiple bridges;
- edge-order invariance.

### Stage B — sampled production-state incidence — **EXECUTED; POSITIVE INCIDENCE**

`scripts/stress/cut-bridge-incidence.mjs` now:
1. replays already-frozen production-frontier prefixes through canonical solver state semantics;
2. obtains the real connectivity reached multigraph through `connectivityResearchSnapshot()`;
3. applies BC1 only where ordinary connectivity/volume passes;
4. reports row incidence and parent-level recurrence separately.

The bundled test covers the smallest connectivity-passing bridge-pocket witness and a no-obligation non-reject.

Do not run Tarjan on every hot-path connectivity call yet. The frozen development screen below has now shown non-trivial recurrence, which earns a production-inert observer/consumer study but does not authorize hot-path evaluation.

#### Prespecified first Stage-B population

Use a small outcome-blind Corpus 2 development screen:

- parent source: `data/stress/stress-levels-random.json`;
- selection: uniform deterministic sample, **24 parents**;
- seed: `ws2-cut-balance-bc1-stageb-v1`;
- independent unit: parent level;
- frontier profile: `intersectionHarvest`;
- width: 5000;
- depth fraction: 0.20;
- picks: 12 distinct frontier states per sampled parent;
- downstream BC1 denominator: only sampled states where existing connectivity passes.

The sample size is a recurrence screen, not a prevalence estimate. Zero or near-zero parent recurrence would have closed BC1 as a near-term prune candidate on this population; material recurrence earns the next production-inert safety/economics study.

Reproduction sequence:

```bash
npm run stress:select-random-sample -- \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=24 --seed=ws2-cut-balance-bc1-stageb-v1 \
  --out=tmp/bc1-stageb-parents.json

BC1_IDS=$(node -e "const fs=require('fs');const r=JSON.parse(fs.readFileSync('tmp/bc1-stageb-parents.json'));process.stdout.write(r.map(x=>x.levelId).join(','))")

node scripts/run-bundled.mjs scripts/stress/production-search-frontier-sampler.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels="$BC1_IDS" \
  --depth-fraction=0.20 --picks=12 --seed=ws2-cut-balance-bc1-stageb-v1 \
  --profile=intersectionHarvest --width=5000 \
  --question=WS2-CUT-BALANCE-PROJECTION --evidence-role=development \
  --population-out=tmp/bc1-stageb-frontier.json

npm run research:cut-bridge-incidence -- \
  --population=tmp/bc1-stageb-frontier.json \
  --corpus=data/stress/stress-levels-random.json \
  --out=tmp/bc1-stageb-incidence.json
```

#### Stage-B result

The preregistered screen completed on the frozen population:

- sampled rows: **288** across **24** parents;
- existing connectivity/volume passed: **263** rows across **24** parents;
- BC1 conflicts: **105** rows across **22** parents;
- row incidence among connectivity-passing states: **39.9%**;
- parent recurrence among connectivity-passing parents: **91.7%** (22/24);
- only `R00786` and `R02902` had zero BC1 conflict among their sampled connectivity-passing states.

This is far above the preregistered "non-trivial recurrence" gate. BC1 therefore survives as a hard-prune candidate and earns the smallest production-inert consumer study. It still has **no production authorization**: the theorem implementation must next be checked against valid/reference continuations and its construction cost must be charged against saved search work.

The frozen frontier artifact contains sampled prefixes and connectivity/BC1 measurements, but no later solver-outcome or later-rejection labels. Therefore this screen cannot measure overlap with subsequent failure evidence without a new, explicitly outcome-joined observation contract. The earned observer study should capture that overlap prospectively; no after-the-fact outcome join is inferred here.

## 8. Consumer boundary

If BC1 recurs:

1. first consumer candidate is a hard prune because the theorem is exact;
2. before promotion require valid-path/reference differential and zero false rejects;
3. measure construction cost versus work saved;
4. only then consider generalizing to k-cut capacity, region flow, or softer pressure features.

If BC1 incidence is negligible, retain cut/flow **response value** as separately testable; do not automatically build wider cut machinery.

## 9. Stage-0 disposition

**Advance BC1 only. Stage A soundness and Stage-B incidence are positive; the next step is a production-inert safety/economics consumer, not a hot-path prune.**

The audit found:
- a precise theorem;
- a smallest novelty witness against connectivity;
- a critical multigraph counterexample to a naive implementation;
- a mechanic-complete safe direction through over-approximation;
- a bounded sampled-state incidence plan;
- a strong positive Stage-B incidence result (22/24 parents, 105/263 eligible states).

General cut capacity, Hall coupling and product projections remain sibling premises, not descendants automatically licensed by BC1.
