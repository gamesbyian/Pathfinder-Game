import type { PrepLevel } from './types.js';

/** Clamp an absolute attempt/stage work cap to the immutable strict whole-solve cap, when present. */
export function boundedWorkCap(prep: PrepLevel, absoluteCap: number): number {
    return Math.min(absoluteCap, prep._strictWorkCap ?? Infinity);
}

/**
 * Temporarily own PrepLevel._workCap for one lexical stage/attempt scope and restore the previous
 * owner even on error. This is a compatibility bridge while search primitives still read the cap
 * from PrepLevel; new direct-stage code should use this instead of open-coded save/set/finally.
 */
export async function withWorkCapScope<T>(
    prep: PrepLevel,
    absoluteCap: number,
    fn: () => Promise<T>,
): Promise<T> {
    const previous = prep._workCap;
    prep._workCap = boundedWorkCap(prep, absoluteCap);
    try {
        return await fn();
    } finally {
        prep._workCap = previous;
    }
}
