import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const searchQuery = z.string().min(1).describe("Search query");
const pageUrl = z.string().url().describe("Public http(s) URL to fetch and read");

const searchCommon = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Max results (up to 20)"),
  lang: z.string().optional().describe("Language hint, e.g. ru"),
  country: z.string().optional().describe("Country hint, e.g. RU"),
  gl: z.string().optional().describe("Geolocation hint, e.g. ru"),
  safe: z.enum(["active", "off"]).optional().describe("SafeSearch, default active")
};

const noWorkspaceScope = { agentScope: false };

/** Web search + fetch (canonical: utility_web_*). */
export function registerToolWebTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "utility_web_search",
    legacy: "tool_web_search",
    extraLegacy: ["search_web"],
    description:
      "Search the public web. Default: direct Google HTML search (no API keys). Optional WEB_SEARCH_MODE=api with GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_ENGINE_ID.",
    schema: z.object({
      query: searchQuery,
      ...searchCommon
    }),
    handler: ({ query, limit, lang, country, gl, safe }) =>
      client.get("/api/web/search", { q: query, limit, lang, country, gl, safe }),
    options: noWorkspaceScope
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "utility_web_images_search",
    legacy: "tool_web_images_search",
    extraLegacy: ["search_web_images"],
    description: "Search images on the web (Google Images, direct HTML by default).",
    schema: z.object({
      query: searchQuery,
      ...searchCommon,
      size: z
        .enum(["icon", "small", "medium", "large", "xlarge", "xxlarge", "huge"])
        .optional()
        .describe("Used only in WEB_SEARCH_MODE=api"),
      type: z
        .enum(["clipart", "face", "lineart", "stock", "photo", "animated"])
        .optional()
        .describe("Used only in WEB_SEARCH_MODE=api")
    }),
    handler: ({ query, limit, lang, country, gl, safe, size, type }) =>
      client.get("/api/web/images", { q: query, limit, lang, country, gl, safe, size, type }),
    options: noWorkspaceScope
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "utility_web_page_read",
    legacy: "tool_web_page_read",
    extraLegacy: ["read_web_page"],
    description:
      "Fetch a public web page and return readable plain text (HTML → text). For binaries use content_binary_write_from_url. Private/local URLs are blocked.",
    schema: z.object({
      url: pageUrl,
      maxChars: z
        .number()
        .int()
        .min(500)
        .max(100000)
        .optional()
        .describe("Max characters of extracted text, default 50000"),
      maxBytes: z
        .number()
        .int()
        .min(10000)
        .max(2000000)
        .optional()
        .describe("Max downloaded bytes, default 512000")
    }),
    handler: ({ url, maxChars, maxBytes }) => client.get("/api/web/page", { url, maxChars, maxBytes }),
    options: noWorkspaceScope
  });
}

/** @deprecated use registerToolWebTools */
export function registerWebSearchTools(reg, client) {
  return registerToolWebTools(reg, client);
}
