/** Диалог «Очередь сохранения сообщений и голосовых» — roadmap (будущая задача). */

/**
 * @param {{
 *   openBtn?: HTMLElement | null,
 *   dialog?: HTMLDialogElement | null,
 *   closeBtn?: HTMLElement | null,
 * }} options
 */
export function initShellOutboxQueueSpec({ openBtn, dialog, closeBtn } = {}) {
  openBtn?.addEventListener("click", () => {
    if (typeof dialog?.showModal === "function") dialog.showModal();
  });
  closeBtn?.addEventListener("click", () => dialog?.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
