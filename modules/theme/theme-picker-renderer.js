// Renders the theme selection grid inside the options panel.
// Owns only DOM construction — no state, no CSS variable writes.

function previewAlpha(color, alphaHex = '55') {
    if (typeof color !== 'string') return '#94a3b855';
    const trimmed = color.trim();
    return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? `${trimmed}${alphaHex}` : trimmed;
}

export function populateThemePicker({ clearElement }, themes, currentThemeKey, applyThemeFn) {
    const grid = document.getElementById('themeGrid');
    clearElement('themeGrid');

    const currentTheme = themes[currentThemeKey] || themes.classic || {};
    const uniformThemeNameColor = (currentTheme.text && (currentTheme.text.themeName || currentTheme.text.modal)) || '#000000';

    const otherKeys = Object.keys(themes).filter(key => key !== 'classic' && key !== 'chaos');
    const themeKeys = ['classic', ...otherKeys, 'chaos'];

    themeKeys.forEach(key => {
        const t = themes[key] || themes.classic;
        const btn = document.createElement('div');
        btn.className = 'flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 p-1 bg-transparent border-0 shadow-none rounded-none';
        btn.style.background = 'transparent';
        btn.style.border = '0';
        btn.style.boxShadow = 'none';
        btn.style.borderRadius = '0';
        btn.onclick = () => {
            applyThemeFn(key);
            const label = document.getElementById('currentThemeOptionLabel');
            if (label) label.textContent = key;
            document.getElementById('optionsPanelTrack')?.classList.remove('show-theme-page');
        };

        const preview = document.createElement('div');
        preview.className = 'theme-preview-board';
        preview.style.backgroundColor = key === 'chaos' ? '#ffffff' : (t.canvasBg || '#fff');
        preview.style.borderColor = t.palette?.itemBorder || t.grid || '#cbd5e1';

        const gridLines = document.createElement('div');
        gridLines.className = 'theme-preview-grid-lines';
        gridLines.style.backgroundImage = key === 'chaos'
            ? 'linear-gradient(rgba(15,23,42,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.18) 1px, transparent 1px)'
            : `linear-gradient(${previewAlpha(t.grid || '#94a3b8')} 1px, transparent 1px), linear-gradient(90deg, ${previewAlpha(t.grid || '#94a3b8')} 1px, transparent 1px)`;
        preview.appendChild(gridLines);

        const path = document.createElement('div');
        path.className = 'theme-preview-path';
        path.style.borderColor = key === 'chaos' ? '#d946ef' : (t.path || t.headerRight || '#2563eb');
        preview.appendChild(path);

        const gate = document.createElement('div');
        gate.className = 'theme-preview-dot theme-preview-gate';
        gate.style.backgroundColor = key === 'chaos' ? '#3b82f6' : (t.colors?.gate || t.headerRight || '#2563eb');
        preview.appendChild(gate);

        const goal = document.createElement('div');
        goal.className = 'theme-preview-dot theme-preview-goal';
        goal.style.backgroundColor = key === 'chaos' ? '#ef4444' : (t.colors?.goal || t.headerLeft || '#ef4444');
        preview.appendChild(goal);

        if (key === 'chaos') {
            preview.style.background = 'conic-gradient(from 180deg, #f8fafc, #fee2e2, #fef3c7, #dcfce7, #dbeafe, #f5d0fe, #f8fafc)';
        }

        const label = document.createElement('span');
        label.className = 'text-[0.65rem] font-black uppercase tracking-widest';
        label.style.color = uniformThemeNameColor;
        label.innerText = key;

        btn.appendChild(preview);
        btn.appendChild(label);
        grid.appendChild(btn);
    });
}
