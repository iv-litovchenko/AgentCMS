(function () {
  "use strict";

  const TITLES = [
    { text: "My Graph ORM", holdMs: 9000 },
    { text: "Agent CMS", holdMs: 9000 },
    { text: "My Planet", holdMs: 6500 },
    { text: "My Radar", holdMs: 6500 },
    { text: "My World", holdMs: 6500 },
    { text: "My Compas", holdMs: 6500 },
    { text: "My Atlas", holdMs: 6500 },
    { text: "My Storage", holdMs: 6500 },
    { text: "My Knowledge", holdMs: 6500 },
    { text: "My Tree", holdMs: 6500 }
  ];

  function boot() {
    const link = document.querySelector("#app-home-link");
    if (!link || link.dataset.titleRotator === "on") return;

    const host =
      document.getElementById("app-home-title") ||
      link.querySelector(".app-home-title");
    if (!host) return;

    link.dataset.titleRotator = "on";

    const display = document.createElement("span");
    display.className = "app-home-title-display";
    display.setAttribute("aria-live", "polite");

    host.replaceChildren(display);

    let index = 0;
    let fadeTimer = null;
    let stepTimer = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = (idx) => {
      const item = TITLES[idx];
      display.textContent = item.text;
      link.title = `Главная — ${item.text}`;
      link.setAttribute("aria-label", `Главная — ${item.text}`);
    };

    const step = () => {
      index = (index + 1) % TITLES.length;
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
      stepTimer = window.setTimeout(step, TITLES[index].holdMs);
    };

    render(0);
    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
