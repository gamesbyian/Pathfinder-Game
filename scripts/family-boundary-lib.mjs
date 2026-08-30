/** Pure joins/aggregates for family-boundary-report.mjs.  This module never invokes the solver. */
import { attemptConfigKey } from './portfolio-solve-sweep-lib.mjs';

const finite = value => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const solved = row => row?.ok === true || row?.status === 'success' || row?.solved === true;
const attemptConfig = attempt => String(attempt?.configKey ?? attempt?.config ?? attemptConfigKey(attempt));

export function configOf(row) {
    if (row?.winningConfig) return String(row.winningConfig);
    const attempts = Array.isArray(row?.attempts) ? row.attempts : [];
    const winner = attempts.find(a => solved(a));
    return winner ? attemptConfig(winner) : null;
}

export function workOf(row) {
    for (const value of [row?.workSpent, row?.winningWork]) {
        const n = finite(value); if (n !== null) return n;
    }
    const winner = row?.attempts?.find(a => solved(a));
    for (const value of [winner?.workSpent]) {
        const n = finite(value); if (n !== null) return n;
    }
    return null;
}

function distribution(values) {
    const counts = {};
    for (const v of values.filter(Boolean)) counts[v] = (counts[v] ?? 0) + 1;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const ordered = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
    const concentration = total ? Math.max(...Object.values(counts)) / total : null;
    const entropyBits = total ? -Object.values(counts).reduce((sum, n) => sum + (n / total) * Math.log2(n / total), 0) : null;
    return { counts: ordered, concentration, entropyBits };
}

function quantiles(values) {
    const a = values.filter(Number.isFinite).sort((x, y) => x - y);
    const pick = p => a.length ? a[Math.max(0, Math.ceil(a.length * p) - 1)] : null;
    return { count: a.length, min: a[0] ?? null, median: pick(.5), p90: pick(.9), max: a.at(-1) ?? null };
}

function concentrationEvidence(parent, solvedRows, configs) {
    if (solved(parent) || !solvedRows.length || !Object.keys(configs.counts).length) return null;
    const dominantConfig = Object.entries(configs.counts).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))[0][0];
    const attempts = parent?.attempts ?? [];
    const matching = attempts.filter(a => attemptConfig(a) === dominantConfig || a.technique === dominantConfig);
    const allocationValues = matching.map(a => finite(a.workSpent)).filter(Number.isFinite);
    const allocation = allocationValues.reduce((a,b)=>a+b,0);
    const terminations = [...new Set(matching.map(a => a.timedOut === true ? 'timeout' : a.timedOut === false && !solved(a) ? 'exhausted' : a.termination ?? a.status).filter(Boolean))].sort();
    return { dominantConfig, fractionOfSolvedSiblings: configs.counts[dominantConfig] / solvedRows.length,
        canonicalAttempted: matching.length > 0, canonicalAllocationWork: allocationValues.length ? allocation : null,
        canonicalTermination: terminations.length ? terminations : null,
        successfulSiblingWork: quantiles(solvedRows.filter(v => configOf(v.result) === dominantConfig).map(v => workOf(v.result))) };
}

const parentCorpusOf = row => row?.parentCorpus ?? row?.corpus ?? null;
const parentIdOf = row => row?.parentId ?? row?.parentLevelId ?? null;
const variantIdOf = row => row?.variantId ?? row?.id ?? row?.levelId ?? row?.level;
const edgeKey = (parentCorpus, parentId, variantId) =>
    `${String(parentCorpus ?? '')}\u0000${String(parentId ?? '')}\u0000${String(variantId)}`;

/** Last record wins within one fully-namespaced edge. Bare ids are retained only for legacy
 * artifacts and may be resolved only when globally unambiguous. */
export function dedupeResults(rows) {
    const map = new Map();
    for (const row of rows) {
        const id = variantIdOf(row);
        if (id != null) map.set(edgeKey(parentCorpusOf(row), parentIdOf(row), id), row);
    }
    return map;
}

