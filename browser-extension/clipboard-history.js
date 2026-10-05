(function initCompanionClipboardHistory(global) {
  "use strict";

  const STORAGE_KEY = "ascClipboardHistory";
  const MAX_ITEMS = 25;
  const MAX_TEXT = 8000;
  const MAX_THUMB_DATA_URL = 48000;
  const MAX_IMAGE_DATA_URL = 480000;
  const PREVIEW_LEN = 72;

  function makeEntryId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function buildPreview(text, kind = "text") {
    if (kind === "image") {
      const label = String(text || "").replace(/\s+/g, " ").trim();
      if (label && !/^\[Изображение\]/i.test(label)) return label.slice(0, PREVIEW_LEN);
      return "Изображение";
    }
    const value = String(text || "").replace(/\s+/g, " ").trim();
    if (!value) return "Пусто";
    if (value.length <= PREVIEW_LEN) return value;
    return `${value.slice(0, PREVIEW_LEN - 1)}…`;
  }

  function normalizeEntry(raw = {}) {
    const kind = raw.kind === "image" ? "image" : "text";
    const text = String(raw.text || "").slice(0, MAX_TEXT);
    if (!text && kind === "text") return null;
    if (kind === "image" && !text) return null;
    const thumbDataUrl =
      kind === "image" ? String(raw.thumbDataUrl || "").slice(0, MAX_THUMB_DATA_URL) : "";
    const imageDataUrl =
      kind === "image" ? String(raw.imageDataUrl || "").slice(0, MAX_IMAGE_DATA_URL) : "";

    return {
      id: String(raw.id || makeEntryId()),
      kind,
      text,
      preview: buildPreview(text, kind),
      thumbDataUrl,
      imageDataUrl,
      sourceUrl: String(raw.sourceUrl || "").slice(0, 2048),
      pageTitle: String(raw.pageTitle || "").slice(0, 240),
      createdAt: Number(raw.createdAt) || Date.now()
    };
  }

  async function listClipboardHistory(storage = global.chrome?.storage?.local) {
    if (!storage?.get) return [];
    const stored = await storage.get(STORAGE_KEY);
    const items = Array.isArray(stored?.[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
    return items
      .map(normalizeEntry)
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_ITEMS);
  }

  async function addClipboardHistoryEntry(entry, storage = global.chrome?.storage?.local) {
    if (!storage?.get || !storage?.set) return { ok: false, error: "storage unavailable" };
    const normalized = normalizeEntry(entry);
    if (!normalized) return { ok: false, error: "empty entry" };

    const items = await listClipboardHistory(storage);
    if (
      items[0]?.text === normalized.text &&
      items[0]?.kind === normalized.kind &&
      (normalized.kind !== "image" || items[0]?.imageDataUrl === normalized.imageDataUrl)
    ) {
      return { ok: true, items, skipped: true };
    }

    const next = [normalized, ...items.filter((item) => item.id !== normalized.id)].slice(0, MAX_ITEMS);
    await storage.set({ [STORAGE_KEY]: next });
    return { ok: true, items: next };
  }

  async function clearClipboardHistory(storage = global.chrome?.storage?.local) {
    if (!storage?.set) return { ok: false, error: "storage unavailable" };
    await storage.set({ [STORAGE_KEY]: [] });
    return { ok: true, items: [] };
  }

  async function removeClipboardHistoryEntry(id, storage = global.chrome?.storage?.local) {
    if (!storage?.get || !storage?.set) return { ok: false, error: "storage unavailable" };
    const items = await listClipboardHistory(storage);
    const next = items.filter((item) => item.id !== id);
    await storage.set({ [STORAGE_KEY]: next });
    return { ok: true, items: next };
  }

  global.CompanionClipboardHistory = {
    STORAGE_KEY,
    MAX_ITEMS,
    listClipboardHistory,
    addClipboardHistoryEntry,
    clearClipboardHistory,
    removeClipboardHistoryEntry,
    buildPreview
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
