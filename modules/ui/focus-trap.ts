// Accessible modal focus management. When a modal opens we move focus into it, trap Tab
// within it, and close it on Escape; when it closes we restore focus to whatever was
// focused before. Wired into modules/ui/modal-ui.js's openModal/closeModal so every modal
// gets this for free.

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

// Active traps, keyed by the trapped element → { previouslyFocused, keydownHandler }.
const activeTraps = new Map();

function visibleFocusable(el: any) {
    return [...el.querySelectorAll(FOCUSABLE_SELECTOR)].filter((node: any) => {
        if (node.disabled) return false;
        // offsetParent is null for display:none / .hidden descendants.
        return node.offsetParent !== null || node === document.activeElement;
    });
}

/**
 * Trap focus inside `el`. Moves focus to the first focusable descendant (or the container
 * itself), cycles Tab/Shift+Tab within it, and calls `onEscape` on the Escape key.
 * Idempotent: re-activating an already-trapped element is a no-op.
 * @param {HTMLElement} el
 * @param {{ onEscape?: () => void }} [opts]
 */
export function activateFocusTrap(el: any, { onEscape }: any = {}) {
    if (!el || activeTraps.has(el)) return;

    const previouslyFocused = (document.activeElement instanceof HTMLElement) ? document.activeElement : null;

    // Make the container itself focusable as a fallback target for content-only modals.
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');

    const keydownHandler = (e: any) => {
        if (e.key === 'Escape') {
            if (onEscape) { e.preventDefault(); e.stopPropagation(); onEscape(); }
            return;
        }
        if (e.key !== 'Tab') return;
        const items = visibleFocusable(el);
        if (items.length === 0) { e.preventDefault(); el.focus(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        const current = document.activeElement;
        if (e.shiftKey) {
            if (current === first || !el.contains(current)) { e.preventDefault(); last.focus(); }
        } else if (current === last || !el.contains(current)) {
            e.preventDefault();
            first.focus();
        }
    };

    el.addEventListener('keydown', keydownHandler);
    activeTraps.set(el, { previouslyFocused, keydownHandler });

    const items = visibleFocusable(el);
    (items[0] || el).focus();
}

/**
 * Release a trap previously created by activateFocusTrap and restore focus to the element
 * that was focused before the trap activated (if it is still in the document).
 * @param {HTMLElement} el
 */
export function releaseFocusTrap(el: any) {
    const entry = activeTraps.get(el);
    if (!entry) return;
    el.removeEventListener('keydown', entry.keydownHandler);
    activeTraps.delete(el);
    const prev = entry.previouslyFocused;
    if (prev && document.contains(prev) && typeof prev.focus === 'function') prev.focus();
}

/** Test/diagnostic helper: is `el` currently trapped? */
export function isFocusTrapped(el: any) {
    return activeTraps.has(el);
}
