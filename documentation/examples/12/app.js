const VARIANTS = [
  { id: "01", slug: "01-capsule", name: "Capsule", note: "Капсула: слева захват, справа вставка" },
  { id: "02", slug: "02-corner-fab", name: "Corner FAB", note: "Круг справа снизу, раскрывается влево" },
  { id: "03", slug: "03-vertical-rail", name: "Vertical rail", note: "Узкая колонка вверх от иконки" },
  { id: "04", slug: "04-glass-sheet", name: "Glass sheet", note: "Стекло-карточка сеткой 4×2" },
  { id: "05", slug: "05-light-island", name: "Light island", note: "Светлый островок сверху" },
  { id: "06", slug: "06-icon-dock", name: "Icon dock", note: "Док иконок с лёгким подъёмом" },
  { id: "07", slug: "07-edge-chip", name: "Edge chip", note: "Чип у правого края" },
  { id: "08", slug: "08-arc-fan", name: "Arc fan", note: "Веер кружков вокруг иконки" },
  { id: "09", slug: "09-morph-bar", name: "Morph bar", note: "Иконка расширяется в бар" },
  { id: "10", slug: "10-quiet-menu", name: "Quiet menu", note: "Тихое меню с подписями" }
];

const BRAND_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="36" height="36" aria-hidden="true">' +
  '<defs><linearGradient id="asc-bg" x1="0%" y1="0%" x2="100%" y2="100%">' +
  '<stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#c026d3"/></linearGradient>' +
  '<linearGradient id="asc-shine" x1="0%" y1="0%" x2="0%" y2="100%">' +
  '<stop offset="0%" stop-color="#fff" stop-opacity="0.28"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
  '<rect width="64" height="64" rx="14" fill="url(#asc-bg)"/>' +
  '<rect width="64" height="64" rx="14" fill="url(#asc-shine)"/>' +
  '<rect x="13" y="15" width="38" height="26" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.38)" stroke-width="1.5"/>' +
  '<circle cx="19.5" cy="21.5" r="2.2" fill="#fecaca"/><circle cx="26.5" cy="21.5" r="2.2" fill="#fde68a"/><circle cx="33.5" cy="21.5" r="2.2" fill="#bbf7d0"/>' +
  '<rect x="17" y="27" width="30" height="3.5" rx="1.75" fill="rgba(255,255,255,0.42)"/>' +
  '<rect x="17" y="33" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.22)"/>' +
  '<path d="M14 50 L22 50 L26 42 L30 54 L34 46 L38 50 L50 50" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
  "</svg>";

const ICONS = {
  element:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',
  page:
    '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
  clean:
    '<svg viewBox="0 0 24 24"><path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z"/><path d="M18 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>',
  markdown: '<span class="asc-md">MD</span>',
  selection:
    '<svg viewBox="0 0 24 24"><path d="M6 4h4M6 4v4"/><path d="M14 4h4v4"/><path d="M6 16v4h4"/><path d="M18 16v4h-4"/><path d="M9 9h6v6H9z"/></svg>',
  screenshot:
    '<svg viewBox="0 0 24 24"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>',
  prompts:
    '<svg viewBox="0 0 24 24"><path d="M13 3L6 14h5l-1 7 8-12h-5z"/></svg>',
  collapse:
    '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>'
};

const PAGE_MENU = [
  { head: "Страница" },
  { key: "page", label: "Заголовок и ссылка", hint: "Название страницы и URL" },
  { key: "clean", label: "Текст страницы", hint: "Статья абзацами, без меню и рекламы" },
  { key: "markdown", label: "Как Markdown", hint: "Заголовки, ссылки и списки в MD" }
];

const TEXT_MENU = [
  { head: "Выделение" },
  { key: "selection", label: "Вставить выделение" },
  { sep: true },
  { head: "Промпты" },
  { key: "prompt-read", label: "Прочитай" },
  { key: "prompt-explain", label: "Объясни" },
  { key: "prompt-notes", label: "Конспект" },
  { key: "prompt-translate", label: "Перевод" },
  { key: "prompt-task", label: "Задача" }
];

function currentVariant() {
  return VARIANTS.find((item) => item.id === document.body.dataset.variant) || VARIANTS[0];
}

