(function () {
  const EVENTS = [
    { date: "1995-05", title: "Java 1.0", desc: "Публичный релиз, апплеты, AWT", kind: "release" },
    { date: "2004-09", title: "Java 5", desc: "Generics, аннотации, for-each", kind: "release" },
    { date: "2014-03", title: "Java 8", desc: "Лямбды, Stream API, Optional", kind: "release", highlight: true },
    { date: "2017-09", title: "Java 9", desc: "Модули (JPMS), JShell", kind: "release" },
    { date: "2021-09", title: "Java 17 LTS", desc: "Sealed classes, pattern matching", kind: "release", highlight: true },
    { date: "2023-09", title: "Java 21 LTS", desc: "Virtual threads, sequenced collections", kind: "release", highlight: true },
    { date: "2026-01", title: "Вы начали Java", desc: "Первый конспект: синтаксис", kind: "personal" },
    { date: "2026-03", title: "Проект TODO-app", desc: "Практика: CRUD + JDBC", kind: "personal" },
    { date: "2026-09", title: "Сейчас", desc: "Spring Boot + JPA", kind: "now" },
  ];

  function render(filter) {
    const el = document.getElementById("timeline");
    const items = filter === "all" ? EVENTS : EVENTS.filter((e) =>
      filter === "releases" ? e.kind === "release" : e.kind === "personal" || e.kind === "now"
    );

    el.innerHTML = items.map((e) => `
      <div class="tl-item kind-${e.kind} ${e.highlight ? 'is-highlight' : ''}">
        <div class="tl-dot"></div>
        <div class="tl-card">
          <time>${e.date}</time>
          <h3>${e.title}</h3>
          <p>${e.desc}</p>
        </div>
      </div>
    `).join("");
  }

  function init() {
    render("all");
    document.querySelectorAll("[data-tl-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-tl-filter]").forEach((b) => b.classList.toggle("is-active", b === btn));
        render(btn.dataset.tlFilter);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