function resultLookup(rows) {
    const exact = dedupeResults(rows);
    const bare = new Map();
    for (const row of exact.values()) {
        if (parentCorpusOf(row) != null || parentIdOf(row) != null) continue;
        const id = String(variantIdOf(row));
        if (!bare.has(id)) bare.set(id, []);
        bare.get(id).push(row);
    }
    return (parentCorpus, parentId, variantId) => {
        const exactRow = exact.get(edgeKey(parentCorpus, parentId, variantId));
        if (exactRow) return exactRow;
        const candidates = bare.get(String(variantId)) ?? [];
        if (candidates.length > 1) {
            throw new Error(`ambiguous bare variant id ${variantId}; require (parentCorpus,parentId,variantId)`);
        }
        return candidates[0] ?? null;
    };
}

/** Convert a flat per-attempt artifact into the level-row shape consumed by the report. */
export function coalesceAttemptRecords(rows) {
    const groups = new Map();
    for (const attempt of rows) {
        const id = variantIdOf(attempt);
        if (id == null) continue;
        const key = edgeKey(parentCorpusOf(attempt), parentIdOf(attempt), id);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(attempt);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, attempts]) => {
        const winner = attempts.find(a => solved(a));
        const last = attempts.at(-1) ?? {};
        return {
            ...last,
            id: String(variantIdOf(last)),
            ok: !!winner,
            status: winner ? 'success' : last.status ?? 'failed',
            attempts,
            workSpent: winner ? finite(winner.workSpent) : finite(last.workSpent),
            winningConfig: winner ? attemptConfig(winner) : null,
        };
    });
}

