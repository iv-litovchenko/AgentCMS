/**
 * Файл из файлообменника → страница: input[type=file] или симуляция drop (CodyHouse .ddf и др.).
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
    const decode = globalThis.CompanionFileHubBuffer?.normalizeAttachBuffer;
    const buffer = decode ? decode(message) : message?.buffer;
    if (!buffer || !buffer.byteLength) return null;
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
    for (const frame of doc.querySelectorAll("iframe")) {
      try {
        const child = frame.contentDocument;
        if (child) list.push(...collectFileInputs(child, depth + 1));
      } catch {
        // cross-origin
      }
    }
    return list;
  }

  function collectDropZones(doc, depth = 0) {
    if (!doc || depth > 4) return [];
    const selectors = [
      "form.ddf",
      ".ddf",
      "[class*='ddf__drop']",
      "[class*='drag-drop-file']",
      "[class*='dropzone']",
      "[class*='drop-zone']",
      "[data-dropzone]",
      "[data-upload-area]"
    ];
    const set = new Set();
    for (const sel of selectors) {
      for (const el of doc.querySelectorAll(sel)) {
        if (el instanceof HTMLElement) set.add(el);
      }
    }
    for (const frame of doc.querySelectorAll("iframe")) {
      try {
        const child = frame.contentDocument;
        if (child) collectDropZones(child, depth + 1).forEach((el) => set.add(el));
      } catch {
        // cross-origin
      }
    }
    return [...set];
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
      '[class*="attach"], [class*="Attach"], [class*="upload"], [class*="Upload"], [class*="compose"], [class*="Compose"], [class*="letter"]'
    );
    if (root) score += 6;
    if (isMailHost()) {
      score += 2;
      if (root) score += 4;
    }
    return score;
  }

  function scoreDropZone(zone, file) {
    if (!zone || !(zone instanceof HTMLElement)) return -1;
    let score = 0;
    const cls = String(zone.className || "").toLowerCase();
    const tag = zone.tagName.toLowerCase();
    if (cls.includes("ddf") || zone.matches("form.ddf, .ddf")) score += 12;
    if (/drop|upload|drag/.test(cls)) score += 6;
    if (zone.querySelector('input[type="file"]')) score += 4;
    if (tag === "form") score += 2;
    const rect = zone.getBoundingClientRect();
    if (rect.width > 40 && rect.height > 40) score += 3;
    if (isMailHost() && /attach|upload/.test(cls)) score += 2;
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

  function findBestDropZone(file) {
    const zones = collectDropZones(document);
    const ranked = zones
      .map((zone) => ({ zone, score: scoreDropZone(zone, file) }))
      .filter((row) => row.score >= 0)
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.zone || null;
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

  function buildDragDataTransfer(files) {
    const dt = new DataTransfer();
    for (const file of files) dt.items.add(file);
    return dt;
  }

  function simulateDropWithFiles(target, files) {
    const dt = buildDragDataTransfer(files);
    const opts = { bubbles: true, cancelable: true, dataTransfer: dt };
    target.dispatchEvent(new DragEvent("dragenter", opts));
    target.dispatchEvent(new DragEvent("dragover", opts));
    const dropped = target.dispatchEvent(new DragEvent("drop", opts));
    const input = target.querySelector?.('input[type="file"]');
    if (input && (!input.files || input.files.length === 0)) {
      assignInputFiles(input, files);
    }
    return dropped;
  }

  /** Только этот frame (без вложенных iframe — иначе одна форма считается дважды). */
  function countAttachFormTargets() {
    const inputs = [...document.querySelectorAll('input[type="file"]')];
    const stub = { type: "application/octet-stream", name: "file.bin" };
    const formCount = inputs.filter(
      (input) => isVisibleInput(input) && scoreFileInput(input, stub) >= 0
    ).length;
    return { ok: true, formCount };
  }

  function injectFile(message) {
    const file = buildFileFromMessage(message);
    if (!file) return { ok: false, error: "Пустой файл" };

    const input = findBestFileInput(file);
    if (input) {
      try {
        assignInputFiles(input, [file]);
        return { ok: true, method: "input", frame: location.href };
      } catch (error) {
        return { ok: false, error: String(error?.message || error) };
      }
    }

    const zone = findBestDropZone(file);
    if (zone) {
      try {
        simulateDropWithFiles(zone, [file]);
        return { ok: true, method: "drop", frame: location.href };
      } catch (error) {
        return { ok: false, error: String(error?.message || error) };
      }
    }

    return {
      ok: false,
      error: "Нет поля загрузки и drop-зоны",
      hint: "Откройте форму вложений или демо drag-drop на странице, затем снова 📎"
    };
  }

  try {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "COMPANION_FILE_HUB_PING") {
        sendResponse({ ok: true, href: location.href });
        return true;
      }
      if (message?.type === "COMPANION_FILE_HUB_COUNT_FORMS") {
        sendResponse(countAttachFormTargets());
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
