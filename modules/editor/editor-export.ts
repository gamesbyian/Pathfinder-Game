// Pure level serialization for the Pathfinder editor.
// Converts a normalized level object to the compact JSON-like string (wire format).

import { buildWireLevelData } from '../domain/level-codec.js';

/**
 * Serializes a normalized level to the wire format used in data/levels.json.
 * `requiredLength`, `requiredIntersections`, and `exportedHints` are passed explicitly (read from UI by the caller).
 * Returns a JSON-like string with no outer braces and no whitespace.
 */
export function serializeLevel(level: any, requiredLength: number, requiredIntersections: number, exportedHints: any): string {
    const out = buildWireLevelData(level, { requiredLength, requiredIntersections, hints: exportedHints });
    return JSON.stringify(out).replace(/\"([^\"]+)\":/g, '$1:').replace(/\s/g, '').slice(1, -1);
}
