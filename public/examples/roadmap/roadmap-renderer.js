(function () {
  const STATUS_LABELS = {
    todo: "не начато",
    progress: "в процессе",
    done: "завершено",
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderStage(stage) {
    const label = STATUS_LABELS[stage.status] || stage.status;
    return `
      <div class="stage status-${stage.status}" data-status="${stage.status}" data-id="${escapeHtml(stage.id)}">
        <div class="stage-header">
          <h3>${escapeHtml(stage.title)}</h3>
          <span class="stage-badge">${escapeHtml(label)}</span>
        </div>
        <p class="stage-desc">${escapeHtml(stage.description)}</p>
      </div>`;
  }

  function renderRoadmap(data, container) {
    let html = "";
    for (let i = 0; i < data.columns.length; i++) {
      const col = data.columns[i];
      if (i > 0) html += `<div class="arrow" aria-hidden="true">→</div>`;

      if (col.type === "single") {
        html += `<div class="column single">${renderStage(col.stage)}</div>`;
      } else {
        const blocks = col.stages.map(renderStage).join("");
        html += `<div class="column parallel">${blocks}</div>`;
      }
    }
    container.innerHTML = html;
  }

  function bindHighlight(container) {
    container.querySelectorAll(".stage").forEach((el) => {
      el.addEventListener("pointerenter", () => el.classList.add("is-highlight"));
      el.addEventListener("pointerleave", () => el.classList.remove("is-highlight"));
    });
  }

  function updateProgress(data) {
    const all = [];
    for (const col of data.columns) {
      if (col.type === "single") all.push(col.stage);
      else all.push(...col.stages);
    }
    const done = all.filter((s) => s.status === "done").length;
    const progress = all.filter((s) => s.status === "progress").length;
    const todo = all.filter((s) => s.status === "todo").length;

    const elDone = document.getElementById("prog-done");
    const elProgress = document.getElementById("prog-progress");
    const elTodo = document.getElementById("prog-todo");
    const elTotal = document.getElementById("prog-total");

    if (elDone) elDone.textContent = done;
    if (elProgress) elProgress.textContent = progress;
    if (elTodo) elTodo.textContent = todo;
    if (elTotal) elTotal.textContent = all.length;
  }

  window.RoadmapRenderer = { renderRoadmap, bindHighlight, updateProgress };
})();
