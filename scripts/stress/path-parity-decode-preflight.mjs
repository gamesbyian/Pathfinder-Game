#!/usr/bin/env node
/**
 * Research-only GF(2) incidence relaxation. NEVER a Pathfinder solver/prune.
 * See docs/solver-algebraic-decoding-research-plan.md.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const key = p => p.x + ',' + p.y;
const coord = k => k.split(',').map(Number);
const impassableLandmarks = new Set(['surround', 'adjacentTurn', 'adjacentTurnCw', 'adjacentTurnCcw', 'decorative']);

export function buildRelaxedGraph(raw) {
  if (!raw?.grid || !Number.isInteger(raw.grid.w) || !Number.isInteger(raw.grid.h) || raw.grid.w < 1 || raw.grid.h < 1) throw Error('invalid grid');
  if (!Array.isArray(raw.gates) || !raw.gates.length || !raw.goal) throw Error('missing gate or goal');
  if ((raw.portals || []).length || (raw.landmarks || []).some(l => l.role === 'portal')) {
    return { supported:false, reason:'portal transition unsupported by local-edge incidence model' };
  }
  const blocked = new Set();
  for (const field of ['blocks','geese','falseGoals']) for (const p of raw[field] || []) blocked.add(key(p));
  for (const p of raw.landmarks || []) if (impassableLandmarks.has(p.role)) blocked.add(key(p));
  const vertices = [], ids = new Map();
  for (let y=1; y<=raw.grid.h; y++) for (let x=1; x<=raw.grid.w; x++) {
    const k=x+','+y;
    if (!blocked.has(k)) { ids.set(k, vertices.length); vertices.push(k); }
  }
  const edges=[], adj=vertices.map(()=>[]);
  for (let u=0; u<vertices.length; u++) {
    const [x,y]=coord(vertices[u]);
    for (const k of [(x+1)+','+y,x+','+(y+1)]) {
      const v=ids.get(k);
      if (v===undefined) continue;
      const e=edges.length;
      edges.push([u,v]); adj[u].push([v,e]); adj[v].push([u,e]);
    }
  }
  const gates=raw.gates.map(g=>ids.get(key(g))), goal=ids.get(key(raw.goal));
  if (goal===undefined || gates.some(g=>g===undefined)) throw Error('gate/goal on impassable cell');
  const ignoredRestrictions=['filters','flippingFilters','flippers','mustPass','mustCross','landmarks','mustTurn','adjacentTurn']
    .filter(f=>(raw[f] || []).length>0);
  return {supported:true,vertices,edges,adj,gates,goal,ignoredRestrictions};
}

function reachable(adj,origin,excluded=-1) {
  const seen=new Uint8Array(adj.length),q=[origin]; seen[origin]=1;
  for (let i=0;i<q.length;i++) for (const [v,e] of adj[q[i]]) {
    if (e!==excluded && !seen[v]) {seen[v]=1;q.push(v);}
  }
  return seen;
}

export function decodeIncidence(raw) {
  const g=buildRelaxedGraph(raw);
  if (!g.supported) return {id:raw?.id??null,status:'unsupported',reason:g.reason};
  const {vertices,edges,adj,gates,goal}=g;
  const marked=new Uint8Array(vertices.length);
  let components=0;
  for (let u=0;u<vertices.length;u++) {
    if (marked[u]) continue;
    components++;
    const seen=reachable(adj,u);
    seen.forEach((v,i)=>{if(v) marked[i]=1;});
  }
  // Each bridge is the only edge crossing one cut and therefore has fixed
  // traversal parity; a nonbridge edge belongs to a cycle and is GF(2)-free.
  const bridges=[];
  for (let e=0;e<edges.length;e++) {
    const side=reachable(adj,edges[e][0],e);
    if (!side[edges[e][1]]) bridges.push({e,side});
  }
  const gateResults=gates.map((start,gateIndex)=>{
    const connected=!!reachable(adj,start)[goal];
    const [sx,sy]=coord(vertices[start]),[tx,ty]=coord(vertices[goal]);
    const n=raw.reqLen??raw.requiredLength;
    const lengthParityCompatible=Number.isInteger(n)?(n-Math.abs(sx-tx)-Math.abs(sy-ty))%2===0:null;
    const forcedOdd=[],forcedEven=[];
    if (connected) for (const {e,side} of bridges) {
      const description=edges[e].map(i=>vertices[i]).join('--');
      (side[start]!==side[goal]?forcedOdd:forcedEven).push(description);
    }
    return {gateIndex,gate:vertices[start],connected,lengthParityCompatible,forcedOdd,forcedEven,
      parityFreeCount:edges.length-bridges.length};
  });
  return {id:raw.id??null,status:'relaxation-only',model:'GF2-vertex-edge-incidence/portal-free-v1',
    vertices:vertices.length,edges:edges.length,components,rank:vertices.length-components,
    nullity:edges.length-vertices.length+components,bridges:bridges.length,
    ignoredRestrictions:g.ignoredRestrictions,gateResults,
    note:'Even-parity edge can be used twice. No legal solution, forced move or new prune is established.'};
}

export function checkWalkSyndrome(graph,walk) {
  if (!graph.supported) throw Error('unsupported graph');
  if (!Array.isArray(walk)||!walk.length) throw Error('empty walk');
  const ids=new Map(graph.vertices.map((v,i)=>[v,i]));
  const syndrome=new Uint8Array(graph.vertices.length), parity=new Uint8Array(graph.edges.length);
  for(let i=1;i<walk.length;i++) {
    const u=ids.get(walk[i-1]),v=ids.get(walk[i]);
    if(u===undefined||v===undefined) throw Error('walk outside graph');
    const pair=graph.adj[u].find(([n])=>n===v);
    if(!pair) throw Error('non-edge step');
    parity[pair[1]]^=1;syndrome[u]^=1;syndrome[v]^=1;
  }
  const expected=new Uint8Array(graph.vertices.length);
  expected[ids.get(walk[0])]^=1;expected[ids.get(walk.at(-1))]^=1;
  return {valid:syndrome.every((v,i)=>v===expected[i]),parity:[...parity],syndrome:[...syndrome]};
}

function main() {
  const arg=(name,def)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)??def;
  const corpus=arg('corpus','data/levels.json'),limit=Number(arg('limit','12'));
  if(!Number.isSafeInteger(limit)||limit<1||limit>10000) throw Error('--limit must be integer 1..10000');
  const doc=JSON.parse(readFileSync(resolve(corpus),'utf8'));
  const levels=Array.isArray(doc)?doc:doc.levels;
  if(!Array.isArray(levels)) throw Error('corpus must be array or {levels:[]}');
  const rows=levels.slice(0,limit).map(decodeIncidence);
  const supported=rows.filter(r=>r.status==='relaxation-only');
  console.log(JSON.stringify({schema:'pathfinder.algebraic-incidence-preflight/v1',corpus,
    selected:rows.length,supported:supported.length,unsupported:rows.length-supported.length,
    disclaimer:'Structural parity relaxation only, not solves or new pruning.',rows},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {main();} catch(err) {console.error(err);process.exitCode=1;}
}
