export function createLevelRatingController({ engine }: any) {
    const pane = (document.getElementById('levelRatingPane') as any);
    if (!pane) return;

    pane.querySelectorAll('.rating-tag-btn[data-tag]').forEach((btn: any) => {
        btn.onclick = () => engine.ratings.toggleTag(btn.dataset.tag);
    });

    pane.querySelectorAll('.rating-scale-buttons[data-scale] button[data-value]').forEach((btn: any) => {
        const scale = btn.closest('.rating-scale-buttons').dataset.scale;
        btn.onclick = () => engine.ratings.setScale(scale, Number(btn.dataset.value));
    });

    const input  = (document.getElementById('levelRatingCustomTagInput') as any);
    const addBtn = (document.getElementById('levelRatingAddCustomTagBtn') as any);
    const list   = (document.getElementById('levelRatingCustomTagList') as any);

    const submitCustomTag = () => {
        if (!input) return;
        engine.ratings.addCustomTag(input.value);
        input.value = '';
    };
    if (addBtn) addBtn.onclick = submitCustomTag;
    if (input) input.onkeydown = (e: KeyboardEvent) => { if (e.key === 'Enter') submitCustomTag(); };
    if (list) list.onclick = (e: MouseEvent) => {
        const removeBtn = (e.target as HTMLElement | null)?.closest('.rating-custom-tag-remove-btn');
        if (removeBtn) engine.ratings.removeCustomTag((removeBtn as HTMLElement).dataset.tag);
    };
}
