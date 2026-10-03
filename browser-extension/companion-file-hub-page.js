/**
 * Внедрение файла из файлообменника в input[type=file] на странице (mail.ru и др.).
 */
(function initCompanionFileHubPage() {
  "use strict";

  if (window.__companionFileHubPage) return;
  window.__companionFileHubPage = true;

  function sanitizeFilename(name) {
    const base = String(name || "file").replace(/[\\/:*?"<>|]/g, "_").trim();
    return base || "file";
  }

  function buildFileFromMessage(message) {
    const buffer = message?.buffer;
    if (!buffer) return null;
    const mime = String(message.mime || "application/octet-stream");
    const filename = sanitizeFilename(message.filename);
    return new File([buffer], filename, { type: mime, lastModified: Date.now() });
  }

  function isVisibleInput(input) {
    if (!input || input.disabled) return false;
    if (input.offsetParent !== null) return true;
    const rects = input.getClientRects();
    return rects && rects.length > 0;
  }

  function scoreFileInput(input, file) {
    let score = 0;
    if (!input || input.type !== "file" || input.disabled) return -1;
    if (isVisibleInput(input)) score += 2;

    const accept = String(input.accept || "").toLowerCase();
    const mime = String(file.type || "").toLowerCase();
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";

    if (accept && mime && accept.includes(mime.split("/")[0])) score += 4;
    if (accept && ext && accept.includes(ext)) score += 5;
    if (!accept) score += 1;

    const meta = `${input.id || ""} ${input.name || ""} ${input.className || ""}`.toLowerCase();
    if (/attach|upload|file|скан|влож/i.test(meta)) score += 4;

    const root = input.closest(
      '[class*="attach"], [class*="Attach"], [class*="upload"], [class*="Upload"], [data-testid*="attach"], [data-testid*="file"]'
    );
    if (root) score += 6;

    if (/mail\.ru|e\.mail\.ru/i.test(location.hostname) && root) score += 4;

    return score;
  }

  function findBestFileInput(file) {
    const inputs = [...document.querySelectorAll('input[type="file"]')];
    const ranked = inputs
      .map((input) => ({ input, score: scoreFileInput(input, file) }))
      .filter((row) => row.score >= 0)
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.input || null;
  }

  function assignInputFiles(input, files) {
    const dt = new DataTransfer();
    for (const file of files) dt.items.add(file);
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files");
    if (descriptor?.set) descriptor.set.call(input, dt.files);
    else input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function injectFile(message) {
    const file = buildFileFromMessage(message);
    if (!file) return { ok: false, error: "Пустой файл" };

    const input = findBestFileInput(file);
    if (!input) {
      return {
        ok: false,
        error: "Не найдено поле загрузки",
        hint: "На странице откройте «Прикрепить файл» / «Обзор», затем нажмите кнопку снова"
      };
    }

    try {
      assignInputFiles(input, [file]);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  }

  try {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "COMPANION_FILE_HUB_PING") {
        sendResponse({ ok: true });
        return true;
      }
      if (message?.type === "COMPANION_FILE_HUB_INJECT_FILE") {
        sendResponse(injectFile(message));
        return true;
      }
      return false;
    });
  } catch {
    // ignore
  }
})();
