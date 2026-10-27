/**
 * Channel preset catalogs + icon helpers (refactor 14 — slice from main.js).
 * Sync: lib/config/channel-presets.js
 */
(function initChannelPresetsRuntime(global) {
/** Заготовки каналов — порядок и slug синхронны с lib/config/channel-presets.js */
const CHANNEL_BUILTIN_PRESETS = [
  {
    slug: '0-forum',
    icon: '💬',
    name: 'Форум',
    hintTitle: 'Дискуссии и обсуждения, где люди могут обсуждать свои идеи'
  },
  {
    slug: '0-blog',
    icon: '📝',
    name: 'Блог',
    hintTitle: 'Аккумуляция постов на интересующие темы по запросам; агент может собирать по расписанию и публиковать информацию в данном канале'
  },
  {
    slug: '0-digest',
    icon: '📰',
    name: 'Дайджесты',
    hintTitle: 'Сводки и подборки, которые агент собирает сюда. Различные сводки и подборки собираются в данном месте'
  },
  {
    slug: '0-youtube',
    icon: '▶️',
    name: 'YouTube',
    hintTitle: 'Выгрузка видео и тем из YouTube. Входящий поток из YouTube'
  },
  {
    slug: '0-telegram',
    icon: '✈️',
    name: 'Telegram',
    hintTitle: 'Выгрузка тем и сообщений из Telegram. Входящий поток из Телеграмм'
  },
  {
    slug: '0-whatsapp',
    icon: '💬',
    name: 'WhatsApp',
    hintTitle: 'Входящий поток из WhatsApp'
  },
  {
    slug: '0-instagram',
    icon: '📷',
    name: 'Instagram',
    hintTitle: 'Посты, stories и DM из Instagram. Входящий поток из Instagram до triage'
  },
  {
    slug: '0-web',
    icon: '🌐',
    name: 'Интернет',
    hintTitle: 'Страницы, ссылки и материалы из сети'
  },
  {
    slug: '0-bookmarks',
    icon: '🔖',
    name: 'Закладки',
    hintTitle: 'Сохранённые ссылки и закладки до triage'
  },
  {
    slug: '0-downloads',
    icon: '📥',
    name: 'Загрузки',
    hintTitle: 'Файлы из загрузок браузера'
  },
  {
    slug: '0-rss',
    icon: '📡',
    name: 'RSS / ленты',
    hintTitle: 'RSS и Atom-ленты, подписки и новые элементы фидов до triage'
  },
  {
    slug: '0-mailbox',
    icon: '📧',
    name: 'Почта',
    hintTitle: 'Входящая почта: письма, вложения и уведомления до triage'
  },
  {
    slug: '0-webhook',
    icon: '🔗',
    name: 'Webhook',
    hintTitle: 'HTTP webhook и автоматизации (n8n, Zapier, CI, API callbacks) — события в ingress'
  },
  {
    slug: '0-cloud-inbox',
    icon: '☁️',
    name: 'Облачный inbox',
    hintTitle: 'Файлы и события из облака: Google Drive, Dropbox, OneDrive и аналоги'
  },
  {
    slug: '0-notebooks',
    icon: '📓',
    name: 'Печатные тетради и рукописи',
    hintTitle: 'Скан и фото тетрадей, блокнотов и рукописных записей до triage'
  },
  {
    slug: '0-ocr',
    icon: '🔍',
    name: 'OCR',
    hintTitle: 'Сканы и фото документов, распознавание текста до triage'
  },
  {
    slug: '0-voice',
    icon: '🎙️',
    name: 'Голос',
    hintTitle: 'STT, аудиозаписи и расшифровки до разбора'
  },
  {
    slug: '0-clipboard',
    icon: '📋',
    name: 'Буфер обмена',
    hintTitle: 'Содержимое буфера обмена и быстрые вставки до triage'
  },
  {
    slug: '0-photo-archive',
    icon: '🖼️',
    name: 'Фотоархив',
    hintTitle: 'Общий фотоархив — входящие снимки'
  },
  {
    slug: '0-photo-phone',
    icon: '📱',
    name: 'Фото (телефон)',
    hintTitle: 'Фото с телефона до разбора'
  },
  {
    slug: '0-news',
    icon: '📰',
    name: 'Новости',
    hintTitle: 'Новостные ленты, статьи и публикации СМИ до triage'
  },
  {
    slug: '0-analytics',
    icon: '📊',
    name: 'Аналитика',
    hintTitle: 'Метрики, отчёты и дашборды'
  },
  {
    slug: '0-real-world',
    icon: '🌍',
    name: 'Реальный мир',
    hintTitle: 'Объекты и факты из офлайн-мира'
  },
  {
    slug: '0-capabilities',
    icon: '💡',
    name: 'Поиск фишек для ИИ',
    hintTitle: 'Возможности для ИИ-агента: скиллы, MCP, инструменты и идеи — что подключить и улучшить у агента до triage'
  },
  {
    slug: '0-mcp-feedback',
    icon: '⚠️',
    name: 'Замечания по MCP',
    hintTitle: 'Замечания агента после вызовов MCP: ошибки, needsAuth, таймауты и странное поведение коннекторов — ingress до triage'
  },
  {
    slug: '0-computer',
    icon: '💻',
    name: 'Компьютер',
    hintTitle: 'Персональный ПК: локальная среда, Shell, файлы и события с рабочей машины до triage'
  },
  {
    slug: '0-server',
    icon: '🖥️',
    name: 'Сервер',
    hintTitle: 'Удалённый сервер, VPS или хост: деплой, логи, cron и сервисы агента до triage'
  },
  {
    slug: '0-market',
    icon: '🛒',
    name: 'Барахолка',
    hintTitle: 'Объявления о покупке и продаже, личные сделки'
  },
  {
    slug: '0-announcements',
    icon: '📢',
    name: 'Объявления',
    hintTitle: 'Объявления и информационные публикации'
  },
  {
    slug: '0-github',
    icon: '🐙',
    name: 'GitHub',
    hintTitle: 'Issues, pull requests, discussions, Actions и прочие события репозитория'
  },
  {
    slug: '0-gitlab',
    icon: '🦊',
    name: 'GitLab',
    hintTitle: 'Merge requests, issues, pipelines и активность проекта в GitLab'
  },
  {
    slug: '0-bitbucket',
    icon: '🪣',
    name: 'Bitbucket',
    hintTitle: 'Pull requests, issues и события репозиториев Atlassian Bitbucket'
  },
  {
    slug: '0-gitea',
    icon: '🍵',
    name: 'Gitea / Forgejo',
    hintTitle: 'Self-hosted Git: issues и PR из Gitea, Forgejo и совместимых forge'
  },
  {
    slug: '0-jira',
    icon: '📋',
    name: 'Jira',
    hintTitle: 'Задачи, спринты, комментарии и изменения статусов из Jira'
  },
  {
    slug: '0-sentry',
    icon: '🐛',
    name: 'Sentry',
    hintTitle: 'Ошибки, алерты и события мониторинга из Sentry'
  },
  {
    slug: '0-films',
    icon: '🎬',
    name: 'Фильмы и сериалы',
    hintTitle:
      'Коллекция кино: списки, рецензии, стриминг, «хочу посмотреть» — карточки с метаданными до triage'
  },
  {
    slug: '0-books',
    icon: '📖',
    name: 'Книги',
    hintTitle:
      'Коллекция книг и аудиокниг: автор, прогресс, цитаты, EPUB/PDF и заметки по главам до triage'
  },
  {
    slug: '0-magazines',
    icon: '🗞️',
    name: 'Журналы',
    hintTitle: 'Периодика: выпуски, статьи из номеров, RSS журналов и рубрики до triage'
  },
  {
    slug: '0-print',
    icon: '🖨️',
    name: 'Печатная продукция',
    hintTitle: 'Печать офлайн: сканы обложек и разворотов, каталоги, брошюры — часто вместе с OCR'
  },
  {
    slug: '0-games',
    icon: '🎮',
    name: 'Игры',
    hintTitle:
      'Коллекция игр: платформы, прохождение, достижения, заметки и ссылки на сторы до triage'
  },
  {
    slug: '0-notes',
    icon: '📒',
    name: 'Заметки',
    hintTitle: 'Разрозненные заметки до разбора'
  },
  {
    slug: '0-screenshots',
    icon: '🖥️',
    name: 'Скриншоты',
    hintTitle: 'Снимки экрана, ingress до triage'
  },
  {
    slug: '0-other',
    icon: '📦',
    name: 'Другое (общие входящие, склад)',
    hintTitle: 'Временный вход — не знаю куда деть'
  }
];
/** Базовые группы каталога — синхронны с lib/config/channel-presets.js (CHANNEL_BUILTIN_PRESET_GROUPS) */
const CHANNEL_BUILTIN_PRESET_GROUPS = [
  {
    id: 'agent-capabilities',
    title: 'Агент и устройства',
    slugs: [ '0-capabilities', '0-mcp-feedback', '0-computer', '0-server' ]
  },
  {
    id: 'content-modes',
    title: 'Режимы контента и свободное общение',
    slugs: [ '0-forum', '0-blog', '0-digest' ]
  },
  {
    id: 'messengers-video',
    title: 'Мессенджеры и видео',
    slugs: [ '0-youtube', '0-telegram', '0-whatsapp', '0-instagram' ]
  },
  {
    id: 'web-links-files',
    title: 'Веб, ссылки, файлы',
    slugs: [ '0-web', '0-bookmarks', '0-downloads', '0-rss' ]
  },
  {
    id: 'mail-automation',
    title: 'Почта и автоматизация',
    slugs: [ '0-mailbox', '0-webhook', '0-cloud-inbox' ]
  },
  {
    id: 'media-digitization',
    title: 'Медиа и оцифровка',
    slugs: [
      '0-screenshots',
      '0-photo-archive',
      '0-photo-phone',
      '0-notebooks',
      '0-ocr',
      '0-voice',
      '0-clipboard'
    ]
  },
  {
    id: 'news-context',
    title: 'Новости и контекст',
    slugs: [ '0-news', '0-analytics', '0-real-world' ]
  },
  {
    id: 'publications',
    title: 'Публикации и рынок',
    slugs: [ '0-announcements', '0-market' ]
  },
  {
    id: 'collections-library',
    title: 'Коллекции и библиотека',
    slugs: [ '0-films', '0-books', '0-magazines', '0-print', '0-games' ]
  },
  {
    id: 'development',
    title: 'Разработка',
    slugs: [
      '0-github',
      '0-gitlab',
      '0-bitbucket',
      '0-gitea',
      '0-jira',
      '0-sentry'
    ]
  },
  {
    id: 'drafts',
    title: 'Черновики и прочее',
    slugs: [ '0-notes', '0-other' ]
  }
];
const CHANNEL_BUILTIN_SLUGS = new Set(CHANNEL_BUILTIN_PRESETS.map((entry) => entry.slug));
const CHANNEL_LEGACY_SLUG_TO_CANON = {
  forum: "0-forum",
  blog: "0-blog",
  digest: "0-digest",
  youtube: "0-youtube",
  telegram: "0-telegram",
  whatsapp: "0-whatsapp",
  instagram: "0-instagram",
  web: "0-web",
  bookmarks: "0-bookmarks",
  downloads: "0-downloads",
  rss: "0-rss",
  mailbox: "0-mailbox",
  webhook: "0-webhook",
  "cloud-inbox": "0-cloud-inbox",
  notebooks: "0-notebooks",
  ocr: "0-ocr",
  voice: "0-voice",
  clipboard: "0-clipboard",
  "photo-archive": "0-photo-archive",
  "photo-phone": "0-photo-phone",
  news: "0-news",
  analytics: "0-analytics",
  "real-world": "0-real-world",
  capabilities: "0-capabilities",
  "mcp-feedback": "0-mcp-feedback",
  computer: "0-computer",
  server: "0-server",
  market: "0-market",
  announcements: "0-announcements",
  github: "0-github",
  gitlab: "0-gitlab",
  bitbucket: "0-bitbucket",
  gitea: "0-gitea",
  jira: "0-jira",
  sentry: "0-sentry",
  notes: "0-notes",
  screenshots: "0-screenshots",
  other: "0-other"
};

function resolveChannelCanonicalSlug(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return "";
  if (CHANNEL_BUILTIN_SLUGS.has(normalized)) return normalized;
  return CHANNEL_LEGACY_SLUG_TO_CANON[normalized] || normalized;
}

function isChannelBuiltinSlug(slug) {
  return CHANNEL_BUILTIN_SLUGS.has(resolveChannelCanonicalSlug(slug));
}

const CHANNEL_CUSTOM_ICON_KEY = "_custom";

function groupChannelBuiltinPresets(presets) {
  const list = Array.isArray(presets) ? presets : CHANNEL_BUILTIN_PRESETS;
  const bySlug = new Map(list.map((entry) => [entry.slug, entry]));
  const grouped = [];
  for (const group of CHANNEL_BUILTIN_PRESET_GROUPS) {
    const items = (group.slugs || [])
      .map((slug) => bySlug.get(slug))
      .filter(Boolean);
    if (items.length) grouped.push({ ...group, items });
  }
  const groupedSlugs = new Set(
    grouped.flatMap((group) => group.items.map((entry) => entry.slug))
  );
  const rest = list.filter((entry) => !groupedSlugs.has(entry.slug));
  if (rest.length) {
    grouped.push({ id: "other-ungrouped", title: "Прочее", items: rest });
  }
  return grouped;
}

function getChannelPresetIconSvgMarkup(slug) {
  const map = typeof CHANNEL_PRESET_ICON_SVG !== "undefined" ? CHANNEL_PRESET_ICON_SVG : null;
  if (!map) return "";
  const key = resolveChannelCanonicalSlug(slug);
  if (key && map[key]) return String(map[key]).trim();
  const legacy = String(slug || "").trim();
  if (legacy && map[legacy]) return String(map[legacy]).trim();
  return String(map[CHANNEL_CUSTOM_ICON_KEY] || "").trim();
}

function resolveChannelBuiltinPreset(slug) {
  const key = resolveChannelCanonicalSlug(slug);
  if (!key) return null;
  return CHANNEL_BUILTIN_PRESETS.find((entry) => entry.slug === key) || null;
}

function populateChannelPresetIcon(container, slug, emojiFallback = "📡", { size = 14 } = {}) {
  const key = String(slug || "").trim();
  const markup = getChannelPresetIconSvgMarkup(key || CHANNEL_CUSTOM_ICON_KEY);
  if (!markup) return false;
  container.replaceChildren();
  container.insertAdjacentHTML("beforeend", markup);
  const svg = container.querySelector("svg");
  const px = Math.max(10, Number(size) || 14);
  if (svg) {
    svg.setAttribute("width", String(px));
    svg.setAttribute("height", String(px));
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("awn-channel-preset-icon-svg");
  }
  container.classList.add("awn-channel-preset-icon", "awn-channel-preset-icon--svg");
  container.classList.remove("awn-channel-preset-icon--emoji");
  return true;
}

  global.CHANNEL_BUILTIN_PRESETS = CHANNEL_BUILTIN_PRESETS;
  global.CHANNEL_BUILTIN_PRESET_GROUPS = CHANNEL_BUILTIN_PRESET_GROUPS;
  global.CHANNEL_BUILTIN_SLUGS = CHANNEL_BUILTIN_SLUGS;
  global.CHANNEL_LEGACY_SLUG_TO_CANON = CHANNEL_LEGACY_SLUG_TO_CANON;
  global.CHANNEL_CUSTOM_ICON_KEY = CHANNEL_CUSTOM_ICON_KEY;
  global.resolveChannelCanonicalSlug = resolveChannelCanonicalSlug;
  global.isChannelBuiltinSlug = isChannelBuiltinSlug;
  global.groupChannelBuiltinPresets = groupChannelBuiltinPresets;
  global.getChannelPresetIconSvgMarkup = getChannelPresetIconSvgMarkup;
  global.resolveChannelBuiltinPreset = resolveChannelBuiltinPreset;
  global.populateChannelPresetIcon = populateChannelPresetIcon;
})(typeof globalThis !== "undefined" ? globalThis : window);
