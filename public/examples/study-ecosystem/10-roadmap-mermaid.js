(function () {
  const NODES = [
    { id: "syntax", label: "Основы синтаксиса", status: "done", x: 80, y: 120 },
    { id: "jdbc", label: "Базы данных", status: "progress", x: 280, y: 60 },
    { id: "oop", label: "ООП", status: "progress", x: 280, y: 180 },
    { id: "spring", label: "Фреймворки", status: "todo", x: 480, y: 120 },
    { id: "project", label: "Итоговый проект", status: "todo", x: 680, y: 120 },
  ];
  const LINKS = [
    ["syntax", "jdbc"], ["syntax", "oop"], ["jdbc", "spring"], ["oop", "spring"], ["spring", "project"],
  ];
  const STATUS_LABELS = { done: "завершено", progress: "в процессе", todo: "не начато" };

  function render() {
    const svg = document.getElementById("mermaid-roadmap");
    if (!svg) return;
    const byId = new Map(NODES.map((n) => [n.id, n]));

    let paths = "";
    for (const [a, b] of LINKS) {
      const s = byId.get(a), t = byId.get(b);
      paths += `<path class="rm-link" d="M ${s.x + 90} ${s.y + 28} L ${t.x} ${t.y + 28}" marker-end="url(#arrow)"/>`;
    }

    let nodes = "";
    for (const n of NODES) {
      nodes += `<g class="rm-node status-${n.status}" transform="translate(${n.x},${n.y})">
        <rect width="180" height="56" rx="10"/>
        <text x="90" y="22" text-anchor="middle" class="rm-label">${n.label}</text>
        <text x="90" y="42" text-anchor="middle" class="rm-status">${STATUS_LABELS[n.status]}</text>
      </g>`;
    }

    svg.innerHTML = `
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
        </marker>
      </defs>
      ${paths}${nodes}`;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
