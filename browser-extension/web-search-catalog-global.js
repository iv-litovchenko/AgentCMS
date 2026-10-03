(function initCompanionWebSearchCatalog(global) {
  const BUILD = {
    google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    "google-images": (q) =>
      `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`,
    yandex: (q) => `https://yandex.ru/search/?text=${encodeURIComponent(q)}`,
    "yandex-images": (q) =>
      `https://yandex.ru/images/search?text=${encodeURIComponent(q)}`,
    duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    youtube: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    wikipedia: (q) => {
      const host = String(globalThis.location?.hostname || "").toLowerCase();
      if (host.endsWith(".wikipedia.org") || host === "wikipedia.org") {
        return `https://${host}/w/index.php?search=${encodeURIComponent(q)}`;
      }
      return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`;
    },
    "google-maps": (q) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
    "yandex-maps": (q) => `https://yandex.ru/maps/?text=${encodeURIComponent(q)}`
  };

  /**
   * Simple Icons slugs — только если файл есть в пакете (см. icons/<slug>.svg).
   * https://github.com/simple-icons/simple-icons — нет отдельного yandex/ozon и др.
   */
  const SIMPLE_ICONS_VERSION = "11.15.0";
  const ICON_SLUG = {
    google: "google",
    "google-images": "google",
    "google-maps": "googlemaps",
    duckduckgo: "duckduckgo",
    bing: "microsoftbing",
    youtube: "youtube",
    wikipedia: "wikipedia",
    instagram: "instagram",
    facebook: "facebook",
    tiktok: "tiktok",
    x: "x",
    vk: "vk",
    telegram: "telegram",
    whatsapp: "whatsapp",
    discord: "discord",
    linkedin: "linkedin",
    pinterest: "pinterest",
    snapchat: "snapchat",
    reddit: "reddit",
    netflix: "netflix",
    twitch: "twitch",
    spotify: "spotify",
    "apple-music": "applemusic",
    soundcloud: "soundcloud",
    amazon: "amazon",
    ebay: "ebay",
    aliexpress: "aliexpress",
    airbnb: "airbnb",
    gmail: "gmail",
    outlook: "microsoftoutlook",
    icloud: "icloud",
    "google-drive": "googledrive",
    dropbox: "dropbox",
    chatgpt: "openai",
    claude: "anthropic",
    gemini: "googlegemini",
    copilot: "microsoft",
    grok: "x",
    qwen: "alibabacloud",
    perplexity: "perplexity",
    ok: "odnoklassniki",
    github: "github",
    gitlab: "gitlab",
    stackoverflow: "stackoverflow",
    notion: "notion",
    figma: "figma"
  };

  /** Свои SVG в расширении (chrome.runtime.getURL), если бренда нет в Simple Icons */
  const ICON_LOCAL = {
    yandex: "icons/brands/yandex.svg",
    "yandex-images": "icons/brands/yandex.svg",
    "yandex-maps": "icons/brands/yandex.svg"
  };

  const CATEGORIES = [
    { id: "search", label: "Поиск" },
    { id: "social", label: "Соцсети" },
    { id: "media", label: "Медиа" },
    { id: "shops", label: "Магазины" },
    { id: "travel", label: "Карты / поездки" },
    { id: "mail", label: "Почта / облако" },
    { id: "ai", label: "AI" },
    { id: "ru", label: "РФ / СНГ" },
    { id: "work", label: "Работа" }
  ];

  /** @type {{ id: string, label: string, shortLabel: string, category: string, enabled?: boolean }[]} */
  const ITEMS = [
    { id: "google", label: "Google", shortLabel: "Google", category: "search", enabled: true },
    {
      id: "google-images",
      label: "Google Картинки",
      shortLabel: "G Фото",
      category: "search",
      enabled: true
    },
    { id: "yandex", label: "Яндекс", shortLabel: "Яндекс", category: "search", enabled: true },
    {
      id: "yandex-images",
      label: "Яндекс Картинки",
      shortLabel: "Я.Фото",
      category: "search",
      enabled: true
    },
    { id: "duckduckgo", label: "DuckDuckGo", shortLabel: "DDG", category: "search", enabled: true },
    { id: "bing", label: "Microsoft Bing", shortLabel: "Microsoft", category: "search", enabled: true },
    { id: "youtube", label: "YouTube", shortLabel: "YouTube", category: "search", enabled: true },
    { id: "wikipedia", label: "Wikipedia", shortLabel: "Wiki", category: "search", enabled: true },
    { id: "agentcms", label: "Agent CMS", shortLabel: "CMS", category: "search" },

    { id: "instagram", label: "Instagram", shortLabel: "Insta", category: "social" },
    { id: "facebook", label: "Facebook", shortLabel: "FB", category: "social" },
    { id: "tiktok", label: "TikTok", shortLabel: "TikTok", category: "social" },
    { id: "x", label: "X (Twitter)", shortLabel: "X", category: "social" },
    { id: "vk", label: "VK", shortLabel: "VK", category: "social" },
    { id: "telegram", label: "Telegram", shortLabel: "TG", category: "social" },
    { id: "whatsapp", label: "WhatsApp", shortLabel: "WA", category: "social" },
    { id: "discord", label: "Discord", shortLabel: "Discord", category: "social" },
    { id: "linkedin", label: "LinkedIn", shortLabel: "LinkedIn", category: "social" },
    { id: "pinterest", label: "Pinterest", shortLabel: "Pinterest", category: "social" },
    { id: "snapchat", label: "Snapchat", shortLabel: "Snap", category: "social" },
    { id: "reddit", label: "Reddit", shortLabel: "Reddit", category: "social" },

    { id: "netflix", label: "Netflix", shortLabel: "Netflix", category: "media" },
    { id: "twitch", label: "Twitch", shortLabel: "Twitch", category: "media" },
    { id: "spotify", label: "Spotify", shortLabel: "Spotify", category: "media" },
    { id: "apple-music", label: "Apple Music", shortLabel: "Apple", category: "media" },
    { id: "soundcloud", label: "SoundCloud", shortLabel: "SC", category: "media" },

    { id: "amazon", label: "Amazon", shortLabel: "Amazon", category: "shops" },
    { id: "ebay", label: "eBay", shortLabel: "eBay", category: "shops" },
    { id: "aliexpress", label: "AliExpress", shortLabel: "Ali", category: "shops" },
    { id: "ozon", label: "Ozon", shortLabel: "Ozon", category: "shops" },
    { id: "wildberries", label: "Wildberries", shortLabel: "WB", category: "shops" },
    { id: "avito", label: "Avito", shortLabel: "Avito", category: "shops" },

    {
      id: "google-maps",
      label: "Google Карты",
      shortLabel: "G Карты",
      category: "travel",
      enabled: true
    },
    {
      id: "yandex-maps",
      label: "Яндекс Карты",
      shortLabel: "Я.Карты",
      category: "travel",
      enabled: true
    },
    { id: "2gis", label: "2GIS", shortLabel: "2GIS", category: "travel" },
    { id: "booking", label: "Booking", shortLabel: "Booking", category: "travel" },
    { id: "airbnb", label: "Airbnb", shortLabel: "Airbnb", category: "travel" },

    { id: "gmail", label: "Gmail", shortLabel: "Gmail", category: "mail" },
    { id: "outlook", label: "Outlook", shortLabel: "Outlook", category: "mail" },
    { id: "icloud", label: "iCloud", shortLabel: "iCloud", category: "mail" },
    { id: "google-drive", label: "Google Drive", shortLabel: "Drive", category: "mail" },
    { id: "dropbox", label: "Dropbox", shortLabel: "Dropbox", category: "mail" },

    { id: "chatgpt", label: "ChatGPT", shortLabel: "ChatGPT", category: "ai" },
    { id: "claude", label: "Claude", shortLabel: "Claude", category: "ai" },
    { id: "gemini", label: "Gemini", shortLabel: "Gemini", category: "ai" },
    { id: "copilot", label: "Copilot", shortLabel: "Copilot", category: "ai" },
    { id: "grok", label: "Grok", shortLabel: "Grok", category: "ai" },
    { id: "qwen", label: "Qwen", shortLabel: "Qwen", category: "ai" },
    { id: "deepseek", label: "DeepSeek", shortLabel: "DeepSeek", category: "ai" },
    { id: "perplexity", label: "Perplexity", shortLabel: "Perplexity", category: "ai" },

    { id: "dzen", label: "Дзен", shortLabel: "Дзен", category: "ru" },
    { id: "rutube", label: "Rutube", shortLabel: "Rutube", category: "ru" },
    { id: "ok", label: "OK", shortLabel: "OK", category: "ru" },
    { id: "sber", label: "Сбер", shortLabel: "Сбер", category: "ru" },
    { id: "tbank", label: "Т-Банк", shortLabel: "Т-Банк", category: "ru" },

    { id: "github", label: "GitHub", shortLabel: "GitHub", category: "work" },
    { id: "gitlab", label: "GitLab", shortLabel: "GitLab", category: "work" },
    { id: "stackoverflow", label: "Stack Overflow", shortLabel: "SO", category: "work" },
    { id: "notion", label: "Notion", shortLabel: "Notion", category: "work" },
    { id: "figma", label: "Figma", shortLabel: "Figma", category: "work" }
  ];

  const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));
  const ALL_IDS = new Set(ITEMS.map((item) => item.id));

  global.CompanionWebSearch = {
    BUILD,
    CATEGORIES,
    ITEMS,
    ITEM_BY_ID,
    ALL_IDS,
    isEnabled(id) {
      return Boolean(BUILD[id]);
    },
    buildUrl(id, query) {
      const fn = BUILD[id];
      return fn ? fn(query) : "";
    },
    getItem(id) {
      return ITEM_BY_ID.get(id) || null;
    },
    getShortLabel(id, fallback = "Поиск") {
      const item = ITEM_BY_ID.get(id);
      return item?.shortLabel || item?.label || fallback;
    },
    getIconSlug(id) {
      return ICON_SLUG[id] || "";
    },
    getIconLocalPath(id) {
      return ICON_LOCAL[id] || "";
    },
    getIconUrl(id, resolveExtensionUrl) {
      const localPath = ICON_LOCAL[id];
      if (localPath && typeof resolveExtensionUrl === "function") {
        const resolved = resolveExtensionUrl(localPath);
        if (resolved) return resolved;
      }
      const slug = ICON_SLUG[id];
      if (!slug) return "";
      return `https://cdn.jsdelivr.net/npm/simple-icons@${SIMPLE_ICONS_VERSION}/icons/${slug}.svg`;
    }
  };
})(globalThis);
