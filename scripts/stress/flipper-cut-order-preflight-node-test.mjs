import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFlipperCutOrder, summarizeFlipperCutOrder } from './flipper-cut-order-preflight.mjs';

function corridor(axes,{extraOptional=false,portal=false}={}){
  const w=axes.length+2,h=3,blocks=[];
  for(let x=1;x<=w;x++)for(const y of [1,3]){
    if(extraOptional&&x===2&&y===1)continue;
    blocks.push({x,y});
  }
  return {id:'synthetic',grid:{w,h},gates:[{x:1,y:2}],goal:{x:w,y:2},
    blocks,reqLen:w-1,reqInt:0,flippingFilters:[
      ...axes.map((axis,i)=>({x:i+2,y:2,axis})),
      ...(extraOptional?[{x:2,y:1,axis:1}]:[])
    ],...(portal?{portals:[{x1:1,y1:1,x2:w,y2:3}]}:{})};
}

function independentExactCorridorOracle(axes){
  // At reqLen=distance and reqInt=0 the unique available route is straight
  // through the flippers, in left-to-right order. Each visit flips parity.
  return axes.every((init,i)=>(i%2===0?init:init===1?2:1)===1);
}

test('exhaustive H/V declared axes for 1..5 mandatory flippers',()=>{
  for(let n=1;n<=5;n++)for(let bits=0;bits<(1<<n);bits++){
    const axes=Array.from({length:n},(_,i)=>(bits&(1<<i))?2:1);
    const r=checkFlipperCutOrder(corridor(axes));
    assert.equal(r.status==='reject',!independentExactCorridorOracle(axes),
      JSON.stringify({axes,result:r}));
    assert.equal(r.gateResults[0].details.length,n);
    for(const d of r.gateResults[0].details){
      assert.deepEqual(d.allowedAxes,[1]);
      assert.equal(d.rank,Number(d.cell.split(',')[0])-2);
    }
  }
});

test('optional flipper must abstain on global order',()=>{
  const r=checkFlipperCutOrder(corridor([1,1],{extraOptional:true}));
  assert.equal(r.status,'unresolved');
  assert.equal(r.gateResults[0].reason,'optional-flippers-can-change-global-parity');
});

test('mandatory first flipper parity remains fixed with optional flippers beyond its cut',()=>{
  const lv=corridor([2,1],{extraOptional:true});
  const result=checkFlipperCutOrder(lv);
  assert.equal(result.status,'reject', 'optional elsewhere cannot repair first-flipper V versus forced H');
  const head=result.gateResults[0].details.find(d=>d.cell==='2,2');
  assert.equal(head.rankFixed,true);
  assert.equal(head.rank,0);
  assert.deepEqual(head.allowedAxes,[1]);
  assert.equal(head.requiredAxis,2);
});

test('portals disable ordinary-graph-cut inference',()=>{
  const r=checkFlipperCutOrder(corridor([1,1],{portal:true}));
  assert.equal(r.status,'unsupported');
});

test('different gates may have different results; cannot reject level if any gate unresolved',()=>{
  const lv=corridor([1,1]);
  lv.grid.w=6;lv.goal={x:4,y:2};lv.gates.push({x:6,y:2});
  lv.blocks.push({x:5,y:1},{x:6,y:1},{x:5,y:3},{x:6,y:3});
  const r=checkFlipperCutOrder(lv);
  assert.equal(r.gateResults[0].verdict,'reject');
  assert.equal(r.gateResults[1].verdict,'unknown');
  assert.equal(r.status,'unresolved');
});

test('no flippers and summary abstention are explicit',()=>{
  const lv=corridor([1,1]);
  assert.equal(checkFlipperCutOrder({...lv,flippingFilters:[]}).status,'not-applicable');
  const a=summarizeFlipperCutOrder([corridor([1,1]),corridor([1,2]),corridor([1,1],{portal:true})]);
  assert.equal(a.stats.flipperLevels,3);
  assert.equal(a.stats.portalFreeFlipperLevels,2);
  assert.equal(a.stats.unsupportedPortalLevels,1);
  assert.equal(a.stats.parityRejectedGates,1);
});
