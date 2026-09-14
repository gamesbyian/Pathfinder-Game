<!-- agent-context-budget: warn=7000 max=10000 -->
# Solver research inference-audit framework

> **Status:** governing first-principles frame for the next research-resource audit program.
> **Purpose:** keep the audit program centered on whether Pathfinder turns imperfect observations into good solve-directed research decisions, rather than treating resource cleanliness as an end in itself.
> **Companions:** [`solver-research-resource-next-audit-plans.md`](solver-research-resource-next-audit-plans.md), [`solver-research-resource-audit-implementation-blueprints.md`](solver-research-resource-audit-implementation-blueprints.md), [`solver-research-resource-contract.md`](solver-research-resource-contract.md), [`solver-research-operating-model.md`](solver-research-operating-model.md).
> **Priority authority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) remains the sole current execution-priority authority.

## First principle

The research system exists to choose the next solver intervention with the highest credible chance of producing additional solves.

A research resource matters only because it participates in an inference chain:

`world / solver behavior -> observation -> stored evidence -> derived interpretation -> belief / claim -> research priority -> experiment / implementation -> solver behavior -> solves`

The central audit target is therefore **inference reliability**, not resource tidiness.

A resource can be perfectly accurate internally and still contribute to a wrong research decision when:

- the relevant phenomenon was never observable under the measurement;
- the population was selected or conditioned in a way the claim ignores;
- repeated rows/reports are descendants of one causal observation rather than independent support;
- a plausible rival explanation fits the same evidence;
- an implementation-specific negative is propagated as premise failure;
- a capability is real but starved, displaced, or unreachable in production;
- an oracle-selected diagnostic is mistaken for a property of the solver or puzzle generally;
- a correct narrow conclusion is broadened as it moves into capability memory, question state, future-work prose, or the workstream queue;
- the project spends effort resolving an ambiguity that cannot change a solve-directed decision.

The next audits should therefore be understood as different lenses on Pathfinder's machinery for turning observations into decisions.

## Five first-principles tests

Every decision-bearing audit finding should answer these tests explicitly where they matter.

### 1. Decision-bearing claim

What exact belief or claim can this evidence change?

Examples:

- this treatment form improves production solves under a matched envelope;
- this premise is closed;
- this capability exists but is poorly exposed;
- this residual is primarily an allocation problem rather than acquisition;
- this diagnostic localizes failure to a particular represented boundary;
- this question is answered, superseded, constrained, or worth reopening.

Do not begin from “what fields does this resource contain?” Begin from “what decision can become wrong if we misunderstand this evidence?”

Not every resource row needs a claim trace. Concentrate on claims that affect current or likely future solver work.

### 2. Observability

Could the evidence have observed the phenomenon the claim is about?

Ask the resource-specific version, for example:

- did the treatment receive real work, or only produce an attempt record?
- did the scheduler ever reach the action under comparable predecessor state?
- did the census actually include a comparable configuration?
- did the accepted-path sample contain enough distinct basins for the diagnostic claim?
- was the population eligible for the effect being generalized?
- was a sparse/unsupported profile dimension unavailable rather than zero?
- did exact/reference evidence adjudicate the state, or did a known path merely nominate it?

A null on an unobservable phenomenon is not negative evidence for the premise.

### 3. Independence and causal ancestry

How many genuinely distinct observation chains support the claim?

Count causal ancestry, not files, rows, reports, paths, or derived summaries.

Examples:

- family replay -> accepted hint -> solution profile -> path diagnostic may be one ancestry chain;
- one experiment -> dated report -> opt-in ledger -> capability memory -> question relation is one intervention observed through several consumers;
- several paths imported from one parent-family replay can be multiple valid solutions without being multiple independent pieces of evidence for a broad discovery claim.

Dependence does not make evidence useless. It changes the weight and type of corroboration it can provide.

### 4. Rival explanations and discriminability

What materially different explanation could produce the same observation?

Do not settle for a descriptive label when the research decision depends on a causal distinction.

Recurring Pathfinder rivals include:

- capability absent **vs** capability present but unoffered/unreached/starved;
- premise false **vs** tested implementation form bad;
- search quality failure **vs** representation/retention failure;
- action quality failure **vs** predecessor-state or scheduler-order effect;
- structural puzzle phenotype **vs** oracle-selection or family-ancestry artifact;
- broad population effect **vs** residual-conditioned effect;
- true scientific negative **vs** execution/plumbing failure;
- capability valuable in isolation **vs** economically displaced under fixed aggregate work.

