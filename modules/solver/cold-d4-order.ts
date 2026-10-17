/**
 * Research-only canonical candidate enumeration from present puzzle mechanics.
 * No level ID, history, hint, family provenance, recorded solution, or prior outcome.
 *
 * This does not prune: it only resolves orientation-dependent ordering ties in
 * getNeighbors. Non-square or genuinely symmetric current-input sketches abstain.
 */
import { transformPoint } from '../domain/geometry.js';
import type { NormalizedLevel } from '../domain/types.js';

type Token = { tag: string; key: number };

function currentInputTokens(level: NormalizedLevel): Token[] {
    const tokens: Token[] = [];
    const add = (tag: string, key: number): void => {
        if (Number.isInteger(key) && key >= 0) tokens.push({tag, key});
    };
    const many = (tag: string, keys: Iterable<number>): void => {
        for (const key of keys) add(tag, key);
    };
    add('O', level.goalKey);
    many('G', level.gateKeys);
    many('B', level.blockSet);
    many('E', level.gooseSet);
    many('Z', level.falseGoalKeys);
    many('P', level.mustPassKeys);
    many('X', level.mustCrossKeys);
    many('F', level.filterMap.keys());
    many('f', level.flippingFilterMap.keys());
    const portalEndpoints = new Set<number>();
    for (const [entry, exit] of level.portalMap) {
        portalEndpoints.add(entry);
        portalEndpoints.add(exit.dest);
    }
    many('T', portalEndpoints);
    if (level.landmarkMeta) many('L', level.landmarkMeta.keys());
    if (level.surroundKeys) many('S', level.surroundKeys);
    if (level.adjacentTurnKeys) many('A', level.adjacentTurnKeys);
    if (level.mustPassTurnDirs) many('U', level.mustPassTurnDirs.keys());
    return tokens;
}
function point(key: number, orientation: number, w: number, h: number): { x:number; y:number } {
    const { tx, ty } = transformPoint(key & 0xFFFF, key >>> 16, orientation, w, h);
    return { x:tx, y:ty };
}
function signature(tokens: Token[], orientation: number, w: number, h: number): string {
    return tokens.map(({tag,key}) => {
        const {x,y}=point(key,orientation,w,h);
        return tag+':'+String(x).padStart(3,'0')+','+String(y).padStart(3,'0');
    }).sort().join('|');
}

export type ColdD4CandidateOrder = {
    orientation: number;
    featureTokenCount: number;
    rank: (from: number, candidate: number) => number;
};
export function currentInputColdD4CandidateOrder(level: NormalizedLevel): ColdD4CandidateOrder | null {
    const w=level.grid.w,h=level.grid.h;
    if (!Number.isInteger(w) || w < 2 || w !== h || !Number.isInteger(level.goalKey) || level.goalKey < 0) return null;
    const tokens=currentInputTokens(level);
    if (!tokens.length) return null;
    const variants=Array.from({length:8},(_,orientation)=>signature(tokens,orientation,w,h));
    const minimum=variants.reduce((min,next)=>next<min?next:min);
    const minimizers=variants.flatMap((value,i)=>value===minimum?[i]:[]);
    if (minimizers.length!==1) return null;
    const orientation=minimizers[0];
    const rank=(from:number,candidate:number):number=>{
        const a=point(from,orientation,w,h),b=point(candidate,orientation,w,h);
        const dx=b.x-a.x,dy=b.y-a.y;
        if(dx===1&&dy===0)return 0;  // canonical E
        if(dx===-1&&dy===0)return 1; // W
        if(dx===0&&dy===1)return 2;  // S
        if(dx===0&&dy===-1)return 3; // N
        return 4; // portal jump: ordinarily a singleton
    };
    return {orientation,featureTokenCount:tokens.length,rank};
}
