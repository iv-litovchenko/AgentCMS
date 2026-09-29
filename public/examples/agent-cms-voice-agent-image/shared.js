function bindCopyApiSnippet() {
  const node = document.querySelector("[data-api-snippet]");
  if (!node || node.dataset.bound === "1") return;
  node.dataset.bound = "1";
  node.style.cursor = "pointer";
  node.title = "Нажмите, чтобы скопировать URL-паттерн";
  node.addEventListener("click", async () => {
    const text = node.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      const prev = node.textContent;
      node.textContent = "Скопировано ✓";
      setTimeout(() => {
        node.textContent = prev;
      }, 1200);
    } catch {
      // ignore
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindCopyApiSnippet();
});