The audit should state which observation would distinguish the important rivals. If no retained evidence can distinguish them, the conclusion should remain correspondingly narrow.

### 5. Decision consequence / value of information

What would we do differently if the ambiguity resolved one way rather than the other?

A new check, replay, census, or bounded experiment is earned when its answer can materially change one of:

- a live or plausible future solver experiment;
- scheduler allocation or ordering;
- capability acquisition effort;
- a representation/retention investigation;
- a premise closure or reopen condition;
- a research-resource producer/consumer contract that repeatedly affects decisions.

Do not spend solver or reference compute merely to make the historical record aesthetically complete.

## The claim spine

The five planned audits should share one cross-cutting **claim spine**. This is not a new permanent truth database and not a replacement for workstreams, question relations, capability memory, the evidence registry, or dated reports.

It is an audit technique for connecting those existing authorities.

### Thin claim census

Before or during each audit, identify the small set of current or historically influential claims that the audited evidence system can materially affect.

Prioritize claims that:

- close or suppress a mechanism/premise;
- nominate substantial future work;
- classify a major residual as acquisition, exposure, allocation, search, representation, or measurement;
- are reused across several reports/workstreams;
- are remembered in compressed forms such as “we tried this,” “this is negative,” or “there is no capability here”;
- have recently been challenged by archaeology, provenance, corpus, profile, or variant work.

Do **not** attempt to enumerate every scientific sentence in the repository.

### Claim trace

For each selected claim, reconstruct enough of this chain to judge its current use:

`claim -> current decision consequence -> supporting interpretation(s) -> primary observation(s) -> population/conditioning -> producer/run/config identity -> causal ancestry`

Then trace forward:

`claim -> capability memory / question relations / future-work / scheduling policy / workstream gate / descendant experiment or treatment`

The trace may be incomplete. Mark the first unrecoverable layer rather than inventing history.

### Minimum claim record during an audit

A temporary claim ledger/report table should capture, where applicable:

- exact claim in narrow language;
- current repository surface(s) expressing it;
- current decision consequence;
- primary observation(s) and source authority;
- observability status;
- population/conditioning boundary;
- independent causal support count or dependence description;
- strongest plausible rival explanation;
- evidence that discriminates the rival, if any;
- solver/code/data regime to which the claim applies;
- downstream consumers/decisions;
- current disposition: strengthened, unchanged, narrowed, nominative-only, inconclusive, superseded, tested-form closed, premise closed, or reopen candidate;
- explicit reopen/falsifier condition where useful.

Use existing vocabulary where possible. This table is an audit artifact, not automatically a new schema.

## How the five audits change under this frame

### Audit 1: experiment evidence lifecycle

This audit becomes the primary audit of **belief formation from interventions**.

Its center is no longer “are experiments reproducible?” but:

> When an intervention causes Pathfinder to believe that a treatment helped, failed, is neutral, or closed a line of work, does the primary observation actually discriminate that conclusion from the important alternatives, and is the claim propagated no more broadly than earned?

Required claim families include:

- promoted treatment value;
- clean negative treatment value;
- tested-form closure versus premise closure;
- participation/allocation failure versus causal null;
- capability retained despite negative promotion economics;
- residual-conditioned result versus unconditional effect.

The existing row-level recomputation blueprint remains the strongest method because it attacks the observation-to-interpretation boundary directly.

### Audit 3: accepted-path/oracle evidence

This audit becomes an audit of **latent conditioning by observability of successful basins**.

Its central claim question is:

> Is the diagnostic telling us something stable about solver failure or puzzle structure, or something contingent on which successful path/basin happened to become available as the oracle?

The oracle-substitution and known-sample-composition sensitivity design remains correct, but every material finding should now state the rival explanations it separates:

- stable represented failure boundary versus path-specific boundary;
- structural ordering pressure versus selected-oracle ordering;
- production search blind spot versus replay-created observability;
- genuine independent corroboration versus several diagnostics descended from one path.

### Audit 2: capability observability and attribution

This audit becomes a direct test of the dangerous inference:

> absence of observed production success = absence of usable capability.

