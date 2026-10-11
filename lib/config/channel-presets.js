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
  { slug: "whatsapp", icon: "💬", name: "Ватсап может быть" },
  { slug: "web", icon: "🌐", name: "Интернет" },
  { slug: "bookmarks", icon: "🔖", name: "Закладки" },
  {
    slug: "downloads",
    icon: "📥",
    name: "Загрузки",
    hintTitle: "Файлы из загрузок браузера"
  },
  { slug: "notebooks", icon: "📓", name: "Печатные тетради" },
  { slug: "photo-archive", icon: "🖼️", name: "Фотоархив" },
  { slug: "photo-phone", icon: "📱", name: "Фотоархив (телефон)" },
  { slug: "analytics", icon: "📊", name: "аналитика" },
  { slug: "real-world", icon: "🌍", name: "Объекты реального мира" },
  { slug: "market", icon: "🛒", name: "Барахолка" },
  {
    slug: "announcements",
    icon: "📢",
    name: "Объявления",
    hintTitle: "Объявления и информационные публикации"
  },
  { slug: "notes", icon: "📒", name: "Заметки" },
  { slug: "screenshots", icon: "🖥️", name: "Скриншоты" },
  { slug: "other", icon: "📦", name: "Другое (не знаю куда деть)" }
];

const CHANNEL_BUILTIN_SLUGS = new Set(CHANNEL_BUILTIN_PRESETS.map((entry) => entry.slug));

function isChannelBuiltinSlug(slug) {
  return CHANNEL_BUILTIN_SLUGS.has(String(slug || "").trim());
}

module.exports = {
  CHANNEL_BUILTIN_PRESETS,
  CHANNEL_BUILTIN_SLUGS,
  isChannelBuiltinSlug
};
