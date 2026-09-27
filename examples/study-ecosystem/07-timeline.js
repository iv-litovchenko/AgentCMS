(function () {
  const EVENTS = [
    { date: "1995-05", title: "Java 1.0", desc: "Публичный релиз, апплеты, AWT", kind: "release", era: "1990–2000" },
    { date: "2004-09", title: "Java 5", desc: "Generics, аннотации, for-each", kind: "release", era: "2000–2010" },
    { date: "2014-03", title: "Java 8", desc: "Лямбды, Stream API, Optional", kind: "release", highlight: true, era: "2010–2020" },
    { date: "2017-09", title: "Java 9", desc: "Модули (JPMS), JShell", kind: "release", era: "2010–2020" },
    { date: "2021-09", title: "Java 17 LTS", desc: "Sealed classes, pattern matching", kind: "release", highlight: true, era: "2020–" },
    { date: "2023-09", title: "Java 21 LTS", desc: "Virtual threads, sequenced collections", kind: "release", highlight: true, era: "2020–" },
    { date: "2026-01", title: "Вы начали Java", desc: "Первый конспект: синтаксис", kind: "personal", era: "Мой путь" },
    { date: "2026-03", title: "Проект TODO-app", desc: "Практика: CRUD + JDBC", kind: "personal", era: "Мой путь" },
    { date: "2026-09", title: "Сейчас", desc: "Spring Boot + JPA", kind: "now", era: "Мой путь" },
  ];

  const KIND_LABELS = {
    release: "Релиз",
    personal: "Веха",
    now: "Сейчас",
  };

  function formatWhen(date, kind) {
    const [y, m] = date.split("-");
    const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    const label = m ? `${months[Number(m) - 1] || m} ${y}` : y;
    return { main: label, sub: date };
  }

  function groupByEra(items) {
    const order = [];
    const map = new Map();
    for (const e of items) {
      const era = e.era || "Прочее";
      if (!map.has(era)) {
        map.set(era, []);
        order.push(era);
      }
      map.get(era).push(e);
    }
    return order.map((era) => ({ era, items: map.get(era) }));
  }

  function renderRow(e) {
    const when = formatWhen(e.date, e.kind);
    const classes = [
      "tl-row",
      `kind-${e.kind}`,
      e.highlight ? "is-highlight" : "",
      e.kind === "now" ? "is-now" : "",
    ].filter(Boolean).join(" ");

    return `
      <article class="${classes}">
        <div class="tl-when">${when.main}<span>${when.sub}</span></div>
        <div class="tl-body">
          <div class="tl-body-top">
            <h3>${e.title}</h3>
            <span class="tl-badge kind-${e.kind}">${KIND_LABELS[e.kind] || e.kind}</span>
          </div>
          <p>${e.desc}</p>
        </div>
      </article>`;
  }

  function render(filter) {
    const el = document.getElementById("timeline");
    const items = filter === "all"
      ? EVENTS
      : EVENTS.filter((e) =>
          filter === "releases" ? e.kind === "release" : e.kind === "personal" || e.kind === "now"
        );

    const groups = groupByEra(items);
    el.innerHTML = groups
      .map(
        (g) => `
      <section class="tl-era">
        <h3 class="tl-era-title">${g.era}</h3>
        <div class="tl-list">${g.items.map(renderRow).join("")}</div>
      </section>`
      )
      .join("");
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
