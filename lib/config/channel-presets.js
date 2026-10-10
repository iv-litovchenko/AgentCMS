/** Заготовки awn-channels — порядок и slug синхронны с public/main.js (CHANNEL_BUILTIN_PRESETS). */
const CHANNEL_BUILTIN_PRESETS = [
  {
    slug: "forum",
    icon: "💬",
    name: "Форум дискуссии и обсуждения (где люди могут"
  },
  {
    slug: "blog-agent",
    icon: "📝",
    name:
      "Блог (куда агент анпример что то пишет что меня интересует), что интересного собрал агент сегодня — по моим запросам"
  },
  { slug: "digest", icon: "📰", name: "Дайджесты сюда он собирает что-то сводки" },
  { slug: "youtube", icon: "▶️", name: "Ютуб что то обсудить подискутироват" },
  { slug: "telegram", icon: "✈️", name: "Телеграмм (я могу например сюда выгружать темы)" },
  { slug: "whatsapp", icon: "💬", name: "Ватсап может быть" },
  { slug: "web", icon: "🌐", name: "Интернет" },
  { slug: "bookmarks", icon: "🔖", name: "Закладки" },
  { slug: "browser-downloads", icon: "📥", name: "Загрузки из браузера" },
  { slug: "notebooks", icon: "📓", name: "Печатные тетради" },
  { slug: "photo-archive", icon: "🖼️", name: "Фотоархив" },
  { slug: "photo-phone", icon: "📱", name: "Фотоархив (телефон)" },
  { slug: "analytics", icon: "📊", name: "аналитика" },
  { slug: "real-world", icon: "🌍", name: "Объекты реального мира" },
  { slug: "market", icon: "🛒", name: "Барахолка" },
  { slug: "notes", icon: "📒", name: "Заметки" },
  { slug: "slider", icon: "🎞️", name: "Слайдер" },
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
