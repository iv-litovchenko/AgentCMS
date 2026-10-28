/**
 * Header copy from repo/_content_/easter-eggs/*.json via GET /api/platform/ui-eggs
 */
(function initHeaderUiEggsBoot() {
  "use strict";

  const API_URL = "/api/platform/ui-eggs";

  function normalizeSlogan(item) {
    if (!item || typeof item !== "object") return null;
    const holdMs = Number(item.holdMs || 8000) || 8000;
    const kind = String(item.kind || "text").trim().toLowerCase();
    if (kind === "arc") {
      const parts = Array.isArray(item.parts)
        ? item.parts.map((p) => String(p || "").trim()).filter(Boolean)
        : [];
      if (parts.length < 2) return null;
      return { kind: "arc", parts, holdMs };
    }
    const text = String(item.text || "").trim();
    if (!text) return null;
    return { kind: "text", text, holdMs };
  }

  function normalizeHomeTitle(item) {
    if (!item || typeof item !== "object") return null;
    const text = String(item.text || "").trim();
    if (!text) return null;
    return { text, holdMs: Number(item.holdMs || 6500) || 6500 };
  }

  function pickRandomIndex(len, exclude) {
    if (len <= 1) return 0;
    let next = exclude;
    while (next === exclude) next = Math.floor(Math.random() * len);
    return next;
  }

  function bootHomeTitles(items) {
    const link = document.querySelector("#app-home-link");
    const host = document.getElementById("app-home-title") || link?.querySelector(".app-home-title");
    if (!link || !host || link.dataset.titleRotator === "on") return;
    if (!items.length) return;

    link.dataset.titleRotator = "on";
    const display = document.createElement("span");
    display.className = "app-home-title-display";
    display.setAttribute("aria-live", "polite");
    host.replaceChildren(display);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index = pickRandomIndex(items.length, -1);
    let fadeTimer = null;
    let stepTimer = null;

    const render = (idx) => {
      const item = items[idx];
      display.textContent = item.text;
      link.title = `Главная — ${item.text}`;
      link.setAttribute("aria-label", `Главная — ${item.text}`);
    };

    const step = () => {
      index = pickRandomIndex(items.length, index);
      if (reducedMotion) {
        render(index);
        schedule();
        return;
      }
      display.classList.add("is-out");
      if (fadeTimer) window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => {
        render(index);
        display.classList.remove("is-out");
        schedule();
      }, 380);
    };

    const schedule = () => {
      if (stepTimer) window.clearTimeout(stepTimer);
      stepTimer = window.setTimeout(step, items[index].holdMs);
    };

    render(index);
    schedule();
  }

  function appendLetters(parent, text, charIndexRef) {
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = "header-slogan-char";
      span.style.setProperty("--char-i", String(charIndexRef.value));
      span.textContent = ch === " " ? "\u00a0" : ch;
      parent.appendChild(span);
      charIndexRef.value += 1;
    }
  }

  function buildSloganNode(item) {
    const root = document.createElement("span");
    root.className = "header-slogan-line";
    const charIndexRef = { value: 0 };
    if (item.kind === "arc") {
      root.classList.add("is-arc");
      item.parts.forEach((word, index) => {
        const wordNode = document.createElement("span");
        wordNode.className = "header-slogan-word";
        appendLetters(wordNode, word, charIndexRef);
        root.appendChild(wordNode);
        if (index < item.parts.length - 1) {
          const sep = document.createElement("span");
          sep.className = "header-slogan-sep";
          sep.setAttribute("aria-hidden", "true");
          sep.style.setProperty("--char-i", String(charIndexRef.value));
          sep.textContent = "→";
          root.appendChild(sep);
          charIndexRef.value += 1;
        }
      });
      return root;
    }
    appendLetters(root, item.text, charIndexRef);
    return root;
  }

  function bootSlogans(items) {
    const host = document.getElementById("header-slogan-rotator");
    const display = document.getElementById("header-slogan-display");
    if (!host || !display || host.dataset.sloganRotator === "on") return;
    if (!items.length) return;

    host.dataset.sloganRotator = "on";
    host.classList.remove("header-slogan-rotator--static");
    host.setAttribute("aria-live", "polite");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index = 0;
    let fadeTimer = null;
    let stepTimer = null;

    const fullText = (item) => (item.kind === "arc" ? item.parts.join(" → ") : item.text);

    const paint = (idx) => {
      const item = items[idx];
      display.title = fullText(item);
      display.replaceChildren(buildSloganNode(item));
      if (!reducedMotion) void display.offsetWidth;
    };

    const step = () => {
      index = (index + 1) % items.length;
      if (reducedMotion) {
        paint(index);
        schedule();
        return;
      }
      host.classList.add("is-out");
      if (fadeTimer) window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => {
        paint(index);
        host.classList.remove("is-out");
        schedule();
      }, 320);
    };

    const schedule = () => {
      if (stepTimer) window.clearTimeout(stepTimer);
      stepTimer = window.setTimeout(step, items[index].holdMs);
    };

    paint(index);
    schedule();
  }

  async function boot() {
    let payload = null;
    try {
      const response = await fetch(API_URL, { cache: "no-store" });
      if (response.ok) payload = await response.json();
    } catch {
      /* keep static HTML fallback */
    }

    const slogans = (Array.isArray(payload?.slogans) ? payload.slogans : [])
      .map(normalizeSlogan)
      .filter(Boolean);
    const homeTitles = (Array.isArray(payload?.homeTitles) ? payload.homeTitles : [])
      .map(normalizeHomeTitle)
      .filter(Boolean);

    if (homeTitles.length) bootHomeTitles(homeTitles);
    if (slogans.length) bootSlogans(slogans);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot(), { once: true });
  } else {
    void boot();
  }
})();
