/**
 * PG-L research-only entire-reach-bitset restoration correctness.
 * The default-off replay must reproduce fresh _reached() semantics from BOTH
 * cardinal/portal and used-state-sensitive floods before any hot-path reuse.
 */
import assert from 'node:assert/strict';
import {test} from 'vitest';
import {PACK} from './encoding.js';
import {normalizeRawLevel} from './normalization.js';
import {prepLevel} from './prep.js';
import {createState,applyMove} from './search-state.js';
import {
  isConnected,connectivityReachRowsForResearch,
  restoreConnectivityReachRowsForExperiment,connectivityResearchSnapshot,
} from './topology.js';

const K=(x:number,y:number)=>PACK(x-1,y-1);
function level(){
  return normalizeRawLevel({
    grid:{w:5,h:4},gates:[{x:1,y:1}],goal:{x:5,y:4},
    reqLen:7,reqInt:0,blocks:[{x:3,y:1},{x:3,y:3}],
    geese:[],falseGoals:[],mustPass:[{x:4,y:2}],mustCross:[],
    filters:[],flippingFilters:[],portals:[],landmarks:[],hints:[],
  });
}
test('complete connected reachable rows restore to same instant graph without canonical charges',()=>{
  const board=level(),prep=prepLevel(board);
  const state=createState(K(1,1),board,prep),pos=K(1,1);
  assert.equal(isConnected(pos,state,board,prep),true);
  const rows=connectivityReachRowsForResearch(board);
  const before=connectivityResearchSnapshot(pos,state,board,prep,true);
  // A different actual flood necessarily clobbers global reached-row scratch.
  const other=createState(K(1,1),board,prep);
  applyMove(K(2,1),other,board,prep,false);
  isConnected(K(2,1),other,board,prep);
  const work=prep._workMeter.units;
  restoreConnectivityReachRowsForExperiment(board,rows);
  assert.equal(prep._workMeter.units,work,'restoring scratch must have zero canonical cost');
  assert.deepEqual(connectivityReachRowsForResearch(board),rows,'exact row bitmap restored');
  const after=connectivityResearchSnapshot(pos,state,board,prep,true);
  assert.equal(after.connected,before.connected);
  assert.deepEqual(after.nodes,before.nodes,'restored BC1 access sees same fresh reachability');
  assert.deepEqual(after.edges,before.edges,'restored reach relation preserves graph edges');
  assert.deepEqual(after.pendingMandatory,before.pendingMandatory);
});
test('scratch restore refuses wrong dimensions and out-of-board rows before mutation',()=>{
  const board=level(),prep=prepLevel(board);
  const state=createState(K(1,1),board,prep);
  isConnected(K(1,1),state,board,prep);
  const rows=connectivityReachRowsForResearch(board);
  assert.throws(()=>restoreConnectivityReachRowsForExperiment(board,[1]),/dimension/);
  assert.throws(()=>restoreConnectivityReachRowsForExperiment(board,rows.map(()=>1<<12)),/invalid bits/);
  assert.deepEqual(connectivityReachRowsForResearch(board),rows);
});
