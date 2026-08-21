import assert from 'node:assert/strict';
import { familyMetadataOf, summarizeFamilyWinningAttempts } from './winning-attempt-family-lib.mjs';
const levels=[
 {id:'v1',parentId:'P2',mode:'swap',ok:true,attempts:[{ok:false},{ok:true,config:'b',workSpent:10,elapsedMs:999}]},
 {id:'v2',parentId:'P1',mode:'swap',ok:true,attempts:[{ok:true,config:'a',workSpent:30}]},
 {id:'v3',parentId:'P1',mode:'move',ok:true,attempts:[{ok:true,config:'a',nodesExpanded:20}]},
 {id:'v4',parentId:'P1',mode:'move',ok:true,attempts:[{ok:true,config:'b',elapsedMs:40}]},
];
levels.push({id:'v5',parentId:'P3',mode:'move',ok:true,attempts:[{ok:true,config:'c',workSpent:null,nodesExpanded:12}]});
const byParent=summarizeFamilyWinningAttempts(levels,{groupBy:'parentId'});
assert.deepEqual(byParent.map(x=>x.group),['P1','P2','P3']);
assert.equal(byParent[0].solvedVariantCount,3);
assert.equal(byParent[0].winnerConcentration,2/3);
assert.ok(byParent[0].winnerEntropyBits>0);
assert.equal(byParent[1].medianWinningWork,10);
assert.equal(byParent[1].winningWorkUnit,'workSpent');assert.deepEqual(byParent[1].workAvailability,{workSpent:1,nodesExpanded:0,elapsedMs:1});
assert.equal(byParent[2].winningWorkUnit,'nodesExpanded');assert.equal(byParent[2].medianWinningWork,12);
assert.equal(byParent[0].winningWorkUnit,'workSpent');assert.equal(byParent[0].winningWorkSampleCount,1);assert.equal(byParent[0].medianWinningWork,30);
assert.deepEqual(summarizeFamilyWinningAttempts(levels,{groupBy:'mode'}).map(x=>x.group),['move','swap']);
assert.deepEqual(summarizeFamilyWinningAttempts(levels,{groupBy:'parentId+mode'}).map(x=>x.group),['P1|move','P1|swap','P2|swap','P3|move']);
assert.deepEqual(familyMetadataOf({provenance:{history:[{detail:{parentLevelId:'PX',relation:'density-sweep'}}]}}),{parentId:'PX',mode:'density-sweep'});
console.log('winning-attempt-family-lib: all tests passed');
