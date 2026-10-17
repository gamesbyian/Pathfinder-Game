import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transformPoint } from '../domain/geometry.js';
import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { currentInputColdD4CandidateOrder } from './cold-d4-order.js';
import { defaultConfig } from './ablation-config.js';

const flag='STRATEGY_PGG_COLD_D4_CANDIDATE_ORDER';
const raw={
    grid:{w:5,h:5},
    gates:[{x:1,y:2}],
    goal:{x:5,y:4},
    blocks:[{x:3,y:2},{x:2,y:5}],
    geese:[],falseGoals:[],mustPass:[],mustCross:[],
    filters:[],flippingFilters:[],portals:[],landmarks:[],
    reqLen:12,reqInt:0,
};
const trans=(p:{x:number;y:number},o:number)=> {
    const {tx,ty}=transformPoint(p.x-1,p.y-1,o,5,5);
    return {x:tx+1,y:ty+1};
};
const K=(x:number,y:number)=>PACK(x-1,y-1);
const mapped=(key:number,o:number)=>{
    const {tx,ty}=transformPoint(key&65535,key>>>16,o,5,5);
    return PACK(tx,ty);
};

test('default production configuration excludes PG-G geometric order research',()=>{
    assert.equal(defaultConfig()[flag],false);
});
test('unique current-input canonical frame is equivariant under all D4 orientations',()=>{
    const base=normalizeRawLevel(raw);
    const order=currentInputColdD4CandidateOrder(base);
    assert.ok(order,'fixture needs unique frame');
    const from=K(3,3),neighbors=[K(4,3),K(2,3),K(3,4),K(3,2)];
    const sorted=neighbors.slice().sort((a,b)=>order.rank(from,a)-order.rank(from,b));
    for(let o=0;o<8;o++){
        const rotated=normalizeRawLevel({
            ...raw,
            gates:raw.gates.map(p=>trans(p,o)),
            goal:trans(raw.goal,o),
            blocks:raw.blocks.map(p=>trans(p,o)),
        });
        const next=currentInputColdD4CandidateOrder(rotated);
        assert.ok(next,'unique frame must remain unique under D4');
        const mappedNeighbors=neighbors.map(p=>mapped(p,o));
        const mappedFrom=mapped(from,o);
        assert.deepEqual(mappedNeighbors.slice().sort((a,b)=>next.rank(mappedFrom,a)-next.rank(mappedFrom,b)),
            sorted.map(p=>mapped(p,o)),'orientation should not affect canonical candidate precedence');
    }
});
test('symmetric or non-square sketches abstain',()=>{
    const symmetric=normalizeRawLevel({
      ...raw,blocks:[],gates:[{x:1,y:1}],goal:{x:3,y:3}
    });
    assert.equal(currentInputColdD4CandidateOrder(symmetric),null);
    const rectangular=normalizeRawLevel({
      ...raw,grid:{w:5,h:3},gates:[{x:1,y:1}],goal:{x:5,y:3},blocks:[]
    });
    assert.equal(currentInputColdD4CandidateOrder(rectangular),null);
});
