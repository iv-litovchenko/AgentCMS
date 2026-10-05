(function () {
  const NODES = [
    { id: "root", label: "Java", level: "center", x: 400, y: 200 },
    { id: "syntax", label: "Синтаксис", level: "branch", x: 200, y: 100, section: "Основы синтаксиса Java" },
    { id: "oop", label: "ООП", level: "branch", x: 600, y: 100, section: "Объектно-ориентированное программирование" },
    { id: "db", label: "Базы данных", level: "branch", x: 200, y: 300, section: "Базы данных и JDBC" },
    { id: "types", label: "Типы данных", level: "leaf", x: 100, y: 40, section: "Основы синтаксиса Java → Типы данных" },
    { id: "generics", label: "Generics", level: "leaf", x: 100, y: 160, section: "Основы синтаксиса Java → Типы данных → Generics" },
    { id: "classes", label: "Классы", level: "leaf", x: 550, y: 40, section: "Объектно-ориентированное программирование → Классы и объекты" },
    { id: "jdbc", label: "JDBC", level: "leaf", x: 100, y: 300, section: "Базы данных и JDBC → JDBC" },
  ];
  const LINKS = [
    ["root", "syntax"], ["root", "oop"], ["root", "db"],
    ["syntax", "types"], ["syntax", "generics"], ["oop", "classes"], ["db", "jdbc"],
  ];

  const MARKERS = [
    { type: "мое повторить", text: "разница между == и equals", section: "Основы синтаксиса Java → Типы данных" },
    { type: "мое важно", text: "для строк всегда .equals()", section: "Основы синтаксиса Java → Типы данных" },
    { type: "мое вопрос", text: "bounded wildcard extends vs super?", section: "Основы синтаксиса Java → Типы данных → Generics" },
    { type: "мое заметка", text: "PECS — Producer Extends, Consumer Super", section: "Основы синтаксиса Java → Типы данных → Generics" },
    { type: "мое вопрос", text: "зачем конструктор по умолчанию?", section: "Объектно-ориентированное программирование → Классы и объекты" },
    { type: "мое идея", text: "шпаргалка конструктор vs фабрика", section: "Объектно-ориентированное программирование → Классы и объекты" },
    { type: "мое повторить", text: "жизненный цикл Connection", section: "Базы данных и JDBC → JDBC" },
    { type: "мое ошибка", text: "забыл @Transactional", section: "Базы данных и JDBC → JPA / Hibernate" },
  ];

  const TYPE_ICONS = {
    "мое повторить": "↻", "мое вопрос": "?", "мое заметка": "✎",
    "мое важно": "!", "мое ошибка": "✕", "мое идея": "★",
  };

  function renderMap() {
    const svg = document.getElementById("mindmap");
    const byId = new Map(NODES.map((n) => [n.id, n]));
    let html = "";
    for (const [a, b] of LINKS) {
      const s = byId.get(a), t = byId.get(b);
      html += `<line class="mm-link" x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}"/>`;
    }
    for (const n of NODES) {
      const r = n.level === "center" ? 24 : n.level === "branch" ? 14 : 7;
      const count = MARKERS.filter((m) => m.section.startsWith(n.section || "___")).length;
      html += `<g class="mm-node ${n.level}" data-id="${n.id}" data-section="${n.section || ""}" transform="translate(${n.x},${n.y})" style="cursor:pointer">
        <circle r="${r}"/>
        <text x="${r + 6}" y="4" class="mm-text">${n.label}</text>
        ${count ? `<text x="${r + 6}" y="18" class="mm-count">${count} пометок</text>` : ""}
      </g>`;
    }
    svg.innerHTML = html;
  }

  function showMarkers(node) {
    const panel = document.getElementById("markers-panel");
    const section = node.dataset.section;
    if (!section) {
      panel.innerHTML = `<p class="empty">У корневого узла нет привязанных пометок. Кликните на ветку или лист.</p>`;
      return;
    }
    const items = MARKERS.filter((m) => m.section.startsWith(section));
    document.getElementById("panel-title").textContent = node.querySelector(".mm-text").textContent;
    panel.innerHTML = items.length
      ? `<ul class="marker-list">${items.map((m) => `
          <li class="marker-item">
            <span class="m-icon">${TYPE_ICONS[m.type] || "•"}</span>
            <div><span class="m-type">[${m.type}]</span><p>${m.text}</p></div>
          </li>`).join("")}</ul>`
      : `<p class="empty">В этом разделе пока нет пометок [мое *]</p>`;
  }

  function init() {
    renderMap();
    document.querySelectorAll(".mm-node").forEach((node) => {
      node.addEventListener("click", () => {
        document.querySelectorAll(".mm-node").forEach((n) => n.classList.remove("is-active"));
        node.classList.add("is-active");
        showMarkers(node);
      });
    });
    const first = document.querySelector('.mm-node[data-id="syntax"]');
    if (first) {
      first.classList.add("is-active");
      showMarkers(first);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
