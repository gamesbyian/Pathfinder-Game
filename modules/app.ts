import { createSolver }    from './solver.js';
import { createDebug }       from './debug.js';
import { createUI }          from './ui.js';
import { createData }        from './data.js';
import { createLoader }      from './loader.js';
import { createState }       from './state.js';
import { createRenderer }    from './renderer.js';
import { createEngine }      from './engine.js';
import { createEditor }      from './editor.js';
import { createPersistence } from './persistence.js';
import { createThemes }      from './themes.js';
import { createInput }       from './input.js';
import { createBoot, createOnloadHandler } from './boot.js';
import { createErrorReporter } from './error-reporting.js';
import { createAudioService } from './audio-service.js';
import { deepClone } from './deep-clone.js';
import { injectSvgDefs } from './ui/svg-defs.js';
import { renderEditorPaletteItems } from './ui/editor-palette.js';
import { renderGuideCards } from './ui/guide-cards.js';
import { renderSubmitSteps } from './ui/submit-steps.js';
import { injectModalCloseIcons } from './ui/modal-icons.js';
import { markDirty } from './state-actions.js';
// Re-exported so existing importers (boot.ts, tests) keep working unchanged — the definitions
// live in data-asset-loaders.ts so modules/dev-corpus.ts can reuse createDefaultHintsSource
// without importing this whole composition root.
export { createDefaultDataAssetLoader, createDefaultHintsSource } from './data-asset-loaders.js';
import { createDefaultDataAssetLoader, createDefaultHintsSource } from './data-asset-loaders.js';
import { createDevCorpusSwitcher } from './dev-corpus.js';

/**
 * EditorRuntimePort — the narrow engine contract the level editor depends on (modernization
 * plan §1 Phase 1; browser-only port). The editor receives exactly these 9 members, never the
 * whole engine facade, so the editor↔engine coupling is minimal and visible — the editor can't
 * reach into unrelated engine behavior. Resolved lazily by the editor via the injected
 * `getEngineRuntime()` (no post-construction init call — see ADR 0008).
 *
 * @typedef {Object} EditorRuntimePort
 * @property {(mode: string) => void}  switchMode               enter/leave editor vs play/review
 * @property {() => void}              clearHintPaths           drop any displayed hint paths
 * @property {(...args: any[]) => void} updatePencilState       sync pencil/draw affordance to state
 * @property {(state: string) => void} setLogicState            drive the engine state machine
 * @property {(state: string) => void} setOverlayState          drive the overlay state machine
 * @property {() => number}            getRealLength            counted length of the current path
 * @property {() => void}              rebuildDerivedPathState  recompute nav-derived fields from path
 * @property {() => void}              assertStateConsistency   dev invariant check
 * @property {Object}                  PathNavigator            path drawing/navigation sub-controller
 * @param {Object} engine the full engine facade to project a port from
 * @returns {EditorRuntimePort}
 */
export function createEditorEnginePort(engine: any) {
    return {
        switchMode:              engine.switchMode,
        clearHintPaths:          engine.clearHintPaths,
        updatePencilState:       engine.updatePencilState,
        setLogicState:           engine.setLogicState,
        setOverlayState:         engine.setOverlayState,
        getRealLength:           engine.getRealLength,
        rebuildDerivedPathState: engine.rebuildDerivedPathState,
        assertStateConsistency:  engine.assertStateConsistency,
        PathNavigator:           engine.PathNavigator,
    };
}

const DEFAULT_FACTORIES = {
    createSolver,
    createAudioService,
    createDebug,
    createUI,
    createData,
    createLoader,
    createState,
    createRenderer,
    createEngine,
    createEditor,
    createPersistence,
    createThemes,
    createInput,
    createBoot,
    createErrorReporter,
};

