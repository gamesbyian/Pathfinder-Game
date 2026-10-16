#!/usr/bin/env node
/**
 * PG-G: outcome-blind current-input D4 frame feasibility.
 *
 * A canonical frame may eliminate arbitrary E/W/S/N tie order on asymmetric puzzles.
 * This deliberately uses only positions of present puzzle mechanics, not IDs, hints,
 * generator/family ancestry, stored paths, scores, outcomes, or historical winners.
 * It is a read-only opportunity screen; it does not change any solver action.
 *
 * The chosen feature sketch is conservative: ignoring filter axes, portal pairing,
 * landmark chirality etc. can create extra symmetry ties, never a false equivariance
 * claim for a unique minimizer under geometric rotation/reflection.
 *
 * Run: node scripts/run-bundled.mjs scripts/stress/pg-g-cold-d4-frame-feasibility.mjs -- \
 *   --out=tmp/pg-g-cold-d4-frame/summary.json
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {transformPoint} from '../../modules/domain/geometry.ts';

const sources=[
  'data/levels.json',
  'data/stress/stress-levels-random.json'
];
const args=new Map(process.argv.slice(2).filter(s=>s.startsWith('--')).map(s=>{
  const eq=s.indexOf('=');
  return eq<0?[s,null]:[s.slice(0,eq),s.slice(eq+1)];
}));
const corpusFiles=(args.get('--corpora')||sources.join(',')).split(',').map(x=>x.trim()).filter(Boolean);
const outFile=args.get('--out')||'tmp/pg-g-cold-d4-frame/summary.json';

const pointFields=[
  ['G','gates'],['Z','falseGoals'],['B','blocks'],['E','geese'],
  ['P','mustPass'],['X','mustCross'],['L','landmarks'],
  ['F','filters'],['f','flippingFilters']
];
function featureTokens(raw) {
  const out=[];
  const add=(label,p)=>{
    if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y)) return;
    out.push({label,x:p.x,y:p.y});
  };
  add('O',raw.goal);
  for (const [label,field] of pointFields) {
    for(const p of Array.isArray(raw[field])?raw[field]:[])add(label,p);
  }
  // Portal endpoint positions are legal semantic features. This deliberately
  // discards pair/color identity in the frame sketch, not in the actual puzzle.
  for(const p of Array.isArray(raw.portals)?raw.portals:[]){
    add('T',{x:p.x1,y:p.y1});add('T',{x:p.x2,y:p.y2});
  }
  return out;
}
function transformedTokens(tokens,orientation,width,height) {
  return tokens.map(t=>{
    const point=transformPoint(t.x-1,t.y-1,orientation,width,height);
    return {label:t.label,x:point.tx+1,y:point.ty+1};
  });
}
function signature(tokens,orientation,width,height) {
  return transformedTokens(tokens,orientation,width,height)
    .map(t=>t.label+':'+String(t.x).padStart(3,'0')+','+String(t.y).padStart(3,'0'))
    .sort().join('|');
}
function canonicalFrame(tokens,width,height) {
  const variants=Array.from({length:8},(_,i)=>signature(tokens,i,width,height));
  const min=variants.reduce((best,next)=>next<best?next:best);
  const minimizers=variants.flatMap((value,i)=>value===min?[i]:[]);
  return {signature:min,minimizers};
}
function checkLevel(raw) {
  const width=raw.grid?.w,height=raw.grid?.h;
  if (!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2)throw Error('invalid puzzle dimensions');
  if (width!==height)return {supported:false,reason:'non-square'};
  const tokens=featureTokens(raw);
  if(!tokens.some(t=>t.label==='O')||!tokens.some(t=>t.label==='G'))throw Error('missing goal or gate sketch anchor');
  const frame=canonicalFrame(tokens,width,height);
  for(let transform=0;transform<8;transform++){
    const rotated=transformedTokens(tokens,transform,width,height);
    const again=canonicalFrame(rotated,width,height);
    if(frame.signature!==again.signature||frame.minimizers.length!==again.minimizers.length){
      throw Error('D4 feature-sketch canonical invariance failed at orientation '+transform);
    }
  }
  return {supported:true,unique:frame.minimizers.length===1,ties:frame.minimizers.length};
}
function summarize(rows) {
  const support=rows.filter(row=>row.supported);
  const unique=support.filter(row=>row.unique).length;
  const tieCounts={};
  for(const row of support)tieCounts[String(row.ties)]=(tieCounts[String(row.ties)]||0)+1;
  return {
    total:rows.length,supported:support.length,unsupported:rows.length-support.length,
    uniqueFrame:unique,ambiguousFrame:support.length-unique,
    uniqueRate:support.length?unique/support.length:null,tieCounts,
  };
}
const corpora=[];
for(const name of corpusFiles){
  const file=JSON.parse(readFileSync(name,'utf8'));
  const levels=Array.isArray(file)?file:file.levels;
  if(!Array.isArray(levels))throw Error('invalid corpus: '+name);
  const rows=levels.map((row,i)=>{
    try{return checkLevel(row);}
    catch(error){throw Error(name+' position '+(i+1)+': '+String(error.message));}
  });
  const result={file:name,...summarize(rows)};
  corpora.push(result);
  console.log('PG-G COLD D4 FRAME',JSON.stringify(result));
}
const verdict={
  schema:'pathfinder.pg-g-cold-d4-frame-feasibility/v1',
  evidenceRole:'development',
  legalInputs:['grid dimensions','goal position','gate positions','typed mechanic positions'],
  forbiddenInputs:['id','provenance','hints','winning path','prior solver outcome','family transform'],
  contract:'Read-only D4-minimum feature sketch. Unique frame is equivariant; ties are abstentions.',
  method:'Eight D4 transforms from canonical geometry.ts with eight reciprocal rotations/reflections of each level',
  corpora,
  allInvarianceChecksPassed:true,
  productionEffect:'none',
  nextGate:'Independent-parent PG-G confirmation, then matched-work cold-legal tie-order consumer when unique-frame exposure is sufficient'
};
mkdirSync(path.dirname(path.resolve(outFile)),{recursive:true});
writeFileSync(outFile,JSON.stringify(verdict,null,2)+'\n');
console.log('PG-G FINISHED',JSON.stringify({corpora:corpora.map(c=>({file:c.file,uniqueFrame:c.uniqueFrame,supported:c.supported}))}));
