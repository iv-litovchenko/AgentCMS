/**
 * Footer: каталог идей голосового управления Agent CMS (фразы ↔ MCP / UI).
 */
(function initAppFooterVoiceCmdPopover() {
  const btn = document.getElementById("app-footer-voice-cmd-btn");
  const popover = document.getElementById("app-footer-voice-cmd-popover");
  const body = document.getElementById("app-footer-voice-cmd-body");
  const closeBtn = document.getElementById("app-footer-voice-cmd-close-btn");
  if (!btn || !popover || !body) return;

  /** @type {Array<{ id: string, title: string, note?: string, items: Array<{ phrases: string[], tools: string[], status?: "planned" | "mcp" | "local" }> }>} */
  const SECTIONS = [
    {
      id: "ui-scroll",
      title: "Экран CMS (прокрутка и фокус)",
      note: "Локально в UI (postMessage / voice-bridge), без LLM — быстрый отклик.",
      items: [
        {
          phrases: ["пролистай вниз", "ещё ниже", "страница вниз"],
          tools: ["cms:scroll(down)"],
          status: "planned"
        },
        {
          phrases: ["пролистай вверх", "страница вверх"],
          tools: ["cms:scroll(up)"],
          status: "planned"
        },
        { phrases: ["наверх", "в начало"], tools: ["cms:scroll(top)"], status: "planned" },
        { phrases: ["в конец"], tools: ["cms:scroll(bottom)"], status: "planned" },
        {
          phrases: ["к заголовку …", "прокрути к …"],
          tools: ["cms:scrollTo(heading)"],
          status: "planned"
        },
        {
          phrases: ["левую колонку вниз", "меню вниз"],
          tools: ["cms:scroll(panel=sidebar)"],
          status: "planned"
        },
        {
          phrases: ["текст вниз", "правую колонку вниз"],
          tools: ["cms:scroll(panel=workspace)"],
          status: "planned"
        },
        {
          phrases: ["заблокируй экран хранилища", "заблокируй хранилище", "покажи заставку"],
          tools: ["cms:idle-screensaver(lock)"],
          status: "local"
        },
        {
          phrases: ["разблокируй экран хранилища", "разблокируй хранилище", "сними заставку"],
          tools: ["cms:idle-screensaver(unlock)"],
          status: "local"
        },
        {
          phrases: ["начни помидор", "начни фокус", "запусти помидор"],
          tools: ["cms:pomodoro(start)"],
          status: "local"
        },
        {
          phrases: ["останови помидор", "стоп помидор"],
          tools: ["cms:pomodoro(stop)"],
          status: "local"
        },
        {
          phrases: ["отдохнули", "отдохнул"],
          tools: ["cms:pomodoro(break-done)"],
          status: "local"
        },
        {
          phrases: ["где я", "что на экране"],
          tools: ["page-snapshot (Voice ↔ CMS)"],
          status: "local"
        }
      ]
    },
    {
      id: "nav",
      title: "Открыть и перейти",
      note: "Поиск сущности → URL (CHPU) → открыть вкладку CMS.",
      items: [
        {
          phrases: ["открой …", "перейди к …"],
          tools: ["search_workspace_hybrid", "get_page_url"],
          status: "mcp"
        },
        {
          phrases: ["открой inbox", "что во входящих"],
          tools: ["list_inbox", "get_page_url"],
          status: "mcp"
        },
        {
          phrases: ["открой todo", "мои задачи"],
          tools: ["read_workspace_todo", "get_page_url"],
          status: "mcp"
        },
        {
          phrases: ["открой журнал"],
          tools: ["list_journal_entries", "get_page_url"],
          status: "mcp"
        },
        {
          phrases: ["следующая запись", "предыдущая"],
          tools: ["cms:nav(list=next|prev)"],
          status: "planned"
        },
        { phrases: ["назад", "к списку", "домой"], tools: ["history.back / CHPU hub"], status: "planned" },
        {
          phrases: ["режим редактирования", "просмотр", "навигация", "todo-вид"],
          tools: ["get_page_url(view=edit|preview|nav|todo|…)"],
          status: "mcp"
        },
        {
          phrases: ["переключись на workspace …"],
          tools: ["list_workspaces", "set_default_workspace"],
          status: "mcp"
        }
      ]
    },
    {
      id: "search",
      title: "Поиск и ответ",
      items: [
        { phrases: ["найди …", "где про …"], tools: ["search_workspace_hybrid"], status: "mcp" },
        { phrases: ["поищи смысл …"], tools: ["search_workspace_semantic"], status: "mcp" },
        { phrases: ["что мы решили про …"], tools: ["search_and_get_context", "ask_workspace"], status: "mcp" },
        { phrases: ["покажи ссылки на …"], tools: ["search_workspace_links"], status: "mcp" }
      ]
    },
    {
      id: "read",
      title: "Прочитать",
      items: [
        { phrases: ["прочитай страницу …"], tools: ["read_page_body"], status: "mcp" },
        { phrases: ["свойства страницы"], tools: ["read_page_properties"], status: "mcp" },
        { phrases: ["напомни факты про …"], tools: ["recall_workspace_facts", "list_workspace_facts"], status: "mcp" }
      ]
    },
    {
      id: "write",
      title: "Записать (с подтверждением)",
      note: "«да / подтверждаю» перед delete и move.",
      items: [
        { phrases: ["запиши в заметку …"], tools: ["write_page_body", "append_journal_entry"], status: "mcp" },
        { phrases: ["добавь задачу …"], tools: ["write_workspace_todo"], status: "mcp" },
        { phrases: ["зафиксируй факт …"], tools: ["retain_workspace_fact"], status: "mcp" },
        { phrases: ["создай страницу … в теме …"], tools: ["create_page"], status: "mcp" },
        { phrases: ["переименуй", "перенеси", "удали"], tools: ["rename_page", "move_page", "delete_page"], status: "mcp" },
        { phrases: ["разбери inbox …"], tools: ["triage_inbox_item"], status: "mcp" },
        { phrases: ["уведомь …"], tools: ["notify_user"], status: "mcp" }
      ]
    },
    {
      id: "shell",
      title: "Agent CMS Voice (локально)",
      note: "Обрабатывается Shell до отправки агенту.",
      items: [
        { phrases: ["стоп", "тише", "громче", "повтори"], tools: ["shell:tts / mic"], status: "local" },
        { phrases: ["помидор", "открой помидор"], tools: ["cms:pomodoro(toggle) · 🍅 в Voice"], status: "local" },
        { phrases: ["отправь", "отмена", "исправь: …"], tools: ["shell:voice-confirm"], status: "local" },
        { phrases: ["открой CMS", "открой голос"], tools: ["CHPU / deep link"], status: "local" }
      ]
    }
  ];

  const STATUS_LABELS = {
    mcp: "MCP",
    local: "локально",
    planned: "в плане"
  };

  let open = false;

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderBody() {
    const parts = [
      '<p class="app-footer-voice-cmd-lead">Идеи фраз для управления CMS голосом. ',
      "<strong>MCP</strong> — через агента и инструменты workspace; ",
      "<strong>локально</strong> — мгновенно в UI или Shell; ",
      "<strong>в плане</strong> — нужен voice-bridge в CMS.</p>"
    ];

    for (const section of SECTIONS) {
      parts.push(`<section class="app-footer-voice-cmd-section" aria-labelledby="voice-cmd-${section.id}">`);
      parts.push(
        `<h3 class="app-footer-voice-cmd-section-title" id="voice-cmd-${section.id}">${escapeHtml(section.title)}</h3>`
      );
      if (section.note) {
        parts.push(`<p class="app-footer-voice-cmd-section-note">${escapeHtml(section.note)}</p>`);
      }
      parts.push('<ul class="app-footer-voice-cmd-list">');
      for (const item of section.items) {
        const status = item.status || "mcp";
        const statusLabel = STATUS_LABELS[status] || status;
        const phraseText = item.phrases.map((p) => `«${p}»`).join(" · ");
        const toolsHtml = item.tools
          .map((t) => `<code class="app-footer-voice-cmd-tool">${escapeHtml(t)}</code>`)
          .join(" ");
        parts.push("<li class=\"app-footer-voice-cmd-item\">");
        parts.push(`<div class="app-footer-voice-cmd-phrases">${escapeHtml(phraseText)}</div>`);
        parts.push(
          `<div class="app-footer-voice-cmd-meta"><span class="app-footer-voice-cmd-status is-${status}">${escapeHtml(statusLabel)}</span> ${toolsHtml}</div>`
        );
        parts.push("</li>");
      }
      parts.push("</ul></section>");
    }

    body.innerHTML = parts.join("");
  }

  function positionPopover() {
    if (!open || popover.classList.contains("hidden")) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(480, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    popover.style.width = `${width}px`;
    popover.style.left = `${left}px`;
    const popoverHeight = popover.getBoundingClientRect().height || 400;
    const top = Math.max(12, rect.top - popoverHeight - 8);
    popover.style.top = `${top}px`;
    popover.style.bottom = "auto";
    popover.style.maxHeight = `${Math.max(220, rect.top - 20)}px`;
  }

  function closeOtherFooterPopovers() {
    if (typeof closeAppFooterIdeasPopover === "function") closeAppFooterIdeasPopover();
    if (typeof closeAppFooterJournalPopover === "function") closeAppFooterJournalPopover();
  }

  function closePopover() {
    if (!open) return;
    open = false;
    popover.classList.add("hidden");
    btn.setAttribute("aria-expanded", "false");
  }

  function openPopover() {
    closeOtherFooterPopovers();
    open = true;
    popover.classList.remove("hidden");
    btn.setAttribute("aria-expanded", "true");
    if (!body.innerHTML.trim()) renderBody();
    positionPopover();
    requestAnimationFrame(positionPopover);
  }

  function togglePopover() {
    if (open) closePopover();
    else openPopover();
  }

  window.AppFooterVoiceCmdPopover = {
    close: closePopover,
    open: openPopover,
    isOpen: () => open
  };

  renderBody();

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePopover();
  });
  closeBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    closePopover();
  });

  ["app-footer-ideas-btn", "app-footer-journal-btn"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => closePopover(), true);
  });

  window.addEventListener("resize", positionPopover);
  document.addEventListener("click", (event) => {
    if (!open) return;
    const target = event.target;
    if (target instanceof Node && popover.contains(target)) return;
    if (target instanceof Node && btn.contains(target)) return;
    closePopover();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) closePopover();
  });
})();
