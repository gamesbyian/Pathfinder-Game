<!-- agent-context-budget: warn=13000 max=15500 -->
# Solver research level generation

> **Status:** current front door for choosing and composing full-level generation sources.
> **Priority:** `solver-optimization-workstreams.md` owns what to investigate.
> **Whether to generate:** run `research:acquisition-preflight` first for decision-bearing work.
> **Evidence semantics:** `solver-evaluation-evidence.md` and `solver-research-resource-contract.md`.
> **Families:** `variant-level-research.md`; family descendants are a transformation layer, not an independent parent generator.

Pathfinder has three valid-by-construction full-level generators. They intentionally represent different acquisition regimes. Keep their algorithms separate while exposing one research-facing control surface.

## Front door

```bash
npm run research:generate-levels -- --list
npm run research:generate-levels -- --method=random --count=40 --master-seed=123
npm run research:generate-levels -- --suite=transfer-pair --count=40 --master-seed=123 \
  --question-id=<id> --evidence-role=confirmation
npm run research:generate-levels -- --suite=triangulation --count=30 --master-seed=123 --dry-run
npm run research:generate-levels -- --hybrids
```

The dispatcher does not implement generation. It calls the existing producers, preserves their native contracts, and writes a coordination manifest. Multi-source execution always writes separate corpus artifacts and separate frozen research blocks. It never pools them into one evidence identity.

For a decision-bearing question, prefer:

```text
queue/status/assets
 -> research:acquisition-preflight
 -> research:generate-levels only if generation is earned
 -> freeze source blocks
 -> outcome-blind selection/measurement
 -> solver/exact/treatment outcomes
```

## Source regimes

| Method | Construction | Best use | Important boundary |
|---|---|---|---|
| `targeted` | hypothesis-driven witness-first, existing `stress:generate` | development acquisition where a structural hypothesis needs deliberate pressure | uses solver-informed/audit-informed challenge shaping; not unbiased prevalence evidence |
| `random` | solver-blind random witness-first, existing `stress:generate-random` | fresh confirmation blocks, broad solver-blind acquisition | sample-independent seeds are not distributionally independent from other witness-first construction |
| `topology` | solver-blind topology composition, existing `stress:generate-topology` | cross-construction transfer/challenge and topology-sensitive acquisition | narrower mechanic support; absence of unsupported mechanics is not negative evidence |

The targeted and random generators have different selection philosophies but share the broad witness-first construction family. The topology generator creates a macro topology before compiling a Pathfinder witness and is the current procedural cross-construction source.

Each underlying generator remains directly callable. Its own CLI is the authority for method-specific options.

## Multi-source suites

The dispatcher exposes named suites because some experiments need coordinated acquisition without collapsing source semantics.

- `transfer-pair`: random + topology. Use when a fixed candidate needs solver-blind same-family confirmation plus a materially different procedural challenge source. With a question ID and no explicit suite-wide role override, random defaults to `confirmation` and topology to `transfer`.
- `witness-contrast`: targeted + random. Use to test whether an effect depends on hypothesis-driven shaping while retaining witness-first construction.
- `triangulation`: targeted + random + topology. Use for development questions where construction dependence itself is informative.

A suite is a coordination convenience, not a statistical pooling rule. Report source-specific effects first. Any combined estimate must explicitly justify its weighting and independence assumptions. `--evidence-role=<role>` explicitly overrides all suite defaults when a campaign intentionally assigns the same role to every source.

The dispatcher offsets the supplied master seed by source position so a suite does not reuse an identical numeric seed as if it implied semantic coupling across different generators.

## Normalized count semantics

`--count=N` means requested independent parents **per method**. Default outputs are namespaced under the question/suite and master seed. The front door refuses to replace an existing output or run manifest unless `--overwrite` is explicit, and `--overwrite` is forbidden for question-bound frozen generation. Random's legacy mutable `--append` operation remains available only through the direct `stress:generate-random` producer.

The random and topology producers emit exactly N parents. The targeted producer emits six fixed hypothesis batches, so its native unit is `--count-per-batch`. The dispatcher rounds upward to the nearest multiple of six unless `--targeted-count-per-batch` is supplied. The dry-run plan records both requested and planned parent counts.

This normalization exists only at the dispatcher. Direct producer invocations keep native semantics.

## Matched cross-construction cohorts

Use:

```bash
npm run research:match-generation -- \
  --source=random=tmp/.../random.json \
  --source=topology=tmp/.../topology.json \
  --count=25 --max-distance=0.18 \
  --out=tmp/.../matched.json
```

The matcher performs deterministic nearest-neighbor matching without replacement using only prespecified static puzzle descriptors:

- area;
- required length/intersections/coverage ratio;
- gate/block/object/mechanic counts.

It deliberately does **not** read solver outcomes, exact labels, historical difficulty, technique wins, or research conclusions. By default it also excludes witness-shape descriptors so construction history is not matched away when the purpose is to ask whether ordinary static descriptors explain a cross-source difference.

The output is a **selection artifact**, not a corpus. It references parent IDs, source artifacts, and source block identities; source blocks stay authoritative. Matching adds selection provenance and does not create new independent units.

