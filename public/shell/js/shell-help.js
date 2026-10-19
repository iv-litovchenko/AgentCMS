/** Help dialog «?» — architecture + mic link (#45). */

/**
 * @param {{
 *   helpBtn?: HTMLElement | null,
 *   helpDialog?: HTMLDialogElement | null,
 *   helpClose?: HTMLElement | null,
 *   micHelpLink?: HTMLElement | null,
 *   onMicHelp?: () => void
 * }} options
 */
export function initShellHelp({
  helpBtn,
  helpDialog,
  helpClose,
  micHelpLink,
  onMicHelp
} = {}) {
  helpBtn?.addEventListener("click", () => helpDialog?.showModal());
  helpClose?.addEventListener("click", () => helpDialog?.close());
  helpDialog?.addEventListener("click", (event) => {
    if (event.target === helpDialog) helpDialog.close();
  });
  micHelpLink?.addEventListener("click", (event) => {
    event.preventDefault();
    helpDialog?.close();
    onMicHelp?.();
  });
}
