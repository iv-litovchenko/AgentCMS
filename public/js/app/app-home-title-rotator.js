(function () {
  "use strict";

  const DEFAULT_TITLES = [
    { text: "Agent CMS", holdMs: 9000 },
    { text: "My Graph ORM", holdMs: 9000 },
    { text: "My Planet", holdMs: 6500 },
    { text: "My Radar", holdMs: 6500 },
    { text: "My World", holdMs: 6500 },
    { text: "My Compas", holdMs: 6500 },
    { text: "My Atlas", holdMs: 6500 },
    { text: "My Storage", holdMs: 6500 },
    { text: "My Memory", holdMs: 6500 },
    { text: "My Knowledge", holdMs: 6500 },
    { text: "My Tree", holdMs: 6500 },
    { text: "My Box", holdMs: 6500 }
  ];

  function normalizeTitle(item) {
    if (!item || typeof item !== "object") return null;
    const text = String(item.text || "").trim();
    if (!text) return null;
    const holdMs = Number(item.holdMs || 6500) || 6500;
    return { text, holdMs };
  }

  async function loadTitles() {
    try {
      const response = await fetch("/api/platform/ui-rotators", { cache: "no-store" });
      if (!response.ok) throw new Error("bad status");
      const payload = await response.json();
      const items = Array.isArray(payload?.homeTitles)
        ? payload.homeTitles.map(normalizeTitle).filter(Boolean)
        : [];
      if (items.length) return items;
    } catch (_error) {
      // fallback to embedded defaults
    }
    return DEFAULT_TITLES;
  }

  function pickRandomIndex(items, excludeIndex) {
    if (items.length <= 1) return 0;
    let next = excludeIndex;
    while (next === excludeIndex) {
      next = Math.floor(Math.random() * items.length);
    }
    return next;
  }

  async function boot() {
    const link = document.querySelector("#app-home-link");
    if (!link || link.dataset.titleRotator === "on") return;

    const host =
      document.getElementById("app-home-title") ||
      link.querySelector(".app-home-title");
    if (!host) return;

    link.dataset.titleRotator = "on";

    const titles = await loadTitles();
    const display = document.createElement("span");
    display.className = "app-home-title-display";
    display.setAttribute("aria-live", "polite");

    host.replaceChildren(display);

    let index = 0;
    let fadeTimer = null;
    let stepTimer = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = (idx) => {
      const item = titles[idx];
      display.textContent = item.text;
      link.title = `Главная — ${item.text}`;
      link.setAttribute("aria-label", `Главная — ${item.text}`);
    };

    const step = () => {
      index = pickRandomIndex(titles, index);
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
      stepTimer = window.setTimeout(step, titles[index].holdMs);
    };

    index = pickRandomIndex(titles, -1);
    render(index);
    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void boot();
    });
  } else {
    void boot();
  }
})();
