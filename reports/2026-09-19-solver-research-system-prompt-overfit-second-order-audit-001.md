# Solver research-system prompt-overfit and second-order audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — current `main`, PR #1921 plan, agent-routing authorities, and production-promotion history
> **Decision:** refine the consolidation plan around two seams that the original audit framing and the pre-existing plan both underweighted: research-to-production conversion fidelity, and framing/context independence in an agent-heavy research system.
> **Remaining gate:** implement the bounded pilots already added to the plan; no separate follow-on plan is warranted.
> **Evidence role:** forensic / architecture audit
> **Selection:** targeted contradiction hunt after the independent audit and PR reconciliation were complete
> **Population identity:** current repository authorities and selected concrete historical implementation/research failures on 2026-09-19
> **Selection history:** this audit deliberately starts from the already-reconciled plan and asks what the original prompt and the plan jointly made hard to notice
> **Inference scope:** plan completeness and research-system architecture; not a claim that these are the only remaining blind spots

## Why another pass was warranted

The original audit prompt was intentionally broad and hostile, but it was not neutral. It named many sophisticated lenses in advance: semantic interoperability, scientific memory, multidimensional independence, negative-space exploration, ontology escape, answerability, reverse invalidation, target semantics, option value and related concepts.

That was useful. It also meant that an independent agent could remain formally blind to PR #1921 while still being strongly primed toward the same conceptual territory the plan already occupied.

The independence rule protected against copying the plan. It did **not** protect against prompt-level conceptual overfit.

The second-order question was therefore:

> What became unusually easy to notice because both the prompt and the plan framed the problem as research-system epistemology, and what important seams became comparatively easy to underweight?

## How I would have started differently with the plan visible

If the current plan had been visible from the beginning, I would not have begun by generating another broad taxonomy of scientific weaknesses. The plan already had substantial coverage there.

I would have started with a **contradiction hunt**:

1. find cases where correct or careful research still failed to produce the intended solver behavior;
2. find cases where nominally independent inquiry could share the same framing despite different agents/models;
3. inspect the boundaries immediately before and after the plan's best-developed concepts rather than expanding those concepts;
4. prefer concrete repo failures that do not fit the plan's current causal story over additional abstract completeness arguments.

That approach produced two material additions.

## Finding 1 — the plan under-specified knowledge-to-behavior conversion

The plan was strong on:

`design -> execution -> analysis -> evidence -> claim -> decision`

and on treatment fidelity **inside** an experiment.

The repository contains a distinct later failure mode.

The Class-4 portal coarse-state dead-last-retry line earned promotion with matched-work evidence. During implementation, however, the real production callers omitted the `ablation` object while the newly promoted code read `cfg?.FLAG === true`. Without a caller-shaped correction, the nominal default-on promotion would have been inert in the live product path.

The science could be right.
The promotion decision could be right.
The code could contain the treatment.
The ledger could say default-on.
And production could still fail to realize the behavior.

That is not ordinary contrast fidelity or provenance. It is a **conversion-fidelity** problem after the scientific decision.

### Plan change

The plan now adds Phase 8.7, which distinguishes:

- decision intent;
- implementation realization;
- production reachability;
- behavioral participation;
- envelope fidelity;
- post-realization qualification.

It also extends the end-to-end chain through implementation realization and observed production behavior, adds a bounded Stage-B/first-tranche production-realization trace, and adds a corresponding success criterion.

The change explicitly avoids demanding a new full-corpus experiment for every wiring/default edit. Evidence intensity still scales with semantic distance from the tested treatment.

## Finding 2 — “independent agent/model” is not enough in this repository

Pathfinder's canonical agent entry point is intentionally opinionated. `AGENTS.md` routes solver optimization/research through the current workstream authority first and then the operating model/specialist material. Recent solver-research commits also show that coding/research agents are not incidental helpers; they are major executors of the research program.

That makes agent context part of the research instrument.

Two different models reading:

- the same queue,
- the same premise vocabulary,
- the same plan,
- the same compact briefing,
- and the same task framing

can reproduce the same blind spot while appearing “independent” at the analyst/model layer.

Conversely, the same model under a materially different frozen source bundle can provide useful framing/context independence.

The plan already had analyst/model independence and controlled non-exposure, but it did not make this distinction explicit enough.

### Plan change

The independence vector now separates:

- analyst/model independence;
- task-framing/prompt independence;
- authority/context-exposure independence.

Phase 21 now states that, for high-leverage independent inquiry, the relevant exposure differences should be frozen and interpretable. It does **not** require archiving every prompt or creating an agent-performance registry.

The plan also recognizes the ordinary agent router itself as research architecture: major changes to mandatory context/order can alter what agents notice first and may deserve a bounded observer-effect check when decision-relevant.

## What did not earn another expansion

This pass did **not** earn:

- a new research-agent registry;
- prompt scoring;
- a second research queue;
- universal deployment manifests;
- automatic post-promotion full-corpus reruns;
- another ontology of “conversion states”;
- another broad negative-space phase.

The current plan is already large. The right standard is not whether another intellectually defensible concept can be added, but whether a concrete repo failure exposes a missing boundary that changes implementation practice.

## Bottom line

The original prompt succeeded at forcing wide epistemic coverage, but it partially overfit the same conceptual neighborhood as the plan it was meant to challenge. The most useful correction was to inspect the **outside edges** of that neighborhood.

The plan now better covers the full objective:

`question -> evidence -> claim -> decision -> implementation -> real production behavior -> new evidence`

and it better distinguishes genuine independent inquiry from several agents walking through the same conceptual doorway.
