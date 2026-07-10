// A minimal open-addressing hash map for non-negative integer keys -> non-negative number
// values, used by lower-bounds.ts's mustPassLowerBound/mustCrossLowerBound memoization caches
// (see docs/solver-architecture.md's memory-bandwidth section). Backed by parallel TypedArrays
// instead of a native Map, avoiding the per-entry bookkeeping (insertion-order-preserving
// linked structure) V8's Map maintains that a pure memoization cache doesn't need.
//
// Why not a plain flat array indexed directly by key: the cache keys are a (pos, mask)
// composite (see lower-bounds.ts's cacheKey formulas) that can reach ~1.76e13 — a dense
// array at that size is obviously not viable. A hash table maps that sparse key space down
// to a small number of buckets, same as Map does internally, but without Map's per-entry
// object/bookkeeping overhead.
//
// Keys must be non-negative integers representable exactly as a JS double (safe up to 2^53;
// the largest cache key in practice is ~1.76e13, well within that). -1 is the empty-slot
// sentinel (no real key is ever negative). Values may be any non-negative finite number or
// Infinity (used for provably-unreachable bounds) — never NaN or negative, not needed by any
// caller. Grows (full rehash, doubling capacity) once the load factor would exceed 0.7.
const EMPTY_KEY = -1;
const MAX_LOAD_FACTOR = 0.7;

function nextPow2(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
}

// key can exceed 32 bits (up to ~1.76e13) — split into low/high 32-bit halves and mix both
// with Math.imul, since a plain `key | 0` would silently truncate the high bits and cluster
// unrelated keys into the same bucket. Standard finalizer-style bit mixing (fmix32-ish).
function hashIndex(key: number, mask: number): number {
    const lo = (key % 4294967296) | 0;
    const hi = Math.floor(key / 4294967296) | 0;
    let h = (Math.imul(lo, 0x85ebca6b) ^ Math.imul(hi, 0xc2b2ae35)) | 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) & mask;
}

export class IntHashMap {
    private keys: Float64Array;
    private values: Float64Array;
    private capacity: number;
    private count: number;

    constructor(initialCapacity = 1024) {
        this.capacity = nextPow2(Math.max(8, initialCapacity));
        this.keys = new Float64Array(this.capacity).fill(EMPTY_KEY);
        this.values = new Float64Array(this.capacity);
        this.count = 0;
    }

    get(key: number): number | undefined {
        const mask = this.capacity - 1;
        let idx = hashIndex(key, mask);
        while (this.keys[idx] !== EMPTY_KEY) {
            if (this.keys[idx] === key) return this.values[idx];
            idx = (idx + 1) & mask;
        }
        return undefined;
    }

    set(key: number, value: number): void {
        if (this.count + 1 > this.capacity * MAX_LOAD_FACTOR) this.grow();
        const mask = this.capacity - 1;
        let idx = hashIndex(key, mask);
        while (this.keys[idx] !== EMPTY_KEY) {
            if (this.keys[idx] === key) { this.values[idx] = value; return; }
            idx = (idx + 1) & mask;
        }
        this.keys[idx] = key;
        this.values[idx] = value;
        this.count++;
    }

    get size(): number {
        return this.count;
    }

    private grow(): void {
        const oldKeys = this.keys, oldValues = this.values, oldCap = this.capacity;
        this.capacity *= 2;
        this.keys = new Float64Array(this.capacity).fill(EMPTY_KEY);
        this.values = new Float64Array(this.capacity);
        this.count = 0;
        const mask = this.capacity - 1;
        for (let i = 0; i < oldCap; i++) {
            const k = oldKeys[i];
            if (k === EMPTY_KEY) continue;
            let idx = hashIndex(k, mask);
            while (this.keys[idx] !== EMPTY_KEY) idx = (idx + 1) & mask;
            this.keys[idx] = k;
            this.values[idx] = oldValues[i];
            this.count++;
        }
    }
}
