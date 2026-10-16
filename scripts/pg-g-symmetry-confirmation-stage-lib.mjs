import { readFileSync } from 'node:fs';

const invalidStatuses = new Set(['error','deadline-truncated','referee-invalid']);

function techniqueOf(row) {
    if (!Array.isArray(row?.techniqueKeys) || row.techniqueKeys.length !== 1) {
        throw new Error(`${row?.cellId ?? 'row'}: expected exactly one isolated technique`);
    }
    return row.techniqueKeys[0];
}
function responseKey(row) {
    const ctx = row.familyContext ?? {};
    return [ctx.familyId, ctx.variantId ?? '', techniqueOf(row)].join('\u001f');
}
function parentKey(row) {
    const ctx = row.familyContext ?? {};
    return [ctx.familyId, techniqueOf(row)].join('\u001f');
}
function levelsOf(file) {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed?.levels;
    if (!Array.isArray(levels)) throw new Error(`${file}: no levels array`);
    return levels;
}

export function deriveStageAOpportunities(spec, stageAPlan, stageACombined) {
    if (!Array.isArray(stageAPlan?.cells)) throw new Error('Stage-A plan lacks cells[]');
    const results = stageACombined?.results;
    if (!Array.isArray(results)) throw new Error('Stage-A combined result lacks results[]');
    const expectedRows = Number(spec?.stageA?.expectedRows);
    if (Number.isFinite(expectedRows) && stageAPlan.cells.length !== expectedRows) {
        throw new Error(`Stage-A plan expectedRows mismatch: spec=${expectedRows}, plan=${stageAPlan.cells.length}`);
    }
    if (results.length !== stageAPlan.cells.length) {
        throw new Error(`Stage-A result coverage mismatch: plan=${stageAPlan.cells.length}, results=${results.length}`);
    }
    const cellById = new Map(stageAPlan.cells.map(cell => [cell.cellId, cell]));
    if (cellById.size !== stageAPlan.cells.length) throw new Error('Stage-A plan has duplicate cell ids');
    const seen = new Set();
    for (const row of results) {
        if (!cellById.has(row.cellId)) throw new Error(`unexpected Stage-A row ${row.cellId}`);
        if (seen.has(row.cellId)) throw new Error(`duplicate Stage-A row ${row.cellId}`);
        seen.add(row.cellId);
        if (invalidStatuses.has(row.status)) throw new Error(`invalid Stage-A row ${row.cellId}:${row.status}`);
        if (row.deadlineTruncated === true) throw new Error(`deadline-truncated Stage-A row ${row.cellId}`);
    }

    const parentByKey = new Map();
    for (const row of results) {
        if (row.familyContext?.role !== 'parent') continue;
        const key = parentKey(row);
        if (parentByKey.has(key)) throw new Error(`duplicate Stage-A parent control ${key}`);
        parentByKey.set(key, row);
    }
    const opportunities = [];
    for (const variant of results) {
        if (variant.familyContext?.role !== 'variant') continue;
        const parent = parentByKey.get(parentKey(variant));
        if (!parent) throw new Error(`${variant.cellId}: no matching parent control`);
        if (!!variant.ok === !!parent.ok) continue;
        const orientation = Number(variant.familyContext?.mutation?.variant);
        if (!Number.isInteger(orientation) || orientation < 1 || orientation > 7) {
            throw new Error(`${variant.cellId}: invalid/missing symmetry orientation`);
        }
        opportunities.push({
            key:responseKey(variant),
            parentId:String(variant.familyContext.parentId),
            familyId:String(variant.familyContext.familyId),
            variantId:String(variant.familyContext.variantId),
            technique:techniqueOf(variant),
            orientation,
            transition:parent.ok ? 'loss' : 'gain',
            parent:{
                cellId:parent.cellId,
                ok:!!parent.ok,
                status:parent.status,
                workSpent:parent.workSpent ?? null,
            },
            variantControl:{
                cellId:variant.cellId,
                ok:!!variant.ok,
                status:variant.status,
                workSpent:variant.workSpent ?? null,
            },
        });
    }
    opportunities.sort((a,b)=>a.parentId.localeCompare(b.parentId) ||
        a.variantId.localeCompare(b.variantId) || a.technique.localeCompare(b.technique));
    const eligibleParents=[...new Set(opportunities.map(row=>row.parentId))].sort();
    const minimumEligibleParents=Number(spec?.decisionRule?.minimumEligibleParents ?? 0);
    const minimumDiscordantRows=Number(spec?.decisionRule?.minimumDiscordantRows ?? 0);
    return {
        opportunities,
        eligibleParents,
        eligibleParentCount:eligibleParents.length,
        discordantRows:opportunities.length,
        treatmentEligible:eligibleParents.length >= minimumEligibleParents &&
            opportunities.length >= minimumDiscordantRows,
    };
}

