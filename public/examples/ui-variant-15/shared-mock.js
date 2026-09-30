/** Mock + shell for Examples15 — workspace slot counters on node overview */

export const SLOTS = [
  {
    id: "memory",
    icon: "🧠",
    label: "Память",
    hint: "многофайловая",
    count: 35,
    types: "awn.content.record · category · sidecar",
    group: "memory"
  },
  {
    id: "inbox",
    icon: "📥",
    label: "Входящие",
    hint: null,
    count: 6,
    types: "record · category · sidecar",
    group: "workspace"
  },
  {
    id: "notes",
    icon: "📒",
    label: "Заметки",
    hint: null,
    count: 0,
    types: "record · category · sidecar",
    group: "workspace"
  },
  {
    id: "references",
    icon: "🔗",
    label: "Источники",
    hint: null,
    count: 3,
    types: "record · category · sidecar",
    group: "workspace"
  },
  {
    id: "artefacts",
    icon: "📦",
    label: "Артефакты",
    hint: null,
    count: 2,
    types: "record · category · sidecar",
    group: "files"
  },
  {
    id: "media",
    icon: "🖼",
    label: "Медиа",
    hint: null,
    count: 1,
    types: "sidecar · category · record",
    group: "files"
  },
  {
    id: "todo",
    icon: "✅",
    label: "TODO",
    hint: null,
    count: 4,
    types: "record · category",
    group: "todo"
  },
  {
    id: "scripts",
    icon: "⚡",
    label: "Скрипты",
    hint: null,
    count: 2,
    types: "record · category · sidecar",
    group: "files"
  }
];

export function typesTrigger(slot) {
  return `<button type="button" class="types-trigger" data-action="types" data-slot="${slot.id}" title="${slot.types}">Разрешенные типы</button>`;
}

export function labelStack(slot, stacked = true) {
  const hint = slot.hint
    ? `<span class="slot-label-hint">${slot.hint}</span>`
    : "";
  const inner = `<span class="slot-label-main">${slot.label}</span>${hint}${typesTrigger(slot)}`;
  return stacked
    ? `<span class="slot-label slot-label--stacked">${inner}</span>`
    : `<span class="slot-label">${inner}</span>`;
}

export function mountHub(root, variantTitle = "") {
  root.innerHTML = `
    <div class="hub-frame">
      <header class="hub-frame-head">
        <div class="hub-frame-crumb">Обзор ноды / Assistant.Ai</div>
        <h1 class="hub-frame-title">Слоты workspace <span class="hub-frame-variant">${variantTitle}</span></h1>
      </header>
      <div class="hub-frame-body" data-slot-host></div>
    </div>`;
  return root.querySelector("[data-slot-host]");
}

export function bindDemoActions(root) {
  const toast = document.getElementById("toast");
  const show = (text) => {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(show._t);
    show._t = setTimeout(() => toast.classList.remove("show"), 1400);
  };
  root.querySelectorAll("[data-action='open']").forEach((el) => {
    el.addEventListener("click", () =>
      show(`Открыть слот: ${el.dataset.label || el.dataset.slot || "—"}`)
    );
  });
  root.querySelectorAll("[data-action='types']").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      show(el.title || "Типы слота");
    });
  });
}
