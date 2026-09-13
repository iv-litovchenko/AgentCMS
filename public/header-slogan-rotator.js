(function () {
  "use strict";

  const SLOGANS = [
    {
      kind: "arc",
      parts: ["Мысль", "действие", "результат"],
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Открой окно в реальный мир — иди!",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "ИИ — новое электричество.",
      holdMs: 7000
    },
    {
      kind: "text",
      text: "Человек с ИИ сильнее человека без ИИ.",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Контекст важнее модели.",
      holdMs: 7000
    },
    {
      kind: "text",
      text: "Куда фокус — туда и усилия.",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Робот делает задачу. Человек — смысл.",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Каждый час — возможность выбрать, куда его направить.",
      holdMs: 8000
    },
    {
      kind: "arc",
      parts: ["Новые лица", "новые маршруты", "новые впечатления"],
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Геймификация жизни: главное — не забыть жить.",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Интерес к жизни: шаг → награда → следующий шаг.",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Внимание — валюта, которую нельзя напечатать.",
      holdMs: 8000
    }
  ];

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

  function appendSeparator(parent, charIndexRef) {
    const sep = document.createElement("span");
    sep.className = "header-slogan-sep";
    sep.setAttribute("aria-hidden", "true");
    sep.style.setProperty("--char-i", String(charIndexRef.value));
    sep.textContent = "→";
    parent.appendChild(sep);
    charIndexRef.value += 1;
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
          appendSeparator(root, charIndexRef);
        }
      });
      return root;
    }

    appendLetters(root, item.text, charIndexRef);
    return root;
  }

  function boot() {
    const host = document.getElementById("header-slogan-rotator");
    const display = document.getElementById("header-slogan-display");
    if (!host || !display || host.dataset.sloganRotator === "on") return;

    host.dataset.sloganRotator = "on";

    let index = 0;
    let fadeTimer = null;
    let stepTimer = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const paint = (idx) => {
      display.replaceChildren(buildSloganNode(SLOGANS[idx]));
      if (!reducedMotion) {
        void display.offsetWidth;
      }
    };

    const step = () => {
      index = (index + 1) % SLOGANS.length;
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
      stepTimer = window.setTimeout(step, SLOGANS[index].holdMs);
    };

    paint(index);
    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
