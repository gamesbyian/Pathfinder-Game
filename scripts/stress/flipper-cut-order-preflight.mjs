#!/usr/bin/env node
/**
 * Research-only root flipper-cut parity certificate. NEVER a production prune.
 * A flipper separating gate from goal is compulsory. Its prior-flipper
 * rank is fixed when all flippers on the gate-side of its cut are compulsory,
 * even if optional flippers remain strictly beyond the cut. Its required
 * straight axis may then contradict every legal gate-to-goal continuation.
 *
 * Ordinary static graph is a SUPERSET of Pathfinder legal transitions:
 * ignore turn/filter/resource restrictions and allow unused gates as transit.
 * Unsupported: portal-bearing levels (nonlocal jumps invalidate cuts).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const key = ({x,y}) => x+','+y;
const xy = k => k.split(',').map(Number);
const impassable = new Set(['surround','adjacentTurn','adjacentTurnCw','adjacentTurnCcw','decorative']);

function buildGraph(raw) {
  if(!Number.isInteger(raw?.grid?.w)||!Number.isInteger(raw?.grid?.h)||raw.grid.w<1||raw.grid.h<1) throw Error('invalid grid');
  if(!raw.goal||!raw.gates?.length) throw Error('missing goal or gate');
  const {w,h}=raw.grid, blocked=new Set();
  for(const field of ['blocks','geese','falseGoals']) for(const p of raw[field]||[]) blocked.add(key(p));
  for(const lm of raw.landmarks||[]) if(impassable.has(lm.role)) blocked.add(key(lm));
  const adj=new Map();
  for(let y=1;y<=h;y++)for(let x=1;x<=w;x++){
    const k=x+','+y;
    if(blocked.has(k))continue;
    adj.set(k,[[x-1,y],[x+1,y],[x,y-1],[x,y+1]]
      .filter(([a,b])=>a>=1&&a<=w&&b>=1&&b<=h&&!blocked.has(a+','+b))
      .map(([a,b])=>a+','+b));
  }
  return adj;
}
function reach(adj,origin,excluded=null) {
  if(!adj.has(origin)||origin===excluded)return new Set();
  const q=[origin],seen=new Set(q);
  for(let i=0;i<q.length;i++)for(const v of adj.get(q[i])||[])
    if(v!==excluded&&!seen.has(v)){seen.add(v);q.push(v);}
  return seen;
}
function allowedAxes(cell,from,to){
  const [x,y]=xy(cell);
  const h=(from.has((x-1)+','+y)&&to.has((x+1)+','+y))||
          (from.has((x+1)+','+y)&&to.has((x-1)+','+y));
  const v=(from.has(x+','+(y-1))&&to.has(x+','+(y+1)))||
          (from.has(x+','+(y+1))&&to.has(x+','+(y-1)));
  return [...(h?[1]:[]),...(v?[2]:[])];
}

/** Only 'reject' is a proof. 'possible' is NOT an existence witness. */
export function checkFlipperCutOrder(raw){
  const fs=raw.flippingFilters||[],id=raw.id??null;
  if(!fs.length)return {id,status:'not-applicable',gateResults:[]};
  if((raw.portals||[]).length||(raw.landmarks||[]).some(l=>l.role==='portal'))
    return {id,status:'unsupported',reason:'portal bypasses static cuts',gateResults:[]};
  if(fs.some(f=>f.axis!==1&&f.axis!==2))throw Error('invalid flipper axis');
  const adj=buildGraph(raw),goal=key(raw.goal);
  const gateResults=raw.gates.map(g=>{
    const gate=key(g);
    if(!reach(adj,gate).has(goal))return {gate,verdict:'reject',
      reason:'static-disconnection-existing-connectivity',compulsory:0,flippers:fs.length};
    const compulsory=[];
    for(let i=0;i<fs.length;i++){
      const f=fs[i],cell=key(f),side=reach(adj,gate,cell);
      if(side.has(goal))continue;
      const endSide=reach(adj,goal,cell);
      compulsory.push({cell,declaredAxis:f.axis,axes:allowedAxes(cell,side,endSide),gateSide:side});
    }
    const dead=compulsory.find(c=>c.axes.length===0);
    if(dead)return {gate,verdict:'reject',
      reason:'compulsory-flipper-no-straight-gate-to-goal-transition',
      culprit:dead.cell,compulsory:compulsory.length,flippers:fs.length};
    // For a mandatory flipper f, any flipper visited before f MUST lie on
    // the gate-side of G - f: crossing to its goal-side would already use f,
    // and f is single-use. All *mandatory* flippers on that gate-side must
    // occur before f. If those account for EVERY flipper in that side, rank
    // parity is fixed even when other flippers are optional AFTER f.
    // A flipper in a detached third component cannot precede f either.
    const details=compulsory.map(c=>{
      const definitelyEarlier=compulsory.filter(f=>f.cell!==c.cell&&c.gateSide.has(f.cell)).length;
      const potentiallyEarlier=fs.filter(f=>c.gateSide.has(key(f))).length;
      const rankFixed=definitelyEarlier===potentiallyEarlier;
      const rank=rankFixed?definitelyEarlier:null;
      const requiredAxis=rankFixed
        ?(rank%2===0?c.declaredAxis:c.declaredAxis===1?2:1):null;
      return {cell:c.cell,rank,rankFixed,declaredAxis:c.declaredAxis,
        requiredAxis,allowedAxes:c.axes};
    });
    const conflict=details.find(d=>d.rankFixed&&!d.allowedAxes.includes(d.requiredAxis));
    return {gate,verdict:conflict?'reject':compulsory.length===fs.length?'possible':'unknown',
      reason:conflict?'compulsory-flipper-order-parity-conflict'
        :compulsory.length===fs.length?'cut-order-compatible-not-a-solve'
        :'optional-flippers-can-change-global-parity',
      compulsory:compulsory.length,flippers:fs.length,
      rankFixedMandatory:details.filter(d=>d.rankFixed).length,
      ...(conflict?{culprit:conflict.cell}:{}),details};
  });
  return {id,status:gateResults.every(g=>g.verdict==='reject')?'reject':'unresolved',gateResults,
    note:'Portal-free root necessary condition only; no exact gameplay solve or production authorization.'};
}

