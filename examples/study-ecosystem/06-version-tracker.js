(function () {
  const VERSIONS = [
    {
      id: "v5", date: "2026-09-20", label: "текущая", author: "вы",
      summary: "Добавлен раздел Records, обновлены примеры switch",
      changes: [
        { type: "add", text: "+ ## Records (Java 16+)" },
        { type: "add", text: "+ sealed classes — краткий обзор" },
        { type: "warn", text: "! Раздел «Date API» помечен устаревшим" },
      ],
      stale: [],
    },
    {
      id: "v4", date: "2026-06-15", label: "Java 21",
      summary: "Virtual threads, pattern matching for switch",
      changes: [
        { type: "add", text: "+ Virtual Threads — заметка" },
        { type: "edit", text: "~ Обновлён пример switch → pattern matching" },
      ],
      stale: ["Раздел Vector (legacy) — не используется с Java 9+"],
    },
    {
      id: "v3", date: "2025-11-02", label: "",
      summary: "Первый полный конспект по ООП",
      changes: [
        { type: "add", text: "+ Классы, наследование, интерфейсы" },
        { type: "add", text: "+ 12 примеров кода" },
      ],
      stale: [],
    },
    {
      id: "v2", date: "2025-08-10", label: "черновик",
      summary: "Только синтаксис и коллекции",
      changes: [
        { type: "add", text: "+ Переменные, циклы, ArrayList" },
      ],
      stale: ["Нет раздела про модули JPMS"],
    },
  ];

  function render() {
    const el = document.getElementById("version-list");
    if (!el) return;
    el.innerHTML = VERSIONS.map((v, i) => `
      <article class="version ${i === 0 ? 'is-current' : ''}" data-id="${v.id}">
        <div class="version-head">
          <div>
            <strong>${v.date}</strong>
            ${v.label ? `<span class="pill ${v.label === 'текущая' ? 'pill-green' : ''}">${v.label}</span>` : ''}
          </div>
          <span class="version-id">${v.id}</span>
        </div>
        <p class="version-summary">${v.summary}</p>
        <ul class="diff">${v.changes.map((c) => `<li class="diff-${c.type}">${c.text}</li>`).join("")}</ul>
        ${v.stale.length ? `<div class="stale"><strong>⚠ устарело:</strong> ${v.stale.join("; ")}</div>` : ""}
      </article>
    `).join("");
  }

  function init() {
    render();
    document.getElementById("version-list")?.addEventListener("click", (e) => {
      const card = e.target.closest(".version");
      if (!card) return;
      document.querySelectorAll(".version").forEach((v) => v.classList.remove("is-selected"));
      card.classList.add("is-selected");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
