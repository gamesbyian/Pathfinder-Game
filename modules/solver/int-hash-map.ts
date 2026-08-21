// Minimal open-addressing map for non-negative integer keys/values, used by lower-bound memoization.
// Float64 keys support the sparse composite-key range exactly; -1 is the empty sentinel. TypedArrays
// avoid native Map bookkeeping. Grows at 0.7 load factor.
const EMPTY_KEY = -1;
const MAX_LOAD_FACTOR = 0.7;

function nextPow2(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
}

/** Mix both 32-bit halves because memo keys exceed 32 bits. */
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
