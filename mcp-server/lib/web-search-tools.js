import { z } from "zod";

const searchQuery = z.string().min(1).describe("Search query");

const searchCommon = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Max results (Google returns up to 10 per request; service paginates to 20)"),
  lang: z
    .string()
    .optional()
    .describe("Language bias, e.g. ru → lang_ru (Google lr parameter)"),
  country: z
    .string()
    .optional()
    .describe("Country bias, e.g. RU → countryRU (Google cr parameter)"),
  gl: z.string().optional().describe("Geolocation hint, e.g. ru"),
  safe: z.enum(["active", "off"]).optional().describe("SafeSearch, default active")
};

export function registerWebSearchTools(reg, client) {
  reg(
    "search_web",
    "Search the public web via Google Programmable Search (Custom Search JSON API). Requires GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_ENGINE_ID on the CMS server.",
    z.object({
      query: searchQuery,
      ...searchCommon
    }),
    ({ query, limit, lang, country, gl, safe }) =>
      client.get("/api/web/search", { q: query, limit, lang, country, gl, safe })
  );

  reg(
    "search_web_images",
    "Search images on the web via Google Custom Search (searchType=image). Same server credentials as search_web.",
    z.object({
      query: searchQuery,
      ...searchCommon,
      size: z
        .enum(["icon", "small", "medium", "large", "xlarge", "xxlarge", "huge"])
        .optional()
        .describe("Google imgSize filter"),
      type: z
        .enum(["clipart", "face", "lineart", "stock", "photo", "animated"])
        .optional()
        .describe("Google imgType filter")
    }),
    ({ query, limit, lang, country, gl, safe, size, type }) =>
      client.get("/api/web/images", { q: query, limit, lang, country, gl, safe, size, type })
  );
}