export function createApp({ factories = {}, dataSources = {}, persistenceSources = {}, dataAssetLoader = createDefaultDataAssetLoader(), hintsSource = createDefaultHintsSource() }: any = {}) {
    const f = { ...DEFAULT_FACTORIES, ...factories };

    // ── Stage 1: pure services ────────────────────────────────────────────────────
    // No DOM/canvas/Firebase, and no forward references to later subsystems.
    // The single error-reporting seam (hardening plan §4). Every subsystem below receives
    // `reportError`; pointing the app at a real sink later means changing only this line.
    const errorReporter = f.createErrorReporter();
    const reportError = errorReporter.report;
    const state = f.createState();
    const audioService = f.createAudioService({ reportError });
    // Wire the audio adapter to the live mute flag after state exists.
    audioService.setMutedProvider(() => state.ENGINE.muted);
    const solverApi = f.createSolver();
    // `data` no longer reads the theme registry. Themes flow one way at runtime
    // (loader → data.ingest({ themes }) → theme-registry reads data.getThemes()), so the
    // old data↔themes construction cycle is gone and `data` is a leaf service. (The
    // createData `getThemes` base-theme hook still exists for tests; app just omits it.)
    const data = f.createData({ deepClone, hintsSource, ...dataSources });
    const debug = f.createDebug();

    // ── Stage 2: browser-facing subsystems ────────────────────────────────────────
    // Both former construction cycles are gone — everything below flows one way (ADR 0008):
    //   • ui → renderer        — ui reads #gameCanvas directly (layout-ui), not via renderer.
    //   • persistence → themes — persistence validates theme ids via a data-sourced predicate,
    //                            so it's built before themes, which takes persistence directly.
    const ui = f.createUI({
        getState: () => state.ENGINE,
    });
    const renderer = f.createRenderer({ state, ui });

    // themes↔persistence cycle removed: persistence's only use of themes was a theme-id validity
    // check, now sourced from the leaf `data` service (themeExists). So persistence no longer
    // depends on themes and is built first; themes takes persistence directly. (See ADR 0008.)
    const persistence = f.createPersistence({
        getState:          () => state.ENGINE,
        themeExists:       (id: any) => !!data.getThemes()?.[id],
        getRawLevels:      () => data.getLevels(),
        onProgressChanged: () => markDirty(state),
        reportError,
        ...persistenceSources,
    });
    const themes = f.createThemes({
        state,
        data,
        persistence,
        getUI: () => ui,
    });
    // Constructed after persistence (needs persistence.getLocalLevelHints, which didn't exist
    // yet when this used to sit right after `data`). Boot defaults to the published corpus, so
    // wire the Firestore supplemental-hints merge in immediately — switchTo('published') would
    // otherwise never fire (it's a same-corpus no-op) and this would stay unset until a real
    // Dev-Mode corpus round-trip.
    const devCorpus = createDevCorpusSwitcher({ data, getLocalLevelHints: persistence.getLocalLevelHints });
    data.setFirestoreHintsSource(persistence.getLocalLevelHints);

    // ── Stage 3: controllers ──────────────────────────────────────────────────────
    // engine and editor are a genuine mutual *runtime* collaboration (engine wires editor into its
    // sub-controllers; editor drives engine through the narrow EditorRuntimePort). There is no
    // construction-time cycle and no post-construction init: the editor resolves its engine port
    // lazily via getEngineRuntime() — `engine` is a const declared just below, only dereferenced
    // when an editor method actually runs (long after both exist). See ADR 0008.
    const editor = f.createEditor({
        state, ui, solverApi,
        getEngineRuntime: () => createEditorEnginePort(engine),
    });
    const engine = f.createEngine({
        state, ui,
        renderer,
        themes,
        data,
        persistence,
        editor,
        audioService,
        reportError,
    });

    const input = f.createInput({
        state, ui,
        engine,
        editor,
        renderer,
        themes,
        data,
        devCorpus,
        solverApi,
        persistence,
        audioService,
        reportError,
    });

    const loader = f.createLoader({ ui, data, themes, dataAssetLoader, reportError });

    const boot = f.createBoot({
        ui, debug,
        persistence,
        loader,
        themes,
        engine,
        data,
        state,
        reportError,
    });

    return {
        audioService,
        errorReporter,
        state,
        solverApi,
        data,
        ui,
        themes,
        renderer,
        debug,
        editor,
        persistence,
        engine,
        input,
        loader,
        boot,
    };
}

export function createAppFacade(app: any) {
    return {
        State:       { get ENGINE() { return app.state.ENGINE; } },
        Engine:      app.engine,
        Editor:      app.editor,
        Themes:      app.themes,
        Solver:    app.solverApi,
        UI:          app.ui,
        Renderer:    app.renderer,
        Persistence: app.persistence,
        Data:        app.data,
        Loader:      app.loader,
        Input:       app.input,
        Boot:        app.boot,
        Debug:       app.debug,
    };
}

// Read-only production diagnostics surface. Unlike createAppFacade (which exposes the
// live, mutable subsystem objects — including State.ENGINE), this only hands out cloned
// snapshots, so console users or injected scripts can observe state without being able to
// mutate game/editor/review/runtime state through it.
export function createReadOnlyDiagnostics(app: any) {
    return Object.freeze({
        getStateSnapshot() {
            try { return deepClone(app.state.ENGINE); }
            catch (e: any) { app.errorReporter?.report('diagnostics.state-snapshot', e); return null; }
        },
        getCurrentLevel() {
            const level = app.state.ENGINE?.level;
            if (!level) return null;
            try { return deepClone(level); }
            catch (e: any) { app.errorReporter?.report('diagnostics.current-level', e); return null; }
        },
        getCurrentLevelIndex() { return app.state.ENGINE?.levelIdx ?? null; },
        getMode() { return app.state.ENGINE?.mode ?? null; },
    });
}

// Pure decision for whether to expose the *mutable* window.APP facade. Opt-in via the `?debug`
// query param alone — on any host, including production — so the documented debugging workflow
// (load the live site with `?debug`) works with no extra opt-in step. The read-only
// `window.PATHFINDER` diagnostics are always exposed and are unaffected by this gate.
// Injected input keeps this unit-testable without a real browser.
export function shouldExposeMutableFacade({ search = '' }: any = {}) {
    try { return new URLSearchParams(search).has('debug'); }
    catch (_: any) { return false; }
}

function isDebugFacadeRequested() {
    try { return shouldExposeMutableFacade({ search: window.location.search }); }
    catch (_: any) { return false; }
}

export function bootstrapApp() {
    // Inject the icon sprite sheet first so static <use href="#def-*"> markup resolves,
    // then render the data-driven editor palette tools into their container — both before
    // createApp() wires controllers that bind to those elements.
    injectSvgDefs();
    renderEditorPaletteItems();
    renderGuideCards();
    renderSubmitSteps();
    injectModalCloseIcons();
    const app = createApp();
    window.onload = createOnloadHandler({ input: app.input, boot: app.boot, ui: app.ui, loader: app.loader, reportError: app.errorReporter.report });
    // Default production surface: read-only diagnostics. Reduces the always-on mutable
    // debug surface that previously let anything with console (or an injected-script CSP
    // gap) mutate the live engine via window.APP.State.ENGINE.
    (window as any).PATHFINDER = createReadOnlyDiagnostics(app);
    // The full, mutable compatibility facade is opt-in via the `?debug` query param, so
    // the documented production debugging workflow still works (load the app with
    // `?debug`) without exposing the whole app surface by default.
    if (isDebugFacadeRequested()) {
        (window as any).APP = createAppFacade(app);
    }
    return app;
}
