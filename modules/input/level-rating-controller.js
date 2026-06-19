export function createLevelRatingController({ engine }) {
    const pane = document.getElementById('levelRatingPane');
    if (!pane) return;

    pane.querySelectorAll('.rating-tag-btn[data-tag]').forEach(btn => {
        btn.onclick = () => engine.toggleLevelRatingTag(btn.dataset.tag);
    });

    pane.querySelectorAll('.rating-scale-buttons[data-scale] button[data-value]').forEach(btn => {
        const scale = btn.closest('.rating-scale-buttons').dataset.scale;
        btn.onclick = () => engine.setLevelRatingScale(scale, Number(btn.dataset.value));
    });

    const input  = document.getElementById('levelRatingCustomTagInput');
    const addBtn = document.getElementById('levelRatingAddCustomTagBtn');
    const list   = document.getElementById('levelRatingCustomTagList');

    const submitCustomTag = () => {
        if (!input) return;
        engine.addLevelRatingCustomTag(input.value);
        input.value = '';
    };
    if (addBtn) addBtn.onclick = submitCustomTag;
    if (input) input.onkeydown = (e) => { if (e.key === 'Enter') submitCustomTag(); };
    if (list) list.onclick = (e) => {
        const removeBtn = e.target.closest('.rating-custom-tag-remove-btn');
        if (removeBtn) engine.removeLevelRatingCustomTag(removeBtn.dataset.tag);
    };
}
