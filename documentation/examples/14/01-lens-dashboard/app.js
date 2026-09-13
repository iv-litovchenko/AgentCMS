const MOCK = {
  pulse: { topics: 12, tasks: 3, inbox: 5, cron: 2 },
  todo: [
    "Добавить виджет задач на дашборд",
    "Проверить inbox после выходных",
    "Обновить manifest workspace"
  ],
  focus: [
    { emoji: "🧠", name: "Память агента", ago: "2ч назад" },
    { emoji: "📋", name: "Задачи и планы", ago: "вчера" },
    { emoji: "🔌", name: "Интеграции MCP", ago: "3 дня" }
  ],
  inbox: [
    "Ссылка на статью про RAG",
    "Идея: дашборд из markdown",
    "Скриншот бага в сайдбаре"
  ],
  recent: [
    { path: "TODO.md", action: "правка", ago: "12 мин" },
    { path: "agent-cms-test/zadachi/…", action: "новая заметка", ago: "1ч" },
    { path: "manifest.yaml", action: "правка", ago: "вчера" }
  ],
  topics: [
    { emoji: "🧪", name: "agent-cms-test", path: "workspace" },
    { emoji: "📚", name: "Документация", path: "core/docs" },
    { emoji: "🗂️", name: "Задачи и планы", path: "core/zadachi" }
  ],
  config: `dashboard:
  - type: todo
    title: "Сейчас в работе"
    limit: 5
  - type: focus
    limit: 4
  - type: inbox
    limit: 3
  - type: recent
    limit: 6`
};

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function renderWidgetHead(title, note, badge, badgeTone = "") {
  const head = el("div", "widget-head");
  const copy = el("div");
  copy.append(el("h3", "widget-title", title));
  if (note) copy.append(el("p", "widget-note", note));
  head.append(copy);
  if (badge) head.append(el("span", `widget-badge${badgeTone ? ` widget-badge--${badgeTone}` : ""}`, badge));
  return head;
}

function renderListItem(left, text, meta, action) {
  const li = el("li", "widget-item");
  li.append(el("span", left.className || "", left.html || ""));
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = text;
  btn.addEventListener("click", () => showToast(action));
  li.append(btn, el("span", "widget-meta", meta));
  return li;
}

function renderTodoWidget() {
  const widget = el("article", "widget");
  widget.append(renderWidgetHead("Задачи", "из TODO.md", `${MOCK.todo.length} открытых`));

  const list = el("ul", "widget-list");
  for (const item of MOCK.todo) {
    list.appendChild(renderListItem({ className: "widget-check" }, item, "", `Открыть задачу: ${item}`));
  }
  widget.appendChild(list);

  const foot = el("div", "widget-foot");
  const link = document.createElement("button");
  link.type = "button";
  link.className = "widget-link";
  link.textContent = "все → TODO.md";
  link.addEventListener("click", () => showToast("Открыть TODO.md"));
  foot.appendChild(link);
  widget.appendChild(foot);
  return widget;
}

function renderFocusWidget() {
  const widget = el("article", "widget");
  widget.append(renderWidgetHead("В фокусе", "закреплённые темы", `${MOCK.focus.length}`));

  const list = el("ul", "widget-list");
  for (const item of MOCK.focus) {
    list.appendChild(
      renderListItem(
        { className: "focus-dot" },
        `${item.emoji} ${item.name}`,
        item.ago,
        `Открыть тему: ${item.name}`
      )
    );
  }
  widget.appendChild(list);
  return widget;
}

function renderInboxWidget() {
  const widget = el("article", "widget");
  widget.append(renderWidgetHead("Входящие", "inbox slot", `${MOCK.inbox.length} новых`, "warn"));

  const list = el("ul", "widget-list");
  for (const item of MOCK.inbox) {
    list.appendChild(renderListItem({ className: "widget-check" }, item, "", `Разобрать: ${item}`));
  }
  widget.appendChild(list);

  const foot = el("div", "widget-foot");
  const link = document.createElement("button");
  link.type = "button";
  link.className = "widget-link";
  link.textContent = "разобрать → Inbox";
  link.addEventListener("click", () => showToast("Открыть Inbox"));
  foot.appendChild(link);
  widget.appendChild(foot);
  return widget;
}

function renderRecentWidget() {
  const widget = el("article", "widget widget--wide");
  widget.append(renderWidgetHead("Недавно", "activity / history", ""));

  const list = el("ul", "widget-list");
  for (const item of MOCK.recent) {
    list.appendChild(
      renderListItem(
        { className: "focus-dot" },
        item.path,
        `${item.action} · ${item.ago}`,
        `Открыть: ${item.path}`
      )
    );
  }
  widget.appendChild(list);
  return widget;
}

function renderTopics() {
  const section = el("section", "topics");
  section.append(el("h3", "topics-title", "Быстрый доступ к темам"));

  const grid = el("div", "topics-grid");
  for (const topic of MOCK.topics) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "topic-card";
    card.innerHTML = `
      <span class="topic-emoji">${topic.emoji}</span>
      <span class="topic-name">${topic.name}</span>
      <span class="topic-path">${topic.path}</span>
    `;
    card.addEventListener("click", () => showToast(`Открыть тему: ${topic.name}`));
    grid.appendChild(card);
  }
  section.appendChild(grid);
  return section;
}

function renderConfig() {
  const panel = el("section", "config-panel");
  panel.append(el("h3", "config-title", "Конфиг в manifest.yaml"));
  const pre = document.createElement("pre");
  pre.className = "config-pre";
  pre.textContent = MOCK.config;
  panel.appendChild(pre);
  return panel;
}

function mount() {
  const root = document.getElementById("app");
  if (!root) return;

  const shell = el("div", "shell");
  shell.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Workspace · home-pane-2</p>
      <h1 class="title">Дашборд — линзы, не гирлянда</h1>
      <p class="lead">
        Виджеты читают уже существующие данные CMS. Максимум 4 блока + строка-сводка.
        Каждый виджет ведёт к полному экрану.
      </p>
    </header>
  `;

  const pulse = el("div", "pulse");
  pulse.innerHTML = `
    <span><strong>${MOCK.pulse.topics}</strong> тем</span>
    <span class="pulse-sep">·</span>
    <span><strong>${MOCK.pulse.tasks}</strong> задачи</span>
    <span class="pulse-sep">·</span>
    <span><strong>${MOCK.pulse.inbox}</strong> inbox</span>
    <span class="pulse-sep">·</span>
    <span><strong>${MOCK.pulse.cron}</strong> cron</span>
  `;
  shell.appendChild(pulse);

  const grid = el("div", "grid");
  grid.append(renderTodoWidget(), renderFocusWidget(), renderInboxWidget(), renderRecentWidget());
  shell.append(grid, renderTopics(), renderConfig());

  root.appendChild(shell);
}

mount();
