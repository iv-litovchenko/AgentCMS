(function () {
  "use strict";

  const DEFAULT_SLOGANS = [
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
      text: "ИИ — новое электричество…",
      holdMs: 7000
    },
    {
      kind: "text",
      text: "Человек с ИИ сильнее человека без ИИ…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Контекст важнее модели…",
      holdMs: 7000
    },
    {
      kind: "text",
      text: "Куда фокус — туда и усилия…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Робот делает задачу. Человек — смысл…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Каждый час — возможность выбрать, куда его направить…",
      holdMs: 8000
    },
    {
      kind: "arc",
      parts: ["Новые лица", "новые маршруты", "новые впечатления"],
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Геймификация жизни: главное — не забыть жить…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Часть игры — разобрался в игре😃…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Интерес к жизни: шаг → награда → следующий шаг…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Внимание — валюта, которую нельзя напечатать…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Будешь ли ты моим вторым спутником? — Нет: я же модель с цензурой и правилами :)",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Сам выбирай, кто ты есть…",
      holdMs: 7000
    },
    {
      kind: "text",
      text: "Мы — то, что едим, думаем и делаем…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Feel the energy inside…",
      holdMs: 7000
    },
    {
      kind: "text",
      text: "Наша цель — всё, что можно вообразить…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Твой мини-интернет — у тебя в кармане…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Умная записная книжка — в твоих руках…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Твоё сомнение — это чей-то товар…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Каждый раз, когда тебе показывают успех в 25 — тебе продают товар или услугу…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Разыгрывай свои карты — а не смотри на чужие…",
      holdMs: 8000
    },
    {
      kind: "text",
      text: "Заблуждение коллекционера — вечно складируем, а не используем…",
      holdMs: 8000
    }
  ];

  function normalizeSlogan(item) {
    if (!item || typeof item !== "object") return null;
    const holdMs = Number(item.holdMs || 8000) || 8000;
    const kind = String(item.kind || "text").trim().toLowerCase();
    if (kind === "arc") {
      const parts = Array.isArray(item.parts)
        ? item.parts.map((part) => String(part || "").trim()).filter(Boolean)
        : [];
      if (parts.length < 2) return null;
      return { kind: "arc", parts, holdMs };
    }
    const text = String(item.text || "").trim();
    if (!text) return null;
    return { kind: "text", text, holdMs };
  }

  async function loadSlogans() {
    try {
      const response = await fetch("/api/platform/ui-rotators", { cache: "no-store" });
      if (!response.ok) throw new Error("bad status");
      const payload = await response.json();
      const items = Array.isArray(payload?.slogans)
        ? payload.slogans.map(normalizeSlogan).filter(Boolean)
        : [];
      if (items.length) return items;
    } catch (_error) {
      // fallback to embedded defaults
    }
    return DEFAULT_SLOGANS;
  }

  function shuffleSlogans(items) {
    const list = items.slice();
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
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

  async function boot() {
    const host = document.getElementById("header-slogan-rotator");
    const display = document.getElementById("header-slogan-display");
    if (!host || !display || host.dataset.sloganRotator === "on") return;

    host.dataset.sloganRotator = "on";

    const slogans = shuffleSlogans(await loadSlogans());
    let index = 0;
    let fadeTimer = null;
    let stepTimer = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sloganFullText = (item) => {
      if (item.kind === "arc") {
        return item.parts.join(" → ");
      }
      return item.text;
    };

    const paint = (idx) => {
      const item = slogans[idx];
      display.title = sloganFullText(item);
      display.replaceChildren(buildSloganNode(item));
      if (!reducedMotion) {
        void display.offsetWidth;
      }
    };

    const step = () => {
      index = (index + 1) % slogans.length;
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
      stepTimer = window.setTimeout(step, slogans[index].holdMs);
    };

    paint(index);
    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void boot();
    }, { once: true });
  } else {
    void boot();
  }
})();
