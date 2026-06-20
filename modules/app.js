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

// Narrow editor-facing engine port (#2): the editor only needs this slice of the engine,
// not the whole facade. Assembling it explicitly keeps the editor↔engine coupling minimal
// and visible — the editor can't reach into unrelated engine behavior.
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
    // Two genuine mutual *runtime* cycles remain; each is expressed as a single lazy
    // getter and called out here rather than hidden:
    //   • ui ↔ renderer        — ui reads renderer lazily (renderer is built right after)
    //   • themes ↔ persistence — themes reads persistence lazily (built right after)
    let _renderer;
    const ui = f.createUI({
        core,
        getState:    () => state.ENGINE,
        getRenderer: () => _renderer,
    });
    _renderer = f.createRenderer({ core, state, ui });

    const levelUtils = f.createLevelUtils({
        core,
        data,
        getState:    () => state.ENGINE,
        getRenderer: () => _renderer,   // renderer already exists by here
    });

    let _persistence;
    const themes = f.createThemes({
        state,
        data,
        getPersistence: () => _persistence,
        getUI:          () => ui,
    });
    _persistence = f.createPersistence({
        getState:          () => state.ENGINE,
        getTheme:          (id) => themes.getTheme(id),   // themes already exists by here
        getRawLevels:      () => data.getLevels(),
        onProgressChanged: () => markDirty(state),
        ...persistenceSources,
    });

    // ── Stage 3: controllers ──────────────────────────────────────────────────────
    // editor ↔ engine is the one remaining *construction-time* cycle: engine is built
    // with editor, then engine is injected back into editor (editor only calls engine
    // methods at runtime). One explicit late injection keeps that cycle visible.
    const editor = f.createEditor({ core, state, ui, levelUtils, solverV2 });
    const engine = f.createEngine({
        core, state, ui,
        renderer: _renderer,
        levelUtils,
        themes,
        data,
        persistence: _persistence,
        editor,
    });
    editor.init({ engineRuntime: createEditorEnginePort(engine) });

    const input = f.createInput({
        core, state, ui,
        engine,
        levelUtils,
        editor,
        renderer: _renderer,
        themes,
        data,
        solverV2,
        persistence: _persistence,
    });

    const loader = f.createLoader({ ui, data, themes, core, dataAssetLoader });

    const boot = f.createBoot({
        ui, debug,
        persistence: _persistence,
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
        renderer: _renderer,
        debug,
        levelUtils,
        editor,
        persistence: _persistence,
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

function isDebugFacadeRequested() {
    try { return new URLSearchParams(window.location.search).has('debug'); }
    catch (_) { return false; }
}

export function bootstrapApp() {
    // Inject the icon sprite sheet first so static <use href="#def-*"> markup resolves,
    // then render the data-driven editor palette tools into their container — both before
    // createApp() wires controllers that bind to those elements.
    injectSvgDefs();
    renderEditorPaletteItems();
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