When matched membership becomes decision-bearing, record it against each source block with `research:record-consumption -- --block-artifact=<source> --question-id=<id> --selection-artifact=<matched.json> --selection-source=<name> --out=tmp/research-blocks/<id>/<name>-match.json`. The sidecar derives parent scopes/conditioning without mutating blocks or evidence roles.

Use a caliper (`--max-distance`) when a scientific claim requires genuinely close static analogues. If the matcher cannot form enough groups under the prespecified caliper, report acquisition/matching starvation rather than relaxing the threshold after seeing solver outcomes.

### What matched cohorts can diagnose

A treatment that differs between source regimes after ordinary static descriptors are closely matched suggests at least one of:

- an unmeasured structural variable;
- witness/topology geometry absent from the matching vocabulary;
- construction-specific mechanic relationships;
- source-dependent search exposure.

That is a premise nomination, not proof of which latent variable matters. Follow with family/reducer/trace/exact work.

If source dependence disappears after matching, the original difference was plausibly explained by the matched descriptor mix. Do not infer causal sufficiency from one matched sample.

## Hybrid research patterns

### Broad parents -> family microscope

This is the default hybrid.

1. acquire independent parents from one or more justified source regimes;
2. freeze the parent block before decision-bearing outcomes;
3. nominate parents using the prespecified observable/selection rule;
4. run `family:generate` only on parents where a controlled transformation can discriminate the mechanism;
5. analyze descendants grouped by parent family.

Generated siblings do not create new independent support. A family can tell you *what changes the behavior* much better than *how prevalent the behavior is*.

### Matched cross-construction transfer

Generate two or more source blocks, freeze them, match without outcomes, then run the same treatment/procedure on every source. This is useful when a result may merely reflect the generator's geometry distribution.

Prefer random + topology for a clean procedural construction contrast. Add targeted material during development when it can stress the mechanism, but do not call targeted-vs-random a distributionally independent transfer test.

### Counterfactual regeneration

When a development failure nominates a structural hypothesis:

1. state the structural hypothesis without level IDs or solver outcomes as acceptance criteria;
2. encode the structural opportunity independently in multiple generators where possible;
3. freeze generated parents before solver evaluation;
4. compare whether the nominated mechanism recurs.

This tests whether the phenomenon belongs to the proposed structure or to incidental ancestry of the original level.

Do not accept/reject new parents because the production solver reproduces the desired failure. An adversarial outcome-filtered campaign can be valid development evidence, but it must be labelled as such and cannot later serve as untouched confirmation/transfer.

### Sequential construction

A future generator extension may deliberately hand constraints between construction stages, for example topology first and witness/path burden second. Treat that as a **new source regime/version**, because the joint construction process is scientifically distinct. Do not silently add targeted post-filtering to `topology` and continue calling the result untouched topology transfer.

The common dispatcher is intentionally thin enough that a genuinely new producer can be registered without turning all generators into one implementation.

## Generator recognizability as a diagnostic

Use:

```bash
npm run research:audit-generation-origin -- \
  --source=random=tmp/.../random.json \
  --source=topology=tmp/.../topology.json \
  --folds=5 --out=tmp/.../origin-audit.json
```

A useful development analysis is to ask whether static descriptors can predict which generator produced a level. High recognizability identifies dimensions on which source populations differ. Low-recognizability rows are good candidates for matched cross-source comparison.

This is an offline research diagnostic only. Generator/source identity is forbidden as cold production steering and must never become a runtime solver feature.

If recognizability remains high after the default matcher dimensions, inspect which additional structural descriptors explain it. If solver behavior remains source-dependent after those descriptors are controlled, that is evidence the representation map is missing something worth investigating.

## Family integration

`family-generate.mjs` remains the single mutation engine. Do not add family operators to the full-level dispatcher.

A generated parent from PR-1872-era producers can carry a frozen `researchBlock`. Family generation preserves originating block ancestry and records the parent family as the independent unit. That is the intended seam:

```text
source generator
 -> frozen independent parent block
 -> selected parent
 -> family-generate controlled descendants
 -> treatment/exact/trace analysis grouped by parent
```

For human/editor parents, use the dedicated human-parent contrast front door when its question/exposure contract applies.

## Adding a new full-level generator

A fourth generator should be registered in `research-level-generation-lib.mjs` only after its own producer is independently sound. It must have:

1. schema + structural + canonical-referee validation;
2. explicit source regime/version/config;
3. parent identity and generation provenance;
4. optional frozen-block emission through the shared block-lineage contract for decision-bearing runs;
5. a documented mechanic/topology support envelope;
6. a statement of which existing construction family it is or is not distributionally independent from;
7. no production-solver outcome acceptance unless the source is explicitly an adversarial development regime.

The dispatcher is not a reason to normalize away scientifically meaningful differences in producer flags or defaults.

## Reporting rules

For any generation-backed result report:

- source regime(s) and revision(s);
- question/evidence role/block IDs;
- requested and actual independent parent counts;
- construction relation: same-family vs cross-construction;
- selection/matching procedure and caliper when used;
- family descendant counts separately from independent parent counts;
- unsupported mechanic/topology boundaries;
- whether any solver/exact outcome influenced generation or selection.

The run manifest and matched-selection artifact are provenance aids. The source corpus/block and experiment outputs remain authoritative.
