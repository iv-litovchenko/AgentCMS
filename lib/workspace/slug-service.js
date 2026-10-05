const path = require("path");
const { transliterateToSlug, sanitizeSlugInput } = require(path.join(
  __dirname,
  "..",
  "..",
  "public",
  "js",
  "core",
  "slug-translit"
));
const { slugifyStoreName } = require("../awn/awn-data-loader");
const { slugifyCatalogId } = require("../catalog/catalog-normalize");

const SLUG_PRESETS = ["page", "content", "store", "database", "repository", "catalog", "filename"];

function slugFromPageOrContent(text) {
  const display = String(text || "").trim();
  if (!display) return "";
  const raw = transliterateToSlug(display) || display;
  return sanitizeSlugInput(raw) || transliterateToSlug(display) || sanitizeSlugInput(display) || "";
}

function slugFromFilename(text, stripExtension = false) {
  let name = String(text || "").trim();
  if (!name) return "";
  name = name.replace(/\.md$/i, "");
  if (stripExtension) name = name.replace(/\.[^./]+$/i, "");
  return sanitizeSlugInput(name) || transliterateToSlug(name) || "";
}

function generateWorkspaceSlug({ text, slug, preset = "page", stripExtension = false } = {}) {
  const explicit = sanitizeSlugInput(slug);
  const input = String(text || "").trim();
  const mode = String(preset || "page").trim().toLowerCase();

  if (!SLUG_PRESETS.includes(mode)) {
    const error = new Error(`preset must be one of: ${SLUG_PRESETS.join(", ")}`);
    error.code = "EINVAL";
    throw error;
  }

  if (explicit) {
    return { input, preset: mode, slug: explicit, auto: false };
  }

  if (!input) {
    return { input: "", preset: mode, slug: "", auto: true };
  }

  let derived = "";
  switch (mode) {
    case "store":
      derived = slugifyStoreName(input);
      break;
    case "catalog":
      derived = slugifyCatalogId(input);
      break;
    case "filename":
      derived = slugFromFilename(input, Boolean(stripExtension));
      break;
    case "content":
    case "page":
    case "database":
    case "repository":
      derived = slugFromPageOrContent(input);
      break;
    default:
      derived = slugFromPageOrContent(input);
  }

  return { input, preset: mode, slug: derived || "", auto: true };
}

module.exports = {
  SLUG_PRESETS,
  generateWorkspaceSlug
};
