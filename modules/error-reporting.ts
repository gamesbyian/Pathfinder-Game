// The app's single error-reporting seam (hardening plan §4).
//
// Every failure path in the adapter/controller layers routes through `reportError(context, err,
// meta?)` instead of ad-hoc `console.error`/`console.warn`, so real player-side failures (a failed
// submission save, an auth hiccup, an unexpected rejection) surface in exactly one intentional
// place. The default sink logs to the console — same visibility as before, but now swappable: the
// composition root can later point `onReport` at a real sink (a Firestore collection, a lightweight
// endpoint) without touching any call site. Bundled by Vite, no CDN dependency, CSP-clean.
//
// Reporting is diagnostic-only by convention: pass the operation name and the error (message/
// stack), never user content or credentials. The reporter itself must never throw into the
// failure path it is observing.

import type { ReportError } from './ports.js';

type ReporterOptions = {
    sink?: (context: string, err: unknown, meta?: Record<string, unknown>) => void;
    onReport?: ((context: string, err: unknown, meta?: Record<string, unknown>) => void) | null;
};

function consoleSink(context: string, err: unknown, meta?: Record<string, unknown>) {
    if (meta !== undefined) console.error(`[Error] ${context}`, err, meta);
    else console.error(`[Error] ${context}`, err);
}

export function createErrorReporter({ sink = consoleSink, onReport = null }: ReporterOptions = {}) {
    const report: ReportError = (context, err, meta) => {
        try {
            sink(context, err, meta);
            if (onReport) onReport(context, err, meta);
        } catch (_: any) {
            // The reporter must never throw into the failure path it is observing. A broken
            // sink has no further channel to report through — this is the one deliberate
            // swallow in the codebase.
        }
    };

    // Top-level runtime hooks (window `error` / `unhandledrejection`) reach this seam through
    // the loader: it already listens on both to fail the loading overlay, and its `fail()`
    // routes every failure — window events included — through the injected `reportError`.
    return { report };
}

// Fallback instance for factories constructed without an injected reporter (tests, tools).
// The composition root always injects its own instance; this keeps `reportError` an optional
// dependency everywhere without reintroducing scattered `console.*` calls.
export const defaultReportError: ReportError = createErrorReporter().report;