function parentGridForFamily(stageAPlan, familyId) {
    const cell = stageAPlan.cells.find(row =>
        row.familyContext?.familyId === familyId && row.familyContext?.role === 'parent');
    if (!cell) throw new Error(`${familyId}: Stage-A parent cell absent`);
    const levels=levelsOf(cell.corpusFile);
    const raw=levels[cell.levelPos - 1];
    if (!raw?.grid || !Number.isInteger(raw.grid.w) || !Number.isInteger(raw.grid.h)) {
        throw new Error(`${familyId}: parent grid dimensions unavailable`);
    }
    return { w:raw.grid.w, h:raw.grid.h };
}

export function buildStageBPlan(spec, stageAPlan, stageACombined) {
    const opportunity = deriveStageAOpportunities(spec, stageAPlan, stageACombined);
    const sourceCellById=new Map(stageAPlan.cells.map(cell=>[cell.cellId,cell]));
    const gridByFamily=new Map();
    const cells=opportunity.opportunities.map((row,index)=>{
        const source=sourceCellById.get(row.variantControl.cellId);
        if (!source) throw new Error(`${row.variantControl.cellId}: source Stage-A cell absent`);
        if (!gridByFamily.has(row.familyId)) gridByFamily.set(row.familyId,parentGridForFamily(stageAPlan,row.familyId));
        const grid=gridByFamily.get(row.familyId);
        return {
            ...source,
            cellId:`PGG-CONF-B::${String(index+1).padStart(4,'0')}::${source.cellId}`,
            tier:'PGG-CONF-B',
            pairLabel:row.key,
            candidateOrderResearch:{
                kind:'symmetry-parent-frame',
                orientation:row.orientation,
                parentWidth:grid.w,
                parentHeight:grid.h,
            },
        };
    });
    return {
        schemaVersion:1,
        kind:'pathfinder-pg-g-independent-symmetry-stage-b-plan',
        generatedAt:new Date().toISOString(),
        sourceSpec:stageAPlan.sourceSpec ?? null,
        stageAPlanKind:stageAPlan.kind ?? null,
        solverRef:stageAPlan.solverRef ?? null,
        workBudget:spec.workBudget,
        budgetMs:spec.budgetMs,
        independentUnit:'parentId',
        opportunity:{
            eligibleParents:opportunity.eligibleParents,
            eligibleParentCount:opportunity.eligibleParentCount,
            discordantRows:opportunity.discordantRows,
            treatmentEligible:opportunity.treatmentEligible,
        },
        expectedCells:cells.length,
        cells,
    };
}

function ratio(a,b) {
    return Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0 ? a / b : null;
}
function logGap(a,b) {
    const r=ratio(a,b);
    return r == null ? null : Math.abs(Math.log(r));
}

