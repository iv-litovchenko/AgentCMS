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

  function isMailHost() {
    return /(^|\.)mail\.ru$/i.test(location.hostname) || /e\.mail\.ru/i.test(location.hostname);
  }

  function collectFileInputs(doc, depth = 0) {
    if (!doc || depth > 4) return [];
    const list = [...doc.querySelectorAll('input[type="file"]')];
    const iframes = doc.querySelectorAll("iframe");
    for (const frame of iframes) {
      try {
        const child = frame.contentDocument;
        if (child) list.push(...collectFileInputs(child, depth + 1));
      } catch {
        // cross-origin iframe
      }
    }
    return list;
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

    // Скрытый input — норма для почтовиков
    if (isVisibleInput(input)) score += 2;
    else score += 3;

    const accept = String(input.accept || "").toLowerCase();
    const mime = String(file.type || "").toLowerCase();
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";

    if (accept && mime && accept.includes(mime.split("/")[0])) score += 4;
    if (accept && ext && accept.includes(ext)) score += 5;
    if (!accept || accept === "*" || accept.includes("*")) score += 2;

    const meta = `${input.id || ""} ${input.name || ""} ${input.className || ""}`.toLowerCase();
    if (/attach|upload|file|скан|влож|letter|compose|mail/i.test(meta)) score += 4;

    const root = input.closest(
      '[class*="attach"], [class*="Attach"], [class*="upload"], [class*="Upload"], [class*="compose"], [class*="Compose"], [class*="letter"], [data-testid*="attach"], [data-testid*="file"]'
    );
    if (root) score += 6;

    if (isMailHost()) {
      score += 2;
      if (root) score += 4;
    }

    return score;
  }

  function findBestFileInput(file) {
    const inputs = collectFileInputs(document);
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
        hint: "На mail.ru нажмите «Прикрепить файл» в письме, затем 📎 снова"
      };
    }

    try {
      assignInputFiles(input, [file]);
      return { ok: true, frame: location.href };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  }

  try {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "COMPANION_FILE_HUB_PING") {
        sendResponse({ ok: true, href: location.href });
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
