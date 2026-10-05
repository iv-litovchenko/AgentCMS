(function () {
  const TABLES = {
    "abstract-vs-interface": {
      title: "Abstract class vs Interface",
      cols: ["Критерий", "Abstract class", "Interface"],
      rows: [
        ["Наследование", "Один класс", "Много интерфейсов"],
        ["Состояние", "Поля, конструктор", "Только константы (до Java)"],
        ["Методы", "Абстрактные + concrete", "Abstract, default, static"],
        ["Когда", "Общая реализация", "Контракт / роль"],
      ],
    },
    "java-vs-kotlin": {
      title: "Java vs Kotlin",
      cols: ["Аспект", "Java", "Kotlin"],
      rows: [
        ["Null-safety", "Optional, аннотации", "Типы T vs T?"],
        ["Классы данных", "record (Java 16+)", "data class"],
        ["Корутины", "Virtual threads", "suspend fun"],
        ["Экосистема", "Огромная", "Android + JVM"],
      ],
    },
    "jdbc-vs-jpa": {
      title: "JDBC vs JPA",
      cols: ["", "JDBC", "JPA / Hibernate"],
      rows: [
        ["Уровень", "Низкий, SQL руками", "ORM, объекты"],
        ["Контроль", "Полный", "Абстракция"],
        ["Сложность", "Больше кода", "Меньше boilerplate"],
        ["N+1", "Редко", "Частая ловушка"],
      ],
    },
  };

  function renderTable(data) {
    let html = `<h2 class="cmp-title">${data.title}</h2><table class="cmp-table"><thead><tr>`;
    for (const c of data.cols) html += `<th>${c}</th>`;
    html += `</tr></thead><tbody>`;
    for (const row of data.rows) {
      html += `<tr>${row.map((cell, i) => `<td class="${i === 0 ? 'cmp-key' : ''}">${cell}</td>`).join("")}</tr>`;
    }
    return html + `</tbody></table>`;
  }

  function init() {
    const panel = document.getElementById("cmp-panel");
    const show = (key) => {
      document.querySelectorAll("[data-cmp]").forEach((b) => b.classList.toggle("is-active", b.dataset.cmp === key));
      panel.innerHTML = renderTable(TABLES[key]);
    };
    document.querySelectorAll("[data-cmp]").forEach((btn) => {
      btn.addEventListener("click", () => show(btn.dataset.cmp));
    });
    show("abstract-vs-interface");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
