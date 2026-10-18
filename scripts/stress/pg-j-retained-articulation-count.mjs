#!/usr/bin/env node
/**
 * PG-J: zero-solver-work retrospective topology proxy and compression falsifier.
 * Frozen three exact LIVE/DEAD topology-fork sources, 25 unique prefixes.
 * This is a deliberately over-simple graph diagnostic, NOT a sound path-state
 * representation, a future-feasibility test, or a production pruning policy.
 *
 * node scripts/stress/pg-j-retained-articulation-count.mjs --self-test
 * node scripts/stress/pg-j-retained-articulation-count.mjs --out=tmp/pg-j-art.json
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';

const sources=[
  'reports/stress/class5-topology-fork-exact-labels-2026-09-16.json',
  'reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json',
  'reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json',
];
const levelFile='data/levels.json';
const fail=(ok,message)=>{if(!ok)throw Error(message);};
function articulationCount(start,neighbors) {
  const disc=new Map(),low=new Map(),cuts=new Set();
  let tick=0;
  function visit(x,parent) {
    disc.set(x,++tick);low.set(x,tick);
    let children=0;
    for(const y of neighbors(x)) {
      if(!disc.has(y)) {
        children++;visit(y,x);
        low.set(x,Math.min(low.get(x),low.get(y)));
        if(parent!==null && low.get(y)>=disc.get(x)) cuts.add(x);
      } else if(y!==parent) {
        low.set(x,Math.min(low.get(x),disc.get(y)));
      }
    }
    if(parent===null && children>1)cuts.add(x);
  }
  visit(start,null);
  return {count:cuts.size,reachable:disc.size};
}
if(process.argv.includes('--self-test')) {
  const line=new Map([[0,[1]],[1,[0,2]],[2,[1]]]);
  const loop=new Map([[0,[1,3]],[1,[0,2]],[2,[1,3]],[3,[0,2]]]);
  fail(articulationCount(0,n=>line.get(n)).count===1,'three-node line articulation');
  fail(articulationCount(0,n=>loop.get(n)).count===0,'four-node cycle articulation');
  console.log('PG-J articulation observer self-test passed');process.exit(0);
}
const output=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
fail(output,'--out=<file> is required');
const sourceObjects=sources.map(p=> {
  const buf=readFileSync(p);
  const parsed=JSON.parse(buf.toString('utf8'));
  fail(Array.isArray(parsed.rows),'missing frozen exact-labelled rows: '+p);
  return {path:p,sha256:createHash('sha256').update(buf).digest('hex'),rows:parsed.rows};
});
const levelBuffer=readFileSync(levelFile);
const levels=JSON.parse(levelBuffer.toString('utf8'));
fail(Array.isArray(levels),'expected canonical human levels');
const byId=new Map(levels.map(level=>[level.id,level]));
const unique=new Map(),dupes=[];
for(const src of sourceObjects) for(const r of src.rows) {
  const key=JSON.stringify([r.levelId,r.prefix]);
  if(unique.has(key)){
    const earlier=unique.get(key);
    fail(earlier.referenceLabel===r.referenceLabel,'duplicate exact fate disagrees: '+key);
    dupes.push(r.caseId);
  }else unique.set(key,r);
}
const records=[];
for(const r of unique.values()) {
  const level=byId.get(r.levelId);
  fail(level&&level.grid&&Array.isArray(r.prefix),'missing level or prefix: '+r.levelId);
  const w=level.grid.w,h=level.grid.h;
  const cell=(x,y)=>(y-1)*w+x-1;
  const excluded=new Set([
    ...r.prefix.slice(0,-1).map(([x,y])=>cell(x,y)),
    ...(level.blocks??[]).map(({x,y})=>cell(x,y)),
    ...(level.geese??[]).map(({x,y})=>cell(x,y)),
  ]);
  const remaining=new Set();
  for(let y=1;y<=h;y++)for(let x=1;x<=w;x++){
    const p=cell(x,y);
    if(!excluded.has(p))remaining.add(p);
  }
  const portalEdges=(level.portals??[]).map(({x1,y1,x2,y2})=>[cell(x1,y1),cell(x2,y2)]);
  const neighbors=i=>{
    const x=i%w,y=Math.floor(i/w);
    const raw=[x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1];
    for(const [a,b] of portalEdges){
      if(i===a)raw.push(b);
      if(i===b)raw.push(a);
    }
    return [...new Set(raw.filter(q=>remaining.has(q)))];
  };
  const end=r.prefix.at(-1),start=cell(end[0],end[1]);
  fail(remaining.has(start),'frozen prefix endpoint unavailable '+r.caseId);
  const measured=articulationCount(start,neighbors);
  const base=[r.levelId,r.depth,end];
  records.push({caseId:r.caseId,levelId:r.levelId,referenceLabel:r.referenceLabel,
    baseSignature:JSON.stringify(base),
    countSignature:JSON.stringify([...base,measured.count]),
    rawDepth:r.depth,endpoint:end,articulationCount:measured.count,
    reachableVertices:measured.reachable,remainingVertices:remaining.size,
    mechanics:{portals:portalEdges.length,geese:(level.geese??[]).length},
  });
}
function evaluate(keyName) {
  const groups=new Map();
  for(const row of records){
    const key=row[keyName];
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  const repeated=[...groups.values()].filter(rows=>rows.length>=2);
  const mixed=repeated.filter(rows=>new Set(rows.map(x=>x.referenceLabel)).size>=2);
  return {
    signatureKeys:groups.size,repeatedKeys:repeated.length,
    repeatedRows:repeated.reduce((sum,rows)=>sum+rows.length,0),
    mixedKeys:mixed.length,mixedRows:mixed.reduce((sum,rows)=>sum+rows.length,0),
    mixedGroups:mixed.map(rows=>rows.map(x=>x.caseId)),
    repeatedGroups:repeated.map(rows=>rows.map(x=>x.caseId)),
  };
}
const base=evaluate('baseSignature'),count=evaluate('countSignature');
const summary={sourceRows:sourceObjects.reduce((sum,s)=>sum+s.rows.length,0),
  distinctPrefixes:records.length,duplicateAliases:dupes.length,
  independentParents:new Set(records.map(x=>x.levelId)).size,
  baseCount:base,countAugmented:count,
  baseMixedGroupsSeparated:base.mixedGroups.filter(ids=> {
    const keyByCase=new Map(records.map(r=>[r.caseId,r.countSignature]));
    const byCount=new Map();
    for(const id of ids){
      const sig=keyByCase.get(id);
      const matching=records.find(r=>r.caseId===id);
      if(!byCount.has(sig))byCount.set(sig,new Set());
      byCount.get(sig).add(matching.referenceLabel);
    }
    return [...byCount.values()].every(v=>v.size===1);
  }).length,
};
fail(summary.sourceRows===28&&summary.distinctPrefixes===25&&summary.duplicateAliases===3,
  'frozen exact source coverage unexpectedly changed');
fail(summary.independentParents===7,'independent parent coverage changed');
const verdict={
 schema:'pathfinder.pg-j-retained-articulation-count/v1',
 evidenceRole:'retrospective-development',
 sourceFiles:sourceObjects.map(({path,sha256})=>({path,sha256})),
 levelFile,levelSha256:createHash('sha256').update(levelBuffer).digest('hex'),
 protocol:{population:'all retained 28 exact fork labels deduplicated to 25 prefix identities',
   selection:'source-frozen, not selected by topology descriptor',
   topology:'remaining grid after prefix[:-1] plus static blocks and geese omitted; portal endpoint undirected links over-approximate teleport; articulation count within endpoint-connected component',
   mechanicLimits:'omits per-axis reuse, dynamic geese, flipper state, crossing accounting and all exact continuation constraints',
   inference:'cheap rank/representation diagnostic only; not a hard-prune certificate or prospective independent sample'},
 summary,rows:records,
 disposition:'mixed exact LIVE/DEAD collisions remain; count-only augmentation is not future-sufficient and does not authorize cache/prune/decomposition',
};
const target=path.resolve(output);mkdirSync(path.dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(verdict,null,2)+'\n');
console.log(JSON.stringify({sourceRows:summary.sourceRows,unique:summary.distinctPrefixes,
  parents:summary.independentParents,baseline:{keys:base.signatureKeys,mixed:base.mixedKeys,repeatedRows:base.repeatedRows},
  count:{keys:count.signatureKeys,mixed:count.mixedKeys,repeatedRows:count.repeatedRows},
  mixedSeparated:summary.baseMixedGroupsSeparated}));
