import { createSolverV2 }    from './SolverV2.js';
import { createCore }        from './core.js';
import { createDebug }       from './debug.js';
import { createUI }          from './ui.js';
import { createData }        from './data.js';
import { createLoader }      from './loader.js';
import { createState }       from './state.js';
import { createRenderer }    from './renderer.js';
import { createEngine }      from './engine.js';
import { createEditor }      from './editor.js';
import { createPersistence } from './persistence.js';
import { createLevelUtils }  from './levelutils.js';
import { createThemes }      from './themes.js';
import { createInput }       from './input.js';
import { createBoot, createOnloadHandler } from './boot.js';
import { injectSvgDefs } from './ui/svg-defs.js';
import { renderEditorPaletteItems } from './ui/editor-palette.js';
import { renderGuideCards } from './ui/guide-cards.js';
import { renderSubmitSteps } from './ui/submit-steps.js';
import { injectModalCloseIcons } from './ui/modal-icons.js';
import { markDirty } from './state-actions.js';


export function createDefaultDataAssetLoader({ fetchImpl = globalThis?.fetch, basePath = './data' } = {}) {
    return async () => {
        if (typeof fetchImpl !== 'function') return null;
        const [levelsResponse, themesResponse] = await Promise.all([
            fetchImpl(`${basePath}/levels.json`),
            fetchImpl(`${basePath}/themes.json`),
        ]);
        if (!levelsResponse?.ok) throw new Error(`Failed to load ${basePath}/levels.json`);
        if (!themesResponse?.ok) throw new Error(`Failed to load ${basePath}/themes.json`);
        const [levels, themes] = await Promise.all([
            levelsResponse.json(),
            themesResponse.json(),
        ]);
        return { levels, themes };
    };
}

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
export function createEditorEnginePort(engine) {
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
    createSolverV2,
    createCore,
    createDebug,
    createUI,
    createData,
    createLoader,
    createState,
    createRenderer,
    createEngine,
    createEditor,
    createPersistence,
    createLevelUtils,
    createThemes,
    createInput,
    createBoot,
};

export function createApp({ factories = {}, dataSources = {}, persistenceSources = {}, dataAssetLoader = createDefaultDataAssetLoader() } = {}) {
    const f = { ...DEFAULT_FACTORIES, ...factories };

    // ── Stage 1: pure services ────────────────────────────────────────────────────
    // No DOM/canvas/Firebase, and no forward references to later subsystems.
    const core  = f.createCore();
    const state = f.createState({ core });
    // Wire muted provider so SOUND_BUS reads the live state flag.
    core.SOUND_BUS.setMutedProvider(() => state.ENGINE.muted);
    const solverV2 = f.createSolverV2();
    // `data` no longer reads the theme registry. Themes flow one way at runtime
    // (loader → data.ingest({ themes }) → theme-registry reads data.getThemes()), so the
    // old data↔themes construction cycle is gone and `data` is a leaf service. (The
    // createData `getThemes` base-theme hook still exists for tests; app just omits it.)
    const data = f.createData({ deepClone: core.deepClone, ...dataSources });
    const debug = f.createDebug({ core });

    // ── Stage 2: browser-facing subsystems ────────────────────────────────────────
    // Both former construction cycles are gone — everything below flows one way (ADR 0008):
    //   • ui → renderer        — ui reads #gameCanvas directly (layout-ui), not via renderer.
    //   • persistence → themes — persistence validates theme ids via a data-sourced predicate,
    //                            so it's built before themes, which takes persistence directly.
    const ui = f.createUI({
        core,
        getState: () => state.ENGINE,
    });
    const renderer = f.createRenderer({ core, state, ui });

    const levelUtils = f.createLevelUtils({
        core,
        data,
        getState:    () => state.ENGINE,
        getRenderer: () => renderer,
    });

    // themes↔persistence cycle removed: persistence's only use of themes was a theme-id validity
    // check, now sourced from the leaf `data` service (themeExists). So persistence no longer
    // depends on themes and is built first; themes takes persistence directly. (See ADR 0008.)
    const persistence = f.createPersistence({
        getState:          () => state.ENGINE,
        themeExists:       (id) => !!data.getThemes()?.[id],
        getRawLevels:      () => data.getLevels(),
        onProgressChanged: () => markDirty(state),
        ...persistenceSources,
    });
    const themes = f.createThemes({
        state,
        data,
        persistence,
        getUI: () => ui,
    });

    // ── Stage 3: controllers ──────────────────────────────────────────────────────
    // engine and editor are a genuine mutual *runtime* collaboration (engine wires editor into its
    // sub-controllers; editor drives engine through the narrow EditorRuntimePort). There is no
    // construction-time cycle and no post-construction init: the editor resolves its engine port
    // lazily via getEngineRuntime() — `engine` is a const declared just below, only dereferenced
    // when an editor method actually runs (long after both exist). See ADR 0008.
    const editor = f.createEditor({
        core, state, ui, levelUtils, solverV2,
        getEngineRuntime: () => createEditorEnginePort(engine),
    });
    const engine = f.createEngine({
        core, state, ui,
        renderer,
        levelUtils,
        themes,
        data,
        persistence,
        editor,
    });

    const input = f.createInput({
        core, state, ui,
        engine,
        levelUtils,
        editor,
        renderer,
        themes,
        data,
        solverV2,
        persistence,
    });

    const loader = f.createLoader({ ui, data, themes, core, dataAssetLoader });

    const boot = f.createBoot({
        ui, debug,
        persistence,
        loader,
        themes,
        engine,
        data,
        core,
        state,
    });

    return {
        core,
        state,
        solverV2,
        data,
        ui,
        themes,
        renderer,
        debug,
        levelUtils,
        editor,
        persistence,
        engine,
        input,
        loader,
        boot,
    };
}

