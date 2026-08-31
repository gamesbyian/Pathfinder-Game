/**
 * Clone arbitrary application data without coupling callers to the former core facade.
 *
 * structuredClone preserves richer browser/runtime values when available; the JSON fallback is
 * intentionally retained for the existing plain-data call sites and older environments.
 */
export function deepClone<T>(value: T): T {
    try { return structuredClone(value); }
    catch (_: unknown) { return JSON.parse(JSON.stringify(value)); }
}
