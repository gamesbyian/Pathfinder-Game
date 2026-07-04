// Promise-based in-app confirmation dialog (#confirmModal in index.html).
// Replaces window.confirm so confirmations share the app's modal styling,
// focus trap, and Escape handling (Escape clicks the Cancel button via its
// data-modal-dismiss hook in modal-ui's dismissModal).
import { openModal, closeModal } from './modal-ui.js';
import { resolveEl, setText } from './dom.js';

export interface ConfirmDialogOptions {
    title?: string;
    text: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

/** Opens the confirm modal and resolves true (confirm) or false (cancel/Escape). */
export function confirmDialog({ title = 'Confirm', text, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }: ConfirmDialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
        setText(resolveEl('confirmModalTitle'), title);
        setText(resolveEl('confirmModalText'), text);
        const okBtn     = resolveEl('confirmModalOkBtn');
        const cancelBtn = resolveEl('confirmModalCancelBtn');
        setText(okBtn, confirmLabel);
        setText(cancelBtn, cancelLabel);
        const finish = (result: boolean) => {
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            closeModal('confirmModal');
            resolve(result);
        };
        okBtn.onclick     = () => finish(true);
        cancelBtn.onclick = () => finish(false);
        openModal('confirmModal');
    });
}