export function summarizeFlipperCutOrder(levels){
  const stats={levels:levels.length,flipperLevels:0,portalFreeFlipperLevels:0,
    gateCases:0,atLeastOneCompulsory:0,allCompulsory:0,rankFixedMandatoryGates:0,parityRejectedGates:0,
    geometricRejectedGates:0,staticDisconnectedGates:0,allGatesRejectedLevels:0,
    unsupportedPortalLevels:0};
  const examples=[];
  for(const lv of levels){
    const r=checkFlipperCutOrder(lv);
    if(r.status==='not-applicable')continue;
    stats.flipperLevels++;
    if(r.status==='unsupported'){stats.unsupportedPortalLevels++;continue;}
    stats.portalFreeFlipperLevels++;
    if(r.status==='reject'){stats.allGatesRejectedLevels++;examples.push({id:r.id,gateResults:r.gateResults});}
    for(const g of r.gateResults){
      stats.gateCases++;
      if(g.compulsory>0)stats.atLeastOneCompulsory++;
      if(g.compulsory===g.flippers)stats.allCompulsory++;
      if(g.rankFixedMandatory>0)stats.rankFixedMandatoryGates++;
      if(g.reason==='compulsory-flipper-order-parity-conflict')stats.parityRejectedGates++;
      if(g.reason==='compulsory-flipper-no-straight-gate-to-goal-transition')stats.geometricRejectedGates++;
      if(g.reason==='static-disconnection-existing-connectivity')stats.staticDisconnectedGates++;
    }
  }
  return {schema:'pathfinder.flipper-cut-order-preflight/v1',stats,examples:examples.slice(0,12),
    disclaimer:'Static root necessary-condition model only; no gameplay solves or production claims.'};
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
  const file=process.argv.slice(2).find(x=>x.startsWith('--corpus='))?.slice(9)||'data/levels.json';
  const doc=JSON.parse(readFileSync(resolve(file),'utf8'));
  const levels=Array.isArray(doc)?doc:doc.levels;
  if(!Array.isArray(levels))throw Error('corpus must be array or {levels:[]}');
  console.log(JSON.stringify({...summarizeFlipperCutOrder(levels),corpus:file},null,2));
}
