/** Иконки заготовок каналов: Lucide (UI) + Simple Icons (бренды). Синхронизируется в public/_resources/vendor/channel-preset-icons/. */
const { CHANNEL_LEGACY_SLUG_TO_CANON } = require("./channel-presets");

const CHANNEL_CUSTOM_ICON_KEY = "_custom";

const CHANNEL_PRESET_ICON_MAP_BASE = {
  forum: { pack: "lucide", name: "messages-square" },
  blog: { pack: "lucide", name: "notebook-pen" },
  digest: { pack: "lucide", name: "newspaper" },
  youtube: { pack: "simple", name: "youtube" },
  telegram: { pack: "simple", name: "telegram" },
  whatsapp: { pack: "simple", name: "whatsapp" },
  instagram: { pack: "simple", name: "instagram" },
  web: { pack: "lucide", name: "globe" },
  bookmarks: { pack: "lucide", name: "bookmark" },
  downloads: { pack: "lucide", name: "download" },
  rss: { pack: "lucide", name: "rss" },
  mailbox: { pack: "lucide", name: "mailbox" },
  webhook: { pack: "lucide", name: "webhook" },
  "cloud-inbox": { pack: "lucide", name: "cloud-download" },
  notebooks: { pack: "lucide", name: "book-open" },
  ocr: { pack: "lucide", name: "scan-text" },
  voice: { pack: "lucide", name: "mic" },
  clipboard: { pack: "lucide", name: "clipboard" },
  "photo-archive": { pack: "lucide", name: "images" },
  "photo-phone": { pack: "lucide", name: "camera" },
  news: { pack: "lucide", name: "scroll-text" },
  analytics: { pack: "lucide", name: "chart-column" },
  "real-world": { pack: "lucide", name: "earth" },
  capabilities: { pack: "lucide", name: "puzzle" },
  computer: { pack: "lucide", name: "laptop" },
  server: { pack: "lucide", name: "server" },
  market: { pack: "lucide", name: "shopping-cart" },
  announcements: { pack: "lucide", name: "megaphone" },
  github: { pack: "simple", name: "github" },
  gitlab: { pack: "simple", name: "gitlab" },
  bitbucket: { pack: "simple", name: "bitbucket" },
  gitea: { pack: "simple", name: "gitea" },
  jira: { pack: "simple", name: "jira" },
  sentry: { pack: "simple", name: "sentry" },
  notes: { pack: "lucide", name: "sticky-note" },
  screenshots: { pack: "lucide", name: "scan-eye" },
  other: { pack: "lucide", name: "package" },
  [CHANNEL_CUSTOM_ICON_KEY]: { pack: "lucide", name: "radio-tower" }
};

const CHANNEL_PRESET_ICON_MAP = { ...CHANNEL_PRESET_ICON_MAP_BASE };
for (const [legacy, canon] of Object.entries(CHANNEL_LEGACY_SLUG_TO_CANON)) {
  if (CHANNEL_PRESET_ICON_MAP_BASE[legacy]) {
    CHANNEL_PRESET_ICON_MAP[canon] = CHANNEL_PRESET_ICON_MAP_BASE[legacy];
  }
}

module.exports = { CHANNEL_PRESET_ICON_MAP, CHANNEL_CUSTOM_ICON_KEY };
