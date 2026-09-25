(function () {
  // Сборка: внутреннее дерево (sample-assembly/) + внешние узлы (другие папки, глоссарий, URL)
  const data = {
    nodes: [
      { id: "root", label: "Java (сборка)", level: "center" },

      // ── внутреннее содержимое (sample-assembly/) ──
      { id: "file-syntax", label: "syntax.md", level: "file", parent: "root" },
      { id: "syn-types", label: "Типы данных", level: "branch", parent: "file-syntax" },
      { id: "syn-ops", label: "Операторы", level: "branch", parent: "file-syntax" },

      { id: "file-oop", label: "oop.md", level: "file", parent: "root" },
      { id: "oop-classes", label: "Классы", level: "branch", parent: "file-oop" },
      { id: "oop-inherit", label: "Наследование", level: "branch", parent: "file-oop" },

      { id: "file-db", label: "databases.md", level: "file", parent: "root" },
      { id: "db-jdbc", label: "JDBC", level: "branch", parent: "file-db" },
      { id: "db-jpa", label: "JPA", level: "branch", parent: "file-db" },

      { id: "file-fw", label: "frameworks.md", level: "file", parent: "root" },
      { id: "fw-boot", label: "Spring Boot", level: "branch", parent: "file-fw" },
      { id: "fw-data", label: "Spring Data", level: "branch", parent: "file-fw" },

      // ── внешние узлы (вне папки сборки) ──
      { id: "ext-oracle", label: "docs.oracle.com", level: "external", x: 80, y: 40 },
      { id: "ext-spring", label: "spring.io/guides", level: "external", x: 920, y: 60 },
      { id: "ext-markers", label: "study-markers/syntax.md", level: "external", x: 60, y: 380 },
      { id: "ext-markers-db", label: "study-markers/databases.md", level: "external", x: 940, y: 360 },

      // ── термины (слой 4 / глоссарий) ──
      { id: "term-generics", label: "Generics", level: "term", x: 500, y: 30 },
      { id: "term-poly", label: "Полиморфизм", level: "term", x: 500, y: 470 },
    ],
    links: [
      // дерево (внутреннее)
      { source: "root", target: "file-syntax", type: "tree" },
      { source: "root", target: "file-oop", type: "tree" },
      { source: "root", target: "file-db", type: "tree" },
      { source: "root", target: "file-fw", type: "tree" },
      { source: "file-syntax", target: "syn-types", type: "tree" },
      { source: "file-syntax", target: "syn-ops", type: "tree" },
      { source: "file-oop", target: "oop-classes", type: "tree" },
      { source: "file-oop", target: "oop-inherit", type: "tree" },
      { source: "file-db", target: "db-jdbc", type: "tree" },
      { source: "file-db", target: "db-jpa", type: "tree" },
      { source: "file-fw", target: "fw-boot", type: "tree" },
      { source: "file-fw", target: "fw-data", type: "tree" },

      // внутренние перекрёстные (между .md в папке)
      { source: "oop-classes", target: "syn-types", type: "xref", label: "oop.md → syntax.md#типы-данных" },
      { source: "syn-types", target: "oop-classes", type: "xref", label: "syntax.md → oop.md#классы" },
      { source: "db-jdbc", target: "fw-data", type: "xref", label: "databases → frameworks#spring-data" },
      { source: "fw-data", target: "db-jdbc", type: "xref", label: "frameworks → jdbc" },

      // внешние ссылки (другие папки, URL)
      { source: "syn-types", target: "ext-oracle", type: "xref-ext", label: "[Oracle Tutorial](https://docs.oracle.com/…)" },
      { source: "oop-inherit", target: "ext-spring", type: "xref-ext", label: "[Spring Guide](https://spring.io/guides)" },
      { source: "syn-ops", target: "ext-markers", type: "xref-ext", label: "../../study-markers/sample-notes/syntax.md" },
      { source: "db-jpa", target: "ext-markers-db", type: "xref-ext", label: "../../study-markers/…/databases.md" },

      // термины глоссария (слой 4)
      { source: "syn-types", target: "term-generics", type: "xref-term", label: "[[Generics]]" },
      { source: "oop-inherit", target: "term-poly", type: "xref-term", label: "[[Полиморфизм]]" },
    ],
  };

  function init() {
    const svg = document.getElementById("mindmap");
    const { renderMindmap, bindPanZoom, bindHighlight } = window.Mindmap;
    renderMindmap(svg, data, { centerX: 500, centerY: 250, branchRadius: 170, leafRadius: 70 });
    bindHighlight(svg);
    const pan = bindPanZoom(document.getElementById("canvas-wrap"), document.getElementById("viewport"));
    document.getElementById("reset-view")?.addEventListener("click", () => pan.reset());

    let show = { xref: true, ext: true, term: true };
    document.getElementById("toggle-xref")?.addEventListener("click", (e) => {
      show.xref = !show.xref;
      svg.querySelectorAll(".link-xref").forEach((el) => { el.style.display = show.xref ? "" : "none"; });
      e.target.classList.toggle("is-active", show.xref);
    });
    document.getElementById("toggle-ext")?.addEventListener("click", (e) => {
      show.ext = !show.ext;
      svg.querySelectorAll(".link-xref-ext, .node.external").forEach((el) => { el.style.display = show.ext ? "" : "none"; });
      e.target.classList.toggle("is-active", show.ext);
    });
    document.getElementById("toggle-term")?.addEventListener("click", (e) => {
      show.term = !show.term;
      svg.querySelectorAll(".link-xref-term, .node.term").forEach((el) => { el.style.display = show.term ? "" : "none"; });
      e.target.classList.toggle("is-active", show.term);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
