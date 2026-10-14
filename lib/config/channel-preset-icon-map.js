/** Иконки заготовок каналов: Lucide (UI) + Simple Icons (бренды). Синхронизируется в public/vendor/channel-preset-icons/. */
const CHANNEL_PRESET_ICON_MAP = {
  forum: { pack: "lucide", name: "messages-square" },
  blog: { pack: "lucide", name: "notebook-pen" },
  digest: { pack: "lucide", name: "newspaper" },
  youtube: { pack: "simple", name: "youtube" },
  telegram: { pack: "simple", name: "telegram" },
  whatsapp: { pack: "simple", name: "whatsapp" },
  web: { pack: "lucide", name: "globe" },
  bookmarks: { pack: "lucide", name: "bookmark" },
  downloads: { pack: "lucide", name: "download" },
  notebooks: { pack: "lucide", name: "book-open" },
  "photo-archive": { pack: "lucide", name: "images" },
  "photo-phone": { pack: "lucide", name: "smartphone" },
  analytics: { pack: "lucide", name: "chart-column" },
  "real-world": { pack: "lucide", name: "earth" },
  market: { pack: "lucide", name: "shopping-cart" },
  announcements: { pack: "lucide", name: "megaphone" },
  notes: { pack: "lucide", name: "sticky-note" },
  screenshots: { pack: "lucide", name: "monitor" },
  other: { pack: "lucide", name: "package" }
};

module.exports = { CHANNEL_PRESET_ICON_MAP };
