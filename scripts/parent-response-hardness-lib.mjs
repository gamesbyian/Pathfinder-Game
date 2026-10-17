/** PG-I parent-grouped fragility/robustness from canonical equal-work family response.
 * Scientific independent unit = parentId; variants remain within-parent observations.
 */
const ensure = (condition, detail) => { if (!condition) throw Error('PG-I census: '+detail); };
const stable = value => JSON.stringify(value);
const summarizeRows = rows => ({
  edges:rows.length,
  responseVectorChanges:rows.filter(r=>r.responseChanged).length,
  solvedCountChanges:rows.filter(r=>r.cardinalityChanged).length,
  equalCardinalityTechniqueSwaps:rows.filter(r=>r.equalCardinalityTechniqueSwap).length,
  zeroCoverage:rows.filter(r=>r.zeroCoverage).length,
  oneOrFewerTechniques:rows.filter(r=>r.oneOrFewerTechniques).length,
  allTechniques:rows.filter(r=>r.allTechniques).length,
  minSolvingTechniques:Math.min(...rows.map(r=>r.variantSolved)),
  maxSolvingTechniques:Math.max(...rows.map(r=>r.variantSolved)),
});
export function summarizeParentResponseHardness(families) {
  ensure(Array.isArray(families)&&families.length,'nonempty family analyses required');
  const byParent=new Map(),seenFamilies=new Set();
  for(const family of families){
    const {familyId,parentId,relation,edges,techniques}=family;
    ensure(typeof familyId==='string'&&familyId&&!seenFamilies.has(familyId),'nonunique family identity');
    seenFamilies.add(familyId);
    ensure(typeof parentId==='string'&&parentId,'missing parent identity');
    ensure(Array.isArray(techniques)&&techniques.length&&new Set(techniques).size===techniques.length,`invalid technique roster at ${familyId}`);
    ensure(Array.isArray(edges)&&edges.length,`no variants at ${familyId}`);
    const sorted=[...techniques].sort();
    let parent=byParent.get(parentId);
    if(!parent){parent={parentId,techniques:sorted,baseline:new Map(),familyIds:[],edges:[],modes:new Map()};byParent.set(parentId,parent);}
    ensure(stable(parent.techniques)===stable(sorted),`technique roster drift for ${parentId}`);
    parent.familyIds.push(familyId);
    const seenVariants=new Set();
    for(const edge of edges){
      ensure(typeof edge.variantId==='string'&&edge.variantId&&!seenVariants.has(edge.variantId),`duplicate variant in ${familyId}`);
      seenVariants.add(edge.variantId);
      ensure(Array.isArray(edge.responses)&&edge.responses.length===sorted.length,`incomplete technique coverage at ${familyId}/${edge.variantId}`);
      const lookup=new Map(edge.responses.map(r=>[r.technique,r]));
      ensure(lookup.size===sorted.length&&sorted.every(k=>lookup.has(k)),`duplicate/missing technique at ${familyId}/${edge.variantId}`);
      const pSolved=[],vSolved=[];
      for(const k of sorted){
        const r=lookup.get(k);
        ensure(typeof r.parent?.ok==='boolean'&&typeof r.variant?.ok==='boolean',`invalid labels ${familyId}/${edge.variantId}/${k}`);
        const baseline={ok:r.parent.ok,status:r.parent.status,workSpent:r.parent.workSpent,nodesExpanded:r.parent.nodesExpanded};
        if(parent.baseline.has(k)){
          ensure(stable(parent.baseline.get(k))===stable(baseline),`cross-block baseline mismatch ${parentId}/${k}`);
        }else parent.baseline.set(k,baseline);
        if(r.parent.ok)pSolved.push(k);
        if(r.variant.ok)vSolved.push(k);
      }
      const mode=edge.relation??relation??'unknown',responseChanged=stable(pSolved)!==stable(vSolved);
      const outcome={familyId,variantId:edge.variantId,mode,
        baselineSolved:pSolved.length,variantSolved:vSolved.length,
        responseChanged,cardinalityChanged:pSolved.length!==vSolved.length,
        equalCardinalityTechniqueSwap:responseChanged&&pSolved.length===vSolved.length,
        zeroCoverage:vSolved.length===0,oneOrFewerTechniques:vSolved.length<=1,
        allTechniques:vSolved.length===sorted.length};
      parent.edges.push(outcome);
      const bucket=parent.modes.get(mode)??[];bucket.push(outcome);parent.modes.set(mode,bucket);
    }
  }
  const parents=[...byParent.values()].sort((a,b)=>a.parentId.localeCompare(b.parentId)).map(p=>{
    const baseline=p.techniques.map(k=>p.baseline.get(k));
    ensure(baseline.every(Boolean),`baseline incompleteness on ${p.parentId}`);
    const totals=summarizeRows(p.edges);
    return {parentId:p.parentId,independentUnit:'parentId',
      familyModeBlocks:p.familyIds.length,techniques:p.techniques.length,
      baselineSolvingTechniques:baseline.filter(r=>r.ok).length,
      ...totals,responseChangeRate:Math.round(1e6*totals.responseVectorChanges/totals.edges)/1e6,
      modes:Object.fromEntries([...p.modes].sort((a,b)=>a[0].localeCompare(b[0])).map(([mode,rows])=>[mode,summarizeRows(rows)]))};
  });
  const sum=k=>parents.reduce((n,p)=>n+p[k],0);
  const summary={independentParents:parents.length,familyModeBlocks:sum('familyModeBlocks'),
    edges:sum('edges'),responseVectorChanges:sum('responseVectorChanges'),
    solvedCountChanges:sum('solvedCountChanges'),
    equalCardinalityTechniqueSwaps:sum('equalCardinalityTechniqueSwaps'),
    zeroCoverage:sum('zeroCoverage'),oneOrFewerTechniques:sum('oneOrFewerTechniques'),
    allTechniques:sum('allTechniques'),
    fullyResponseStableParents:parents.filter(p=>p.responseVectorChanges===0).length,
    parentsWithEqualCardinalityTechniqueSwaps:parents.filter(p=>p.equalCardinalityTechniqueSwaps>0).length,
    parentsWithZeroCoverageVariant:parents.filter(p=>p.zeroCoverage>0).length};
  return {schemaVersion:1,kind:'pathfinder-parent-technique-response-hardness',
    interpretation:{independentUnit:'parentId',oneEdge:'familyId + variantId',
      baseline:'each parent per isolated technique; identical baseline across repeated mode blocks',
      responseVectorChanges:'at least one technique changes its solved status',
      solvedCountChanges:'number of successful techniques differs',
      equalCardinalityTechniqueSwaps:'winning-technique identity changes with unchanged solve count',
      zeroCoverage:'none of tested isolated techniques succeeds within the tested equal-work ceiling',
      caution:'selected development cohort; variant rates are not population prevalence'},
    summary,parents};
}
