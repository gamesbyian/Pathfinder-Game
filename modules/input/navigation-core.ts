// Pure decision logic extracted from navigation-controller (DOM-free, unit-tested):
// level/submission index wrapping, the unsaved-changes guard, and gamepad focus-index math.

/** Previous index with wraparound: first → last. Returns 0 for an empty list. */
export function prevIndexWrap(idx: number, count: number): number {
    if (count <= 0) return 0;
    return idx > 0 ? idx - 1 : count - 1;
}

/** Next index with wraparound: last → first. Returns 0 for an empty list. */
export function nextIndexWrap(idx: number, count: number): number {
    if (count <= 0) return 0;
    return idx < count - 1 ? idx + 1 : 0;
}

export function validIndexWrap(idx: number, count: number, delta: number, isValid: (idx: number) => boolean): number {
    if (count <= 0) return 0;
    const direction = delta < 0 ? -1 : 1;
    for (let step = 1; step <= count; step += 1) {
        const candidate = (idx + (direction * step) + count) % count;
        if (isValid(candidate)) return candidate;
    }
    return 0;
}

/** Navigating away needs the unsaved-changes guard only in the editor with pending edits. */
export function needsUnsavedGuard(mode: number, isModified: boolean, editorMode: number): boolean {
    return mode === editorMode && !!isModified;
}

/** Clamp a focus index into a group of `len` elements (>= 0). */
export function clampFocusIndex(index: number, len: number): number {
    if (len <= 0) return 0;
    return Math.max(0, Math.min(index, len - 1));
}

/** Advance to the next focus group with wraparound. */
export function nextGroupIndex(currentIdx: number, len: number): number {
    if (len <= 0) return 0;
    return (currentIdx + 1 + len) % len;
}

/** Move within a focus group by `delta`, wrapping in both directions. */
export function wrapWithinGroup(focusIndex: number, delta: number, len: number): number {
    if (len <= 0) return 0;
    return (focusIndex + delta + len) % len;
}
