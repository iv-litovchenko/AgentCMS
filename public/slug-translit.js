(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.SlugTranslit = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CYRILLIC_TO_LATIN = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    ґ: "g",
    є: "ye",
    і: "i",
    ї: "yi",
    ў: "u"
  };

  function transliterateChunk(text) {
    let out = "";
    for (const ch of String(text || "")) {
      const lower = ch.toLowerCase();
      if (/[a-z0-9]/.test(lower)) {
        out += lower;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(CYRILLIC_TO_LATIN, lower)) {
        out += CYRILLIC_TO_LATIN[lower];
        continue;
      }
      if (/\s/.test(ch) || ch === "_" || ch === "-") {
        out += "-";
        continue;
      }
      if (/\p{L}/u.test(ch)) {
        const ascii = ch
          .normalize("NFD")
          .replace(/\p{M}/gu, "")
          .toLowerCase();
        if (/^[a-z0-9]+$/.test(ascii)) out += ascii;
        else out += "-";
        continue;
      }
    }
    return out;
  }

  function transliterateToSlug(text) {
    const raw = String(text || "").trim();
    if (!raw) return "";
    return transliterateChunk(raw)
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 96);
  }

  function sanitizeSlugInput(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 96);
  }

  function isAutoSlug(displayName, slug) {
    const display = String(displayName || "").trim();
    const current = sanitizeSlugInput(slug);
    if (!display || !current) return true;
    return transliterateToSlug(display) === current;
  }

  return {
    transliterateToSlug,
    sanitizeSlugInput,
    isAutoSlug
  };
});