export function buildBoundaryReport({ manifests = [], canonicalResults = [], variantResults = [], solutionProfileJoins = [], metadata = {}, thresholds = {} }) {
    const requestedVariantEdges = new Map();
    const requestedParentEdges = new Map();
    for (const manifest of manifests) {
        const parentCorpus = manifest.parentCorpus ?? null;
        const parentId = String(manifest.parentLevelId ?? manifest.parentId ?? '');
        const parentEdges = requestedParentEdges.get(parentId) ?? new Set();
        parentEdges.add(edgeKey(parentCorpus, parentId, parentId));
        requestedParentEdges.set(parentId, parentEdges);
        for (const variant of manifest.variants ?? []) {
            const variantId = variant.variantId ?? variant.id;
            const edges = requestedVariantEdges.get(String(variantId)) ?? new Set();
            edges.add(edgeKey(parentCorpus, parentId, variantId));
            requestedVariantEdges.set(String(variantId), edges);
        }
    }
    const legacyVariantIds = new Set(variantResults
        .filter(row => parentCorpusOf(row) == null && parentIdOf(row) == null)
        .map(row => String(variantIdOf(row))));
    const ambiguousLegacyId = [...legacyVariantIds].find(id => (requestedVariantEdges.get(id)?.size ?? 0) > 1);
    if (ambiguousLegacyId) {
        throw new Error(`ambiguous bare variant id ${ambiguousLegacyId}; require (parentCorpus,parentId,variantId)`);
    }
    const ambiguousCanonicalId = canonicalResults
        .filter(row => parentCorpusOf(row) == null && parentIdOf(row) == null)
        .map(row => String(variantIdOf(row)))
        .find(id => (requestedParentEdges.get(id)?.size ?? 0) > 1);
    if (ambiguousCanonicalId) {
        throw new Error(`ambiguous bare parent id ${ambiguousCanonicalId}; require (parentCorpus,parentId)`);
    }
    const ambiguousProfileId = solutionProfileJoins
        .filter(row => row.parentCorpus == null)
        .find(row => (requestedVariantEdges.get(String(row.variantId))?.size ?? 0) > 1);
    if (ambiguousProfileId) {
        throw new Error(`ambiguous profile edge ${ambiguousProfileId.variantId}; require parentCorpus`);
    }
    const canonical = resultLookup(canonicalResults);
    const variants = resultLookup(variantResults);
    const spreadThreshold = finite(thresholds.severeWorkRatio) ?? 10;
    const concentrationThreshold=finite(thresholds.configConcentration)??0.75;
    const fragileThreshold=finite(thresholds.minFragileSolveRate)??0;
    const profileByEdge=new Map(solutionProfileJoins.map(r=>[edgeKey(r.parentCorpus, r.parentId, r.variantId),r]));
    const families = [];
    const missingFamilyRows = [];
    const mutationRows = [];

    for (const manifest of [...manifests].sort((a, b) => String(a.parentLevelId).localeCompare(String(b.parentLevelId)) || String(a.familyId).localeCompare(String(b.familyId)))) {
        const parentId = String(manifest.parentLevelId ?? manifest.parentId ?? '');
        const parentCorpus = manifest.parentCorpus ?? null;
        const parent = canonical(parentCorpus, parentId, parentId);
        const relation = manifest.familyMode ?? manifest.relation ?? null;
        const listed = (manifest.variants ?? []).map(v => ({ manifest: v, result: variants(parentCorpus, parentId, v.variantId ?? v.id) }));
        for (const v of listed) if (!v.result) missingFamilyRows.push({ parentId, variantId: v.manifest.variantId ?? v.manifest.id });
        const observed = listed.filter(v => v.result);
        const solvedRows = observed.filter(v => solved(v.result));
        const parentSolved = solved(parent);
        const parentWork = workOf(parent);
        const works = solvedRows.map(v => workOf(v.result)).filter(Number.isFinite);
        const configs = distribution(solvedRows.map(v => configOf(v.result)));
        const variantEvidence = listed.map(v => ({
            variantId: v.manifest.variantId ?? v.manifest.id ?? null,
            relation: v.manifest.relation ?? relation,
            witnessRelation: v.manifest.witnessRelation ?? null,
            mutation: v.manifest.mutationManifest ?? null,
            resultPresent: !!v.result,
            solved: v.result ? solved(v.result) : null,
            workSpent: v.result ? workOf(v.result) : null,
            winningConfig: v.result ? configOf(v.result) : null,
            attemptCount: Array.isArray(v.result?.attempts) ? v.result.attempts.length : v.result?.attemptCount ?? null,
            workBudget: finite(v.result?.workBudget),
            deadlineTruncated: v.result?.deadlineTruncated ?? null,
            solutionProfile: profileByEdge.get(edgeKey(parentCorpus, parentId, v.manifest.variantId ?? v.manifest.id))
                ?? profileByEdge.get(edgeKey(null, parentId, v.manifest.variantId ?? v.manifest.id)) ?? null,
        }));
        const base = { familyId: manifest.familyId ?? null, parentId, relation, canonicalSolved: parent ? parentSolved : null,
            canonicalWork: parentWork, variantCount: listed.length, observedVariantCount: observed.length,
            solvedCount: solvedRows.length, solveRate: observed.length ? solvedRows.length / observed.length : null,
            canonical: parent ? { solved:parentSolved,workSpent:parentWork,winningConfig:configOf(parent),attemptCount:Array.isArray(parent.attempts)?parent.attempts.length:parent.attemptCount??null,
                workBudget:finite(parent.workBudget),deadlineTruncated:parent.deadlineTruncated??null,baselineSource:parent.baselineSource??null } : null,
            winningConfigs: configs, configConcentrationEvidence: concentrationEvidence(parent, solvedRows, configs),
            variants: variantEvidence,
            provenance: { parentCorpus: manifest.parentCorpus ?? null, parentContentHash: manifest.parentContentHash ?? null, generatorVersion: manifest.generatorVersion ?? null, randomSeed: manifest.randomSeed ?? null },
            features: manifest.features ?? manifest.parentFeatures ?? { reqInt: manifest.selectedWitnessIntersectionCount ?? null, requiredPathCoverageRatio: manifest.parentRequiredPathCoverageRatio ?? manifest.parentNavDensity ?? null } };
        for (const v of observed) {
            const mode=v.manifest.mutationManifest?.operation??relation??'unknown', objectType=v.manifest.mutationManifest?.objectType??null, childSolved=solved(v.result), childWork=workOf(v.result);
            mutationRows.push({relation,mode,objectType,parentSolved:parent ? parentSolved : null,variantSolved:childSolved,rescue:parent ? !parentSolved&&childSolved : null,flip:parent?parentSolved!==childSolved:null,
                workRatio:parentSolved&&childSolved&&parentWork&&childWork?childWork/parentWork:null,configSwitch:parentSolved&&childSolved&&configOf(parent)?configOf(parent)!==configOf(v.result):null});
        }
        if (relation === 'symmetry') {
            const orientationMap = new Map();
            for (const evidence of variantEvidence) {
                const transform = evidence.mutation?.operation === 'transform' ? Number(evidence.mutation.variant) : null;
                const key = Number.isInteger(transform) ? `transform:${transform}` : `variant:${evidence.variantId}`;
                orientationMap.set(key, evidence);
            }
            const orientations = [...orientationMap.values()].filter(v => v.resultPresent);
            const solvedOrientations = orientations.filter(v => v.solved);
            const orientationWorks = solvedOrientations.map(v => v.workSpent).filter(Number.isFinite);
            const allStatuses = [...(parent ? [parentSolved] : []), ...orientations.map(v => v.solved)];
            const q = quantiles([...(parentSolved&&parentWork!==null?[parentWork]:[]),...orientationWorks]);
            const best = Math.min(...[...(parentSolved && parentWork !== null ? [parentWork] : []), ...orientationWorks]);
            const symmetryConfigs = distribution(solvedOrientations.map(v => v.winningConfig));
            const symmetrySolvedRows = solvedOrientations.map(v => ({ result: { ok:true, workSpent:v.workSpent, winningConfig:v.winningConfig } }));
            const solvedWorkSpreadRatio = q.min !== null && q.min > 0 && q.max !== null ? q.max / q.min : null;
            families.push({ ...base, kind: 'symmetry', orientationsRepresented: orientations.length + (parent ? 1 : 0), solvedOrientationCount: solvedOrientations.length + (parentSolved ? 1 : 0),
                winningConfigs: symmetryConfigs, configConcentrationEvidence: concentrationEvidence(parent, symmetrySolvedRows, symmetryConfigs),
                solveStatusConsistent: allStatuses.length > 0 ? allStatuses.every(x => x === allStatuses[0]) : null,
                solveStatusDisagreement: allStatuses.includes(true) && allStatuses.includes(false),
                minSolvedOrientationWork: q.min, maxSolvedOrientationWork: q.max,
                bestOrientationWork: Number.isFinite(best) ? best : null,
                canonicalBestWorkRatio: parentSolved && parentWork !== null && Number.isFinite(best) && best > 0 ? parentWork / best : null,
                solvedWorkSpreadRatio, severeCostSpread: solvedWorkSpreadRatio !== null ? solvedWorkSpreadRatio >= spreadThreshold : null,
                regretKind: parent && !parentSolved && solvedOrientations.length ? 'solve-status-cliff' : (parentSolved ? 'numeric' : null),
                canonicalFailureSymmetrySuccess: parent === null ? null : !parentSolved && solvedOrientations.length > 0 });
        } else {
            const modeGroups = {};
            for (const v of observed) {
                const mode = v.manifest.mutationManifest?.operation ?? v.manifest.mutationManifest?.objectType ?? relation ?? 'unknown';
                const g = modeGroups[mode] ??= { count: 0, solvedCount: 0 };
                g.count++; if (solved(v.result)) g.solvedCount++;
            }
            for (const g of Object.values(modeGroups)) g.solveRate = g.count ? g.solvedCount / g.count : null;
            const ratios = parentSolved && parentWork ? works.map(w => w / parentWork) : [];
            families.push({ ...base, kind: 'non-symmetry', modeBreakdown: Object.fromEntries(Object.entries(modeGroups).sort(([a], [b]) => a.localeCompare(b))),
                workRatios: quantiles(ratios), configSwitchRate: parentSolved && configOf(parent) && solvedRows.length ? solvedRows.filter(v => configOf(v.result) !== configOf(parent)).length / solvedRows.length : null,
                evidence: parent && !parentSolved && observed.length ? { fragilitySolveRate: solvedRows.length / observed.length, robustFailureRate: (observed.length - solvedRows.length) / observed.length } : null });
        }
    }

    const cliffs = [];
    for (const family of families) {
        if (!family.canonicalSolved || !family.canonicalWork) continue;
        const manifest = manifests.find(m => m.familyId === family.familyId);
        for (const v of manifest?.variants ?? []) {
            const row = variants(family.provenance.parentCorpus, family.parentId, v.variantId ?? v.id); const w = workOf(row);
            if (!solved(row) || !w || w === family.canonicalWork) continue;
            cliffs.push({ parentCorpus: family.provenance.parentCorpus, parentId: family.parentId, variantId: v.variantId ?? v.id, relation: family.relation,
                direction: w > family.canonicalWork ? 'variant-more-work' : 'variant-less-work', ratio: Math.max(w, family.canonicalWork) / Math.min(w, family.canonicalWork), canonicalWork: family.canonicalWork, variantWork: w });
        }
    }
    cliffs.sort((a, b) => b.ratio - a.ratio || a.parentId.localeCompare(b.parentId) || String(a.variantId).localeCompare(String(b.variantId)));
    const queue = [];
    for (const f of families) {
        const solvedVariants=f.variants.filter(v=>v.solved).sort((a,b)=>(a.workSpent??Infinity)-(b.workSpent??Infinity)||String(a.variantId).localeCompare(String(b.variantId)));
        const add=(priority,findingType,score,representative=solvedVariants[0]??null)=>queue.push({ priority, findingType, parentId: f.parentId, familyId: f.familyId, relation:f.relation,
            variantId:representative?.variantId??null,variantIds:f.variants.map(v=>v.variantId),mutation:representative?.mutation??null,witnessRelation:representative?.witnessRelation??null,
            solutionProfile:representative?.solutionProfile??null,score,
            canonicalSolved:f.canonicalSolved,canonicalWork:f.canonicalWork,canonical:f.canonical,features:f.features,provenance:f.provenance,configConcentrationEvidence:f.configConcentrationEvidence });
        if (f.kind === 'symmetry' && f.canonicalFailureSymmetrySuccess) add(1,'symmetry-pathology',f.solvedOrientationCount);
        if (f.kind === 'symmetry' && f.solveStatusConsistent === false) add(2,'symmetry-pathology',f.solvedOrientationCount);
        if (f.kind === 'symmetry' && (f.solvedWorkSpreadRatio ?? 0) >= spreadThreshold) add(3,'symmetry-pathology',f.solvedWorkSpreadRatio);
        if (f.kind === 'non-symmetry' && f.canonicalSolved === false && f.solveRate > fragileThreshold) {
            add(4,'variant-fragile',f.solveRate);
            const stable=solvedVariants.find(v=>v.solutionProfile?.classification==='small-solution-space-change');
            if(stable)add(4,'solution-space-stable-search-failure',f.solveRate,stable);
        }
        if (f.winningConfigs.concentration !== null && f.winningConfigs.concentration >= concentrationThreshold) add(5,'variant-config-concentration',f.winningConfigs.concentration);
        if (f.kind === 'non-symmetry' && f.canonicalSolved === false && f.solveRate === 0) add(7,'variant-robust',f.variantCount,f.variants[0]??null);
    }
    for(const c of cliffs)c.solutionProfile=profileByEdge.get(edgeKey(c.parentCorpus, c.parentId, c.variantId))
        ??profileByEdge.get(edgeKey(null, c.parentId, c.variantId))??null;
    for (const c of cliffs.filter(c => c.ratio >= spreadThreshold)) queue.push({ priority: 6, findingType: c.solutionProfile?.classification==='small-solution-space-change'?'solution-space-stable-search-failure':'variant-cost-cliff', parentId: c.parentId, variantId: c.variantId, relation:c.relation,score: c.ratio,solutionProfile:c.solutionProfile });
    queue.sort((a, b) => a.priority - b.priority || b.score - a.score || a.parentId.localeCompare(b.parentId) || String(a.variantId ?? '').localeCompare(String(b.variantId ?? '')));
    const conditioned=new Map();
    for(const row of mutationRows){const key=`${row.relation??'unknown'}|${row.mode}|${row.objectType??'all'}`;if(!conditioned.has(key))conditioned.set(key,[]);conditioned.get(key).push(row);}
    const mutationSummaries=[...conditioned.entries()].map(([key,rows])=>{const comparable=field=>rows.filter(r=>r[field]!==null),failedParents=rows.filter(r=>r.parentSolved===false);const wr=quantiles(rows.map(r=>r.workRatio));return{key,relation:rows[0].relation,mode:rows[0].mode,objectType:rows[0].objectType,count:rows.length,
        rescueRate:failedParents.length?failedParents.filter(r=>r.rescue).length/failedParents.length:null,solveStatusFlipRate:comparable('flip').length?comparable('flip').filter(r=>r.flip).length/comparable('flip').length:null,
        winningConfigSwitchRate:comparable('configSwitch').length?comparable('configSwitch').filter(r=>r.configSwitch).length/comparable('configSwitch').length:null,workRatios:wr};}).sort((a,b)=>a.key.localeCompare(b.key));
    return { schemaVersion: 2, metadata: { ...metadata, schedulerCensoringWarning: 'Winning configs are scheduler-censored observations, not independent config success probabilities.', thresholds: { severeWorkRatio: spreadThreshold,configConcentration:concentrationThreshold,minFragileSolveRate:fragileThreshold }, solvesExecuted: false }, families, mutationSummaries, costCliffs: cliffs, actionableQueue: queue, diagnostics: { missingFamilyRows: missingFamilyRows.sort((a,b) => a.parentId.localeCompare(b.parentId) || String(a.variantId).localeCompare(String(b.variantId))) } };
}

