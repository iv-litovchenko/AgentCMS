/** Заготовки awn-channels — порядок и slug синхронны с public/main.js (CHANNEL_BUILTIN_PRESETS). */
const CHANNEL_BUILTIN_PRESETS = [
  {
    slug: "forum",
    icon: "💬",
    name: "Форум",
    hintTitle: "Дискуссии и обсуждения, где люди могут обсуждать свои идеи"
  },
  {
    slug: "blog",
    icon: "📝",
    name: "Блог",
    hintTitle:
      "Аккумуляция постов на интересующие темы по запросам; агент может собирать по расписанию и публиковать информацию в данном канале"
  },
  {
    slug: "digest",
    icon: "📰",
    name: "Дайджесты",
    hintTitle:
      "Сводки и подборки, которые агент собирает сюда. Различные сводки и подборки собираются в данном месте"
  },
  {
    slug: "youtube",
    icon: "▶️",
    name: "YouTube",
    hintTitle: "Выгрузка видео и тем из YouTube. Входящий поток из YouTube"
  },
  {
    slug: "telegram",
    icon: "✈️",
    name: "Telegram",
    hintTitle: "Выгрузка тем и сообщений из Telegram. Входящий поток из Телеграмм"
  },
  {
    slug: "whatsapp",
    icon: "💬",
    name: "WhatsApp",
    hintTitle: "Входящий поток из WhatsApp"
  },
  {
    slug: "instagram",
    icon: "📷",
    name: "Instagram",
    hintTitle: "Посты, stories и DM из Instagram. Входящий поток из Instagram до triage"
  },
  {
    slug: "web",
    icon: "🌐",
    name: "Интернет",
    hintTitle: "Страницы, ссылки и материалы из сети"
  },
  {
    slug: "bookmarks",
    icon: "🔖",
    name: "Закладки",
    hintTitle: "Сохранённые ссылки и закладки до triage"
  },
  {
    slug: "downloads",
    icon: "📥",
    name: "Загрузки",
    hintTitle: "Файлы из загрузок браузера"
  },
  {
    slug: "rss",
    icon: "📡",
    name: "RSS / ленты",
    hintTitle: "RSS и Atom-ленты, подписки и новые элементы фидов до triage"
  },
  {
    slug: "mailbox",
    icon: "📧",
    name: "Почта",
    hintTitle: "Входящая почта: письма, вложения и уведомления до triage"
  },
  {
    slug: "webhook",
    icon: "🔗",
    name: "Webhook",
    hintTitle: "HTTP webhook и автоматизации (n8n, Zapier, CI, API callbacks) — события в ingress"
  },
  {
    slug: "cloud-inbox",
    icon: "☁️",
    name: "Облачный inbox",
    hintTitle: "Файлы и события из облака: Google Drive, Dropbox, OneDrive и аналоги"
  },
  {
    slug: "notebooks",
    icon: "📓",
    name: "Печатные тетради и рукописи",
    hintTitle: "Скан и фото тетрадей, блокнотов и рукописных записей до triage"
  },
  {
    slug: "ocr",
    icon: "🔍",
    name: "OCR",
    hintTitle: "Сканы и фото документов, распознавание текста до triage"
  },
  {
    slug: "voice",
    icon: "🎙️",
    name: "Голос",
    hintTitle: "STT, аудиозаписи и расшифровки до разбора"
  },
  {
    slug: "clipboard",
    icon: "📋",
    name: "Буфер обмена",
    hintTitle: "Содержимое буфера обмена и быстрые вставки до triage"
  },
  {
    slug: "photo-archive",
    icon: "🖼️",
    name: "Фотоархив",
    hintTitle: "Общий фотоархив — входящие снимки"
  },
  {
    slug: "photo-phone",
    icon: "📱",
    name: "Фото (телефон)",
    hintTitle: "Фото с телефона до разбора"
  },
  {
    slug: "news",
    icon: "📰",
    name: "Новости",
    hintTitle: "Новостные ленты, статьи и публикации СМИ до triage"
  },
  {
    slug: "analytics",
    icon: "📊",
    name: "Аналитика",
    hintTitle: "Метрики, отчёты и дашборды"
  },
  {
    slug: "real-world",
    icon: "🌍",
    name: "Реальный мир",
    hintTitle: "Объекты и факты из офлайн-мира"
  },
  {
    slug: "capabilities",
    icon: "💡",
    name: "Поиск фишек для ИИ",
    hintTitle:
      "Возможности для ИИ-агента: скиллы, MCP, инструменты и идеи — что подключить и улучшить у агента до triage"
  },
  {
    slug: "computer",
    icon: "💻",
    name: "Компьютер",
    hintTitle: "Персональный ПК: локальная среда, Shell, файлы и события с рабочей машины до triage"
  },
  {
    slug: "server",
    icon: "🖥️",
    name: "Сервер",
    hintTitle: "Удалённый сервер, VPS или хост: деплой, логи, cron и сервисы агента до triage"
  },
  {
    slug: "market",
    icon: "🛒",
    name: "Барахолка",
    hintTitle: "Объявления о покупке и продаже, личные сделки"
  },
  {
    slug: "announcements",
    icon: "📢",
    name: "Объявления",
    hintTitle: "Объявления и информационные публикации"
  },
  {
    slug: "github",
    icon: "🐙",
    name: "GitHub",
    hintTitle: "Issues, pull requests, discussions, Actions и прочие события репозитория"
  },
  {
    slug: "gitlab",
    icon: "🦊",
    name: "GitLab",
    hintTitle: "Merge requests, issues, pipelines и активность проекта в GitLab"
  },
  {
    slug: "bitbucket",
    icon: "🪣",
    name: "Bitbucket",
    hintTitle: "Pull requests, issues и события репозиториев Atlassian Bitbucket"
  },
  {
    slug: "gitea",
    icon: "🍵",
    name: "Gitea / Forgejo",
    hintTitle: "Self-hosted Git: issues и PR из Gitea, Forgejo и совместимых forge"
  },
  {
    slug: "jira",
    icon: "📋",
    name: "Jira",
    hintTitle: "Задачи, спринты, комментарии и изменения статусов из Jira"
  },
  {
    slug: "sentry",
    icon: "🐛",
    name: "Sentry",
    hintTitle: "Ошибки, алерты и события мониторинга из Sentry"
  },
  {
    slug: "notes",
    icon: "📒",
    name: "Заметки",
    hintTitle: "Разрозненные заметки до разбора"
  },
  {
    slug: "screenshots",
    icon: "🖥️",
    name: "Скриншоты",
    hintTitle: "Снимки экрана, ingress до triage"
  },
  {
    slug: "other",
    icon: "📦",
    name: "Другое",
    hintTitle: "Временный вход — не знаю куда деть"
  }
];

