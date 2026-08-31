import { parseRawLevel } from './domain/level-codec.js';
import { validateRawLevel } from './domain/level-schema.js';
import { defaultReportError } from './error-reporting.js';
import type { DataService, ReportError } from './ports.js';
import type { EngineLevel } from './domain/level-schema.js';

/**
 * Application data boundary for turning one stored raw level into the runtime EngineLevel shape.
 * Raw validation remains diagnostic: parseable published levels are not rejected solely because a
 * newer client reports stricter validation errors.
 */
export function normalizeLevelFromData(
    data: DataService,
    idx: number,
    reportError: ReportError = defaultReportError,
): EngineLevel | null {
    const levels = data.getLevels();
    if (idx < 0 || idx >= levels.length) return null;
    const raw = levels[idx];
    if (!raw) return null;

    const validation = validateRawLevel(raw);
    if (!validation.ok) {
        reportError('level.validation', validation.errors, { levelNumber: idx + 1 });
    }

    const level = parseRawLevel(raw, idx);
    if (!level) {
        if (validation.ok) reportError('level.validation', ['parse failed'], { levelNumber: idx + 1 });
        return null;
    }

    Object.freeze(level.grid);
    Object.freeze(level.gateKeys);
    Object.freeze(level.mustPassKeys);
    Object.freeze(level.mustCrossKeys);
    Object.freeze(level.hints);
    Object.freeze(level.portalVisuals);
    Object.freeze(level);
    return level;
}
