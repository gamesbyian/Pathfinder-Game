export function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}

export function mulberry32(seed) {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function seededRng(seedString) {
    const hash = xmur3(seedString);
    return mulberry32(hash());
}

export function sampleDistinctIndices(count, requested, seedString) {
    if (!Number.isInteger(count) || count < 0) throw new Error('count must be a non-negative integer');
    if (!Number.isInteger(requested) || requested < 0) throw new Error('requested must be a non-negative integer');
    const rng = seededRng(seedString);
    const indices = Array.from({ length: count }, (_, index) => index);
    const take = Math.min(requested, count);
    for (let i = 0; i < take; i++) {
        const j = i + Math.floor(rng() * (count - i));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, take);
}

export function reconstructBeamPath(node) {
    const length = node.depth + 1;
    const path = new Array(length);
    let current = node;
    for (let index = length - 1; index >= 0; index--) {
        if (!current) throw new Error('beam node parent chain ended before declared depth');
        path[index] = current.key;
        current = current.prev;
    }
    return path;
}

export function frontierAncestryKey({
    corpus,
    levelId,
    profile,
    width,
    depth,
    seed,
}) {
    return [corpus, levelId, 'beam-frontier', profile, `width=${width}`, `depth=${depth}`, `seed=${seed}`].join('|');
}
