(function () {
  const data = {
    nodes: [
      { id: "java", label: "Java", level: "center" },

      { id: "syntax", label: "Синтаксис", level: "branch", parent: "java" },
      { id: "syntax-vars", label: "Переменные и типы", level: "leaf", parent: "syntax" },
      { id: "syntax-flow", label: "Управляющие конструкции", level: "leaf", parent: "syntax" },
      { id: "syntax-collections", label: "Массивы и коллекции", level: "leaf", parent: "syntax" },

      { id: "oop", label: "ООП", level: "branch", parent: "java" },
      { id: "oop-classes", label: "Классы и объекты", level: "leaf", parent: "oop" },
      { id: "oop-inherit", label: "Наследование", level: "leaf", parent: "oop" },
      { id: "oop-interfaces", label: "Интерфейсы", level: "leaf", parent: "oop" },

      { id: "jvm", label: "JVM", level: "branch", parent: "java" },
      { id: "jvm-bytecode", label: "Bytecode", level: "leaf", parent: "jvm" },
      { id: "jvm-gc", label: "Garbage Collection", level: "leaf", parent: "jvm" },
      { id: "jvm-cl", label: "ClassLoader", level: "leaf", parent: "jvm" },
    ],
    links: [
      { source: "java", target: "syntax", type: "tree" },
      { source: "java", target: "oop", type: "tree" },
      { source: "java", target: "jvm", type: "tree" },
      { source: "syntax", target: "syntax-vars", type: "tree" },
      { source: "syntax", target: "syntax-flow", type: "tree" },
      { source: "syntax", target: "syntax-collections", type: "tree" },
      { source: "oop", target: "oop-classes", type: "tree" },
      { source: "oop", target: "oop-inherit", type: "tree" },
      { source: "oop", target: "oop-interfaces", type: "tree" },
      { source: "jvm", target: "jvm-bytecode", type: "tree" },
      { source: "jvm", target: "jvm-gc", type: "tree" },
      { source: "jvm", target: "jvm-cl", type: "tree" },
    ],
  };

  function init() {
    const { renderMindmap, bindPanZoom, bindHighlight } = window.Mindmap;
    const svg = document.getElementById("mindmap");
    renderMindmap(svg, data, { centerX: 500, centerY: 400, branchRadius: 200, leafRadius: 100 });
    bindHighlight(svg);
    const pan = bindPanZoom(document.getElementById("canvas-wrap"), document.getElementById("viewport"));
    document.getElementById("reset-view").addEventListener("click", () => pan.reset());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
