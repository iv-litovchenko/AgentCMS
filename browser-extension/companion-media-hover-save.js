/**
 * Кнопка «Скачать» при наведении на img / video / audio на странице.
 */
(function initCompanionMediaHoverSave() {
  "use strict";

  if (document.querySelector('meta[name="agent-cms-voice-app"]')?.content === "1") return;
  if (window.__companionMediaHoverSave) return;
  window.__companionMediaHoverSave = true;

  const HOST_ID = "agent-companion-media-save";
  const MIN_IMG_VIDEO_PX = 48;
  const MIN_VISIBLE_PX = 40;
  const HIDE_DELAY_MS = 120;
  const MOVE_THROTTLE_MS = 32;
  /** Отступ капсулы от правого и верхнего края картинки (px). */
  const DOCK_INSET = 10;
  const STICKY_POINTER_PAD = 16;
  /** Прямой просмотр файла в браузере (body + одна картинка, часто промах мимо img). */
  const STANDALONE_IMG_HIT_PAD = 56;

  const ICON_LINK =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

  const ICON_DOWNLOAD =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 21h14"/></svg>';

  const ICON_OPEN =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

  const ICON_CLIPBOARD =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect x="8" y="2" width="8" height="4" rx="1"/>' +
    '<rect x="5" y="4" width="14" height="16" rx="2"/></svg>';

  const KIND_ICON_IMAGE =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect x="3" y="5" width="18" height="14" rx="2"/>' +
    '<circle cx="9" cy="10" r="1.5"/>' +
    '<path d="M3 16l5-5 4 4 3-3 6 6"/></svg>';

  const KIND_ICON_VIDEO =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect x="3" y="6" width="13" height="12" rx="2"/>' +
    '<path d="M16 10l5-3v10l-5-3"/></svg>';

  const KIND_ICON_AUDIO =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M9 18V6l10-2v14"/><path d="M6 15a3 3 0 1 0 0-6"/></svg>';

  const KIND_BADGE = {
    image: { icon: KIND_ICON_IMAGE, label: "Изображение" },
    video: { icon: KIND_ICON_VIDEO, label: "Видео" },
    audio: { icon: KIND_ICON_AUDIO, label: "Аудио" }
  };

  let enabled = true;
  let activeMedia = null;
  let hideTimer = null;
  let lastMoveAt = 0;
  let lastClientX = 0;
  let lastClientY = 0;
  let trackRaf = 0;
  let resizeObserver = null;
  let hostEl = null;
  let wrapEl = null;
  let dockEl = null;
  let copyBtnEl = null;
  let openBtnEl = null;
  let clipboardBtnEl = null;
  let downloadBtnEl = null;
  let metaLeadEl = null;
  let kindBadgeEl = null;
  let metaEl = null;
  let metaDividerEl = null;
  let statusEl = null;
  let metaLoadCleanup = null;

  function isDockHovered() {
    return Boolean(dockEl?.matches(":hover"));
  }

  function isUiShown() {
    return hostEl?.dataset?.visible === "1";
  }

  function setUiVisible(shown) {
    if (!hostEl) return;
    if (shown) {
      hostEl.dataset.visible = "1";
      hostEl.hidden = false;
      hostEl.setAttribute("aria-hidden", "false");
    } else {
      delete hostEl.dataset.visible;
      hostEl.hidden = true;
      hostEl.setAttribute("aria-hidden", "true");
      if (statusEl) statusEl.hidden = true;
    }
  }

  function sendRuntimeMessage(payload) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(payload, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response);
        });
      } catch (error) {
        resolve({ ok: false, error: String(error?.message || error) });
      }
    });
  }

  function isBlockedContext() {
    const html = document.documentElement;
    if (html.classList.contains("asc-capturing-viewport")) return true;
    if (html.classList.contains("asc-capturing-fullpage")) return true;
    if (html.classList.contains("asc-screenshot-element-active")) return true;
    if (html.classList.contains("asc-screenshot-region-active")) return true;
    if (html.classList.contains("is-cms-page-picker-active")) return true;
    if (document.body?.classList.contains("is-cms-page-picker-active")) return true;
    return false;
  }

  function watchCaptureState() {
    const observer = new MutationObserver(() => {
      if (isBlockedContext()) hideUi();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }
  }

  function getVisualViewportBox() {
    const vv = window.visualViewport;
    if (!vv) {
      return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    }
    return {
      left: vv.offsetLeft,
      top: vv.offsetTop,
      right: vv.offsetLeft + vv.width,
      bottom: vv.offsetTop + vv.height
    };
  }

  /** Пересечение rect элемента с видимой областью окна (и зумом). */
  function intersectWithViewport(rect) {
    const vp = getVisualViewportBox();
    const left = Math.max(rect.left, vp.left);
    const top = Math.max(rect.top, vp.top);
    const right = Math.min(rect.right, vp.right);
    const bottom = Math.min(rect.bottom, vp.bottom);
    if (right - left < 4 || bottom - top < 4) return null;
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function isMediaVisible(media) {
    if (!media?.isConnected) return false;
    const rect = media.getBoundingClientRect();
    const vis = intersectWithViewport(rect);
    if (!vis) return false;
    const kind = mediaKind(media);
    if (kind === "audio") return vis.width >= 24 || vis.height >= 24;
    if (vis.width < MIN_VISIBLE_PX || vis.height < MIN_VISIBLE_PX) return false;
    if (typeof media.checkVisibility === "function") {
      try {
        if (media.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return true;
      } catch {
        // ignore
      }
    }
    try {
      const style = getComputedStyle(media);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (Number.parseFloat(style.opacity) === 0) return false;
    } catch {
      // ignore
    }
    return true;
  }

  function isStandaloneImageDocument() {
    if (document.images.length !== 1) return false;
    const path = location.pathname.toLowerCase();
    if (/\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i.test(path)) return true;
    if (/\.(jpe?g|png|gif|webp|avif|bmp|svg)/i.test(location.href)) return true;
    const imgs = document.querySelectorAll("img");
    if (imgs.length !== 1) return false;
    const childCount = document.body?.children?.length ?? 0;
    return childCount <= 6;
  }

  function getStandalonePageImage() {
    if (!isStandaloneImageDocument()) return null;
    const img = document.images[0];
    if (!img || isCompanionUiNode(img)) return null;
    if (!resolveMediaUrl(img)) return null;
    if (!mediaPassesSizeGate(img)) return null;
    return img;
  }

  function pointerInVisibleMedia(media, x, y) {
    const box = getMediaBoxRect(media);
    if (!box) return false;
    const pad =
      isStandaloneImageDocument() && getStandalonePageImage() === media ? STANDALONE_IMG_HIT_PAD : 0;
    return (
      x >= box.left - pad &&
      x <= box.right + pad &&
      y >= box.top - pad &&
      y <= box.bottom + pad
    );
  }

  /** Якорь капсулы: border-box медиа в client-координатах (как getBoundingClientRect). */
  function getMediaBoxRect(media) {
    if (!media?.getBoundingClientRect) return null;
    const rect = media.getBoundingClientRect();
    if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return null;
    if (rect.width <= 0 || rect.height <= 0) return null;
    const vis = intersectWithViewport(rect);
    return vis || rect;
  }

  function getDockScreenRect() {
    if (!dockEl || !isUiShown()) return null;
    const rect = dockEl.getBoundingClientRect();
    if (!rect.width && !rect.height) return null;
    return rect;
  }

  function pointerInPaddedRect(x, y, rect, pad) {
    if (!rect) return false;
    return (
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad
    );
  }

  /** Курсор на картинке, на увеличенном контейнере, на капсуле или на «мостике» между ними. */
  function pointerInStickyHoverZone(media, x, y) {
    if (isDockHovered()) return true;
    if (pointerInVisibleMedia(media, x, y)) return true;
    const box = getMediaBoxRect(media);
    if (pointerInPaddedRect(x, y, box, STICKY_POINTER_PAD)) return true;
    const dock = getDockScreenRect();
    if (pointerInPaddedRect(x, y, dock, STICKY_POINTER_PAD)) return true;
    if (box && dock) {
      const bridgeLeft = Math.min(box.left, dock.left) - STICKY_POINTER_PAD;
      const bridgeRight = Math.max(box.right, dock.right) + STICKY_POINTER_PAD;
      const bridgeTop = Math.min(box.top, dock.top) - STICKY_POINTER_PAD;
      const bridgeBottom = Math.max(box.bottom, dock.bottom) + STICKY_POINTER_PAD;
      if (x >= bridgeLeft && x <= bridgeRight && y >= bridgeTop && y <= bridgeBottom) return true;
    }
    return false;
  }

  function clampDockTopLeft(box, dockW, dockH, pad) {
    let dockRight = box.right - pad;
    const minDockRight = box.left + pad + dockW;
    if (dockRight < minDockRight) dockRight = minDockRight;
    let dockLeft = dockRight - dockW;

    let dockTop = box.top + pad;
    const minTop = box.top + pad;
    const maxTop = box.bottom - pad - dockH;
    if (maxTop >= minTop) dockTop = Math.min(Math.max(dockTop, minTop), maxTop);
    else dockTop = box.top + Math.max(pad, (box.height - dockH) / 2);

    return { dockLeft, dockTop };
  }

  /**
   * Капсулу ставим через position:fixed на .wrap в тех же client-координатах, что и медиа.
   * Host не двигаем (0×0), чтобы не ломать связку shadow/light DOM.
   */
  function placeWrapAtMediaBox(box) {
    if (!wrapEl || !dockEl || !box) return;
    const pad = DOCK_INSET;
    const dock = dockEl.getBoundingClientRect();
    if (!dock.width || !dock.height) return;

    const wrap = wrapEl.getBoundingClientRect();
    const offsetX = dock.left - wrap.left;
    const offsetY = dock.top - wrap.top;

    const { dockLeft, dockTop } = clampDockTopLeft(box, dock.width, dock.height, pad);
    wrapEl.style.left = `${Math.round(dockLeft - offsetX)}px`;
    wrapEl.style.top = `${Math.round(dockTop - offsetY)}px`;
  }

  function scheduleDockPositionSync(media, box) {
    const run = () => {
      if (activeMedia !== media || !isUiShown()) return;
      const fresh = getMediaBoxRect(media) || box;
      if (fresh) placeWrapAtMediaBox(fresh);
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  function resolveAbsoluteUrl(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    try {
      return new URL(value, location.href).href;
    } catch {
      return "";
    }
  }

  function pickLargestFromSrcset(srcset) {
    const parts = String(srcset || "")
      .split(",")
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    if (!parts.length) return "";
    let bestUrl = "";
    let bestW = 0;
    for (const part of parts) {
      const segs = part.split(/\s+/);
      const url = segs[0];
      const w = segs[1] && segs[1].endsWith("w") ? Number.parseInt(segs[1], 10) : 0;
      if (!bestUrl || w >= bestW) {
        bestUrl = url;
        bestW = w;
      }
    }
    return bestUrl;
  }

  function readBackgroundImageUrl(el) {
    if (!el || el.nodeType !== 1) return "";
    try {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === "none") return "";
      for (const part of bg.split(",")) {
        const match = part.match(/url\(["']?([^"')]+)["']?\)/i);
        if (match?.[1]) return resolveAbsoluteUrl(match[1].trim());
      }
    } catch {
      // ignore
    }
    return "";
  }

  function mediaKind(el) {
    const tag = el?.tagName || "";
    if (tag === "VIDEO") return "video";
    if (tag === "AUDIO") return "audio";
    if (readBackgroundImageUrl(el)) return "image";
    return "image";
  }

  function normalizeFormatLabel(raw) {
    const value = String(raw || "")
      .toLowerCase()
      .split("+")[0]
      .trim();
    if (!value) return "";
    if (value === "jpeg") return "JPG";
    if (value === "svg") return "SVG";
    if (value === "mp4") return "MP4";
    if (value === "webm") return "WEBM";
    if (value === "quicktime") return "MOV";
    if (value === "mpeg") return "MP3";
    if (value === "x-m4a") return "M4A";
    return value.length <= 5 ? value.toUpperCase() : value.slice(0, 5).toUpperCase();
  }

  function formatFromMediaUrl(url, kind) {
    const raw = String(url || "").trim();
    if (!raw) return kind === "audio" ? "AUDIO" : kind === "video" ? "VIDEO" : "IMG";
    if (raw.startsWith("data:")) {
      const dataMatch = raw.match(/^data:([^;,]+)/i);
      if (dataMatch) {
        const mime = dataMatch[1];
        const sub = mime.split("/")[1] || "";
        return normalizeFormatLabel(sub) || "DATA";
      }
    }
    if (raw.startsWith("blob:")) return kind === "video" ? "VIDEO" : kind === "audio" ? "AUDIO" : "IMG";
    try {
      const pathname = new URL(raw).pathname;
      const base = (pathname.split("/").pop() || "").split("?")[0];
      const dot = base.lastIndexOf(".");
      if (dot > 0 && dot < base.length - 1) {
        const ext = base.slice(dot + 1);
        if (/^[a-z0-9]{2,8}$/i.test(ext)) return normalizeFormatLabel(ext);
      }
    } catch {
      // ignore
    }
    return kind === "audio" ? "AUDIO" : kind === "video" ? "VIDEO" : "IMG";
  }

  function readMediaPixelSize(media) {
    if (!media) return null;
    const tag = media.tagName;
    if (readBackgroundImageUrl(media) && tag !== "IMG" && tag !== "VIDEO" && tag !== "AUDIO") {
      const rect = media.getBoundingClientRect();
      const rw = Math.round(rect.width);
      const rh = Math.round(rect.height);
      if (rw > 0 && rh > 0) return { w: rw, h: rh, source: "layout" };
      return null;
    }
    if (tag === "IMG") {
      const w = media.naturalWidth || 0;
      const h = media.naturalHeight || 0;
      if (w > 0 && h > 0) return { w, h, source: "intrinsic" };
      const rect = media.getBoundingClientRect();
      const rw = Math.round(rect.width);
      const rh = Math.round(rect.height);
      if (rw > 0 && rh > 0) return { w: rw, h: rh, source: "layout" };
      return null;
    }
    if (tag === "VIDEO") {
      const w = media.videoWidth || 0;
      const h = media.videoHeight || 0;
      if (w > 0 && h > 0) return { w, h, source: "intrinsic" };
      const rect = media.getBoundingClientRect();
      const rw = Math.round(rect.width);
      const rh = Math.round(rect.height);
      if (rw > 0 && rh > 0) return { w: rw, h: rh, source: "layout" };
      return null;
    }
    return null;
  }

  function buildMediaMetaText(media) {
    if (!media) return "";
    const kind = mediaKind(media);
    const format = formatFromMediaUrl(resolveMediaUrl(media), kind);
    const size = readMediaPixelSize(media);
    if (size) {
      const dims = `${size.w}×${size.h}`;
      return `${dims} · ${format}`;
    }
    return format;
  }

  function clearMetaLoadBinding() {
    if (!metaLoadCleanup) return;
    try {
      metaLoadCleanup();
    } catch {
      // ignore
    }
    metaLoadCleanup = null;
  }

  function bindMetaLoadRefresh(media) {
    clearMetaLoadBinding();
    if (!media) return;
    const refresh = () => updateMediaMeta(media);
    if (media.tagName === "IMG" && !media.complete) {
      media.addEventListener("load", refresh, { once: true });
      metaLoadCleanup = () => media.removeEventListener("load", refresh);
      return;
    }
    if (media.tagName === "VIDEO" && media.readyState < 1) {
      media.addEventListener("loadedmetadata", refresh, { once: true });
      metaLoadCleanup = () => media.removeEventListener("loadedmetadata", refresh);
    }
  }

  function updateMediaKindBadge(media) {
    if (!kindBadgeEl || !media) return;
    const kind = mediaKind(media);
    const spec = KIND_BADGE[kind] || KIND_BADGE.image;
    kindBadgeEl.className = `dock-kind dock-kind--${kind}`;
    kindBadgeEl.innerHTML = spec.icon;
    kindBadgeEl.title = spec.label;
    kindBadgeEl.setAttribute("aria-label", spec.label);
    kindBadgeEl.hidden = false;
    if (metaLeadEl) metaLeadEl.hidden = false;
  }

  function updateMediaMeta(media) {
    if (!media) return;
    updateMediaKindBadge(media);
    if (!metaEl) return;
    const text = buildMediaMetaText(media);
    metaEl.textContent = text;
    metaEl.hidden = !text;
    metaEl.title = text;
    if (metaDividerEl) metaDividerEl.hidden = false;
  }

  function resolveMediaUrl(el) {
    if (!el) return "";
    const tag = el.tagName;
    if (tag === "IMG") {
      return resolveAbsoluteUrl(
        el.currentSrc ||
          el.src ||
          el.getAttribute("data-src") ||
          el.getAttribute("data-lazy-src") ||
          el.getAttribute("data-original") ||
          el.getAttribute("data-url") ||
          pickLargestFromSrcset(el.getAttribute("srcset"))
      );
    }
    if (tag === "VIDEO" || tag === "AUDIO") {
      const direct = resolveAbsoluteUrl(el.currentSrc || el.src);
      if (direct) return direct;
      const source = el.querySelector("source[src]");
      if (source) return resolveAbsoluteUrl(source.getAttribute("src"));
    }
    return readBackgroundImageUrl(el);
  }

  function isCompanionUiNode(node) {
    if (!node || node.nodeType !== 1) return false;
    const el = /** @type {Element} */ (node);
    if (el.id === HOST_ID || el.closest(`#${HOST_ID}`)) return true;
    if (el.closest("#agent-shell-companion-toolbar, .cms-page-picker-root")) return true;
    return false;
  }

  function pointerHitsElement(x, y, el, pad = 0) {
    if (!el?.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    return (
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad
    );
  }

  function collectMediaCandidatesUnderPointer(root, x, y) {
    const found = [];
    if (!root || root.nodeType !== 1 || isCompanionUiNode(root)) return found;
    const el = /** @type {Element} */ (root);

    if (el.matches?.("img, video, audio") && pointerHitsElement(x, y, el)) found.push(el);
    if (readBackgroundImageUrl(el) && pointerHitsElement(x, y, el)) found.push(el);

    const nested = el.querySelectorAll?.("img, video, audio");
    if (nested) {
      for (const node of nested) {
        if (isCompanionUiNode(node)) continue;
        if (pointerHitsElement(x, y, node)) found.push(node);
      }
    }
    return found;
  }

  function pickBestMediaCandidate(candidates) {
    let best = null;
    let bestArea = 0;
    for (const media of candidates) {
      if (!media || isCompanionUiNode(media)) continue;
      if (media.closest("#agent-shell-companion-toolbar, .cms-page-picker-root")) continue;
      if (!resolveMediaUrl(media)) continue;
      if (!mediaPassesSizeGate(media)) continue;
      const rect = media.getBoundingClientRect();
      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      if (area > bestArea) {
        bestArea = area;
        best = media;
      }
    }
    return best;
  }

  function mediaPassesSizeGate(media) {
    const rect = media.getBoundingClientRect();
    const vis = intersectWithViewport(rect);
    if (!vis) return false;
    const kind = mediaKind(media);
    if (kind === "audio") return vis.width >= 24 || vis.height >= 24;
    return vis.width >= MIN_IMG_VIDEO_PX && vis.height >= MIN_IMG_VIDEO_PX;
  }

  function findMediaUnderPointer(x, y) {
    if (isDockHovered() && activeMedia && isMediaVisible(activeMedia)) {
      return activeMedia;
    }

    const standaloneImg = getStandalonePageImage();
    if (standaloneImg && pointerHitsElement(x, y, standaloneImg, STANDALONE_IMG_HIT_PAD)) {
      return standaloneImg;
    }

    const candidates = [];
    const stack = document.elementsFromPoint(x, y);
    for (const node of stack) {
      candidates.push(...collectMediaCandidatesUnderPointer(node, x, y));
      let parent = node.parentElement;
      for (let depth = 0; parent && depth < 8; depth += 1) {
        if (isCompanionUiNode(parent)) break;
        if (readBackgroundImageUrl(parent) && pointerHitsElement(x, y, parent)) {
          candidates.push(parent);
        }
        parent = parent.parentElement;
      }
    }

    let top = null;
    try {
      top = document.elementFromPoint(x, y);
    } catch {
      top = null;
    }
    if (top && !isCompanionUiNode(top)) {
      candidates.push(...collectMediaCandidatesUnderPointer(top, x, y));
      let el = top.parentElement;
      for (let depth = 0; el && depth < 10; depth += 1) {
        if (isCompanionUiNode(el)) break;
        candidates.push(...collectMediaCandidatesUnderPointer(el, x, y));
        el = el.parentElement;
      }
    }

    const unique = [];
    const seen = new Set();
    for (const item of candidates) {
      if (!item || seen.has(item)) continue;
      seen.add(item);
      unique.push(item);
    }

    const best = pickBestMediaCandidate(unique);
    if (best && pointerInVisibleMedia(best, x, y)) return best;
    if (standaloneImg && pointerHitsElement(x, y, standaloneImg, STANDALONE_IMG_HIT_PAD)) {
      return standaloneImg;
    }
    return null;
  }

  function bindStandaloneImagePage() {
    const img = getStandalonePageImage();
    if (!img || img.dataset.ascMediaStandaloneBound === "1") return;
    img.dataset.ascMediaStandaloneBound = "1";

    img.addEventListener(
      "mouseenter",
      () => {
        if (!enabled || isBlockedContext()) return;
        showForMedia(img);
      },
      { passive: true }
    );

    img.addEventListener(
      "mouseleave",
      (event) => {
        const next = event.relatedTarget;
        if (next && (dockEl?.contains(next) || hostEl?.contains(next))) return;
        if (!isDockHovered()) scheduleHide();
      },
      { passive: true }
    );
  }

  function guessFilename(url, kind) {
    try {
      const pathname = new URL(url).pathname;
      const base = pathname.split("/").pop() || "";
      const clean = base.split("?")[0];
      if (clean && /\.[a-z0-9]{2,8}$/i.test(clean)) return clean.slice(0, 200);
    } catch {
      // ignore
    }
    const ext = kind === "video" ? "mp4" : kind === "audio" ? "m4a" : "jpg";
    return `agent-cms-${kind}-${Date.now()}.${ext}`;
  }

  function flashStatus(text, ok = true) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.dataset.state = ok ? "ok" : "error";
    statusEl.hidden = false;
    window.clearTimeout(flashStatus._t);
    flashStatus._t = window.setTimeout(() => {
      statusEl.hidden = true;
    }, 2200);
  }

  async function copyMediaUrl(media) {
    const url = resolveMediaUrl(media);
    if (!url) {
      flashStatus("Нет URL", false);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flashStatus("URL скопирован", true);
      return;
    } catch {
      // fall through
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (ok) flashStatus("URL скопирован", true);
      else flashStatus("Не удалось скопировать", false);
    } catch {
      flashStatus("Не удалось скопировать", false);
    }
  }

  function openMediaInNewTab(media) {
    const url = resolveMediaUrl(media);
    if (!url) {
      flashStatus("Нет URL", false);
      return;
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) flashStatus("Не удалось открыть", false);
    else flashStatus("Открыто", true);
  }

  async function copyMediaBlobFromImgElement(media) {
    if (!media || media.tagName !== "IMG") return false;
    const w = media.naturalWidth || media.width;
    const h = media.naturalHeight || media.height;
    if (!w || !h) return false;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    try {
      ctx.drawImage(media, 0, 0);
    } catch {
      return false;
    }
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob || typeof ClipboardItem !== "function" || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  }

  async function copyMediaToClipboard(media) {
    const url = resolveMediaUrl(media);
    if (!url) {
      flashStatus("Нет URL", false);
      return;
    }
    flashStatus("Копирование…", true);
    try {
      if (await copyMediaBlobFromImgElement(media)) {
        flashStatus("В буфере", true);
        return;
      }
    } catch {
      // fall through to background fetch
    }
    const res = await sendRuntimeMessage({
      type: "COMPANION_COPY_MEDIA_TO_CLIPBOARD",
      url
    });
    if (res?.ok) {
      flashStatus(res.mode === "url" ? "URL в буфере" : "В буфере", true);
      return;
    }
    flashStatus(res?.error || "Не удалось скопировать", false);
  }

  async function downloadMedia(media) {
    const url = resolveMediaUrl(media);
    if (!url) {
      flashStatus("Нет URL", false);
      return;
    }
    const kind = mediaKind(media);
    const filename = guessFilename(url, kind);
    flashStatus("Скачивание…", true);
    const res = await sendRuntimeMessage({
      type: "COMPANION_DOWNLOAD_URL",
      url,
      filename
    });
    if (res?.ok) {
      flashStatus("Скачано", true);
      return;
    }
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.append(link);
      link.click();
      link.remove();
      flashStatus("Скачано", true);
    } catch {
      flashStatus(res?.error || "Не удалось скачать", false);
    }
  }

  function mediaActionLabels(media) {
    const kind = mediaKind(media);
    const copyLabel =
      kind === "video" ? "Копировать URL видео" : kind === "audio" ? "Копировать URL аудио" : "Копировать URL изображения";
    const openLabel = "Открыть в новой вкладке";
    const clipboardLabel =
      kind === "video"
        ? "Копировать видео в буфер (URL)"
        : kind === "audio"
          ? "Копировать аудио в буфер (URL)"
          : "Копировать изображение в буфер";
    const downloadLabel =
      kind === "video" ? "Скачать видео" : kind === "audio" ? "Скачать аудио" : "Скачать изображение";
    return { copyLabel, openLabel, clipboardLabel, downloadLabel };
  }

  function shouldShowForMedia(media) {
    if (!media || !isMediaVisible(media)) return false;
    if (isDockHovered()) return true;
    if (isUiShown() && media === activeMedia) {
      return pointerInStickyHoverZone(media, lastClientX, lastClientY);
    }
    return pointerInVisibleMedia(media, lastClientX, lastClientY);
  }

  function positionUi(media) {
    if (!hostEl || !dockEl || !media) return false;
    if (!shouldShowForMedia(media)) return false;

    const box = getMediaBoxRect(media);
    if (!box || !intersectWithViewport(box)) return false;

    updateMediaMeta(media);
    setUiVisible(true);
    placeWrapAtMediaBox(box);
    scheduleDockPositionSync(media, box);

    const { copyLabel, openLabel, clipboardLabel, downloadLabel } = mediaActionLabels(media);
    if (copyBtnEl) {
      copyBtnEl.title = copyLabel;
      copyBtnEl.setAttribute("aria-label", copyLabel);
    }
    if (openBtnEl) {
      openBtnEl.title = openLabel;
      openBtnEl.setAttribute("aria-label", openLabel);
    }
    if (clipboardBtnEl) {
      clipboardBtnEl.title = clipboardLabel;
      clipboardBtnEl.setAttribute("aria-label", clipboardLabel);
    }
    if (downloadBtnEl) {
      downloadBtnEl.title = downloadLabel;
      downloadBtnEl.setAttribute("aria-label", downloadLabel);
    }
    return true;
  }

  function stopTracking() {
    if (trackRaf) {
      cancelAnimationFrame(trackRaf);
      trackRaf = 0;
    }
    if (resizeObserver) {
      try {
        resizeObserver.disconnect();
      } catch {
        // ignore
      }
      resizeObserver = null;
    }
  }

  function startTracking(media) {
    stopTracking();
    if (!media || typeof ResizeObserver === "undefined") return;
    resizeObserver = new ResizeObserver(() => {
      if (activeMedia === media) positionUi(media);
    });
    resizeObserver.observe(media);
    let parent = media.parentElement;
    for (let i = 0; parent && i < 3; i += 1) {
      resizeObserver.observe(parent);
      parent = parent.parentElement;
    }
  }

  function tickTrack() {
    trackRaf = 0;
    if (!activeMedia || !isUiShown()) return;
    if (!isMediaVisible(activeMedia) || !shouldShowForMedia(activeMedia)) {
      if (!isDockHovered()) scheduleHide();
      return;
    }
    if (!positionUi(activeMedia)) {
      if (!isDockHovered()) scheduleHide();
      return;
    }
    trackRaf = requestAnimationFrame(tickTrack);
  }

  function ensureTrackLoop() {
    if (trackRaf) return;
    trackRaf = requestAnimationFrame(tickTrack);
  }

  function hideUi() {
    stopTracking();
    clearMetaLoadBinding();
    if (!hostEl) return;
    setUiVisible(false);
    activeMedia = null;
    if (kindBadgeEl) kindBadgeEl.hidden = true;
    if (metaLeadEl) metaLeadEl.hidden = true;
    if (metaEl) {
      metaEl.textContent = "";
      metaEl.hidden = true;
    }
    if (metaDividerEl) metaDividerEl.hidden = true;
    if (wrapEl) {
      wrapEl.style.left = "0px";
      wrapEl.style.top = "0px";
    }
    if (hostEl) {
      hostEl.style.left = "";
      hostEl.style.top = "";
    }
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (isDockHovered()) return;
      hideUi();
    }, HIDE_DELAY_MS);
  }

  function showForMedia(media) {
    if (!enabled || !media) {
      hideUi();
      return;
    }
    window.clearTimeout(hideTimer);
    const changed = media !== activeMedia;
    activeMedia = media;
    if (changed) {
      startTracking(media);
      bindMetaLoadRefresh(media);
      updateMediaMeta(media);
    }
    if (!positionUi(media)) {
      hideUi();
      return;
    }
    ensureTrackLoop();
  }

  function onPointerMove(event) {
    if (!enabled || isBlockedContext()) {
      hideUi();
      return;
    }
    lastClientX = event.clientX;
    lastClientY = event.clientY;

    const now = Date.now();
    if (now - lastMoveAt < MOVE_THROTTLE_MS) return;
    lastMoveAt = now;

    const media = findMediaUnderPointer(event.clientX, event.clientY);
    if (!media) {
      if (activeMedia && !isDockHovered()) scheduleHide();
      return;
    }
    if (media !== activeMedia) showForMedia(media);
    else positionUi(media);
  }

  function onScrollOrResize() {
    if (activeMedia) {
      if (!positionUi(activeMedia) && !isDockHovered()) scheduleHide();
      else ensureTrackLoop();
    }
  }

  function ensureUi() {
    if (hostEl) return;
    hostEl = document.createElement("div");
    hostEl.id = HOST_ID;
    hostEl.setAttribute("aria-hidden", "true");

    const shadow = hostEl.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        overflow: visible;
        z-index: 2147483647;
        pointer-events: none;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        font-size: 12px;
        line-height: 1.2;
        color: #f5f3ff;
      }
      .wrap {
        position: fixed;
        left: 0;
        top: 0;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 5px;
        width: max-content;
        margin: 0;
        opacity: 0;
        transform: translateY(4px);
        transition:
          opacity 0.14s ease,
          transform 0.14s ease;
      }
      :host([data-visible="1"]) .wrap {
        opacity: 1;
        transform: translateY(0);
      }
      .dock {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 2px;
        flex: 0 0 auto;
        padding: 2px 4px 2px 3px;
        border-radius: 999px;
        background: rgba(17, 12, 32, 0.94);
        border: 1px solid rgba(167, 139, 250, 0.42);
        box-shadow: 0 10px 28px rgba(15, 10, 30, 0.28);
        backdrop-filter: blur(12px);
      }
      .dock-lead {
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 0 1 auto;
        min-width: 0;
        max-width: min(48vw, 260px);
        margin: 2px 0 2px 2px;
        padding: 1px 6px 1px 1px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.04);
      }
      .dock-lead[hidden] {
        display: none;
      }
      .dock-kind {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        border-radius: 999px;
      }
      .dock-kind[hidden] {
        display: none;
      }
      .dock-kind svg {
        width: 14px;
        height: 14px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.75;
        stroke-linecap: round;
        stroke-linejoin: round;
        display: block;
      }
      .dock-kind--image {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.2);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
      }
      .dock-kind--video {
        color: #fff1f2;
        background: rgba(220, 38, 38, 0.55);
        box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.65);
      }
      .dock-kind--audio {
        color: #422006;
        background: rgba(250, 204, 21, 0.92);
        box-shadow: inset 0 0 0 1px rgba(234, 179, 8, 0.85);
      }
      .dock-meta {
        pointer-events: none;
        flex: 0 1 auto;
        min-width: 0;
        padding: 0 2px 0 0;
        font-size: 10px;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: 0.02em;
        color: #c4b5fd;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .dock-meta[hidden] {
        display: none;
      }
      .dock-divider {
        display: block;
        width: 1px;
        height: 16px;
        margin: 0 1px;
        background: rgba(255, 255, 255, 0.18);
        border-radius: 1px;
        flex-shrink: 0;
      }
      .asc-btn {
        appearance: none;
        -webkit-appearance: none;
        box-sizing: border-box;
        margin: 0;
        border: 0;
        flex: 0 0 auto;
        width: 30px;
        min-width: 30px;
        height: 30px;
        padding: 0;
        border-radius: 999px;
        background: transparent;
        color: #ddd6fe;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
        line-height: 1;
      }
      .asc-btn:hover {
        color: #fff;
        background: rgba(124, 58, 237, 0.32);
      }
      .asc-btn:focus-visible {
        outline: 2px solid rgba(196, 181, 253, 0.95);
        outline-offset: 2px;
      }
      .asc-btn svg {
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.75;
        stroke-linecap: round;
        stroke-linejoin: round;
        display: block;
      }
      .status {
        pointer-events: none;
        max-width: 180px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.3;
        color: #ede9fe;
        background: rgba(17, 12, 32, 0.94);
        border: 1px solid rgba(167, 139, 250, 0.42);
        box-shadow: 0 10px 28px rgba(15, 10, 30, 0.28);
        backdrop-filter: blur(12px);
        text-align: right;
      }
      .status[data-state="error"] {
        border-color: rgba(248, 113, 113, 0.55);
        color: #fecaca;
      }
      .status[hidden] {
        display: none;
      }
    `;

    wrapEl = document.createElement("div");
    wrapEl.className = "wrap";

    statusEl = document.createElement("div");
    statusEl.className = "status";
    statusEl.hidden = true;

    dockEl = document.createElement("div");
    dockEl.className = "dock";

    metaLeadEl = document.createElement("div");
    metaLeadEl.className = "dock-lead";
    metaLeadEl.hidden = true;

    kindBadgeEl = document.createElement("span");
    kindBadgeEl.className = "dock-kind dock-kind--image";
    kindBadgeEl.hidden = true;

    metaEl = document.createElement("span");
    metaEl.className = "dock-meta";
    metaEl.hidden = true;

    metaLeadEl.append(kindBadgeEl, metaEl);

    metaDividerEl = document.createElement("span");
    metaDividerEl.className = "dock-divider";
    metaDividerEl.setAttribute("aria-hidden", "true");
    metaDividerEl.hidden = true;

    copyBtnEl = document.createElement("button");
    copyBtnEl.type = "button";
    copyBtnEl.className = "asc-btn asc-btn--copy-url";
    copyBtnEl.innerHTML = ICON_LINK;

    const dockDividerAfterCopy = document.createElement("span");
    dockDividerAfterCopy.className = "dock-divider";
    dockDividerAfterCopy.setAttribute("aria-hidden", "true");

    openBtnEl = document.createElement("button");
    openBtnEl.type = "button";
    openBtnEl.className = "asc-btn asc-btn--open-new";
    openBtnEl.innerHTML = ICON_OPEN;

    const dockDividerAfterOpen = document.createElement("span");
    dockDividerAfterOpen.className = "dock-divider";
    dockDividerAfterOpen.setAttribute("aria-hidden", "true");

    clipboardBtnEl = document.createElement("button");
    clipboardBtnEl.type = "button";
    clipboardBtnEl.className = "asc-btn asc-btn--clipboard-media";
    clipboardBtnEl.innerHTML = ICON_CLIPBOARD;

    const dockDividerBeforeDownload = document.createElement("span");
    dockDividerBeforeDownload.className = "dock-divider";
    dockDividerBeforeDownload.setAttribute("aria-hidden", "true");

    downloadBtnEl = document.createElement("button");
    downloadBtnEl.type = "button";
    downloadBtnEl.className = "asc-btn asc-btn--download";
    downloadBtnEl.innerHTML = ICON_DOWNLOAD;

    copyBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (activeMedia) void copyMediaUrl(activeMedia);
    });

    openBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (activeMedia) openMediaInNewTab(activeMedia);
    });

    clipboardBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (activeMedia) void copyMediaToClipboard(activeMedia);
    });

    downloadBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (activeMedia) void downloadMedia(activeMedia);
    });

    dockEl.addEventListener("pointerenter", () => window.clearTimeout(hideTimer));
    dockEl.addEventListener("pointerleave", () => scheduleHide());

    dockEl.append(
      metaLeadEl,
      metaDividerEl,
      copyBtnEl,
      dockDividerAfterCopy,
      openBtnEl,
      dockDividerAfterOpen,
      clipboardBtnEl,
      dockDividerBeforeDownload,
      downloadBtnEl
    );
    wrapEl.append(dockEl, statusEl);
    shadow.append(style, wrapEl);
    setUiVisible(false);
    (document.body || document.documentElement).append(hostEl);
  }

  async function loadEnabled() {
    try {
      const res = await sendRuntimeMessage({ type: "COMPANION_GET_SETTINGS" });
      if (res && typeof res === "object" && "mediaHoverSaveEnabled" in res) {
        enabled = res.mediaHoverSaveEnabled !== false;
        return;
      }
    } catch {
      // ignore
    }
    try {
      const stored = await chrome.storage.local.get(["mediaHoverSaveEnabled"]);
      enabled = stored.mediaHoverSaveEnabled !== false;
    } catch {
      enabled = true;
    }
  }

  function start() {
    ensureUi();
    hideUi();
    bindStandaloneImagePage();
    if (isStandaloneImageDocument()) {
      const retry = () => bindStandaloneImagePage();
      document.addEventListener("DOMContentLoaded", retry, { once: true });
      window.addEventListener("load", retry, { once: true });
    }
    watchCaptureState();
    document.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });
    document.addEventListener(
      "pointerout",
      (event) => {
        if (event.relatedTarget) return;
        hideUi();
      },
      { passive: true, capture: true }
    );
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    try {
      window.visualViewport?.addEventListener("scroll", onScrollOrResize, { passive: true });
      window.visualViewport?.addEventListener("resize", onScrollOrResize, { passive: true });
    } catch {
      // ignore
    }
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !changes.mediaHoverSaveEnabled) return;
        enabled = changes.mediaHoverSaveEnabled.newValue !== false;
        if (!enabled) hideUi();
      });
    } catch {
      // ignore
    }
  }

  void loadEnabled().then(start);
})();
