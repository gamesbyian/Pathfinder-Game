import assert from 'node:assert/strict';
import { buildRelaxedGraph, decodeIncidence, checkWalkSyndrome } from './path-parity-decode-preflight.mjs';

const p=(x,y)=>({x,y});
const level=(w,h,gate,goal,extra={})=>({
  grid:{w,h},gates:[gate],goal,reqLen:4,reqInt:0,...extra
});

// A pendant bridge is traversed twice: parity EVEN does NOT mean unused.
const pendant=level(3,2,p(1,1),p(3,1),{blocks:[p(1,2),p(3,2)]});
const a=decodeIncidence(pendant);
assert.equal(a.status,'relaxation-only');
assert.equal(a.bridges,3);
assert.deepEqual(a.gateResults[0].forcedOdd,['1,1--2,1','2,1--3,1']);
assert.deepEqual(a.gateResults[0].forcedEven,['2,1--2,2']);
const witness=['1,1','2,1','2,2','2,1','3,1'];
const checked=checkWalkSyndrome(buildRelaxedGraph(pendant),witness);
assert.equal(checked.valid,true);
assert.equal(checked.parity.reduce((n,x)=>n+x,0),2);
assert.equal(checked.parity[2],0);

// On a cycle, incidence equations leave every edge parity undetermined.
const square=level(2,2,p(1,1),p(2,2));
const b=decodeIncidence(square);
assert.equal(b.rank,3);
assert.equal(b.nullity,1);
assert.equal(b.bridges,0);
assert.equal(b.gateResults[0].parityFreeCount,4);
assert.deepEqual(b.gateResults[0].forcedOdd,[]);
assert.equal(b.gateResults[0].lengthParityCompatible,true);
assert.equal(decodeIncidence({...square,reqLen:3}).gateResults[0].lengthParityCompatible,false);

// Enumerate all graph walks of at most six steps on these tiny boards:
// every one must satisfy the binary incidence syndrome, including revisits.
for(const raw of [pendant,square]) {
  const g=buildRelaxedGraph(raw);
  for(const start of g.vertices) {
    const enumerate=(walk,depth)=>{
      assert.equal(checkWalkSyndrome(g,walk).valid,true);
      if(depth===6) return;
      const u=g.vertices.indexOf(walk.at(-1));
      for(const [v] of g.adj[u]) enumerate([...walk,g.vertices[v]],depth+1);
    };
    enumerate([start],0);
  }
}

// Disconnected graph: gate reachability is per alternative gate, not global.
const split=level(3,1,p(1,1),p(3,1),{
  blocks:[p(2,1)],gates:[p(1,1),p(3,1)]
});
const c=decodeIncidence(split);
assert.equal(c.components,2);assert.equal(c.rank,0);assert.equal(c.nullity,0);
assert.equal(c.gateResults[0].connected,false);
assert.equal(c.gateResults[1].connected,true);

// Portal jumps omitted by the model MUST abstain; filter/cross obligations
// only restrict ordinary adjacency, so ignoring them is an explicit superset.
assert.equal(decodeIncidence({...square,portals:[{x1:1,y1:1,x2:2,y2:2}]}).status,'unsupported');
assert.deepEqual(decodeIncidence({...square,filters:[p(1,2)],mustCross:[p(2,1)]}).ignoredRestrictions,['filters','mustCross']);
assert.throws(()=>checkWalkSyndrome(buildRelaxedGraph(square),['1,1','2,2']),/non-edge/);
assert.throws(()=>decodeIncidence({...square,gates:[]}),/missing gate/);

console.log('algebraic incidence preflight tiny proof and adversarial cases passed');

// Independent GF(2) truth-table oracle: enumerate EVERY small edge-parity
// assignment and compare actual incidence solutions to inferred bridge fixings.
for(const raw of [pendant,square]) {
  const graph=buildRelaxedGraph(raw);
  assert(graph.edges.length<=10);
  const start=graph.gates[0],goal=graph.goal;
  const expected=new Uint8Array(graph.vertices.length);
  expected[start]^=1;expected[goal]^=1;
  const solutions=[];
  for(let mask=0;mask<2**graph.edges.length;mask++) {
    const syndrome=new Uint8Array(graph.vertices.length);
    graph.edges.forEach(([u,v],i)=>{
      if((mask&(1<<i))!==0){syndrome[u]^=1;syndrome[v]^=1;}
    });
    if(syndrome.every((v,i)=>v===expected[i])) solutions.push(mask);
  }
  assert.equal(solutions.length,2**decodeIncidence(raw).nullity);
  const projection=decodeIncidence(raw).gateResults[0];
  graph.edges.forEach(([u,v],e)=>{
    const fixedOdd=solutions.every(mask=>(mask&(1<<e))!==0);
    const fixedEven=solutions.every(mask=>(mask&(1<<e))===0);
    const label=graph.vertices[u]+'--'+graph.vertices[v];
    assert.equal(projection.forcedOdd.includes(label),fixedOdd);
    assert.equal(projection.forcedEven.includes(label),fixedEven);
  });
}
