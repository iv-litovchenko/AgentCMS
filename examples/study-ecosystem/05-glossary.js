(function () {
  const TERMS = [
    { term: "Bytecode", def: "Промежуточный код между .java и машинным кодом", source: "glossary-source.md", section: "JVM", letter: "B" },
    { term: "Generics", def: "Параметризация типов: List<String>", source: "glossary-source.md", section: "Generics", letter: "G" },
    { term: "Инкапсуляция", def: "Сокрытие внутреннего состояния объекта", source: "glossary-source.md", section: "ООП", letter: "И" },
    { term: "JVM", def: "Java Virtual Machine, исполняет байткод", source: "glossary-source.md", section: "JVM", letter: "J" },
    { term: "PECS", def: "Producer Extends, Consumer Super", source: "glossary-source.md", section: "Generics", letter: "P" },
    { term: "Полиморфизм", def: "Один интерфейс, разные реализации", source: "glossary-source.md", section: "ООП", letter: "П" },
    { term: "Wildcard", def: "? extends T и ? super T для гибкости API", source: "glossary-source.md", section: "Generics", letter: "W" },
  ].sort((a, b) => a.term.localeCompare(b.term, "ru"));

  function render(list) {
    const el = document.getElementById("glossary-list");
    const letters = document.getElementById("letter-nav");
    if (!el) return;

    if (!list.length) {
      el.innerHTML = `<p class="empty">Термины не найдены</p>`;
      return;
    }

    const byLetter = new Map();
    for (const t of list) {
      const L = t.term[0].toUpperCase();
      if (!byLetter.has(L)) byLetter.set(L, []);
      byLetter.get(L).push(t);
    }

    let html = "";
    for (const [letter, items] of [...byLetter.entries()].sort()) {
      html += `<section class="glossary-letter" id="letter-${letter}"><h3>${letter}</h3>`;
      for (const t of items) {
        html += `<article class="glossary-term">
          <div class="term-head"><strong>${t.term}</strong><span class="pill">${t.section}</span></div>
          <p>${t.def}</p>
          <a class="term-link" href="samples/${t.source}#${t.section.toLowerCase()}">источник →</a>
        </article>`;
      }
      html += `</section>`;
    }
    el.innerHTML = html;

    if (letters) {
      letters.innerHTML = [...byLetter.keys()].sort().map((L) =>
        `<a href="#letter-${L}" class="letter-chip">${L}</a>`
      ).join("");
    }
  }

  function init() {
    const search = document.getElementById("glossary-search");
    render(TERMS);
    search?.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      const filtered = q
        ? TERMS.filter((t) => t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q))
        : TERMS;
      render(filtered);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
