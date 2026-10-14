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
    slug: "notebooks",
    icon: "📓",
    name: "Печатные тетради",
    hintTitle: "Скан и фото тетрадей, рукописные заметки"
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
    id: "content-modes",
    title: "Режимы контента",
    slugs: ["forum", "blog", "digest"]
  },
  {
    id: "messengers-video",
    title: "Мессенджеры и видео",
    slugs: ["telegram", "whatsapp", "youtube"]
  },
  {
    id: "web-links-files",
    title: "Веб, ссылки, файлы",
    slugs: ["web", "bookmarks", "downloads"]
  },
  {
    id: "media-digitization",
    title: "Медиа и оцифровка",
    slugs: ["screenshots", "photo-archive", "photo-phone", "notebooks"]
  },
  {
    id: "news-context",
    title: "Новости и контекст",
    slugs: ["analytics", "real-world"]
  },
  {
    id: "publications",
    title: "Публикации и рынок",
    slugs: ["announcements", "market"]
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