The capability exposure map should classify claims by the strongest supported deficit:

- no known isolated capability;
- comparable capability exists but is not offered;
- offered but unreached;
- reached but not materially participating;
- materially participating but underdosed/right-censored;
- comparable work spent and still negative;
- capability exists but fixed-work economics displace it;
- only stale/historical nomination exists;
- sequence/predecessor state prevents causal comparison;
- insufficient evidence.

The audit should avoid saying “capability absent” unless the observation system genuinely had a reasonable opportunity to reveal comparable capability.

### Audit 5: question-state propagation and attention allocation

This audit becomes the audit of **belief propagation into action** and is therefore more scientifically central than an administrative cleanup.

Its core question is:

> If the primary evidence becomes narrower, stronger, weaker, superseded, or newly ambiguous, does the repository route a future researcher toward the correct next action without silently retaining the old broader belief?

Navigation fault injection remains the best implementation. The claim spine supplies the expected answer for each test case, while the normal front doors reveal what a fresh competent agent would actually infer.

Key failure modes include:

- tested-form closure propagating as premise closure;
- a capability signature being lost because promotion was negative;
- a satisfied reopen condition not changing question state;
- a successor question remaining hidden behind an older closed parent;
- a historical nomination being presented as current capability;
- duplicated work because supersession/answered-by links are not discoverable.

### Audit 6: registry / Resource Contract meta-audit

This becomes an audit of **whether governance prevents known invalid inference at the moment it could affect a decision**.

Do not ask merely whether the contract can describe a resource. Ask whether a competent researcher following the normal resource front door would be protected against the real failure corpus accumulated by these audits.

The historical fault-injection suite should therefore score three things separately:

1. **discoverability:** would the relevant caveat/relationship be found before the decision?
2. **representability:** can current authorities express the scientifically important distinction without distortion?
3. **enforcement:** where the rule is mechanical, does tooling reject or flag the invalid use?

A contract field that exists but is routinely bypassed is not solving the problem.

## Program execution order

The recommended order remains:

1. experiment evidence lifecycle;
2. accepted-path/oracle evidence;
3. capability observability/attribution;
4. question-state propagation;
5. registry / Resource Contract meta-audit.

But add a thin **claim-spine pass** before the first deep audit and maintain it incrementally throughout the program.

The claim spine is not a sixth audit. It is the connective tissue that prevents five excellent resource audits from remaining five separate islands.

## Sampling and compute discipline

The inference-first frame changes how samples should be chosen.

Prefer cases with high **decision leverage**, not merely unusual data:

- claims closing broad premise families;
- claims reused by several later treatments;
- claims sitting on a live or plausible reopen gate;
- cases where two rival explanations imply different next experiments;
- cases whose evidence is heavily derivative or selected;
- cases already implicated by archaeology or previous audit corrections.

New compute is justified only when existing evidence cannot discriminate an important rival and the result can change a current or plausible next action.

## What this framework deliberately does not create

Do not create a universal belief database, confidence score, Bayesian ledger, new queue, or comprehensive ontology of scientific claims unless repeated audit work demonstrates a concrete need.

Existing authorities should retain their jobs:

- workstreams own current priority;
- question relations own sparse research relationships;
- capability memory preserves demonstrated/displaced capability;
- experiment results/reports own intervention evidence;
- the resource registry/contract owns resource semantics;
- archaeology preserves historically useful unresolved mechanisms and evidence corrections.

The claim spine joins these surfaces during audits. It does not replace them.

## Audit closeout under the inference-first frame

A planned audit is complete only when it can answer, for the decision-bearing claims it touched:

1. What was actually observed?
2. Was the claimed phenomenon observable under that design?
3. What population/conditioning/regime does the observation support?
4. How much independent causal support exists?
5. What important rival explanations remain?
6. Did the audit produce evidence that discriminates them?
7. Has the claim been propagated no more broadly than the evidence earns?
8. What current or future research decision changes as a result?
9. If no decision changes, was additional tooling/compute avoided?
10. What recurrence guard belongs in producers, consumers, query surfaces, or checks?

The success metric is not the number of repaired fields or audit findings. It is a lower probability that Pathfinder spends its next unit of research effort on the wrong problem for the wrong reason, together with better identification of routes that can plausibly produce additional solves.
