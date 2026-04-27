# Prompt for AI Researcher (Follow-up to `techmemo.txt`)

You are an independent AI research analyst.

Please produce a **new research memo** that expands beyond prior solver recommendations and addresses additional high-value directions. Assume you do **not** have access to source code repositories, commit history, audit logs, internal dashboards, or prior reports. Work only from this request.

## Background context (self-contained)

A pathfinding-style puzzle solver repeatedly fails on a small set of hard levels despite many iterations of instrumentation, heuristic tuning, rescue logic changes, and occasional larger refactors.

Observed persistent patterns:
- Some hard instances appear to be **final-mile failures**: search gets very close to valid completion many times but does not close.
- Some hard instances appear to be **heuristic plateau failures**: search expands many states but does not meaningfully reduce key obligations.
- Attempts at broad global heuristic reweighting and large architectural changes have historically caused collateral regressions.
- There is interest in per-level or per-signature policies, stronger feasibility pruning, and better diagnostics.

Prior memo themes already explored (do not just repeat):
- Landmark-style heuristics and planning-inspired search control.
- Luby restarts, enforced hill-climbing variants, and CP-SAT-style alternatives.
- General advice on plateau handling and solver modernization.

## Your task

Deliver a **research expansion memo** that answers the questions below with evidence-based analysis, concrete recommendations, and practical experimental designs.

---

## Research Questions

### 1) Failure taxonomy and triage strategy
1. What is the best modern taxonomy for separating “final-mile closure failure” from “heuristic plateau / guidance failure” and from “over/under-pruning correctness failure” in constrained path solvers?
2. Which minimal telemetry signals are most diagnostic for each family, and which are often misleading?
3. Propose a decision tree for triaging a newly failing level into one family in under 1 day of analysis.

### 2) Final-mile conversion methods (underexplored)
1. What algorithmic techniques specifically target “near-solution flood but no completion” behavior?
2. Compare at least 4 approaches (e.g., bounded completion BFS, repair/search hybrids, exact micro-solvers, bidirectional closure, conflict-directed completion).
3. For each approach: expected win conditions, failure modes, compute profile, and integration complexity in an existing heuristic solver.

### 3) Feasibility pruning correctness and safety
1. What are the best practices for introducing stronger feasibility bounds without over-pruning valid states?
2. What counterexample-guided or proof-oriented methods can make pruning changes auditable and safer?
3. Propose a practical methodology to distinguish “bad heuristic” from “invalid prune” when both appear plausible.

### 4) Per-instance / per-signature adaptive control
1. What does current literature suggest for online algorithm selection (or policy selection) in combinatorial search under tight runtime budgets?
2. Recommend practical, low-risk mechanisms to choose search policy by instance signature (not by global static tuning).
3. Include suggestions for avoiding overfitting to a tiny hard set.

### 5) Alternatives to monolithic heuristic search
1. Evaluate promising hybrid architectures that combine a fast heuristic explorer with a small exact or constraint-based closer.
2. Include tradeoffs for browser/client deployment vs. offline precompute vs. service-based solving.
3. Identify one “minimal viable hybrid” architecture that could be piloted in <2 weeks.

### 6) Experimental methodology and evidence standards
1. Propose an ablation/evaluation protocol suitable for heavy-tailed runtime distributions.
2. What statistical practices are most appropriate for solver comparisons on small benchmark sets?
3. Define “ship criteria” for changes meant to fix persistent failures while protecting broad-level stability.

### 7) Negative results and anti-patterns
1. From literature and solver engineering practice, what are the most common anti-patterns that create repeated regressions?
2. What warning signs suggest a team is optimizing metrics that do not correlate with real solve success?
3. Provide a concise “do-not-repeat” checklist.

### 8) Novel ideas likely not yet tried
Suggest 5–10 concrete, less-common approaches worth testing (not just mainstream A*/beam/CP-SAT variants), with:
- Why they may fit this failure profile.
- Risk level and implementation cost.
- A fast falsification test for each (so weak ideas can be killed quickly).

---

## Deliverable format

Please output in this structure:

1. **Executive summary (1 page max)**
2. **Failure taxonomy and diagnostic decision tree**
3. **Ranked intervention portfolio** (short-term, medium-term, high-risk/high-reward)
4. **Experiment plan (2-week and 6-week tracks)**
5. **Anti-patterns and guardrails**
6. **Top open questions requiring further research**
7. **Annotated bibliography** (primary sources only where possible)

## Evidence quality requirements

- Prioritize primary sources: peer-reviewed papers, official solver docs, and well-known benchmark reports.
- Clearly mark any inference that is not directly established by sources.
- Distinguish mature evidence from speculative ideas.
- Include publication years and brief relevance notes.

## Output constraints

- Be specific and operational, not generic.
- Avoid assuming access to proprietary telemetry or code.
- Include at least one concrete recommendation that is feasible with only lightweight instrumentation.
- Include at least one recommendation that is robust even if previous telemetry quality was poor.
