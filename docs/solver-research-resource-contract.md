# Solver research resource contract

> **Status:** current contract for durable solver-research resources.
> **Registry:** [`solver-research-data-assets.json`](solver-research-data-assets.json) remains the asset inventory and evidence-topology authority.
> **Cross-asset guide:** [`solver-research-data-assets.md`](solver-research-data-assets.md).
> **Report method:** [`investigation-report-conventions.md`](investigation-report-conventions.md).

This contract turns the lessons from the 2026-09 provenance, variant-family, solution-profile, stress-corpus, and decision-exposure audits into a reusable resource standard. It is deliberately a layer over the existing asset registry, not a second evidence warehouse.

The contract exists to keep two questions separate:

1. **What was observed or stored?**
2. **What is that resource entitled to support as evidence?**

A resource can be internally valid and still be unsuitable for a claim because its population was selected, its rows are dependent, its missing fields are informative, its revision is stale, or its producer discarded information needed by the proposed inference.

## Contract grades

Every entry in `solver-research-data-assets.json` must satisfy the **catalogue contract**. Resources that become recurring decision-bearing research inputs should also satisfy the **audited-resource contract**.

### Catalogue contract

The registry entry must declare:

- stable `id`, human name, and current status;
- natural `grain`;
- locations and owning authorities;
- cheap query entry points;
- join keys;
- evidence roles;
- related assets;
- useful affordances; and
- material caveats.

The catalogue contract answers “what is this, where is it, and how do I approach it safely?” It is not a certification that the resource has been audited for every decision-bearing use.

### Audited-resource contract

An audited resource also needs an entry in `auditedResourceContracts` in the same registry. That declaration must make the following explicit:

- **Independent unit:** the unit that may legitimately count as independent support for the resource's usual research questions.
- **Identity layers:** the distinct identities that must not be collapsed, such as level, path, event, parent family, generated variant, puzzle content, evaluation run, or accepted solution.
- **Generation/producer authority:** what creates the resource and which metadata actually describes that creation.
- **Selection/conditioning history:** how rows/events can enter the resource after generation, including control-outcome, treatment-outcome, residual, reach, starvation, curation, novelty, solver-success/failure, or other conditioning.
- **Admissible evidence purposes:** the claims for which the resource is ordinarily usable, including important purpose-specific restrictions.
- **Dependence model:** known pseudo-replication or shared-ancestry structure and the grouping/collapse rule needed before support volume is interpreted.
- **Missingness semantics:** fields/states that must remain unknown rather than being imputed as false, zero, failure, exhaustive, or absent effect.
- **Freshness/revision contract:** which code/data/schema/population identities must match, and which historical uses are still legitimate under drift.
- **Known irreversible information loss:** information old producers did not preserve and therefore cannot be reconstructed honestly from the resource itself.
- **Consumer inventory:** maintained consumers or consumer classes whose semantics can be affected by a reinterpretation of the resource.
- **Historical-claim blast radius:** the disposition of known old claims after the audit, or a pointer to the ledger/report that owns those dispositions.
- **Audit authority:** the report(s) that established the declaration.

These are scientific semantics, not prose decoration. When one is unknown, say `unknown` or describe the limitation. Do not invent a value to make the contract look complete.

## Conditioning vocabulary

Do not use a single boolean such as `outcomeConditioned` to stand for population independence.

When conditioning matters, name the variable and side explicitly. Examples include:

- `control-outcome-failure`
- `treatment-outcome-success`
- `historical-production-success`
- `historical-production-failure`
- `stage-reach`
- `stage-starvation`
- `mechanic-predicate`
- `family-parent`
- `novelty-filter`
- `manual-curation`
- `none-known`

A two-phase control-failure residual can be valid confirmation because treatment outcomes did not select the rows, while still being control-outcome-conditioned and therefore unsuitable for unconditional prevalence/effect-size claims. “Fresh,” “disjoint,” “solver-blind generation,” and “holdout” do not override later selection history.

## Resource-audit closeout gate

A resource audit is not complete merely because a report exists. Before closeout, do the following to the extent material to that resource:

1. Populate or update the audited-resource declaration.
2. Check producer semantics, readers/consumers, and query tooling against the new interpretation.
3. Identify irreversible historical information loss instead of silently imputing it.
4. Disposition known historical claims whose inference depended on the old semantics.
5. Update current method/queue authorities when the audit changes a live gate.
6. Reconcile status/remaining-gate metadata so the audit does not remain accidentally “active.”
7. Add or update an executable checker when the rule is mechanically testable.

A full census or replay is **not** mandatory just to close an audit. Run expensive materialization only when its counts are decision-bearing or needed to validate a concrete contract claim.

## Consumer rule

If an audit changes semantics, inspect both **writers and readers**. A definition-site fix is incomplete when downstream selectors, joins, representatives, dashboards, scripts, or reports still consume the old meaning.

Consumers should prefer shared semantic helpers over locally reimplementing trust, applicability, representative selection, support, or freshness rules.

## Historical evidence rule

Never rewrite a literal historical observation solely because its inferential role changed. Preserve:

- exact tested rows;
- exact arm/config identity;
- observed solves/losses/work; and
- execution failures or participation defects.

Then separately narrow, supersede, or invalidate the inference. “The population did not support the claimed transfer” is different from “the run did not happen.”

## Prospective producer rule

When a resource repeatedly loses information that later research needs, fix the producer prospectively rather than fabricating history. The four audited resources currently nominate these producer improvements:

- **Stress/managed populations:** record selection/conditioning events separately from generation ancestry, including which side/outcome conditioned membership and which descendant decisions consumed the population.
- **Variant families:** retain invocation-local requested/attempted/accepted/budget counters inside each generation-run record rather than relying on mixed cumulative/latest top-level counters.
- **Hint provenance:** wherever practical, reference the originating run/experiment manifest so attempted denominator, failures, protocol identity, and work semantics are recoverable for performance claims.
- **Solution profiles:** keep mechanics-applicability/support distinct from statistical sample/stability support; do not let one nominal coverage number imply both.

These are prospective improvements. Missing historical data remains missing.

## Decision-bearing preflight

Before using a durable resource in a broad or promotion-facing decision, ask:

1. What exact claim is this resource being asked to support?
2. What is the independent unit for that claim?
3. Which identity layer is being joined?
4. How was the tested population/event selected or conditioned?
5. What dependence remains after grouping/collapse?
6. What is missing, and what does missing mean?
7. Does the resource revision/protocol match the claim, or is this only historical nomination/forensic evidence?
8. What information was never preserved?
9. Has this exact population/resource already influenced this treatment or an ancestor?
10. Does a current consumer still encode an older semantic assumption?

If those questions materially change the answer, record them in the decision-bearing report under the existing investigation conventions.

## Initial audited resources

The first audited-resource declarations cover the four resources whose September 2026 audits produced this contract:

- `hint-provenance`
- `variant-family-data`
- `solution-space-profiles`
- `stress-corpora`

Other registry entries remain legitimate catalogue-grade resources. Upgrade one to audited grade when a focused resource audit is performed or before relying on subtle resource semantics for a new broad decision. Do not force full audit ceremony onto every diagnostic helper merely because it is listed in the registry.

## Enforcement boundary

`npm run check:audit-artifacts` validates the registry's catalogue shape, relationship references, audited-resource declarations, and the four initial audited-resource memberships. It can catch missing declarations, broken references, duplicate IDs, and malformed contract fields. It cannot certify that a scientific claim is true, that a population is actually independent, or that a consumer inventory is complete. Those remain audit/review questions.