export function renderBoundaryMarkdown(report) {
    const symmetry=report.families.filter(f=>f.kind==='symmetry'),non=report.families.filter(f=>f.kind==='non-symmetry');
    const lines = ['# Family boundary report', '', '> **Status:** diagnostic artifact', '> **Decision:** triage existing family telemetry only; no solver or scheduler policy change', '> **Next gate:** replay and ablate selected queue entries before drawing a solver conclusion','', '> Read-only analysis of existing artifacts; no levels were solved.', '', `> **Caution:** ${report.metadata.schedulerCensoringWarning}`, '', `Families: **${report.families.length}** (${symmetry.length} symmetry, ${non.length} non-symmetry) · queued findings: **${report.actionableQueue.length}** · missing variant rows: **${report.diagnostics.missingFamilyRows.length}**`, '', '## Actionable queue', '', '| Priority | Finding | Parent | Variant | Score |', '|---:|---|---|---|---:|'];
    for (const q of report.actionableQueue) lines.push(`| ${q.priority} | ${q.findingType} | ${q.parentId} | ${q.variantId ?? '—'} | ${Number(q.score).toFixed(3)} |`);
    if (!report.actionableQueue.length) lines.push('| — | No findings at current thresholds | — | — | — |');
    lines.push('','## Mutation-conditioned summary','','| Relation / mode / object | N | Rescue rate | Flip rate | Config-switch rate | Median work ratio |','|---|---:|---:|---:|---:|---:|');
    for(const m of report.mutationSummaries)lines.push(`| ${m.key} | ${m.count} | ${m.rescueRate?.toFixed(3)??'—'} | ${m.solveStatusFlipRate?.toFixed(3)??'—'} | ${m.winningConfigSwitchRate?.toFixed(3)??'—'} | ${m.workRatios.median?.toFixed(3)??'—'} |`);
    lines.push('','## Join diagnostics','',report.diagnostics.missingFamilyRows.length?`${report.diagnostics.missingFamilyRows.length} manifest variants had no result row; see JSON for IDs.`:'All manifest variants had result rows.');
    return `${lines.join('\n')}\n`;
}
