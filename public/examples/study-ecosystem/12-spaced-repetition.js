(function () {
  const ITEMS = [
    { text: "разница между == и equals для объектов", section: "Типы данных", source: "syntax.md", last: "2026-09-18", interval: 7, next: "2026-09-25", ease: 2.5 },
    { text: "таблица приоритетов операторов", section: "Операторы", source: "syntax.md", last: "2026-09-20", interval: 3, next: "2026-09-23", ease: 2.0 },
    { text: "порядок вызова конструкторов при наследовании", section: "Наследование", source: "oop.md", last: "2026-09-22", interval: 1, next: "2026-09-23", ease: 1.8 },
    { text: "отличие abstract class от interface", section: "Интерфейсы", source: "oop.md", last: "2026-09-15", interval: 14, next: "2026-09-29", ease: 2.5 },
    { text: "жизненный цикл Connection", section: "JDBC", source: "databases.md", last: "2026-09-21", interval: 5, next: "2026-09-26", ease: 2.2 },
    { text: "разница persist(), merge(), save()", section: "JPA", source: "databases.md", last: "2026-09-19", interval: 7, next: "2026-09-26", ease: 2.5 },
  ];

  const today = "2026-09-25";

  function render(filter) {
    const el = document.getElementById("sr-list");
    let items = [...ITEMS];
    if (filter === "due") items = items.filter((i) => i.next <= today);
    if (filter === "week") items = items.filter((i) => i.next <= "2026-10-02");

    el.innerHTML = items.map((i) => `
      <tr class="${i.next <= today ? "is-due" : ""}">
        <td>${i.text}</td>
        <td>${i.section}</td>
        <td><code>${i.source}</code></td>
        <td>${i.last}</td>
        <td>${i.interval}д</td>
        <td><strong>${i.next}</strong></td>
      </tr>
    `).join("");

    document.getElementById("stat-due").textContent = ITEMS.filter((i) => i.next <= today).length;
    document.getElementById("stat-total").textContent = ITEMS.length;
  }

  function exportCsv() {
    const header = "text,section,source,last_review,interval_days,next_review,ease\n";
    const rows = ITEMS.map((i) =>
      `"${i.text}","${i.section}","${i.source}",${i.last},${i.interval},${i.next},${i.ease}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "moe-povtorit-export.csv";
    a.click();
  }

  function exportAnki() {
    const lines = ITEMS.map((i) =>
      `${i.text.replace(/,/g, " ")};${i.section} (${i.source})<br>интервал: ${i.interval}д;#java`
    ).join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "moe-povtorit-anki.txt";
    a.click();
  }

  function init() {
    render("all");
    document.querySelectorAll("[data-sr-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-sr-filter]").forEach((b) => b.classList.toggle("is-active", b === btn));
        render(btn.dataset.srFilter);
      });
    });
    document.getElementById("export-csv")?.addEventListener("click", exportCsv);
    document.getElementById("export-anki")?.addEventListener("click", exportAnki);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