const CHANNEL_BUILTIN_SLUGS = new Set(CHANNEL_BUILTIN_PRESETS.map((entry) => entry.slug));

/** Базовые группы каталога (не редактируются в UI) — порядок синхронен с public/main.js */
const CHANNEL_BUILTIN_PRESET_GROUPS = [
  {
    id: "agent-capabilities",
    title: "Агент и устройства",
    slugs: ["capabilities", "computer", "server"]
  },
  {
    id: "content-modes",
    title: "Режимы контента и свободное общение",
    slugs: ["forum", "blog", "digest"]
  },
  {
    id: "messengers-video",
    title: "Мессенджеры и видео",
    slugs: ["youtube", "telegram", "whatsapp", "instagram"]
  },
  {
    id: "web-links-files",
    title: "Веб, ссылки, файлы",
    slugs: ["web", "bookmarks", "downloads", "rss"]
  },
  {
    id: "mail-automation",
    title: "Почта и автоматизация",
    slugs: ["mailbox", "webhook", "cloud-inbox"]
  },
  {
    id: "media-digitization",
    title: "Медиа и оцифровка",
    slugs: ["screenshots", "photo-archive", "photo-phone", "notebooks", "ocr", "voice", "clipboard"]
  },
  {
    id: "news-context",
    title: "Новости и контекст",
    slugs: ["news", "analytics", "real-world"]
  },
  {
    id: "publications",
    title: "Публикации и рынок",
    slugs: ["announcements", "market"]
  },
  {
    id: "development",
    title: "Разработка",
    slugs: ["github", "gitlab", "bitbucket", "gitea", "jira", "sentry"]
  },
  {
    id: "drafts",
    title: "Черновики и прочее",
    slugs: ["notes", "other"]
  }
];

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

function isChannelBuiltinSlug(slug) {
  return CHANNEL_BUILTIN_SLUGS.has(String(slug || "").trim());
}

module.exports = {
  CHANNEL_BUILTIN_PRESETS,
  CHANNEL_BUILTIN_PRESET_GROUPS,
  CHANNEL_BUILTIN_SLUGS,
  groupChannelBuiltinPresets,
  isChannelBuiltinSlug
};