function injectChrome() {
  const variant = currentVariant();
  const isPlayground = document.body.dataset.playground === "1";
  const rootPrefix = isPlayground ? "./" : "../";

  const bar = document.createElement("div");
  bar.className = "demo-bar";
  bar.innerHTML =
    `<a class="demo-back" href="${rootPrefix}index.html">← Каталог</a>` +
    `<div><h1>Companion toolbar · ${variant.name}</h1><p>${variant.note}</p></div>` +
    `<span class="demo-hint">иконка → Shell · стрелка свернуть</span>`;
  document.body.prepend(bar);

  if (isPlayground) {
    const switcher = document.createElement("nav");
    switcher.className = "variant-switch";
    switcher.setAttribute("aria-label", "Варианты панели");
    for (const item of VARIANTS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `${item.id} ${item.name}`;
      btn.className = item.id === variant.id ? "is-current" : "";
      btn.addEventListener("click", () => setVariant(item.id, true));
      switcher.append(btn);
    }
    bar.after(switcher);
  }

  const page = document.createElement("article");
  page.className = "page-shell";
  page.innerHTML = `
    <p class="page-kicker">Пример страницы · Habr-like</p>
    <h2>Как агент читает веб-страницу, не мешая чтению</h2>
    <p class="page-meta">11 сентября 2026 · companion · UI kit</p>
    <p>Свёрнутое состояние — одна иконка. Клик раскрывает компактные действия: элемент, страница, markdown, скрин, промпты. Второй клик по иконке сворачивает панель.</p>
    <div class="page-card"><strong>Задача прототипа</strong><span>Подобрать аккуратную геометрию: капсула, FAB, рельс, стекло, островок, док, край, веер, morph и тихое меню. Действия здесь только имитируют статус.</span></div>
    <p>Текст вокруг нужен как фон: панель должна читаться поверх обычного контента, не спорить с типографикой и не перекрывать абзац целиком.</p>
    <p>В продакшене иконка сейчас открывает Side Panel, а кнопки прячутся за «Ещё». Эти макеты проверяют другой жест: иконка = toggle самой панели.</p>
  `;
  document.body.append(page);

  const tag = document.createElement("span");
  tag.className = "variant-tag";
  tag.textContent = `${variant.id} · ${variant.name}`;
  document.body.append(tag);
}

