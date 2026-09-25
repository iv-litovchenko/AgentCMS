(function () {
  const data = {
    nodes: [
      { id: "root", label: "Java (конспекты)", level: "center" },

      { id: "file-syntax", label: "Основы синтаксиса", level: "file", parent: "root" },
      { id: "syn-types", label: "Типы данных", level: "branch", parent: "file-syntax" },
      { id: "syn-prim", label: "Примитивы", level: "leaf", parent: "syn-types" },
      { id: "syn-ref", label: "Ссылочные типы", level: "leaf", parent: "syn-types" },
      { id: "syn-gen", label: "Generics", level: "leaf", parent: "syn-types" },
      { id: "syn-ops", label: "Операторы", level: "branch", parent: "file-syntax" },
      { id: "syn-arith", label: "Арифметика", level: "leaf", parent: "syn-ops" },
      { id: "syn-cmp", label: "Сравнение", level: "leaf", parent: "syn-ops" },

      { id: "file-oop", label: "ООП", level: "file", parent: "root" },
      { id: "oop-classes", label: "Классы", level: "branch", parent: "file-oop" },
      { id: "oop-fields", label: "Поля и методы", level: "leaf", parent: "oop-classes" },
      { id: "oop-ctors", label: "Конструкторы", level: "leaf", parent: "oop-classes" },
      { id: "oop-inherit", label: "Наследование", level: "branch", parent: "file-oop" },
      { id: "oop-ext", label: "extends", level: "leaf", parent: "oop-inherit" },
      { id: "oop-super", label: "super", level: "leaf", parent: "oop-inherit" },

      { id: "file-db", label: "Базы данных", level: "file", parent: "root" },
      { id: "db-jdbc", label: "JDBC", level: "branch", parent: "file-db" },
      { id: "db-conn", label: "Connection", level: "leaf", parent: "db-jdbc" },
      { id: "db-ps", label: "PreparedStatement", level: "leaf", parent: "db-jdbc" },
      { id: "db-jpa", label: "JPA / Hibernate", level: "branch", parent: "file-db" },
      { id: "db-entity", label: "Entity", level: "leaf", parent: "db-jpa" },
      { id: "db-repo", label: "Repository", level: "leaf", parent: "db-jpa" },

      { id: "file-fw", label: "Фреймворки", level: "file", parent: "root" },
      { id: "fw-boot", label: "Spring Boot", level: "branch", parent: "file-fw" },
      { id: "fw-auto", label: "Auto-configuration", level: "leaf", parent: "fw-boot" },
      { id: "fw-starters", label: "Starters", level: "leaf", parent: "fw-boot" },
      { id: "fw-data", label: "Spring Data", level: "branch", parent: "file-fw" },
      { id: "fw-jpa", label: "JPA Repositories", level: "leaf", parent: "fw-data" },
      { id: "fw-query", label: "Query methods", level: "leaf", parent: "fw-data" },
    ],
    links: [
      { source: "root", target: "file-syntax", type: "tree" },
      { source: "root", target: "file-oop", type: "tree" },
      { source: "root", target: "file-db", type: "tree" },
      { source: "root", target: "file-fw", type: "tree" },
      { source: "file-syntax", target: "syn-types", type: "tree" },
      { source: "file-syntax", target: "syn-ops", type: "tree" },
      { source: "syn-types", target: "syn-prim", type: "tree" },
      { source: "syn-types", target: "syn-ref", type: "tree" },
      { source: "syn-types", target: "syn-gen", type: "tree" },
      { source: "syn-ops", target: "syn-arith", type: "tree" },
      { source: "syn-ops", target: "syn-cmp", type: "tree" },
      { source: "file-oop", target: "oop-classes", type: "tree" },
      { source: "file-oop", target: "oop-inherit", type: "tree" },
      { source: "oop-classes", target: "oop-fields", type: "tree" },
      { source: "oop-classes", target: "oop-ctors", type: "tree" },
      { source: "oop-inherit", target: "oop-ext", type: "tree" },
      { source: "oop-inherit", target: "oop-super", type: "tree" },
      { source: "file-db", target: "db-jdbc", type: "tree" },
      { source: "file-db", target: "db-jpa", type: "tree" },
      { source: "db-jdbc", target: "db-conn", type: "tree" },
      { source: "db-jdbc", target: "db-ps", type: "tree" },
      { source: "db-jpa", target: "db-entity", type: "tree" },
      { source: "db-jpa", target: "db-repo", type: "tree" },
      { source: "file-fw", target: "fw-boot", type: "tree" },
      { source: "file-fw", target: "fw-data", type: "tree" },
      { source: "fw-boot", target: "fw-auto", type: "tree" },
      { source: "fw-boot", target: "fw-starters", type: "tree" },
      { source: "fw-data", target: "fw-jpa", type: "tree" },
      { source: "fw-data", target: "fw-query", type: "tree" },
      { source: "oop-classes", target: "syn-types", type: "xref", label: "oop → syntax#типы-данных" },
      { source: "syn-types", target: "oop-classes", type: "xref", label: "syntax → oop#классы" },
      { source: "db-jpa", target: "fw-data", type: "xref", label: "databases → spring-data" },
      { source: "fw-boot", target: "db-jdbc", type: "xref", label: "frameworks → jdbc" },
      { source: "file-oop", target: "file-fw", type: "xref", label: "oop.md → frameworks.md" },
    ],
  };

  function init() {
    const { renderMindmap, bindPanZoom, bindHighlight } = window.Mindmap;
    const svg = document.getElementById("mindmap");
    renderMindmap(svg, data, { centerX: 550, centerY: 450, branchRadius: 240, leafRadius: 80 });
    bindHighlight(svg);
    const pan = bindPanZoom(document.getElementById("canvas-wrap"), document.getElementById("viewport"));
    document.getElementById("reset-view").addEventListener("click", () => pan.reset());

    let xrefVisible = true;
    document.getElementById("toggle-xref").addEventListener("click", (e) => {
      xrefVisible = !xrefVisible;
      svg.querySelectorAll(".link-xref").forEach((el) => {
        el.style.display = xrefVisible ? "" : "none";
      });
      e.target.textContent = xrefVisible ? "Скрыть ссылки" : "Показать ссылки";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