export function createAppFacade(app) {
    return {
        Core:        app.core,
        State:       { get ENGINE() { return app.state.ENGINE; } },
        Engine:      app.engine,
        Editor:      app.editor,
        LevelUtils:  app.levelUtils,
        Themes:      app.themes,
        SolverV2:    app.solverV2,
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
export function createReadOnlyDiagnostics(app) {
    return Object.freeze({
        getStateSnapshot() {
            try { return app.core.deepClone(app.state.ENGINE); }
            catch (_) { return null; }
        },
        getCurrentLevel() {
            const level = app.state.ENGINE?.level;
            if (!level) return null;
            try { return app.core.deepClone(level); }
            catch (_) { return null; }
        },
        getCurrentLevelIndex() { return app.state.ENGINE?.levelIdx ?? null; },
        getMode() { return app.state.ENGINE?.mode ?? null; },
    });
}

// Pure decision for whether to expose the *mutable* window.APP facade. Safe-by-default
// (modernization-plan §4 Phase 4): the mutable surface is never enabled by a casual `?debug`
// link in production. It requires `?debug` AND either a developer host (localhost/127.0.0.1/
// ::1/file:) OR an explicit, persisted opt-in (`localStorage['pathfinder:debugFacade'] === '1'`,
// set once from the console). The read-only `window.PATHFINDER` diagnostics are always exposed
// and are unaffected by this gate.
// Injected inputs keep this unit-testable without a real browser.
export function shouldExposeMutableFacade({ search = '', hostname = '', getStorageItem = () => null } = {}) {
    let hasDebug = false;
    try { hasDebug = new URLSearchParams(search).has('debug'); } catch (_) { hasDebug = false; }
    if (!hasDebug) return false;
    const devHost = hostname === 'localhost' || hostname === '127.0.0.1'
        || hostname === '[::1]' || hostname === '::1' || hostname === '';
    if (devHost) return true;
    try { return getStorageItem('pathfinder:debugFacade') === '1'; }
    catch (_) { return false; }
}

function isDebugFacadeRequested() {
    try {
        return shouldExposeMutableFacade({
            search: window.location.search,
            hostname: window.location.hostname,
            getStorageItem: (k) => window.localStorage?.getItem(k) ?? null,
        });
    } catch (_) { return false; }
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
    window.onload = createOnloadHandler({ input: app.input, boot: app.boot, ui: app.ui, loader: app.loader });
    // Default production surface: read-only diagnostics. Reduces the always-on mutable
    // debug surface that previously let anything with console (or an injected-script CSP
    // gap) mutate the live engine via window.APP.State.ENGINE.
    window.PATHFINDER = createReadOnlyDiagnostics(app);
    // The full, mutable compatibility facade is opt-in via the `?debug` query param, so
    // the documented production debugging workflow still works (load the app with
    // `?debug`) without exposing the whole app surface by default.
    if (isDebugFacadeRequested()) {
        window.APP = createAppFacade(app);
    }
    return app;
}