function injectToolbar() {
  const root = document.createElement("div");
  root.id = "agent-shell-companion-toolbar";
  root.setAttribute("role", "toolbar");
  root.setAttribute("aria-label", "Agent Shell Companion");

  const brand = document.createElement("button");
  brand.type = "button";
  brand.className = "asc-brand";
  brand.title = "Развернуть панель";
  brand.setAttribute("aria-label", "Развернуть панель");
  brand.setAttribute("aria-expanded", "false");
  brand.innerHTML = BRAND_SVG;

  const actions = document.createElement("div");
  actions.className = "asc-actions";

  const menus = [];

  function closeMenus(except) {
    for (const menu of menus) {
      if (menu !== except) menu.classList.add("hidden");
    }
  }

  function createBtn(key, label, title) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `asc-btn asc-btn--${key}`;
    btn.title = title;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = `${ICONS[key]}<span class="asc-label">${label}</span>`;
    return btn;
  }

  function createMenu(key, label, title, items) {
    const wrap = document.createElement("div");
    wrap.className = "asc-menu";
    const btn = createBtn(key, label, title);
    btn.classList.add("asc-btn--menu");
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    const pop = document.createElement("div");
    pop.className = "asc-menu-pop hidden";
    pop.setAttribute("role", "menu");
    for (const item of items) {
      if (item.head) {
        const head = document.createElement("div");
        head.className = "asc-menu-head";
        head.textContent = item.head;
        pop.append(head);
        continue;
      }
      if (item.sep) {
        const line = document.createElement("div");
        line.className = "asc-menu-sep";
        pop.append(line);
        continue;
      }
      const option = document.createElement("button");
      option.type = "button";
      option.className = "asc-menu-item";
      option.textContent = item.label;
      if (item.hint) option.title = item.hint;
      option.addEventListener("click", (event) => {
        event.stopPropagation();
        closeMenus();
        setStatus(item.label, "ok");
      });
      pop.append(option);
    }
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = pop.classList.contains("hidden");
      closeMenus(pop);
      pop.classList.toggle("hidden", !open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    wrap.append(btn, pop);
    menus.push(pop);
    return wrap;
  }

  const left = document.createElement("div");
  left.className = "asc-cluster asc-cluster--left";
  const elementBtn = createBtn("element", "Выбор", "Выбрать блок на странице");
  const shotBtn = createBtn("screenshot", "Скрин", "Скриншот вкладки");
  elementBtn.addEventListener("click", () => {
    elementBtn.classList.toggle("is-active");
    setStatus(elementBtn.classList.contains("is-active") ? "Выбор элемента" : "Выбор выключен", "ok");
  });
  shotBtn.addEventListener("click", () => setStatus("Скрин", "ok"));
  left.append(elementBtn, shotBtn);

  const divider = document.createElement("span");
  divider.className = "asc-divider";
  divider.setAttribute("aria-hidden", "true");

  const right = document.createElement("div");
  right.className = "asc-cluster asc-cluster--right";
  right.append(
    createMenu("page", "Страница", "Вставить страницу", PAGE_MENU),
    createMenu("selection", "Текст", "Выделение и промпты", TEXT_MENU)
  );

  actions.append(left, divider, right);

  const collapseBtn = createBtn("collapse", "Свернуть", "Свернуть панель");
  collapseBtn.classList.add("asc-btn--collapse");
  actions.append(collapseBtn);

  const status = document.createElement("span");
  status.className = "asc-status";
  status.setAttribute("aria-live", "polite");

  root.append(brand, actions, status);
  document.body.append(root);

  const sidebar = document.createElement("aside");
  sidebar.className = "asc-sidebar";
  sidebar.setAttribute("aria-label", "Agent Shell");
  sidebar.innerHTML =
    '<header class="asc-sidebar-head">' +
    '<strong>Agent Shell</strong>' +
    '<button type="button" class="asc-sidebar-close" aria-label="Закрыть сайдбар">✕</button>' +
    "</header>" +
    '<div class="asc-sidebar-body">' +
    "<p>Side Panel Companion. Сюда вставляются страница, выделение и скрины.</p>" +
    '<div class="asc-sidebar-compose">Напишите сообщение…</div>' +
    "</div>";
  document.body.append(sidebar);

  function setSidebar(open) {
    sidebar.classList.toggle("is-open", open);
    brand.classList.toggle("is-active", open);
  }

  function setExpanded(next) {
    root.classList.toggle("is-expanded", next);
    brand.setAttribute("aria-expanded", next ? "true" : "false");
    brand.title = next ? "Открыть Agent Shell" : "Развернуть панель";
    brand.setAttribute("aria-label", next ? "Открыть Agent Shell" : "Развернуть панель");
    if (!next) closeMenus();
  }

  function setStatus(text, kind) {
    status.textContent = text || "";
    status.dataset.kind = kind || "";
    status.classList.toggle("is-on", Boolean(text));
    window.clearTimeout(setStatus._timer);
    if (text) {
      setStatus._timer = window.setTimeout(() => {
        status.textContent = "";
        status.dataset.kind = "";
        status.classList.remove("is-on");
      }, 2200);
    }
  }

  brand.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!root.classList.contains("is-expanded")) {
      setExpanded(true);
      return;
    }
    const next = !sidebar.classList.contains("is-open");
    setSidebar(next);
    setStatus(next ? "Agent Shell открыт" : "Agent Shell закрыт", "ok");
  });

  collapseBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    setExpanded(false);
  });

  sidebar.querySelector(".asc-sidebar-close").addEventListener("click", () => {
    setSidebar(false);
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) closeMenus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const anyOpen = menus.some((menu) => !menu.classList.contains("hidden"));
    if (anyOpen) {
      closeMenus();
      return;
    }
    if (sidebar.classList.contains("is-open")) {
      setSidebar(false);
      return;
    }
    setExpanded(false);
  });

  window.__ascSetExpanded = setExpanded;
}

function setVariant(id, pushUrl) {
  const item = VARIANTS.find((entry) => entry.id === id) || VARIANTS[0];
  document.body.dataset.variant = item.id;
  const title = document.querySelector(".demo-bar h1");
  const note = document.querySelector(".demo-bar p");
  const tag = document.querySelector(".variant-tag");
  if (title) title.textContent = `Companion toolbar · ${item.name}`;
  if (note) note.textContent = item.note;
  if (tag) tag.textContent = `${item.id} · ${item.name}`;
  document.title = `${item.id} — ${item.name}`;
  document.querySelectorAll(".variant-switch button").forEach((btn, index) => {
    btn.classList.toggle("is-current", VARIANTS[index].id === item.id);
  });
  const toolbar = document.getElementById("agent-shell-companion-toolbar");
  if (toolbar) toolbar.classList.remove("is-expanded");
  document.querySelector(".asc-sidebar")?.classList.remove("is-open");
  document.querySelector(".asc-brand")?.classList.remove("is-active");
  if (pushUrl) {
    const url = new URL(location.href);
    url.searchParams.set("v", item.id);
    history.replaceState({}, "", url);
  }
}

function boot() {
  const fromQuery = new URLSearchParams(location.search).get("v");
  if (fromQuery) document.body.dataset.variant = fromQuery;
  if (!document.body.dataset.variant) document.body.dataset.variant = "01";
  injectChrome();
  injectToolbar();
}

boot();
