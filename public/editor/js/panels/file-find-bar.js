(function initEditorFileFindBar() {
  const findBar = document.getElementById("editor-file-find-bar");
  const findInput = document.getElementById("editor-file-find-input");
  const findCount = document.getElementById("editor-file-find-count");
  const findPrevBtn = document.getElementById("editor-file-find-prev-btn");
  const findNextBtn = document.getElementById("editor-file-find-next-btn");
  const findCloseBtn = document.getElementById("editor-file-find-close-btn");
  const findOpenBtn = document.getElementById("editor-file-find-btn");
  const textarea = document.getElementById("file-content-input");
  const preview = document.getElementById("file-content-preview");
  if (!findBar || !findInput || !textarea) return;

  let matchIndices = [];
  let currentMatch = -1;
  let previewOriginalHtml = null;

  function getPlainText() {
    if (typeof window.getEditorPlainTextForFind === "function") {
      return window.getEditorPlainTextForFind();
    }
    return textarea.value || "";
  }

  function isPreviewVisible() {
    return Boolean(preview && !preview.classList.contains("hidden"));
  }

  function findAllMatches(text, query) {
    const needle = String(query || "");
    if (!needle) return [];
    const hay = String(text || "");
    const hayLower = hay.toLowerCase();
    const needleLower = needle.toLowerCase();
    const indices = [];
    let pos = 0;
    while (pos < hayLower.length) {
      const idx = hayLower.indexOf(needleLower, pos);
      if (idx === -1) break;
      indices.push(idx);
      pos = idx + Math.max(needleLower.length, 1);
    }
    return indices;
  }

  function updateCountLabel() {
    if (!findCount) return;
    if (!matchIndices.length) {
      findCount.textContent = findInput.value.trim() ? "0 / 0" : "";
      return;
    }
    findCount.textContent = `${currentMatch + 1} / ${matchIndices.length}`;
  }

  function clearPreviewMarks() {
    if (!preview) return;
    if (previewOriginalHtml != null) {
      preview.innerHTML = previewOriginalHtml;
      previewOriginalHtml = null;
    }
  }

  function highlightPreviewMatch(start, length) {
    if (!preview || !isPreviewVisible() || length <= 0) return;
    if (previewOriginalHtml == null) previewOriginalHtml = preview.innerHTML;

    const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;
    const end = start + length;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLen = node.textContent.length;
      if (!startNode && start < offset + nodeLen) {
        startNode = node;
        startOffset = start - offset;
      }
      if (!endNode && end <= offset + nodeLen) {
        endNode = node;
        endOffset = end - offset;
        break;
      }
      offset += nodeLen;
    }

    if (!startNode || !endNode) return;

    preview.querySelectorAll(".editor-file-find-mark").forEach((node) => {
      const parent = node.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(node.textContent), node);
      parent.normalize();
    });

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const mark = document.createElement("mark");
    mark.className = "editor-file-find-mark is-active";
    try {
      range.surroundContents(mark);
      mark.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {
      mark.remove();
    }
  }

  function goToMatch(index) {
    if (!matchIndices.length) {
      currentMatch = -1;
      updateCountLabel();
      return;
    }

    currentMatch = ((index % matchIndices.length) + matchIndices.length) % matchIndices.length;
    const start = matchIndices[currentMatch];
    const query = findInput.value;
    const end = start + query.length;

    if (isPreviewVisible()) {
      highlightPreviewMatch(start, query.length);
    } else {
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(start, end);
      const lineHeight = Number.parseInt(getComputedStyle(textarea).lineHeight, 10) || 18;
      const line = textarea.value.slice(0, start).split("\n").length - 1;
      textarea.scrollTop = Math.max(0, line * lineHeight - textarea.clientHeight / 3);
    }

    updateCountLabel();
  }

  function runFind({ advance = 0 } = {}) {
    const query = findInput.value;
    if (!query.trim()) {
      matchIndices = [];
      currentMatch = -1;
      clearPreviewMarks();
      updateCountLabel();
      return;
    }

    matchIndices = findAllMatches(getPlainText(), query);
    if (!matchIndices.length) {
      currentMatch = -1;
      clearPreviewMarks();
      updateCountLabel();
      return;
    }

    if (advance === 0 && currentMatch >= 0 && currentMatch < matchIndices.length) {
      goToMatch(currentMatch);
      return;
    }
    if (advance === 0) goToMatch(0);
    else if (advance > 0) goToMatch(currentMatch + 1);
    else goToMatch(currentMatch - 1);
  }

  function openFindBar() {
    findBar.classList.remove("hidden");
    findOpenBtn?.classList.add("active");
    findInput.focus({ preventScroll: true });
    findInput.select();
    runFind();
  }

  function closeFindBar() {
    findBar.classList.add("hidden");
    findOpenBtn?.classList.remove("active");
    matchIndices = [];
    currentMatch = -1;
    clearPreviewMarks();
    updateCountLabel();
  }

  findOpenBtn?.addEventListener("click", openFindBar);
  findCloseBtn?.addEventListener("click", closeFindBar);
  findNextBtn?.addEventListener("click", () => runFind({ advance: 1 }));
  findPrevBtn?.addEventListener("click", () => runFind({ advance: -1 }));
  findInput.addEventListener("input", () => runFind({ advance: 0 }));
  findInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runFind({ advance: event.shiftKey ? -1 : 1 });
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeFindBar();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "f") return;
    if (document.activeElement?.closest(".content-search-wrap")) return;
    if (document.activeElement?.closest(".app-landing-search")) return;
    event.preventDefault();
    openFindBar();
  });

  textarea.addEventListener("input", () => {
    previewOriginalHtml = null;
    if (!findBar.classList.contains("hidden")) runFind({ advance: 0 });
  });
})();
