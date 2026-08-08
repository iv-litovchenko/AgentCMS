const fs = require("fs/promises");
const path = require("path");
const { fetchBufferFromImportUrl } = require("./media-import");

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_CHARS = 80_000;
const DEFAULT_TIMEOUT_MS = 20_000;

function clampChars(text, maxChars) {
  const cleaned = String(text || "");
  if (cleaned.length <= maxChars) return { text: cleaned, truncated: false };
  return { text: `${cleaned.slice(0, maxChars).trim()}…`, truncated: true };
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function stripHtmlTags(text) {
  return decodeHtmlEntities(String(text || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractMetaContent(html, nameOrProperty) {
  const key = String(nameOrProperty || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${key}["']`,
    "i"
  );
  const match = String(html || "").match(re);
  return stripHtmlTags(match?.[1] || match?.[2] || "");
}

function extractLinkTag(html, rel) {
  const key = String(rel || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<link[^>]+rel=["']${key}["'][^>]+href=["']([^"']+)["']`, "i");
  const match = String(html || "").match(re);
  return decodeHtmlEntities(match?.[1] || "").trim();
}

function extractHtmlTitle(html) {
  const match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtmlTags(match[1]) : "";
}

function resolvePreviewUrl(baseUrl, maybeRelative) {
  const raw = String(maybeRelative || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return raw;
  }
}

function extensionFromPath(filePath) {
  return path.extname(String(filePath || "")).toLowerCase();
}

function extensionFromContentType(contentType) {
  const type = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (type.includes("pdf")) return ".pdf";
  if (type.includes("wordprocessingml")) return ".docx";
  if (type.includes("msword")) return ".doc";
  if (type.includes("spreadsheetml")) return ".xlsx";
  if (type.includes("excel")) return ".xls";
  if (type.includes("html")) return ".html";
  if (type.includes("json")) return ".json";
  if (type.includes("xml")) return ".xml";
  if (type.startsWith("text/")) return ".txt";
  return "";
}

async function extractPdfText(buffer) {
  try {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return String(data.text || "").trim();
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      throw Object.assign(new Error("PDF extraction requires pdf-parse package"), { status: 503 });
    }
    throw error;
  }
}

async function extractDocxText(buffer) {
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return String(result.value || "").trim();
}

function extractXlsxText(buffer) {
  const XLSX = require("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const chunks = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (!csv.trim()) continue;
    chunks.push(`# ${sheetName}\n${csv.trim()}`);
  }
  return chunks.join("\n\n");
}

function htmlToPlainText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n")
    .map((line) => stripHtmlTags(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractBufferText(buffer, { ext, contentType, maxChars }) {
  const extension = ext || extensionFromContentType(contentType);
  let text = "";

  if (extension === ".pdf") {
    text = await extractPdfText(buffer);
  } else if (extension === ".docx") {
    text = await extractDocxText(buffer);
  } else if (extension === ".xlsx" || extension === ".xls") {
    text = extractXlsxText(buffer);
  } else if (extension === ".html" || extension === ".htm" || /^<!doctype html/i.test(buffer.slice(0, 200).toString("utf-8"))) {
    text = htmlToPlainText(buffer.toString("utf-8"));
  } else if (extension === ".json") {
    try {
      text = JSON.stringify(JSON.parse(buffer.toString("utf-8")), null, 2);
    } catch {
      text = buffer.toString("utf-8");
    }
  } else if (
    [".txt", ".md", ".csv", ".yaml", ".yml", ".xml", ".log"].includes(extension) ||
    String(contentType || "").startsWith("text/")
  ) {
    text = buffer.toString("utf-8");
  } else {
    return {
      error: `Unsupported document type: ${extension || contentType || "unknown"}. Supported: pdf, docx, xlsx, html, txt, md, json.`,
      status: 415
    };
  }

  const clipped = clampChars(text, maxChars);
  return {
    text: clipped.text,
    charCount: clipped.text.length,
    truncated: clipped.truncated,
    format: extension.replace(/^\./, "") || "text"
  };
}

function createDocumentExtractService({ normalizeWorkspacePath } = {}) {
  async function getLinkPreview(payload = {}) {
    const url = String(payload.url || "").trim();
    if (!url) return { error: "URL is required", status: 400 };

    try {
      const fetched = await fetchBufferFromImportUrl(url, {
        maxBytes: 256_000,
        timeoutMs: DEFAULT_TIMEOUT_MS
      });
      const contentType = String(fetched.contentType || "").split(";")[0].trim().toLowerCase();
      const finalUrl = fetched.sourceUrl || url;

      if (!contentType.includes("html") && !/^<!doctype html/i.test(fetched.buffer.slice(0, 200).toString("utf-8"))) {
        return {
          error: "Link preview supports HTML pages only. Use extract_document_text or read_web_page.",
          status: 415
        };
      }

      const html = fetched.buffer.toString("utf-8");
      const title =
        extractMetaContent(html, "og:title") ||
        extractMetaContent(html, "twitter:title") ||
        extractHtmlTitle(html);
      const description =
        extractMetaContent(html, "og:description") ||
        extractMetaContent(html, "description") ||
        extractMetaContent(html, "twitter:description");
      const image =
        resolvePreviewUrl(finalUrl, extractMetaContent(html, "og:image")) ||
        resolvePreviewUrl(finalUrl, extractMetaContent(html, "twitter:image"));
      const siteName = extractMetaContent(html, "og:site_name");
      const canonical = resolvePreviewUrl(finalUrl, extractLinkTag(html, "canonical")) || finalUrl;

      return {
        url,
        finalUrl,
        canonicalUrl: canonical,
        title,
        description,
        siteName,
        imageUrl: image || null,
        contentType: contentType || "text/html"
      };
    } catch (error) {
      return {
        error: String(error.message || error),
        status: Number(error.status) || 502
      };
    }
  }

  async function extractDocumentText(payload = {}) {
    const url = String(payload.url || "").trim();
    const filePath = String(payload.path || payload.file || "").trim();
    const maxBytes = Number(payload.maxBytes) > 0 ? Number(payload.maxBytes) : DEFAULT_MAX_BYTES;
    const maxChars = Number(payload.maxChars) > 0 ? Number(payload.maxChars) : DEFAULT_MAX_CHARS;

    if (!url && !filePath) {
      return { error: "url or path is required", status: 400 };
    }
    if (url && filePath) {
      return { error: "Provide either url or path, not both", status: 400 };
    }

    try {
      if (url) {
        const fetched = await fetchBufferFromImportUrl(url, {
          maxBytes,
          timeoutMs: DEFAULT_TIMEOUT_MS
        });
        const ext = extensionFromPath(new URL(fetched.sourceUrl || url).pathname);
        const extracted = await extractBufferText(fetched.buffer, {
          ext,
          contentType: fetched.contentType,
          maxChars
        });
        if (extracted.error) return extracted;
        return {
          source: "url",
          url: fetched.sourceUrl || url,
          contentType: fetched.contentType || null,
          ...extracted
        };
      }

      if (!normalizeWorkspacePath) {
        return { error: "Workspace path extraction is not configured", status: 500 };
      }

      const absolute = normalizeWorkspacePath(filePath);
      if (!absolute) return { error: "Invalid or forbidden workspace path", status: 400 };

      const stat = await fs.stat(absolute);
      if (!stat.isFile()) return { error: "Path is not a file", status: 400 };
      if (stat.size > maxBytes) {
        return { error: `File exceeds maxBytes limit (${maxBytes})`, status: 413 };
      }

      const buffer = await fs.readFile(absolute);
      const extracted = await extractBufferText(buffer, {
        ext: extensionFromPath(absolute),
        contentType: "",
        maxChars
      });
      if (extracted.error) return extracted;
      return {
        source: "workspace",
        path: filePath.replace(/\\/g, "/"),
        byteSize: stat.size,
        ...extracted
      };
    } catch (error) {
      return {
        error: String(error.message || error),
        status: Number(error.status) || 502
      };
    }
  }

  return {
    getLinkPreview,
    extractDocumentText
  };
}

module.exports = { createDocumentExtractService };