export function analyzeConfirmation(spec, stageAPlan, stageACombined, stageBCombined = null) {
    const stageA=deriveStageAOpportunities(spec,stageAPlan,stageACombined);
    if (!stageA.treatmentEligible) {
        return {
            verdict:'inconclusive-low-opportunity',
            reason:`Stage A exposed ${stageA.discordantRows} discordant rows across ${stageA.eligibleParentCount} independent parents, below the frozen minima.`,
            stageA,
            stageB:null,
        };
    }
    const treatmentRows=stageBCombined?.results;
    if (!Array.isArray(treatmentRows)) throw new Error('eligible Stage A requires Stage-B results');
    if (treatmentRows.length !== stageA.opportunities.length) {
        throw new Error(`Stage-B coverage mismatch: expected ${stageA.opportunities.length}, got ${treatmentRows.length}`);
    }
    const byKey=new Map();
    for (const row of treatmentRows) {
        if (invalidStatuses.has(row.status) || row.deadlineTruncated === true) {
            throw new Error(`invalid Stage-B row ${row.cellId}:${row.status}`);
        }
        if (!row.candidateOrderResearch || row.candidateOrderResearch.kind !== 'symmetry-parent-frame') {
            throw new Error(`${row.cellId}: Stage-B result lacks parent-frame treatment provenance`);
        }
        const key=responseKey(row);
        if (byKey.has(key)) throw new Error(`duplicate Stage-B response ${key}`);
        byKey.set(key,row);
    }
    const rows=stageA.opportunities.map(op=>{
        const treatment=byKey.get(op.key);
        if (!treatment) throw new Error(`missing Stage-B treatment for ${op.key}`);
        const restored=!!treatment.ok === op.parent.ok;
        const controlGap=op.parent.ok && op.variantControl.ok
            ? logGap(op.variantControl.workSpent,op.parent.workSpent) : null;
        const treatmentGap=op.parent.ok && treatment.ok
            ? logGap(treatment.workSpent,op.parent.workSpent) : null;
        return {
            ...op,
            treatment:{
                cellId:treatment.cellId,
                ok:!!treatment.ok,
                status:treatment.status,
                workSpent:treatment.workSpent ?? null,
                candidateOrderResearch:treatment.candidateOrderResearch,
            },
            restored,
            controlLogWorkGap:controlGap,
            treatmentLogWorkGap:treatmentGap,
            workGapContracted:controlGap != null && treatmentGap != null ? treatmentGap < controlGap : null,
        };
    });
    if (byKey.size !== rows.length) throw new Error('Stage-B contains treatment rows outside the Stage-A opportunity set');
    const restoredRows=rows.filter(row=>row.restored);
    const restoredParents=[...new Set(restoredRows.map(row=>row.parentId))].sort();
    const restorationRate=restoredRows.length/rows.length;
    const positiveThreshold=0.70;
    const negativeThreshold=0.40;
    const minimumParents=Number(spec.decisionRule.minimumEligibleParents);
    let verdict;
    if (restorationRate >= positiveThreshold && restoredParents.length >= minimumParents) verdict='positive';
    else if (restorationRate < negativeThreshold) verdict='negative';
    else verdict='inconclusive-middle-band';
    const techniques={};
    for (const row of rows) {
        const bucket=techniques[row.technique] ??= {discordantRows:0,restoredRows:0,parents:new Set(),restoredParents:new Set()};
        bucket.discordantRows++;
        bucket.parents.add(row.parentId);
        if(row.restored){bucket.restoredRows++;bucket.restoredParents.add(row.parentId);}
    }
    const techniqueSummary=Object.fromEntries(Object.entries(techniques).map(([key,v])=>[key,{
        discordantRows:v.discordantRows,
        restoredRows:v.restoredRows,
        restorationRate:v.restoredRows/v.discordantRows,
        eligibleParents:v.parents.size,
        restoredParents:v.restoredParents.size,
    }]));
    const workComparable=rows.filter(row=>row.controlLogWorkGap != null && row.treatmentLogWorkGap != null);
    return {
        verdict,
        reason:`${restoredRows.length}/${rows.length} discordant rows restored parent solve state across ${restoredParents.length}/${stageA.eligibleParentCount} eligible parents.`,
        stageA,
        stageB:{
            treatedRows:rows.length,
            restoredRows:restoredRows.length,
            restorationRate,
            restoredParents,
            restoredParentCount:restoredParents.length,
            techniqueSummary,
            workComparableRows:workComparable.length,
            workGapContractedRows:workComparable.filter(row=>row.workGapContracted).length,
            rows,
        },
    };
}
